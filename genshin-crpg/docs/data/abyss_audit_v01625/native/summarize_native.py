#!/usr/bin/env python3
"""Read-only aggregation and SHA verification of the six official audit bundles."""
import argparse
import collections
import csv
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent
REPO = BASE.parents[3]
BUNDLES = {
    "floor12_preparation": "final12_cases.json",
    "counter_preparation": "counter_cases.json",
    "roles_preparation": "roles_cases.json",
    "fixed_preparation": "fixed_preparation_cases.json",
    "release_floor10_11": "cases.json",
    "last_pyro": "last_pyro_cases.json",
}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def load(p):
    return json.loads(Path(p).read_text())


def clean(row):
    return row["state"] == "CLEARED" and not any(r.get("ko") for r in row["rooms"])


def aggregate(rows):
    return {
        "executions": len(rows),
        "chambersStarted": sum("initialActors" in r for x in rows for r in x["rooms"]),
        "stateCounts": dict(collections.Counter(x["state"] for x in rows)),
        "clearedWithNoNativeKO": sum(clean(x) for x in rows),
        "clearedWithNativeKO": sum(x["state"] == "CLEARED" and not clean(x) for x in rows),
        "executionsWithNativeKO": sum(any(r.get("ko") for r in x["rooms"]) for x in rows),
        "nativeKOThenPositivePersistentHP": sum(
            sum(t.get("persistentHP", 0) > 0 for t in r.get("nativeDownedPersistentRevived", []))
            for x in rows for r in x["rooms"]
        ),
        "entryBlocked": sum(x["state"] == "ENTRY_BLOCKED" for x in rows),
        "floor12MasteryFalse": sum(r.get("mastery") is False for x in rows for r in x["rooms"]),
        "inputLimit": sum(x["state"] == "INPUT_LIMIT" for x in rows),
        "errors": sum(x["state"] == "ERROR" or bool(x["errors"]) for x in rows),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=REPO)
    args = parser.parse_args()
    root = args.root.resolve()
    result = {
        "publishedCommit": "46190377b713e6218e66b26bc4292f18fb5a348d",
        "policy": "Six official bundles only. Counts describe these selected executions, including paired baseline repeats; they are not population win probabilities.",
        "cleanDefinition": "CLEARED and every chamber's native pre-settlement actor KO list empty. Persistent finalHP or finalKo alone is insufficient because the protagonist can revive to 10% in victory settlement.",
        "bundles": {},
        "groups": [],
    }
    validation = {"checks": [], "bundles": {}, "scope": "Product source/DB read-only; aggregator output only."}
    all_rows = []
    table = []
    reference_sources = None
    for bundle, cases_file in BUNDLES.items():
        directory = BASE / bundle
        manifest = load(directory / "input_manifest.json")
        data = json.loads(gzip.decompress((directory / "native.json.gz").read_bytes()))
        summary = load(directory / "summary.json")
        assert sha(directory / "runner.cjs") == manifest["runner"], bundle + ": runner snapshot mismatch"
        syntax = subprocess.run(["node", "--check", str(directory / "runner.cjs")], capture_output=True, text=True)
        assert syntax.returncode == 0, bundle + ": runner syntax " + syntax.stderr
        assert sha(BASE / cases_file) == manifest["cases"], bundle + ": case file mismatch"
        assert len(data["sourceHashes"]) == 120
        assert data["sourceHashes"] == manifest["sourceHashes"]
        assert data["frozen"] == manifest["frozen"]
        assert len(data["frozen"]) == 6
        assert data["rawDbSHA256"] == manifest["rawDbSHA256"]
        assert data["fingerprint"] == manifest["fingerprint"]
        assert data["publishedCommit"] == result["publishedCommit"]
        assert summary["conditions"] == len(data["rows"])
        assert summary["counts"] == aggregate(data["rows"])["stateCounts"]
        if reference_sources is None:
            reference_sources = manifest["sourceHashes"]
            result["fingerprint"] = manifest["fingerprint"]
            result["rawDbSHA256"] = manifest["rawDbSHA256"]
        assert manifest["sourceHashes"] == reference_sources, bundle + ": bundle product drift"
        assert manifest["fingerprint"] == result["fingerprint"]
        assert manifest["rawDbSHA256"] == result["rawDbSHA256"]
        cases = {r["id"]: r for r in load(BASE / cases_file)}
        for row in data["rows"]:
            assert row["spec"] == cases[row["spec"]["id"]], bundle + ": spec mismatch"
            assert row["seed"] in [717, 4242, 9031]
            assert row["inputs"] == sum(len(r["actions"]) for r in row["rooms"])
            assert all(len(r["actions"]) <= 80 for r in row["rooms"])
            native_ko = [r.get("ko", []) for r in row["rooms"]]
            consumed = collections.Counter()
            medicine = collections.Counter()
            for use in row["consumed"]:
                consumed[use["item"]] += use.get("consumed", 0)
                if use.get("source") == "COMBAT":
                    medicine[use["item"]] += use.get("consumed", 0)
            table.append({
                "bundle": bundle,
                "id": row["spec"]["id"],
                "floor": row["spec"]["floor"],
                "seed": row["seed"],
                "artifactSeed": row["spec"].get("artifactSeed", row["seed"]),
                "investment": row["spec"]["investment"],
                "prep": row["spec"]["prep"],
                "policy": row["spec"].get("policy", "E_FIRST"),
                "state": row["state"],
                "noNativeKOClear": clean(row),
                "rounds": row["rounds"],
                "inputs": row["inputs"],
                "persistentHPRatio": row["hpRatio"],
                "foodConsumed": sum(n for item, n in consumed.items() if item.startswith("FOOD_")),
                "medicineConsumed": sum(medicine.values()),
                "consumed": json.dumps(dict(consumed), ensure_ascii=False, sort_keys=True),
                "nativeKOByRoom": json.dumps(native_ko),
            })
        groups = collections.defaultdict(list)
        for row in data["rows"]:
            groups[row["spec"]["id"]].append(row)
        for case_id, rows in groups.items():
            assert sorted(r["seed"] for r in rows) == [717, 4242, 9031]
            result["groups"].append({"bundle": bundle, "id": case_id, "spec": rows[0]["spec"], **aggregate(rows)})
        result["bundles"][bundle] = aggregate(data["rows"])
        validation["bundles"][bundle] = {
            "runnerSHA256": manifest["runner"], "snapshotMatchesManifest": True,
            "nodeSyntaxCheck": True,
            "casesFile": cases_file, "casesSHA256": manifest["cases"],
            "selectedIds": sorted(groups), "seeds": [717, 4242, 9031],
            "sourceHashes120Identical": True, "productFrozen6Identical": True,
        }
        (directory / "runner.cjs.gz").write_bytes(gzip.compress((directory / "runner.cjs").read_bytes(), mtime=0))
        all_rows += data["rows"]
    for p, h in reference_sources.items():
        assert sha(root / p) == h, "Live source drift: " + p
    assert sha(root / "content/db.json") == result["rawDbSHA256"], "Live QA DB drift"
    helper = BASE / "harness/audit_protagonist_v01618.cjs"
    if helper.exists():
        assert sha(root / "tools/audit_protagonist_v01618.cjs") == sha(helper), "Live fixture helper drift"
        validation["helperSHA256"] = sha(helper)
        validation["liveHelperMatchesStoredFinalSnapshot"] = True
    result["total"] = aggregate(all_rows)
    assert result["total"]["executions"] == 147
    # Equipment/seed717 baseline repeats are intentional in the fixed-fixture RNG bundle.
    result["repeatNote"] = "The fixed_preparation seed717 rows repeat paired baseline conditions from floor12_preparation. Report 147 executions, not 147 unique independent trials."
    validation["checks"] = [
        "All six stored runner snapshots match their input manifests.",
        "Every selected case spec and all three combat seeds match recorded inputs.",
        "All bundles contain identical 120 product source hashes, six frozen source hashes, QA DB SHA256 and loader fingerprint.",
        "Current 120 product files and QA DB still match the recorded frozen inputs.",
        "147 selected executions; native KO and actual COMBAT medicinal consumption are aggregated separately from persistent HP and food.",
    ]
    validation["pass"] = True
    for name, obj in [("official_summary.json", result), ("validation.json", validation)]:
        (BASE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")
    with (BASE / "official_rows.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(table[0]))
        writer.writeheader()
        writer.writerows(table)
    print(json.dumps(result["total"], ensure_ascii=False))


if __name__ == "__main__":
    main()
