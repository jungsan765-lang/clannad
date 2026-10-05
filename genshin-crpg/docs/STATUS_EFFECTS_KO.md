# 전투 상태 효과 조사표 (2026-10-06, 0.15.21 코드 기준)

전투 카드의 버프 · 디버프 칩(`app_experience.js`의 `battleStatusList`)에 이름과 설명을 채우기 위한 조사다. 코드에서 확인한 사실만 적었다. 줄 번호는 바뀔 수 있으니 이름으로 찾는다.
- 칩 분류(버프 · 디버프 · 묶임 · 원소)는 0.15.21에서 이 표대로 고쳤다(`STATUS_KIND`, `STATUS_DEBUFF`).
- **아직 남은 일**: 이름이 없는 상태(MISSING)의 표시 이름과, 설명이 비는 상태의 한 줄 설명.
  - 이름은 원작 공식 한국어 이름을 출처로 확인해 쓴다. 예: 호두 「혈매향」, 타르탈리아 「단류」, 연비 「단화인」.

파일 줄임말: combat = runtime_combat.js, rules = runtime_rules.js, mond_cards = runtime_mond_cards.js, gear = runtime_gear_traits.js, enemy_skills = runtime_enemy_skills.js, liyue_cards = runtime_liyue_cards.js, liyue_combat = runtime_liyue_combat.js, protagonist = runtime_protagonist.js, v0148 = runtime_combat_v0148.js, cons = runtime_constellations_v01411.js, field_bosses = runtime_field_bosses.js, chasm = runtime_chasm_skills.js, formations = runtime_formations.js (모두 `source/`).

## 공통 동작
- 같은 상태를 다시 걸면 기존 것을 덮어쓴다. 중첩되지 않는다(combat:20).
- `rounds`는 라운드가 끝날 때 줄고, 걸린 라운드에는 줄지 않는다(combat:151). 그래서 「1R」은 이번 라운드 남은 동안과 다음 라운드다.
- `untilTurn` 상태는 가진 쪽의 차례가 시작될 때 지워진다(combat:157). `rounds:null`은 전투가 끝나거나 코드가 지울 때까지다.
- 고추(CHILI_BUFF)와 운명의 자리 지속 피해 디버프는 생성 라운드를 앞당겨 한 라운드 일찍 끝난다(liyue_cards:162, cons:457).
- 실제로 쓰이는 피해 보정은 rules:51(applyDamage)과 rules:54(damage)다. combat:84-88과 combat:121(모나 Q)은 덮여서 쓰이지 않는다.
- 아군은 제어 저항 장비로 빙결 · 기절 · 띄워짐 · 감속을 막을 수 있다(gear:211-217). 오셀은 모든 상태를 무시하고, 아즈다하는 얼음 · 물 형태일 때 빙결을 무시한다(liyue_combat:100).

