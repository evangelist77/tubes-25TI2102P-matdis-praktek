import pytest

from algorithms.maxflow.dinic import Dinic
from algorithms.maxflow.ford_fulkerson import PAIRS, SCENARIO_YAML_FILE, FordFulkerson
from algorithms.registry import AlgorithmRegistry
from cases.scenario_loader import ScenarioLoader

LOADER = ScenarioLoader(SCENARIO_YAML_FILE)
PASANGAN = [(0, 27)] + [(p["source"], p["sink"]) for p in PAIRS]


def _event(edge, nilai):
    # bentuk event sama dengan yang dikirim SimulationRunner template
    return {"edge": edge, "new_weight": nilai, "start": 0, "goal": 27}


@pytest.mark.parametrize("alpha", [0.0, 0.3, 0.75, 1.0])
def test_dinic_sama_dengan_ff(alpha):
    for s, t in PASANGAN:
        ff = FordFulkerson(LOADER.build_graph_model()).run(s, t, alpha=alpha)
        dinic = Dinic(LOADER.build_graph_model()).run(s, t, alpha=alpha)
        assert float(dinic) == float(ff), (s, t, alpha)


def test_event_skenario_dinic_sama_dengan_ff():
    ff = FordFulkerson(LOADER.build_graph_model())
    dinic = AlgorithmRegistry.create("dinic", LOADER.build_graph_model())
    ff.run(0, 27)
    dinic.run(0, 27)
    for ev in LOADER.get_execution_plan()["events"]:
        data = _event(tuple(ev["target_edge"]), ev["new_weight"])
        assert float(dinic.handle_dynamic_event(data)) == float(ff.handle_dynamic_event(data)), ev["step"]


def test_warm_start_sama_dengan_hitung_ulang():
    dinic = Dinic(LOADER.build_graph_model())
    dinic.run(0, 27)
    # kapasitas naik, arus lama pasti masih sah jadi harus warm start
    hasil = dinic.handle_dynamic_event(_event((11, 12), 1000.0))
    assert dinic.strategy == "warm_start"

    dari_nol = Dinic(LOADER.build_graph_model())
    dari_nol._capacity_override = dict(dinic._capacity_override)
    assert float(hasil) == float(dari_nol.run(0, 27))
