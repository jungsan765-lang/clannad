/* Audited CRPG effect descriptions; see docs/STATUS_EFFECTS_KO.md. */
(function(root){"use strict";root.CRPGRuntime.statusCatalog={
  "STATUS_FREEZE": {
    "name": "빙결",
    "text": "행동 차례를 쉰다. 아군은 다음 차례 한 번만 쉬고, 풀린 뒤 두 차례는 다시 얼지 않는다. 바위 원소·강공에 깨진다(쇄빙)."
  },
  "PHYS_VULN": {
    "name": "물리 피해 취약",
    "text": "받는 물리 피해가 25% 늘어난다."
  },
  "BOSS_CONTROL": {
    "name": "행동 둔화",
    "text": "행동은 하지만 속도가 20 줄고 주는 피해가 10% 줄어든다."
  },
  "OMEN": {
    "name": "성이",
    "text": "받는 모든 피해가 15% 늘어난다."
  },
  "STATUS_BARBARA_MELODY_LOOP": {
    "name": "노래의 고리",
    "text": "바바라의 일반 공격이 적중할 때마다 아군 전체가 바바라 최대 HP의 6%만큼 회복한다."
  },
  "DILUC_INFUSION": {
    "name": "불 원소 부여",
    "text": "일반 공격이 불 원소가 되고 주는 불 원소 피해가 20% 늘어난다."
  },
  "LEVITATION": {
    "name": "부양",
    "text": "공중에 떠서 근접 공격을 피하고, 공중의 적도 피해 감소 없이 공격할 수 있다."
  },
  "SKILL_COEFF": {
    "name": "스킬 강화",
    "text": "일반 공격을 뺀 스킬 · 폭발 공격의 기본 피해가 30% 늘어난다."
  },
  "NOELLE_SWEEP": {
    "name": "대청소",
    "text": "일반 공격이 바위 원소가 되고, 방어력의 60%만큼 피해가 더해지며, 사거리가 한 단계 늘어난다."
  },
  "MIKA_SPEED": {
    "name": "속도 증가",
    "text": "속도가 10 늘어난다."
  },
  "HAWK_FEATHER": {
    "name": "매의 깃털",
    "text": "일반 공격이 적중하면 라운드마다 한 번 미카 최대 HP의 4%만큼 회복한다."
  },
  "THUNDERWOLF": {
    "name": "늑대의 영혼",
    "text": "속도가 10 늘고, 일반 공격 적중마다 공격력 45%의 번개 추가 피해를 주며, 강제 제어에 걸릴 확률이 절반이 된다."
  },
  "ENCOURAGEMENT_ATK": {
    "name": "공격력 격려",
    "text": "공격력이 20% 늘어난다."
  },
  "ENCOURAGEMENT_TAG": {
    "name": "격려의 영역",
    "text": "HP 70% 이하이면 라운드 끝에 베넷 최대 HP의 6%를 회복합니다. 70%를 넘으면 시전 시 베넷 공격력의 40%가 공격력에 더해집니다. 영역은 아군에게 불 원소를 부착합니다. 첫 번째 운명의 자리를 열면 HP와 관계없이 공격력이 증가합니다."
  },
  "ILLUSORY_BUBBLE": {
    "name": "포영",
    "text": "다음에 받는 피해가 30% 늘고, 그 피해로 터지면서 모나 공격력 90%의 물 피해와 성이를 남긴다. 일반 등급 적은 갇힌 동안 행동하지 못한다."
  },
  "FATUI_DEVICE": {
    "name": "원소 장비 전개",
    "text": "공격력이 10% 늘어난다."
  },
  "STATUS_TACTICAL_LEVITATION": {
    "name": "부양",
    "text": "근접 · 중거리 공격으로도 공중의 적을 노릴 수 있지만 그 피해는 15% 줄어든다."
  },
  "FALLBACK_DEFENSE": {
    "name": "피해 감소",
    "text": "다음 자기 차례까지 받는 피해가 15% 줄어든다."
  },
  "TRAIT_STACK_ATK": {
    "name": "연속 적중",
    "text": "적중할 때마다 공격력이 장비 수치(2~3%)만큼 쌓이며 최대 3중첩."
  },
  "HAZARD_WET": {
    "name": "침수",
    "text": "속도가 6, 회피가 5 줄어들고 몸이 젖는다."
  },
  "HAZARD_CORRODED": {
    "name": "부식",
    "text": "방어력이 15% 줄어든다."
  },
  "ENEMY_CHARGE_EXPOSED": {
    "name": "차지 붕괴",
    "text": "다음 자기 차례까지 받는 피해가 20% 늘어난다."
  },
  "STATUS_STUN": {
    "name": "기절",
    "text": "기절해 행동할 수 없습니다. 1라운드 동안 유지됩니다."
  },
  "BLOOD_BLOSSOM": {
    "name": "혈매향",
    "text": "다음 라운드가 끝날 때 터져 호두 공격력 35%의 불 피해를 받는다."
  },
  "RIPTIDE": {
    "name": "단류",
    "text": "근접 태세 타르탈리아에게 맞으면 주변 최대 2명에게 공격력 30%의 물 피해가 튀고, 근접 태세 Q에 맞으면 공격력 35%의 물 추가 피해를 받고 사라진다."
  },
  "CHILI_BUFF": {
    "name": "고추",
    "text": "이번 라운드 동안 주는 피해가 15% 늘어난다."
  },
  "SCARLET_SEAL": {
    "name": "단화인",
    "text": "다음 공격 행동의 직접 피해가 1개당 10% 늘고(3개면 +30%) 그 행동이 끝나면 사라진다."
  },
  "AGENT_STEALTH": {
    "name": "화염 잠행",
    "text": "광역이 아닌 공격에 대한 회피가 20 늘고, 다음 공격은 명중 +10, 피해 +25%."
  },
  "RUIN_VARIANT_CORE_EXPOSED": {
    "name": "핵 노출",
    "text": "다음 자기 차례까지 방어력이 25% 줄어든다."
  },
  "STATUS_ISEKAI_HP_WINDOW": {
    "name": "일시 약화",
    "text": "시전자의 다음 차례까지 최대 HP가 잠시 줄었다가 되돌아온다."
  },
  "LIFTED": {
    "name": "띄워짐",
    "text": "1라운드 동안 스스로 자리를 옮길 수 없고, 다음 라운드 행동 순서가 10 늦어진다."
  },
  "QUICKEN": {
    "name": "활성",
    "text": "번개 공격에 촉진, 풀 공격에 발산이 일어나 반응 기준값의 1.15배 · 1.25배만큼 피해가 더해진다."
  },
  "ANEMO_VULN": {
    "name": "바람 피해 취약",
    "text": "받는 바람 원소 피해가 5% 늘어난다."
  },
  "ROSARIA_BEHIND": {
    "name": "후방 치명타 증가",
    "text": "치명타 확률이 12%p 늘어난다."
  },
  "ROSARIA_NIGHT": {
    "name": "밤의 은혜",
    "text": "치명타 확률이 10%p 늘고, 이번 전투에서 처음 주는 피해가 10% 늘어난다."
  },
  "ROSARIA_CRIT_SHARE": {
    "name": "치명타 공유",
    "text": "로자리아 치명타 확률의 15%만큼(최대 15%p) 치명타 확률이 늘어난다."
  },
  "REACTION_BOOST": {
    "name": "반응 강화",
    "text": "일으키는 원소 반응의 기준값이 15% 늘어난다."
  },
  "EULA_GRIMHEART": {
    "name": "냉혹한 마음",
    "text": "중첩당 방어력이 10% 늘고 강제 제어에 걸릴 확률이 절반이 된다. E를 길게 쓰면 중첩당 공격력 35%의 얼음 추가타로 소모된다."
  },
  "EULA_CRYO_PHYSICAL_VULN": {
    "name": "얼음·물리 피해 취약",
    "text": "받는 얼음 · 물리 피해가 15% 늘어난다."
  },
  "AGE_GAP": {
    "name": "세월의 틈새",
    "text": "일반 공격이 방어력 기반 바위 공격이 되고, 「시간의 빛」 70을 써서 백마 돌격을 쓸 수 있다(최대 4회)."
  },
  "STATUS_ISEKAI_EXPOSED": {
    "name": "약점 간파",
    "text": "우리 파티에게 받는 피해가 20%(보스 12%) 늘어난다."
  },
  "EXPLICIT_ACCESS_TO_BOSS_DVALIN": {
    "name": "공중 접근",
    "text": "공중의 드발린을 근접 · 중거리로도 공격할 수 있지만 그 피해는 15% 줄어든다."
  },
  "BLACK_SWORD_BREAKER_ATK_BUFF": {
    "name": "방벽 절단",
    "text": "공격력이 10% 늘어난다."
  },
  "ROLE": {
    "name": "역할 이름",
    "text": "공격 +6% · 받는 피해 +6%, 회피 +8 · 공격 −6%, 치유 · 보호막 +12%, 반응 피해 +10% 중 하나."
  },
  "LIYUE_COUNTER": {
    "name": "반격 준비",
    "text": "처음 받는 피해가 50%(북두) 또는 60%(운근) 줄고, 그 차례에 반격한다."
  },
  "FORTUNE_TALISMAN": {
    "name": "도액 부적",
    "text": "이 적에게 직접 피해를 준 아군은 라운드마다 한 번 치치 공격력 45%만큼 회복한다."
  },
  "PARAMITA_PAPILIO": {
    "name": "피안접무",
    "text": "일반 공격이 불 원소가 되고 주는 피해가 25% 늘며, 강한 일격이 혈매향을 남긴다."
  },
  "SKY_LADDER": {
    "name": "하늘다리",
    "text": "다음 행동의 직접 피해가 20% 늘고, 적중하면 한운이 주변 최대 3명에게 공격력 100%의 바람 추가 공격을 한다."
  },
  "BANE_OF_ALL_EVIL": {
    "name": "나자의 춤",
    "text": "주는 피해가 35% 늘고, 행동마다 인접 적 1명에게 그 피해의 35%를 바람 피해로 주지만, 라운드가 끝날 때마다 최대 HP의 8%를 잃는다."
  },
  "MELEE_FORM": {
    "name": "근접 태세",
    "text": "일반 공격이 물 원소가 되고 일반 · 근접 공격 피해가 20% 늘며, 라운드마다 처음 맞힌 적에게 단류를 남긴다."
  },
  "BRILLIANCE": {
    "name": "이글이글",
    "text": "라운드가 시작될 때마다 단화인을 1개 얻는다(최대 3)."
  },
  "BREAKTHROUGH": {
    "name": "타파",
    "text": "다음 행동의 직접 피해가 20% 늘고, 일반 공격이 최대 3명에게 들어간다."
  },
  "LIYUE_BOSS_PETRIFY": {
    "name": "석화 저항",
    "text": "다음 행동이 늦어지고(행동 점수 ×0.7), 그 행동의 피해가 10% 줄어든다."
  },
  "LIYUE_PETRIFY": {
    "name": "석화",
    "text": "석화되어 행동할 수 없다."
  },
  "CONS_AMBER_6": {
    "text": "공격력 +25%, 속도 +8",
    "name": "맹렬한 불길"
  },
  "CONS_LISA_2": {
    "text": "방어력 +40%, 받는 피해 −20%",
    "name": "공간 전위 결계"
  },
  "CONS_DILUC_2": {
    "text": "중첩당 공격력 +15%",
    "name": "뜨거운 잿더미"
  },
  "CONS_DILUC_6": {
    "text": "일반 공격 피해 +60%",
    "name": "어둠을 가르는 화염의 검"
  },
  "CONS_JEAN_2": {
    "text": "공격력 +15%, 속도 +10",
    "name": "모든 이를 수호하는 방패"
  },
  "CONS_ALBEDO_2": {
    "text": "원소폭발 피해 중첩당 +30%",
    "name": "현생의 누대"
  },
  "CONS_VENTI_2": {
    "text": "받는 바람 · 물리 피해 +25%",
    "name": "그리운 찬 바람"
  },
  "CONS_VENTI_6": {
    "text": "받는 바람 · 불 · 물 · 얼음 · 번개 피해 +40%",
    "name": "투쟁의 폭풍"
  },
  "CONS_BENNETT_1": {
    "text": "격려의 공격력 증가가 HP 조건 없이 적용되고, 베넷 공격력의 20%가 더해진다.",
    "name": "모험 동경"
  },
  "CONS_KLEE_6": {
    "text": "불 원소 피해 +25%",
    "name": "화력 전개"
  },
  "CONS_MONA_6": {
    "text": "다음 공격 1회 피해 +180%",
    "name": "악운의 수식"
  },
  "CONS_MIKA_1": {
    "text": "속도 +8, 공격력 +10%",
    "name": "마주친 인연"
  },
  "CONS_MIKA_2": {
    "text": "받는 모든 피해 +20%",
    "name": "여행길 동반"
  },
  "CONS_ROSARIA_1": {
    "text": "속도 +6, 일반 공격 피해 +25%",
    "name": "죄의 속삭임"
  },
  "CONS_ROSARIA_6": {
    "text": "받는 물리 · 얼음 피해 +25%",
    "name": "재판의 대행인"
  },
  "CONS_SUCROSE_6": {
    "text": "원소 피해 +25%",
    "name": "혼돈의 엔트로피"
  },
  "CONS_EULA_1": {
    "text": "물리 피해 +40%",
    "name": "빛의 환상"
  },
  "CONS_BAIZHU_4": {
    "text": "원소 반응 피해 +30%",
    "name": "죽음 고찰"
  },
  "CONS_BEIDOU_4": {
    "text": "일반 공격 적중 시 공격력 40% 번개 추가타",
    "name": "별을 따라 찾은 고향의 땅"
  },
  "CONS_KEQING_4": {
    "text": "공격력 +25%",
    "name": "조율"
  },
  "CONS_KEQING_6_NA": {
    "text": "각각 번개 피해 +15%(최대 45%)",
    "name": "염정"
  },
  "CONS_KEQING_6_E": {
    "text": "각각 번개 피해 +15%(최대 45%)",
    "name": "염정"
  },
  "CONS_KEQING_6_Q": {
    "text": "각각 번개 피해 +15%(최대 45%)",
    "name": "염정"
  },
  "CONS_GAMING_1": {
    "text": "받는 피해 −20%",
    "name": "통명의 가호"
  },
  "CONS_GAMING_2": {
    "text": "공격력 +30%",
    "name": "매화 밟기"
  },
  "CONS_GANYU_1": {
    "text": "받는 얼음 피해 +15%",
    "name": "이슬 먹는 신수"
  },
  "CONS_GANYU_6": {
    "text": "다음 일반 공격에 적 최대 3명 공격력 250% 얼음 추가 피해",
    "name": "살생의 발걸음"
  },
  "CONS_XINGQIU_2": {
    "text": "받는 물 피해 +15%",
    "name": "맑은 하늘의 무지개"
  },
  "CONS_HUTAO_BLOSSOM": {
    "text": "라운드 끝마다 호두 최대 HP 10%의 불 피해(2회)",
    "name": "비처럼 내리는 불안"
  },
  "CONS_HUTAO_6": {
    "text": "받는 피해 −60%, 치명타 확률 +100%p",
    "name": "나비 잔향"
  },
  "CONS_XIANGLING_1": {
    "text": "받는 불 피해 +20%",
    "name": "겉은 바삭, 속은 촉촉"
  },
  "CONS_XIANGLING_2": {
    "text": "그 라운드 끝에 향릉 공격력 75%의 불 피해",
    "name": "큰불에 기름 붓기"
  },
  "CONS_XIANYUN_2": {
    "text": "공격력 +20%",
    "name": "외딴곳에서 우는 학"
  },
  "CONS_XIANYUN_6": {
    "text": "E 재사용 대기가 생기지 않음",
    "name": "류운 선인!"
  },
  "CONS_LANYAN_4": {
    "text": "원소 반응 피해 +30%",
    "name": "「용매를 모아 혈주를 만드니」"
  },
  "CONS_SHENHE_4": {
    "text": "E 피해 중첩당 +5%",
    "name": "통관"
  },
  "CONS_XINYAN_1": {
    "text": "속도 +12, 일반 공격 피해 +20%",
    "name": "절명의 가속"
  },
  "CONS_XINYAN_4": {
    "text": "받는 물리 피해 +25%",
    "name": "리듬의 전염"
  },
  "CONS_YELAN_6": {
    "text": "일반 공격이 다른 적 1명에게 야란 최대 HP 20%의 물 피해를 더 줌",
    "name": "승자의 독식"
  },
  "CONS_YUNJIN_2": {
    "text": "일반 공격 피해 +25%",
    "name": "다양한 소품"
  },
  "CONS_YAOYAO_1": {
    "text": "풀 피해 +15%",
    "name": "선인의 가르침"
  },
  "CONS_YAOYAO_4": {
    "text": "원소 반응 피해 +40%",
    "name": "귀염둥이"
  },
  "CONS_ZIBAI_4": {
    "text": "다음 일반 공격에 방어력 150%의 바위 피해를 한 번 더",
    "name": "혼을 따르는 육신"
  },
  "CONS_TRAVELER_A4": {
    "text": "받는 피해 −25%",
    "name": "따사로운 산들바람"
  },
  "CONS_TRAVELER_A6": {
    "text": "받는 바람 · 불 · 물 · 얼음 · 번개 피해 +40%",
    "name": "뒤엉킨 계절풍"
  },
  "CONS_TRAVELER_G1": {
    "text": "치명타 확률 +15%p",
    "name": "웅대한 청암"
  },
  "CONS_TRAVELER_G6": {
    "text": "받는 피해 −20%",
    "name": "영세의 반석"
  },
  "CONS_ISEKAI_6": {
    "text": "공격력 +30%, 치명타 확률 +15%p",
    "name": "세계를 잇는 일격"
  }
};
})(globalThis);
