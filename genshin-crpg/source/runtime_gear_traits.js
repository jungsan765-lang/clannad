/* v0.13.33 step 12-4: equipment traits (horizontal aptitude), battlefield hazards, battle line order and
 * enemy target rules. Numbers are CRPG house rules. Load after runtime_play_fixes.js. */
(function(root){'use strict';
const api=root.CRPGRuntime;if(!api?.Runtime)throw Error('CRPGRuntime must be loaded first');
const P=api.Runtime.prototype;if(P.gearTraitsVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const EL={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'},el=x=>EL[x]||x||'물리';
const ELEMENTS=['불','물','얼음','번개','바람','바위','풀'];
const st=(a,id)=>(a?.statuses||[]).find(s=>s.id===id&&(!Number.isFinite(s.rounds)||s.rounds>0));
const WEAPONS=['한손검','양손검','장병기','활','법구'];

// ---- catalog: what each trait does. value = percent unless noted --------------------------------
const pct=v=>v+'%';
const TRAITS={
 HEAT:{label:'내열',group:'환경',text:v=>'화염 지형·불 지속 피해 -'+pct(v)+' · 받는 불 피해 -'+pct(Math.round(v/3))},
 COLD:{label:'방한',group:'환경',text:v=>'냉기 지형·얼음 지속 피해 -'+pct(v)+' · 받는 얼음 피해 -'+pct(Math.round(v/3))+(v>=50?' · 냉기 감속 무시':'')},
 INSULATE:{label:'절연',group:'환경',text:v=>'낙뢰·번개 지속 피해 -'+pct(v)+' · 받는 번개 피해 -'+pct(Math.round(v/3))},
 WATERPROOF:{label:'방수',group:'환경',text:v=>'침수 지형 피해 -'+pct(v)+' · 받는 물 피해 -'+pct(Math.round(v/3))+(v>=50?' · 젖음 무시':'')},
 ANTITOXIN:{label:'해독',group:'환경',text:v=>'부식·독 피해 -'+pct(v)+(v>=50?' · 방어력 부식 무시':'')},
 DOT:{label:'지속 피해 감소',group:'환경',text:v=>'모든 지형·지속 피해 -'+pct(v)},
 TERRAIN_STEADY:{label:'발디딤',group:'환경',text:()=>'지형 효과로 인한 감속·젖음 무시'},
 ELEMENT_RES:{label:'원소 내성',group:'방어',keyed:true,text:(v,k)=>(k==='ALL'?'모든 원소':k)+' 피해 -'+pct(v)},
 AOE_GUARD:{label:'광역 완화',group:'방어',text:v=>'여러 명을 노리는 공격 피해 -'+pct(v)},
 HEAVY:{label:'중장',group:'방어',text:v=>'강한 단타(계수 1.3 이상·강공·돌진) 피해 -'+pct(v)+' · 밀치기 무시'},
 LIGHT:{label:'경량',group:'방어',text:v=>'가볍지만 강한 단타 피해 +'+pct(v)},
 FIRST_GUARD:{label:'첫 피격 완화',group:'방어',text:v=>'전투 중 처음 받는 직접 피해 -'+pct(v)},
 STAGGER_RES:{label:'경직 저항',group:'방어',text:v=>(v>=100?'밀치기·끌어당김 무시':'밀치기·끌어당김 '+pct(v)+' 확률로 무시')+' · 행동 지연 -'+pct(Math.min(100,v))},
 CONTROL_RES:{label:'행동 방해 저항',group:'방어',text:v=>'빙결·기절·띄우기·감속을 '+pct(v)+' 확률로 무시'},
 PURIFY:{label:'정화',group:'방어',text:v=>'자기 차례 시작 시 '+pct(v)+' 확률로 해로운 상태 1개 제거'},
 HEAL_BOOST:{label:'회복 효율',group:'지원',text:v=>'받는 회복량 +'+pct(v)},
 SHIELD_BOOST:{label:'보호막 강화',group:'지원',text:v=>'받는 보호막 흡수량 +'+pct(v)},
 AGGRO:{label:'도발',group:'대열',text:v=>'적이 노릴 확률 +'+pct(v)},
 STEALTH:{label:'은밀',group:'대열',text:v=>'적이 노릴 확률 -'+pct(v)},
 COVER:{label:'엄호',group:'대열',text:v=>'옆 칸 동료가 단일 공격을 받을 때 '+pct(v)+' 확률로 대신 맞음'},
 SHIELD_BREAK:{label:'보호막 파괴',group:'공략',text:v=>'적 보호막에 주는 피해 +'+pct(v)},
 ARMOR_BREAK:{label:'파쇄',group:'공략',text:v=>'방패·갑주·기계·구조물 대상 피해 +'+pct(v)},
 GIANT:{label:'거대 특공',group:'공략',text:v=>'대형 적·보스 대상 피해 +'+pct(v)},
 ANTI_AIR:{label:'대공',group:'공략',text:v=>'공중 적 대상 명중 +'+Math.round(v*2/3)+' · 피해 +'+pct(v)},
 AIR_ACCESS:{label:'공중 접근',group:'공략',text:()=>'근접·중거리 공격으로도 공중 적을 공격'},
 PRECISION:{label:'정밀',group:'공략',text:v=>'명중 +'+v},
 WEAK_POINT:{label:'약점 공략',group:'공략',text:v=>'약점·코어가 드러난 적 대상 피해 +'+pct(v)},
 SLAYER:{label:'특공',group:'공략',keyed:true,text:(v,k)=>k+' 대상 피해 +'+pct(v)},
 AURA_HUNTER:{label:'원소 표적',group:'공략',keyed:true,text:(v,k)=>k.split('/').join('·')+' 원소가 묻은 적 대상 피해 +'+pct(v)},
 ELEMENT_BOOST:{label:'원소 강화',group:'공략',keyed:true,text:(v,k)=>(k==='ALL'?'원소':k)+' 피해 +'+pct(v)},
 FIRST_STRIKE:{label:'선제',group:'공략',text:v=>'전투 중 첫 공격 피해 +'+pct(v)},
 HIGH_HP_CRIT:{label:'여유',group:'공략',text:v=>'HP 90% 이상이면 치명타 확률 +'+v+'%p'},
 STACK_ATK:{label:'연속 적중',group:'공략',text:v=>'적중할 때마다 공격력 +'+pct(v)+' (최대 3중첩, 2R)'},
 PROC_PHYSICAL:{label:'추가 타격',group:'공략',text:v=>'적중 시 '+pct(v)+' 확률로 공격력 40% 물리 추가 피해'},
 ON_KILL_HEAL:{label:'처치 회복',group:'지원',text:v=>'적을 쓰러뜨리면 HP '+v+' 회복'}
};
const GROUPS=['환경','방어','대열','공략','지원'];
// Weapon classes carry a small innate identity so switching weapons changes how a fight plays.
const CLASS_TRAITS={한손검:[['PRECISION',5]],양손검:[['ARMOR_BREAK',25]],장병기:[['SHIELD_BREAK',25]],활:[['ANTI_AIR',15]],법구:[['ELEMENT_BOOST','ALL',8]]};
// Traits for existing gear. Effects follow each item's authored description where it names a clear rule.
const GEAR={
 EQ_SWORD_COOL_STEEL:[['AURA_HUNTER','물/얼음',12]],
 EQ_SWORD_HARBINGER:[['HIGH_HP_CRIT',8]],
 EQ_SWORD_TRAVELER:[['ON_KILL_HEAL',60]],
 EQ_SWORD_RANCOUR:[['STACK_ATK',3]],
 EQ_CLAYMORE_SKYRIDER:[['STACK_ATK',2]],
 EQ_CLAYMORE_WHITEBLIND:[['STACK_ATK',3],['HEAVY',6]],
 EQ_CLAYMORE_ARCHAIC:[['PROC_PHYSICAL',25]],
 EQ_POLEARM_BLACK_TASSEL:[['SLAYER','슬라임',25]],
 EQ_POLEARM_HALBERD:[['FIRST_STRIKE',15]],
 EQ_POLEARM_DRAGONBANE:[['AURA_HUNTER','물/불',15],['SLAYER','용',10]],
 EQ_BOW_SHARPSHOOTER:[['WEAK_POINT',20]],
 EQ_BOW_CRESCENT:[['ANTI_AIR',12],['WEAK_POINT',8]],
 EQ_CATALYST_MAGIC_GUIDE:[['AURA_HUNTER','물/번개',12]],
 EQ_CRPG_PADDED_VEST:[['COLD',15]],
 EQ_ARMOR_TRAVEL_COAT:[['DOT',10]],
 EQ_ARMOR_REINFORCED_LEATHER:[['FIRST_GUARD',20],['STAGGER_RES',30]],
 EQ_ARMOR_IRON_GUARD:[['HEAVY',15],['STAGGER_RES',100],['ELEMENT_RES','물리',4]],
 EQ_ARMOR_FROSTWARD:[['COLD',60],['CONTROL_RES',10]],
 EQ_ARMOR_FLAMEWARD:[['HEAT',60],['ELEMENT_RES','불',5]],
 EQ_ARMOR_DIVER:[['WATERPROOF',60]],
 EQ_ARMOR_MEKA_PLATE:[['STAGGER_RES',100],['SLAYER','기계',6]],
 EQ_ARMOR_DRAGONSCALE:[['HEAVY',20],['STAGGER_RES',100]],
 EQ_ARMOR_ABYSSWARD:[['ANTITOXIN',60],['DOT',10]],
 EQ_ACC_VITAL_RING:[['HEAL_BOOST',8]],
 EQ_ACC_EAGLE_EYE:[['AIR_ACCESS',1],['ANTI_AIR',8]],
 EQ_ACC_STEADFAST:[['STAGGER_RES',100],['CONTROL_RES',10]],
 EQ_ACC_ELEMENTAL_PRISM:[['ELEMENT_RES','ALL',6]],
 EQ_ACC_HEALER_BROOCH:[['HEAL_BOOST',10],['SHIELD_BOOST',10]],
 EQ_ACC_GUARDIAN_TOKEN:[['COVER',30],['FIRST_GUARD',15]],
 EQ_SPECIAL_GRAPPLE:[['AIR_ACCESS',1],['TERRAIN_STEADY',1]],
 EQ_SPECIAL_DIVING_MODULE:[['WATERPROOF',40],['TERRAIN_STEADY',1]],
 EQ_SPECIAL_ABYSS_SEAL:[['ANTITOXIN',40]],
 EQ_SPECIAL_DRAGON_TOTEM:[['SLAYER','용',15],['GIANT',8]],
 EQ_SPECIAL_SCOUT_CLOAK:[['STEALTH',35]],
 EQ_SPECIAL_MEKA_ASSIST:[['ARMOR_BREAK',15]],
 EQ_LIYUE_ARMOR_STONEGATE:[['STAGGER_RES',50],['CONTROL_RES',10]],
 EQ_LIYUE_ARMOR_QINGCE_PADDED:[['COLD',25]],
 EQ_LIYUE_ARMOR_CLIFFRUNNER:[['TERRAIN_STEADY',1],['STEALTH',15],['LIGHT',10]],
 EQ_LIYUE_ACC_STONE_BEAD:[['CONTROL_RES',15]],
 EQ_LIYUE_ACC_COURIER_KNOT:[['STEALTH',25]],
 EQ_LIYUE_ACC_TIANHENG_SIGHT:[['PRECISION',8],['ANTI_AIR',8]]
};
// Official weapon classes for Liyue companions (Mond ones already live in runtime_party.js).
const LIYUE_WEAPONS={LIYUE_ZHONGLI:'장병기',LIYUE_NINGGUANG:'법구',LIYUE_BEIDOU:'양손검',LIYUE_YELAN:'활',LIYUE_KEQING:'한손검',LIYUE_BAIZHU:'법구',LIYUE_QIQI:'한손검',LIYUE_GAMING:'양손검',LIYUE_GANYU:'활',LIYUE_XINGQIU:'한손검',LIYUE_HUTAO:'장병기',LIYUE_XIANGLING:'장병기',LIYUE_XIANYUN:'법구',LIYUE_LANYAN:'법구',LIYUE_XIAO:'장병기',LIYUE_SHENHE:'장병기',LIYUE_XINYAN:'양손검',LIYUE_TARTAGLIA:'활',LIYUE_YANFEI:'법구',LIYUE_YUNJIN:'장병기',LIYUE_YAOYAO:'장병기',LIYUE_CHONGYUN:'양손검',LIYUE_ZIBAI:'한손검'};
const CAPS={HEAT:90,COLD:90,INSULATE:90,WATERPROOF:90,ANTITOXIN:90,DOT:60,AOE_GUARD:50,HEAVY:50,FIRST_GUARD:60,STAGGER_RES:100,CONTROL_RES:75,PURIFY:75,COVER:75,STEALTH:75};
const HAZARDS={
 FIRE:{label:'화염 지형',trait:'HEAT',element:'불'},
 FROST:{label:'냉기 지형',trait:'COLD',element:'얼음'},
 LIGHTNING:{label:'낙뢰',trait:'INSULATE',element:'번개'},
 FLOOD:{label:'침수',trait:'WATERPROOF',element:'물'},
 CORROSION:{label:'부식',trait:'ANTITOXIN',element:'미분류'}
};
const RULES={SPREAD:'고르게',FRONT:'전열 우선',BACK:'후열 우선',LEAD:'선두 집중',TAIL:'후미 기습',HIGHEST_ATK:'공격력 높은 대상 저격',HIGHEST_HP:'HP 높은 대상',LOWEST_HP:'약한 대상 마무리'};

api.gearTraits={version:1,catalog:Object.fromEntries(Object.entries(TRAITS).map(([k,t])=>[k,{label:t.label,group:t.group,keyed:!!t.keyed}])),gear:copy(GEAR),classTraits:copy(CLASS_TRAITS),liyueWeapons:copy(LIYUE_WEAPONS),hazards:copy(HAZARDS),rules:copy(RULES),caps:copy(CAPS)};
api.traitCatalog=TRAITS;api.traitGroups=GROUPS;

const old=Object.fromEntries(['equipmentProficiencies','initCombatActor','startBattle','hasAirAccess','damage','combatDamageMultiplier','applyDamage','heal','shield','addCombatStatus','applyCombatControl','newRound','onCombatTurnStart','roundEnd','combatStat','player','apply','actionReason','validateSave','enemyIntel'].map(k=>[k,P[k]]));

// ---- trait lookup -------------------------------------------------------------------------------
P.equipmentProficiencies=function(owner){const list=old.equipmentProficiencies.call(this,owner);if(list?.length||!LIYUE_WEAPONS[owner])return list;return [LIYUE_WEAPONS[owner]];};
P.gearTraitsFor=function(equipId){const row=this.tables['16_EQUIP_DB']?.get(equipId);const out=(GEAR[equipId]||[]).map(x=>x.slice());if(row&&CLASS_TRAITS[row[2]])out.push(...CLASS_TRAITS[row[2]].map(x=>[...x,'CLASS']));const extra=this.extraGearTraits?.(equipId);if(extra)out.push(...extra.map(x=>x.slice()));return out;};
function addTrait(bag,entry){const [key,a,b]=entry,def=TRAITS[key];if(!def)return;if(def.keyed){const k=String(a),v=Number(b)||0;bag[key]=bag[key]||{};bag[key][k]=(bag[key][k]||0)+v;}else{bag[key]=Math.min(CAPS[key]??999,(bag[key]||0)+(Number(a)||0));}}
P.actorTraits=function(owner){const bag={};for(const inv of this.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===owner))for(const t of this.gearTraitsFor(inv.equip))addTrait(bag,t);return bag;};
P.traitLine=function(entry){const [key,a,b]=entry,def=TRAITS[key];if(!def)return '';return def.label+' · '+(def.keyed?def.text(Number(b)||0,String(a)):def.text(Number(a)||0));};
P.gearTraitLines=function(equipId){return this.gearTraitsFor(equipId).map(t=>({key:t[0],label:TRAITS[t[0]]?.label||t[0],group:TRAITS[t[0]]?.group||'',text:this.traitLine(t),innate:t[t.length-1]==='CLASS'}));};
P.traitSummary=function(owner){const bag=this.actorTraits(owner),out=[];for(const [key,v]of Object.entries(bag)){const def=TRAITS[key];if(!def)continue;if(def.keyed)for(const [k,n]of Object.entries(v))out.push({key,label:def.label,text:this.traitLine([key,k,n]),group:def.group});else out.push({key,label:def.label,text:this.traitLine([key,v]),group:def.group});}return out.sort((a,b)=>GROUPS.indexOf(a.group)-GROUPS.indexOf(b.group));};
const tv=(a,key)=>Number(a?.traits?.[key]||0);
const keyed=(a,key,k)=>{const m=a?.traits?.[key];if(!m)return 0;return Number(m[k]||0)+(k!=='ALL'&&m.ALL&&ELEMENTS.includes(k)?Number(m.ALL):0);};
const familyOf=(r,t)=>{if(t.family!==undefined)return t.family;try{return String(r.row('09_MONSTER_DB',t.source)[2]||'');}catch{return '';}};
const armored=(r,t)=>t.armored||t.structure||/유적 기계|태엽|기계/.test(familyOf(r,t))||/방패|갑주|중장갑/.test(String(t.name||''));
const exposed=(r,t)=>!!(st(t,'ENEMY_CHARGE_EXPOSED')||st(t,'BOSS_EXPOSED')||t.enemyCore||t.bossExposed);
P.enemyIsArmored=function(t){return armored(this,t);};P.enemyIsExposed=function(t){return exposed(this,t);};

// ---- battle line order -------------------------------------------------------------------------
P.formationOrder=function(){const active=this.s.party.filter(p=>p.active).map(p=>p.source),order=(this.s.formation||[]).filter(id=>active.includes(id));for(const id of active)if(!order.includes(id))order.push(id);return order;};
P.formationSlots=function(participants){const order=this.formationOrder().filter(id=>participants.includes(id));for(const id of participants)if(!order.includes(id))order.push(id);return Object.fromEntries(order.map((id,i)=>[id,i+1]));};
P.startBattle=function(group,origin='EXPLICIT',options={}){
 const cfg=this.combatStoryConfig?.(group),participants=cfg&&options.confirmed?['PLAYER_CUSTOM',...(options.companions||[])]:this.s.party.filter(p=>p.active).map(p=>p.source);
 const prior=this._formationSlots;this._formationSlots=this.formationSlots(participants);
 let result;try{result=old.startBattle.call(this,group,origin,options);}finally{this._formationSlots=prior;}
 const b=this.s.runtime;if(b&&!b.gearTraitsVersion){b.gearTraitsVersion=1;b.hazards=b.hazards||[];const allies=b.actors.filter(a=>a.side==='ALLY').sort((x,y)=>(x.slot||9)-(y.slot||9)),enemies=b.actors.filter(a=>a.side!=='ALLY');b.actors=[...allies,...enemies];for(const a of enemies){a.family=familyOf(this,a);if(!a.targetRule)a.targetRule=this.defaultEnemyTargetRule(a);}}
 return result;
};
P.initCombatActor=function(a,slot,...rest){const pos=this._formationSlots?.[a.source];const out=old.initCombatActor.call(this,a,pos||slot,...rest)||a;if(out.side==='ALLY'){out.traits=this.actorTraits(out.source);out.traitState={firstHit:false,firstStrike:false};}return out;};

// ---- enemy target rules (used by the weighted pick in runtime_play_fixes.js) --------------------
P.defaultEnemyTargetRule=function(a){if(a.grade==='보스')return 'SPREAD';if(a.range==='근접')return 'FRONT';if(a.range==='원거리'&&a.tactic==='공격우선')return 'BACK';return 'SPREAD';};
P.enemyTargetWeight=function(a,t,alive){
 const rule=a.targetRule||'SPREAD',slots=alive.map(x=>x.slot||1),front=alive.filter(x=>(x.slot||1)<=2);let w=1;
 if(rule==='FRONT'&&front.length)w*=(t.slot||1)<=2?2.2:.45;
 if(rule==='BACK'&&alive.some(x=>(x.slot||1)>=3))w*=(t.slot||1)>=3?1.9:.6;
 if(rule==='LEAD'&&(t.slot||1)===Math.min(...slots))w*=3;
 if(rule==='TAIL'&&(t.slot||1)===Math.max(...slots))w*=3;
 if(rule==='HIGHEST_ATK'&&t===alive.slice().sort((x,y)=>this.combatStat(y,'atk')-this.combatStat(x,'atk'))[0])w*=3;
 if(rule==='HIGHEST_HP'&&t===alive.slice().sort((x,y)=>y.hp-x.hp)[0])w*=3;
 if(rule==='LOWEST_HP'&&t===alive.slice().sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0])w*=3;
 if(rule.startsWith('ELEMENT:')&&(t.tags||[]).includes('['+rule.slice(8)+']'))w*=3;
 const aggro=tv(t,'AGGRO'),stealth=tv(t,'STEALTH');if(aggro)w*=1+aggro/100;if(stealth)w*=Math.max(.15,1-stealth/100);
 return w;
};

// ---- combat hooks ---------------------------------------------------------------------------------
P.hasAirAccess=function(a,t,range){return old.hasAirAccess.call(this,a,t,range)||(!!t?.airborne&&tv(a,'AIR_ACCESS')>0);};
const singleCard=(r,o)=>{if(o.aoe)return false;if(!o.card)return true;const row=r.tables['12_ENEMY_CARD_DB']?.get(o.card)||r.tables['08_SKILL_CARD_DB']?.get(o.card);const mode=String(row?.[31]||'');return !mode||/^(ALLY_1|ENEMY_1|PRIMARY|LOWEST_HP|HIGHEST_HP|SINGLE|TARGET)/.test(mode);};
const heavyHit=(r,k,o)=>{if(o.heavy)return true;if(Number(k)>=1.3)return true;const row=o.card&&(r.tables['12_ENEMY_CARD_DB']?.get(o.card));return /강공|돌진|충돌/.test(String(row?.[4]||'')+String(row?.[25]||''));};
P.coverFor=function(a,t,o){
 const b=this.s.runtime;if(!b||t.side!=='ALLY'||a.side==='ALLY'||o.sourceKind||o.covered||!singleCard(this,o))return null;
 const key=a.id+':'+(b.actionSequence||0)+':'+t.id;b.coverDecisions=b.coverDecisions||{};if(key in b.coverDecisions)return b.actors.find(x=>x.id===b.coverDecisions[key])||null;
 let pick=null;const mates=b.actors.filter(x=>x.side==='ALLY'&&x.id!==t.id&&x.hp>0&&this.combatDistance(x,t)<=1&&!this.combatActionLocked?.(x));
 for(const m of mates.sort((x,y)=>tv(y,'COVER')-tv(x,'COVER')||(x.slot||0)-(y.slot||0))){const shielded=(m.shields||[]).some(s=>s.value>0),chance=Math.min(75,tv(m,'COVER')+(shielded?30:0));if(chance>0&&this.random()*100<chance){pick=m;break;}}
 b.coverDecisions[key]=pick?.id||null;if(Object.keys(b.coverDecisions).length>60)b.coverDecisions={[key]:pick?.id||null};
 return pick;
};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime;if(!b||!t||t.hp<=0)return old.damage.call(this,a,t,k,e,o);
 const cover=this.coverFor(a,t,o);if(cover){b.log.push({actor:cover.name,actorId:cover.id,target:t.name,targetId:t.id,cover:true,text:cover.name+'이(가) '+t.name+' 대신 공격을 받았다.',round:b.round});return this.damage(a,cover,k,e,{...o,covered:true});}
 let hitBonus=o.hitBonus||0;if(a.side==='ALLY'){hitBonus+=tv(a,'PRECISION');if(t.airborne)hitBonus+=Math.round(tv(a,'ANTI_AIR')*2/3);}
 const prior=this._traitHit;this._traitHit={k,heavy:heavyHit(this,k,o),aoe:!!o.aoe||!singleCard(this,o)};
 let result;try{result=old.damage.call(this,a,t,k,e,{...o,hitBonus});}finally{this._traitHit=prior;}
 if(result&&a.side==='ALLY'&&!o.sourceKind){const s=a.traitState||(a.traitState={});s.firstStrike=true;
  const stack=tv(a,'STACK_ATK');if(stack){const cur=st(a,'TRAIT_STACK_ATK'),n=Math.min(3,(cur?.stacks||0)+1);this.addCombatStatus(a,'TRAIT_STACK_ATK',2,{stacks:n,mods:{atk:{pct:stack*n}},traitStatus:true});}
  const proc=tv(a,'PROC_PHYSICAL');if(proc&&t.hp>0&&this.random()*100<proc)this.damage(a,t,.4,'PHYSICAL',{range:'전장',sourceKind:'TRAIT_PROC',noAura:true});}
 return result;
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const element=el(e);
 if(a?.side==='ALLY'&&t?.side!=='ALLY'){
  const fam=familyOf(this,t);for(const [k,v]of Object.entries(a.traits?.SLAYER||{}))if(fam.includes(k)||String(t.name||'').includes(k))n*=1+v/100;
  if(['LARGE','BOSS'].includes(this.combatSize?.(t)||t.size))n*=1+tv(a,'GIANT')/100;
  if(t.airborne)n*=1+tv(a,'ANTI_AIR')/100;
  if(armored(this,t))n*=1+tv(a,'ARMOR_BREAK')/100;
  if(exposed(this,t))n*=1+tv(a,'WEAK_POINT')/100;
  const auras=[t.aura,...(t.auras||[]).map(x=>x.element)].filter(Boolean).map(el);for(const [k,v]of Object.entries(a.traits?.AURA_HUNTER||{}))if(k.split('/').some(x=>auras.includes(x)))n*=1+v/100;
  if(ELEMENTS.includes(element))n*=1+(keyed(a,'ELEMENT_BOOST',element))/100;
  if(!o.sourceKind&&!a.traitState?.firstStrike)n*=1+tv(a,'FIRST_STRIKE')/100;
 }
 if(t?.side==='ALLY'&&a?.side!=='ALLY'){
  const res=keyed(t,'ELEMENT_RES',element)+({불:tv(t,'HEAT'),얼음:tv(t,'COLD'),번개:tv(t,'INSULATE'),물:tv(t,'WATERPROOF')}[element]||0)/3;n*=Math.max(.3,1-res/100);
  const hit=this._traitHit;if(hit?.aoe)n*=1-tv(t,'AOE_GUARD')/100;if(hit?.heavy){n*=1-tv(t,'HEAVY')/100;n*=1+tv(t,'LIGHT')/100;}
  if(!o.sourceKind&&t.traitState&&!t.traitState.firstHit&&tv(t,'FIRST_GUARD')){n*=1-tv(t,'FIRST_GUARD')/100;t.traitState.firstHit=true;}
 }
 return n;
};
P.applyDamage=function(a,t,n,details={}){
 const b=this.s.runtime;let amount=n;
 if(a?.side==='ALLY'&&t?.side!=='ALLY'&&(t.shields||[]).some(s=>s.value>0)&&tv(a,'SHIELD_BREAK'))details={...details,shieldDamageMultiplier:(Number(details.shieldDamageMultiplier)||1)*(1+tv(a,'SHIELD_BREAK')/100)};
 if(t?.side==='ALLY'&&['REACTION_DOT','ENEMY_DOT'].includes(details.sourceKind)){const kind=Object.entries(HAZARDS).find(([,h])=>h.element===el(details.element))?.[0];amount=Math.round(amount*(1-this.hazardMitigation(t,kind)/100));}
 const hadHp=t?.hp>0,result=old.applyDamage.call(this,a,t,amount,details);
 if(b&&hadHp&&t.hp<=0&&a?.side==='ALLY'&&t.side!=='ALLY'){const heal=tv(a,'ON_KILL_HEAL');if(heal&&a.hp>0)this.heal(a,heal,'처치 회복');}
 return result;
};
P.heal=function(a,amount,source=''){const boost=a?.side==='ALLY'?tv(a,'HEAL_BOOST'):0;return old.heal.call(this,a,boost?amount*(1+boost/100):amount,source);};
P.shield=function(a,value,source,rounds,extra={}){const boost=a?.side==='ALLY'?tv(a,'SHIELD_BOOST'):0;return old.shield.call(this,a,boost?value*(1+boost/100):value,source,rounds,extra);};
const CONTROL=new Set(['STATUS_FREEZE','STATUS_STUN','LIFTED','STATUS_SLOW']);
P.addCombatStatus=function(a,id,rounds,extra={}){
 const b=this.s.runtime;
 if(b&&a?.side==='ALLY'&&CONTROL.has(id)&&!extra.traitStatus&&!extra.selfApplied){
  const res=tv(a,'CONTROL_RES')+(id==='STATUS_SLOW'||id==='STATUS_FREEZE'?Math.round(tv(a,'COLD')/4):0);
  if(res>0&&this.random()*100<Math.min(75,res)){b.log.push({target:a.name,targetId:a.id,resisted:id,text:a.name+' · 행동 방해 저항',round:b.round});return null;}
 }
 return old.addCombatStatus.call(this,a,id,rounds,extra);
};
P.applyCombatControl=function(a,t,kind,o={}){
 const b=this.s.runtime;
 if(t?.side==='ALLY'&&/PUSH|PULL|KNOCKBACK/.test(kind)){const res=tv(t,'HEAVY')>0?100:tv(t,'STAGGER_RES');if(res>=100||(res>0&&this.random()*100<res)){b?.log.push({target:t.name,targetId:t.id,resisted:kind,text:t.name+' · 경직 저항',round:b.round});return false;}}
 return old.applyCombatControl.call(this,a,t,kind,o);
};
P.newRound=function(...args){const b=this.s.runtime;if(b)for(const a of b.actors.filter(x=>x.side==='ALLY'&&x.nextScorePenalty)){const r=Math.min(100,tv(a,'STAGGER_RES'));if(r)a.nextScorePenalty=Math.round(a.nextScorePenalty*(1-r/100));}return old.newRound.apply(this,args);};
const DEBUFFS=['STATUS_SLOW','STATUS_DEF_DOWN','PHYS_VULN','HAZARD_WET','HAZARD_CORRODED','STATUS_BLEED','OMEN'];
P.onCombatTurnStart=function(a){
 const out=old.onCombatTurnStart?.call(this,a),p=tv(a,'PURIFY');
 if(a?.side==='ALLY'&&p&&a.hp>0){const bad=(a.statuses||[]).find(s=>DEBUFFS.includes(s.id)||s.tickDamage);if(bad&&this.random()*100<p){a.statuses=a.statuses.filter(s=>s!==bad);this.s.runtime.log.push({target:a.name,targetId:a.id,purified:bad.id,text:a.name+' · 정화',round:this.s.runtime.round});}}
 return out;
};
P.combatStat=function(a,key){let n=old.combatStat.call(this,a,key);if(key==='crit'&&a?.side==='ALLY'&&tv(a,'HIGH_HP_CRIT')&&a.hp/a.maxHp>=.9)n+=tv(a,'HIGH_HP_CRIT');return n;};
// The Isekai protagonist can carry any weapon class; the class decides how far the attack reaches.
const RANGE={활:'원거리',법구:'중거리',장병기:'중거리',한손검:'근접',양손검:'근접'};
P.player=function(){const a=old.player.call(this);if(this.s.global.STORY_ROUTE_ID==='ROUTE_ISEKAI'){const w=this.s.inventory.find(i=>i.equip&&i.equipped&&i.owner==='PLAYER_CUSTOM'&&WEAPONS.includes(this.tables['16_EQUIP_DB']?.get(i.equip)?.[2]));const type=w&&this.tables['16_EQUIP_DB'].get(w.equip)[2];if(type&&RANGE[type])a.range=RANGE[type];}return a;};

// ---- hazards --------------------------------------------------------------------------------------
P.hazardMitigation=function(t,kind){const h=HAZARDS[kind];return Math.min(90,(h?tv(t,h.trait):0)+tv(t,'DOT'));};
P.addHazard=function(h){const b=this.s.runtime;if(!b)return null;if(!HAZARDS[h.kind])fail('HAZARD','알 수 없는 지형 효과입니다.');b.hazards=b.hazards||[];const entry={id:h.id||h.kind,kind:h.kind,label:h.label||HAZARDS[h.kind].label,power:Number(h.power)||.06,rounds:Number.isFinite(h.rounds)?h.rounds:null,targets:h.targets||'ALL',source:h.source||null,status:h.status!==false,createdRound:b.round,startsRound:h.startsRound||b.round};const prior=b.hazards.findIndex(x=>x.id===entry.id);if(prior>=0)b.hazards[prior]=entry;else b.hazards.push(entry);b.log.push({hazard:entry.kind,text:entry.label+' 발생'+(entry.rounds?' · '+entry.rounds+'R':''),round:b.round,sourceKind:'HAZARD'});return entry;};
P.hazardTargets=function(h){const b=this.s.runtime,allies=b.actors.filter(a=>a.side==='ALLY'&&a.hp>0).sort((x,y)=>(x.slot||0)-(y.slot||0));const t=String(h.targets||'ALL');
 if(t==='FRONT')return allies.filter(a=>(a.slot||1)<=2);if(t==='BACK')return allies.filter(a=>(a.slot||1)>=3);if(t==='LEAD')return allies.slice(0,1);if(t==='TAIL')return allies.slice(-1);
 if(t.startsWith('RANDOM:')){const n=Number(t.slice(7))||1,pool=allies.slice(),out=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(this.random()*pool.length),1)[0]);return out;}
 return allies;};