## 표 1. 이름 · 효과
| id | 표시 이름 | 거는 것(라운드) | 효과(설명용 한 줄) | 분류 | 근거 |
|---|---|---|---|---|---|
| PHYS_VULN | 물리 피해 취약 | 초전도 반응: 대상과 인접한 적(얼음 면역 제외), 2R (rules:36) | 받는 물리 피해가 25% 늘어난다. | 디버프 | rules:51 |
| BOSS_CONTROL | 행동 둔화 | 보스 · 대형 적에게 들어간 강제 제어가 이것으로 바뀜, 1R (rules:19) | 행동은 하지만 속도가 20 줄고 주는 피해가 10% 줄어든다. | 묶임 | combat:22, rules:51 |
| OMEN | 성이 | 포영이 피해로 터질 때 그 대상, 2R (rules:51) | 받는 모든 피해가 15% 늘어난다. | 디버프 | rules:51 |
| STATUS_BARBARA_MELODY_LOOP | 노래의 고리 | 바바라 E 자신, 2R. 유지 중 E 재사용 불가 (combat:101) | 바바라의 일반 공격이 적중할 때마다 아군 전체가 바바라 최대 HP의 6%만큼 회복한다. | 버프 | combat:89 |
| DILUC_INFUSION | 불 원소 부여 | 다이루크 Q 자신 2R. 베넷 C6 Q 시 한손검 · 양손검 · 장병기 아군 2R | 일반 공격이 불 원소가 되고 주는 불 원소 피해가 20% 늘어난다. | 버프 | combat:89, rules:54 |
| LEVITATION | 부양 | 알베도 E · 벤티 E · 달리아 E 물안개 흔적, 1R | 공중에 떠서 근접 공격을 피하고, 공중의 적도 피해 감소 없이 공격할 수 있다. | 버프 | rules:54, combat:25 |
| SKILL_COEFF | 스킬 강화 | 알베도 Q 아군 전체, 1R (combat:106) | 일반 공격을 뺀 스킬 · 폭발 공격의 기본 피해가 30% 늘어난다. | 버프 | rules:54 |
| NOELLE_SWEEP | 대청소 | 노엘 Q 자신, 2R. C6 +1R | 일반 공격이 바위 원소가 되고, 방어력의 60%만큼 피해가 더해지며, 사거리가 한 단계 늘어난다. | 버프 | combat:89 |
| MIKA_SPEED | 속도 증가 | 미카 E 아군 전체, 2R | 속도가 10 늘어난다. | 버프 | combat:22 |
| HAWK_FEATHER | 매의 깃털 | 미카 Q 아군 전체, 2R | 일반 공격이 적중하면 라운드마다 한 번 미카 최대 HP의 4%만큼 회복한다. | 버프 | combat:89 |
| THUNDERWOLF | 늑대의 영혼 | 레이저 Q 자신, 2R | 속도가 10 늘고, 일반 공격 적중마다 공격력 45%의 번개 추가 피해를 주며, 강제 제어에 걸릴 확률이 절반이 된다. | 버프 | combat:89, combat:22, rules:19 |
| ENCOURAGEMENT_ATK | 공격력 격려 | 베넷 Q, [불] 아군, 2R | 공격력이 20% 늘어난다. | 버프 | combat:22 |
| ENCOURAGEMENT_TAG | 격려 | 베넷 Q 적 전원, 2R | 지금은 실제 효과가 없다(읽는 함수를 부르는 곳이 없음). | 디버프(의도) | combat:21 |
| ILLUSORY_BUBBLE | 포영 | 모나 Q 적 최대 4명, 1R. 물 부착, 보스는 행동 둔화 (rules:74) | 다음에 받는 피해가 30% 늘고, 그 피해로 터지면서 모나 공격력 90%의 물 피해와 성이를 남긴다. 일반 등급 적은 갇힌 동안 행동하지 못한다. | 묶임 | rules:51, rules:20 |
| FATUI_DEVICE | MISSING | 우인단 전투원 「원소 장비 전개」, HP 70% 이하 자신, 2R | 공격력이 10% 늘어난다. | 버프(적) | combat:22 |
| STATUS_TACTICAL_LEVITATION | 부양 | 「휴대식 부유 장치」 아군 전체, 3R | 근접 · 중거리 공격으로도 공중의 적을 노릴 수 있지만 그 피해는 15% 줄어든다. | 버프 | combat:25, rules:54 |
| FALLBACK_DEFENSE | 피해 감소 | 전용 카드 없는 「생존우선」 적의 특수 공격 뒤 자신, 다음 차례까지 | 다음 자기 차례까지 받는 피해가 15% 줄어든다. | 버프(적) | rules:54 |
| TRAIT_STACK_ATK | MISSING | 「연속 적중」 장비 특성: 적중마다 +1중첩(최대 3), 2R (gear:178) | 적중할 때마다 공격력이 장비 수치(2~3%)만큼 쌓이며 최대 3중첩. | 버프 | combat:22 |
| HAZARD_WET | MISSING | 침수 지형, 방수 50 미만이고 발디딤이 없는 아군, 1R (gear:250) | 속도가 6, 회피가 5 줄어들고 몸이 젖는다. | 디버프 | combat:22 |
| HAZARD_CORRODED | MISSING | 부식 지형, 해독 50 미만 아군, 2R (gear:251) | 방어력이 15% 줄어든다. | 디버프 | combat:22 |
| ENEMY_CHARGE_EXPOSED | MISSING (적 정보에는 「차지 붕괴 · 받는 피해 증가」) | 구라구라꽃 차지가 제어로 끊길 때, 다음 자기 차례까지 | 다음 자기 차례까지 받는 피해가 20% 늘어난다. | 디버프 | enemy_skills:135 |
| STATUS_STUN | MISSING | 유적의 뱀 휘감기 선두 아군, 1R (field_bosses:223) | 지금은 행동을 막지 않는다(행동 불가 판정에 없음). | 묶임(의도) | rules:20 |
| BLOOD_BLOSSOM | MISSING | 호두 피안접무 중 강한 직접 공격, 라운드당 1회, 2R | 다음 라운드가 끝날 때 터져 호두 공격력 35%의 불 피해를 받는다. | 디버프 | liyue_cards:185 |
| RIPTIDE | MISSING | 타르탈리아 Q(원거리 태세) · 근접 태세 적중, 2R | 근접 태세 타르탈리아에게 맞으면 주변 최대 2명에게 공격력 30%의 물 피해가 튀고, 근접 태세 Q에 맞으면 공격력 35%의 물 추가 피해를 받고 사라진다. | 디버프 | liyue_cards:152, :62 |
| CHILI_BUFF | MISSING | 향릉 E 뒤 처음 자동 행동하는 아군, 그 라운드만 | 이번 라운드 동안 주는 피해가 15% 늘어난다. | 버프 | liyue_cards:109 |
| SCARLET_SEAL | MISSING | 연비 E · Q 3개, 2R | 다음 공격 행동의 직접 피해가 1개당 10% 늘고(3개면 +30%) 그 행동이 끝나면 사라진다. | 버프 | liyue_cards:106 |
| AGENT_STEALTH | MISSING | 화염 채무 처리인 「화염 잠행」 자신, 공격하면 풀림 | 광역이 아닌 공격에 대한 회피가 20 늘고, 다음 공격은 명중 +10, 피해 +25%. | 버프(적) | liyue_combat:85-105 |
| RUIN_VARIANT_CORE_EXPOSED | MISSING | 유적 가디언 변이체가 치명타 · 원거리 직접 적중 2회, 다음 자기 차례까지 | 다음 자기 차례까지 방어력이 25% 줄어든다. | 디버프 | combat:22 |
| STATUS_ISEKAI_HP_WINDOW | 일시 약화 | 구버전 이세계인 E. 0.14.8부터 새로 걸리지 않음 | 시전자의 다음 차례까지 최대 HP가 잠시 줄었다가 되돌아온다. | 디버프 | protagonist:122-129 |
| LIFTED | 띄워짐 | 띄우기 제어 1R (벤티 Q · 설탕 E · Q · 여행자 Q, 대형 · 보스 제외) | 1라운드 동안 스스로 자리를 옮길 수 없고, 다음 라운드 행동 순서가 10 늦어진다. | 묶임 | rules:17, rules:19 |
| QUICKEN | 활성 | 활성 반응(풀 + 번개), 2R | 번개 공격에 촉진, 풀 공격에 발산이 일어나 반응 기준값의 1.15배 · 1.25배만큼 피해가 더해진다. | 원소 | rules:27, rules:54 |
| ANEMO_VULN | 바람 피해 취약 | 벤티 E 대상, 1R | 받는 바람 원소 피해가 5% 늘어난다. | 디버프 | rules:51 |
| ROSARIA_BEHIND | 후방 치명타 증가 | 로자리아 E로 적의 뒤로 이동하면 자신, 2R | 치명타 확률이 12%p 늘어난다. | 버프 | combat:22 |
| ROSARIA_NIGHT | 밤의 은혜 | 로자리아 패시브(20:00–06:00 전투 시작) | 치명타 확률이 10%p 늘고, 이번 전투에서 처음 주는 피해가 10% 늘어난다. | 버프 | mond_cards:71 |
| ROSARIA_CRIT_SHARE | 치명타 공유 | 로자리아 Q, 로자리아를 뺀 아군, 2R | 로자리아 치명타 확률의 15%만큼(최대 15%p) 치명타 확률이 늘어난다. | 버프 | combat:22 |
| REACTION_BOOST | 반응 강화 | 설탕 E가 확산을 일으키면 아군 전체, 2R | 일으키는 원소 반응의 기준값이 15% 늘어난다. | 버프 | rules:26 |
| EULA_GRIMHEART | 냉혹한 마음 | 유라 E 짧게 +1중첩(최대 2), E 길게 쓰면 소모 | 중첩당 방어력이 10% 늘고 강제 제어에 걸릴 확률이 절반이 된다. E를 길게 쓰면 중첩당 공격력 35%의 얼음 추가타로 소모된다. | 버프 | combat:22, rules:19 |
| EULA_CRYO_PHYSICAL_VULN | 얼음·물리 피해 취약 | 유라 E 길게에 맞은 적, 2R | 받는 얼음 · 물리 피해가 15% 늘어난다. | 디버프 | mond_cards:72 |
| AGE_GAP | MISSING (카드 문구 「시간의 틈」) | 자백 E 자신 3R, Q로 +1R(최대 3) | 일반 공격이 방어력 기반 바위 공격이 되고, 「시간의 빛」 70을 써서 백마 돌격을 쓸 수 있다(최대 4회). | 버프 | liyue_cards:94-95, :157 |
| STATUS_ISEKAI_EXPOSED | 약점 간파 | 이세계인 E 대상(보스 포함), 2R | 우리 파티에게 받는 피해가 20%(보스 12%) 늘어난다. | 디버프 | v0148:55 |
| EXPLICIT_ACCESS_TO_BOSS_DVALIN | 공중 접근 | 「상승 기류 · 바람길 확보」 아군 전체, 전투 끝까지 | 공중의 드발린을 근접 · 중거리로도 공격할 수 있지만 그 피해는 15% 줄어든다. | 버프 | combat:25, rules:54 |
| BLACK_SWORD_BREAKER_ATK_BUFF | MISSING (적 정보에는 「방벽 절단 · 공격력 증가」) | 흑 뱀 기사가 보호막을 깨면 자신, 2R | 공격력이 10% 늘어난다. | 버프(적) | chasm:31-33 |
| FORMATION | (칩으로 안 띄움) | 전투 시작 시 아군 전원 | 고른 진형의 보정이 적용된다. 위쪽 진형 버튼이 설명한다. | 버프 | formations:38 |
| ROLE | 역할 이름 | 전투 시작 시 방침이 있는 동료 | 공격 +6% · 받는 피해 +6%, 회피 +8 · 공격 −6%, 치유 · 보호막 +12%, 반응 피해 +10% 중 하나. | 버프 | formations:15-21 |
| LIYUE_COUNTER | MISSING | 북두 E · 운근 E 자신, 다음 자기 차례까지 | 처음 받는 피해가 50%(북두) 또는 60%(운근) 줄고, 그 차례에 반격한다. | 버프 | liyue_cards:132, :160 |
| FORTUNE_TALISMAN | MISSING | 치치 Q에 맞은 적, 2R | 이 적에게 직접 피해를 준 아군은 라운드마다 한 번 치치 공격력 45%만큼 회복한다. | 디버프 | liyue_cards:146 |
| PARAMITA_PAPILIO | MISSING | 호두 E(현재 HP 15% 소모) 자신, 2R | 일반 공격이 불 원소가 되고 주는 피해가 25% 늘며, 강한 일격이 혈매향을 남긴다. | 버프 | liyue_cards:94, :101, :151 |
| SKY_LADDER | MISSING | 한운 E 지정 아군, 다음 행동 뒤 소모 | 다음 행동의 직접 피해가 20% 늘고, 적중하면 한운이 주변 최대 3명에게 공격력 100%의 바람 추가 공격을 한다. | 버프 | liyue_cards:104, :149 |
| BANE_OF_ALL_EVIL | MISSING | 소 Q 자신, 2R | 주는 피해가 35% 늘고, 행동마다 인접 적 1명에게 그 피해의 35%를 바람 피해로 주지만, 라운드가 끝날 때마다 최대 HP의 8%를 잃는다. | 버프 | liyue_cards:101, :150, :185 |
| MELEE_FORM | MISSING | 타르탈리아 E 자신, 2R | 일반 공격이 물 원소가 되고 일반 · 근접 공격 피해가 20% 늘며, 라운드마다 처음 맞힌 적에게 단류를 남긴다. | 버프 | liyue_cards:94, :101, :152 |
| BRILLIANCE | MISSING | 연비 Q 자신, 2R | 라운드가 시작될 때마다 단화인을 1개 얻는다(최대 3). | 버프 | liyue_cards:186 |
| BREAKTHROUGH | MISSING | 야란 E가 3명에게 표식을 남기면 자신, 다음 행동 뒤 소모 | 다음 행동의 직접 피해가 20% 늘고, 일반 공격이 최대 3명에게 들어간다. | 버프 | liyue_cards:105 |
| LIYUE_BOSS_PETRIFY | MISSING | 종려 Q에 맞은 보스, 그 보스의 다음 행동 후 풀림 | 다음 행동이 늦어지고(행동 점수 ×0.7), 그 행동의 피해가 10% 줄어든다. | 묶임 | liyue_cards:83, :111 |
| LIYUE_PETRIFY | MISSING | 종려 Q에 맞은 보스가 아닌 적, 1R(C4 +1R) | 석화되어 행동할 수 없다. | 묶임 | liyue_cards:86 |

