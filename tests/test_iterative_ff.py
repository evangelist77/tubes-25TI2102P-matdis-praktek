import json

import pytest

from algorithms.maxflow.ford_fulkerson import OBSERVED_ALPHA, SCENARIO_YAML_FILE
from algorithms.maxflow.iterative_ford_fulkerson import IterativeFordFulkerson, generate_iterative_traces
from algorithms.registry import AlgorithmRegistry
from cases.scenario_loader import ScenarioLoader
from core.graph_model import SpatialGraphModel

# graf kecil: jalur kedua harus membatalkan arus A -> D lewat edge balik
# simpul 0 = S1, 1 = A, 2 = B, 3 = C, 4 = D, 5 = T1, semua kapasitas 1
FIXTURE = {
    "case_id": "fixture",
    "nodes": [{"id": i, "code": c} for i, c in enumerate(["S1", "A", "B", "C", "D", "T1"])],
    "edges": [
        {"id": i, "from": u, "to": v, "capacity": 1}
        for i, (u, v) in enumerate([(0, 1), (1, 4), (4, 5), (0, 2), (2, 4), (1, 3), (3, 5)])
    ],
}


@pytest.fixture(scope="module")
def model():
    return ScenarioLoader(SCENARIO_YAML_FILE).build_graph_model()


def test_edge_balik_tercatat_di_lintasan():
    solver = IterativeFordFulkerson(SpatialGraphModel())
    solver.ff.topology = FIXTURE
    solver.run(0, 5)
    hasil = solver.results[0]

    assert hasil["pairId"] == "S1-T1"
    assert hasil["maxFlow"] == 2
    langkah2 = hasil["steps"][1]
    assert langkah2["pathNodes"] == [0, 2, 4, 1, 3, 5]
    balik = [t for t in langkah2["path"] if t["isBackward"]]
    assert balik == [{"edgeId": 1, "from": 4, "to": 1, "isBackward": True, "residualBefore": 1.0}]
    assert langkah2["edgeFlows"][1] == 0  # arus A -> D dibatalkan


@pytest.mark.parametrize("alpha", [0.0, OBSERVED_ALPHA])
def test_semua_pasangan_konsisten(model, alpha):
    solver = IterativeFordFulkerson(model)
    hasil = solver.run_all(alpha)
    assert [r["pairId"] for r in hasil] == ["S1-T1", "S1-T2", "S2-T1", "S2-T2"]

    for r in hasil:
        cap = {int(k): v for k, v in r["effectiveCapacity"].items()}
        total = 0.0
        for st in r["steps"]:
            # total per langkah = total sebelumnya + bottleneck, bottleneck = sisa terkecil di lintasan
            total += st["bottleneck"]
            assert st["totalFlow"] == pytest.approx(total)
            assert st["bottleneck"] == pytest.approx(min(t["residualBefore"] for t in st["path"]))
            assert st["pathNodes"][0] == r["source"] and st["pathNodes"][-1] == r["sink"]
            for eid, f in st["edgeFlows"].items():
                assert 0 <= f <= cap[int(eid)] + 1e-9, f"{r['pairId']} edge {eid}"
        assert r["maxFlow"] == pytest.approx(total)

        # konservasi arus di simpul perantara pada kondisi akhir
        akhir = {int(k): v for k, v in r["steps"][-1]["edgeFlows"].items()} if r["steps"] else {}
        bersih = {}
        for e in solver.ff.topology["edges"]:
            f = akhir.get(e["id"], 0.0)
            bersih[e["from"]] = bersih.get(e["from"], 0.0) - f
            bersih[e["to"]] = bersih.get(e["to"], 0.0) + f
        for node, selisih in bersih.items():
            if node not in (r["source"], r["sink"]):
                assert selisih == pytest.approx(0.0, abs=0.01), f"{r['pairId']} simpul {node}"

        # max flow = jumlah kapasitas min-cut
        assert sum(cap[e] for e in r["minCut"]) == pytest.approx(r["maxFlow"])


def test_registry_dan_kontrak_template(model):
    solver = AlgorithmRegistry.create("iterative_ford_fulkerson", model)
    path, cost = solver.run(0, 27)
    assert isinstance(solver, IterativeFordFulkerson)
    assert path[0] == 0 and path[-1] == 27 and cost > 0


def test_generator_menulis_satu_berkas_per_alpha(model, tmp_path):
    files = generate_iterative_traces(model, output_dir=tmp_path, alphas=[0.0, 0.5])
    assert [f.name for f in files] == ["iterative_a0.json", "iterative_a50.json"]
    data = json.loads(files[1].read_text(encoding="utf-8"))
    assert data["alpha"] == 0.5 and len(data["pairs"]) == 4
