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
  gimmicks:{GUST:G('돌풍 탄환','무작위 동료 3회 바람 피해','바람 외 원소 공격 · 회복'),PULL:G('흡인 회오리','예고 후 후열을 끌어당겨 피해 · 다음 행동 지연','경직 저항·중장 장비'),RISE:G('상승 기류','떠오른 동안 원거리·대공·공중 접근만 닿음, 다음 차례 전열 내려찍기','활·법구, 공중 접근 장비, 보호막'),REVIVE:G('재조립','쓰러지면 핵이 2라운드 동안 드러남 · 핵을 부수지 못하면 HP 40%로 부활','약점 공략·집중 공격'),IMMUNE:G('바람 면역','바람 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_ELECTRO_HYPOSTASIS:{kind:'ELECTRO',name:'무상의 뇌전',map:'MAP_D163_ELECTRO_HYPOSTASIS',region:'몬드',level:6,hp:2500,atk:130,def:75,spd:64,element:'번개',immune:['번개'],range:'중거리',material:'MAT_FB_LIGHTNING_PRISM',
  summary:'번개 원소의 정육면체. 후열에 낙뢰를 떨어뜨리고, 프리즘을 불러 자신을 보호하며, 쓰러지면 프리즘으로 부활하려 한다.',
  gimmicks:{SPIKES:G('뇌광 가시','무작위 동료 2명 번개 피해','절연·번개 내성'),HAMMER:G('뇌전 망치','선두에 강한 단타','중장 장비·보호막'),STORM:G('낙뢰 지대','예고 후 후열에 낙뢰 지형 2라운드','절연 장비 · 후열 배치 조정'),PRISM:G('뇌광 프리즘','HP 50% 이하에서 프리즘 2개 · 프리즘이 있으면 본체 피해 절반','광역 공격·프리즘 먼저 파괴'),REVIVE:G('프리즘 부활','쓰러지면 프리즘 3개 · 3라운드 안에 모두 부수지 못하면 HP 40%로 부활','광역 공격·집중 공격'),IMMUNE:G('번개 면역','번개 원소 피해를 받지 않음','다른 원소·물리')}},
 FB_CRYO_REGISVINE:{kind:'CRYO_VINE',name:'얼음 나무',map:'MAP_V141_THOUSAND_RAVINE',region:'몬드',level:5,hp:2300,atk:115,def:70,spd:56,element:'얼음',immune:[],range:'중거리',material:'MAT_FB_HOARFROST_CORE',enrage:true,
  summary:'얼음 결정막으로 핵을 감싼 거대한 덩굴. 전열에 냉기를 퍼뜨리고, 결정막이 깨지면 잠시 무방비가 된다.',
  gimmicks:{SHELL:G('서리 결정막','HP 30% 보호막 · 불 피해 3배, 그 밖의 피해는 약하게 들어감 · 깨지면 행동 불능과 핵 노출 · 3라운드 뒤 재생','불 원소 동료·보호막 파괴 장비'),WHIP:G('얼음 덩굴 채찍','전열 전원 얼음 피해','방한·얼음 내성'),SPREAD:G('냉기 확산','전열에 냉기 지형(감속) 2라운드','방한 장비(50 이상이면 감속 무시)'),ORBS:G('빙구 회전','예고 후 무작위 3회 · 빙결 확률','행동 방해 저항·방한'),ENRAGE:G('광폭','HP 30% 이하에서 한 차례에 한 번 더 행동','결정막이 깨진 틈에 몰아치기')}},
 FB_CRYO_HYPOSTASIS:{kind:'CRYO_HYPO',name:'무상의 얼음',map:'MAP_D163_CRYO_HYPOSTASIS',region:'몬드',level:8,hp:2800,atk:145,def:85,spd:64,element:'얼음',immune:['얼음'],range:'중거리',material:'MAT_FB_CRYSTALLINE_BLOOM',
  summary:'얼음 원소의 정육면체. 한 줄을 꿰뚫는 창으로 얼리고, 쓰러지면 냉기의 핵이 되어 여러 번 맞아야 부서진다.',
  gimmicks:{LANCE:G('빙결 창','HP가 더 많은 줄(전열·후열)을 꿰뚫음 · 빙결 확률','행동 방해 저항 · 대열 분산'),BLAST:G('한기 방출','예고 후 전원 피해 + 냉기 지형 2라운드','방한 장비'),WALL:G('얼음 가시 방벽','얼음 보호막(불에 약함)','불 원소·보호막 파괴'),REVIVE:G('냉기 핵','쓰러지면 2라운드 동안 핵 · 서로 다른 공격 4번을 맞히지 못하면 HP 50%로 부활','여러 번 때리는 공격·파티 4인'),IMMUNE:G('얼음 면역','얼음 원소 피해를 받지 않음','다른 원소·물리')}},
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
const TUNE={hp:1.5,atk:2.4,actions:2};
const TUNE_BY={FB_ANEMO_HYPOSTASIS:{atk:3.8,hp:1.8},FB_ELECTRO_HYPOSTASIS:{hp:1.1,atk:2.5},FB_CRYO_REGISVINE:{atk:4,hp:1.6},FB_CRYO_HYPOSTASIS:{hp:.9,atk:1.9},FB_GEO_HYPOSTASIS:{hp:1.3,atk:2.4},FB_PYRO_REGISVINE:{hp:1.2},FB_OCEANID:{atk:2.8},FB_PRIMO_GEOVISHAP:{atk:2.5},FB_RUIN_SERPENT:{hp:1.6,atk:4}};
const tuned=(d,key)=>Math.round(d[key]*((TUNE_BY[d.id]||{})[key]??TUNE[key])*grown(d.level,key));
// Two-day bosses: extra mechanics only in voluntary challenges (never in the story fights).
const TWIN={BOSS_ANDRIUS:{name:'안드리우스',gimmicks:{FROST_FIELD:G('혹한의 영역','3라운드마다 라운드 끝 전원 냉기 지형(감속) 2라운드','방한 장비'),HUNT_MARK:G('사냥 표식','공격력이 가장 높은 동료에게 표식 · 표식 대상에게 주는 단일 피해 +30%','은밀 장비(20 이상이면 표식을 피함)·옆 칸 엄호')}},
 BOSS_DVALIN:{name:'드발린',gimmicks:{CORROSIVE_BREATH:G('부식의 숨결','3라운드마다 라운드 끝 전열 부식 지형 2라운드(방어력 −15%)','해독 장비'),STORM_WING:G('폭풍 날개','짝수 라운드 끝 선두를 밀어 다음 행동 지연','중장·경직 저항 장비')}}};

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
  b.fieldBoss={version:1,challengeRevision:1,behaviorRevision:origin==='BOSS:'+ROUTE(boss.source)?5:4,boss:boss.source,route:String(origin).startsWith('BOSS:')?origin.slice(5):null,seen:[],telegraph:null,defeated:0,target:d.kind==='OCEANID'?8:0,spawned:0,heatwave:null};
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
P.fieldBossSummonSpec=function(b,id){const s=SUMMONS[id];if(b?.fieldBoss?.behaviorRevision!==5)return s;if(id==='FB_SUMMON_PILLAR')return {...s,hp:.07,def:75};return MIMIC_HP_V01624[id]?{...s,hp:MIMIC_HP_V01624[id]}:s;};
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
P.fbHit=function(a,t,k,el,o={}){if(!t||t.hp<=0)return false;return this.damage(a,t,k,el,{range:'전장',card:'FB_'+(o.move||'HIT'),...o});};
P.fbDelay=function(t,amount,why){const b=this.s.runtime;if(t.hp<=0)return;if(tv(t,'HEAVY')>0||tv(t,'STAGGER_RES')>=100){b.log.push({target:t.name,targetId:t.id,resisted:'FB_DELAY',text:t.name+' · 경직 저항',round:b.round});return;}t.nextScorePenalty=Math.max(amount,t.nextScorePenalty||0);b.log.push({target:t.name,targetId:t.id,text:t.name+' · '+why+' · 다음 행동이 늦어진다',round:b.round});};
P.fbTelegraph=function(a,move){const b=this.s.runtime,d=BOSSES[a.source],g=d.gimmicks[move];a.fb.next=move;b.fieldBoss.telegraph={move,label:g.label,text:g.text,counter:g.counter};this.fieldBossSeen(b,move);this.fbLog(a,move+'_READY',g.label+' 준비',a.name+'이(가) '+g.label+'을(를) 준비한다 · 대응: '+g.counter);};
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
 if(d.kind==='ANEMO'&&move==='RISE'){a.airborne=true;this.fieldBossSeen(b,'RISE');f.next='SLAM';b.fieldBoss.telegraph={move:'RISE',label:'상승 기류',text:'떠올라 있는 동안 원거리·대공·공중 접근만 닿음 · 다음 차례 전열 내려찍기',counter:d.gimmicks.RISE.counter};this.fbLog(a,'RISE','상승 기류',a.name+'이(가) 높이 떠올랐다 · 다음 차례에 전열을 내려찍는다');f.endTurn=turn;return;}
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
 if(flier&&a.hp>0){a.airborne=false;b.log.push({actor:a.name,actorId:a.id,text:a.name+'이(가) 내려앉았다 · 다음 차례 전까지 근접 공격도 닿는다',round:b.round});}if(s.kind==='FB_MIMIC_FROG'){const u=this.fbPick(b,1)[0];if(u&&u!==t)this.damage(a,u,.65,'물',{range:'전장',card:'FB_'+s.kind});}
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
 this.fbLog(t,'REVIVE',d.gimmicks.REVIVE.label,t.name+' · '+(b.fieldBoss.behaviorRevision===5&&['ELECTRO','GEO_HYPO'].includes(d.kind)?'부활을 막으려면 다음 3라운드 안에 '+(d.kind==='ELECTRO'?'프리즘':'현암 기둥')+'을 모두 파괴':d.gimmicks.REVIVE.text));
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
   for(const p of b.actors.filter(x=>x.fbSummon?.kind==='FB_SUMMON_PILLAR'&&x.hp>0&&x.fbSummon.owner===boss.id))if(!boss.fb.revival){const healed=this.heal(boss,boss.maxHp*.025,p.name);if(healed)b.log.push({target:boss.name,targetId:boss.id,heal:healed,text:'현암 공명 · '+boss.name+' 회복',round:b.round});}
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
  gimmicks:Object.entries(d.gimmicks).map(([k,g])=>({id:k,...(notes.seen.includes(k)?g:{label:'???',text:'아직 겪어 보지 않은 기믹',counter:''}),known:notes.seen.includes(k)})),
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
 return {name:d.name,level:d.level,telegraph:f.telegraph,state,immune:d.immune.includes('ALL')?['본체 무적']:d.immune.slice(),seen:f.seen.map(k=>({id:k,...d.gimmicks[k]})).filter(x=>x.label)};
};
if(old.enemyIntel)P.enemyIntel=function(id){const info=old.enemyIntel.call(this,id),a=this.combatActor?.(id);if(!info||!a)return info;if(a.fbSummon)info.fieldSummon={kind:a.fbSummon.kind,name:SUMMONS[a.fbSummon.kind]?.name};if(a.fb)info.fieldBoss=true;return info;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s;
 const clock=out.fieldBossClock;if(clock!==undefined&&(!clock||typeof clock!=='object'||Array.isArray(clock)||Object.entries(clock).some(([k,v])=>!BOSSES[k]||!Number.isSafeInteger(v)||v<0)))fail('FIELD_BOSS_SAVE','필드 보스 재등장 기록이 올바르지 않습니다.');
 const notes=out.fieldBossNotes;if(notes!==undefined&&(!notes||typeof notes!=='object'||Object.entries(notes).some(([k,n])=>!BOSSES[k]||!Array.isArray(n?.seen)||n.seen.some(g=>!BOSSES[k].gimmicks[g])||!Number.isInteger(n.attempts)||!Number.isInteger(n.wins))))fail('FIELD_BOSS_SAVE','필드 보스 관찰 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.fieldBoss){const f=b.fieldBoss;if(f.version!==1||!BOSSES[f.boss]||!Array.isArray(f.seen)||!b.actors?.some(a=>a.source===f.boss&&a.fb?.version===1)||f.behaviorRevision!==undefined&&![2,3,4,5].includes(f.behaviorRevision))fail('FIELD_BOSS_SAVE','필드 보스 전투 기록이 올바르지 않습니다.');
  const boss=b.actors.find(a=>a.source===f.boss),r=boss.fb.revival;if(modernBehavior(f)&&boss.fb.kind==='CRYO_HYPO'&&r&&(!Number.isSafeInteger(r.startedRound)||r.startedRound<1||r.startedRound>b.round||r.lastCountdownRound!==undefined&&(!Number.isSafeInteger(r.lastCountdownRound)||r.lastCountdownRound<r.startedRound||r.lastCountdownRound>b.round)))fail('FIELD_BOSS_SAVE','냉기 핵 대응 시간 기록이 올바르지 않습니다.');}
 if(b?.twinBoss&&(b.twinBoss.version!==1||!TWIN[b.twinBoss.boss]))fail('FIELD_BOSS_SAVE','보스 기믹 기록이 올바르지 않습니다.');
 return out;
};
P.fieldBossVersion=1;
api.fieldBosses={version:1,behaviorRevision:5,levels:copy(LEVELS),levelGrowth:copy(LEVEL_GROWTH),cooldownMinutes:COOLDOWN,materials:copy(MATERIALS),bosses:copy(BOSSES),summons:copy(SUMMONS),twin:copy(TWIN),route:ROUTE,group:GROUP};
})(globalThis);
