/* v0.13.40 step 12-5: enemy tiers between ordinary monsters and field bosses, and enemy line-ups as gimmicks.
 *  1 일반 · 2 강화 일반 · 3 정예 · 4 강한 정예 · 5 지역 위험 개체 · 6 필드 보스 · 7 이틀 보스
 * Field battles (RANDOM/QUEST) in Mond and Liyue promote some enemies with affixes. The chance grows with the
 * area's risk and with how far the party out-levels the area, so old areas stay worth fighting. Affixes are
 * mechanics with a counter (armour ↔ 파쇄, sniper ↔ 은밀/엄호, fire trail ↔ 내열 …), not bare stat inflation.
 * Line-ups get roles too: a shield in front covers the archers behind it, a healer keeps the others up, two
 * reacting elements combo on a marked target. Rolls use a per-battle hash so the shared RNG stream is untouched.
 * Rewards: promoted enemies add materials (XP and the bounded field Mora are unchanged). Numbers are CRPG house rules.
 * Load after runtime_gear_traits.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(!P.gearTraitsVersion)throw Error('runtime_gear_traits.js must be loaded first');
if(P.enemyTiersVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const st=(a,id)=>(a?.statuses||[]).find(s=>s.id===id&&(!Number.isFinite(s.rounds)||s.rounds>0));
const tv=(a,key)=>Number(a?.traits?.[key]||0);
const TIERS={1:'일반',2:'강화 일반',3:'정예',4:'강한 정예',5:'지역 위험 개체',6:'필드 보스',7:'이틀 보스'};
const AFFIX={
 STURDY:{label:'단단한',text:'최대 HP +35%',counter:'집중 공격으로 빠르게 쓰러뜨리기'},
 FEROCIOUS:{label:'사나운',text:'공격력 +20%',counter:'보호막·회복으로 버티기'},
 SWIFT:{label:'날랜',text:'속도 +8 · 회피 +8',counter:'정밀(명중) 장비'},
 ARMORED:{label:'갑주',text:'방어력 +35% · 갑주 판정',counter:'파쇄 장비·양손검'},
 WARDED:{label:'원소 보호막',text:'최대 HP 25%의 원소 보호막',counter:'보호막 파괴 장비·장병기'},
 SNIPER:{label:'저격수',text:'공격력이 가장 높은 동료를 노림 · 단일 공격 피해 +15%',counter:'은밀 장비 · 옆 칸 엄호'},
 HUNTER:{label:'사냥꾼',text:'가장 다친 동료를 마무리하려 함',counter:'회복 · 엄호'},
 VANGUARD:{label:'선봉',text:'선두를 집중 공격 · 맞은 동료의 다음 행동이 늦어짐',counter:'경직 저항·중장 장비'},
 SCORCH:{label:'불꽃 흔적',text:'전열에 화염 지형을 남김',counter:'내열 장비',hazard:{kind:'FIRE',targets:'FRONT'}},
 FROSTBREATH:{label:'서리 숨결',text:'파티 전원에게 냉기 지형',counter:'방한 장비',hazard:{kind:'FROST',targets:'ALL',power:.035}},
 CHARGED:{label:'뇌운',text:'후열에 낙뢰',counter:'절연 장비',hazard:{kind:'LIGHTNING',targets:'BACK'}},
 DRENCH:{label:'물보라',text:'전열을 침수시켜 젖게 함',counter:'방수 장비',hazard:{kind:'FLOOD',targets:'FRONT'}},
 CORROSIVE:{label:'부식',text:'선두의 방어력을 부식시킴',counter:'해독 장비',hazard:{kind:'CORROSION',targets:'LEAD'}},
 REGEN:{label:'재생',text:'라운드 끝마다 HP 6% 회복',counter:'한 번에 몰아치기'},
 COMMANDER:{label:'지휘관',text:'살아 있는 동안 다른 적 공격력 +12%',counter:'지휘관 먼저 처치'},
 GUARDIAN:{label:'수호',text:'후열 동료를 노린 단일 공격을 40% 확률로 대신 막음',counter:'광역 공격 · 수호 개체 먼저 처치'},
 MENDER:{label:'치유사',text:'2차례마다 가장 다친 적의 HP 18% 회복',counter:'치유사 먼저 처치 · 행동 방해'}
};
const ELEMENT_AFFIX={불:'SCORCH',얼음:'FROSTBREATH',번개:'CHARGED',물:'DRENCH',바람:'SWIFT',바위:'ARMORED',풀:'REGEN'};
const REACT={물:['번개','얼음','불'],번개:['물','얼음','불'],얼음:['물','불','번개'],불:['얼음','물','번개'],풀:['물','불','번개']};
const COMBOS={
 SHIELD_LINE:{label:'방패 뒤 사수',hint:'방패 개체가 후열 사수를 지킵니다. 방패를 먼저 깨거나 광역 공격으로 후열을 노리세요.'},
 SUPPORT_CORE:{label:'지원형 편성',hint:'치유·지원 개체가 다른 적을 버티게 합니다. 지원 개체를 먼저 쓰러뜨리세요.'},
 ELEMENT_COMBO:{label:'원소 연계',hint:'서로 반응하는 원소를 쓰는 적이 함께 있습니다. 원소가 묻은 동료가 연계 피해를 더 받습니다.'},
 PINCER:{label:'전후열 협공',hint:'근접 적은 전열을, 사격 적은 후열을 노립니다. 튼튼한 동료를 앞에 세우세요.'},
 SWARM:{label:'물량 공세',hint:'같은 적이 무리 지어 있습니다. 광역 공격이 효율적입니다.'},
 COMMAND:{label:'지휘 편성',hint:'지휘관이 살아 있는 동안 다른 적이 강해집니다. 지휘관부터 노리세요.'}
};
const CONFIG={version:1,tiers:TIERS,affixes:AFFIX,combos:COMBOS,
 chance:{enhanced:{perRisk:.06,perOver:.08,max:.45},strongElite:{perRisk:.05,perOver:.08,max:.45},danger:{fromRisk:3,perRisk:.03,perOver:.04,max:.18,overOnly:.05}},
 // Rewards are materials only: direct field Mora stays bounded by the regional Mora rules (anti-farming).
 danger:{hp:1.6,atk:1.15,def:1.1},reward:{2:{rolls:[.35]},4:{rolls:[1,.5]},5:{rolls:[1,1],essence:15}},guardianChance:40,comboBonus:.15};

// ---- deterministic per-battle rolls (never touches the shared RNG stream) --------------------------------------
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;};
P.enemyTierRoll=function(b,key){return hash(String(this.s.global.SAVE_ID)+'|'+b.id+'|'+key)/4294967296;};
const shuffled=(r,b,key,list)=>list.map((x,i)=>[x,r.enemyTierRoll(b,key+':'+i+':'+x)]).sort((x,y)=>x[1]-y[1]).map(x=>x[0]);

const ranged=a=>['원거리','중거리'].includes(a.range);
const familyOf=(r,a)=>{try{return String(r.row('09_MONSTER_DB',a.source)[2]||'');}catch{return '';}};
const affixPool=(r,a)=>{
 const list=ranged(a)?['SNIPER','HUNTER','SWIFT','FEROCIOUS']:['STURDY','FEROCIOUS','ARMORED','VANGUARD','REGEN'];
 if(/지원/.test(a.tactic||''))list.push('MENDER','COMMANDER');
 const el=ELEMENT_AFFIX[a.element];if(el&&!list.includes(el))list.push(el);
 if(a.element&&a.element!=='물리')list.push('WARDED');
 if(/심연/.test(familyOf(r,a)))list.push('CORROSIVE');
 return [...new Set(list)];
};
P.enemyTierRisk=function(b=this.s.runtime){
 const local=b?.balanceProfile?.mondLocal?.risk;if(Number.isInteger(local))return local;
 const map=this.tables['32_MAP_DB'].get(this.s.global.CURRENT_MAP_ID);if(!map)return 1;
 return Math.max(1,Math.min(6,Math.round(Number(map[6])||1)-1));
};
P.enemyTierEligible=function(b){
 if(!b||b.storyConfig||b.enemyTiers)return false;
 if(!(b.origin==='RANDOM'||String(b.origin).startsWith('QUEST:')))return false;
 const map=this.tables['32_MAP_DB'].get(this.s.global.CURRENT_MAP_ID);if(!map||!['몬드','리월'].includes(map[1]))return false;
 const enemies=b.actors.filter(a=>a.side==='ENEMY');return enemies.length>0&&enemies.every(a=>a.grade!=='보스');
};
function affixStats(r,a,id,scale=1){
 if(id==='STURDY'){a.maxHp=Math.round(a.maxHp*1.35);a.hp=a.maxHp;}
 if(id==='FEROCIOUS')a.atk=Math.round(a.atk*1.2);
 if(id==='SWIFT'){a.spd+=8;a.eva=(a.eva||0)+8;}
 if(id==='ARMORED'){a.def=Math.round(a.def*1.35);a.armored=true;}
 if(id==='WARDED'){const counter={불:{물:2,얼음:1.5},물:{번개:2,풀:1.5},얼음:{불:2},번개:{얼음:2,물:1.5},바위:{},바람:{},풀:{불:2}}[a.element]||{};r.shield(a,a.maxHp*.25*scale,'AFFIX_WARDED',null,{element:a.element,damageMultipliers:counter,affix:true});}
 if(id==='SNIPER')a.targetRule='HIGHEST_ATK';
 if(id==='HUNTER')a.targetRule='LOWEST_HP';
 if(id==='VANGUARD')a.targetRule='LEAD';
}
P.promoteEnemy=function(b,a,tier,affixes){
 a.variant={version:1,tier,label:TIERS[tier],affixes:affixes.slice(),acts:0};
 if(tier===5){a.maxHp=Math.round(a.maxHp*CONFIG.danger.hp);a.hp=a.maxHp;a.atk=Math.round(a.atk*CONFIG.danger.atk);a.def=Math.round(a.def*CONFIG.danger.def);}
 for(const id of affixes)affixStats(this,a,id,tier===5?1.3:1);
 return a.variant;
};
P.analyzeEnemyLineup=function(b){
 const enemies=b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0);if(enemies.length<2)return null;
 // AI profile '생존우선' is the tanky melee kind (shield churls, guardians); '지원/제어' is the support kind.
 const armoredCheck=a=>this.enemyIsArmored?.(a)||(a.shields||[]).some(s=>s.value>0)||/방패/.test(a.name||'')||/생존/.test(a.tactic||'');
 const tanks=enemies.filter(a=>!ranged(a)&&armoredCheck(a)),shooters=enemies.filter(ranged),melee=enemies.filter(a=>!ranged(a));
 const supports=enemies.filter(a=>/지원/.test(a.tactic||'')||a.variant?.affixes.includes('MENDER'));
 const elements=[...new Set(enemies.map(a=>a.element).filter(e=>REACT[e]))];
 const pair=elements.flatMap(x=>elements.filter(y=>y>x&&REACT[x].includes(y)).map(y=>[x,y]))[0]||null;
 const bySource={};for(const a of enemies)bySource[a.source]=(bySource[a.source]||0)+1;
 const combos=[];
 if(tanks.length&&shooters.length)combos.push('SHIELD_LINE');
 if(supports.length&&enemies.length>supports.length)combos.push('SUPPORT_CORE');
 if(pair)combos.push('ELEMENT_COMBO');
 if(!combos.includes('SHIELD_LINE')&&melee.length&&shooters.length)combos.push('PINCER');
 if(Object.values(bySource).some(n=>n>=3))combos.push('SWARM');
 if(enemies.some(a=>a.variant?.affixes.includes('COMMANDER')))combos.push('COMMAND');
 return {combos,pair,tank:tanks[0]?.id||null,support:supports[0]?.id||null};
};
P.applyEnemyTiers=function(b){
 const risk=this.enemyTierRisk(b),map=this.tables['32_MAP_DB'].get(this.s.global.CURRENT_MAP_ID),allies=b.actors.filter(a=>a.side==='ALLY');
 const party=allies.length?allies.reduce((n,a)=>n+(Number(a.level)||1),0)/allies.length:1,over=Math.max(0,Math.round(party-(Number(map?.[7])||party)));
 const c=CONFIG.chance,enemies=b.actors.filter(a=>a.side==='ENEMY');
 const chance=(spec)=>Math.min(spec.max,spec.perRisk*risk+spec.perOver*over);
 const state={version:1,risk,over,promoted:[],danger:null,lineup:null};
 // 5: one regional danger per battle at most, on the strongest body
 const dangerChance=risk>=c.danger.fromRisk?Math.min(c.danger.max,c.danger.perRisk*(risk-2)+c.danger.perOver*over):(over>=2?c.danger.overOnly:0);
 let danger=null;if(dangerChance>0&&this.enemyTierRoll(b,'danger')<dangerChance){const weight={일반:1,정예:2,강적:3};danger=enemies.slice().sort((x,y)=>(weight[y.grade]||1)-(weight[x.grade]||1)||y.maxHp-x.maxHp)[0];}
 for(const a of enemies){
  const pool=affixPool(this,a);let tier=null,affixes=[];
  if(a===danger){tier=5;const elementAffix=ELEMENT_AFFIX[a.element]&&AFFIX[ELEMENT_AFFIX[a.element]].hazard?ELEMENT_AFFIX[a.element]:null;const rest=shuffled(this,b,'danger:'+a.id,pool.filter(x=>x!==elementAffix));affixes=[...(elementAffix?[elementAffix]:[]),...rest].slice(0,2);if(!affixes.some(x=>AFFIX[x].hazard))affixes[1]=(/심연/.test(familyOf(this,a))?'CORROSIVE':'SCORCH');}
  else if(a.grade==='일반'&&this.enemyTierRoll(b,'tier:'+a.id)<chance(c.enhanced)){tier=2;affixes=shuffled(this,b,'affix:'+a.id,pool).slice(0,1);}
  else if(['정예','강적'].includes(a.grade)&&this.enemyTierRoll(b,'tier:'+a.id)<chance(c.strongElite)){tier=4;affixes=shuffled(this,b,'affix:'+a.id,pool).slice(0,2);}
  if(!tier)continue;this.promoteEnemy(b,a,tier,affixes);state.promoted.push({id:a.id,tier,affixes});if(tier===5)state.danger=a.id;
  b.log.push({actor:a.name,actorId:a.id,variant:tier,text:a.name+' · '+TIERS[tier]+' ('+affixes.map(x=>AFFIX[x].label).join('·')+')',round:b.round});
 }
 // line-up roles: a shield in front covers the shooters (from risk 2), a lone support starts mending
 const lineup=this.analyzeEnemyLineup(b);
 if(lineup){
  if(lineup.combos.includes('SHIELD_LINE')&&risk>=2){const tank=b.actors.find(a=>a.id===lineup.tank);if(tank&&!tank.variant?.affixes.includes('GUARDIAN')){tank.lineRole='GUARDIAN';}}
  if(lineup.combos.includes('SUPPORT_CORE')&&risk>=2){const s=b.actors.find(a=>a.id===lineup.support);if(s&&!s.hasDedicatedCards&&!s.variant?.affixes.includes('MENDER'))s.lineRole='MENDER';}
  state.lineup=lineup;
 }
 b.enemyTiers=state;return state;
};
const has=(a,id)=>!!(a?.variant?.affixes?.includes(id)||a?.lineRole===id);
P.enemyHasAffix=function(a,id){return has(a,id);};

// ---- hooks ---------------------------------------------------------------------------------------------------
const old=Object.fromEntries(['startBattle','aiTurn','damage','combatDamageMultiplier','combatStat','roundEnd','finishBattle','enemyIntel','validateSave'].map(k=>[k,P[k]]));
P.startBattle=function(...args){
 const before=this.s.runtime,result=old.startBattle.apply(this,args),b=this.s.runtime;
 if(b&&b!==before&&this.enemyTierEligible(b))this.applyEnemyTiers(b);
 return result;
};
const singleAttack=(r,o)=>{if(o.aoe||o.sourceKind)return false;if(!o.card)return true;const row=r.tables['08_SKILL_CARD_DB']?.get(o.card)||r.tables['12_ENEMY_CARD_DB']?.get(o.card);const mode=String(row?.[31]||''),script=String(row?.[32]||'');if(/DMG_AOE|ENEMY_(?:ALL|MAX[2-9])|(?:^|:)MAX[2-9]/.test(mode+';'+script))return false;return !mode||/^(ALLY_1|ENEMY_1|PRIMARY|LOWEST_HP|HIGHEST_HP|SINGLE|TARGET)/.test(mode);};
P.enemyGuardFor=function(a,t,o){
 const b=this.s.runtime;if(!b?.enemyTiers||a.side!=='ALLY'||t.side!=='ENEMY'||o.covered||!ranged(t)||!singleAttack(this,o))return null;
 const key='G:'+a.id+':'+(b.actionSequence||0)+':'+t.id;b.guardDecisions=b.guardDecisions||{};if(key in b.guardDecisions)return b.actors.find(x=>x.id===b.guardDecisions[key])||null;
 const guard=b.actors.find(x=>x.side==='ENEMY'&&x.id!==t.id&&x.hp>0&&has(x,'GUARDIAN')&&!this.combatActionLocked?.(x));
 const pick=guard&&this.random()*100<CONFIG.guardianChance?guard:null;
 b.guardDecisions[key]=pick?.id||null;if(Object.keys(b.guardDecisions).length>60)b.guardDecisions={[key]:pick?.id||null};return pick;
};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime;if(!b?.enemyTiers||!t||t.hp<=0)return old.damage.call(this,a,t,k,e,o);
 const guard=this.enemyGuardFor(a,t,o);if(guard){b.log.push({actor:guard.name,actorId:guard.id,target:t.name,targetId:t.id,cover:true,guard:true,text:'수호 · '+guard.name+'이(가) '+t.name+' 대신 공격을 막았다.',round:b.round});return this.damage(a,guard,k,e,{...o,covered:true});}
 const prior=this._tierHit;this._tierHit={single:singleAttack(this,o)};
 let result;try{result=old.damage.call(this,a,t,k,e,o);}finally{this._tierHit=prior;}
 if(result&&a.side==='ENEMY'&&t.side==='ALLY'&&has(a,'VANGUARD')&&!o.sourceKind&&t.hp>0){if(tv(t,'HEAVY')>0||tv(t,'STAGGER_RES')>=100)b.log.push({target:t.name,targetId:t.id,resisted:'VANGUARD',text:t.name+' · 경직 저항',round:b.round});else{t.nextScorePenalty=Math.max(15,t.nextScorePenalty||0);b.log.push({target:t.name,targetId:t.id,text:t.name+' · 선봉에게 밀려 다음 행동이 늦어진다',round:b.round});}}
 return result;
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const b=this.s.runtime;if(!b?.enemyTiers)return n;
 if(a?.side==='ENEMY'&&t?.side==='ALLY'){
  if(has(a,'SNIPER')&&this._tierHit?.single)n*=1.15;
  const pair=b.enemyTiers.lineup?.pair;if(pair&&!o.sourceKind&&pair.includes(a.element)){const partner=pair.find(x=>x!==a.element),auras=[t.aura,...(t.auras||[]).map(x=>x.element)].filter(Boolean).join(' ');if(partner&&auras.includes(partner))n*=1+CONFIG.comboBonus;}
 }
 return n;
};
P.combatStat=function(a,key){
 let n=old.combatStat.call(this,a,key);const b=this.s.runtime;
 if(key==='atk'&&a?.side==='ENEMY'&&b?.enemyTiers&&!has(a,'COMMANDER')&&b.actors.some(x=>x.side==='ENEMY'&&x.hp>0&&x!==a&&has(x,'COMMANDER')))n*=1.12;
 return n;
};
P.aiTurn=function(a,targets){
 const b=this.s.runtime;if(!b?.enemyTiers||a.side!=='ENEMY'||!(a.variant||a.lineRole))return old.aiTurn.call(this,a,targets);
 const v=a.variant||(a.variant={version:1,tier:null,label:'',affixes:[],acts:0,roleOnly:true});v.acts=(v.acts||0)+1;
 if(has(a,'MENDER')&&v.acts%2===0){const hurt=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0&&x.hp/x.maxHp<.7).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0];
  if(hurt){const healed=this.heal(hurt,hurt.maxHp*.18,a.name);b.log.push({actor:a.name,actorId:a.id,target:hurt.name,targetId:hurt.id,card:'AFFIX_MENDER',cardName:'치유사의 손길',heal:healed,text:a.name+'이(가) '+hurt.name+'을(를) 치료했다.',round:b.round});return;}}
 const out=old.aiTurn.call(this,a,targets);
 const hazardAffix=(v.affixes||[]).find(x=>AFFIX[x]?.hazard);
 if(hazardAffix&&a.hp>0&&v.acts%3===1){const h=AFFIX[hazardAffix].hazard;this.addHazard({id:'AFFIX:'+a.id,kind:h.kind,power:(h.power||.05)*(v.tier===5?1.4:1),rounds:2,targets:h.targets,source:a.id});b.log.push({actor:a.name,actorId:a.id,card:'AFFIX_'+hazardAffix,cardName:AFFIX[hazardAffix].label,text:a.name+' · '+AFFIX[hazardAffix].text,round:b.round});}
 return out;
};
P.roundEnd=function(...args){
 const b=this.s.runtime;
 if(b?.enemyTiers)for(const a of b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0&&has(x,'REGEN')&&x.hp<x.maxHp)){const healed=this.heal(a,a.maxHp*.06,'재생');if(healed)b.log.push({target:a.name,targetId:a.id,heal:healed,text:a.name+' · 재생',round:b.round});}
 return old.roundEnd.apply(this,args);
};
P.finishBattle=function(victory){
 const b=this.s.runtime,info=b?.enemyTiers?copy(b.enemyTiers):null,enemies=b?b.actors.filter(a=>a.side==='ENEMY'&&a.variant?.tier).map(a=>({id:a.id,source:a.source,name:a.name,level:a.level,tier:a.variant.tier,affixes:a.variant.affixes.slice()})):[];
 const result=old.finishBattle.call(this,victory);
 if(!info||!victory||!result||!enemies.length||b.storyConfig?.noRewards)return result;
 const loot={};
 for(const e of enemies){const rule=CONFIG.reward[e.tier];if(!rule)continue;
  const table=this.row('09_MONSTER_DB',e.source)[14],drops=table?this.combatRows('20_LOOT_TABLE').filter(x=>x[0]===table&&this.tables['14_ITEM_DB'].has(x[2])):[];
  const rare=drops.slice().sort((x,y)=>Number(x[5])-Number(y[5]))[0];
  if(rare)for(const chance of rule.rolls||[])if(chance>=1||this.random()<chance){const n=Number(rare[3])||1;this.giveItem(rare[2],n);loot[rare[2]]=(loot[rare[2]]||0)+n;}
  if(rule.essence&&this.die(100)<=rule.essence&&this.tables['14_ITEM_DB'].has('TRPG_BOSS_ESSENCE')){this.giveItem('TRPG_BOSS_ESSENCE',1);loot.TRPG_BOSS_ESSENCE=(loot.TRPG_BOSS_ESSENCE||0)+1;}}
 result.tierBonus={version:1,loot,enemies:enemies.map(e=>({name:e.name,tier:e.tier,label:TIERS[e.tier],affixes:e.affixes.map(x=>AFFIX[x]?.label||x)}))};
 result.loot={...result.loot};for(const [id,n]of Object.entries(loot))result.loot[id]=(result.loot[id]||0)+n;
 this.s.combatReceipts[result.battleId||result.id]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);
 const log=this.s.log.findLast(r=>r.battleId===(result.battleId||result.id));if(log)Object.assign(log,copy(result));
 return result;
};
if(old.enemyIntel)P.enemyIntel=function(id){
 const info=old.enemyIntel.call(this,id),a=this.combatActor?.(id),b=this.s.runtime;if(!info||!a||!b?.enemyTiers)return info;
 const affixes=[...(a.variant?.affixes||[]),...(a.lineRole&&!a.variant?.affixes?.includes(a.lineRole)?[a.lineRole]:[])];
 if(a.variant?.tier)info.variant={tier:a.variant.tier,label:TIERS[a.variant.tier]};
 if(affixes.length)info.affixes=affixes.map(x=>({id:x,label:AFFIX[x].label,text:AFFIX[x].text,counter:AFFIX[x].counter,role:a.lineRole===x}));
 const lineup=b.enemyTiers.lineup;if(lineup?.combos?.length)info.lineup=lineup.combos.map(x=>({id:x,...COMBOS[x]}));
 return info;
};
P.enemyLineupView=function(){const b=this.s.runtime;if(!b?.enemyTiers)return null;const l=b.enemyTiers.lineup;
 return {risk:b.enemyTiers.risk,over:b.enemyTiers.over,combos:(l?.combos||[]).map(x=>({id:x,...COMBOS[x],...(x==='ELEMENT_COMBO'&&l.pair?{pair:l.pair.slice()}:{})})),
  promoted:b.actors.filter(a=>a.side==='ENEMY'&&(a.variant?.tier||a.lineRole)).map(a=>({id:a.id,name:a.name,tier:a.variant?.tier||null,label:a.variant?.tier?TIERS[a.variant.tier]:'',affixes:[...(a.variant?.affixes||[]),...(a.lineRole&&!a.variant?.affixes?.includes(a.lineRole)?[a.lineRole]:[])].map(x=>({id:x,label:AFFIX[x].label,text:AFFIX[x].text,counter:AFFIX[x].counter})),alive:a.hp>0}))};};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,b=out.runtime;
 if(b?.enemyTiers!==undefined){const t=b.enemyTiers;if(!t||t.version!==1||!Array.isArray(t.promoted)||!Number.isInteger(t.risk))fail('ENEMY_TIER_SAVE','적 등급 기록이 올바르지 않습니다.');
  for(const a of b.actors||[]){const v=a.variant;if(v&&(v.version!==1||!Array.isArray(v.affixes)||v.affixes.some(x=>!AFFIX[x])||(v.tier!==null&&!TIERS[v.tier])))fail('ENEMY_TIER_SAVE','적 강화 기록이 올바르지 않습니다.');if(a.lineRole&&!AFFIX[a.lineRole])fail('ENEMY_TIER_SAVE','적 편성 역할 기록이 올바르지 않습니다.');}}
 return out;
};
P.enemyTiersVersion=1;api.enemyTiers=copy(CONFIG);
})(globalThis);
