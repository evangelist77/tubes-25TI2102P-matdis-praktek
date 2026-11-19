from collections import deque
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

# Pastikan root proyek masuk ke sys.path untuk eksekusi langsung
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from algorithms.maxflow.ford_fulkerson import (
    CLOSED_MORNING_EDGES,
    MARKET_EDGES,
    FlowResult,
    FordFulkerson,
    _ResidualEdge,
)
from core.base_algorithm import BaseGraphAlgorithm
from core.graph_model import SpatialGraphModel

EPS = 1e-9


class Dinic(BaseGraphAlgorithm):
    """Max flow dengan algoritma Dinic: level graph dari BFS, lalu blocking flow dengan DFS.

    Masukan, aturan kapasitas efektif, dan nilai kembalian sama dengan FordFulkerson supaya hasilnya bisa
    dibandingkan langsung.
    """

    SUPPORTED_EVENT_TYPES: Optional[frozenset] = frozenset({"DYNAMIC_EDGE_CAPACITY"})

    # baca topology.json dan aturan alpha / tutup pagi dipinjam dari Ford-Fulkerson, jadi tidak ditulis dua kali
    _load_topology = FordFulkerson._load_topology
    _get_effective_capacity = FordFulkerson._get_effective_capacity

    def __init__(self, model: SpatialGraphModel):
        super().__init__(model)
        self.topology: Optional[Dict[str, Any]] = self._load_topology()
        self._last_source: Optional[int] = None
        self._last_sink: Optional[int] = None
        self._last_alpha: float = 0.0
        # kapasitas hasil event dinamis, (u, v) -> kapasitas baru
        self._capacity_override: Dict[Tuple[int, int], float] = {}
        self._adj: Dict[int, List[_ResidualEdge]] = {}
        # (u, v) -> [(edge_id, is_market, closed_in_morning, sisi maju di graf residual)], untuk min cut dan event
        self._sisi: Dict[Tuple[int, int], List[Tuple[int, bool, bool, _ResidualEdge]]] = {}
        self._first_path: List[int] = []
        self.total_flow = 0.0
        # metrik run terakhir, dipakai untuk banding dengan Ford-Fulkerson
        self.strategy = ""
        self.bfs_phases = 0
        self.augmenting_paths = 0
        self.edges_scanned = 0
        self.elapsed_ms = 0.0

    def _bangun_residual(self, alpha: float) -> None:
        """Membangun graf residual dari topology.json (atau self.graph kalau tidak ada) dengan kapasitas efektif."""
        if self.topology and self.topology.get("edges"):
            edges = [
                (int(e["id"]), int(e["from"]), int(e["to"]), float(e.get("capacity", 1.0)),
                 bool(e.get("isMarket", False)), bool(e.get("closedInMorning", False)))
                for e in self.topology["edges"]
            ]
        else:
            edges = [
                (idx, u, v, float(d.get("capacity", d.get("weight", 1.0))), False, False)
                for idx, (u, v, d) in enumerate(self.graph.edges(data=True))
            ]

        self._adj = {n: [] for n in self.graph.nodes()}
        self._sisi = {}
        for eid, u, v, cap, is_m, is_c in edges:
            is_m = is_m or (u, v) in MARKET_EDGES
            is_c = is_c or (u, v) in CLOSED_MORNING_EDGES
            raw = self._capacity_override.get((u, v), cap)
            eff = self._get_effective_capacity(eid, u, v, raw, alpha, is_m, is_c)

            dari = self._adj.setdefault(u, [])
            ke = self._adj.setdefault(v, [])
            maju = _ResidualEdge(to=v, capacity=eff, edge_id=eid, is_reverse=False, rev_index=len(ke))
            ke.append(_ResidualEdge(to=u, capacity=0.0, edge_id=eid, is_reverse=True, rev_index=len(dari)))
            dari.append(maju)
            self._sisi.setdefault((u, v), []).append((eid, is_m, is_c, maju))

    def _bfs_level(self, s: int, t: int) -> Dict[int, int]:
        """BFS di graf residual. level[v] = jarak v dari s. Kalau t tidak ada di hasil, arus sudah maksimum."""
        level = {s: 0}
        antrian = deque([s])
        while antrian:
            u = antrian.popleft()
            if u == t:
                break
            self.edges_scanned += len(self._adj[u])
            for e in self._adj[u]:
                if e.to not in level and e.capacity - e.flow > EPS:
                    level[e.to] = level[u] + 1
                    antrian.append(e.to)
        self.bfs_phases += 1
        return level

    def _blocking_flow(self, s: int, t: int, level: Dict[int, int]) -> None:
        """Blocking flow di level graph dengan DFS. it[u] = indeks sisi berikutnya yang dicoba dari u, jadi sisi
        yang sudah jenuh atau buntu tidak diperiksa lagi dalam fase yang sama."""
        adj = self._adj
        it = dict.fromkeys(adj, 0)
        simpul = [s]  # simpul di jalur DFS sekarang
        jalur: List[_ResidualEdge] = []  # sisi residual di jalur DFS sekarang
        diperiksa = 0

        while True:
            u = simpul[-1]
            if u == t:
                self._dorong(jalur, simpul)
                # mundur ke sisi pertama yang jenuh, bagian jalur sebelum sisi itu masih bisa dipakai lagi
                k = next(i for i, e in enumerate(jalur) if e.capacity - e.flow <= EPS)
                del jalur[k:]
                del simpul[k + 1:]
                continue

            sisi = adj[u]
            i = it[u]
            while i < len(sisi):
                e = sisi[i]
                diperiksa += 1
                if level.get(e.to) == level[u] + 1 and e.capacity - e.flow > EPS:
                    break
                i += 1
            it[u] = i

            if i < len(sisi):
                jalur.append(sisi[i])
                simpul.append(sisi[i].to)
            elif u == s:
                break
            else:
                # u buntu, keluarkan dari jalur lalu lewati sisi yang menuju u
                jalur.pop()
                simpul.pop()
                it[simpul[-1]] += 1

        self.edges_scanned += diperiksa

    def _dorong(self, jalur: List[_ResidualEdge], simpul: List[int]) -> None:
        """Alirkan bottleneck di sepanjang jalur s -> t yang ditemukan DFS."""
        bottleneck = min(e.capacity - e.flow for e in jalur)
        for e in jalur:
            e.flow += bottleneck
            self._adj[e.to][e.rev_index].flow -= bottleneck
        self.total_flow += bottleneck
        self.augmenting_paths += 1
        if not self._first_path:
            self._first_path = list(simpul)

        self.log_step(
            event_type="AUGMENTING_PATH_FOUND",
            state_mutations={
                "step": self.augmenting_paths,
                "path": list(simpul),
                "bottleneck": bottleneck,
                "total_flow": self.total_flow,
            },
        )

    def _alirkan(self, s: int, t: int, strategy: str) -> FlowResult:
        """Ulangi fase Dinic (BFS level graph lalu blocking flow) sampai t tidak terjangkau dari s."""
        self.strategy = strategy
        self.bfs_phases = 0
        self.augmenting_paths = 0
        self.edges_scanned = 0
        self._first_path = []

        self.log_step(
            event_type="INITIALIZATION",
            state_mutations={
                "source": s,
                "sink": t,
                "alpha": self._last_alpha,
                "strategy": strategy,
                "max_flow": self.total_flow,
            },
        )

        while True:
            level = self._bfs_level(s, t)
            if t not in level:
                break
            self.log_step(
                event_type="LEVEL_GRAPH",
                state_mutations={"phase": self.bfs_phases, "sink_level": level[t]},
            )
            self._blocking_flow(s, t, level)

        # BFS terakhir tidak sampai ke t, jadi simpul yang terjangkau = sisi s dari min cut
        source_side = set(level)
        min_cut = sorted(
            eid
            for (u, v), daftar in self._sisi.items()
            if u in source_side and v not in source_side
            for eid, *_ in daftar
        )
        self.log_step(
            event_type="MAX_FLOW_REACHED",
            state_mutations={
                "max_flow": self.total_flow,
                "min_cut": min_cut,
                "source_side": sorted(source_side),
            },
        )

        return FlowResult(self.total_flow, path=self._first_path or [s, t])

    def run(
        self,
        start_node: int,
        goal_node: int,
        alpha: float = 0.0,
        **kwargs,
    ) -> FlowResult:
        """Menghitung Maximum Flow dari start_node ke goal_node dari nol."""
        mulai = time.perf_counter()
        self._last_source = start_node
        self._last_sink = goal_node
        self._last_alpha = alpha

        self._bangun_residual(alpha)
        self._adj.setdefault(start_node, [])
        self._adj.setdefault(goal_node, [])
        self.total_flow = 0.0

        hasil = self._alirkan(start_node, goal_node, "hitung_ulang")
        self.elapsed_ms = (time.perf_counter() - mulai) * 1000
        return hasil

    def handle_dynamic_event(self, event_data: Dict[str, Any]) -> FlowResult:
        """Menangani DYNAMIC_EDGE_CAPACITY.

        Kalau kapasitas baru masih >= arus yang sedang lewat di sisi itu, arus lama tetap sah, jadi cukup
        dilanjutkan di graf residual (warm start). Kalau lebih kecil, arus lama melanggar kapasitas dan
        max flow dihitung ulang dari nol.
        """
        mulai = time.perf_counter()
        target = event_data.get("edge") or event_data.get("target_edge")
        new_cap = float(event_data.get("new_capacity", event_data.get("new_weight", 0.0)))
        start = event_data.get("start", self._last_source or 0)
        goal = event_data.get("goal", self._last_sink or 27)

        key = None
        if target and len(target) == 2:
            u, v = int(target[0]), int(target[1])
            if self.graph.has_edge(u, v):
                key = (u, v)
                self.graph[u][v]["capacity"] = new_cap
                self._capacity_override[key] = new_cap
                self.log_step(
                    event_type="DYNAMIC_EDGE_CAPACITY",
                    state_mutations={
                        "edge": [u, v],
                        "new_capacity": new_cap,
                        "description": event_data.get("description", ""),
                    },
                )

        if not self._adj or (start, goal) != (self._last_source, self._last_sink):
            return self.run(start, goal, alpha=self._last_alpha)

        # kapasitas efektif baru tiap sisi (u, v), aturan alpha tetap sama dengan run()
        baru = []
        if key:
            for eid, is_m, is_c, maju in self._sisi.get(key, []):
                cap = self._get_effective_capacity(eid, key[0], key[1], new_cap, self._last_alpha, is_m, is_c)
                baru.append((maju, cap))
        if any(cap < maju.flow - EPS for maju, cap in baru):
            return self.run(start, goal, alpha=self._last_alpha)

        for maju, cap in baru:
            maju.capacity = cap
        hasil = self._alirkan(start, goal, "warm_start")
        self.elapsed_ms = (time.perf_counter() - mulai) * 1000
        return hasil

