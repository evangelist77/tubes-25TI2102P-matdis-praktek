import json
from pathlib import Path
import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
VISUALIZER_DIR = SCRIPT_DIR.parent
ROOT_DIR = VISUALIZER_DIR.parent

YAML_PATH = ROOT_DIR / "cases" / "scenarios" / "case_04_pasar_tumpah.yaml"
LABELS_PATH = VISUALIZER_DIR / "src" / "data" / "labels.json"
OUTPUT_PATH = VISUALIZER_DIR / "public" / "data" / "topology.json"

def main():
    print(f"Reading YAML from {YAML_PATH}...")
    with open(YAML_PATH, "r", encoding="utf-8") as f:
        yaml_data = yaml.safe_load(f)

    print(f"Reading Labels from {LABELS_PATH}...")
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        labels_data = json.load(f)

    node_labels = labels_data.get("nodes", {})
    edge_labels = labels_data.get("edges", {})

    nodes = []
    for node in yaml_data.get("nodes", []):
        nid = node["id"]
        meta = node_labels.get(str(nid), {})
        nodes.append({
            "id": nid,
            "code": meta.get("code", f"Node_{nid}"),
            "label": node.get("label", meta.get("label", "")),
            "pos": node.get("pos", [0.0, 0.0]),
            "type": meta.get("type", "junction")
        })

    edges = []
    for idx, edge in enumerate(yaml_data.get("edges", [])):
        meta = edge_labels.get(str(idx), {})
        edges.append({
            "id": idx,
            "from": edge["from"],
            "to": edge["to"],
            "capacity": float(edge.get("capacity", 1.0)),
            "weight": float(edge.get("weight", 1.0)),
            "code": meta.get("code", f"{edge['from']} -> {edge['to']}"),
            "road": meta.get("road", f"Ruas {edge['from']} ke {edge['to']}"),
            "isMarket": meta.get("isMarket", False),
            "isVirtual": meta.get("isVirtual", False),
            "closedInMorning": meta.get("closedInMorning", False)
        })

    events = yaml_data.get("execution_plan", {}).get("events", [])

    topology = {
        "case_id": yaml_data.get("case_id", "case_04_pasar_tumpah"),
        "title": yaml_data.get("title", ""),
        "description": yaml_data.get("description", ""),
        "nodes": nodes,
        "edges": edges,
        "events": events
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(topology, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {OUTPUT_PATH}")
    print(f"Total nodes: {len(nodes)}, Total edges: {len(edges)}, Total events: {len(events)}")

if __name__ == "__main__":
    main()

