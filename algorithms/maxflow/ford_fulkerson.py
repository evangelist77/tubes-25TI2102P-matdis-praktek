from collections import deque
import json
import math
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

# Pastikan root proyek masuk ke sys.path untuk eksekusi langsung
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import networkx as nx

from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel


# Direktori data visualizer Vue
VISUALIZER_DATA_DIR = Path(__file__).resolve().parents[2] / "visualizer" / "public" / "data"
TOPOLOGY_FILE = VISUALIZER_DATA_DIR / "topology.json"
SCENARIO_YAML_FILE = (
    Path(__file__).resolve().parents[2] / "cases" / "scenarios" / "case_04_pasar_tumpah.yaml"
)

# 4 Pasangan Terminal Utama (Source -> Sink)
PAIRS: List[Dict[str, Any]] = [
    {"source": 1, "sink": 3, "sCode": "S1", "tCode": "T1", "label": "S1 (Pasupati) → T1 (PUSDAI)"},
    {"source": 1, "sink": 4, "sCode": "S1", "tCode": "T2", "label": "S1 (Pasupati) → T2 (Diponegoro)"},
    {"source": 2, "sink": 3, "sCode": "S2", "tCode": "T1", "label": "S2 (Dipatiukur) → T1 (PUSDAI)"},
    {"source": 2, "sink": 4, "sCode": "S2", "tCode": "T2", "label": "S2 (Dipatiukur) → T2 (Diponegoro)"},
]

# Alpha observasi empiris pasar penuh
OBSERVED_ALPHA = 0.5

# Simpul dan busur khusus
MARKET_EDGES: Set[Tuple[int, int]] = {(24, 25)}  # Jl. Gasibu Atas
CLOSED_MORNING_EDGES: Set[Tuple[int, int]] = {(11, 12)}  # Jl. Singaperbangsa
VIRTUAL_NODES: Set[int] = {0, 27}  # S* dan T*


class FlowResult(float):
    """Wrapper float yang juga bisa di-unpack sebagai (path, max_flow).

    Memenuhi kebutuhan ganda:
    - Kontrak template dosen: `path, cost = solver.run(start, goal)`
    - Script visualizer & analisis: `flow = solver.run(start, goal)`
    """

    def __new__(cls, value: float, path: Optional[List[int]] = None):
        instance = super().__new__(cls, value)
        instance.path = path or []
        instance.cost = float(value)
        instance.max_flow = float(value)
        return instance

    def __iter__(self):
        yield self.path
        yield float(self)


class _ResidualEdge:
    __slots__ = ("to", "capacity", "flow", "edge_id", "is_reverse", "rev_index")

    def __init__(
        self,
        to: int,
        capacity: float,
        edge_id: int,
        is_reverse: bool,
        rev_index: int,
    ):
        self.to = to
        self.capacity = capacity
        self.flow = 0.0
        self.edge_id = edge_id
        self.is_reverse = is_reverse
        self.rev_index = rev_index


