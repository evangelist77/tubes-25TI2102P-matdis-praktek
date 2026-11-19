"""Banding Ford-Fulkerson (Edmonds-Karp) dengan Dinic untuk kasus 4 pasar tumpah Gasibu.

Jalankan dari root repo:  python -m scripts.banding_ff_dinic
Hasil ditulis ke output/banding_ff_dinic.csv dan diringkas di terminal.

Bagian yang diukur:
  normal  : alpha = 0, S* -> T* dan 4 pasangan
  pasar   : alpha = OBSERVED_ALPHA, pasangan yang sama
  event   : event skenario dijalankan berurutan, FF selalu hitung ulang, Dinic warm start kalau bisa
  skala   : graf grid sintetis yang makin besar, untuk melihat kapan Dinic mulai unggul

Catatan: waktu FF ikut menghitung penyusunan trace visualizer per langkah (edgeFlows dan narasi), jadi
untuk banding kerja algoritmanya lihat juga kolom sisi_diperiksa.
"""
import csv
import random
import statistics
import time

import networkx as nx

from algorithms.maxflow.dinic import Dinic
from algorithms.maxflow.ford_fulkerson import OBSERVED_ALPHA, PAIRS, SCENARIO_YAML_FILE, FordFulkerson
from cases.scenario_loader import ScenarioLoader
from config.settings import OUTPUT_DIR
from core.graph_model import SpatialGraphModel

ULANG = 7  # tiap pengukuran diulang, waktu diambil mediannya
ULANG_SKALA = 3  # grid besar cukup 3 kali, FF di grid 45x45 bisa beberapa detik sekali jalan
UKURAN_GRID = [5, 10, 20, 30, 45]  # grid n x n, jumlah simpul n*n + 2
ALGORITMA = [("ford_fulkerson", FordFulkerson), ("dinic", Dinic)]
KOLOM = ["bagian", "kasus", "algoritma", "max_flow", "bfs", "augmenting_path", "sisi_diperiksa", "strategi", "waktu_ms"]


def metrik(solver):
    """(bfs, augmenting path, sisi diperiksa, strategi) dari run terakhir solver."""
    if isinstance(solver, Dinic):
        return solver.bfs_phases, solver.augmenting_paths, solver.edges_scanned, solver.strategy
    # FF tidak menyimpan jumlah BFS: satu BFS per augmenting path ditambah satu BFS terakhir yang gagal
    langkah = len(solver._last_trace_data["steps"])
    return langkah + 1, langkah, solver.edges_scanned, "hitung_ulang"


def ukur(bagian, kasus, nama, siapkan, aksi, ulang=ULANG):
    """Jalankan aksi(solver) sebanyak ulang kali, tiap kali pada solver baru dari siapkan(). Persiapan tidak ikut diukur."""
    waktu = []
    for _ in range(ulang):
        solver = siapkan()
        mulai = time.perf_counter()
        hasil = aksi(solver)
        waktu.append((time.perf_counter() - mulai) * 1000)
    bfs, jalur, diperiksa, strategi = metrik(solver)
    return {
        "bagian": bagian,
        "kasus": kasus,
        "algoritma": nama,
        "max_flow": round(float(hasil), 2),
        "bfs": bfs,
        "augmenting_path": jalur,
        "sisi_diperiksa": diperiksa,
        "strategi": strategi,
        "waktu_ms": round(statistics.median(waktu), 4),
    }


def data_event(event, start, goal):
    # sama dengan yang dikirim SimulationRunner template
    return {"edge": tuple(event["target_edge"]), "new_weight": event["new_weight"], "start": start, "goal": goal}