## 표 2. 운명의 자리 상태 (모두 표시 이름 없음, cons:73-298)
| id | 거는 것(라운드) | 효과 | 분류 |
|---|---|---|---|
| CONS_AMBER_6 | 엠버 C6, Q 후 아군 전체 2R | 공격력 +25%, 속도 +8 | 버프 |
| CONS_LISA_2 | 리사 C2, E 후 자신 2R | 방어력 +40%, 받는 피해 −20% | 버프 |
| CONS_DILUC_2 | 다이루크 C2, 피격마다 +1중첩(최대 3) 2R | 중첩당 공격력 +15% | 버프 |
| CONS_DILUC_6 | 다이루크 C6, E 후 자신 2R | 일반 공격 피해 +60% | 버프 |
| CONS_JEAN_2 | 진 C2, E 후 아군 전체 2R | 공격력 +15%, 속도 +10 | 버프 |
| CONS_ALBEDO_2 | 알베도 C2, E마다 +1중첩(최대 4), Q에 소모 | 원소폭발 피해 중첩당 +30% | 버프 |
| CONS_VENTI_2 | 벤티 C2, E 대상 2R | 받는 바람 · 물리 피해 +25% | 디버프 |
| CONS_VENTI_6 | 벤티 C6, Q 시 적 전원 3R | 받는 바람 · 불 · 물 · 얼음 · 번개 피해 +40% | 디버프 |
| CONS_BENNETT_1 | 베넷 C1, Q 후 아군 전체 2R | 공격력 +20% | 버프 |
| CONS_KLEE_6 | 클레 C6, Q 후 아군 전체 3R | 불 원소 피해 +25% | 버프 |
| CONS_MONA_6 | 모나 C6, Q 후 자신 3R | 다음 공격 1회 피해 +180% | 버프 |
| CONS_MIKA_1 | 미카 C1, E 후 아군 전체 2R | 속도 +8, 공격력 +10% | 버프 |
| CONS_MIKA_2 | 미카 C2, E 대상 2R | 받는 모든 피해 +20% | 디버프 |
| CONS_ROSARIA_1 | 로자리아 C1, 치명타 시 자신 2R | 속도 +6, 일반 공격 피해 +25% | 버프 |
| CONS_ROSARIA_6 | 로자리아 C6, Q 시 적 최대 4명 2R | 받는 물리 · 얼음 피해 +25% | 디버프 |
| CONS_SUCROSE_6 | 설탕 C6, Q 후 아군 전체 2R | 원소 피해 +25% | 버프 |
| CONS_EULA_1 | 유라 C1, 냉혹한 마음을 소모한 E 길게 후 자신 2R | 물리 피해 +40% | 버프 |
| CONS_BAIZHU_4 | 백출 C4, Q 후 아군 전체 2R | 원소 반응 피해 +30% | 버프 |
| CONS_BEIDOU_4 | 북두 C4, 피격 시 자신 2R | 일반 공격 적중 시 공격력 40% 번개 추가타 | 버프 |
| CONS_KEQING_4 | 각청 C4, 번개 반응 시 자신 2R | 공격력 +25% | 버프 |
| CONS_KEQING_6_NA · _E · _Q | 각청 C6, 일반 공격 · E · Q 후 각각 2R | 각각 번개 피해 +15%(최대 45%) | 버프 |
| CONS_GAMING_1 | 가명 C1, Q 후 자신 2R | 받는 피해 −20% | 버프 |
| CONS_GAMING_2 | 가명 C2, 치유로 HP가 가득 차면 2R | 공격력 +30% | 버프 |
| CONS_GANYU_1 | 감우 C1, 맞은 적 2R | 받는 얼음 피해 +15% | 디버프 |
| CONS_GANYU_6 | 감우 C6, E 후 자신 3R | 다음 일반 공격에 적 최대 3명 공격력 250% 얼음 추가 피해 | 버프 |
| CONS_XINGQIU_2 | 행추 C2, Q 검의 비에 맞은 적 2R | 받는 물 피해 +15% | 디버프 |
| CONS_HUTAO_BLOSSOM | 호두 C2, 맞은 적 2R | 라운드 끝마다 호두 최대 HP 10%의 불 피해(2회) | 디버프 |
| CONS_HUTAO_6 | 호두 C6, HP 25% 이하 · 쓰러질 피해 시(전투당 1회) 2R | 받는 피해 −60%, 치명타 확률 +100%p | 버프 |
| CONS_XIANGLING_1 | 향릉 C1, 누룽지에게 맞은 적 2R | 받는 불 피해 +20% | 디버프 |
| CONS_XIANGLING_2 | 향릉 C2, 일반 공격에 맞은 적 1R | 그 라운드 끝에 향릉 공격력 75%의 불 피해 | 디버프 |
| CONS_XIANYUN_2 | 한운 C2, E 후 자신 2R | 공격력 +20% | 버프 |
| CONS_XIANYUN_6 | 한운 C6, Q 후 자신 2R | E 재사용 대기가 생기지 않음 | 버프 |
| CONS_LANYAN_4 | 란얀 C4, Q 후 아군 전체 2R | 원소 반응 피해 +30% | 버프 |
| CONS_SHENHE_4 | 신학 C4, 얼음 피해마다 +1중첩(최대 20), E에 소모 | E 피해 중첩당 +5% | 버프 |
| CONS_XINYAN_1 | 신염 C1, 치명타 시 자신 2R | 속도 +12, 일반 공격 피해 +20% | 버프 |
| CONS_XINYAN_4 | 신염 C4, E에 맞은 적 3R | 받는 물리 피해 +25% | 디버프 |
| CONS_YELAN_6 | 야란 C6, Q 후 자신 2R | 일반 공격이 다른 적 1명에게 야란 최대 HP 20%의 물 피해를 더 줌 | 버프 |
| CONS_YUNJIN_2 | 운근 C2, Q 후 아군 전체 2R | 일반 공격 피해 +25% | 버프 |
| CONS_YAOYAO_1 | 요요 C1, 월계 공격이 맞으면 아군 전체 2R | 풀 피해 +15% | 버프 |
| CONS_YAOYAO_4 | 요요 C4, E · Q 후 자신 2R | 원소 반응 피해 +40% | 버프 |
| CONS_ZIBAI_4 | 자백 C4, 백마 돌격 적중 시 3R | 다음 일반 공격에 방어력 150%의 바위 피해를 한 번 더 | 버프 |
| CONS_TRAVELER_A4 | 여행자(바람) C4, E 후 자신 2R | 받는 피해 −25% | 버프 |
| CONS_TRAVELER_A6 | 여행자(바람) C6, Q 시 적 최대 4명 3R | 받는 바람 · 불 · 물 · 얼음 · 번개 피해 +40% | 디버프 |
| CONS_TRAVELER_G1 | 여행자(바위) C1, Q 후 아군 전체 3R | 치명타 확률 +15%p | 버프 |
| CONS_TRAVELER_G6 | 여행자(바위) C6, Q 후 아군 전체 3R | 받는 피해 −20% | 버프 |
| CONS_ISEKAI_6 | 이세계인 C6, Q 후 아군 전체 2R | 공격력 +30%, 치명타 확률 +15%p | 버프 |

