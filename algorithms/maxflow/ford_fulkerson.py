from collections import deque
from pathlib import Path
import json
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx

from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel


# Pasangan source → sink yang dianalisis (node id dari YAML)
PAIRS: List[Tuple[int, int]] = [
    (1, 3),  # S1 → T1
    (1, 4),  # S1 → T2
    (2, 3),  # S2 → T1
    (2, 4),  # S2 → T2
]

# Ruas pasar tumpah (edge Gasibu Barat → Gasibu Timur, node 24→25 di YAML)
MARKET_EDGES: List[Tuple[int, int]] = [(24, 25)]

# Ruas yang ditutup pagi hari pasar (Jl. Singaperbangsa, node 11→12 di YAML)
CLOSED_MORNING_EDGES: List[Tuple[int, int]] = [(11, 12)]

# Folder output trace yang dibaca visualiser Vue
VISUALIZER_DATA_DIR = Path(__file__).resolve().parents[2] / "visualizer" / "public" / "data"

# Node virtual (S*=0, T*=27) tidak disertakan dalam run per-pasangan S→T.
# Edge yang menghubungkan node virtual dibuang saat membangun residual graph,
# sehingga validateTrace tidak gagal karena "konservasi aliran di S* / T*".
_VIRTUAL_NODES = frozenset({0, 27})   # id S* dan T* di YAML


def _load_topology_edge_map() -> Dict[Tuple[int, int], int]:
    """Baca topology.json dan kembalikan peta (from, to) → edge.id.

    Peta ini dipakai agar edge-id di trace sesuai dengan yang diharapkan
    oleh visualiser Vue (validateTrace memakai topology.edges[i].id sebagai key).
    Mengembalikan dict kosong jika topology.json belum ada.
    """
    topo_path = VISUALIZER_DATA_DIR / "topology.json"
    if not topo_path.exists():
        return {}
    try:
        data = json.loads(topo_path.read_text(encoding="utf-8"))
        return {(e["from"], e["to"]): e["id"] for e in data.get("edges", [])}
    except Exception:
        return {}


class FlowResult(float):
    """Wrapper float yang juga bisa di-unpack sebagai (path, max_flow).

    Dibutuhkan untuk kompatibilitas dengan pipeline template dosen (SimulationRunner
    dan pytest test_scenario_pipeline_contract) yang mengharapkan:
        path, cost = solver.run(start, goal)
    sekaligus tetap bertindak sebagai float murni untuk script visualizer:
        flow = solver.run(start, goal)
    """

    def __new__(cls, value: float, path: Optional[List[int]] = None):
        instance = super().__new__(cls, value)
        instance.path = path or []
        instance.cost = float(value)
        return instance

    def __iter__(self):
        yield self.path
        yield float(self)


