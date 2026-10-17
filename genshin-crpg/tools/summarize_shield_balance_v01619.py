#!/usr/bin/env python3
"""Summarize paired native shield campaigns without pooling different encounters."""
import argparse
import gzip
import json
import statistics
from collections import defaultdict
from pathlib import Path


def read(path):
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        return json.load(stream)


def identity(row):
    return (row.get("map") or row.get("domain"), row["level"], row["name"], row["seed"])


def summarize(row):
    fights = []
    coexist = []
    for battle in row["battles"]:
        allies = {a["id"] for a in battle["initial"]["actors"] if a["side"] == "ALLY"}
        last = battle.get("last") or {}
        actors = [a for a in last.get("actors", []) if a["side"] == "ALLY"]
        hp_packets = [e for e in last.get("log", []) if e.get("targetId") in allies
                      and "damage" in e and "hpBefore" in e and "hpAfter" in e]
        before_levels = {a["owner"]: a["level"] for a in battle["before"]}
        level_ups = [a["owner"] for a in battle["after"] if a["level"] > before_levels.get(a["owner"], a["level"])]
        for event in battle["shieldEvents"]:
            shields = {s["source"]: s for s in event["after"] if s["value"] > 0}
            if "LIYUE_ZHONGLI_E" in shields and "RX_CRYSTALLIZE" in shields:
                coexist.append({"fight": battle["n"], "round": event["round"],
                                "actor": event["actor"], "generatedSource": event["source"],
                                "jade": shields["LIYUE_ZHONGLI_E"]["value"],
                                "crystal": shields["RX_CRYSTALLIZE"]["value"],
                                "crystalElement": shields["RX_CRYSTALLIZE"].get("element"),
                                "crystalDamageMultipliers": shields["RX_CRYSTALLIZE"].get("damageMultipliers")})
        fights.append({"group": battle["initial"]["group"],
                       "enemySources": [a["source"] for a in battle["initial"]["actors"] if a["side"] == "ENEMY"],
                       "enemyLevels": [a["level"] for a in battle["initial"]["actors"] if a["side"] == "ENEMY"],
                       "win": battle["win"], "rounds": battle["rounds"],
                       "healingActual": battle["healing"],
                       "hpDamageActual": sum(max(0, e["hpBefore"] - e["hpAfter"]) for e in hp_packets),
                       "damageLogTotalIncludingOverkill": battle["damageLogTotal"],
                       "shieldStrengthConsumed": sum(max(0, e.get("shieldBefore", 0) - e.get("shieldAfter", 0)) for e in last.get("log", []) if e.get("targetId") in allies and "damage" in e),
                       "shieldLogAbsorbed": battle["shieldAbsorbed"],
                       "deadBeforeSettlement": [a["source"] for a in actors if a["hp"] <= 0],
                       "hpRatioBeforeSettlement": sum(a["hp"] for a in actors) / sum(a["maxHp"] for a in actors) if actors else None,
                       "hpRatioAfterSettlement": sum(a["hp"] for a in battle["after"]) / sum(a["maxHp"] for a in battle["after"]),
                       "levelUpOwners": level_ups,
                       "protagonistRevived": battle["result"].get("protagonistRevived", 0),
                       "enemySkipped": battle["enemySkipped"]})
    return {"name": row["name"], "level": row["level"], "map": row.get("map"),
            "domain": row.get("domain"), "seed": row["seed"], "wins": row["wins"],
            "losses": row["losses"], "threeWins": row["wins"] == 3 and row["losses"] == 0,
            "firstWin": bool(fights and fights[0]["win"]), "stopReason": row["stopReason"],
            "finalHpRatioAfterSettlement": row["hpRatio"], "fights": fights,
            "crystalJadeCoexistenceEvents": len(coexist), "crystalJadeSamples": coexist[:8]}


