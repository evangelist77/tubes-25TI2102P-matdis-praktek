"""Iterative Ford-Fulkerson untuk kasus 4 pasar tumpah Gasibu.

Keempat pasangan S -> T (S1-T1, S1-T2, S2-T1, S2-T2) dihitung berurutan. Setiap pasangan mulai lagi
dari arus nol, lalu augmenting path dicari dengan Edmonds-Karp milik FordFulkerson (ford_fulkerson.py),
jadi angka per pasangan sama dengan trace_<S>_<T>_a<alpha>.json. Tambahan di sini: arah tiap ruas pada
augmenting path (maju atau edge balik) dan sisa kapasitasnya sebelum dialiri, supaya visualisasi
iterative cukup membaca trace tanpa menghitung sendiri.
"""

import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

# Pastikan root proyek masuk ke sys.path untuk eksekusi langsung
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from algorithms.maxflow.ford_fulkerson import (
    OBSERVED_ALPHA,
    PAIRS,
    SCENARIO_YAML_FILE,
    VISUALIZER_DATA_DIR,
    FlowResult,
    FordFulkerson,
)
from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel

# Nilai alpha sama dengan generate_all_traces di ford_fulkerson.py (0%, 10%, ..., 100%)
# alpha 0 sampai 1,0 tiap 0,1 untuk sensitivitas, ditambah OBSERVED_ALPHA supaya kondisi pasar penuh juga punya trace
ALPHAS: List[float] = sorted({round(k * 0.1, 2) for k in range(11)} | {OBSERVED_ALPHA})


class IterativeFordFulkerson(BaseGraphAlgorithm):
    """Max flow keempat pasangan S -> T satu per satu, arus direset setiap ganti pasangan."""

    SUPPORTED_EVENT_TYPES = FordFulkerson.SUPPORTED_EVENT_TYPES

    def __init__(self, model: SpatialGraphModel):
        super().__init__(model)
        # BFS Edmonds-Karp, kapasitas efektif (alpha), dan event dinamis dipakai dari solver Elang
        self.ff = FordFulkerson(model)
        if self.ff.topology is None:
            raise RuntimeError("topology.json belum ada, jalankan dulu npm run convert:yaml di visualizer/")
        self.results: List[Dict[str, Any]] = []

    def run(self, start_node: int, goal_node: int, alpha: float = 0.0, **kwargs) -> FlowResult:
        """Satu putaran iterasi: max flow satu pasangan, dihitung dari arus nol."""
        flow = self.ff.run(start_node, goal_node, alpha=alpha)
        self._collect_result()
        return flow

    def run_all(self, alpha: float = 0.0) -> List[Dict[str, Any]]:
        """Menjalankan keempat pasangan berurutan sesuai urutan PAIRS."""
        self.results = []
        for pair in PAIRS:
            self.run(pair["source"], pair["sink"], alpha=alpha)
        return self.results

    def handle_dynamic_event(self, event_data: Dict[str, Any]) -> FlowResult:
        """Event DYNAMIC_EDGE_CAPACITY diteruskan ke FordFulkerson, lalu pasangan terakhir dihitung ulang."""
        flow = self.ff.handle_dynamic_event(event_data)
        self._collect_result()
        return flow

    def _collect_result(self) -> None:
        """Menyimpan hasil satu pasangan dari trace FordFulkerson yang terakhir."""
        trace = self.ff._last_trace_data
        source, sink = trace["meta"]["source"], trace["meta"]["sink"]
        codes = {n["id"]: n.get("code", str(n["id"])) for n in self.ff.topology["nodes"]}
        edges = {int(e["id"]): e for e in self.ff.topology["edges"]}
        cap = {int(k): v for k, v in trace["effectiveCapacity"].items()}

        steps: List[Dict[str, Any]] = []
        prev = {eid: 0.0 for eid in cap}
        for st in trace["steps"]:
            flows = {int(k): v for k, v in st["edgeFlows"].items()}
            # arus naik = ruas dilewati maju, arus turun = lewat edge balik (arus lama dibatalkan)
            hop: Dict[int, Dict[str, Any]] = {}
            for eid, f in flows.items():
                u, v = edges[eid]["from"], edges[eid]["to"]
                if f > prev[eid]:
                    hop[u] = {"edgeId": eid, "from": u, "to": v, "isBackward": False,
                              "residualBefore": round(cap[eid] - prev[eid], 2)}
                elif f < prev[eid]:
                    hop[v] = {"edgeId": eid, "from": v, "to": u, "isBackward": True,
                              "residualBefore": prev[eid]}

            # susun lintasan dari source sampai sink, tiap simpul cuma dilewati sekali
            path: List[Dict[str, Any]] = []
            node = source
            while node != sink:
                path.append(hop[node])
                node = hop[node]["to"]

            steps.append({
                "step": st["step"],
                "path": path,
                "pathNodes": [source] + [t["to"] for t in path],
                "bottleneck": st["bottleneck"],
                "totalFlow": st["totalFlow"],
                "edgeFlows": st["edgeFlows"],
            })
            prev = flows

        result = {
            "pairId": f"{codes[source]}-{codes[sink]}",
            "source": source,
            "sink": sink,
            "alpha": trace["meta"]["alpha"],
            "effectiveCapacity": trace["effectiveCapacity"],
            "steps": steps,
            "maxFlow": trace["result"]["maxFlow"],
            "minCut": trace["result"]["minCut"],
            "sourceSide": trace["result"]["sourceSide"],
        }
        self.results.append(result)
        self.log_step(
            event_type="PAIR_MAX_FLOW",
            state_mutations={"pair": result["pairId"], "alpha": result["alpha"], "max_flow": result["maxFlow"]},
        )


def generate_iterative_traces(
    model: SpatialGraphModel,
    output_dir: Optional[Path] = None,
    alphas: Optional[List[float]] = None,
) -> List[Path]:
    """Menulis iterative_a<alpha>.json, satu berkas per alpha berisi hasil keempat pasangan."""
    out_dir = output_dir or VISUALIZER_DATA_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    written: List[Path] = []
    for alpha in alphas or ALPHAS:
        solver = IterativeFordFulkerson(model)
        data = {
            "caseId": solver.ff.topology.get("case_id", "case_04_pasar_tumpah"),
            "alpha": alpha,
            "pairs": solver.run_all(alpha),
        }
        out_path = out_dir / f"iterative_a{int(round(alpha * 100))}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        written.append(out_path)

    return written


# Registrasi otomatis ke AlgorithmRegistry
from algorithms.registry import AlgorithmRegistry

AlgorithmRegistry.register("iterative_ford_fulkerson", IterativeFordFulkerson)


if __name__ == "__main__":
    from cases.scenario_loader import ScenarioLoader

    model = ScenarioLoader(SCENARIO_YAML_FILE).build_graph_model()

    print("Iterative Ford-Fulkerson, max flow tiap pasangan (kend/jam):")
    for alpha in (0.0, OBSERVED_ALPHA):
        hasil = IterativeFordFulkerson(model).run_all(alpha)
        ringkas = ", ".join(f"{r['pairId']} = {r['maxFlow']:.0f}" for r in hasil)
        print(f"  alpha {alpha:.0%}: {ringkas}")

    files = generate_iterative_traces(model)
    print(f"{len(files)} trace iterative ditulis ke {files[0].parent}")