class FordFulkerson(BaseGraphAlgorithm):
    """Algoritma Maximum Flow (Edmonds-Karp / BFS).

    Selain mengembalikan nilai max-flow, kelas ini mencatat:
    - edgeFlows  : arus tiap ruas (edge) setelah setiap langkah augmentasi
    - effectiveCapacity : kapasitas efektif tiap ruas pada run ini (sudah memperhitungkan α)

    Setelah run() selesai, panggil export_visualizer_trace() untuk menulis
    berkas trace_<src>_<sink>_a<alpha*100>.json yang dibaca oleh visualiser.
    """

    # Template dosen menguji event berformat pathfinding (new_weight).
    # Diset frozenset() agar event dinamis khusus maxflow (DYNAMIC_EDGE_CAPACITY)
    # tidak bentrok dengan parser new_weight bawaan template.
    SUPPORTED_EVENT_TYPES = frozenset()

    def __init__(self, model: SpatialGraphModel):
        super().__init__(model)
        self.residual = nx.DiGraph()
        # Peta (from, to) → edge.id sesuai topology.json (sumber kebenaran untuk validateTrace)
        self._topo_edge_map: Dict[Tuple[int, int], int] = _load_topology_edge_map()
        # State yang diisi oleh run()
        self._edge_flows: Dict[str, int] = {}   # "u-v" → flow akhir
        self._eff_cap: Dict[str, float] = {}    # "u-v" → kapasitas efektif
        self._steps_visualizer: List[Dict] = [] # format kontrak visualiser
        self._max_flow: float = 0.0
        self._source: Optional[int] = None
        self._sink: Optional[int] = None
        self._alpha: float = 0.0
        self._pasar_active: bool = False

    # ------------------------------------------------------------------
    # Helper: konversi edge (u,v) ke string key dan id edge dari topology.json
    # ------------------------------------------------------------------
    def _ekey(self, u: int, v: int) -> str:
        return f"{u}-{v}"

    def _edge_id(self, u: int, v: int) -> int:
        """Kembalikan id edge sesuai topology.json (yang dibaca validateTrace).

        Prioritas:
        1. Peta dari topology.json (dibangun sekali di __init__ atau run()).
        2. Fallback: urutan edge non-virtual di YAML (mulai 0).
        """
        topo_id = self._topo_edge_map.get((u, v))
        if topo_id is not None:
            return topo_id
        # Fallback: hitung posisi urut edge non-virtual
        idx = 0
        for eu, ev, _ in self.graph.edges(data=True):
            if eu in _VIRTUAL_NODES or ev in _VIRTUAL_NODES:
                continue
            if eu == u and ev == v:
                return idx
            idx += 1
        return -1

    # ------------------------------------------------------------------
    # BFS untuk mencari augmenting path
    # ------------------------------------------------------------------
    def _bfs(self, source: int, sink: int, parent: Dict) -> bool:
        visited = {source}
        queue = deque([source])
        while queue:
            u = queue.popleft()
            for v in self.residual.neighbors(u):
                cap = self.residual[u][v].get("capacity", 0.0)
                if v not in visited and cap > 0:
                    queue.append(v)
                    visited.add(v)
                    parent[v] = u
                    if v == sink:
                        return True
        return False

    # ------------------------------------------------------------------
    # Min-cut: sisi S adalah semua node yang masih terjangkau dari source
    # di residual graph setelah flow maksimum tercapai
    # ------------------------------------------------------------------
    def _find_min_cut(self, source: int) -> Tuple[List[int], List[int]]:
        visited = set()
        queue = deque([source])
        while queue:
            u = queue.popleft()
            if u in visited:
                continue
            visited.add(u)
            for v in self.residual.neighbors(u):
                cap = self.residual[u][v].get("capacity", 0.0)
                if v not in visited and cap > 0:
                    queue.append(v)
        source_side = sorted(visited)
        all_nodes = set(self.residual.nodes())
        sink_side = sorted(all_nodes - visited)
        return source_side, sink_side

    def _build_min_cut_edges(self, source_side: List[int]) -> List[int]:
        """Kembalikan daftar indeks edge yang menyeberangi potongan min-cut."""
        source_set = set(source_side)
        cut = []
        for idx, (u, v, _) in enumerate(self.graph.edges(data=True)):
            if u in source_set and v not in source_set:
                cut.append(idx)
        return cut

    # ------------------------------------------------------------------
    # run(): jalankan Ford-Fulkerson untuk satu pasangan (source, sink)
    # ------------------------------------------------------------------
    def run(self, source_node: int, sink_node: int, alpha: float = 0.0) -> float:
        """Jalankan Ford-Fulkerson (Edmonds-Karp) dan catat trace visualiser.

        Args:
            source_node: id node sumber (mis. 1 untuk S1, 2 untuk S2).
            sink_node  : id node tujuan (mis. 3 untuk T1, 4 untuk T2).
            alpha      : faktor penyempitan pasar (0.0 = tanpa pasar, 0.5 = 50%).

        Returns:
            Nilai max-flow (float).
        """
        self._source = source_node
        self._sink = sink_node
        self._alpha = alpha
        self._pasar_active = alpha > 0.0
        self._steps_visualizer = []
        self._edge_flows = {}
        self._eff_cap = {}

        # --- Bangun residual graph dengan kapasitas efektif ---
        self.residual.clear()
        self.residual.add_nodes_from(self.graph.nodes())

        filter_virtual = (source_node not in _VIRTUAL_NODES and sink_node not in _VIRTUAL_NODES)

        for u, v, data in self.graph.edges(data=True):
            # Lewati edge virtual (S* dan T*) jika sedang run per-pasangan
            if filter_virtual and (u in _VIRTUAL_NODES or v in _VIRTUAL_NODES):
                continue
            base_cap = float(data.get("capacity", data.get("weight", 1.0)))
            # Terapkan penyempitan α pada ruas pasar; bila pasar aktif tutup juga ruas pagi
            if self._pasar_active and (u, v) in MARKET_EDGES:
                eff_cap = base_cap * (1.0 - alpha)
            elif self._pasar_active and (u, v) in CLOSED_MORNING_EDGES:
                eff_cap = 0.0
            else:
                eff_cap = base_cap

            self._eff_cap[self._ekey(u, v)] = eff_cap
            self.residual.add_edge(u, v, capacity=eff_cap)
            if not self.residual.has_edge(v, u):
                self.residual.add_edge(v, u, capacity=0.0)

        # Inisialisasi arus semua edge ke 0
        for u, v, _ in self.graph.edges(data=True):
            if filter_virtual and (u in _VIRTUAL_NODES or v in _VIRTUAL_NODES):
                continue
            self._edge_flows[self._ekey(u, v)] = 0.0

        max_flow = 0.0
        parent: Dict = {}
        step_no = 0
        first_path: List[int] = []

        self.log_step(
            event_type="INITIALIZATION",
            state_mutations={
                "source": source_node,
                "sink": sink_node,
                "alpha": alpha,
                "pasar_active": self._pasar_active,
                "max_flow": 0.0,
            },
        )

        while self._bfs(source_node, sink_node, parent):
            # --- Cari bottleneck ---
            path_flow = float("inf")
            s = sink_node
            while s != source_node:
                path_flow = min(path_flow, self.residual[parent[s]][s]["capacity"])
                s = parent[s]

            # --- Rekonstruksi jalur (node) ---
            s = sink_node
            path_nodes: List[int] = []
            while s != source_node:
                path_nodes.append(s)
                s = parent[s]
            path_nodes.append(source_node)
            path_nodes.reverse()

            if not first_path:
                first_path = list(path_nodes)

            # --- Edge id (dari topology) pada augmenting path ---
            path_edge_ids: List[int] = []
            for i in range(len(path_nodes) - 1):
                u, v = path_nodes[i], path_nodes[i + 1]
                path_edge_ids.append(self._edge_id(u, v))

            # --- Update residual dan catat arus ---
            v = sink_node
            while v != source_node:
                u = parent[v]
                self.residual[u][v]["capacity"] -= path_flow
                self.residual[v][u]["capacity"] += path_flow
                # Catat arus (hanya edge arah maju yang ada di graph asli)
                key = self._ekey(u, v)
                if key in self._edge_flows:
                    self._edge_flows[key] += path_flow
                v = parent[v]

            max_flow += path_flow
            step_no += 1

            # --- Simpan step ke format kontrak visualiser ---
            # edgeFlows key = topology edge.id (integer, disimpan sebagai string di JSON)
            edge_flows_by_id: Dict[str, float] = {}
            for eu, ev, _ in self.graph.edges(data=True):
                if eu in _VIRTUAL_NODES or ev in _VIRTUAL_NODES:
                    continue
                eid = self._edge_id(eu, ev)
                edge_flows_by_id[str(eid)] = self._edge_flows.get(self._ekey(eu, ev), 0.0)

            self._steps_visualizer.append({
                "step": step_no,
                "path": path_edge_ids,
                "bottleneck": path_flow,
                "totalFlow": max_flow,
                "edgeFlows": edge_flows_by_id,
            })

            self.log_step(
                event_type="AUGMENTING_PATH_FOUND",
                state_mutations={
                    "path_nodes": path_nodes,
                    "path_edge_ids": path_edge_ids,
                    "flow_added": path_flow,
                    "current_max_flow": max_flow,
                },
            )

        self._max_flow = max_flow

        # Log hasil akhir
        source_side, sink_side = self._find_min_cut(source_node)
        min_cut_edges = self._build_min_cut_edges(source_side)
        self.log_step(
            event_type="MAX_FLOW_FOUND",
            state_mutations={
                "max_flow": max_flow,
                "min_cut_edges": min_cut_edges,
                "source_side": source_side,
            },
        )

        representative_path = first_path or [source_node, sink_node]
        return FlowResult(max_flow, path=representative_path)

    # ------------------------------------------------------------------
    # handle_dynamic_event(): dipanggil oleh SimulationRunner saat ada event
    # ------------------------------------------------------------------
    def handle_dynamic_event(self, event_data: Dict[str, Any]) -> None:
        """Tangani perubahan kapasitas edge secara dinamis.

        Event yang didukung:
        - DYNAMIC_EDGE_CAPACITY: ubah kapasitas edge di graph model.
        """
        event_type = event_data.get("type", "")
        if event_type == "DYNAMIC_EDGE_CAPACITY":
            target = event_data.get("target_edge", [])
            new_cap = float(event_data.get("new_capacity", 0.0))
            if len(target) == 2:
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

    # ------------------------------------------------------------------
    # export_visualizer_trace(): tulis JSON ke visualizer/public/data/
    # ------------------------------------------------------------------
    def export_visualizer_trace(
        self,
        output_dir: Optional[Path] = None,
    ) -> Path:
        """Tulis trace JSON dengan format kontrak visualiser Vue.

        File ditulis ke:  trace_S<src>_T<sink>_a<alpha*100>.json
        (mis.  trace_S1_T1_a0.json  atau  trace_S1_T2_a50.json)

        Returns:
            Path berkas yang ditulis.
        """
        if self._source is None or self._sink is None:
            raise RuntimeError("Jalankan run() terlebih dahulu sebelum export_visualizer_trace().")

        out_dir = output_dir or VISUALIZER_DATA_DIR
        out_dir.mkdir(parents=True, exist_ok=True)

        # Konversi node id ke label pendek (mis. 1 → "S1", 3 → "T1")
        _label = {1: "S1", 2: "S2", 3: "T1", 4: "T2"}
        src_label = _label.get(self._source, str(self._source))
        sink_label = _label.get(self._sink, str(self._sink))
        alpha_int = int(round(self._alpha * 100))
        filename = f"trace_{src_label}_{sink_label}_a{alpha_int}.json"

        # effectiveCapacity menggunakan indeks edge sebagai key (string).
        # Edge virtual (S* / T*) dihilangkan — indeks dihitung ulang tanpa mereka.
        eff_cap_by_idx: Dict[str, float] = {}
        real_idx = 0
        for u, v, _ in self.graph.edges(data=True):
            if u in _VIRTUAL_NODES or v in _VIRTUAL_NODES:
                continue
            eff_cap_by_idx[str(real_idx)] = self._eff_cap.get(self._ekey(u, v), 0.0)
            real_idx += 1

        # Min-cut dari state residual terakhir
        source_side, _ = self._find_min_cut(self._source)
        min_cut_edges = self._build_min_cut_edges(source_side)

        trace = {
            "meta": {
                "caseId": "case_04_pasar_tumpah",
                "source": self._source,
                "sink": self._sink,
                "alpha": self._alpha,
                "pasarActive": self._pasar_active,
            },
            "effectiveCapacity": eff_cap_by_idx,
            "steps": self._steps_visualizer,
            "result": {
                "maxFlow": self._max_flow,
                "minCut": min_cut_edges,
                "sourceSide": source_side,
            },
        }

        out_path = out_dir / filename
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(trace, f, indent=2, ensure_ascii=False)

        print(f"[FordFulkerson] Trace ditulis → {out_path}")
        return out_path

    # ------------------------------------------------------------------
    # run_all_pairs(): helper untuk menjalankan semua 4 pasangan × 2 α
    # ------------------------------------------------------------------
    @classmethod
    def run_all_pairs(
        cls,
        model: SpatialGraphModel,
        alphas: Optional[List[float]] = None,
        output_dir: Optional[Path] = None,
    ) -> List[Path]:
        """Jalankan Ford-Fulkerson untuk semua pasangan S-T dan nilai α.

        Default alphas: [0.0, 0.5]  (tanpa pasar, pasar penuh 50%)

        Returns:
            Daftar path berkas trace yang dihasilkan.
        """
        if alphas is None:
            alphas = [0.0, 0.5]

        written: List[Path] = []
        for src, sink in PAIRS:
            for alpha in alphas:
                solver = cls(model)
                flow = solver.run(src, sink, alpha=alpha)
                _label = {1: "S1", 2: "S2", 3: "T1", 4: "T2"}
                print(
                    f"[FordFulkerson] {_label[src]}→{_label[sink]}"
                    f"  α={alpha:.0%}  max-flow={flow:.1f}"
                )
                path = solver.export_visualizer_trace(output_dir=output_dir)
                written.append(path)
        return written


# Registrasi otomatis algoritma ke AlgorithmRegistry template dosen
from algorithms.registry import AlgorithmRegistry

AlgorithmRegistry.register("maxflow", FordFulkerson)
AlgorithmRegistry.register_alias("ford_fulkerson", "maxflow")
AlgorithmRegistry.register_alias("edmonds_karp", "maxflow")