class FordFulkerson(BaseGraphAlgorithm):
    """Implementasi Algoritma Ford-Fulkerson dengan varian Edmonds-Karp (BFS)."""

    # Event dinamis maxflow menggunakan DYNAMIC_EDGE_CAPACITY, bukan new_weight pathfinding.
    SUPPORTED_EVENT_TYPES: Optional[frozenset] = frozenset()

    def __init__(self, model: SpatialGraphModel):
        super().__init__(model)
        self.topology: Optional[Dict[str, Any]] = self._load_topology()
        self._last_source: Optional[int] = None
        self._last_sink: Optional[int] = None
        self._last_alpha: float = 0.0
        self._last_pasar_active: bool = False
        self._last_trace_data: Optional[Dict[str, Any]] = None
        self._initial_augmenting_path: List[int] = []

    def _load_topology(self) -> Optional[Dict[str, Any]]:
        """Memuat topology.json jika tersedia untuk sinkronisasi metadata visualizer."""
        if TOPOLOGY_FILE.exists():
            try:
                with open(TOPOLOGY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    def _get_effective_capacity(
        self,
        edge_id: int,
        u: int,
        v: int,
        raw_cap: float,
        alpha: float,
        is_market: bool,
        closed_in_morning: bool,
    ) -> float:
        """Menghitung kapasitas efektif setelah dipengaruhi faktor penyempitan alpha dan penutupan pagi."""
        cap = float(raw_cap)
        pasar_active = alpha > 0.0

        if is_market:
            cap = float(round(raw_cap * (1.0 - alpha)))

        if closed_in_morning and pasar_active:
            cap = 0.0

        return max(0.0, cap)

    def run(
        self,
        start_node: int,
        goal_node: int,
        alpha: float = 0.0,
        **kwargs,
    ) -> FlowResult:
        """Menghitung Maximum Flow dari start_node ke goal_node menggunakan BFS Edmonds-Karp."""
        self._last_source = start_node
        self._last_sink = goal_node
        self._last_alpha = alpha
        self._last_pasar_active = alpha > 0.0

        # Ambil metadata nodes & edges dari topology.json atau fallback ke self.graph
        topo_nodes = (
            self.topology.get("nodes", [])
            if self.topology
            else [{"id": n, "code": str(n), "label": str(n)} for n in self.graph.nodes()]
        )
        topo_edges = self.topology.get("edges", []) if self.topology else []

        # Peta node id -> info
        node_code_map = {n["id"]: n.get("code", f"V{n['id']}") for n in topo_nodes}

        # Bangun daftar edge dengan id unik
        edges_spec: List[Dict[str, Any]] = []
        if topo_edges:
            edges_spec = topo_edges
        else:
            for idx, (u, v, data) in enumerate(self.graph.edges(data=True)):
                edges_spec.append({
                    "id": idx,
                    "from": u,
                    "to": v,
                    "capacity": float(data.get("capacity", data.get("weight", 1.0))),
                    "road": f"Ruas {u} ke {v}",
                    "isMarket": (u, v) in MARKET_EDGES,
                    "closedInMorning": (u, v) in CLOSED_MORNING_EDGES,
                    "isVirtual": u in VIRTUAL_NODES or v in VIRTUAL_NODES,
                })

        # Hitung effectiveCapacity per edge
        effective_capacity: Dict[int, float] = {}
        for e in edges_spec:
            eid = int(e["id"])
            u = int(e["from"])
            v = int(e["to"])
            raw_c = float(e.get("capacity", 1.0))
            is_m = bool(e.get("isMarket", False) or (u, v) in MARKET_EDGES)
            is_c = bool(e.get("closedInMorning", False) or (u, v) in CLOSED_MORNING_EDGES)

            eff_c = self._get_effective_capacity(
                eid, u, v, raw_c, alpha, is_m, is_c
            )
            effective_capacity[eid] = eff_c

        # Bangun graf residual
        # adj: node_id -> list of _ResidualEdge
        adj: Dict[int, List[_ResidualEdge]] = {}
        all_node_ids = {n["id"] for n in topo_nodes}
        all_node_ids.update(self.graph.nodes())
        all_node_ids.add(start_node)
        all_node_ids.add(goal_node)

        for nid in all_node_ids:
            adj[nid] = []

        for e in edges_spec:
            eid = int(e["id"])
            u = int(e["from"])
            v = int(e["to"])
            cap = effective_capacity.get(eid, 0.0)

            from_list = adj.setdefault(u, [])
            to_list = adj.setdefault(v, [])

            fwd_idx = len(from_list)
            rev_idx = len(to_list)

            from_list.append(_ResidualEdge(to=v, capacity=cap, edge_id=eid, is_reverse=False, rev_index=rev_idx))
            to_list.append(_ResidualEdge(to=u, capacity=0.0, edge_id=eid, is_reverse=True, rev_index=fwd_idx))

        steps: List[Dict[str, Any]] = []
        total_flow = 0.0
        step_index = 0
        self._initial_augmenting_path = []

        self.log_step(
            event_type="INITIALIZATION",
            state_mutations={
                "source": start_node,
                "sink": goal_node,
                "alpha": alpha,
                "max_flow": 0.0,
            },
        )

        # Edmonds-Karp BFS loop
        while True:
            # parent: child -> (parent_node, edge_index_in_parent_list)
            parent: Dict[int, Tuple[int, int]] = {}
            visited: Set[int] = {start_node}
            queue = deque([start_node])

            while queue:
                u = queue.popleft()
                if u == goal_node:
                    break
                for idx, redge in enumerate(adj.get(u, [])):
                    res_cap = redge.capacity - redge.flow
                    if res_cap > 1e-9 and redge.to not in visited:
                        visited.add(redge.to)
                        parent[redge.to] = (u, idx)
                        queue.append(redge.to)

            if goal_node not in parent:
                # Tidak ada lagi augmenting path
                break

            # Hitung bottleneck
            bottleneck = float("inf")
            curr = goal_node
            path_node_ids: List[int] = []
            path_edge_ids: List[int] = []

            while curr != start_node:
                path_node_ids.append(curr)
                p_node, edge_idx = parent[curr]
                redge = adj[p_node][edge_idx]
                bottleneck = min(bottleneck, redge.capacity - redge.flow)
                curr = p_node

            path_node_ids.append(start_node)
            path_node_ids.reverse()

            if not self._initial_augmenting_path:
                self._initial_augmenting_path = list(path_node_ids)

            # Augmentasikan aliran
            curr = goal_node
            while curr != start_node:
                p_node, edge_idx = parent[curr]
                fwd = adj[p_node][edge_idx]
                bwd = adj[fwd.to][fwd.rev_index]

                fwd.flow += bottleneck
                bwd.flow -= bottleneck

                if not fwd.is_reverse:
                    path_edge_ids.append(fwd.edge_id)
                curr = p_node

            path_edge_ids.reverse()
            total_flow += bottleneck
            step_index += 1

            # Catat arus per edge
            current_edge_flows: Dict[int, float] = {}
            for e in edges_spec:
                eid = int(e["id"])
                u = int(e["from"])
                f_edge = next((x for x in adj.get(u, []) if x.edge_id == eid and not x.is_reverse), None)
                current_edge_flows[eid] = max(0.0, f_edge.flow if f_edge else 0.0)

            # Buat narrative komunikatif
            road_names = []
            for peid in path_edge_ids:
                matching_e = next((x for x in edges_spec if int(x["id"]) == peid), None)
                road_names.append(matching_e.get("road", f"Ruas #{peid}") if matching_e else f"Ruas #{peid}")

            path_roads_str = " → ".join(road_names) if road_names else "jalur langsung"
            s_code = node_code_map.get(start_node, str(start_node))
            t_code = node_code_map.get(goal_node, str(goal_node))
            prev_total = total_flow - bottleneck

            narrative = (
                f"Langkah {step_index}: ditemukan jalur dari {s_code} ke {t_code} lewat {path_roads_str}. "
                f"Ruas paling sempit menyisakan {bottleneck:.1f} kend/jam, sehingga dialirkan {bottleneck:.1f} kend/jam. "
                f"Total arus {prev_total:.1f} + {bottleneck:.1f} = {total_flow:.1f} kend/jam."
            )

            steps.append({
                "step": step_index,
                "path": path_edge_ids,
                "bottleneck": round(bottleneck, 2),
                "totalFlow": round(total_flow, 2),
                "edgeFlows": {k: round(v, 2) for k, v in current_edge_flows.items()},
                "narrative": narrative,
            })

            self.log_step(
                event_type="AUGMENTING_PATH_FOUND",
                state_mutations={
                    "step": step_index,
                    "path": path_node_ids,
                    "bottleneck": bottleneck,
                    "total_flow": total_flow,
                },
            )

        # Hitung Min-Cut (himpunan simpul yang dapat dijangkau dari start_node pada residual graph)
        source_side_set: Set[int] = {start_node}
        q_cut = deque([start_node])

        while q_cut:
            u = q_cut.popleft()
            for redge in adj.get(u, []):
                if (redge.capacity - redge.flow) > 1e-9 and redge.to not in source_side_set:
                    source_side_set.add(redge.to)
                    q_cut.append(redge.to)

        min_cut_edges: List[int] = []
        for e in edges_spec:
            eid = int(e["id"])
            u = int(e["from"])
            v = int(e["to"])
            if u in source_side_set and v not in source_side_set:
                min_cut_edges.append(eid)

        # Susun struktur trace final
        case_id = (
            self.topology.get("case_id", "case_04_pasar_tumpah")
            if self.topology
            else "case_04_pasar_tumpah"
        )
        self._last_trace_data = {
            "meta": {
                "caseId": case_id,
                "source": start_node,
                "sink": goal_node,
                "alpha": round(alpha, 2),
                "pasarActive": self._last_pasar_active,
            },
            "effectiveCapacity": {str(k): round(v, 2) for k, v in effective_capacity.items()},
            "steps": steps,
            "result": {
                "maxFlow": round(total_flow, 2),
                "minCut": sorted(min_cut_edges),
                "sourceSide": sorted(list(source_side_set)),
            },
        }

        self.log_step(
            event_type="MAX_FLOW_REACHED",
            state_mutations={
                "max_flow": total_flow,
                "min_cut": min_cut_edges,
                "source_side": sorted(list(source_side_set)),
            },
        )

        # Rute representatif untuk kontrak test dosen
        representative_path = (
            self._initial_augmenting_path
            if self._initial_augmenting_path
            else [start_node, goal_node]
        )

        return FlowResult(total_flow, path=representative_path)

    def handle_dynamic_event(self, event_data: Dict[str, Any]) -> FlowResult:
        """Menangani pembaruan kapasitas dinamis (DYNAMIC_EDGE_CAPACITY)."""
        target = event_data.get("edge") or event_data.get("target_edge")
        new_cap = float(event_data.get("new_capacity", event_data.get("new_weight", 0.0)))
        start = event_data.get("start", self._last_source or 0)
        goal = event_data.get("goal", self._last_sink or 27)

        if target and len(target) == 2:
            u, v = int(target[0]), int(target[1])
            if self.graph.has_edge(u, v):
                self.graph[u][v]["capacity"] = new_cap
                self.log_step(
                    event_type="DYNAMIC_EDGE_CAPACITY",
                    state_mutations={
                        "edge": [u, v],
                        "new_capacity": new_cap,
                        "description": event_data.get("description", ""),
                    },
                )

        return self.run(start, goal)

    def export_visualizer_trace(self, output_dir: Optional[Path] = None) -> Path:
        """Menuliskan berkas trace JSON sesuai kontrak yang dibaca oleh visualizer Vue."""
        if not self._last_trace_data:
            raise RuntimeError("Eksekusi solver.run() terlebih dahulu sebelum export trace.")

        out_dir = output_dir or VISUALIZER_DATA_DIR
        out_dir.mkdir(parents=True, exist_ok=True)

        label_map = {1: "S1", 2: "S2", 3: "T1", 4: "T2"}
        s_code = label_map.get(self._last_source, f"N{self._last_source}")
        t_code = label_map.get(self._last_sink, f"N{self._last_sink}")
        alpha_int = int(round(self._last_alpha * 100))

        filename = f"trace_{s_code}_{t_code}_a{alpha_int}.json"
        out_path = out_dir / filename

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(self._last_trace_data, f, indent=2, ensure_ascii=False)

        return out_path


def generate_all_traces(
    model: SpatialGraphModel,
    output_dir: Optional[Path] = None,
    alphas: Optional[List[float]] = None,
) -> Tuple[List[Path], Path]:
    """Menghasilkan seluruh 40 kombinasi trace (4 pasangan x 10 nilai alpha) dan manifest.json."""
    out_dir = output_dir or VISUALIZER_DATA_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    if alphas is None:
        alphas = [round(k * 0.1, 1) for k in range(10)]  # 0.0, 0.1, ..., 0.9

    manifest_entries: List[Dict[str, Any]] = []
    step_counts: Dict[str, int] = {}
    written_files: List[Path] = []

    for pair in PAIRS:
        s = pair["source"]
        t = pair["sink"]
        s_code = pair["sCode"]
        t_code = pair["tCode"]
        label = pair["label"]

        for alpha in alphas:
            solver = FordFulkerson(model)
            solver.run(s, t, alpha=alpha)
            trace_path = solver.export_visualizer_trace(output_dir=out_dir)
            written_files.append(trace_path)

            alpha_int = int(round(alpha * 100))
            fn = trace_path.name
            step_count = len(solver._last_trace_data.get("steps", []))
            step_counts[fn] = step_count

            manifest_entries.append({
                "source": s,
                "sink": t,
                "sourceCode": s_code,
                "sinkCode": t_code,
                "alpha": alpha,
                "filename": fn,
                "label": f"{label} · penyempitan {alpha_int}%",
            })

    # Tentukan default run (memilih run kondisi data-backed dengan langkah terbanyak)
    data_backed = [m for m in manifest_entries if math.isclose(m["alpha"], 0.0) or math.isclose(m["alpha"], OBSERVED_ALPHA)]
    if data_backed:
        best_entry = max(data_backed, key=lambda m: step_counts.get(m["filename"], 0))
        best_entry["isDefault"] = True

    manifest_data = {
        "observedAlpha": OBSERVED_ALPHA,
        "runs": manifest_entries,
    }
    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    return written_files, manifest_path


# Registrasi otomatis ke AlgorithmRegistry
from algorithms.registry import AlgorithmRegistry

AlgorithmRegistry.register("maxflow", FordFulkerson)
AlgorithmRegistry.register_alias("ford_fulkerson", "maxflow")
AlgorithmRegistry.register_alias("edmonds_karp", "maxflow")


if __name__ == "__main__":
    from cases.scenario_loader import ScenarioLoader

    print("=" * 70)
    print("  SIMULASI FORD-FULKERSON (EDMONDS-KARP) - KASUS 4 PASAR TUMPAH GASIBU")
    print("  Penyusun: Elang Permadi Lau (251524042) - Kelompok 1 Kelas 2B-D4")
    print("=" * 70)

    loader = ScenarioLoader(SCENARIO_YAML_FILE)
    model = loader.build_graph_model()

    print("\n1. Menjalankan Solver untuk 4 Pasangan Terminal S -> T:")
    print("-" * 70)
    print(f"{'Pasangan':<35} | {'Alpha=0% (Normal)':<18} | {'Alpha=50% (Pasar)':<18}")
    print("-" * 70)

    for p in PAIRS:
        s, t = p["source"], p["sink"]
        solver_normal = FordFulkerson(model)
        flow_normal = solver_normal.run(s, t, alpha=0.0)

        solver_pasar = FordFulkerson(model)
        flow_pasar = solver_pasar.run(s, t, alpha=0.5)

        print(f"{p['label']:<35} | {flow_normal:>10.1f} kend/j | {flow_pasar:>10.1f} kend/j")

    print("-" * 70)
    print("\n2. Mengekspor Seluruh Trace & Manifest ke Visualizer...")
    traces, manifest = generate_all_traces(model)
    print(f"✓ Berhasil menulis {len(traces)} berkas trace JSON dan manifest ke: {manifest.parent}")
    print("=" * 70)
