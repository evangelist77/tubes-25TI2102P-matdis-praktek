from algorithms.maxflow.ford_fulkerson import SCENARIO_YAML_FILE, FordFulkerson
from cases.scenario_loader import ScenarioLoader


def test_event_tutup_gasibu_atas_dipakai_run():
    ff = FordFulkerson(ScenarioLoader(SCENARIO_YAML_FILE).build_graph_model())
    awal = float(ff.run(0, 27))
    # runner template mengirim nilai event lewat new_weight
    sesudah = float(ff.handle_dynamic_event({"edge": (24, 25), "new_weight": 0.0, "start": 0, "goal": 27}))
    assert ff._last_trace_data["effectiveCapacity"]["25"] == 0.0  # edge 25 = Jl. Gasibu Atas (24 -> 25)
    assert sesudah < awal