def graf_grid(n, seed=42):
    """Grid n x n, arus dari kolom kiri ke kolom kanan. Sisi ke kanan dan naik turun, kapasitas acak 1-100."""
    rng = random.Random(seed)
    g = nx.DiGraph()
    s, t = 0, n * n + 1

    def idx(r, c):
        return 1 + r * n + c

    for r in range(n):
        g.add_edge(s, idx(r, 0), capacity=10**6)
        g.add_edge(idx(r, n - 1), t, capacity=10**6)
        for c in range(n):
            if c + 1 < n:
                g.add_edge(idx(r, c), idx(r, c + 1), capacity=rng.randint(1, 100))
            if r + 1 < n:
                g.add_edge(idx(r, c), idx(r + 1, c), capacity=rng.randint(1, 100))
                g.add_edge(idx(r + 1, c), idx(r, c), capacity=rng.randint(1, 100))
    return g, s, t


def main():
    loader = ScenarioLoader(SCENARIO_YAML_FILE)
    plan = loader.get_execution_plan()
    start, goal = plan["start_node"], plan["goal_node"]
    rows = []

    # (a) dan (b) kondisi normal dan pasar
    pasangan = [(start, goal, "S*->T*")] + [(p["source"], p["sink"], f"{p['sCode']}->{p['tCode']}") for p in PAIRS]
    for bagian, alpha in [("normal", 0.0), ("pasar", OBSERVED_ALPHA)]:
        for s, t, label in pasangan:
            for nama, kelas in ALGORITMA:
                rows.append(ukur(
                    bagian, f"{label} a={alpha:g}", nama,
                    lambda kelas=kelas: kelas(loader.build_graph_model()),
                    lambda solver, s=s, t=t, alpha=alpha: solver.run(s, t, alpha=alpha),
                ))

    # (c) event dinamis berurutan, persiapan = run awal + event sebelumnya
    events = plan.get("events", [])
    for i, event in enumerate(events):
        u, v = event["target_edge"]
        kasus = f"event {event.get('step', i + 1)}: ({u},{v}) -> {event['new_weight']:g}"
        for nama, kelas in ALGORITMA:

            def siapkan(kelas=kelas, sebelum=events[:i]):
                solver = kelas(loader.build_graph_model())
                solver.run(start, goal)
                for ev in sebelum:
                    solver.handle_dynamic_event(data_event(ev, start, goal))
                return solver

            rows.append(ukur(
                "event", kasus, nama, siapkan,
                lambda solver, event=event: solver.handle_dynamic_event(data_event(event, start, goal)),
            ))

    # (d) skala, solver diarahkan ke graf sintetis (bukan topology.json)
    for n in UKURAN_GRID:
        g, s, t = graf_grid(n)
        kasus = f"grid {n}x{n} ({g.number_of_nodes()} simpul, {g.number_of_edges()} sisi)"
        for nama, kelas in ALGORITMA:

            def siapkan(kelas=kelas, g=g):
                solver = kelas(SpatialGraphModel(g))
                solver.topology = None
                return solver

            rows.append(ukur("skala", kasus, nama, siapkan, lambda solver, s=s, t=t: solver.run(s, t), ULANG_SKALA))

    out_path = OUTPUT_DIR / "banding_ff_dinic.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=KOLOM)
        writer.writeheader()
        writer.writerows(rows)

    print(f" {'Bagian':<7} {'Kasus':<44} {'Algoritma':<15} {'MaxFlow':>9} {'BFS':>5} {'Path':>6} "
          f"{'Sisi':>9} {'Strategi':<13} {'Waktu ms':>10}")
    print(" " + "-" * 125)
    for r in rows:
        print(f" {r['bagian']:<7} {r['kasus']:<44} {r['algoritma']:<15} {r['max_flow']:>9.1f} {r['bfs']:>5} "
              f"{r['augmenting_path']:>6} {r['sisi_diperiksa']:>9} {r['strategi']:<13} {r['waktu_ms']:>10.3f}")
    print(f"\n Waktu = median {ULANG} kali jalan ({ULANG_SKALA} kali untuk grid). CSV: {out_path}")


if __name__ == "__main__":
    main()
