"""Iterative Ford-Fulkerson untuk kasus 4 pasar tumpah Gasibu.

Keempat pasangan S -> T (S1-T1, S1-T2, S2-T1, S2-T2) dihitung berurutan. Setiap pasangan mulai lagi
dari arus nol, lalu augmenting path dicari dengan Edmonds-Karp milik FordFulkerson (ford_fulkerson.py),
jadi angka per pasangan sama dengan trace_<S>_<T>_a<alpha>.json.
"""

from pathlib import Path
import sys
from typing import Any, Dict, List

# Pastikan root proyek masuk ke sys.path untuk eksekusi langsung
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from algorithms.maxflow.ford_fulkerson import PAIRS, FlowResult, FordFulkerson
from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel


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

        result = {
            "pairId": f"{codes[source]}-{codes[sink]}",
            "source": source,
            "sink": sink,
            "alpha": trace["meta"]["alpha"],
            "effectiveCapacity": trace["effectiveCapacity"],
            "steps": trace["steps"],
            "maxFlow": trace["result"]["maxFlow"],
            "minCut": trace["result"]["minCut"],
            "sourceSide": trace["result"]["sourceSide"],
        }
        self.results.append(result)
        self.log_step(
            event_type="PAIR_MAX_FLOW",
            state_mutations={"pair": result["pairId"], "alpha": result["alpha"], "max_flow": result["maxFlow"]},
        )
