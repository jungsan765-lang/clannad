"""Read existing native ledgers; publish comparisons and formula-derived quotes.

This does not run fights, modify product source, or buy recovery services.
"""
from pathlib import Path
from collections import defaultdict
import gzip
import hashlib
import json
import math
import shutil

B = Path(__file__).resolve().parent
ROOT = B.parents[3]


def write(name, value):
    (B / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def native(folder):
    return json.loads(gzip.decompress((B / folder / "native.json.gz").read_bytes()))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


SETS = [
    ("final_product", "final_product2", "일일 보스 같은 레벨 4성 풀돌/5성 명함"),
    ("first_essence_final", "first_essence_final2", "Lv40 4성 명함 첫 반복 보스 정수 수급 경계"),
    ("wolf_alternates_final", "wolf_alternates_final2", "안드리우스 대체 준비/편성"),
    ("healer_swap_final", "healer_swap_final2", "백출/한운 교체 1시드"),
]
OUTCOME_KEYS = ["state", "finalHpRatio", "ko", "seconds", "result", "after",
                "effectiveEnemyInitial", "bossMaterialsAfter"]
comparisons = []
final_sets = {}
for old, new, label in SETS:
    a, z = native(old), native(new)
    summary = json.loads((B / new / "summary.json").read_text())
    assert len(a["rows"]) == len(z["rows"])
    assert summary["errors"] == summary["drift"] == []
    assert summary["entryBlocked"] == summary["limits"] == 0
    assert all(r["baizhuBudgetVerified"] == {"current": .03, "legacy": .08}
               and r["operatorProfile"]["revision"] == 0
               and r["vmPatchRecords"] == [] for r in z["rows"])
    diffs = []
    for i, (before, after) in enumerate(zip(a["rows"], z["rows"])):
        for key in ["boss", "seed", "team", "strategy", "level", "enhance"]:
            assert before[key] == after[key], (new, i, key)
        changed = {k: {"final1": before.get(k), "final2": after.get(k)}
                   for k in OUTCOME_KEYS if before.get(k) != after.get(k)}
        if changed:
            diffs.append({"case": i, "boss": after["boss"], "seed": after["seed"],
                          "team": after["team"], "strategy": after["strategy"],
                          "changed": changed})
    comparisons.append({"label": label, "old": old, "new": new,
                        "summary": {k: v for k, v in summary.items() if k != "rows"},
                        "changedConditions": len(diffs), "changes": diffs})
    final_sets[new] = (z, summary)
    shutil.copy2(B / "audit_daily_final2_v01625.cjs", B / new / "runner.cjs")
write("FINAL2_COMPARISON.json", {
    "scope": "Matched native final1/final2 outcomes; CPU duration and identity/source hashes are not gameplay differences.",
    "fingerprint": next(iter(final_sets.values()))[0]["fingerprint"],
    "checkedOutcomeKeys": OUTCOME_KEYS,
    "sets": comparisons,
})

manifest = json.loads((B / "FINAL2_SOURCE_MANIFEST.json").read_text())
snapshot = Path(manifest["snapshotDuringExecution"])
manifest["snapshotAfterDrift"] = [f for f, v in manifest["files"].items() if sha(snapshot / f) != v]
manifest["productAfterDrift"] = [f for f, v in manifest["files"].items() if sha(ROOT / f) != v]
assert manifest["snapshotAfterDrift"] == []
assert manifest["productAfterDrift"] == []
write("FINAL2_SOURCE_MANIFEST.json", manifest)

# The runtime quote is linear in each individual's lost-HP ratio, rounded per target.
# Reproduce its current formula; this is not a recorded BUY or travel action.
quotes = []
stock_base = {"BOSS_ANDRIUS": 120, "BOSS_DVALIN": 120,
              "BOSS_TARTAGLIA": 140, "BOSS_AZHDAHA": 140}
for name, (n, summary) in final_sets.items():
    for r, s in zip(n["rows"], summary["rows"]):
        if r["state"] != "WIN":
            continue
        base = stock_base[r["boss"]]
        targets = []
        for p in r["after"]:
            lost = max(0, p["maxHp"] - p["hp"])
            targets.append({**p, "lostHp": lost,
                            "recoveryCost": math.ceil(4 * p["level"] * lost * base / (120 * p["maxHp"]))})
        room = math.ceil(20 * base / 120)
        quotes.append({"set": name, "boss": r["boss"], "investment": r["investment"],
                       "team": r["team"], "seed": r["seed"], "strategy": r["strategy"],
                       "postSettlementHp": True, "ko": r["ko"], "stockBase": base,
                       "roomCost": room, "targets": targets,
                       "cost": room + sum(t["recoveryCost"] for t in targets)})
write("RECOVERY_QUOTES_FINAL2.json", {
    "method": "Formula-derived from saved after-HP using source/runtime.js innRecoveryQuote; no BUY, travel or food acquisition was executed. Mond stock base120 and Liyue140 were confirmed in frozen native VM. Price assumes the corresponding regional inn and the same current party.",
    "formula": "ceil(20*base/120)+sum(ceil(4*individualLevel*individualLostHP*base/(120*individualMaxHP)))",
    "limits": "No recovery purchase is necessary merely because this estimate exists. Player may use food, healing in another fight or tolerate injury. Defeated cases are excluded. Settlement protagonist revive is included in saved HP and combat KO remains separately recorded.",
    "quotes": quotes,
})

groups = defaultdict(list)
main_n, main_s = final_sets["final_product2"]
for r, s in zip(main_n["rows"], main_s["rows"]):
    groups[(r["boss"], r["investment"], r["strategy"])].append((r, s))
boss_names = {"BOSS_ANDRIUS": "안드리우스 Lv25", "BOSS_DVALIN": "드발린 Lv28",
              "BOSS_TARTAGLIA": "타르탈리아 Lv50", "BOSS_AZHDAHA": "야타용왕 Lv60"}


def fmt_range(values, digits=1):
    if not values:
        return "—"
    lo, hi = min(values), max(values)
    return f"{lo:.{digits}f}" if lo == hi else f"{lo:.{digits}f}~{hi:.{digits}f}"


table = []
for boss in boss_names:
    for investment in ["FOUR_C6", "FIVE_C0"]:
        repeat = groups[(boss, investment, "REPEAT_QE")]
        manual = groups[(boss, investment, "PREPARED")]
        def cell(rs):
            wins = [(r, s) for r, s in rs if r["state"] == "WIN"]
            hp = fmt_range([s["hp"] * 100 for r, s in wins])
            rounds = fmt_range([s["rounds"] for r, s in wins], 0)
            ko = fmt_range([len(r["ko"]) for r, s in wins], 0)
            return f"{len(wins)}/3승 · {rounds}R · HP{hp}% · KO{ko}"
        table.append(f"| {boss_names[boss]} | {'4성 풀돌' if investment=='FOUR_C6' else '5성 명함'} | {cell(repeat)} | {cell(manual)} |")

first_rows = []
for r, s in zip(*[final_sets["first_essence_final2"][0]["rows"], final_sets["first_essence_final2"][1]["rows"]]):
    quantity = lambda rows: sum(x["quantity"] for x in rows if x["item"] == "TRPG_BOSS_ESSENCE")
    delta = quantity(r["bossMaterialsAfter"]) - quantity(r["bossMaterialsBefore"])
    first_rows.append(f"| {boss_names[r['boss']]} | {r['seed']} | {s['rounds']}R | {s['hp']*100:.1f}% | {len(r['ko'])} | {delta} |")

swap_rows = []
old_swap = native("healer_swap_final")["rows"]
for i, (r, s) in enumerate(zip(final_sets["healer_swap_final2"][0]["rows"], final_sets["healer_swap_final2"][1]["rows"])):
    old = old_swap[i]
    healer = "백출" if r["team"][-1] == "LIYUE_BAIZHU" else "한운"
    swap_rows.append(f"| {boss_names[r['boss']]} | {healer} | {'반복' if r['strategy']=='REPEAT_QE' else '공개 대응'} | {old['finalHpRatio']*100:.1f}% → {s['hp']*100:.1f}% | {s['rounds']}R | {len(r['ko'])} |")

readme = f"""# 0.16.25 일일 보스 최종2 검증

최종 제품의 **종려·진·백출 계수와 회복/보호막 귀속 수정**을 적용한 실제 native 실행 자료다. 임시 관리자 배율·피해 wrapper·VM 소스 변환을 사용하지 않았다. 공식 관리자 profile은 빈 설정의 revision0, 새 전투의 characterBalanceRevision은1이다.

최종 엔진 fingerprint: `{main_n['fingerprint']}`. `FINAL2_SOURCE_MANIFEST.json`의 전체235파일 및 부모가 동결한6모듈과 일치하며, 복사/실행 후 전체 입력과 제품 소스 변경0이다. 매 실행 활성123파일 before/after 변경도0이다. 큰 입력 복사본은 게시하지 않으며 SHA 목록과 압축 native·case·runner를 보존한다.

## 적용 계수와 보존 범위

| 항목 | 0.16.24 / 이전 신규 전투 | 최종 0.16.25 신규 전투 |
|---|---|---|
| 종려 E 기본 파티 방패 | 종려 최대HP×.20×.65 = 13% | 최대HP×.20×.25 = 5% |
| 종려 Q HP 가산 | 최대HP×.25 | 최대HP×.18; ATK×.8 유지 |
| 종려 자기 피격 R1~4 | 0 / .5 / .7 / .9 | .5 / .7 / .85 / .95; R5부터1 |
| 진 Q 즉시 회복 | ATK×.05+450 | ATK×.035+300 |
| 진 장판 회복 | ATK×.03+60 | ATK×.02+40; 최저HP 대상1명·최대2틱 유지 |
| 백출 E 전원 회복 | 백출 최대HP×.08 | 최대HP×.03; 공격 대상/횟수/피해·Q 효과 유지 |

각 표는 특성·실제 시전자 리듬·장비·대열 등의 후속 보정 이전 기본 계수다. 종려 C2의 같은 source 방패에도 E 계수가 적용된다. C6의 방패 소모 기반 회복 및 기존 무료 인접 엄호 규칙은 유지한다. 이전 진행 중 전투 marker 보존은 부모의 별도 계약 테스트 범위이며, 이 폴더는 **새 입장**을 검사했다.

적 수치·전용 카드·보상·요리·숙박·레시피·상점 가격은0.16.24에서 추가로 변경하지 않았다. 일일 적 최종 HP/ATK/기본DEF는 안드리우스20094/2055/236, 드발린42540/3744/270, 타르탈리아125761/9703/591, 야타137874/13189/778이다. 야타의 기존 종려 편성 계약 ATK/DEF×.85는 적용 후 수치도 native에 별도 기록한다. 보호막 소모는 보스별1.5/3/3/1.5, 기존 타르탈리아 광역 카드1.6/2/2.5·야타 Tailstorm2를 유지한다.

## 같은 레벨 일일 48조건

4보스×2투자편성×2정책×3시드(717/4242/9031), **38승10패**다. 승리만의 HP/KO/턴 범위를 아래에 표시한다. 패배를 입장 오류나 입력 한도로 대신 집계하지 않았으며, 오류·입장 차단·입력 한도는 모두0이다.

| 보스 | 투자 편성 | 같은 준비·단순 반복 | 같은 준비·공개 대응 |
|---|---|---|---|
{chr(10).join(table)}

드발린 반복은8R 지형 붕괴로3시드 모두 패배하며 바람길 대응으로 승리한다. 안드리우스 원래5성 명함 방어 편성은 두 정책 모두seed717 패배이고, 야타4성 풀돌은 두 정책 모두seed4242 전멸했다. 타르탈리아/야타5성 명함은 아직 반복 승리가 남는다. **모든 보스·모든 조합에서 수동 공략이 필수라는 목표를 달성했다고 해석하지 않는다.** 이번 검증이 확인한 것은 종려/진 조합의 무손상 자동 완료가 줄고, 상처·KO·일부 패배가 생겼다는 점이다.

같은 저체력 공개 정책의 안드리우스0.16.24 원점6조건은 두 정책 모두3/3승·HP65.2~85.2%였다. 최종2 같은 편성은 두 정책 모두2/3승·HP23.4~33.2%로 바뀌었다. 원점 `wolf_policy_baseline/`은 따로 보존해 예전 지속 방어 정책과 혼동하지 않았다.

여행자는 명함 바람이다. 몬드4성 풀돌은 향릉/피슬/디오나, 리월4성 풀돌은 향릉/베넷/달리아, 5성 명함은 종려/다이루크/진이다. 제작 장비+10/cap10, 합법 기본 특성 상한(C3/C5는 실제 해금), 성유물/전용무기/자기보스 재료 장비/음식0이다. 드발린은 돌격 진형, 다른 보스는 수호 진형; 지원 우선/공격 우선 역할과 탱커 전열·여행자 후열을 공개 행동으로 준비했다. 반복과 공개 대응은 **같은 준비**를 공유한다.

드발린 공개 대응은 바람길→Q/E/기본 공격 및 초반 치명적 저체력에서만 방어한다. 나머지는 현재 공개 행동 순서에 적 행동이 남고 여행자HP50% 미만이면 방어한다. 바람 면역 안드리우스에서는 무효 E/Q 반복 대신 물리 기본 공격을 사용한다. 미래 카드·RNG·숨은 피해 값을 읽지 않으며 동료는 실제 AI로 행동한다.

## Lv40 첫 반복 보스 정수 경계 6조건

Lv40→50 phase3의 첫 정수를 자기 보스 재료 장비 없이 공급받을 수 있는지 별도로 검사했다. Lv40 여행자+향릉/피슬/디오나 **명함**, 일반 제작+6/cap10, 실제 기본 특성6, 성유물0이다. **6승·KO0**이며 정수1~2개가 실제 지급됐다.

| 적 고정 레벨 | seed | 턴 | 저장 HP | KO | 실제 정수 증가 |
|---|---:|---:|---:|---:|---:|
{chr(10).join(first_rows)}

선행 이야기 및 보스 CLEAR 접근 플래그를 부여한 준비 fixture다. 이야기 최초 토벌, 재료 자연 획득 캠페인, 제작·강화비 결제를 전부 통과했다는 증거가 아니다. 같은 레벨 풀돌48조건의 승리로 이 경계를 대신 설명하지 않았다.

## 안드리우스 대체 준비 18조건

**11승7패**, 오류0이다. 기존5성 명함 편성의 여행자를 실제 신상 공개 행동으로 바위 공명하면 두 정책 모두2/3승, 각청/다이루크/진은 반복2/3·공개 대응3/3승(HP4.7~13.6%,2~3KO), 다이루크/모나/치치는 두 정책 모두1/3승이다. 불/물리 등 이 보스에 유효한 역할 준비가 중요하며 임의의 모든5성 편성에 승리를 보장하지 않는다. 신상 접근 위치와 보스 입장 위치는 별도 준비 fixture로 두어 실제 왕복 비용은 계산하지 않았다.

## 힐러 교체 8조건과 백출 추가 조정

종려/다이루크에 백출 또는 한운을 넣은 5성 명함 편성, seed717 한 개, 타르탈리아/야타×2정책이다. **8승**, 오류0이다. 백출 기존8%로 야타 반복 종료HP99.1%가 재현되어 E를3%로 줄였다. 한운은 상처/여행자KO가 생겼으며 추가 너프하지 않았다.

| 보스 | 힐러 | 정책 | final1 → final2 저장 HP | final2 턴 | KO |
|---|---|---|---|---:|---:|
{chr(10).join(swap_rows)}

백출 새3% 원장은 관리자 E회복 .375 근사 후보와 결과가 일치한다. 그러나 한 시드의 두 보스 결과로 모든5성 힐러/편성/레벨 균형이 완벽하다고 주장하지 않는다. final1의80조건은 모두 보존했다. `FINAL2_COMPARISON.json`에서 백출4조건만 결과가 달라졌고 나머지76조건의 승패·턴·HP·KO·시간·보상·최종 적 스탯은 같다.

최종 HP는 회복 계수와 단순 비례하지 않는다. 타르탈리아 백출 표본은 전투가10R에서11R로 늘어나고 행동/회복/대상 선택 순서도 달라져, 회복을 줄였어도 종료HP가 높아졌다. 야타 반복의99.1%→82.7% 감소와 이런 차이를 함께 기록했다.

## 준비 비용·회복·일일 입장 경계

- H.setup이 레벨·특성·캐릭터·재료·장비 보유와 접근 플래그를 부여한다. 제작/강화/특성/뽑기 비용을 지불한 자연 계정 완주 검증이 아니다. 풀돌은 부여한 별을 실제 공개 CONSTELLATION_UNLOCK으로6회씩 해금했다.
- 일반 제작 무기는 수정/백철과200~220모라 등을 요구한다. 치유사의 브로치는 에테르 실3+공명 보석1+340모라, 레시피Lv8이다. 연금 상점 재고는 실2개·보석1개/3일(Lv5/Lv7 접근)이며 탐험/연금 수급이 보완된다. 4인분 준비는 즉시 무료가 아니다. +12 보스 정수/핵과 야타 성유물5 재료는 첫 승리 필수품에서 제외했다.
- 각 시드는 독립 저장·초기HP1회 충전이며 전투 내 HP/RNG/KO는 실제 상태를 유지한다. 이 일일 표본은 무회복 연전·숙박 BUY·왕복·요리 재료/모라를 직접 계산하지 않았다. 다른 에이전트의 일반 비경 연전 증거는 별도 자료다.
- `RECOVERY_QUOTES_FINAL2.json`은 저장된 대상별HP로 현재 숙박 공식만 계산한 참고 견적이다. 몬드 기본120·리월140; `ceil(20×base/120)+Σceil(4×개별Lv×개별손실HP×base/(120×개별최대HP))`. 합계 레벨이나 파티 평균HP로 가격을 산출하지 않았다. 여행자 KO 후 기존10% 부활이 반영된 저장HP와 전투KO를 따로 기록한다.
- 실제 KST 일일 입장 제한은 공개 입장에서 소비되며 패배해도 그날 입장이 복구되지 않는다. 패배는 현재 지갑10% floor·60초 잠금을 유지했다. 진단 지갑100만 모라는 경제 수입이 아니다.
- 시간은2배속 presentation+COMBAT입력3초+정산6초+기존 패배60초다. 획득/이동/네트워크/사람 판단 시간은 제외한다. 최대40개의 공개 입력/ack 경계를 두고 한도/STALEMATE/전멸을 분리했다.
- 필드 후보의+6·전열과 일일의+10·후열, 종별 고정 레벨이 다르므로 서로 다른 표본을 섞어 정밀한 일일>필드 승률을 주장하지 않는다. Lv60도 임의 편성의 모든 보스 승리를 보장하지 않는다.

## 증거와 재현

- `final_product2/`, `first_essence_final2/`, `wolf_alternates_final2/`, `healer_swap_final2/`: native.json.gz, summary, 활성 입력 before/afterSHA, 정확 runner.
- `cases_*2.json`: 실제 최종 입력. 공식 profile0 및 현재 종려/진/백출 API 숫자를 실행 전에 확인한다.
- `FINAL2_SOURCE_MANIFEST.json`: 전체235 입력 SHA 및 제품동결6모듈, 복사/실행 후 drift0.
- `audit_daily_final2_v01625.cjs`, `audit_protagonist_v01618.cjs`: native 실행기/준비 helper 원문. 실행기 root에는 해당 SHA의 제품 source·DB와 helper가 필요하다.
- `README_CANDIDATES.md`: 임시 탐색 및 선택하지 않은 후보. 최종 결과와 합산하지 않는다.
- `wolf_policy_baseline/`: 같은 공개 저체력 정책의0.16.24 원점6조건. 이전 지속방어 정책과 계수 변화의 효과를 혼합하지 않는다.
- `final_product/` 등 final1 자료와 기존0.16.24 증거는 유지했다. 실행 당시 input_final 경로는 역사 기록이며 복사본은 scratch로 이동했다. 게시에는 대량 source 복사/아카이브를 포함하지 않는다.

```sh
node tools/audit_daily_v01625.cjs --root <FINAL2_SOURCE_MANIFEST와SHA가일치하는제품루트> --cases docs/data/balance_v01625/daily/cases_final_product2.json --out /tmp/crpg_v01625_daily_replay
```

DB는 저장된 authored QA 데이터다. 운영 사용자 DB replay·저장 호환·일반 비경 영향은 부모와 다른 에이전트의 별도 검사로 확인한다. 이 에이전트는 제품 source를 수정하지 않았다.
"""
(B / "README_FINAL_KO.md").write_text(readme)
(B / "README.md").write_text("# 0.16.25 일일 보스 자료\n\n최종2 실제 제품 검증은 [README_FINAL_KO.md](README_FINAL_KO.md), 이전 후보 탐색은 [README_CANDIDATES.md](README_CANDIDATES.md)에 있다.\n")

candidate = (B / "README_CANDIDATES.md").read_text()
candidate = candidate.replace("현재 최종 제품 검증은 별도 동결 후 실행한다.",
    "최종2 제품 검증은 `README_FINAL_KO.md`, `FINAL2_SOURCE_MANIFEST.json` 및 이름 끝2 원장에 별도로 보존했다. 최종2는 N3E25 기본 계수에 백출 E3%와 회복/보호막 귀속 수정을 포함한다.")
candidate = candidate.replace("모든 원장의 실행 오류·입장 불가·입력 한도·소스 변경은0이다.",
    "이 절에 나열한 과거 후보 원장의 실행 오류·입장 불가·입력 한도·소스 변경은0이다. 최종2의80조건은 이 후보 집계에 합산하지 않는다.")
candidate = candidate.replace("KO와 상처가 생기는 연전에서는 기존 회복 콘텐츠를 이용해야 한다.",
    "각 시드는 독립 fullHP 준비 저장이다. 이 후보 표본은 무회복 연전·숙박 BUY/왕복·요리 재료/모라를 검사하지 않았고, 상처/KO만 기록했다.")
candidate = candidate.replace("최종 제품 검증은 이후 별도 원장으로 보존한다.",
    "최종2 제품 검증은 `README_FINAL_KO.md` 및 별도 최종 원장으로 보존했다. 과거 N3E30 첫 정수6조건은 이야기 최초 토벌이 아니라 보스 CLEAR 접근 플래그가 있는 첫 반복 보스 정수 공급 경계다. 최종2 경계6조건과 별개이며, 장비/특성 준비비를 지불한 자연 계정 경제 자급 증거가 아니다.")
(B / "README_CANDIDATES.md").write_text(candidate)

overview_path = B / "candidate_overview.json"
if overview_path.exists():
    old = json.loads(overview_path.read_text())
    # Keep authored aggregates; native rows carry seeds even when summary rows omit them.
    def fix(x):
        if isinstance(x, dict):
            if x.get("seeds") == [None] or x.get("seeds") is None:
                x.pop("seeds", None)
            for v in x.values():
                fix(v)
        elif isinstance(x, list):
            for v in x:
                fix(v)
    fix(old)
    write("candidate_overview.json", old)

print(json.dumps({"sets": [{"folder": c["new"], "conditions": c["summary"]["conditions"],
                             "wins": c["summary"]["wins"], "changedFromFinal1": c["changedConditions"]}
                            for c in comparisons], "inputDrift": [],
                  "recoveryQuoteCount": len(quotes)}, ensure_ascii=False))