## 표시 이름이 정해지는 곳과 문제
- `safeName('13_STATUS_EFFECT_DB', id)`가 다음 순서로 찾는다. 하나도 없으면 「알 수 없는 항목」이 나온다.
  1. app_shell.js(FORMATION · ROLE)
  2. app_mond_boss_balance.js(EXPLICIT_ACCESS_TO_BOSS_DVALIN)
  3. app_revision.js의 `combatStatusNames`
  4. 표의 이름 칸
- 적 정보 창은 enemy_skills의 이름표를 쓰고, 없으면 id를 그대로 보인다(AGENT_STEALTH 등).
- 이름이 같은 상태가 있다: LEVITATION과 STATUS_TACTICAL_LEVITATION이 둘 다 「부양」이다.
- 효과가 없는 상태가 있다: ENCOURAGEMENT_TAG, STATUS_STUN(행동을 막지 않음). 고칠지 사용자와 정한다.
- 표 문구가 코드와 다른 것:
  - STATUS_TACTICAL_LEVITATION의 표 문구는 지면 위험 무시라고 하지만, 지형 코드는 「발디딤」 특성만 본다.
  - HAZARD_WET이 붙인 물 부착은 라운드 끝 동기화(rules:93)에 덮여 보통 남지 않는다.
- 칩 설명이 비는 상태: 표 줄도 `mods`도 없는 상태(PHYS_VULN · OMEN · LEVITATION · SKILL_COEFF · ILLUSORY_BUBBLE · QUICKEN · AGE_GAP 등). 위 표의 「효과」 칸을 설명으로 쓰면 된다.
