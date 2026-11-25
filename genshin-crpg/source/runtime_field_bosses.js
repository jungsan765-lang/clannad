/* v0.13.35 step 12-6: field bosses of Mond and Liyue, and stronger two-day bosses (12-5-4).
 * Each boss is a turn-based conversion of its original gimmick, and each gimmick has a counter the player can
 * prepare: gear traits (12-4), elements, shields, the battle line (12-5-3) or burst windows. Several gimmicks are
 * deliberately unfair unless prepared (12-6-2), e.g. the Pyro Regisvine's heat wave every third round.
 * Bosses: 무상의 바람 · 무상의 뇌전 · 얼음 나무 · 무상의 얼음 (Mond), 무상의 바위 · 폭염 나무 · 물의 정령 ·
 * 고대 바위 용 도마뱀 · 유적의 뱀 (Liyue). Names, places and drop materials follow the original (genshin-db KR);
 * stats, numbers and turn rules are CRPG house rules. Challenges are DIRECT routes; after a victory the boss
 * returns in 24 in-game hours, while a defeat may be retried at once so the player can learn and re-equip.
 * Load after runtime_enemy_tiers.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(!P.gearTraitsVersion)throw Error('runtime_gear_traits.js must be loaded first');
if(P.fieldBossVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const st=(a,id)=>(a?.statuses||[]).find(s=>s.id===id&&(!Number.isFinite(s.rounds)||s.rounds>0));
const tv=(a,k)=>Number(a?.traits?.[k]||0);
const KO={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'},ko=e=>KO[e]||e||'물리';
const COOLDOWN=24*60;

// ---- boss materials (official names and textures) -----------------------------------------------------------
const MATERIALS={
 MAT_FB_HURRICANE_SEED:{name:'폭풍의 씨앗',icon:'UI_ItemIcon_113001',desc:'무상의 바람의 핵에서 떨어져 나온 바람의 씨앗.'},
 MAT_FB_LIGHTNING_PRISM:{name:'뇌광 프리즘',icon:'UI_ItemIcon_113002',desc:'무상의 뇌전이 남긴 번개 결정.'},
 MAT_FB_HOARFROST_CORE:{name:'서리의 핵',icon:'UI_ItemIcon_113010',desc:'얼음 나무의 뿌리에서 얼어붙은 핵.'},
 MAT_FB_CRYSTALLINE_BLOOM:{name:'응결의 꽃',icon:'UI_ItemIcon_113020',desc:'무상의 얼음이 부서질 때 피어나는 얼음꽃.'},
 MAT_FB_BASALT_PILLAR:{name:'현암의 탑',icon:'UI_ItemIcon_113009',desc:'무상의 바위가 세운 기둥의 조각.'},
 MAT_FB_EVERFLAME_SEED:{name:'꺼지지 않는 불씨',icon:'UI_ItemIcon_113011',desc:'폭염 나무가 품고 있던 식지 않는 씨앗.'},
 MAT_FB_CLEANSING_HEART:{name:'물처럼 맑은 마음',icon:'UI_ItemIcon_113012',desc:'물의 정령의 형상이 흩어진 뒤 남는 맑은 물의 결정.'},
 MAT_FB_JUVENILE_JADE:{name:'설익은 옥',icon:'UI_ItemIcon_113016',desc:'고대 바위 용 도마뱀의 몸에서 떨어진 어린 옥.'},
 MAT_FB_RUNIC_FANG:{name:'룬 무늬 이빨',icon:'UI_ItemIcon_113035',desc:'유적의 뱀의 턱에서 떨어진 룬이 새겨진 이빨.'}
};

// ---- the bosses --------------------------------------------------------------------------------------------
// 0.16.3: each boss stands where the original has it (HoYoLAB map; runtime_landmarks_v0163.js gives the new arenas their circles).
// gimmicks: id → what the player sees in the battle log / boss notes and the counter that answers it.
const G=(label,text,counter)=>({label,text,counter});
const BOSSES={
 FB_ANEMO_HYPOSTASIS:{kind:'ANEMO',name:'무상의 바람',map:'MAP_V141_STORMBEARER_PASS',region:'몬드',level:5,hp:2300,atk:120,def:70,spd:64,element:'바람',immune:['바람'],range:'중거리',material:'MAT_FB_HURRICANE_SEED',
  summary:'바람이 뭉친 정육면체. 떠올라 전열을 내려찍고 후열을 끌어당기며, 쓰러지면 핵을 드러내고 다시 조립하려 한다.',
  gimmicks:{GUST:G('돌풍 탄환','무작위 동료 3회 바람 피해','바람 외 원소 공격 · 회복'),PULL:G('흡인 회오리','예고 후 후열을 끌어당겨 피해 · 다음 행동 지연','경직 저항·중장 장비'),RISE:G('상승 기류','떠오른 동안 원거리·대공·공중 접근만 닿음, 다음 차례 전열 내려찍기','활·법구, 공중 접근 장비, 보호막'),REVIVE:G('재조립','쓰러지면 핵이 2라운드 동안 드러남 · 핵을 부수지 못하면 HP 40%로 부활','약점 공략·집중 공격'),BARRAGE:G('바람 탄막','예고 후 전원에게 바람 탄막 · 맞은 수만큼 전원 피해 · 탄막 속 바람 원소는 원소폭발 충전','주인공 「바람 탄막 피하기」'),SHUT:G('닫힌 핵','탄막을 모으거나 떠 있는 동안 핵이 닫혀 피해를 받지 않음 · 공격을 마치면 핵 노출(받는 피해 +50%)','핵이 드러났을 때 몰아치기 · 닫히면 방어'),IMMUNE:G('바람 면역','바람 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_ELECTRO_HYPOSTASIS:{kind:'ELECTRO',name:'무상의 뇌전',map:'MAP_D163_ELECTRO_HYPOSTASIS',region:'몬드',level:6,hp:2500,atk:130,def:75,spd:64,element:'번개',immune:['번개'],range:'중거리',material:'MAT_FB_LIGHTNING_PRISM',
  summary:'번개 원소의 정육면체. 후열에 낙뢰를 떨어뜨리고, 프리즘을 불러 자신을 보호하며, 쓰러지면 프리즘으로 부활하려 한다.',
  gimmicks:{SPIKES:G('뇌광 가시','무작위 동료 2명 번개 피해','절연·번개 내성'),HAMMER:G('뇌전 망치','선두에 강한 단타','중장 장비·보호막'),STORM:G('낙뢰 지대','예고 후 후열에 낙뢰 지형 2라운드','절연 장비 · 후열 배치 조정'),PRISM:G('뇌광 프리즘','HP 50% 이하에서 프리즘 2개 · 프리즘이 있으면 본체 피해 절반','광역 공격·프리즘 먼저 파괴'),REVIVE:G('프리즘 부활','쓰러지면 프리즘 3개 · 3라운드 안에 모두 부수지 못하면 HP 40%로 부활','광역 공격·집중 공격'),IMMUNE:G('번개 면역','번개 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_CRYO_REGISVINE:{kind:'CRYO_VINE',name:'얼음 나무',map:'MAP_V141_THOUSAND_RAVINE',region:'몬드',level:5,hp:2300,atk:115,def:70,spd:56,element:'얼음',immune:[],range:'중거리',material:'MAT_FB_HOARFROST_CORE',enrage:true,
  summary:'얼음 결정막으로 핵을 감싼 거대한 덩굴. 전열에 냉기를 퍼뜨리고, 결정막이 깨지면 잠시 무방비가 된다.',
  gimmicks:{SHELL:G('서리 결정막','HP 30% 보호막 · 불 피해 3배, 그 밖의 피해는 약하게 들어감 · 깨지면 행동 불능과 핵 노출 · 3라운드 뒤 재생','불 원소 동료·보호막 파괴 장비'),WHIP:G('얼음 덩굴 채찍','전열 전원 얼음 피해','방한·얼음 내성'),SPREAD:G('냉기 확산','전열에 냉기 지형(감속) 2라운드','방한 장비(50 이상이면 감속 무시)'),ORBS:G('빙구 회전','예고 후 무작위 3회 · 빙결 확률','행동 방해 저항·방한'),ENRAGE:G('광폭','HP 30% 이하에서 한 차례에 한 번 더 행동','결정막이 깨진 틈에 몰아치기')}},
 FB_CRYO_HYPOSTASIS:{kind:'CRYO_HYPO',name:'무상의 얼음',map:'MAP_D163_CRYO_HYPOSTASIS',region:'몬드',level:8,hp:2800,atk:145,def:85,spd:64,element:'얼음',immune:['얼음'],range:'중거리',material:'MAT_FB_CRYSTALLINE_BLOOM',
  summary:'얼음 원소의 정육면체. 한 줄을 꿰뚫는 창으로 얼리고, 쓰러지면 냉기의 핵이 되어 여러 번 맞아야 부서진다.',
  gimmicks:{LANCE:G('빙결 창','HP가 더 많은 줄(전열·후열)을 꿰뚫음 · 빙결 확률','행동 방해 저항 · 대열 분산'),BLAST:G('한기 방출','예고 후 전원 피해 + 냉기 지형 2라운드','방한 장비'),WALL:G('얼음 가시 방벽','얼음 보호막(불에 약함)','불 원소·보호막 파괴'),REVIVE:G('냉기 핵','쓰러지면 2라운드 동안 핵 · 서로 다른 공격 4번을 맞히지 못하면 HP 50%로 부활','여러 번 때리는 공격·파티 4인'),CHASE:G('도망치는 핵','냉기 핵이 전장을 달아나며 순간이동 · 쫓아가 직접 부술 수 있음','주인공 「냉기 핵 쫓기」'),IMMUNE:G('얼음 면역','얼음 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_GEO_HYPOSTASIS:{kind:'GEO_HYPO',name:'무상의 바위',map:'MAP_D163_GEO_HYPOSTASIS',region:'리월',level:5,hp:2400,atk:125,def:85,spd:58,element:'바위',immune:['바위'],range:'중거리',material:'MAT_FB_BASALT_PILLAR',
  summary:'바위 원소의 정육면체. 바위를 떨어뜨리고 땅을 솟구치게 하며, 현암 기둥으로 자신을 회복한다. 쓰러지면 기둥에 기대어 부활하려 한다.',
  gimmicks:{ROCKFALL:G('바위 낙하','무작위 2명에게 강한 단타','중장 장비'),UPHEAVAL:G('지면 융기','예고 후 전열 피해 · 행동 지연','경직 저항·중장'),PILLARS:G('현암 기둥','HP 60% 이하에서 기둥 3개 · 기둥마다 라운드 끝 본체 회복','파쇄·양손검·바위 원소(기둥 피해 2배)'),REVIVE:G('기둥 부활','쓰러지면 기둥이 다시 서고 3라운드 안에 모두 부수지 못하면 HP 40%로 부활','파쇄 장비·광역 공격'),IMMUNE:G('바위 면역','바위 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_PYRO_REGISVINE:{kind:'PYRO_VINE',name:'폭염 나무',map:'MAP_D163_PYRO_REGISVINE',region:'리월',level:6,hp:2500,atk:125,def:75,spd:56,element:'불',immune:[],range:'중거리',material:'MAT_FB_EVERFLAME_SEED',enrage:true,
  summary:'화염 결정막을 두른 거대한 덩굴. 세 라운드마다 전장을 불태우는 폭염을 일으킨다. 준비 없이 버티기 어렵다.',
  gimmicks:{SHELL:G('화염 결정막','HP 30% 보호막 · 얼음 3배·물 2.5배, 그 밖의 피해는 약하게 들어감 · 깨지면 행동 불능과 핵 노출','얼음·물 원소 동료·보호막 파괴 장비'),VINE:G('화염 덩굴','전열 전원 불 피해','내열·불 내성'),BOMBS:G('화염 폭탄 비','무작위 3회 불 피해','불 내성·회복'),LASH:G('덩굴 내려치기','선두에 강한 물리 단타 · 내열 장비로는 줄지 않음','중장 장비·보호막'),HEATWAVE:G('폭염 확산','3라운드마다 라운드 끝 전원 최대 HP 12% 화염 지형 (광폭 시 2라운드마다)','내열 장비 · 보호막 · 미리 회복'),ENRAGE:G('광폭','HP 30% 이하에서 한 차례에 한 번 더 행동','결정막이 깨진 틈에 몰아치기')}},
 FB_OCEANID:{kind:'OCEANID',name:'물의 정령',map:'MAP_D163_OCEANID',region:'리월',level:6,hp:800,atk:120,def:60,spd:60,element:'물',immune:['ALL'],range:'중거리',material:'MAT_FB_CLEANSING_HEART',
  summary:'물의 정령은 직접 공격이 닿지 않는다. 계속 불러내는 물의 형상을 8번 쓰러뜨리면 형체가 흩어진다.',
  gimmicks:{FORMS:G('물의 형상','멧돼지·학·개구리·게·매 모양의 형상을 두 마리씩 불러냄 · 8번 쓰러뜨리면 승리','광역 공격 · 대공(학·매는 떠 있다가 공격 뒤 잠깐 내려앉음)'),WAVE:G('침수 파도','2차례마다 전원 침수 지형(젖음) 2라운드','방수 장비'),SPOUT:G('물줄기','무작위 동료 물 피해','물 내성'),BODY:G('닿지 않는 본체','정령 본체는 피해를 받지 않음','형상부터 처치'),FROG:G('개구리의 물폭탄','개구리 형상은 쓰러질 때 전열을 적심','방수 장비·후열 공격')}},
 FB_PRIMO_GEOVISHAP:{kind:'PRIMO',name:'고대 바위 용 도마뱀',map:'MAP_LY_DETAIL_TIANQIU',region:'리월',level:7,hp:2900,atk:140,def:90,spd:58,element:'바위',immune:[],range:'근접',material:'MAT_FB_JUVENILE_JADE',enrage:true,
  summary:'원소를 흡수한 거대한 용 도마뱀. 예고한 뒤 흡수한 원소로 원암 분사를 쏜다. 보호막이 없으면 크게 다친다.',
  gimmicks:{INFUSE:G('원소 흡수','전투 시작 시 불·물·얼음·번개 중 하나를 흡수 · 그 원소 피해 절반','다른 원소·흡수 원소 내성 장비'),CLAW:G('바위 할퀴기','선두에 단타','중장·보호막'),LEAP:G('용암 도약','전열 강한 단타 · 행동 지연','경직 저항·중장'),BEAM:G('원암 분사','예고 후 전원에게 흡수 원소의 큰 피해 · 보호막이 있으면 75% 감소 · 두 명 이상 막으면 튕겨 나가 행동 불능·핵 노출','보호막 동료·보호막 강화 장비·원소 내성'),ENRAGE:G('광폭','HP 30% 이하에서 원암 분사가 더 자주 옴','보호막 재사용 시점 맞추기')}},
 FB_RUIN_SERPENT:{kind:'SERPENT',name:'유적의 뱀',map:'MAP_CHASM_DEEP',region:'리월',level:10,hp:3500,atk:160,def:95,spd:60,element:'물리',immune:[],range:'근접',material:'MAT_FB_RUNIC_FANG',
  summary:'층암거연 지하를 헤엄치는 유적 기계 뱀. 땅속에 숨어 후미를 기습하고 침식 파동을 퍼뜨린다. 돌진 뒤에는 머리가 드러난다.',
  gimmicks:{BURROW:G('잠행','땅속에 숨은 동안 피해를 받지 않고 다음 차례 후미를 기습','후미에 튼튼한 동료·보호막'),WAVE:G('침식 파동','전원 부식 지형 2라운드(방어력 −15%)','해독·정화 장비'),CHARGE:G('돌진 관통','예고 후 전열 강한 단타 · 뒤이어 머리가 1라운드 드러남','중장 장비 · 약점 공략으로 몰아치기'),BIND:G('휘감기','선두를 휘감아 기절시킴','행동 방해 저항·정화')}}
};
// 0.15.20 (user: 「무상의 바람 사진은 왜 없지?」): the battle pictures the user supplied for all nine, as
// assets/enemy_fb_<boss>.webp (content/asset-manifest.json binds them to these monster rows).
for(const [id,d]of Object.entries(BOSSES))d.img=id.toLowerCase();
// Summoned bodies (their own monster rows so every table lookup stays valid).
const SUMMONS={
 FB_SUMMON_PRISM:{name:'뇌광 프리즘',element:'번개',range:'원거리',hp:.1,atk:.5,def:40,spd:40,airborne:false},
 FB_SUMMON_PILLAR:{name:'현암 기둥',element:'바위',range:'근접',hp:.1,atk:0,def:150,spd:1,structure:true},
 FB_MIMIC_BOAR:{name:'물 멧돼지',element:'물',range:'근접',hp:580,atk:.9,def:60,spd:62},
 FB_MIMIC_CRANE:{name:'물 학',element:'물',range:'원거리',hp:400,atk:.8,def:45,spd:70,airborne:true},
 FB_MIMIC_FROG:{name:'물 개구리',element:'물',range:'중거리',hp:480,atk:.75,def:50,spd:58},
 FB_MIMIC_CRAB:{name:'물 게',element:'물',range:'근접',hp:700,atk:.8,def:80,spd:50},
 FB_MIMIC_FALCON:{name:'물 매',element:'물',range:'원거리',hp:380,atk:.85,def:40,spd:74,airborne:true}
};
const MIMIC_ORDER=['FB_MIMIC_BOAR','FB_MIMIC_CRANE','FB_MIMIC_FROG','FB_MIMIC_CRAB','FB_MIMIC_FALCON','FB_MIMIC_BOAR','FB_MIMIC_FROG','FB_MIMIC_CRANE'];
const ROUTE=id=>'BRT_'+id,GROUP=id=>'EG_'+id,FLAG=id=>'FLAG_'+id+'_CLEAR',LOOT=id=>'LT_'+id;
// Tuned with a 4-person party at the recommended level (reports/field_bosses/balance.json): an unprepared
// generalist party should usually lose, a prepared one should usually win. Bosses act twice a turn.
// v0.14.4: each boss has its own fixed level, so there is an order to take them in: Mond Lv.10-13, Liyue Lv.14-20.
// Stats were tuned at Lv.10; every level above adds HP, attack and defence (LEVEL_GROWTH).
const LEVELS={FB_CRYO_REGISVINE:22,FB_ANEMO_HYPOSTASIS:18,FB_ELECTRO_HYPOSTASIS:20,FB_CRYO_HYPOSTASIS:30,FB_GEO_HYPOSTASIS:45,FB_OCEANID:40,FB_PYRO_REGISVINE:38,FB_PRIMO_GEOVISHAP:48,FB_RUIN_SERPENT:56};
const LEVEL_GROWTH={hp:.08,atk:.2,def:.03},grown=(level,key)=>1+LEVEL_GROWTH[key]*Math.max(0,level-10);
for(const [id,d]of Object.entries(BOSSES))d.level=LEVELS[id]||Math.max(10,d.level);
BOSSES.FB_ANEMO_HYPOSTASIS.gimmicks.REVIVE.counter='원거리·대공 공격으로 떠오른 핵 집중 공격';
BOSSES.FB_ELECTRO_HYPOSTASIS.gimmicks.REVIVE.counter='불·얼음·풀 원소로 프리즘 파괴';
BOSSES.FB_CRYO_HYPOSTASIS.gimmicks.REVIVE.counter='불 원소·파쇄 공격 네 번';
BOSSES.FB_CRYO_REGISVINE.gimmicks.SHELL.text='불 원소로만 결정막 파괴 · 깨지면 행동 불능과 핵 노출 · 3라운드 뒤 재생';
BOSSES.FB_PYRO_REGISVINE.gimmicks.SHELL.text='물·얼음 원소로만 결정막 파괴 · 깨지면 행동 불능과 핵 노출';
BOSSES.FB_OCEANID.gimmicks.FORMS.counter='광역 공격 · 원거리·대공 공격으로 공중 형상 처치';
BOSSES.FB_PRIMO_GEOVISHAP.summary+=' 비늘을 열려면 보호막으로 원암 분사를 반사해야 한다.';
BOSSES.FB_RUIN_SERPENT.summary+=' 노출된 머리를 파쇄·약점 공략으로 때려야 갑주가 열린다.';
// 0.16.54 boss pass (user: 「다른 보스들 공략들도 이상한거 있으면 제대로 바꿔. 공략이랑 비슷한 느낌을 주되, 아이디어는 참신한 것으로」).
// A fight opened from now (bossPass 1) shows these words (pass rules below); a fight saved before keeps every word above.
// The boss cards before a fight show the new ones (a new fight is opened with them).
BOSSES.FB_CRYO_HYPOSTASIS.summary='얼음 원소의 정육면체. 한 줄을 꿰뚫는 창으로 얼리고, 쓰러지면 두꺼운 얼음 보호막에 숨어 다시 일어서려 한다.';
BOSSES.FB_OCEANID.summary='물의 정령은 직접 공격이 닿지 않는다. 계속 불러내는 물의 형상을 쓰러뜨릴 때마다 힘이 빠지고, 정해진 수를 채우면 형체가 흩어진다.';
BOSSES.FB_PRIMO_GEOVISHAP.summary='원소를 흡수한 거대한 용 도마뱀. 예고한 뒤 흡수한 원소로 원암 분사를 쏜다. 보호막이 없으면 크게 다친다. 단단한 비늘이 피해를 줄인다 · 보호막으로 원암 분사를 받아 내면 튕겨 나간 분사에 비늘이 깎여 쓰러진다.';
BOSSES.FB_RUIN_SERPENT.summary='층암거연 지하를 헤엄치는 유적 기계 뱀. 땅속에 숨어 후미를 기습하고 침식 파동을 퍼뜨린다. 돌진 뒤에는 머리가 드러난다. 갑주가 닫혀 있으면 피해가 크게 줄어든다(물리 70%) · 돌진 뒤 몸에 빛나는 약점 네 곳을 맞히면 쓰러진다.';
Object.assign(BOSSES.FB_CRYO_REGISVINE.gimmicks,{COROLLA:{label:'꽃봉오리 결정막',text:'다시 자란 결정막은 꽃봉오리를 감쌈(절반) · 3라운드 안에 깨지 못하면 전원에게 얼음비 · 깨면 다시 행동 불능',counter:'불 원소로 서둘러 깨기'}});
Object.assign(BOSSES.FB_CRYO_HYPOSTASIS.gimmicks,{FRUIT:{label:'서리 열매',text:'보호막 둘레를 도는 서리 열매를 쳐서 보호막에 맞힘 · 안쪽을 도는 얼음 조각에 막히면 깨짐',counter:'주인공 「서리 열매 치기」'}});
Object.assign(BOSSES.FB_PYRO_REGISVINE.gimmicks,{COROLLA:{label:'꽃봉오리 결정막',text:'다시 자란 결정막은 꽃봉오리를 감쌈(절반) · 3라운드 안에 깨지 못하면 전원에게 불꽃 폭탄 · 깨면 다시 행동 불능',counter:'물·얼음 원소로 서둘러 깨기'}});
Object.assign(BOSSES.FB_PRIMO_GEOVISHAP.gimmicks,{SCALES:{label:'단단한 비늘',text:'평소에는 받는 피해 30% 감소 · 원암 분사를 반사하면 사라짐',counter:'보호막으로 원암 분사 반사'}});
Object.assign(BOSSES.FB_RUIN_SERPENT.gimmicks,{ARMOR:{label:'유적 갑주',text:'갑주가 닫혀 있으면 물리 피해 70%·원소 피해 40% 감소 · 머리가 드러났을 때 파쇄·약점 공략 장비로 치거나 약점 둘 이상을 맞히면 다음 잠행까지 열림',counter:'양손검·약점 공략·주인공 「약점 저격」'},SNIPE:{label:'약점 저격',text:'돌진 뒤 몸 마디의 약점 네 곳이 빛남 · 둘 이상 맞히면 갑주가 열리고, 넷을 모두 맞히면 쓰러져 한 차례 움직이지 못하고 다음 라운드까지 땅속으로 들어가지 못함',counter:'주인공 「약점 저격」'}});
const PASS_TEXTS={FB_ANEMO_HYPOSTASIS:{RISE:{text:'떠올라 있는 동안 핵이 닫혀 피해를 받지 않음 · 다음 차례 전열 내려찍기',counter:'보호막·방어 태세 · 내려찍은 뒤 핵 노출'},REVIVE:{text:'HP가 다하면 HP 1로 무적이 되어 주위에 흩어진 바람 원소 5개를 빨아들이려 함(2라운드) · 다 빼앗으면 조금만 회복, 놓친 원소 하나마다 더 회복(모두 놓치면 HP 40%)',counter:'주인공 「바람 원소 모으기」 · 기류를 타고 탄환을 피하며 먼저 줍기'},BARRAGE:{text:'예고 후 전원에게 바람 탄막 4발 · 모으는 동안 핵이 닫힘',counter:'보호막·방어 태세 · 쏘고 나면 핵 노출'}},FB_ELECTRO_HYPOSTASIS:{PRISM:{text:'HP 50% 이하에서 프리즘 2개 · 프리즘이 있으면 본체 피해 절반 · 물리·번개는 프리즘에 통하지 않음',counter:'원소 공격으로 프리즘 먼저 파괴'},REVIVE:{text:'쓰러지기 직전 프리즘 3개를 세움 · 모두 부수면 쓰러지고, 못 부수면 남은 프리즘 수만큼 회복(1개 15%·2개 35%·3개 50%)',counter:'주인공의 공격·함께하는 일격으로 프리즘을 하나씩 · 번개는 흡수'}},FB_CRYO_REGISVINE:{SHELL:{text:'HP 30% 보호막 · 불 피해 3배, 그 밖의 피해는 약하게 들어감 · 깨지면 행동 불능과 핵 노출 · 3라운드 뒤 꽃봉오리에 다시 자람'}},FB_CRYO_HYPOSTASIS:{REVIVE:{label:'얼음 보호막',text:'HP가 다하면 두꺼운 얼음 보호막에 숨어 2라운드 동안 버팀 · 서리 열매를 3번 맞히면 깨져 쓰러짐(불로 먼저 녹이면 2번) · 못 깨면 HP 50%로 부활',counter:'주인공 「서리 열매 치기」 · 불 원소로 먼저 녹이기'}},FB_GEO_HYPOSTASIS:{PILLARS:{counter:'바위 원소·파쇄(양손검)가 빠름 · 다른 공격도 조금씩 깎임'},REVIVE:{text:'쓰러지기 직전 현암 기둥 3개를 세움 · 모두 부수면 쓰러지고, 못 부수면 남은 기둥 수만큼 회복(1개 15%·2개 35%·3개 50%)',counter:'바위 원소·파쇄로 기둥 부수기'}},FB_PYRO_REGISVINE:{SHELL:{text:'HP 30% 보호막 · 얼음 3배·물 2.5배, 그 밖의 피해는 약하게 들어감 · 깨지면 행동 불능과 핵 노출 · 3라운드 뒤 꽃봉오리에 다시 자람'},HEATWAVE:{text:'3라운드마다 라운드 끝 전원 화염 지형 (광폭 시 2라운드마다) · 세기는 전투 정보에 표시'}},FB_OCEANID:{FORMS:{text:'멧돼지·학·개구리·게·매 모양의 형상을 두 마리씩 불러냄 · 정해진 수를 쓰러뜨리면 승리(전투 정보의 형상 처치 수)',counter:'광역 공격 · 원거리·대공 공격으로 공중 형상(학·매) 처치'},WAVE:{text:'라운드마다 한 번 전원 침수 지형(젖음) 2라운드'}},FB_PRIMO_GEOVISHAP:{CLAW:{counter:'보호막·회복'},BEAM:{text:'예고 후 전원에게 흡수 원소의 큰 피해 · 보호막이 있으면 75% 감소 · 두 명 이상 막으면 튕겨 나가 본체 HP가 깎이고 행동 불능·핵 노출'}},FB_RUIN_SERPENT:{CHARGE:{counter:'중장 장비 · 주인공 「약점 저격」'},BIND:{counter:'행동 방해 저항'}}};
// what a gimmick says in this fight: the pass words in a new fight, the old ones in a fight saved before
// 0.16.57: the words of a fight with the shut core (coreRevision 1, runtime fieldBossCore below): 무상의 뇌전·바위·얼음's closed core, 무상의
// 얼음's shell in place of its wall, and the fruit thrown by hand (user: 「무상의 얼음은... 어케하는건지 잘 모르겟네」).
const CORE_SHUT_TEXT={label:'닫힌 핵',text:'큰 공격을 준비하는 동안과 첫 공격 전에는 핵이 닫혀 피해를 받지 않음 · 공격을 마치면 핵이 드러남',counter:'닫힌 동안 방어·회복 · 주인공 스킬로 핵 노출'};
for(const id of ['FB_ELECTRO_HYPOSTASIS','FB_GEO_HYPOSTASIS','FB_CRYO_HYPOSTASIS'])BOSSES[id].gimmicks.SHUT??={...CORE_SHUT_TEXT};
const CORE_TEXTS={FB_CRYO_HYPOSTASIS:{WALL:{label:'얼음 껍질',text:'핵을 얼음 껍질로 덮음 · 다음 공격까지 핵이 닫혀 피해를 받지 않음',counter:'닫힌 동안 방어·회복'},FRUIT:{label:'서리 열매',text:'쓰러지면 두꺼운 얼음 보호막에 숨음 · 땅에 떨어진 서리 열매를 주워 핵 쪽으로 던져 3번 맞히면 깨짐(불로 먼저 녹이면 2번) · 도는 얼음 조각에 막히면 열매가 깨짐',counter:'주인공 「서리 열매 치기」 · 불 원소로 녹이기'}}};
const gimText=(b,id,k)=>{const g=BOSSES[id]?.gimmicks?.[k];if(!g)return g;const p=b?.fieldBoss?.coreRevision===1&&CORE_TEXTS[id]?.[k]||b?.bossPass===1&&PASS_TEXTS[id]?.[k];return p?{...g,...p}:g;};
const gimNew=(id,k)=>{const g=BOSSES[id]?.gimmicks?.[k];const p=PASS_TEXTS[id]?.[k];return g&&p?{...g,...p}:g;};
const TUNE={hp:1.5,atk:2.4,actions:2};
const TUNE_BY={FB_ANEMO_HYPOSTASIS:{atk:3.8,hp:1.8},FB_ELECTRO_HYPOSTASIS:{hp:1.1,atk:2.5},FB_CRYO_REGISVINE:{atk:4,hp:1.6},FB_CRYO_HYPOSTASIS:{hp:.9,atk:1.9},FB_GEO_HYPOSTASIS:{hp:1.3,atk:2.4},FB_PYRO_REGISVINE:{hp:1.2},FB_OCEANID:{atk:2.8},FB_PRIMO_GEOVISHAP:{atk:2.5},FB_RUIN_SERPENT:{hp:1.6,atk:4}};
const tuned=(d,key)=>Math.round(d[key]*((TUNE_BY[d.id]||{})[key]??TUNE[key])*grown(d.level,key));
// Two-day bosses: extra mechanics only in voluntary challenges (never in the story fights).
const TWIN={BOSS_ANDRIUS:{name:'안드리우스',gimmicks:{FROST_FIELD:G('혹한의 영역','3라운드마다 라운드 끝 전원 냉기 지형(감속) 2라운드','방한 장비'),HUNT_MARK:G('사냥 표식','공격력이 가장 높은 동료에게 표식 · 표식 대상에게 주는 단일 피해 +30%','은밀 장비(20 이상이면 표식을 피함)·옆 칸 엄호'),DASH:G('얼음 발톱 질주','3라운드마다 라운드 끝 전장을 휘젓는 질주 · 맞은 수만큼 전원 얼음 피해','주인공 「질주 피하기」 · 모두 피하면 빈틈')}},
 BOSS_DVALIN:{name:'드발린',gimmicks:{CORROSIVE_BREATH:G('부식의 숨결','3라운드마다 라운드 끝 전열 부식 지형 2라운드(방어력 −15%)','해독 장비'),STORM_WING:G('폭풍 날개','짝수 라운드 끝 선두를 밀어 다음 행동 지연','중장·경직 저항 장비'),CRYSTALS:G('부식 결정','3라운드마다 몸의 부식 결정이 빛남 · 2개를 깨면 받는 피해 증가, 3개를 깨면 추락','주인공 「부식 결정 저격」')}}};

// ---- installation ------------------------------------------------------------------------------------------
const old=Object.fromEntries(['installMarketContent','supportsLiyueBoss','placeBossReason','startBattle','aiTurn','damage','applyDamage','combatDamageMultiplier','hasElementImmunity','newRound','roundEnd','combatActionsPerTurn','finishBattle','validateSave','combatCards','enemyIntel'].map(k=>[k,P[k]]));
P.installFieldBosses=function(){
 if(this._fieldBossesInstalled)return;
 const names=['14_ITEM_DB','09_MONSTER_DB','33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB','35_BOSS_ROUTE_DB','50_BOSS_ROUTE_STEP_DB','20_LOOT_TABLE'],rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const has=(n,id)=>rows[n].some(r=>r[0]===id);
 for(const [id,m]of Object.entries(MATERIALS))if(!has('14_ITEM_DB',id)){const r=Array(rows['14_ITEM_DB'][0].length).fill('');const boss=Object.values(BOSSES).find(b=>b.material===id);Object.assign(r,{0:id,1:m.name,2:'보스 재료',3:'희귀',4:'[보스]',5:m.desc,6:'재료',7:'전용 무기·특수 장비 제작 재료',8:0,10:'N',11:'공용',14:120,15:0,16:999,17:boss.name+' 토벌',18:'Y',19:'N',20:boss.region,21:'공식 명칭·원작 드랍 보스 · 수량은 CRPG 설계'});rows['14_ITEM_DB'].push(r);}
 const mh=rows['09_MONSTER_DB'][0].length,monster=(id,d,grade,family,loot)=>{const r=Array(mh).fill('');Object.assign(r,{0:id,1:d.name,2:family,3:grade,4:d.region||'',5:'['+d.element+']',6:d.hp,7:d.atk,8:d.def,9:10,10:50,11:'필드 보스',12:(d.immune||[]).length?(d.immune[0]==='ALL'?'본체 피해 무효':d.immune.join('·')+' 면역'):'결정막',13:'선택',14:loot,15:d.img??'NONE',16:'CRPG 12-6',17:d.summary||'',18:d.level,19:d.spd,20:85,21:5,22:25,23:d.range,24:'기믹우선',25:'필드 보스 전용 규칙'});return r;};
 for(const [id,d]of Object.entries(BOSSES)){
  if(!has('09_MONSTER_DB',id))rows['09_MONSTER_DB'].push(monster(id,{...d,hp:d.kind==='OCEANID'?d.hp:tuned({...d,id},'hp'),atk:tuned({...d,id},'atk'),def:Math.round(d.def*grown(d.level,'def'))},'보스','필드 보스',LOOT(id)));
  if(!has('33_ENCOUNTER_GROUP_DB',GROUP(id))){const r=Array(rows['33_ENCOUNTER_GROUP_DB'][0].length).fill('');Object.assign(r,{0:GROUP(id),1:d.name,2:'BOSS',3:'필드 보스',4:d.level,5:d.level,6:'FIXED',7:id,8:1,9:1,22:'없음',23:'필드 보스 전용 규칙',24:1,25:'Y',26:'Y',27:d.summary,28:'필드 보스,'+d.region});rows['33_ENCOUNTER_GROUP_DB'].push(r);}
  if(!has('49_ENCOUNTER_MEMBER_DB','EM_'+GROUP(id)+'_1'))rows['49_ENCOUNTER_MEMBER_DB'].push(['EM_'+GROUP(id)+'_1',GROUP(id),1,id,1,1,'MON1','CRPG_FIELD_BOSS_V1','필드 보스']);
  if(!has('35_BOSS_ROUTE_DB',ROUTE(id)))rows['35_BOSS_ROUTE_DB'].push([ROUTE(id),d.name+' 토벌',d.map,'DIRECT','','','',GROUP(id),'Y','N','CURRENT_STEP','N','',FLAG(id),'Y','필드 보스 · 모두 합쳐 12시간마다 3번 토벌']);
  if(!has('50_BOSS_ROUTE_STEP_DB','BRS_'+ROUTE(id)+'_1'))rows['50_BOSS_ROUTE_STEP_DB'].push(['BRS_'+ROUTE(id)+'_1',ROUTE(id),1,'BOSS',GROUP(id),'보스']);
  if(!rows['20_LOOT_TABLE'].some(r=>r[0]===LOOT(id))){rows['20_LOOT_TABLE'].push([LOOT(id),id,d.material,2,3,100,'없음','필드 보스 전용 재료']);rows['20_LOOT_TABLE'].push([LOOT(id),id,'TRPG_BOSS_ESSENCE',1,1,20,'없음','필드 보스 추가 보상']);}
 }
 for(const [id,s]of Object.entries(SUMMONS))if(!has('09_MONSTER_DB',id))rows['09_MONSTER_DB'].push(monster(id,{...s,hp:typeof s.hp==='number'&&s.hp>1?s.hp:100,atk:100,def:s.def,level:1,region:'필드 보스 소환'},'일반','소환체',''));
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._placeCatalog=null;this._fieldBossesInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installFieldBosses();return out;};
P.supportsLiyueBoss=function(id){return !!BOSSES[id]||!!old.supportsLiyueBoss?.call(this,id);};
const bossForRoute=id=>Object.keys(BOSSES).find(b=>ROUTE(b)===id)||null;

// ---- entry, cooldown and notes -----------------------------------------------------------------------------
P.fieldBossClock=function(){const g=this.s.global,[h,m]=String(g.WORLD_TIME).split(':').map(Number);return (Number(g.WORLD_DAY)-1)*1440+(h||0)*60+(m||0);};
P.fieldBossCooldown=function(id){const next=this.s.fieldBossClock?.[id]||0,left=Math.max(0,next-this.fieldBossClock());if(!left)return {left:0,reason:''};const day=Math.floor(next/1440)+1,time=String(Math.floor(next%1440/60)).padStart(2,'0')+':'+String(next%60).padStart(2,'0');
 return {left,reason:BOSSES[id].name+'은(는) 쓰러진 뒤 게임 내 하루가 지나야 다시 나타납니다. '+Math.floor(left/60)+'시간 '+(left%60)+'분 남음 · '+day+'일차 '+time+'부터'};};
P.placeBossReason=function(id,entry,options={}){
 const boss=bossForRoute(id);if(!boss)return old.placeBossReason.call(this,id,entry,options);
 const row=this.tables['35_BOSS_ROUTE_DB'].get(id);if(!row||row[2]!==this.s.global.CURRENT_MAP_ID)return '현재 지도에는 이 도전의 입구가 없습니다.';
 if(entry&&entry!=='DIRECT')return '이 도전은 보스에게 곧바로 도전합니다.';
 if(!options.continuing){const c=this.fieldBossCooldown(boss);if(c.reason)return c.reason;}
 return '';
};
P.fieldBossNotes=function(id){const n=this.s.fieldBossNotes?.[id];return n?copy(n):{seen:[],attempts:0,wins:0,best:null};};
P.fieldBossSeen=function(b,gimmick){const f=b?.fieldBoss;if(!f||!BOSSES[f.boss]?.gimmicks[gimmick])return;if(!f.seen.includes(gimmick))f.seen.push(gimmick);};

// ---- battle start ------------------------------------------------------------------------------------------
// Direct field attacks consume existing shield pools faster. The packet's HP
// damage is unchanged; the new policy is pinned only on fresh public challenges.
// Direct field attacks only: shield absorption changes without multiplying bare HP damage.
const FIELD_ATTACK_PRESSURE_V01627={FB_GEO_HYPOSTASIS:{ROCKFALL:1.5,UPHEAVAL:1.5},FB_PRIMO_GEOVISHAP:{BEAM:1.15}};
const FIELD_SHIELD_PRESSURE_V01627={FB_ANEMO_HYPOSTASIS:2,FB_ELECTRO_HYPOSTASIS:2,FB_CRYO_REGISVINE:2,FB_CRYO_HYPOSTASIS:2,FB_PYRO_REGISVINE:2,FB_OCEANID:2,FB_GEO_HYPOSTASIS:3,FB_PRIMO_GEOVISHAP:1.5,FB_RUIN_SERPENT:4};
const modernBehavior=f=>[2,3,4,5].includes(f?.behaviorRevision);
const repeatBehavior=f=>[3,4,5].includes(f?.behaviorRevision);
const recurringCounter=f=>[4,5].includes(f?.behaviorRevision);
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,result=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;if(!b||b===before)return result;
 const boss=b.actors.find(a=>a.side==='ENEMY'&&BOSSES[a.source]);
 if(boss&&!b.fieldBoss){const d=BOSSES[boss.source];
  boss.fb={version:1,kind:d.kind,acts:0,next:null,stunned:false,exposedUntil:0,revived:false,revival:null,shieldBreaks:0,shieldReturn:0,summoned:0,burrowed:false,phase:1};boss.size='BOSS';
  // Only newly opened fights use the recurring Primo/Serpent counter windows.
  // Saved unmarked/2/3 fights retain their original behavior and phase budgets.
  b.fieldBoss={version:1,challengeRevision:1,behaviorRevision:origin==='BOSS:'+ROUTE(boss.source)?5:4,...(origin==='BOSS:'+ROUTE(boss.source)&&!b.abyss&&!b.raid?{pressureRevision:1}:{}),boss:boss.source,route:String(origin).startsWith('BOSS:')?origin.slice(5):null,seen:[],telegraph:null,defeated:0,target:d.kind==='OCEANID'?8:0,spawned:0,heatwave:null};
  if(d.kind==='CRYO_VINE'||d.kind==='PYRO_VINE')this.fbShell(boss);
  if(d.kind==='PRIMO'){const pool=['불','물','얼음','번개'];boss.fb.infused=pool[hash(String(this.s.global.SAVE_ID)+'|'+b.id)%pool.length];this.fieldBossSeen(b,'INFUSE');b.log.push({actor:boss.name,actorId:boss.id,card:'FB_PRIMO_INFUSE',cardName:'원소 흡수',text:boss.name+'이(가) '+boss.fb.infused+' 원소를 흡수했다.',round:b.round});}
  if(d.kind==='OCEANID'){boss.fb.untouchable=true;this.fieldBossSeen(b,'BODY');this.fbSpawnMimics(b,boss,2);}
  const lv=d.level;b.mondBalance={version:1,kind:'BOSS',risk:0,rewards:{xp:b.storyConfig?.noRewards?0:120+25*lv,mora:b.storyConfig?.noRewards?0:250+60*lv,parts:[{source:boss.source,level:lv,grade:'보스',xp:120+25*lv,mora:250+60*lv}]}};
  if(b.storyConfig?.noRewards){b.mondBalance.rewards.parts=[];}
  this.s.fieldBossNotes??={};const n=this.s.fieldBossNotes[boss.source]??={seen:[],attempts:0,wins:0,best:null};n.attempts++;
 }
 const twin=b.actors.find(a=>a.side==='ENEMY'&&TWIN[a.source]);
 if(twin&&!b.twinBoss&&(String(origin).startsWith('BOSS:')||String(origin).startsWith('MATERIAL_CHALLENGE:'))){b.twinBoss={version:1,boss:twin.source,seen:[],telegraph:null,mark:null};}
 return result;
};
P.fbShell=function(a){const d=BOSSES[a.source],fire=d.kind==='CRYO_VINE';this.shield(a,a.maxHp*.3,'FB_SHELL',null,{element:d.element,damageMultipliers:fire?{불:3,번개:1.2,바위:1.2,물:.6,바람:.6,풀:.6,물리:.6,얼음:.2}:{얼음:3,물:2.5,번개:1.2,바위:1.2,불:.2,바람:.6,풀:.6,물리:.6},fieldBoss:true});this.fieldBossSeen(this.s.runtime,'SHELL');};
// Keep saved revision4 summon budgets intact. New Geo challenges retain a
// counter route with legal first-material gear, without changing the authored DB.
const MIMIC_HP_V01624={FB_MIMIC_BOAR:1015,FB_MIMIC_CRANE:700,FB_MIMIC_FROG:840,FB_MIMIC_CRAB:875,FB_MIMIC_FALCON:735};
const MIMIC_HP_V01627={FB_MIMIC_BOAR:1218,FB_MIMIC_CRANE:840,FB_MIMIC_FROG:1008,FB_MIMIC_CRAB:1050,FB_MIMIC_FALCON:882};
P.fieldBossSummonSpec=function(b,id){const s=SUMMONS[id];if(b?.fieldBoss?.behaviorRevision!==5)return s;const current=b.fieldBoss.pressureRevision===1;if(id==='FB_SUMMON_PILLAR')return {...s,hp:current ? .07 / 1.1 : .07,def:75};const hp=(current?MIMIC_HP_V01627:MIMIC_HP_V01624)[id];return hp?{...s,hp}:s;};
P.fbSummon=function(b,boss,id,extra={}){
 const s=this.fieldBossSummonSpec(b,id),n=(b.summonSequence=(b.summonSequence||0)+1),hp=Math.max(1,Math.round(s.hp<=1?boss.maxHp*s.hp:s.hp*grown(BOSSES[boss.source]?.level||10,'hp'))),atk=Math.max(0,Math.round(boss.atk*(s.atk||0)));
 const a={id:id+'#S'+n,source:id,name:s.name,side:'ENEMY',control:'AI',hp,maxHp:hp,atk,def:s.def,crit:5,critDmg:50,level:boss.level,spd:s.spd,hit:85,eva:5,resist:10,range:s.range,grade:'일반',tags:['['+s.element+']'],tactic:'균형',aura:null,statuses:[],shields:[],cooldowns:{},turns:0,element:s.element,hasDedicatedCards:true,airborne:!!s.airborne,structure:!!s.structure,armored:!!s.structure,fbSummon:{kind:id,owner:boss.id},...extra};
 if(id==='FB_MIMIC_CRAB')this.shield(a,hp*.25,'FB_CRAB_SHELL',null,{element:'물',damageMultipliers:{번개:2,얼음:1.5}});
 b.actors.push(a);this.initCombatPositions?.();return a;
};
P.fbSpawnMimics=function(b,boss,count){const f=b.fieldBoss;for(let i=0;i<count&&f.spawned<f.target+2;i++){const id=MIMIC_ORDER[f.spawned%MIMIC_ORDER.length];this.fbSummon(b,boss,id);f.spawned++;}this.fieldBossSeen(b,'FORMS');b.log.push({actor:boss.name,actorId:boss.id,card:'FB_OCEANID_FORMS',cardName:'물의 형상',text:boss.name+'이(가) 물의 형상을 불러냈다.',round:b.round});};

// ---- boss turns ----------------------------------------------------------------------------------------------
const allies=b=>b.actors.filter(a=>a.side==='ALLY'&&a.hp>0).sort((x,y)=>(x.slot||0)-(y.slot||0));
const rowOf=(b,which)=>{const all=allies(b);if(which==='FRONT'){const f=all.filter(a=>(a.slot||1)<=2);return f.length?f:all.slice(0,2);}if(which==='BACK'){const k=all.filter(a=>(a.slot||1)>=3);return k.length?k:all.slice(-2);}if(which==='LEAD')return all.slice(0,1);if(which==='TAIL')return all.slice(-1);return all;};
// Random picks respect aggro/stealth gear (the same weights the ordinary enemy AI uses).
P.fbPick=function(b,n){const pool=allies(b),out=[],boss={targetRule:'SPREAD'};while(pool.length&&out.length<n){const w=pool.map(t=>this.enemyTargetWeight?this.enemyTargetWeight(boss,t,pool):1),sum=w.reduce((x,y)=>x+y,0);let r=this.random()*sum,i=0;for(;i<pool.length-1;i++){r-=w[i];if(r<0)break;}out.push(pool.splice(i,1)[0]);}return out;};
P.fbLog=function(a,id,label,text){const b=this.s.runtime;b.log.push({actor:a.name,actorId:a.id,card:'FB_'+id,cardName:label,text:text||label,round:b.round,actionSequence:b.actionSequence||0,fieldBoss:true});};
P.fbHit=function(a,t,k,el,o={}){if(!t||t.hp<=0)return false;const b=this.s.runtime;if(b?.fieldBoss?.pressureRevision===1&&a?.fb&&a.source===b.fieldBoss.boss&&a.side==='ENEMY'&&t.side==='ALLY'&&!o.sourceKind)k*=FIELD_ATTACK_PRESSURE_V01627[a.source]?.[o.move]||1;return this.damage(a,t,k,el,{range:'전장',card:'FB_'+(o.move||'HIT'),...o});};
P.fbDelay=function(t,amount,why){const b=this.s.runtime;if(t.hp<=0)return;if(tv(t,'HEAVY')>0||tv(t,'STAGGER_RES')>=100){b.log.push({target:t.name,targetId:t.id,resisted:'FB_DELAY',text:t.name+' · 경직 저항',round:b.round});return;}t.nextScorePenalty=Math.max(amount,t.nextScorePenalty||0);b.log.push({target:t.name,targetId:t.id,text:t.name+' · '+why+' · 다음 행동이 늦어진다',round:b.round});};
P.fbTelegraph=function(a,move){const b=this.s.runtime,d=BOSSES[a.source],g=gimText(b,a.source,move);a.fb.next=move;b.fieldBoss.telegraph={move,label:g.label,text:g.text,counter:g.counter};this.fieldBossSeen(b,move);this.fbLog(a,move+'_READY',g.label+' 준비',a.name+'이(가) '+g.label+'을(를) 준비한다 · 대응: '+g.counter);};
P.fbExpose=function(a,rounds,stun){const b=this.s.runtime;a.fb.exposedUntil=b.round+rounds;a.bossExposed=true;if(stun)a.fb.stunned=true;};
const ROTATION={ANEMO:['GUST','PULL','GUST','RISE'],ELECTRO:['SPIKES','HAMMER','STORM','SPIKES'],CRYO_VINE:['WHIP','SPREAD','ORBS','WHIP'],CRYO_HYPO:['LANCE','BLAST','LANCE','WALL'],GEO_HYPO:['ROCKFALL','UPHEAVAL','ROCKFALL','ROCKFALL'],PYRO_VINE:['VINE','LASH','BOMBS','VINE'],OCEANID:['SPOUT','WAVE'],PRIMO:['CLAW','LEAP','CLAW','BEAM'],SERPENT:['BURROW','WAVE','CHARGE','BIND']};
const TELEGRAPHED=new Set(['PULL','STORM','ORBS','BLAST','UPHEAVAL','BEAM','CHARGE']);
P.fieldBossTurn=function(a){
 const b=this.s.runtime,f=a.fb,d=BOSSES[a.source],turn=b.round+':'+(a.turns||0);
 // A wind-up ends the boss's turn: the rest of its actions wait, so the party always gets a window to answer.
 if(f.endTurn===turn)return;f.acts++;
 if(f.stunned){f.stunned=false;f.endTurn=turn;this.fbLog(a,'STUNNED','무방비',a.name+'이(가) 무방비 상태라 움직이지 못한다.');return;}
 if(f.revival&&d.kind!=='CRYO_HYPO'){f.endTurn=turn;this.fbLog(a,'REVIVING','부활 준비',a.name+'이(가) 다시 일어서려 한다.');if(d.kind==='ANEMO')this.fbMove(a,'PULL');return;}
 if(f.burrowed){this.fbMove(a,'EMERGE');return;}
 if(f.next){const move=f.next;f.next=null;b.fieldBoss.telegraph=null;this.fbMove(a,move);return;}
 const rot=ROTATION[d.kind];let move=rot[(f.rot=(f.rot||0))%rot.length];f.rot++;
 if(d.kind==='PRIMO'&&a.hp/a.maxHp<=.3){this.fieldBossSeen(b,'ENRAGE');if(f.rot%3===0)move='BEAM';}
 if(d.kind==='ANEMO'&&move==='RISE'){a.airborne=true;this.fieldBossSeen(b,'RISE');f.next='SLAM';b.fieldBoss.telegraph={move:'RISE',label:'상승 기류',text:'떠올라 있는 동안 원거리·대공·공중 접근만 닿음 · 다음 차례 전열 내려찍기',counter:gimText(b,a.source,'RISE').counter};this.fbLog(a,'RISE','상승 기류',a.name+'이(가) 높이 떠올랐다 · 다음 차례에 전열을 내려찍는다');f.endTurn=turn;return;}
 if(TELEGRAPHED.has(move)){this.fbTelegraph(a,move);f.endTurn=turn;return;}
 this.fbMove(a,move);
};
P.fbMove=function(a,move){
 const b=this.s.runtime,d=BOSSES[a.source],f=a.fb,g=d.gimmicks[move],el=d.kind==='PRIMO'?f.infused:d.element;if(g)this.fieldBossSeen(b,move);
 const log=(label,text)=>this.fbLog(a,move,label||g?.label||move,text);
 switch(move){
  case 'GUST':log();for(let i=0;i<3;i++)this.fbHit(a,this.fbPick(b,1)[0],.55,'바람',{move});break;
  case 'PULL':log(g.label,a.name+'이(가) 후열을 끌어당긴다');for(const t of rowOf(b,'BACK')){this.fbHit(a,t,.75,'바람',{move,aoe:true});this.fbDelay(t,20,'끌려 나옴');}break;
  case 'SLAM':a.airborne=false;log('폭풍 낙하',a.name+'이(가) 전열을 내려찍었다');for(const t of rowOf(b,'FRONT'))this.fbHit(a,t,1.2,'바람',{move,aoe:true,heavy:true});break;
  case 'SPIKES':log();for(const t of this.fbPick(b,2))this.fbHit(a,t,.9,'번개',{move});break;
  case 'HAMMER':log();this.fbHit(a,rowOf(b,'LEAD')[0],1.35,'번개',{move,heavy:true});break;
  case 'STORM':log(g.label,'후열에 낙뢰가 떨어지기 시작한다');this.addHazard({id:'FB_STORM',kind:'LIGHTNING',power:.07,rounds:2,targets:'BACK',source:a.id});for(const t of rowOf(b,'BACK'))this.fbHit(a,t,.5,'번개',{move,aoe:true});break;
  case 'WHIP':log();for(const t of rowOf(b,'FRONT'))this.fbHit(a,t,.95,'얼음',{move,aoe:true});break;
  case 'SPREAD':log();this.addHazard({id:'FB_SPREAD',kind:'FROST',power:.06,rounds:2,targets:'FRONT',source:a.id});break;
  case 'ORBS':log();for(let i=0;i<3;i++){const t=this.fbPick(b,1)[0];if(this.fbHit(a,t,.7,'얼음',{move})&&t.hp>0&&this.random()<.3)this.addCombatStatus(t,'STATUS_FREEZE',1,{source:a.id});}break;
  case 'LANCE':{const front=rowOf(b,'FRONT'),back=rowOf(b,'BACK'),sum=r=>r.reduce((n,t)=>n+t.hp,0),line=sum(back)>sum(front)?back:front;log(g.label,a.name+'의 빙결 창이 '+(line===back?'후열':'전열')+'을 꿰뚫는다');for(const t of line)if(this.fbHit(a,t,1.05,'얼음',{move,aoe:true})&&t.hp>0&&this.random()<.35)this.addCombatStatus(t,'STATUS_FREEZE',1,{source:a.id});break;}
  case 'BLAST':log();this.addHazard({id:'FB_BLAST',kind:'FROST',power:.06,rounds:2,targets:'ALL',source:a.id});for(const t of rowOf(b,'ALL'))this.fbHit(a,t,.6,'얼음',{move,aoe:true});break;
  case 'WALL':log();this.shield(a,a.maxHp*.2,'FB_ICE_WALL',null,{element:'얼음',damageMultipliers:{불:2.5,바위:1.3,얼음:.2}});break;
  case 'ROCKFALL':log();for(const t of this.fbPick(b,2))this.fbHit(a,t,1.25,'바위',{move,heavy:true});break;
  case 'UPHEAVAL':log();for(const t of rowOf(b,'FRONT')){this.fbHit(a,t,.9,'바위',{move,aoe:true});this.fbDelay(t,15,'땅이 솟구침');}break;
  case 'VINE':log();for(const t of rowOf(b,'FRONT'))this.fbHit(a,t,.95,'불',{move,aoe:true});break;
  case 'BOMBS':log();for(let i=0;i<3;i++)this.fbHit(a,this.fbPick(b,1)[0],.6,'불',{move});break;
  case 'LASH':log();this.fbHit(a,rowOf(b,'LEAD')[0],1.3,'물리',{move,heavy:true});break;
  case 'SPOUT':log();this.fbHit(a,this.fbPick(b,1)[0],.85,'물',{move});break;
  case 'WAVE':if(d.kind==='OCEANID'){log(g.label,'전장이 물에 잠긴다');this.addHazard({id:'FB_FLOOD',kind:'FLOOD',power:.06,rounds:2,targets:'ALL',source:a.id});}else{log(g.label,'침식 파동이 퍼진다');this.addHazard({id:'FB_ERODE',kind:'CORROSION',power:.05,rounds:2,targets:'ALL',source:a.id});}break;
  case 'CLAW':log();this.fbHit(a,rowOf(b,'LEAD')[0],1.1,'바위',{move});break;
  case 'LEAP':log();for(const t of rowOf(b,'FRONT')){this.fbHit(a,t,1.2,'바위',{move,aoe:true,heavy:true});this.fbDelay(t,15,'충격파');}break;
  case 'BEAM':{let shielded=0;log(g.label,a.name+'이(가) '+el+' 원소의 원암 분사를 뿜었다');for(const t of rowOf(b,'ALL')){const guarded=(t.shields||[]).some(s=>s.value>0);if(guarded){shielded++;b.log.push({target:t.name,targetId:t.id,text:t.name+' · 보호막으로 원암 분사를 막아냄',round:b.round});}this.fbHit(a,t,guarded?3.4*.25:3.4,el,{move,aoe:true,sureHit:true});}
   const need=allies(b).length<=2?1:2;if(shielded>=need){f.beamReflected=true;this.fbExpose(a,2,true);this.fbLog(a,'BEAM_REFLECT','분사 반사','보호막에 튕긴 원암 분사가 '+a.name+'을(를) 뒤흔들었다 · 무방비·핵 노출 2라운드');}break;}
  case 'BURROW':f.burrowed=true;if(recurringCounter(b.fieldBoss)&&d.kind==='SERPENT'){f.armorOpened=false;f.exposedUntil=0;a.bossExposed=false;}if(modernBehavior(b.fieldBoss))f.endTurn=b.round+':'+(a.turns||0);log(g.label,a.name+'이(가) 땅속으로 파고들었다 · 다음 차례에 후미를 노린다');break;
  case 'EMERGE':f.burrowed=false;this.fieldBossSeen(b,'BURROW');this.fbLog(a,'EMERGE','지하 기습',a.name+'이(가) 땅속에서 솟구쳤다');this.fbHit(a,rowOf(b,'TAIL')[0],1.15,'물리',{move:'EMERGE',heavy:true});break;
  case 'CHARGE':log();for(const t of rowOf(b,'FRONT'))this.fbHit(a,t,1.3,'물리',{move,aoe:true,heavy:true});this.fbExpose(a,1,false);this.fbLog(a,'HEAD','머리 노출',a.name+'의 머리가 드러났다 · 1라운드 동안 받는 피해 증가');break;
  case 'BIND':{log();const t=rowOf(b,'LEAD')[0];if(this.fbHit(a,t,.8,'물리',{move})&&t.hp>0)this.addCombatStatus(t,'STATUS_STUN',1,{source:a.id});break;}
  default:this.fbHit(a,this.fbPick(b,1)[0],1,el,{move:'HIT'});
 }
};
P.fieldSummonTurn=function(a){
 const b=this.s.runtime,s=a.fbSummon,boss=b.actors.find(x=>x.id===s.owner);
 if(s.kind==='FB_SUMMON_PILLAR')return;// pillars act through the round-end resonance heal
 if(s.kind==='FB_SUMMON_PRISM'){this.fbHit(a,this.fbPick(b,1)[0],.6,'번개',{move:'PRISM'});return;}
 const t=s.kind==='FB_MIMIC_BOAR'||s.kind==='FB_MIMIC_CRAB'||s.kind==='FB_MIMIC_FALCON'?rowOf(b,'LEAD')[0]:s.kind==='FB_MIMIC_CRANE'?this.fbPick({actors:rowOf(b,'BACK')},1)[0]||this.fbPick(b,1)[0]:this.fbPick(b,1)[0];
 const k={FB_MIMIC_BOAR:1.2,FB_MIMIC_CRANE:.9,FB_MIMIC_FROG:.65,FB_MIMIC_CRAB:.9,FB_MIMIC_FALCON:1}[s.kind]||.8;
 const flier=s.kind==='FB_MIMIC_CRANE'||s.kind==='FB_MIMIC_FALCON';if(flier)a.airborne=true;
 this.damage(a,t,k,'물',{range:'전장',card:'FB_'+s.kind,heavy:s.kind==='FB_MIMIC_BOAR'});
 // A diving form lands after its attack: until its next turn every weapon can reach it.
 if(flier&&a.hp>0&&!pass(b)){a.airborne=false;b.log.push({actor:a.name,actorId:a.id,text:a.name+'이(가) 내려앉았다 · 다음 차례 전까지 근접 공격도 닿는다',round:b.round});}if(s.kind==='FB_MIMIC_FROG'){const u=this.fbPick(b,1)[0];if(u&&u!==t)this.damage(a,u,.65,'물',{range:'전장',card:'FB_'+s.kind});}
};
// Two-day boss extras run beside the existing Andrius/Dvalin AI.
P.twinBossRound=function(b,end){
 const t=b.twinBoss;if(!t)return;const boss=b.actors.find(a=>a.source===t.boss&&a.hp>0);if(!boss)return;const g=TWIN[t.boss].gimmicks;
 if(!end){
  if(t.boss==='BOSS_ANDRIUS'){const pool=allies(b).filter(a=>tv(a,'STEALTH')<20),top=(pool.length?pool:allies(b)).sort((x,y)=>this.combatStat(y,'atk')-this.combatStat(x,'atk'))[0];t.mark=top?.id||null;if(top){if(!t.seen.includes('HUNT_MARK'))t.seen.push('HUNT_MARK');b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_HUNT_MARK',cardName:g.HUNT_MARK.label,text:boss.name+'이(가) '+top.name+'에게 사냥 표식을 남겼다',round:b.round});}}
  const soon=b.round%3===2;t.telegraph=soon?{label:t.boss==='BOSS_ANDRIUS'?g.FROST_FIELD.label:g.CORROSIVE_BREATH.label,text:'다음 라운드 끝에 발동',counter:t.boss==='BOSS_ANDRIUS'?g.FROST_FIELD.counter:g.CORROSIVE_BREATH.counter}:null;return;}
 if(b.round%3===0){if(t.boss==='BOSS_ANDRIUS'){this.addHazard({id:'TWIN_FROST',kind:'FROST',power:.05,rounds:2,targets:'ALL',source:boss.id});if(!t.seen.includes('FROST_FIELD'))t.seen.push('FROST_FIELD');}else{this.addHazard({id:'TWIN_CORROSION',kind:'CORROSION',power:.06,rounds:2,targets:'FRONT',source:boss.id});if(!t.seen.includes('CORROSIVE_BREATH'))t.seen.push('CORROSIVE_BREATH');}
  b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_FIELD',cardName:t.boss==='BOSS_ANDRIUS'?g.FROST_FIELD.label:g.CORROSIVE_BREATH.label,round:b.round});}
 if(t.boss==='BOSS_DVALIN'&&b.round%2===0){const lead=rowOf(b,'LEAD')[0];if(lead){if(!t.seen.includes('STORM_WING'))t.seen.push('STORM_WING');this.fbDelay(lead,20,'폭풍 날개');}}
};

// ---- combat hooks --------------------------------------------------------------------------------------------
P.aiTurn=function(a,targets){
 if(a?.fb&&this.s.runtime?.fieldBoss)return this.fieldBossTurn(a,targets);
 if(a?.fbSummon&&this.s.runtime?.fieldBoss)return this.fieldSummonTurn(a,targets);
 if(a?.side==='ALLY'&&this.s.runtime?.fieldBoss){const reachable=targets.filter(t=>!this.fbUntouchable(t));if(reachable.length)targets=reachable;
  // Only flying bodies left and no way to reach them: an AI ally defends instead of stalling on an empty target.
  try{return old.aiTurn.call(this,a,targets);}catch(e){if(e?.code!=='TARGET')throw e;a.guard=true;this.s.runtime.log.push({actor:a.name,actorId:a.id,guard:true,reason:'닿는 대상이 없어 방어 태세',round:this.s.runtime.round});return;}}
 return old.aiTurn.call(this,a,targets);
};
P.fbUntouchable=function(t){const f=t?.fb;if(!f)return false;return !!(f.untouchable||f.burrowed||(f.revival&&f.revival.guarded));};
// Party counters are actual attack/gear/shield interactions, not character-name passwords.
// Saves already inside an old fight retain the former rules (no challengeRevision).
P.fieldBossBarrierReason=function(a,t,element,range){
 const b=this.s.runtime;if(!b?.fieldBoss?.challengeRevision||a?.side!=='ALLY'||!t)return '';
 const e=ko(element),heavy=tv(a,'ARMOR_BREAK')>=25,ranged=tv(a,'ANTI_AIR')>=15||(repeatBehavior(b.fieldBoss)?this.hasAirAccess(a,{...t,airborne:true},range||a.range):a.range==='원거리');
 if(t.fbSummon?.kind==='FB_SUMMON_PRISM'&&!['불','얼음','풀'].includes(e))return '프리즘이 공격을 흘려냈다. 다른 원소가 필요하다.';
 if(t.fbSummon?.kind==='FB_SUMMON_PILLAR'&&e!=='바위'&&!heavy)return '기둥에 흠집만 남았다. 바위 공격이나 파쇄 장비가 필요하다.';
 const f=t.fb;if(!f)return '';
 if(f.kind==='ANEMO'&&f.revival&&!ranged)return '떠오른 핵에 닿지 않는다. 원거리·대공 공격이 필요하다.';
 if(f.kind==='CRYO_HYPO'&&f.revival&&e!=='불'&&!heavy)return '냉기 핵이 다시 얼어붙었다. 불 공격이나 파쇄가 필요하다.';
 if((t.shields||[]).some(s=>s.source==='FB_SHELL'&&s.value>0)){
  if(f.kind==='CRYO_VINE'&&e!=='불')return '얼음 결정막이 견뎠다. 불 원소로 녹여야 한다.';
  if(f.kind==='PYRO_VINE'&&e!=='물'&&e!=='얼음')return '불 결정막이 견뎠다. 물이나 얼음 원소가 필요하다.';
 }
 if(f.kind==='PRIMO'&&(!f.beamReflected||(recurringCounter(b.fieldBoss)&&f.exposedUntil<b.round)))return '단단한 비늘이 충격을 흘려냈다. 보호막으로 원암 분사를 반사해야 한다.';
 if(f.kind==='SERPENT'&&!f.armorOpened){if(f.exposedUntil>=b.round&&(heavy||tv(a,'WEAK_POINT')>=20))f.armorOpened=true;else return '갑주가 닫혀 있다. 머리가 드러났을 때 파쇄·약점 공략으로 열어야 한다.';}
 return '';
};
P.fieldBossBlockedHit=function(a,t,reason){const b=this.s.runtime;b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,damage:0,immune:reason,text:reason,round:b.round});return 0;};
P.hasElementImmunity=function(t,el){const d=t?.fb&&BOSSES[t.source];if(d&&(d.immune.includes(ko(el))||d.immune.includes('ALL')))return true;if(MIMIC_ORDER.includes(t?.source)&&ko(el)==='물')return true;return !!old.hasElementImmunity?.call(this,t,el);};
// The exposed Cryo core is a hit-count objective, never a one-HP damage target.
// Direct attacks and delayed native packets use the same existing Pyro/armor-break gate.
P.fbHitCryoCore=function(t){const b=this.s.runtime,r=t.fb.revival;r.hits=(r.hits||0)+1;b.log.push({target:t.name,targetId:t.id,text:'냉기 핵에 금이 갔다 · '+r.hits+'/'+r.need,round:b.round});if(r.hits>=r.need){t.fb.revival=null;t.hp=0;this.fbLog(t,'CORE_BROKEN','핵 파괴',t.name+'의 냉기 핵이 부서졌다');}return true;};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime;if(!b?.fieldBoss||!t)return old.damage.call(this,a,t,k,e,o);
 const barrier=this.fieldBossBarrierReason(a,t,e,o.range);if(barrier)return this.fieldBossBlockedHit(a,t,barrier);
 if(this.fbUntouchable(t)&&a.side==='ALLY'){const why=t.fb.untouchable?'본체에는 닿지 않는다 · 형상을 쓰러뜨려야 한다':t.fb.burrowed?'땅속에 있어 닿지 않는다':'부활을 지키는 '+(BOSSES[t.source].kind==='ELECTRO'?'프리즘':'기둥')+'을 먼저 부숴야 한다';b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,damage:0,immune:why,round:b.round});return false;}
 if(t.fb&&a.side==='ALLY'&&this.hasElementImmunity(t,e))this.fieldBossSeen(b,'IMMUNE');
 if(t.hp>0&&t.fb?.revival&&a.side==='ALLY'&&BOSSES[t.source].kind==='CRYO_HYPO')return k>0||Number(o.rawAdd)>0?this.fbHitCryoCore(t):false;
 // Rules damage builds the final packet without its range. Carry only the same
 // actor/target/kind packet, never a nested reaction, and restore on every exit.
 if(!repeatBehavior(b.fieldBoss))return old.damage.call(this,a,t,k,e,o);
 const prior=this._fieldBossDamagePacket;this._fieldBossDamagePacket={actor:a,target:t,range:o.range||a.range,sourceKind:o.sourceKind||null};
 try{return old.damage.call(this,a,t,k,e,o);}finally{if(prior===undefined)delete this._fieldBossDamagePacket;else this._fieldBossDamagePacket=prior;}
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const b=this.s.runtime;if(!b)return n;
 if(b.fieldBoss){
  if(t?.fb){const d=BOSSES[t.source];if(t.fb.exposedUntil>=b.round)n*=1.5;if(d.kind==='PRIMO'&&ko(e)===t.fb.infused)n*=.5;if(d.kind==='ELECTRO'&&b.actors.some(x=>x.fbSummon?.kind==='FB_SUMMON_PRISM'&&x.hp>0))n*=.5;}
  if(t?.fbSummon?.kind==='FB_SUMMON_PILLAR'&&ko(e)==='바위')n*=2;
 }
 if(b.twinBoss?.mark&&a?.source===b.twinBoss.boss&&t?.id===b.twinBoss.mark&&!o.aoe&&!o.sourceKind)n*=1.3;
 return n;
};
P.applyDamage=function(a,t,n,details={}){
 const b=this.s.runtime;if(!b?.fieldBoss||!t)return old.applyDamage.call(this,a,t,n,details);
 const owner=a?.fb&&a.source===b.fieldBoss.boss?a:a?.fbSummon&&b.actors.find(x=>x.id===a.fbSummon.owner&&x.fb&&x.source===b.fieldBoss.boss);
 if(b.fieldBoss.pressureRevision===1&&owner&&a.side==='ENEMY'&&t.side==='ALLY'&&!details.sourceKind&&String(details.card||'').startsWith('FB_'))details={...details,shieldDamageMultiplier:(Number(details.shieldDamageMultiplier)||1)*FIELD_SHIELD_PRESSURE_V01627[b.fieldBoss.boss]};
 const packet=this._fieldBossDamagePacket,range=details.range||(repeatBehavior(b.fieldBoss)&&packet?.actor===a&&packet?.target===t&&packet.sourceKind===(details.sourceKind||null)&&!String(details.sourceKind||'').startsWith('REACTION')?packet.range:undefined);
 const barrier=this.fieldBossBarrierReason(a,t,details.element,range);if(barrier)return this.fieldBossBlockedHit(a,t,barrier);
 if(modernBehavior(b.fieldBoss)&&t.fb?.burrowed&&a?.side==='ALLY')return this.fieldBossBlockedHit(a,t,'땅속에 있어 닿지 않는다');
 if(t.fb?.revival?.guarded&&a?.side==='ALLY')return this.fieldBossBlockedHit(a,t,'부활을 지키는 '+(BOSSES[t.source].kind==='ELECTRO'?'프리즘':'기둥')+'을 먼저 부숴야 한다');
 if(t.hp>0&&t.fb?.revival&&BOSSES[t.source].kind==='CRYO_HYPO'){if(a?.side==='ALLY'&&Math.round(Math.max(0,n))>0)this.fbHitCryoCore(t);return 0;}
 const had=t.hp,shell=(t.shields||[]).some(s=>s.source==='FB_SHELL'&&s.value>0);
 if(t.fb?.revival&&BOSSES[t.source].kind==='ANEMO'&&a?.side==='ALLY'){const r=t.fb.revival,take=Math.max(0,Math.round(n));r.core=Math.max(0,r.core-take);b.log.push({actor:a.name,target:t.name,targetId:t.id,damage:take,core:r.core,text:'드러난 핵 · 남은 핵 '+r.core,round:b.round});if(r.core<=0){t.fb.revival=null;t.hp=0;this.fbLog(t,'CORE_BROKEN','핵 파괴',t.name+'의 핵이 부서졌다');}return take;}
 const result=old.applyDamage.call(this,a,t,n,details);
 if(t.fb){
  if(shell&&!(t.shields||[]).some(s=>s.source==='FB_SHELL'&&s.value>0)){t.fb.shieldBreaks++;t.fb.shieldReturn=b.round+3;this.fbExpose(t,2,true);this.fbLog(t,'SHELL_BREAK','결정막 파괴',t.name+'의 결정막이 깨졌다 · 무방비·핵 노출 2라운드');}
  if(had>0&&t.hp<=0&&!t.fb.revived&&['ANEMO','ELECTRO','GEO_HYPO','CRYO_HYPO'].includes(BOSSES[t.source].kind))this.fbStartRevival(t);
 }
 if(t.fbSummon&&had>0&&t.hp<=0){const boss=b.actors.find(x=>x.id===t.fbSummon.owner);
  if(boss&&BOSSES[boss.source]?.kind==='OCEANID'){b.fieldBoss.defeated++;boss.hp=Math.max(0,boss.maxHp-Math.round(boss.maxHp*b.fieldBoss.defeated/b.fieldBoss.target));b.log.push({target:boss.name,targetId:boss.id,text:'물의 형상 '+b.fieldBoss.defeated+'/'+b.fieldBoss.target+' 처치',round:b.round});
   if(t.fbSummon.kind==='FB_MIMIC_FROG'){this.fieldBossSeen(b,'FROG');this.addHazard({id:'FB_FROG_'+t.id,kind:'FLOOD',power:.05,rounds:1,targets:'FRONT',source:t.id});}
   if(b.fieldBoss.defeated>=b.fieldBoss.target){for(const x of b.actors.filter(x=>x.side==='ENEMY'))x.hp=0;this.fbLog(boss,'DISPERSE','형체 붕괴',boss.name+'의 형체가 흩어졌다');}}
  if(boss?.fb?.revival&&!b.actors.some(x=>x.fbSummon?.owner===boss.id&&x.hp>0&&['FB_SUMMON_PRISM','FB_SUMMON_PILLAR'].includes(x.fbSummon.kind))){boss.fb.revival=null;boss.hp=0;this.fbLog(boss,'REVIVE_FAILED','부활 저지',boss.name+'의 부활을 막았다');}}
 return result;
};
P.fbStartRevival=function(t){
 const b=this.s.runtime,d=BOSSES[t.source];t.fb.revived=true;t.hp=1;this.fieldBossSeen(b,'REVIVE');
 if(d.kind==='ANEMO'){t.fb.revival={rounds:2,core:Math.round(t.maxHp*.18)};this.fbExpose(t,2,false);}
 if(d.kind==='CRYO_HYPO'){t.fb.revival={rounds:2,need:4,hits:0,...(modernBehavior(b.fieldBoss)?{startedRound:b.round}: {})};this.fbExpose(t,2,false);}
 if(d.kind==='ELECTRO'||d.kind==='GEO_HYPO'){const kind=d.kind==='ELECTRO'?'FB_SUMMON_PRISM':'FB_SUMMON_PILLAR',alive=b.actors.filter(x=>x.fbSummon?.owner===t.id&&x.fbSummon.kind===kind&&x.hp>0).length;for(let i=alive;i<3;i++)this.fbSummon(b,t,kind);t.fb.revival={rounds:b.fieldBoss.behaviorRevision===5?4:3,guarded:true};}
 this.fbLog(t,'REVIVE',gimText(b,t.source,'REVIVE').label,t.name+' · '+(b.fieldBoss.behaviorRevision===5&&['ELECTRO','GEO_HYPO'].includes(d.kind)?'부활을 막으려면 다음 3라운드 안에 '+(d.kind==='ELECTRO'?'프리즘':'현암 기둥')+'을 모두 파괴':gimText(b,t.source,'REVIVE').text));
};
P.newRound=function(...args){
 const b=this.s.runtime;
 if(b?.fieldBoss&&b.opening?.state!=='PENDING'){const boss=b.actors.find(a=>a.fb);const d=boss&&BOSSES[boss.source];
  if(boss&&boss.hp>0){
   if(boss.fb.exposedUntil<b.round)boss.bossExposed=false;
   if((d.kind==='CRYO_VINE'||d.kind==='PYRO_VINE')&&boss.fb.shieldReturn&&b.round>=boss.fb.shieldReturn&&!(boss.shields||[]).some(s=>s.source==='FB_SHELL'&&s.value>0)){boss.fb.shieldReturn=0;this.fbShell(boss);this.fbLog(boss,'SHELL_RETURN','결정막 재생',boss.name+'의 결정막이 다시 자랐다');}
   if(d.kind==='ELECTRO'&&!boss.fb.prisms&&!boss.fb.revival&&boss.hp/boss.maxHp<=.5){boss.fb.prisms=true;this.fieldBossSeen(b,'PRISM');for(let i=0;i<2;i++)this.fbSummon(b,boss,'FB_SUMMON_PRISM');this.fbLog(boss,'PRISM','뇌광 프리즘',boss.name+'이(가) 뇌광 프리즘을 불러냈다 · 프리즘이 있는 동안 본체 피해 절반');}
   if(d.kind==='GEO_HYPO'&&!boss.fb.pillars&&!boss.fb.revival&&boss.hp/boss.maxHp<=.6){boss.fb.pillars=true;this.fieldBossSeen(b,'PILLARS');for(let i=0;i<3;i++)this.fbSummon(b,boss,'FB_SUMMON_PILLAR');this.fbLog(boss,'PILLARS','현암 기둥',boss.name+'이(가) 현암 기둥을 세웠다 · 기둥마다 라운드 끝 회복');}
   if(d.kind==='OCEANID'){const alive=b.actors.filter(x=>x.fbSummon&&x.hp>0).length;if(alive<2&&b.fieldBoss.spawned<b.fieldBoss.target+2)this.fbSpawnMimics(b,boss,2-alive);}
   if(d.kind==='PYRO_VINE'){const every=boss.hp/boss.maxHp<=.3?2:3;const due=b.round%every===0;b.fieldBoss.heatwave=due?'THIS_ROUND':(b.round+1)%every===0?'NEXT_ROUND':null;if(due||b.fieldBoss.heatwave)this.fieldBossSeen(b,'HEATWAVE');if(every===2)this.fieldBossSeen(b,'ENRAGE');}
  }}
 if(b?.twinBoss&&b.opening?.state!=='PENDING')this.twinBossRound(b,false);
 return old.newRound.apply(this,args);
};
P.roundEnd=function(...args){
 const b=this.s.runtime;
 if(b?.fieldBoss){const boss=b.actors.find(a=>a.fb),d=boss&&BOSSES[boss.source];
  if(boss&&boss.hp>0&&b.actors.some(a=>a.side==='ALLY'&&a.hp>0)){
   if(d.kind==='PYRO_VINE'&&b.fieldBoss.heatwave==='THIS_ROUND'){this.addHazard({id:'FB_HEATWAVE',kind:'FIRE',power:.12,rounds:1,targets:'ALL',source:boss.id});this.fbLog(boss,'HEATWAVE','폭염 확산','전장이 폭염에 휩싸였다');}
   for(const p of b.actors.filter(x=>x.fbSummon?.kind==='FB_SUMMON_PILLAR'&&x.hp>0&&x.fbSummon.owner===boss.id))if(!boss.fb.revival){const healed=this.heal(boss,boss.maxHp/(b.bossLength?.hp||1)*.025,p.name);if(healed)b.log.push({target:boss.name,targetId:boss.id,heal:healed,text:'현암 공명 · '+boss.name+' 회복',round:b.round});}
   // Saved older fights retain their old countdown. New Cryo cores are counted
   // at the native END boundary, after delayed damage and before the next START.
   if(boss.fb.revival&&!(d.kind==='CRYO_HYPO'&&modernBehavior(b.fieldBoss))){boss.fb.revival.rounds--;if(boss.fb.revival.rounds<=0)this.fbRevivalExpired(b,boss);}
  }}
 if(b?.twinBoss&&b.actors.some(a=>a.side==='ALLY'&&a.hp>0))this.twinBossRound(b,true);
 return old.roundEnd.apply(this,args);
};
P.fbRevivalExpired=function(b,boss){const d=BOSSES[boss.source];boss.fb.revival=null;if(repeatBehavior(b.fieldBoss))boss.fb.revived=false;boss.hp=Math.round(boss.maxHp*(d.kind==='CRYO_HYPO'?.5:.4));boss.bossExposed=false;boss.fb.exposedUntil=0;for(const x of b.actors.filter(x=>x.fbSummon?.owner===boss.id))x.hp=0;this.fbLog(boss,'REVIVED','부활',boss.name+'이(가) 다시 일어섰다');};
P.fieldBossRoundEndAfterDamage=function(b){
 if(this.s.runtime!==b||!modernBehavior(b.fieldBoss)||!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return;
 const boss=b.actors.find(a=>a.fb?.kind==='CRYO_HYPO'&&a.hp>0),r=boss?.fb.revival;if(!r||b.round<=r.startedRound||r.lastCountdownRound===b.round)return;
 r.lastCountdownRound=b.round;r.rounds--;if(r.rounds<=0)this.fbRevivalExpired(b,boss);
};
P.combatActionsPerTurn=function(a){const base=old.combatActionsPerTurn?old.combatActionsPerTurn.call(this,a):1;const d=a?.fb&&BOSSES[a.source];if(!d)return base;let n=Math.max(base,(TUNE_BY[a.source]||{}).actions??TUNE.actions);if(d.enrage&&a.hp/a.maxHp<=.3&&d.kind!=='PRIMO'){this.fieldBossSeen(this.s.runtime,'ENRAGE');n++;}return n;};
// 0.15.21: the same count for the turn order on screen (「×2」), without noting the enrage as seen (read-only).
P.fieldBossActions=function(a){const d=a?.fb&&BOSSES[a.source];if(!d)return 1;let n=(TUNE_BY[a.source]||{}).actions??TUNE.actions;if(d.enrage&&a.hp/a.maxHp<=.3&&d.kind!=='PRIMO')n++;return n;};
P.combatCards=function(...args){const cards=old.combatCards.apply(this,args),b=this.s.runtime;if(!b?.fieldBoss||!Array.isArray(cards))return cards;
 return cards.map(c=>{if(!Array.isArray(c.targets))return c;const ok=c.targets.filter(t=>!this.fbUntouchable(b.actors.find(x=>x.id===t.id)));return ok.length&&ok.length!==c.targets.length?{...c,targets:ok}:c;});};

// ---- results, notes and cooldown -----------------------------------------------------------------------------
P.finishBattle=function(victory){
 const b=this.s.runtime,f=b?.fieldBoss?copy(b.fieldBoss):null,t=b?.twinBoss?copy(b.twinBoss):null,rounds=b?.round;
 const result=old.finishBattle.call(this,victory);if(!f&&!t)return result;
 if(f){const n=(this.s.fieldBossNotes??={})[f.boss]??={seen:[],attempts:1,wins:0,best:null};for(const g of f.seen)if(!n.seen.includes(g))n.seen.push(g);
  if(victory){n.wins++;n.best=n.best?Math.min(n.best,rounds):rounds;(this.s.fieldBossClock??={})[f.boss]=this.fieldBossClock()+COOLDOWN;
   if(n.wins===1&&!b.storyConfig?.noRewards){const mat=BOSSES[f.boss].material;this.giveItem(mat,1);result.loot={...result.loot,[mat]:(result.loot?.[mat]||0)+1};result.firstClear=true;}}
  result.fieldBoss={boss:f.boss,name:BOSSES[f.boss].name,seen:f.seen.slice(),victory:!!victory};}
 if(t)result.twinBoss={boss:t.boss,seen:t.seen.slice()};
 this.s.combatReceipts[result.battleId||result.id]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);const log=this.s.log.findLast(r=>r.battleId===(result.battleId||result.id));if(log)Object.assign(log,copy(result));
 return result;
};

// ---- views -----------------------------------------------------------------------------------------------------
P.fieldBossCatalog=function(){return Object.entries(BOSSES).map(([id,d])=>({id,route:ROUTE(id),name:d.name,map:d.map,region:d.region,level:d.level,material:d.material,materialName:MATERIALS[d.material].name}));};
P.fieldBossRouteInfo=function(route){
 const id=bossForRoute(route);if(!id)return null;const d=BOSSES[id],notes=this.fieldBossNotes(id),party=this.activePartyActors?this.activePartyActors():[];
 const traits=Object.fromEntries(['HEAT','COLD','INSULATE','WATERPROOF','ANTITOXIN','STAGGER_RES','HEAVY','CONTROL_RES','SHIELD_BREAK','ARMOR_BREAK','ANTI_AIR','AIR_ACCESS','SHIELD_BOOST','PURIFY','WEAK_POINT'].map(k=>[k,Math.max(0,...party.map(a=>Number(this.actorTraits?.(a.source||a.id)?.[k]||0)))]));
 return {id,route,name:d.name,level:d.level,region:d.region,summary:d.summary,material:{id:d.material,name:MATERIALS[d.material].name},cooldown:this.fieldBossCooldown(id),notes,
  gimmicks:Object.keys(d.gimmicks).map(k=>[k,gimNew(id,k)]).map(([k,g])=>({id:k,...(notes.seen.includes(k)?g:{label:'???',text:'아직 겪어 보지 않은 기믹',counter:''}),known:notes.seen.includes(k)})),
  immune:d.immune.includes('ALL')?['본체 무적']:d.immune.slice(),party:party.map(a=>({name:a.name,level:a.level})),low:party.filter(a=>a.level<d.level).map(a=>a.name),traits};
};
P.fieldBossView=function(){
 const b=this.s.runtime;if(!b?.fieldBoss&&!b?.twinBoss)return null;
 if(b.twinBoss){const t=b.twinBoss,mark=b.actors.find(a=>a.id===t.mark);return {twin:true,name:TWIN[t.boss].name,telegraph:t.telegraph,mark:mark?.name||null,seen:t.seen.map(k=>({id:k,...TWIN[t.boss].gimmicks[k]}))};}
 const f=b.fieldBoss,boss=b.actors.find(a=>a.fb),d=BOSSES[f.boss];if(!boss)return null;
 const shield=(boss.shields||[]).filter(s=>s.value>0).reduce((n,s)=>n+s.value,0),summons=b.actors.filter(x=>x.fbSummon&&x.hp>0);
 const state=[];if(boss.airborne)state.push('공중 · 원거리·대공·공중 접근만 닿음');if(boss.fb.burrowed)state.push('땅속 · 피해를 받지 않음');if(boss.fb.stunned)state.push('무방비 · 다음 행동을 건너뜀');if(boss.fb.exposedUntil>=b.round)state.push('핵 노출 · 받는 피해 +50% (약점 공략 적용)');
 if(shield)state.push('보호막 '+shield);if(boss.fb.infused)state.push('흡수 원소 · '+boss.fb.infused+' (그 원소 피해 절반)');if(d.kind==='ELECTRO'&&summons.length)state.push('프리즘 '+summons.length+'개 · 본체 피해 절반');
 if(d.kind==='GEO_HYPO'&&summons.length)state.push('현암 기둥 '+summons.length+'개 · 라운드 끝 회복');if(d.kind==='OCEANID')state.push('형상 처치 '+f.defeated+'/'+f.target);
 if(boss.fb.revival){const r=boss.fb.revival;state.push(d.kind==='ANEMO'?'핵 노출 · 남은 핵 '+r.core+' · '+r.rounds+'라운드 안에':d.kind==='CRYO_HYPO'?'냉기 핵 · '+(r.hits||0)+'/'+r.need+'회 적중 · '+r.rounds+'라운드 안에':'부활 준비 · '+r.rounds+'라운드 안에 소환물을 모두 파괴');}
 if(f.heatwave)state.push(f.heatwave==='THIS_ROUND'?'이번 라운드 끝 폭염 확산 (전원 최대 HP 12%)':'다음 라운드 끝 폭염 확산 예고');
 return {name:d.name,level:d.level,telegraph:f.telegraph,state,immune:d.immune.includes('ALL')?['본체 무적']:d.immune.slice(),seen:f.seen.map(k=>({id:k,...gimText(b,f.boss,k)})).filter(x=>x.label)};
};
if(old.enemyIntel)P.enemyIntel=function(id){const info=old.enemyIntel.call(this,id),a=this.combatActor?.(id);if(!info||!a)return info;if(a.fbSummon)info.fieldSummon={kind:a.fbSummon.kind,name:SUMMONS[a.fbSummon.kind]?.name};if(a.fb)info.fieldBoss=true;
 // 0.16.30 (TODO 2-7): a field boss acts through its gimmicks, not enemy cards, so 「보유 기술」 said 기본 공격 only. It lists
 // the gimmicks seen in this fight or an earlier one, and how many are still unseen (they are learned by watching).
 const d=a.fb&&BOSSES[a.source];
 if(d){const seen=new Set([...(this.s.runtime?.fieldBoss?.seen||[]),...this.fieldBossNotes(a.source).seen]),keys=Object.keys(d.gimmicks),gimmick=(id,name,text,counter)=>({id,name,kind:'기믹',passive:true,element:'',target:'',coefficient:'',description:text,summary:text,condition:'전투 중 자동',cooldown:0,remaining:0,supported:true,reason:'',available:false,unavailableReason:'',counter,charging:false});
  info.cards=keys.filter(k=>seen.has(k)).map(k=>gimmick('FB_GIMMICK_'+k,gimText(this.s.runtime,a.source,k).label,gimText(this.s.runtime,a.source,k).text,gimText(this.s.runtime,a.source,k).counter));
  const unseen=keys.length-info.cards.length;if(unseen)info.cards.push(gimmick('FB_GIMMICK_UNSEEN','아직 보지 못한 기술 '+unseen+'개','전투에서 한 번 보면 여기에 기록됩니다.',''));}
 return info;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s;
 const clock=out.fieldBossClock;if(clock!==undefined&&(!clock||typeof clock!=='object'||Array.isArray(clock)||Object.entries(clock).some(([k,v])=>!BOSSES[k]||!Number.isSafeInteger(v)||v<0)))fail('FIELD_BOSS_SAVE','필드 보스 재등장 기록이 올바르지 않습니다.');
 const notes=out.fieldBossNotes;if(notes!==undefined&&(!notes||typeof notes!=='object'||Object.entries(notes).some(([k,n])=>!BOSSES[k]||!Array.isArray(n?.seen)||n.seen.some(g=>!BOSSES[k].gimmicks[g])||!Number.isInteger(n.attempts)||!Number.isInteger(n.wins))))fail('FIELD_BOSS_SAVE','필드 보스 관찰 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.fieldBoss){const f=b.fieldBoss;if(f.version!==1||!BOSSES[f.boss]||!Array.isArray(f.seen)||!b.actors?.some(a=>a.source===f.boss&&a.fb?.version===1)||f.behaviorRevision!==undefined&&![2,3,4,5].includes(f.behaviorRevision))fail('FIELD_BOSS_SAVE','필드 보스 전투 기록이 올바르지 않습니다.');
  if(f.pressureRevision!==undefined&&(f.pressureRevision!==1||f.behaviorRevision!==5||b.origin!=='BOSS:'+ROUTE(f.boss)||f.route!==ROUTE(f.boss)||b.abyss||b.raid))fail('FIELD_BOSS_SAVE','필드 보스 공격 압력 기록이 올바르지 않습니다.');
  const boss=b.actors.find(a=>a.source===f.boss),r=boss.fb.revival;if(modernBehavior(f)&&boss.fb.kind==='CRYO_HYPO'&&r&&(!Number.isSafeInteger(r.startedRound)||r.startedRound<1||r.startedRound>b.round||r.lastCountdownRound!==undefined&&(!Number.isSafeInteger(r.lastCountdownRound)||r.lastCountdownRound<r.startedRound||r.lastCountdownRound>b.round)))fail('FIELD_BOSS_SAVE','냉기 핵 대응 시간 기록이 올바르지 않습니다.');}
 if(b?.twinBoss&&(b.twinBoss.version!==1||!TWIN[b.twinBoss.boss]))fail('FIELD_BOSS_SAVE','보스 기믹 기록이 올바르지 않습니다.');
 return out;
};
// ---- 0.16.46 조작하는 보스 (user, 2026-10-15) ---------------------------------------------------------------------
// 「무상의 바람은 좀 컨트롤적인 요소를 추가해서 wasd로 움직이는 언더테일 느낌으로 공격을 피하면서 바람원소 먹는 그런거. 맞을때마다
// 전체데미지 받고」, 「무상의 바람은 핵 노출 때만 공격이 되는게 정석 아닌가?」, 「무상의 뇌전은 핵 노출할때 자동으로 소환체를 공격하던데,
// 그러지 말고 주인공쪽만 공격하도록 하자」, 「무상의 얼음 … 고증에 맞춰서 미니게임같은거 꽤 난이도 있게」, 「일일보스도 마찬가지」.
// Only fights opened from now on (controlRevision 1: a field boss's own route, or a daily boss challenge) use these rules;
// a fight saved before keeps the rules it started with. Each minigame is the protagonist's one action (a system card):
// the page plays it and sends what happened with the COMBAT action (`mini`), which the rules clamp and apply here.
//  - 무상의 바람: its core is shut while it gathers the barrage or floats (원작: 무상 계열은 핵이 드러날 때만 피해를 받는다).
//    「바람 탄막」 is telegraphed; the protagonist's 「바람 탄막 피하기」 is a dodge game — every hit is damage to the whole
//    party, and every wind orb taken in it is an element particle (원소폭발 충전). The core opens by itself once it has attacked.
//  - 무상의 뇌전: the three prisms of its revival are broken by the protagonist's own blows, never by companions on their own:
//    one non-Electro blow breaks one prism (원작: 번개 외 공격으로 프리즘 파괴), and 함께하는 일격 carries on to the next prism.
//  - 무상의 얼음: its fleeing core (원작: 쓰러지면 냉기 핵이 도망치며 부활을 노린다) can be chased — 「냉기 핵 쫓기」.
//  - 드발린: every third round its corrupted crystals glow (원작: 몸의 부식 결정을 쏘아 떨어뜨린다) — 「부식 결정 저격」.
//  - 안드리우스: 「얼음 발톱 질주」 sweeps the field (원작: 2페이즈 질주) — the same dodge game, 「질주 피하기」.
//  - 타르탈리아: 「극악기·진멸」 (원작: 마왕 무장의 물 칼날·번개 창) and 야타용왕: 「지맥 충격파」 (원작: 땅을 구르는 충격파와 운석) at the end of
//    every third round of their daily challenge — 「진멸 피하기」, 「충격파 넘기」.
// (user, 2026-10-15: 「고증만 살리고 스펙 난이도는 신경쓰지 말어봐」 — the numbers here are placeholders for the balance pass.)
const MINI={SERPENT:'SYS_FB_SERPENT_SNIPE',FRUIT:'SYS_FB_FROST_FRUIT',ORBS:'SYS_FB_WIND_ORBS',DODGE:'SYS_FB_WIND_DODGE',CHASE:'SYS_FB_CRYO_CHASE',SNIPE:'SYS_FB_DVALIN_SNIPE',DASH:'SYS_FB_ANDRIUS_DODGE',TIDE:'SYS_FB_TARTAGLIA_DODGE',QUAKE:'SYS_FB_AZHDAHA_DODGE'};
// ANEMO_ORBS: 원작 — Anemo orbs hang in the air among updrafts (four; five with the drifting one of 순수한 무상의 바람); every orb
// the boss gathers is more HP back, and one taken does not come back at its next revival.
const MINI_RULES={SERPENT_SNIPE:{points:4,shots:6,seconds:8,open:2},FROST_FRUIT:{need:3,melted:2,fruits:6,shots:4,seconds:14},ANEMO_ORBS:{orbs:5,maxHits:6,defaultHits:4,k:.25,seconds:10,base:.05,per:.07},ANEMO:{maxHits:6,defaultHits:4,orbs:5,k:.25,seconds:10},ANDRIUS:{maxHits:6,defaultHits:4,k:.13,seconds:9},CRYO:{max:3,seconds:8},DVALIN:{crystals:3,shots:6,seconds:8},TARTAGLIA:{maxHits:6,defaultHits:4,k:.13,seconds:9},AZHDAHA:{maxHits:6,defaultHits:4,k:.13,seconds:9}};
const LIYUE_DAILY={
 BOSS_TARTAGLIA:{origin:'MATERIAL_CHALLENGE:LIYUE_TARTAGLIA_FARM',kind:'TARTAGLIA_DODGE',card:MINI.TIDE,rules:'TARTAGLIA',label:'극악기·진멸',name:'진멸 피하기',ready:'물 칼날과 번개 창을 겨눈다',element:a=>(a.liyuePhase||1)===2?'번개':'물'},
 BOSS_AZHDAHA:{origin:'MATERIAL_CHALLENGE:LIYUE_AZHDAHA_FARM',kind:'AZHDAHA_DODGE',card:MINI.QUAKE,rules:'AZHDAHA',label:'지맥 충격파',name:'충격파 넘기',ready:'앞발을 높이 든다',element:a=>ko(a.azhdaha?.current&&a.azhdaha.current!=='GEO'?a.azhdaha.current:'GEO')}};
// 0.16.54 boss pass (user: 「다른 보스들 공략들도 이상한거 있으면 제대로 바꿔」): 타르탈리아's attack to dodge follows his phase — 1 물 화살비, 2 뇌전 창, 3 극악기·진멸 (원작: bow and Hydro, the
// Electro Foul Legacy, then both). A fight saved before keeps 「극악기·진멸」 throughout.
const TARTAGLIA_STAGES={1:{label:'물 화살비',name:'물 화살비 피하기',ready:'활시위에 물 화살을 건다',el:['물'],how:'하늘에서 쏟아지는 물 화살과 겨눈 물 화살을 피하세요.'},2:{label:'뇌전 창',name:'뇌전 창 피하기',ready:'번개 창을 높이 든다',el:['번개'],how:'빛나는 줄로 내리꽂히는 번개 창과 번개 돌진을 피하세요.'},3:{label:'극악기·진멸',name:'진멸 피하기',ready:'물 칼날과 번개 창을 겨눈다',el:['물'],how:'날아오는 물 칼날과 빛나는 줄로 내리꽂히는 번개 창을 피하세요.'}};
const dailyStage=(b,L,boss,dodge)=>{const n=dodge?.stage||(pass(b)&&L.kind==='TARTAGLIA_DODGE'?Math.min(3,Math.max(1,boss?.liyuePhase||1)):0),st=n&&L.kind==='TARTAGLIA_DODGE'?TARTAGLIA_STAGES[n]:null;return st?{n,...st}:{n:0,label:L.label,name:L.name,ready:L.ready,el:[L.element(boss)],how:L.kind==='AZHDAHA_DODGE'?'퍼져 오는 충격파의 틈으로 빠져나가고 그림자가 진 곳에 떨어지는 운석을 피하세요.':'날아오는 물 칼날과 빛나는 줄로 내리꽂히는 번개 창을 피하세요.'};};
const dailyCtl=b=>b?.dailyDodge?.controlRevision===1&&!!LIYUE_DAILY[b.dailyDodge.boss]&&b.origin===LIYUE_DAILY[b.dailyDodge.boss].origin;
const ANEMO_ROTATION=['GUST','BARRAGE','PULL','RISE'];
// The control rules belong to the fight they were opened with: the same route fight (behavior 5, pressure 1) or daily challenge.
const ctl=b=>b?.fieldBoss?.controlRevision===1&&b.fieldBoss.behaviorRevision===5&&b.fieldBoss.pressureRevision===1;
// 0.16.54 (user, 2026-10-16: 「원래 무상의 바람 패턴이 피가 1이 되면 무적이 되고 주변에 날아다니면서 바람 원소 수집하는걸 미니게임으로 하려고 한건데」): a new 무상의 바람 fight (anemoOrbs 1) has no barrage dodge; its revival is 「바람 원소 모으기」.
const orbsCtl=b=>ctl(b)&&b.fieldBoss.anemoOrbs===1;
const orbsOf=t=>t?.fb?.kind==='ANEMO'&&t.fb.revival?.orbs||null;
// 0.16.54 (user: 「다른 보스들 공략들도 이상한거 있으면 제대로 바꿔. 공략이랑 비슷한 느낌을 주되, 아이디어는 참신한 것으로」): the rest of the 0.16.54 boss pass belongs to the fights opened with it (bossPass 1).
const pass=b=>b?.bossPass===1&&(ctl(b)||twinCtl(b)||dailyCtl(b));
const fruitOf=t=>t?.fb?.kind==='CRYO_HYPO'&&t.fb.revival?.fruit||null;
const twinCtl=b=>b?.twinBoss?.controlRevision===1&&String(b.origin).startsWith('MATERIAL_CHALLENGE:');
const fbBoss=b=>b?.actors?.find(a=>a.fb&&a.source===b.fieldBoss?.boss);
const playerActor=b=>b?.actors?.find(a=>a.side==='ALLY'&&a.control==='PLAYER');
const playerCanAct=(r,b)=>{const p=playerActor(b);return !!p&&p.hp>0&&!(r.combatActionLocked?r.combatActionLocked(p):st(p,'STATUS_FREEZE'));};
const miniSeed=(r,b,tag)=>hash(String(r.s.global.SAVE_ID)+'|'+b.id+'|'+tag+'|'+b.round)%1000000;
const clampInt=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(Number(v)||0)));
const orbsExpired=P.fbRevivalExpired;
const ctlOld=Object.fromEntries(['startBattle','fieldBossTurn','fieldBossBarrierReason','fbUntouchable','aiTurn','combatCards','executeCombatSystem','apply','combatDamageMultiplier','fbStartRevival','twinBossRound','fieldBossView','validateSave','combatAction','applyDamage','hasAirAccess','autoUntilPlayer','newRound','roundEnd'].map(k=>[k,P[k]]));
P.startBattle=function(...args){
 const before=this.s.runtime,result=ctlOld.startBattle.apply(this,args),b=this.s.runtime;if(!b||b===before)return result;
 if(b.fieldBoss&&b.fieldBoss.pressureRevision===1&&b.fieldBoss.behaviorRevision===5&&!b.fieldBoss.controlRevision){b.fieldBoss.controlRevision=1;b.bossPass=1;if(BOSSES[b.fieldBoss.boss]?.kind==='ANEMO')b.fieldBoss.anemoOrbs=1;}// an Anemo core starts shut (coreOpen unset) and opens after its first attack
 if(b.twinBoss&&String(b.origin).startsWith('MATERIAL_CHALLENGE:')&&!b.twinBoss.controlRevision){b.twinBoss.controlRevision=1;b.bossPass=1;}
 const liyue=Object.keys(LIYUE_DAILY).find(id=>LIYUE_DAILY[id].origin===b.origin&&b.actors.some(a=>a.side==='ENEMY'&&a.source===id));
 if(liyue&&!b.dailyDodge){b.dailyDodge={controlRevision:1,boss:liyue,dodge:null,exposedUntil:0,seq:0};b.bossPass=1;}
 return result;
};
// ---- 무상의 바람: the shut core, the barrage and its dodge ----
P.fieldBossTurn=function(a,...rest){const b=this.s.runtime;
 if(ctl(b)&&fruitOf(a)){const turn=b.round+':'+(a.turns||0);if(a.fb.endTurn===turn)return;a.fb.acts++;a.fb.endTurn=turn;this.fbLog(a,'REVIVING','부활 준비',a.name+'이(가) 얼음 보호막 속에서 다시 일어서려 한다 · 「서리 열매 치기」');this.fbMove(a,'LANCE');return;}
 if(!ctl(b)||a?.fb?.kind!=='ANEMO')return ctlOld.fieldBossTurn.call(this,a,...rest);
 const f=a.fb,d=BOSSES[a.source],turn=b.round+':'+(a.turns||0);
 if(f.endTurn===turn)return;f.acts++;
 if(f.stunned){f.stunned=false;f.endTurn=turn;this.fbLog(a,'STUNNED','무방비',a.name+'이(가) 무방비 상태라 움직이지 못한다.');return;}
 if(f.revival){f.endTurn=turn;const o=f.revival.orbs;this.fbLog(a,'REVIVING','부활 준비',o?a.name+'이(가) 무적인 채로 바람 원소를 빨아들이려 한다 · 「바람 원소 모으기」':a.name+'이(가) 다시 일어서려 한다.');this.fbMove(a,'PULL');return;}
 if(f.next){const move=f.next,dodge=b.fieldBoss.dodge;
  // The barrage waits (once) until the protagonist has had a turn to brace for it.
  if(move==='BARRAGE'&&dodge&&!dodge.result&&!dodge.playerActed&&!dodge.held&&playerCanAct(this,b)){dodge.held=true;f.endTurn=turn;f.coreOpen=false;this.fbLog(a,'BARRAGE_GATHER','바람 모으기',a.name+'이(가) 탄막에 쓸 바람을 더 모은다 · 핵이 닫혀 있다');return;}
  f.next=null;b.fieldBoss.telegraph=null;if(move==='BARRAGE')this.fbBarrage(a);else this.fbMove(a,move);f.coreOpen=true;return;}
 const move=ANEMO_ROTATION[(f.rot=(f.rot||0))%ANEMO_ROTATION.length];f.rot++;
 if(move==='RISE'){a.airborne=true;f.coreOpen=false;this.fieldBossSeen(b,'RISE');this.fieldBossSeen(b,'SHUT');f.next='SLAM';b.fieldBoss.telegraph={move:'RISE',label:'상승 기류',text:'떠올라 있는 동안 핵이 닫힘 · 다음 차례 전열 내려찍기',counter:gimText(b,a.source,'RISE').counter};this.fbLog(a,'RISE','상승 기류',a.name+'이(가) 높이 떠올랐다 · 핵이 닫혔다 · 다음 차례에 전열을 내려찍는다');f.endTurn=turn;return;}
 if(move==='BARRAGE'){const g=gimText(b,a.source,'BARRAGE');f.next='BARRAGE';f.coreOpen=false;this.fieldBossSeen(b,'BARRAGE');this.fieldBossSeen(b,'SHUT');
  if(!orbsCtl(b))b.fieldBoss.dodge={kind:'ANEMO',id:(b.fieldBoss.dodgeSeq=(b.fieldBoss.dodgeSeq||0)+1),seed:miniSeed(this,b,'BARRAGE'),round:b.round,result:null,playerActed:false};
  b.fieldBoss.telegraph={move:'BARRAGE',label:g.label,text:g.text,counter:g.counter};
  this.fbLog(a,'BARRAGE_READY',g.label+' 준비',a.name+'이(가) 바람을 모아 탄막을 준비한다 · 핵이 닫혔다 · 대응: '+g.counter);f.endTurn=turn;return;}
 if(TELEGRAPHED.has(move)){this.fbTelegraph(a,move);f.endTurn=turn;return;}
 this.fbMove(a,move);f.coreOpen=true;
};
P.fbBarrage=function(a){
 const b=this.s.runtime,R=MINI_RULES.ANEMO,dodge=b.fieldBoss.dodge,res=dodge?.result,hits=res?res.hits:R.defaultHits,orbs=res?res.orbs:0;
 b.fieldBoss.dodge=null;this.fieldBossSeen(b,'BARRAGE');
 this.fbLog(a,'BARRAGE','바람 탄막',res?'바람 탄막 · '+hits+'발 적중 · 바람 원소 '+orbs+'개':orbsCtl(b)?'바람 탄막 · 전원 '+hits+'발':'바람 탄막 · 피하지 못해 '+hits+'발 적중');
 if(hits>0)for(const t of rowOf(b,'ALL'))this.fbHit(a,t,R.k*hits,'바람',{move:'BARRAGE',aoe:true});
 if(orbs>0)this.fbChargeBursts(orbs);
};
// Wind orbs taken in the dodge are 원소 입자: each one takes a turn off the longest 원소폭발 wait in the party.
P.fbChargeBursts=function(n){const b=this.s.runtime,party=b.actors.filter(x=>x.side==='ALLY'&&x.hp>0),done=[];
 for(let i=0;i<n;i++){let best=null;for(const x of party)for(const [id,cd] of Object.entries(x.cooldowns||{}))if(/_Q$/.test(id)&&cd>0&&(!best||cd>best.cd))best={x,id,cd};if(!best)break;best.x.cooldowns[best.id]--;done.push(best.x.name);}
 const names=[...new Set(done)];b.log.push({text:'바람 원소 '+n+'개 · 원소폭발 충전'+(names.length?' · '+names.join('·')+' 재사용 −'+done.length+'차례':' (이미 모두 준비됨)'),round:b.round,fieldBoss:true});};
P.fbCoreShut=function(t){const b=this.s.runtime,f=t?.fb;return !!(ctl(b)&&f?.kind==='ANEMO'&&t.hp>0&&!f.revival&&!f.coreOpen&&!(f.exposedUntil>=b.round));};
// 0.16.59 (field-boss re-measure: with the protagonist down nobody could break a prism, and 무상의 뇌전 revived until the party fell):
// the revival prisms are the protagonist's to break while the protagonist stands; once the protagonist is down, the companions break them.
const heroUp=b=>!!b?.actors?.some(x=>x.side==='ALLY'&&x.control==='PLAYER'&&x.hp>0);
P.fieldBossBarrierReason=function(a,t,element,range){
 const b=this.s.runtime;
 if(ctl(b)&&a?.side==='ALLY'&&fruitOf(t)&&!(ko(element)==='불'&&!fruitOf(t).melted))return '두꺼운 얼음 보호막이다 · 서리 열매를 쳐서 맞히거나 불로 녹여야 한다.';
 if(orbsCtl(b)&&a?.side==='ALLY'&&orbsOf(t))return '무적 · 바람 원소를 모으는 중이다 · 주인공의 「바람 원소 모으기」로 원소를 빼앗아야 한다.';
 if(ctl(b)&&a?.side==='ALLY'&&t){
  if(this.fbCoreShut(t))return '핵이 닫혀 있다 · 무상의 바람이 공격을 마친 뒤나 핵이 드러났을 때만 피해가 들어간다.';
  const owner=t.fbSummon?.kind==='FB_SUMMON_PRISM'&&b.actors.find(x=>x.id===t.fbSummon.owner);
  if(owner?.fb?.revival){if(!this._fbPlayerLed&&heroUp(b))return '부활을 지키는 프리즘은 주인공이 직접 노려야 부술 수 있다 · 주인공의 공격이나 함께하는 일격으로.';return ko(element)==='번개'?'번개는 프리즘에 흡수된다 · 다른 원소나 물리 공격으로.':'';}
 }
 return ctlOld.fieldBossBarrierReason.call(this,a,t,element,range);
};
P.fbUntouchable=function(t){return ctlOld.fbUntouchable.call(this,t)||this.fbCoreShut(t)||!!(orbsCtl(this.s.runtime)&&orbsOf(t));};
// Companions leave a melted ice shield to the protagonist's fruits (before it melts, their fire can still melt it).
const fruitWait=t=>!!fruitOf(t)?.melted;
P.aiTurn=function(a,targets,...rest){
 const b=this.s.runtime;
 if(a?.side==='ALLY'&&ctl(b)&&Array.isArray(targets)&&!a.charging){
  // Companions leave the revival prisms to the protagonist, and wait out a shut core instead of striking it.
  const left=targets.filter(t=>!(heroUp(b)&&t.fbSummon?.kind==='FB_SUMMON_PRISM'&&b.actors.find(x=>x.id===t.fbSummon.owner)?.fb?.revival)&&!this.fbCoreShut(t)&&!ctlOld.fbUntouchable.call(this,t)&&!(orbsCtl(b)&&orbsOf(t))&&!fruitWait(t));
  if(!left.length&&targets.some(t=>t.side==='ENEMY')){a.guard=true;b.log.push({actor:a.name,actorId:a.id,guard:true,reason:orbsCtl(b)&&orbsOf(fbBoss(b))?'무적인 무상의 바람이 바람 원소를 모으는 동안 방어 태세':fruitWait(fbBoss(b))?'주인공이 서리 열매를 치는 동안 방어 태세':this.fbCoreShut(fbBoss(b))?'핵이 닫혀 방어 태세':'주인공이 프리즘을 노리는 동안 방어 태세',round:b.round});return;}
  if(left.length)targets=left;
 }
 if(twinCtl(b)&&a?.side==='ENEMY'&&a.source===b.twinBoss.boss&&b.twinBoss.stun>0){b.twinBoss.stun--;b.log.push({actor:a.name,actorId:a.id,card:'TWIN_DOWNED',cardName:'추락',text:a.name+'이(가) 땅에 떨어져 몸을 일으키는 중이다',round:b.round});return;}
 return ctlOld.aiTurn.call(this,a,targets,...rest);
};
// The protagonist's own action (and the companions joining 함께하는 일격) is 「player-led」; the turns that follow it are not.
const revivalPrism=(b,t)=>t?.fbSummon?.kind==='FB_SUMMON_PRISM'&&t.hp>0&&!!b.actors.find(x=>x.id===t.fbSummon.owner)?.fb?.revival;
// The first fire to reach the ice shield melts it: one fruit fewer breaks it. Nothing else gets through.
P.fbFruitShieldHit=function(a,t,element,positive){const b=this.s.runtime,r=t.fb.revival,fr=r.fruit;
 if(ko(element)==='불'&&!fr.melted&&positive){fr.melted=true;r.need=Math.min(r.need,MINI_RULES.FROST_FRUIT.melted);b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,text:'불이 얼음 보호막을 녹였다 · 서리 열매 '+Math.max(0,r.need-r.hits)+'번이면 깨진다',round:b.round});if(r.hits>=r.need)this.fbHitCryoCore(t);return true;}
 return this.fieldBossBlockedHit(a,t,'두꺼운 얼음 보호막이다 · 서리 열매를 쳐서 맞혀야 한다');};
const ctlDamage=P.damage;
P.damage=function(a,t,k,e,o={}){const b=this.s.runtime;if(ctl(b)&&a?.side==='ALLY'&&fruitOf(t)&&t.hp>0)return this.fbFruitShieldHit(a,t,e,k>0||Number(o.rawAdd)>0);return ctlDamage.call(this,a,t,k,e,o);};
P.applyDamage=function(a,t,n,details={}){const b=this.s.runtime;
 if(ctl(b)&&a?.side==='ALLY'&&fruitOf(t)&&t.hp>0){this.fbFruitShieldHit(a,t,details.element,Math.round(Number(n)||0)>0);return 0;}
 if(orbsCtl(b)&&a?.side==='ALLY'&&orbsOf(t))return this.fieldBossBlockedHit(a,t,'무적 · 바람 원소를 모으는 중이다');
 if(ctl(b)&&a?.side==='ALLY'&&this._fbPlayerLed&&revivalPrism(b,t)&&Math.round(Number(n)||0)>0&&ko(details.element)!=='번개'){const had=t.hp,out=ctlOld.applyDamage.call(this,a,t,Math.max(n,t.hp+(t.shields||[]).reduce((m,x)=>m+Math.max(0,x.value),0)),details);if(had>0&&t.hp<=0)b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,text:t.name+' 파괴 · 남은 프리즘 '+b.actors.filter(x=>revivalPrism(b,x)).length,round:b.round});return out;}
 return ctlOld.applyDamage.call(this,a,t,n,details);};
P.hasAirAccess=function(a,t,range){const b=this.s.runtime;if(ctl(b)&&this._fbPlayerLed&&a?.side==='ALLY'&&t?.fb?.revival?.guarded&&b.actors.some(x=>revivalPrism(b,x)))return false;return ctlOld.hasAirAccess.call(this,a,t,range);};
// ---- 무상의 얼음: the fleeing core ----
P.fbStartRevival=function(t){const out=ctlOld.fbStartRevival.call(this,t),b=this.s.runtime;
 if(pass(b)&&ctl(b)&&t.fb?.revival&&t.fb.kind==='CRYO_HYPO'){const r=t.fb.revival;r.need=MINI_RULES.FROST_FRUIT.need;r.hits=0;r.fruit={id:(b.fieldBoss.fruitSeq=(b.fieldBoss.fruitSeq||0)+1),seed:miniSeed(this,b,'FRUIT'),tries:0,melted:false,round:0};t.bossExposed=false;t.fb.exposedUntil=0;this.fieldBossSeen(b,'FRUIT');return out;}
 // 0.16.54 (user, 2026-10-16: 「원래 무상의 바람 패턴이 피가 1이 되면 무적이 되고 주변에 날아다니면서 바람 원소 수집하는걸 미니게임으로 하려고 한건데」): HP 1, invulnerable, five scattered Anemo orbs to take before it gathers them (no floating core to break).
 if(orbsCtl(b)&&t.fb?.revival&&t.fb.kind==='ANEMO'){t.fb.revival={rounds:t.fb.revival.rounds,orbs:{id:(b.fieldBoss.orbSeq=(b.fieldBoss.orbSeq||0)+1),seed:miniSeed(this,b,'ORBS'),total:Math.max(1,MINI_RULES.ANEMO_ORBS.orbs-(b.fieldBoss.orbsTaken||0)),got:0,tries:0}};t.bossExposed=false;t.fb.exposedUntil=0;this.fieldBossSeen(b,'REVIVE');}
 if(ctl(b)&&t.fb?.revival&&t.fb.kind==='CRYO_HYPO'){const r=t.fb.revival;r.chaseId=(b.fieldBoss.chaseSeq=(b.fieldBoss.chaseSeq||0)+1);r.chaseSeed=miniSeed(this,b,'CHASE');this.fieldBossSeen(b,'CHASE');}return out;};
// The gathering ends when its rounds run out or every orb is taken: each orb it got back is more HP (none: 5%, all five: 40%).
// A revival it was robbed of is its last; one it fed on comes again (behavior 3+), as before.
P.fbRevivalExpired=function(b,boss,...rest){const o=orbsOf(boss);if(!o)return orbsExpired.call(this,b,boss,...rest);
 const R=MINI_RULES.ANEMO_ORBS,missed=Math.max(0,o.total-o.got);boss.fb.revival=null;if(missed&&repeatBehavior(b.fieldBoss))boss.fb.revived=false;
 boss.hp=Math.max(1,Math.round(boss.maxHp*(R.base+R.per*missed)));boss.bossExposed=false;boss.fb.exposedUntil=0;
 this.fbLog(boss,'REVIVED','부활',missed?boss.name+'이(가) 바람 원소 '+missed+'개를 모아 다시 일어섰다':boss.name+'이(가) 바람 원소를 모두 빼앗겨 겨우 일어섰다 · 조금만 회복 · 지금 쓰러뜨리면 끝');};
// ---- the minigame cards ----
P.fbMiniCards=function(a){
 // 0.16.53 (user: 「이제 필드보스랑 일일보스 다인모드 미니게임 가능하게 하고」): in a shared fight the host's protagonist plays them as at home, and a guest's own fighter on its turn plays
 // them too (the result rides its COOP_COMBAT command). A guest fighter the game's AI is playing gets none.
 const b=this.s.runtime,out=[],guestTurn=!!(b?.coop&&a?.coop&&a.control==='GUEST'&&b.coop.turn?.actor===a.id);if(!b||!a||!(a.control==='PLAYER'&&!a.coop||guestTurn))return out;
 const base=b.interlude?'현재 대화를 마쳐 주세요.':b.subduedPending?'마지막 행동을 선택해 주세요.':a.hp<=0?'전투불능 상태입니다.':this.combatActionLocked?.(a)?'행동 불가 상태입니다.':'';
 const self=[{id:a.id,name:a.name,hp:a.hp,maxHp:a.maxHp}];
 if(ctl(b)){const boss=fbBoss(b),R=MINI_RULES;
  const ro=orbsCtl(b)&&orbsOf(boss);if(ro&&boss.hp>0){const left=ro.total-ro.got,Q=R.ANEMO_ORBS;out.push({id:MINI.ORBS,name:'바람 원소 모으기',system:true,mini:{kind:'ANEMO_ORBS',id:ro.id*100+ro.tries,seed:(ro.seed+ro.tries*7919)%1000000,seconds:Q.seconds,orbs:left,maxHits:Q.maxHits},cooldown:0,reason:base,targets:self,
   description:'무적이 된 무상의 바람이 빨아들이기 전에 주위에 흩어진 바람 원소를 줍습니다(1행동). WASD·방향키(휴대폰은 화면의 방향 버튼이나 끌기)로 날아다니며 바람 탄환을 피하고, 기류를 타면 빨라지지만 흐름대로 밀립니다. 탄환이나 본체에 맞은 수만큼 파티 전원이 피해를 입습니다. 한 번에 정해집니다: 줍지 못한 원소는 무상의 바람이 빨아들입니다. 원소 '+left+'개를 다 빼앗으면 조금만 회복하고, 놓친 원소 하나마다 더 회복합니다(모두 놓치면 HP 40%).'});}
  const dodge=b.fieldBoss.dodge;if(dodge?.kind==='ANEMO'&&boss?.hp>0)out.push({id:MINI.DODGE,name:'바람 탄막 피하기',system:true,mini:{kind:'ANEMO_DODGE',id:dodge.id,seed:dodge.seed,seconds:R.ANEMO.seconds,maxHits:R.ANEMO.maxHits,orbs:R.ANEMO.orbs,done:!!dodge.result},cooldown:0,reason:base||(dodge.result?'이미 탄막을 피했습니다 · 결과 '+dodge.result.hits+'발 · 바람 '+dodge.result.orbs+'개':''),targets:self,description:'무상의 바람이 모으는 탄막을 미리 피합니다(주인공 1행동). WASD·방향키(휴대폰은 화면의 방향 버튼이나 끌기)로 움직여 탄환을 피하고 바람 원소를 모으세요. 맞은 수만큼 탄막이 날아올 때 파티 전원이 피해를 입고, 피하지 않으면 '+R.ANEMO.defaultHits+'발을 맞습니다. 모은 바람 원소 하나마다 파티에서 가장 오래 남은 원소폭발 재사용이 1차례 줄어듭니다(최대 '+R.ANEMO.orbs+'개). 핵은 무상의 바람이 공격을 마치면 열립니다.'});
  const fr=fruitOf(boss);if(fr&&boss.hp>0){const rr=boss.fb.revival,Q=R.FROST_FRUIT,left=Math.max(0,rr.need-rr.hits);out.push({id:MINI.FRUIT,name:'서리 열매 치기',system:true,mini:{kind:'FROST_FRUIT',id:fr.id*100+fr.tries,seed:(fr.seed+fr.tries*7919)%1000000,seconds:Q.seconds,need:left,fruits:Q.fruits,shots:Q.shots},cooldown:0,reason:base||(fr.round===b.round?'이번 라운드에 이미 쳤습니다':''),targets:[{id:boss.id,name:boss.name,hp:boss.hp,maxHp:boss.maxHp}],
   description:'얼음 보호막 둘레를 도는 서리 열매를 쳐서 보호막에 맞힙니다(1행동, 라운드마다 한 번). 열매를 누르면(휴대폰은 터치) 보호막을 향해 날아갑니다. 안쪽을 도는 얼음 조각에 부딪히면 깨지니 틈을 노리세요. 칠 수 있는 열매는 '+Q.shots+'번 · 남은 '+left+'번 맞히면 보호막이 깨져 쓰러집니다'+(fr.melted?'':' · 불로 먼저 녹이면 한 번 덜 맞혀도 됩니다')+'.'});}
  const r=boss?.fb?.revival;if(boss?.fb.kind==='CRYO_HYPO'&&r&&!r.fruit&&boss.hp>0)out.push({id:MINI.CHASE,name:'냉기 핵 쫓기',system:true,mini:{kind:'CRYO_CHASE',id:r.chaseId,seed:r.chaseSeed,seconds:R.CRYO.seconds,need:Math.max(0,r.need-(r.hits||0)),hits:r.hits||0},cooldown:0,reason:base,targets:[{id:boss.id,name:boss.name,hp:boss.hp,maxHp:boss.maxHp}],description:'도망치는 냉기 핵을 쫓아 직접 부숩니다(주인공 1행동). 핵은 가까이 가면 달아나고 순간이동합니다. 눌러서(휴대폰은 터치) 맞히고, 얼음 가시를 누르면 잠시 손이 얼어붙습니다. 맞힌 수만큼 핵에 금이 갑니다 · 남은 '+Math.max(0,r.need-(r.hits||0))+'번.'});
 }
 if(twinCtl(b)){const t=b.twinBoss,boss=b.actors.find(x=>x.source===t.boss&&x.hp>0),R=MINI_RULES;
  if(t.crystals&&boss)out.push({id:MINI.SNIPE,name:'부식 결정 저격',system:true,mini:{kind:'DVALIN_SNIPE',id:t.crystals.id,seed:t.crystals.seed,seconds:R.DVALIN.seconds,crystals:R.DVALIN.crystals,shots:R.DVALIN.shots,done:!!t.crystals.result},cooldown:0,reason:base||(t.crystals.result?'이미 결정을 노렸습니다':''),targets:[{id:boss.id,name:boss.name,hp:boss.hp,maxHp:boss.maxHp}],description:'드발린의 몸에서 빛나는 부식 결정을 노려 쏩니다(주인공 1행동). 탄은 '+R.DVALIN.shots+'발, 폭풍이 불 때 쏜 탄은 빗나갑니다. 결정 2개를 맞히면 받는 피해가 늘고, 3개를 모두 맞히면 드발린이 땅에 떨어져 한 차례 움직이지 못합니다.'});
  if(t.dodge&&boss)out.push({id:MINI.DASH,name:'질주 피하기',system:true,mini:{kind:'ANDRIUS_DODGE',id:t.dodge.id,seed:t.dodge.seed,seconds:R.ANDRIUS.seconds,maxHits:R.ANDRIUS.maxHits,orbs:0,done:!!t.dodge.result},cooldown:0,reason:base||(t.dodge.result?'이미 질주를 피했습니다 · '+t.dodge.result.hits+'발':''),targets:self,description:'이번 라운드 끝 안드리우스의 「얼음 발톱 질주」를 미리 피합니다(주인공 1행동). 표시된 길로 늑대가 달려들고 얼음 발톱이 떨어집니다. 맞은 수만큼 파티 전원이 피해를 입고, 피하지 않으면 '+R.ANDRIUS.defaultHits+'발을 맞습니다. 한 발도 맞지 않으면 빗나간 안드리우스가 한 라운드 빈틈을 보입니다.'});
 }
 if(dailyCtl(b)){const d=b.dailyDodge,L=LIYUE_DAILY[d.boss],R=MINI_RULES[L.rules],boss=b.actors.find(x=>x.source===d.boss&&x.hp>0);
  const st=d.dodge&&dailyStage(b,L,boss,d.dodge);if(d.dodge&&boss)out.push({id:L.card,name:st.name,system:true,mini:{kind:L.kind,id:d.dodge.id,seed:d.dodge.seed,seconds:R.seconds,maxHits:R.maxHits,orbs:0,done:!!d.dodge.result,...(st.n?{phase:st.n}:{})},cooldown:0,reason:base||(d.dodge.result?'이미 피할 준비를 했습니다 · '+d.dodge.result.hits+'발':''),targets:self,
   description:'이번 라운드 끝 '+boss.name+'의 「'+st.label+'」을(를) 미리 피합니다(주인공 1행동). '+st.how+' 맞은 수만큼 파티 전원이 피해를 입고, 피하지 않으면 '+R.defaultHits+'발을 맞습니다. 한 발도 맞지 않으면 한 라운드 빈틈을 보입니다.'});
 }
 return out;
};
P.combatCards=function(owner,...rest){const cards=ctlOld.combatCards.call(this,owner,...rest),b=this.s.runtime;if(!b||!Array.isArray(cards)||!(ctl(b)||twinCtl(b)||dailyCtl(b)))return cards;
 const a=this.combatActor(owner||'PLAYER_CUSTOM');const mini=this.fbMiniCards(a);return mini.length?[...cards,...mini]:cards;};
P.apply=function(a){if(a?.type!=='COMBAT'||!a.mini)return ctlOld.apply.call(this,a);const prior=this._fbMini;this._fbMini=a.mini;try{return ctlOld.apply.call(this,a);}finally{this._fbMini=prior;}};
P.combatAction=function(card,...rest){const b=this.s.runtime;
 // Any action the protagonist takes after the barrage is announced counts as the turn it had to brace.
 if(ctl(b)&&b.fieldBoss.dodge&&b.phase==='WAIT_PLAYER')b.fieldBoss.dodge.playerActed=true;
 if(!ctl(b))return ctlOld.combatAction.call(this,card,...rest);
 const prior=this._fbPlayerLed;this._fbPlayerLed=true;try{return ctlOld.combatAction.call(this,card,...rest);}finally{this._fbPlayerLed=prior;}};
P.autoUntilPlayer=function(...args){if(!this._fbPlayerLed)return ctlOld.autoUntilPlayer.apply(this,args);this._fbPlayerLed=false;try{return ctlOld.autoUntilPlayer.apply(this,args);}finally{this._fbPlayerLed=true;}};
P.executeCombatSystem=function(a,id,target){
 if(!Object.values(MINI).includes(id))return ctlOld.executeCombatSystem.call(this,a,id,target);
 const b=this.s.runtime,entry=this.fbMiniCards(a).find(c=>c.id===id);if(!entry||entry.reason)fail('FB_MINI',entry?.reason||'지금은 쓸 수 없는 행동입니다.');
 const m=this._fbMini&&typeof this._fbMini==='object'?this._fbMini:{},same=m.kind===entry.mini.kind&&Number(m.id)===entry.mini.id;
 const log=(card,text)=>b.log.push({actor:a.name,actorId:a.id,card,cardName:entry.name,round:b.round,actionSequence:b.actionSequence,text,sourceKind:'BOSS_ARENA',fbMini:entry.mini.kind});
 if(id===MINI.ORBS){const boss=fbBoss(b),o=orbsOf(boss),Q=MINI_RULES.ANEMO_ORBS,left=o.total-o.got,taken=same?clampInt(m.orbs,0,left):0,hits=same?clampInt(m.hits,0,Q.maxHits):Q.defaultHits;
  // What was not taken, the cube gathered (원작: the orbs left in the air heal it): one try settles the revival.
  // 원작: an orb taken does not come back at its next revival (orbsTaken counts them over the fight).
  o.got+=taken;o.tries++;b.fieldBoss.orbsTaken=Math.min(MINI_RULES.ANEMO_ORBS.orbs,(b.fieldBoss.orbsTaken||0)+taken);
  log(id,'바람 원소 '+taken+'개를 빼앗았다 · '+o.got+'/'+o.total+(hits?' · 회오리 '+hits+'번 맞음':' · 한 번도 안 맞음'));
  if(hits>0)for(const t of rowOf(b,'ALL'))this.fbHit(boss,t,Q.k*hits,'바람',{move:'ORBS',aoe:true});
  if(boss.fb.revival)this.fbRevivalExpired(b,boss);
  return;}
 if(id===MINI.DODGE||id===MINI.DASH){const R=id===MINI.DODGE?MINI_RULES.ANEMO:MINI_RULES.ANDRIUS,hits=same?clampInt(m.hits,0,R.maxHits):R.defaultHits,orbs=id===MINI.DODGE&&same?clampInt(m.orbs,0,R.orbs):0;
  const dodge=id===MINI.DODGE?b.fieldBoss.dodge:b.twinBoss.dodge;dodge.result={hits,orbs};
  log(id,(id===MINI.DODGE?'탄막 속으로 · ':'질주를 피할 준비 · ')+hits+'발 맞음'+(id===MINI.DODGE?' · 바람 원소 '+orbs+'개':''));
  // The barrage the protagonist ran through is the one the boss gathered: it lands now and the core opens.
  if(id===MINI.DODGE){const boss=fbBoss(b);if(boss?.fb.next==='BARRAGE'){boss.fb.next=null;b.fieldBoss.telegraph=null;this.fbBarrage(boss);boss.fb.coreOpen=true;}}
  return;}
 if(id===MINI.FRUIT){const boss=fbBoss(b),rr=boss.fb.revival,fr=rr.fruit,hits=same?clampInt(m.hits,0,Math.max(0,rr.need-rr.hits)):0;fr.tries++;fr.round=b.round;
  log(id,hits?'서리 열매 '+hits+'개가 얼음 보호막에 맞았다':'서리 열매가 모두 얼음 조각에 막혔다');for(let i=0;i<hits&&boss.fb.revival;i++)this.fbHitCryoCore(boss);return;}
 if(id===MINI.CHASE){const boss=fbBoss(b),hits=same?clampInt(m.hits,0,MINI_RULES.CRYO.max):0;
  log(id,hits?'도망치는 냉기 핵을 '+hits+'번 붙잡았다':'냉기 핵을 놓쳤다');for(let i=0;i<hits&&boss.fb.revival;i++)this.fbHitCryoCore(boss);return;}
 if(id===MINI.SNIPE){const t=b.twinBoss,boss=b.actors.find(x=>x.source===t.boss&&x.hp>0),hits=same?clampInt(m.hits,0,MINI_RULES.DVALIN.crystals):0;t.crystals.result={hits};
  log(id,hits?'부식 결정 '+hits+'개 명중':'결정을 맞히지 못했다');
  if(hits>=2){t.exposedUntil=b.round+1;b.log.push({target:boss.name,targetId:boss.id,text:boss.name+' · 부식 결정이 깨져 받는 피해 증가 (다음 라운드까지)',round:b.round});}
  if(hits>=MINI_RULES.DVALIN.crystals){t.downUntil=b.round+1;t.stun=1;if(t.wasAirborne===undefined)t.wasAirborne=!!boss.airborne;boss.airborne=false;b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_DOWNED',cardName:'추락',text:boss.name+'이(가) 결정이 깨져 땅으로 떨어졌다 · 한 차례 행동 불능 · 근접 공격도 닿는다',round:b.round});}
  return;}
 if(id===MINI.TIDE||id===MINI.QUAKE){const d=b.dailyDodge,R=MINI_RULES[LIYUE_DAILY[d.boss].rules],hits=same?clampInt(m.hits,0,R.maxHits):R.defaultHits;d.dodge.result={hits};log(id,'피할 준비 · '+hits+'발 맞음');return;}
};
P.combatDamageMultiplier=function(a,t,e,o={}){let n=ctlOld.combatDamageMultiplier.call(this,a,t,e,o);const b=this.s.runtime;
 // An open Anemo core is the exposed core (+50%, as every 핵 노출), not stacked on a 핵 노출 that is already running.
 if(ctl(b)&&a?.side==='ALLY'&&t?.fb?.kind==='ANEMO'&&t.fb.coreOpen&&!t.fb.revival&&!(t.fb.exposedUntil>=b.round))n*=1.5;if(twinCtl(b)&&t?.source===b.twinBoss.boss&&b.twinBoss.exposedUntil>=b.round&&a?.side==='ALLY')n*=1.5;if(dailyCtl(b)&&t?.source===b.dailyDodge.boss&&b.dailyDodge.exposedUntil>=b.round&&a?.side==='ALLY')n*=1.5;return n;};
// ---- 타르탈리아 · 야타용왕 (Liyue daily challenges) ----
P.newRound=function(...args){const b=this.s.runtime;
 if(dailyCtl(b)&&b.opening?.state!=='PENDING'&&b.round%3===2){const d=b.dailyDodge,L=LIYUE_DAILY[d.boss],boss=b.actors.find(a=>a.source===d.boss&&a.hp>0);
  if(boss&&!d.dodge){const st=dailyStage(b,L,boss,null);d.dodge={id:(d.seq=(d.seq||0)+1),seed:miniSeed(this,b,L.kind),round:b.round,result:null,...(st.n?{stage:st.n}:{})};b.log.push({actor:boss.name,actorId:boss.id,card:'DAILY_DODGE_READY',cardName:st.label+' 준비',text:boss.name+'이(가) '+st.ready+' · 이번 라운드 끝 「'+st.label+'」 · 「'+st.name+'」',round:b.round});}}
 return ctlOld.newRound.apply(this,args);};
P.roundEnd=function(...args){const b=this.s.runtime;
 if(dailyCtl(b)&&b.dailyDodge.dodge&&b.dailyDodge.dodge.round===b.round){const d=b.dailyDodge,L=LIYUE_DAILY[d.boss],R=MINI_RULES[L.rules],res=d.dodge.result,hits=res?res.hits:R.defaultHits,boss=b.actors.find(a=>a.source===d.boss&&a.hp>0),st=dailyStage(b,L,boss,d.dodge);d.dodge=null;
  if(boss&&b.actors.some(a=>a.side==='ALLY'&&a.hp>0)){b.log.push({actor:boss.name,actorId:boss.id,card:'DAILY_DODGE',cardName:st.label,text:boss.name+'의 '+st.label+' · '+hits+'발 적중',round:b.round});
   // what lands carries the element of the phase he is in when it lands (as before 0.16.54); the name is the one he announced
   if(hits>0){const el=L.element(boss);for(const x of rowOf(b,'ALL'))this.damage(boss,x,R.k*hits,el,{range:'전장',card:'DAILY_DODGE',aoe:true});}
   else{d.exposedUntil=b.round+1;b.log.push({target:boss.name,targetId:boss.id,text:st.label+'을(를) 모두 피했다 · '+boss.name+' 빈틈 (다음 라운드 받는 피해 증가)',round:b.round});}}}
 return ctlOld.roundEnd.apply(this,args);};
// ---- 드발린 · 안드리우스 (daily bosses) ----
P.twinBossRound=function(b,end){
 const out=ctlOld.twinBossRound.call(this,b,end);if(!twinCtl(b))return out;const t=b.twinBoss,boss=b.actors.find(a=>a.source===t.boss&&a.hp>0);if(!boss)return out;const g=TWIN[t.boss].gimmicks;
 if(!end){
  if(t.downUntil&&b.round>t.downUntil){t.downUntil=0;if(t.wasAirborne)boss.airborne=true;delete t.wasAirborne;b.log.push({actor:boss.name,actorId:boss.id,text:boss.name+'이(가) 다시 날아올랐다',round:b.round});}
  if(t.boss==='BOSS_DVALIN'&&b.round%3===0){t.crystals={id:(t.miniSeq=(t.miniSeq||0)+1),seed:miniSeed(this,b,'SNIPE'),round:b.round,result:null};if(!t.seen.includes('CRYSTALS'))t.seen.push('CRYSTALS');b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_CRYSTALS',cardName:g.CRYSTALS.label,text:boss.name+'의 몸에서 부식 결정이 빛난다 · 이번 라운드에 「부식 결정 저격」',round:b.round});}
  if(t.boss==='BOSS_ANDRIUS'&&b.round%3===2){t.dodge={id:(t.miniSeq=(t.miniSeq||0)+1),seed:miniSeed(this,b,'DASH'),round:b.round,result:null};if(!t.seen.includes('DASH'))t.seen.push('DASH');b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_DASH_READY',cardName:g.DASH.label+' 준비',text:boss.name+'이(가) 몸을 낮춘다 · 이번 라운드 끝에 전장을 휘젓는 질주 · 「질주 피하기」',round:b.round});}
  return out;}
 if(t.crystals&&t.crystals.round===b.round)t.crystals=null;
 if(t.dodge&&t.dodge.round===b.round){const R=MINI_RULES.ANDRIUS,res=t.dodge.result,hits=res?res.hits:R.defaultHits;t.dodge=null;
  b.log.push({actor:boss.name,actorId:boss.id,card:'TWIN_DASH',cardName:g.DASH.label,text:boss.name+'의 얼음 발톱 질주 · '+hits+'발 적중',round:b.round});
  if(hits>0)for(const x of rowOf(b,'ALL'))this.damage(boss,x,R.k*hits,'얼음',{range:'전장',card:'TWIN_DASH',aoe:true});
  else{t.exposedUntil=b.round+1;b.log.push({target:boss.name,targetId:boss.id,text:'질주가 모두 빗나갔다 · '+boss.name+' 빈틈 (다음 라운드 받는 피해 증가)',round:b.round});}}
 return out;
};
P.fieldBossView=function(){const v=ctlOld.fieldBossView.call(this),b=this.s.runtime;if(!v)return v;
 if(ctl(b)&&fruitOf(fbBoss(b))){const boss=fbBoss(b),r=boss.fb.revival;v.state=(v.state||[]).filter(x=>!/냉기 핵/.test(x));v.state.unshift('얼음 보호막 · 서리 열매 '+r.hits+'/'+r.need+' · '+r.rounds+'라운드 안에 「서리 열매 치기」'+(r.fruit.melted?' · 불로 녹음':''));}
 if(ctl(b)){const boss=fbBoss(b),o=orbsOf(boss);if(o){v.state=(v.state||[]).filter(x=>!/남은 핵/.test(x));v.state.unshift('무적 · 바람 원소 '+o.got+'/'+o.total+' 빼앗음 · '+boss.fb.revival.rounds+'라운드 안에 「바람 원소 모으기」');}if(boss?.fb.kind==='ANEMO'&&!boss.fb.revival)v.state.unshift(this.fbCoreShut(boss)?'핵 닫힘 · 공격이 통하지 않음':'핵 노출 · 받는 피해 +50% · 다음 준비 동작까지');const dg=b.fieldBoss.dodge;if(dg)v.state.unshift(dg.result?'바람 탄막 · 피하기 '+dg.result.hits+'발 · 바람 '+dg.result.orbs+'개':'바람 탄막이 온다 · 「바람 탄막 피하기」');v.control=1;}
 if(twinCtl(b)){const t=b.twinBoss;v.state=v.state||[];if(t.crystals)v.state.unshift('부식 결정이 빛난다 · 「부식 결정 저격」');if(t.dodge)v.state.unshift(t.dodge.result?'질주 피하기 '+t.dodge.result.hits+'발':'얼음 발톱 질주가 온다 · 「질주 피하기」');if(t.downUntil)v.state.unshift('추락 · 근접 공격도 닿음');v.control=1;}
 return v;};
P.validateSave=function(s){const out=ctlOld.validateSave.call(this,s)||s,b=out?.runtime;
 const bad=()=>fail('FIELD_BOSS_SAVE','보스 조작 전투 기록이 올바르지 않습니다.'),plainResult=(r,max)=>r===null||(r&&typeof r==='object'&&Number.isInteger(r.hits)&&r.hits>=0&&r.hits<=max&&(r.orbs===undefined||Number.isInteger(r.orbs)&&r.orbs>=0&&r.orbs<=MINI_RULES.ANEMO.orbs));
 if(b?.bossPass!==undefined&&b.bossPass!==1)bad();
 if(b?.fieldBoss?.controlRevision!==undefined){const f=b.fieldBoss;if(f.controlRevision!==1)bad();
  const fb=(b.actors||[]).find(x=>x.fb&&x.source===f.boss),fr=fb?.fb?.revival?.fruit;if(fr!==undefined&&(b.bossPass!==1||BOSSES[f.boss]?.kind!=='CRYO_HYPO'||!fr||!Number.isSafeInteger(fr.id)||!Number.isInteger(fr.tries)||fr.tries<0||typeof fr.melted!=='boolean'||!Number.isSafeInteger(fr.round)))bad();if(f.anemoOrbs!==undefined&&(f.anemoOrbs!==1||BOSSES[f.boss]?.kind!=='ANEMO'))bad();if(f.orbsTaken!==undefined&&!(f.anemoOrbs===1&&Number.isInteger(f.orbsTaken)&&f.orbsTaken>=0&&f.orbsTaken<=MINI_RULES.ANEMO_ORBS.orbs))bad();
  const ob=(b.actors||[]).find(x=>x.fb&&x.source===f.boss),o=ob?.fb?.revival?.orbs;if(o!==undefined&&(f.anemoOrbs!==1||!o||!Number.isSafeInteger(o.id)||!Number.isInteger(o.total)||o.total<1||o.total>MINI_RULES.ANEMO_ORBS.orbs||!Number.isInteger(o.got)||o.got<0||o.got>o.total||!Number.isInteger(o.tries)||o.tries<0))bad();if(f.dodge&&(f.dodge.kind!=='ANEMO'||!Number.isSafeInteger(f.dodge.id)||!plainResult(f.dodge.result,MINI_RULES.ANEMO.maxHits)))bad();}
 if(b?.twinBoss?.controlRevision!==undefined){const t=b.twinBoss;if(t.controlRevision!==1)bad();if(t.dodge&&(!Number.isSafeInteger(t.dodge.id)||!plainResult(t.dodge.result,MINI_RULES.ANDRIUS.maxHits)))bad();if(t.crystals&&(!Number.isSafeInteger(t.crystals.id)||!(t.crystals.result===null||Number.isInteger(t.crystals.result?.hits)&&t.crystals.result.hits>=0&&t.crystals.result.hits<=MINI_RULES.DVALIN.crystals)))bad();if(t.stun!==undefined&&!(Number.isInteger(t.stun)&&t.stun>=0&&t.stun<=1))bad();}
 if(b?.dailyDodge!==undefined){const d=b.dailyDodge;if(!d||d.controlRevision!==1||!LIYUE_DAILY[d.boss]||!Number.isSafeInteger(d.exposedUntil))bad();if(d.dodge&&(d.dodge.stage!==undefined&&!(b.bossPass===1&&[1,2,3].includes(d.dodge.stage))||!Number.isSafeInteger(d.dodge.id)||!Number.isSafeInteger(d.dodge.round)||!plainResult(d.dodge.result,MINI_RULES[LIYUE_DAILY[d.boss].rules].maxHits)))bad();}
 return out;};
api.fieldBossControl={version:1,anemoOrbs:1,bossPass:1,cards:copy(MINI),rules:copy(MINI_RULES),anemoRotation:ANEMO_ROTATION.slice(),liyueDaily:Object.fromEntries(Object.entries(LIYUE_DAILY).map(([id,L])=>[id,{origin:L.origin,kind:L.kind,card:L.card,label:L.label,name:L.name}]))};
// ---- 0.16.54 boss pass (bossPass 1) — 원작 fights in turns ----
// 무상의 뇌전·바위: what is left standing when the revival runs out heals it (1 · 2 · 3 left: 15 · 35 · 50%); breaking all fells it.
// 프리즘 take any element but 번개 (physical slides off); 현암 기둥 are chipped by anything (바위·파쇄 fastest).
// 얼음·폭염 나무: every blow wears the shell (the right element far faster); it grows back on the corolla at half, and a corolla
// left whole for three rounds brings down 얼음비 / 불꽃 폭탄 on the party.
// 고대 바위 용 도마뱀: its scales take 30% off instead of stopping every blow; a reflected 원암 분사 also cuts its HP.
// 유적의 뱀: the armour takes 70% off physical and 40% off elemental blows instead of stopping them; after its charge four weak
// points glow (「약점 저격」): two open the armour, all four fell it for a turn.
// 물의 정령: its flood wave comes once a round, not with each of its two actions.
const passOld=Object.fromEntries(['fieldBossBarrierReason','combatDamageMultiplier','fbRevivalExpired','newRound','roundEnd','fbMove','fbMiniCards','executeCombatSystem','fieldBossView','validateSave'].map(k=>[k,P[k]]));
const SURVIVOR_HEAL=[0,.15,.35,.5],VINES=new Set(['CRYO_VINE','PYRO_VINE']);
const hasShell=t=>(t?.shields||[]).some(x=>x.source==='FB_SHELL'&&x.value>0);
P.fieldBossBarrierReason=function(a,t,element,range){const b=this.s.runtime;
 if(pass(b)&&a?.side==='ALLY'&&t){const e=ko(element),fb=t.fb;
  if(t.fbSummon?.kind==='FB_SUMMON_PRISM'&&!b.actors.find(x=>x.id===t.fbSummon.owner)?.fb?.revival)return e==='번개'?'번개는 프리즘에 흡수된다.':e==='물리'?'프리즘이 물리 공격을 흘려냈다 · 원소 공격이 필요하다.':'';
  if(t.fbSummon?.kind==='FB_SUMMON_PILLAR')return '';
  if(fb&&VINES.has(fb.kind)&&hasShell(t))return '';
  if(fb?.kind==='PRIMO')return '';
  if(fb?.kind==='SERPENT'){if(!fb.armorOpened&&fb.exposedUntil>=b.round&&(tv(a,'ARMOR_BREAK')>=25||tv(a,'WEAK_POINT')>=20)){fb.armorOpened=true;b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,text:t.name+'의 갑주가 열렸다 · 다음 잠행까지',round:b.round});}return '';}
 }
 return passOld.fieldBossBarrierReason.call(this,a,t,element,range);};
const ANDRIUS_SPREAD=new Set(['ECARD_ANDRIUS_SWEEP','ECARD_ANDRIUS_LEAP','ECARD_ANDRIUS_ROAR','ECARD_ANDRIUS_WIND_BLADE','ECARD_ANDRIUS_PHASE3','ECARD_ANDRIUS_RUN_PHASE']);
P.combatDamageMultiplier=function(a,t,e,o={}){let n=passOld.combatDamageMultiplier.call(this,a,t,e,o);const b=this.s.runtime;
 // 사냥 표식 says 「주는 단일 피해 +30%」: his blows that reach several (sweep, leap, roar, wind blades, storm, run) do not get it.
 if(pass(b)&&b.twinBoss?.mark&&a?.source===b.twinBoss.boss&&t?.id===b.twinBoss.mark&&!o.aoe&&!o.sourceKind&&ANDRIUS_SPREAD.has(String(o.card||'')))n/=1.3;
 if(pass(b)&&a?.side==='ALLY'&&t){const el=ko(e);
  if(t.fbSummon?.kind==='FB_SUMMON_PILLAR'&&el!=='바위'&&!(tv(a,'ARMOR_BREAK')>=25))n*=.4;
  if(t.fb?.kind==='SERPENT'&&!t.fb.armorOpened)n*=el==='물리'?.3:.6;
  if(t.fb?.kind==='PRIMO'&&!(t.fb.exposedUntil>=b.round))n*=.7;
 }
 return n;};
P.fbRevivalExpired=function(b,boss,...rest){const k=boss?.fb?.kind;
 if(!(pass(b)&&(k==='ELECTRO'||k==='GEO_HYPO')&&boss.fb.revival))return passOld.fbRevivalExpired.call(this,b,boss,...rest);
 const kind=k==='ELECTRO'?'FB_SUMMON_PRISM':'FB_SUMMON_PILLAR',left=b.actors.filter(x=>x.fbSummon?.owner===boss.id&&x.fbSummon.kind===kind&&x.hp>0).length,before=boss.maxHp,out=passOld.fbRevivalExpired.call(this,b,boss,...rest);
 if(boss.hp>0&&boss.maxHp===before){boss.hp=Math.max(1,Math.round(boss.maxHp*SURVIVOR_HEAL[Math.min(3,Math.max(1,left))]));b.log.push({target:boss.name,targetId:boss.id,text:'남은 '+(k==='ELECTRO'?'프리즘':'현암 기둥')+' '+left+'개를 흡수했다',round:b.round});}
 return out;};
P.fbMove=function(a,move,...rest){const b=this.s.runtime,f=a?.fb;
 if(pass(b)&&f?.kind==='SERPENT'){this.fieldBossSeen(b,'ARMOR');if(move==='CHARGE'){this.fieldBossSeen(b,'SNIPE');f.chargeSeq=(f.chargeSeq||0)+1;}}if(pass(b)&&f?.kind==='PRIMO')this.fieldBossSeen(b,'SCALES');
 // laid down by 「약점 저격」, it cannot burrow (and close its armour) before the next round is out
 if(pass(b)&&f?.kind==='SERPENT'&&move==='BURROW'&&f.noBurrowUntil>=b.round){this.fbLog(a,'DOWNED','약점 붕괴',a.name+'이(가) 쓰러진 채라 땅속으로 들어가지 못한다');return;}
 if(pass(b)&&f?.kind==='OCEANID'&&move==='WAVE'){if(f.waveRound===b.round)move='SPOUT';else f.waveRound=b.round;}
 const at=b?.log.length||0,out=passOld.fbMove.call(this,a,move,...rest);
 // a reflected 원암 분사 cuts through its scales: a tenth of its own (old-size) max HP
 if(pass(b)&&f?.kind==='PRIMO'&&move==='BEAM'&&b.log.slice(at).some(l=>/BEAM_REFLECT/.test(String(l.card||''))&&a.hp>0)){const cut=Math.min(a.hp-1,Math.round(a.maxHp/(b.bossLength?.hp||1)*.1));if(cut>0){a.hp-=cut;b.log.push({target:a.name,targetId:a.id,damage:cut,text:'튕겨 나간 원암 분사가 비늘을 깎았다 · '+cut,round:b.round});}}
 return out;};
P.newRound=function(...args){const b=this.s.runtime,boss=pass(b)&&fbBoss(b),had=boss&&VINES.has(boss.fb.kind)&&hasShell(boss);
 const out=passOld.newRound.apply(this,args);
 // the shell that grows back alternates: the corolla (half) after the root, the root after the corolla
 if(boss&&this.s.runtime===b&&VINES.has(boss.fb.kind)&&!had&&hasShell(boss)&&boss.fb.shieldBreaks>0){const f=boss.fb;f.corolla=!f.corolla;
  if(f.corolla){for(const x of boss.shields.filter(x=>x.source==='FB_SHELL')){x.value=Math.round(x.value/2);if(x.initialValue)x.initialValue=Math.round(x.initialValue/2);}f.corollaDue=b.round+3;this.fieldBossSeen(b,'COROLLA');
   this.fbLog(boss,'COROLLA','꽃봉오리 결정막',boss.name+'의 결정막이 꽃봉오리에 자랐다 · 3라운드 안에 깨지 못하면 '+(f.kind==='CRYO_VINE'?'얼음비':'불꽃 폭탄'));}
  else delete f.corollaDue;}
 return out;};
P.roundEnd=function(...args){const b=this.s.runtime,boss=pass(b)&&fbBoss(b);
 if(boss&&boss.hp>0&&VINES.has(boss.fb.kind)&&boss.fb.corolla&&hasShell(boss)&&b.round>=boss.fb.corollaDue&&b.actors.some(x=>x.side==='ALLY'&&x.hp>0)){
  const f=boss.fb,cryo=f.kind==='CRYO_VINE';f.corollaDue=b.round+3;this.fbLog(boss,'COROLLA_RAIN',cryo?'얼음비':'불꽃 폭탄',cryo?'꽃봉오리가 얼음비를 쏟았다':'꽃봉오리의 불꽃 폭탄이 터졌다');
  for(const x of rowOf(b,'ALL'))this.fbHit(boss,x,1.25,cryo?'얼음':'불',{move:'COROLLA',aoe:true});this.addHazard({id:'FB_COROLLA_'+b.round,kind:cryo?'FROST':'FIRE',power:.05,rounds:2,targets:'ALL',source:boss.id});}
 return passOld.roundEnd.apply(this,args);};
// 「약점 저격」: while its head shows after the charge, once per opening
P.fbMiniCards=function(a){const out=passOld.fbMiniCards.call(this,a),b=this.s.runtime;if(!pass(b)||!ctl(b))return out;const boss=fbBoss(b);
 if(boss?.fb.kind==='SERPENT'&&boss.hp>0&&boss.fb.chargeSeq&&boss.fb.exposedUntil>=b.round&&!boss.fb.burrowed&&out!==undefined){const guestTurn=!!(b?.coop&&a?.coop&&a.control==='GUEST'&&b.coop.turn?.actor===a.id);if(!a||!(a.control==='PLAYER'&&!a.coop||guestTurn))return out;
  const Q=MINI_RULES.SERPENT_SNIPE,f=boss.fb,id=(f.snipeSeq||0)+1,base=b.interlude?'현재 대화를 마쳐 주세요.':a.hp<=0?'전투불능 상태입니다.':this.combatActionLocked?.(a)?'행동 불가 상태입니다.':'';
  out.push({id:MINI.SERPENT,name:'약점 저격',system:true,mini:{kind:'SERPENT_SNIPE',id,seed:miniSeed(this,b,'SERPENT'+id),seconds:Q.seconds,points:Q.points,shots:Q.shots},cooldown:0,reason:base||(f.snipeCharge===f.chargeSeq?'이번 돌진 뒤에는 이미 노렸습니다':''),targets:[{id:boss.id,name:boss.name,hp:boss.hp,maxHp:boss.maxHp}],
   description:'돌진 뒤 드러난 유적의 뱀 몸 마디에 빛나는 약점 '+Q.points+'곳을 노려 쏩니다(1행동). 몸은 계속 꿈틀대고, 모래가 솟구치는 동안은 보이지 않습니다. 탄은 '+Q.shots+'발 · '+Q.open+'곳 이상 맞히면 갑주가 열리고(다음 잠행까지), '+Q.points+'곳을 모두 맞히면 쓰러져 한 차례 움직이지 못하고 2라운드 동안 핵 노출.'});}
 return out;};
P.executeCombatSystem=function(a,id,target){if(id!==MINI.SERPENT)return passOld.executeCombatSystem.call(this,a,id,target);
 const b=this.s.runtime,entry=this.fbMiniCards(a).find(c=>c.id===id);if(!entry||entry.reason)fail('FB_MINI',entry?.reason||'지금은 쓸 수 없는 행동입니다.');
 const m=this._fbMini&&typeof this._fbMini==='object'?this._fbMini:{},same=m.kind==='SERPENT_SNIPE'&&Number(m.id)===entry.mini.id,Q=MINI_RULES.SERPENT_SNIPE,hits=same?clampInt(m.hits,0,Q.points):0,boss=fbBoss(b),f=boss.fb;
 f.snipeSeq=entry.mini.id;f.snipeCharge=f.chargeSeq;
 b.log.push({actor:a.name,actorId:a.id,card:id,cardName:entry.name,round:b.round,actionSequence:b.actionSequence,text:hits?'약점 '+hits+'곳 명중':'약점을 맞히지 못했다',sourceKind:'BOSS_ARENA',fbMini:'SERPENT_SNIPE'});
 if(hits>=Q.open&&!f.armorOpened){f.armorOpened=true;b.log.push({target:boss.name,targetId:boss.id,text:boss.name+'의 갑주가 열렸다 · 다음 잠행까지',round:b.round});}
 if(hits>=Q.points){f.stunned=true;f.noBurrowUntil=b.round+1;this.fbExpose(boss,2,true);this.fbLog(boss,'SNIPE_DOWN','약점 붕괴',boss.name+'이(가) 약점 네 곳이 깨져 쓰러졌다 · 한 차례 행동 불능 · 핵 노출 2라운드');}};
P.fieldBossView=function(){const v=passOld.fieldBossView.call(this),b=this.s.runtime;if(!v||!pass(b))return v;const boss=fbBoss(b);if(!boss)return v;const f=boss.fb;v.state=v.state||[];
 if(f.kind==='SERPENT')v.state.unshift(f.armorOpened?'갑주 열림 · 다음 잠행까지':'갑주 닫힘 · 물리 피해 70%·원소 피해 40% 감소'+(f.exposedUntil>=b.round&&!f.burrowed?' · 약점이 빛난다 「약점 저격」':''));
 if(f.kind==='PRIMO'&&!(f.exposedUntil>=b.round))v.state.unshift('단단한 비늘 · 받는 피해 30% 감소');
 if(VINES.has(f.kind)&&f.corolla&&hasShell(boss))v.state.unshift('꽃봉오리 결정막 · '+Math.max(0,f.corollaDue-b.round)+'라운드 뒤 '+(f.kind==='CRYO_VINE'?'얼음비':'불꽃 폭탄'));
 v.state=v.state.map(x=>x.replace('전원 최대 HP 12%','전원 최대 HP '+Math.round(12*(b.bossLength?.atk||1)*10)/10+'%'));
 return v;};
P.validateSave=function(s){const out=passOld.validateSave.call(this,s)||s,b=out?.runtime;
 if(b?.bossPass===1){const boss=(b.actors||[]).find(x=>x.fb&&x.source===b.fieldBoss?.boss),f=boss?.fb,bad=()=>fail('FIELD_BOSS_SAVE','보스 조작 전투 기록이 올바르지 않습니다.');
  if(f&&(f.corolla!==undefined&&typeof f.corolla!=='boolean'||f.corollaDue!==undefined&&!Number.isSafeInteger(f.corollaDue)||f.snipeSeq!==undefined&&!Number.isSafeInteger(f.snipeSeq)||f.chargeSeq!==undefined&&!Number.isSafeInteger(f.chargeSeq)||f.snipeCharge!==undefined&&!Number.isSafeInteger(f.snipeCharge)||f.noBurrowUntil!==undefined&&!Number.isSafeInteger(f.noBurrowUntil)||f.waveRound!==undefined&&!Number.isSafeInteger(f.waveRound)))bad();}
 return out;};
// 0.16.57 (user: 「무상의 뇌전같은 다른 무상 애들은 왜 핵 닫히는게 없노?」): as in the original, every 무상 keeps its core shut in the cube
// — 무상의 뇌전·바위·얼음 as 무상의 바람 already did. A new fight (coreRevision 1) starts shut; the core shows once the boss has struck and shuts
// again while it winds up a big attack (뇌전 폭풍 · 현암 융기 · 냉기 폭발) or until its first attack; the protagonist's exposing skill or a stun
// opens it as before. A shut core opens by itself after the following round, so a boss held back by the party (frozen, slowed) never
// keeps it shut. Only the shell is shut: prisms, pillars and the revival keep their own rules.
const CORE_KINDS=new Set(['ELECTRO','GEO_HYPO','CRYO_HYPO']),coreHypo=(b,f)=>!!f&&CORE_KINDS.has(f.kind)&&b?.fieldBoss?.coreRevision===1&&b.fieldBoss.controlRevision===1&&b.bossPass===1;
const coreOld=Object.fromEntries(['startBattle','fieldBossTurn','fbCoreShut','fieldBossBarrierReason','fieldBossView','validateSave','fbMove'].map(k=>[k,P[k]]));
// 무상의 얼음's 얼음 벽 (a 20% shield of this game's own, raised every second round) stood on top of the shut core and outlasted 4★ parties
// (760-round stalls measured). In a core fight it is the cube closing its shell over the core instead: shut until its next attack, no shield.
P.fbMove=function(a,move,...rest){const b=this.s.runtime,f=a?.fb;if(move==='WALL'&&coreHypo(b,f)){this.fieldBossSeen(b,'WALL');f.wallShut=true;f.coreOpen=false;f.coreShutRound=b.round;this.fbLog(a,'WALL','얼음 껍질',a.name+'이(가) 핵을 얼음 껍질로 덮었다 · 다음 공격까지 핵이 닫혀 있다');return;}return coreOld.fbMove.call(this,a,move,...rest);};
P.startBattle=function(...args){const before=this.s.runtime,out=coreOld.startBattle.apply(this,args),b=this.s.runtime;if(b&&b!==before&&b.fieldBoss?.controlRevision===1&&b.fieldBoss.coreRevision===undefined&&CORE_KINDS.has(BOSSES[b.fieldBoss.boss]?.kind)){b.fieldBoss.coreRevision=1;const boss=fbBoss(b);if(boss)boss.fb.coreShutRound=b.round||1;}return out;};
P.fbCoreShut=function(t){const b=this.s.runtime,f=t?.fb;if(coreHypo(b,f))return t.hp>0&&!f.revival&&!f.coreOpen&&!(f.exposedUntil>=b.round)&&!f.stunned&&b.round<=(f.coreShutRound??b.round)+1;return coreOld.fbCoreShut.call(this,t);};
P.fieldBossTurn=function(a,...rest){const b0=this.s.runtime,f0=a?.fb;if(coreHypo(b0,f0)&&f0.endTurn!==b0.round+':'+(a.turns||0))delete f0.wallShut;const out=coreOld.fieldBossTurn.call(this,a,...rest),b=this.s.runtime,f=a?.fb;
 if(coreHypo(b,f)&&a.hp>0&&!f.revival){const open=!f.next&&!f.wallShut;if(open)delete f.coreShutRound;else if(f.coreOpen!==false||f.coreShutRound===undefined)f.coreShutRound=b.round;if(!open)this.fieldBossSeen(b,'SHUT');if(open!==!!f.coreOpen){f.coreOpen=open;b.log.push({actor:a.name,actorId:a.id,round:b.round,fieldBoss:true,text:open?a.name+'의 핵이 드러났다 · 공격이 통한다':a.name+'이(가) 큰 공격을 준비한다 · 핵이 닫혔다 · 공격이 통하지 않는다'});}}
 return out;};
P.fieldBossBarrierReason=function(a,t,...rest){const b=this.s.runtime;if(a?.side==='ALLY'&&t&&coreHypo(b,t.fb)&&this.fbCoreShut(t))return '핵이 닫혀 있다 · '+t.name+'이(가) 공격을 마친 뒤나 핵이 드러났을 때만 피해가 들어간다.';return coreOld.fieldBossBarrierReason.call(this,a,t,...rest);};
P.fieldBossView=function(){const v=coreOld.fieldBossView.call(this),b=this.s.runtime;if(!v||b?.fieldBoss?.coreRevision!==1)return v;const boss=fbBoss(b);if(boss&&coreHypo(b,boss.fb)&&!boss.fb.revival){v.state=v.state||[];v.state.unshift(this.fbCoreShut(boss)?'핵 닫힘 · 공격을 마칠 때까지 피해가 들어가지 않음':'핵 노출 · 다음 준비 동작까지');}return v;};
P.validateSave=function(s){const out=coreOld.validateSave.call(this,s)||s,b=out?.runtime;if((b?.actors||[]).some(x=>x.fb?.coreShutRound!==undefined&&!Number.isSafeInteger(x.fb.coreShutRound)||x.fb?.wallShut!==undefined&&x.fb.wallShut!==true))fail('FIELD_BOSS_SAVE','보스 핵 기록이 올바르지 않습니다.');if(b?.fieldBoss?.coreRevision!==undefined&&(b.fieldBoss.coreRevision!==1||!CORE_KINDS.has(BOSSES[b.fieldBoss.boss]?.kind)))fail('FIELD_BOSS_SAVE','보스 핵 기록이 올바르지 않습니다.');return out;};
api.fieldBossCore={version:1,kinds:[...CORE_KINDS]};
// 0.16.59 (user: 「보스가 죽고 프리즘이 나오는 즉시 함께하는 일격을 프리즘에 그냥 써버리네?」): the hero's 함께하는 일격 that fells a
// hypostasis went straight on into the guards its revival raises — the next companions picked the new prisms (the boss being the one
// target they had) and an overload's splash broke one — so the revival was over before it began. A guard raised during a card (or an
// AI turn) cannot be hurt by the rest of that card (「막 생겨났다」), and once the boss falls the companions still to strike in the
// 함께하는 일격 stop.
const reviveOld=Object.fromEntries(['fbSummon','fieldBossBarrierReason','protagonistJointMembers','protagonistMemberReason','fbChipView'].map(k=>[k,P[k]]));
// a guard raised inside one card (or AI turn) remembers that card (this._actId, set at the end of runtime_reading.js)
P.fbSummon=function(b,boss,id,extra={}){const a=reviveOld.fbSummon.call(this,b,boss,id,extra);if(a?.fbSummon&&b?.bossPass===1&&this._actId)a.fbSummon.bornAct=this._actId;return a;};
P.fieldBossBarrierReason=function(a,t,...rest){const own=reviveOld.fieldBossBarrierReason.call(this,a,t,...rest);if(own)return own;const b=this.s.runtime,s=t?.fbSummon;if(a?.side==='ALLY'&&s?.bornAct&&s.bornAct===this._actId&&b?.actors.find(x=>x.id===s.owner)?.fb?.revival)return '막 생겨났다 · '+t.name+'은(는) 다음 차례부터 부술 수 있다.';return own;};
// With the protagonist down when 무상의 뇌전 · 무상의 바위 fall, the companions alone break the prisms or pillars: they get two more
// rounds (the revival still has to be stopped — no skipping it). Without them a 4★ party looped through 26 revivals in 245 rounds.
const revivalStart=P.fbStartRevival;
P.fbStartRevival=function(t,...rest){const b=this.s.runtime,at=b?.log.length||0,out=revivalStart.call(this,t,...rest),r=t?.fb?.revival;
 if(pass(b)&&r?.guarded&&['ELECTRO','GEO_HYPO'].includes(t.fb.kind)&&!heroUp(b)&&!r.heroDown){r.rounds+=2;r.heroDown=true;
  const line=b.log.slice(at).find(x=>x.card==='FB_REVIVE');if(line&&typeof line.text==='string')line.text=line.text.replace('다음 3라운드 안에','다음 5라운드 안에')+' · 주인공이 쓰러져 2라운드 더';}
 return out;};
const fallen=(r,b)=>new Set((b?.actors||[]).filter(x=>x.fb&&x.fb.revival).map(x=>x.id));
P.protagonistJointMembers=function(...args){const b=this.s.runtime;if(b?.fieldBoss)this._jointStart={round:b.round,seq:b.actionSequence||0,fallen:fallen(this,b)};return reviveOld.protagonistJointMembers.apply(this,args);};
P.protagonistMemberReason=function(m,...args){const own=reviveOld.protagonistMemberReason.call(this,m,...args);if(own)return own;const b=this.s.runtime,j=this._jointStart;
 if(j&&b?.fieldBoss&&j.round===b.round&&j.seq===(b.actionSequence||0)&&[...fallen(this,b)].some(id=>!j.fallen.has(id)))return '보스가 쓰러짐';return own;};
// 0.16.59 (user: 「여전히 핵 노출쪽 디버프가 나오는 타이밍이 너무 이상해」, 「핵이 닫혔는데도 데미지가 들어가네」): the boss's chips (핵 닫힘 /
// 핵 노출, 부활, 갑주, 비늘, 꽃봉오리, 빈틈 …) were drawn from the turn's end during the whole playback, so the core read 「닫힘」 while the
// blows that landed before it shut played. Whenever a boss's chip state changes, the log line written at that moment carries it
// (fbChips, a small view per boss); the playback switches the chips on the beat of that line. Looks only; nothing reads it back.
P.fbChipView=function(b=this.s.runtime){if(!b)return null;const out={},fbx=b.fieldBoss,d=b.dailyDodge,t=b.twinBoss;
 for(const a of b.actors||[]){const f=a.fb,daily=d&&a.source===d.boss&&d.controlRevision===1,twin=t&&a.source===t.boss&&t.controlRevision===1;if(!f&&!daily&&!twin)continue;const r=f?.revival;
  out[a.id]={round:b.round,pass:b.bossPass===1,ctl:!!(fbx&&fbx.controlRevision===1&&fbx.behaviorRevision===5&&fbx.pressureRevision===1),core:fbx?.coreRevision===1,shut:!!(f&&this.fbCoreShut?.(a)),
   fb:f?{kind:f.kind,revival:r?{rounds:r.rounds??null,hits:r.hits||0,need:r.need??null,fruit:r.fruit?{melted:!!r.fruit.melted}:null,orbs:r.orbs?{got:r.orbs.got||0,total:r.orbs.total||0}:null,core:r.core??null}:null,armorOpened:!!f.armorOpened,exposedUntil:f.exposedUntil??null,corolla:!!f.corolla,corollaDue:f.corollaDue??null}:null,
   shell:(a.shields||[]).some(x=>x.source==='FB_SHELL'&&x.value>0),
   daily:daily?{dodge:!!d.dodge,exposedUntil:d.exposedUntil??null}:null,twin:twin?{crystals:!!t.crystals,downUntil:t.downUntil??null,dodge:!!t.dodge,exposedUntil:t.exposedUntil??null}:null};}
 return Object.keys(out).length?out:null;};
const chipSeen=new WeakMap(),chipFight=b=>b&&(b.bossPass===1||b.dailyDodge?.controlRevision===1||b.twinBoss?.controlRevision===1);
function markChips(r){const b=r.s.runtime;if(!chipFight(b)||!Array.isArray(b.log)||!b.log.length)return;let seen=chipSeen.get(b.log);
 if(!seen){seen={key:null};for(let i=b.log.length-1,k=0;i>=0&&k<5000;i--,k++){const e=b.log[i];if(e&&e.fbChips){seen.key=JSON.stringify(e.fbChips);break;}}chipSeen.set(b.log,seen);}
 const view=r.fbChipView(b),key=JSON.stringify(view);if(!view||key===seen.key)return;seen.key=key;const e=b.log[b.log.length-1];if(e&&typeof e==='object')e.fbChips=view;}
for(const m of ['executeCard','aiTurn','executeCombatSystem','combatAction','damage','applyDamage','applyCombatAura','heal','addCombatStatus','newRound','roundEnd','tickFields','fieldBossTurn','fbMove','fbStartRevival','autoUntilPlayer'])if(typeof P[m]==='function'){const old=P[m];P[m]=function(...args){try{return old.apply(this,args);}finally{try{markChips(this);}catch{}}};}
api.fieldBossChips={version:1};
P.fieldBossVersion=1;
api.fieldBosses={version:1,behaviorRevision:5,pressureRevision:1,shieldPressure:copy(FIELD_SHIELD_PRESSURE_V01627),attackPressure:copy(FIELD_ATTACK_PRESSURE_V01627),mimicHp:copy(MIMIC_HP_V01627),levels:copy(LEVELS),levelGrowth:copy(LEVEL_GROWTH),cooldownMinutes:COOLDOWN,materials:copy(MATERIALS),bosses:copy(BOSSES),summons:copy(SUMMONS),twin:copy(TWIN),route:ROUTE,group:GROUP};
})(globalThis);