def bounds(values):
    return {"min": min(values), "median": statistics.median(values), "max": max(values)} if values else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", required=True)
    parser.add_argument("--after", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    before, after = read(args.before), read(args.after)
    originals = {identity(row): row for row in before["rows"]}
    paired = []
    groups = defaultdict(list)
    for row in after["rows"]:
        key = identity(row)
        prior = originals[key]
        # No enemy/source changes are introduced by this tool. The same seed can
        # diverge after different battle lengths because the native PRNG carries.
        pair = {"before": summarize(prior), "after": summarize(row),
                "firstEnemyRosterMatches": [(a["source"], a["level"], a["maxHp"]) for a in prior["battles"][0]["initial"]["actors"] if a["side"] == "ENEMY"]
                == [(a["source"], a["level"], a["maxHp"]) for a in row["battles"][0]["initial"]["actors"] if a["side"] == "ENEMY"]}
        paired.append(pair)
        groups[key[:3]].append(pair)
    group_rows = []
    for (location, level, team), pairs in groups.items():
        entry = {"location": location, "level": level, "team": team, "conditions": len(pairs), "seeds": [p["after"]["seed"] for p in pairs]}
        for version in ("before", "after"):
            rows = [p[version] for p in pairs]
            entry[version] = {"firstWins": sum(r["firstWin"] for r in rows),
                              "threeFightCompletions": sum(r["threeWins"] for r in rows),
                              "wins": sum(r["wins"] for r in rows), "losses": sum(r["losses"] for r in rows),
                              "firstFightRounds": [r["fights"][0]["rounds"] for r in rows],
                              "finalHpRatioAfterSettlement": bounds([r["finalHpRatioAfterSettlement"] for r in rows]),
                              "completedCampaignHpRatio": bounds([r["finalHpRatioAfterSettlement"] for r in rows if r["threeWins"]]),
                              "completedCampaignHpBeforeSettlement": bounds([r["fights"][-1]["hpRatioBeforeSettlement"] for r in rows if r["threeWins"]]),
                              "levelUpFullyRecoveredFights": sum(bool(f["levelUpOwners"]) and f["hpRatioAfterSettlement"] == 1 for r in rows for f in r["fights"]),
                              "actualHpDamage": sum(f["hpDamageActual"] for r in rows for f in r["fights"]),
                              "actualHealing": sum(f["healingActual"] for r in rows for f in r["fights"]),
                              "shieldStrengthConsumed": sum(f["shieldStrengthConsumed"] for r in rows for f in r["fights"]),
                              "protagonistRevivalCount": sum(bool(f["protagonistRevived"]) for r in rows for f in r["fights"]),
                              "crystalJadeCoexistenceEvents": sum(r["crystalJadeCoexistenceEvents"] for r in rows)}
        group_rows.append(entry)
    out = {"beforeFingerprint": before["fingerprint"], "afterFingerprint": after["fingerprint"],
           "counts": {"beforeConditions": len(before["rows"]), "afterConditions": len(after["rows"]),
                      "beforeErrors": before["errors"], "afterErrors": after["errors"]},
           "interpretation": {"fixtures": "Equal companion levels, craft +6, legal base talents4/6/8/10 at25/40/50/60, no artifacts or forced recovery. Not the user save.",
                              "paired": "Same initial seed and fixture; after the first fight, native PRNG/rewards/XP carry may produce different encounters. Do not treat consecutive fights as identical enemy replay.",
                              "combined": "After includes the authorized reaction, healing, boss and shield source changes. Only-shield pilot is separately preserved.",
                              "damage": "Actual HP damage sums native per-packet before/after HP, excluding logged overkill. ShieldStrengthConsumed sums shieldBefore-shieldAfter pool loss, not prevented HP. The old sequential ally log.absorbed counted shield units; corrected simultaneous ally log.absorbed is blocked HP. Do not compare those raw log sums as the same unit.",
                              "recovery": "No lodging action is taken; lodgingMora=0 is not a claim that the party needs no recovery. Victory may revive the protagonist at10% HP, and native level-up may fully recover living fighters. Pre-settlement HP/deaths, levelUpOwners and revival are retained; a post-settlement100% party is not proof of a healer sustaining full HP.",
                              "statistics": "Selected deterministic seeds are diagnostic examples, not population win-rate estimates. Do not pool different regions/rosters/constellations into a rarity conclusion."},
           "groups": group_rows, "pairs": paired}
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out["counts"]))


if __name__ == "__main__":
    main()