P.tickHazards=function(){const b=this.s.runtime;if(!b?.hazards?.length)return;
 for(const h of b.hazards){if(h.startsRound>b.round)continue;const def=HAZARDS[h.kind],src={id:'HAZARD:'+h.id,source:'HAZARD',name:h.label,side:'ENEMY',level:1,hp:1,maxHp:1,statuses:[],shields:[],cooldowns:{},traits:{}};
  for(const t of this.hazardTargets(h)){const mit=this.hazardMitigation(t,h.kind),dmg=Math.max(1,Math.round(t.maxHp*h.power*(1-mit/100)));this.applyDamage(src,t,dmg,{element:def.element,sourceKind:'HAZARD',hazard:h.kind,mitigated:mit});
   if(!h.status||t.hp<=0)continue;const steady=tv(t,'TERRAIN_STEADY')>0;
   if(h.kind==='FROST'&&!steady&&tv(t,'COLD')<50)this.addCombatStatus(t,'STATUS_SLOW',1,{value:-10,hazard:true});
   if(h.kind==='FLOOD'&&!steady&&tv(t,'WATERPROOF')<50){this.addCombatStatus(t,'HAZARD_WET',1,{mods:{spd:{flat:-6},eva:{flat:-5}},hazard:true});t.aura='물';}
   if(h.kind==='CORROSION'&&tv(t,'ANTITOXIN')<50)this.addCombatStatus(t,'HAZARD_CORRODED',2,{mods:{def:{pct:-15}},hazard:true});}}
 for(const h of b.hazards)if(Number.isFinite(h.rounds)&&h.startsRound<=b.round)h.rounds--;
 b.hazards=b.hazards.filter(h=>!Number.isFinite(h.rounds)||h.rounds>0);
};
P.roundEnd=function(...args){const b=this.s.runtime;if(b?.hazards?.length&&b.actors.some(a=>a.side==='ENEMY'&&a.hp>0))this.tickHazards();return old.roundEnd.apply(this,args);};
P.hazardView=function(){const b=this.s.runtime;return (b?.hazards||[]).map(h=>({id:h.id,kind:h.kind,label:h.label,rounds:h.rounds,targets:h.targets,power:h.power,trait:TRAITS[HAZARDS[h.kind].trait].label,pending:h.startsRound>b.round}));};

// ---- actions and saves -------------------------------------------------------------------------------
P.actionReason=function(type,a={}){if(type==='FORMATION_SET'){if(this.s.runtime)return '전투 중에는 대열을 바꿀 수 없습니다.';return old.actionReason.call(this,'PARTY_SWAP',a);}return old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a.type==='FORMATION_SET'){const now=this.formationOrder(),next=Array.isArray(a.order)?a.order.map(String):null;if(!next||next.length!==now.length||new Set(next).size!==next.length||next.some(id=>!now.includes(id)))fail('FORMATION','현재 파티원 전원의 순서를 정해 주세요.');this.s.formation=next;return {formation:next.slice()};}
 const result=old.apply.call(this,a);if(this.s?.formation&&/^PARTY/.test(a.type))this.s.formation=this.formationOrder();return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s;
 if(out.formation!==undefined&&(!Array.isArray(out.formation)||out.formation.length>4||out.formation.some(x=>typeof x!=='string')||new Set(out.formation).size!==out.formation.length))fail('FORMATION_SAVE','대열 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.hazards!==undefined&&(!Array.isArray(b.hazards)||b.hazards.some(h=>!HAZARDS[h?.kind]||!Number.isFinite(h.power))))fail('HAZARD_SAVE','지형 효과 기록이 올바르지 않습니다.');
 return out;
};
if(old.enemyIntel)P.enemyIntel=function(id){const info=old.enemyIntel.call(this,id),a=this.combatActor?.(id);if(!info||!a)return info;info.targetRule=a.targetRule||'SPREAD';info.targetRuleLabel=RULES[info.targetRule]||(info.targetRule.startsWith('ELEMENT:')?info.targetRule.slice(8)+' 원소 캐릭터 우선':info.targetRule);info.armored=armored(this,a);info.exposed=exposed(this,a);return info;};
P.gearTraitsVersion=1;api.gearTraitsVersion=1;
})(globalThis);
