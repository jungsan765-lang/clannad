/* 0.15.2 변이 보스 (user: 「보상 살짝 올라가고 변이보스 내는거? 나쁘지 않다」). Every week (Monday 00:00, Korean time) each of
 * the nine field bosses and the four daily bosses carries two or three extra rules picked for that week — the same for
 * everyone, so adventurers can talk about this week's Dvalin. A fight is as usual unless the player chooses 「변이 도전」
 * (BOSS_ROUTE / MOND_MATERIAL_CHALLENGE / LIYUE_ARTIFACT_CHALLENGE with mutation:true): then the rules apply, and a win
 * pays 30% more Mora and experience and one more of the boss's material (a daily boss: one more book or crystal).
 * Mutated fights share the usual limits (field bosses 3 wins in 12 hours, daily bosses one entry a day).
 * Load after every boss module (runtime_field_bosses.js … runtime_premium_v0148.js); wrappers here run last. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.premiumV0148||!api.fieldBosses||P.mutationsV0152)return;P.mutationsV0152=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const weekOf=api.premiumV0148.weekOf,KST=9*3600000,DAY=86400000,WEEK=7*DAY;
const KO={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'},ko=e=>KO[e]||e||'물리';
const ELEMENTS=['불','물','얼음','번개','바람','바위','풀','물리'],BONUS=.3;
const hash=s=>{let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;};
// The element a boss needs broken (its shell, prisms, pillars) is never the one it resists.
const KEYS={CRYO_VINE:['불'],PYRO_VINE:['물','얼음'],ELECTRO:['불','얼음','풀'],GEO_HYPO:['바위'],CRYO_HYPO:['불']};
const FB=api.fieldBosses.bosses;
const BOSSES={
 ...Object.fromEntries(Object.entries(FB).map(([id,d])=>[id,{name:d.name,kind:'FIELD',region:d.region,body:d.kind==='OCEANID'?'FORMS':'BODY',summons:['ELECTRO','GEO_HYPO','OCEANID'].includes(d.kind),shell:['CRYO_VINE','PYRO_VINE'].includes(d.kind),immune:d.immune.slice(),keys:KEYS[d.kind]||[],items:{[d.material]:1}}])),
 BOSS_ANDRIUS:{name:'안드리우스',kind:'DAILY',region:'몬드',body:'BODY',immune:[],keys:[],items:{MAT_CHAR_EXP_HERO:1}},
 BOSS_DVALIN:{name:'드발린',kind:'DAILY',region:'몬드',body:'BODY',immune:[],keys:[],items:{MAT_CHAR_EXP_HERO:1}},
 LIYUE_TARTAGLIA_FARM:{name:'타르탈리아',kind:'DAILY',region:'리월',body:'BODY',immune:[],keys:[],items:{MAT_CHAR_EXP_HERO:1}},
 LIYUE_AZHDAHA_FARM:{name:'야타용왕',kind:'DAILY',region:'리월',body:'BODY',immune:[],keys:[],items:{MAT_AZHDAHA_ARTIFACT_CRYSTAL:1}}
};
const MODS={
 FURY:{label:'분노',text:()=>'공격력 +25%',fits:()=>true},
 IRONHIDE:{label:'강철 비늘',text:()=>'방어력 +30%',fits:b=>b.body==='BODY'},
 GIANT:{label:'거대화',text:()=>'최대 HP +30%',fits:b=>b.body==='BODY'},
 RESIST:{label:'원소 내성',text:e=>e+' 피해를 40% 덜 받음',fits:b=>b.body==='BODY',element:true},
 WEAK:{label:'약점 노출',text:e=>e+' 피해를 30% 더 받음',fits:b=>b.body==='BODY',element:true},
 REFLECT:{label:'원소 반사',text:e=>e+' 공격을 맞으면 그 피해의 20%를 공격한 동료에게 되돌림',fits:b=>b.body==='BODY',element:true},
 SECOND_WIND:{label:'두 번째 숨결',text:()=>'HP가 처음 50% 아래로 떨어지면 최대 HP 20%를 회복하고 공격력 +15%',fits:b=>b.body==='BODY'},
 REGEN:{label:'재생',text:()=>'라운드가 끝날 때마다 최대 HP 3% 회복',fits:b=>b.body==='BODY'},
 BARRIER:{label:'원소 장벽',text:()=>'최대 HP 15%의 보호막을 두르고 시작',fits:b=>b.body==='BODY'&&!b.shell},
 SUMMONS:{label:'소환 강화',text:()=>'불러내는 소환물의 HP·공격력 +50%',fits:b=>!!b.summons}
};
api.mutationsV0152={bosses:copy(BOSSES),mods:Object.fromEntries(Object.entries(MODS).map(([k,m])=>[k,{label:m.label,element:!!m.element}])),bonus:BONUS};
const old=Object.fromEntries(['apply','actionReason','startBattle','applyDamage','combatDamageMultiplier','roundEnd','fbSummon','finishBattle','validateSave'].map(k=>[k,P[k]]));
const describe=m=>({...m,label:MODS[m.id].label,text:MODS[m.id].text(m.element)});
// This week's rules for one boss: two or three, picked from the ones that fit it.
function pick(key,week){
 const b=BOSSES[key],pool=Object.keys(MODS).filter(m=>MODS[m].fits(b));let x=hash('MUT|'+week+'|'+key);const n=2+(x%2),ids=[];
 while(ids.length<n&&pool.length){x=hash(x+':'+ids.length);ids.push(pool.splice(x%pool.length,1)[0]);}
 const mods=[];
 for(const id of ids){
  if(!MODS[id].element){mods.push({id});continue;}
  const ok=ELEMENTS.filter(e=>!b.immune.includes(e)&&!(id==='RESIST'&&b.keys.includes(e))&&!mods.some(m=>m.element===e));x=hash(x+':'+id);mods.push({id,element:ok[x%ok.length]});
 }
 return mods;
}
P.mutationNow=function(){return Number(this.actionStartedAt??Date.now());};
P.mutationWeek=function(){return weekOf(this.mutationNow());};
P.mutationOf=function(key,week=this.mutationWeek()){
 const b=BOSSES[key];if(!b)return null;const now=this.mutationNow(),ends=(week+1)*WEEK-KST-3*DAY,rec=this.s.mutations;
 return {key,name:b.name,kind:b.kind,region:b.region,week,endsAt:ends,hoursLeft:Math.max(0,Math.ceil((ends-now)/3600000)),mods:pick(key,week).map(describe),bonus:{rate:BONUS,items:copy(b.items)},wins:rec?.week===week?Number(rec.wins?.[key]||0):0};
};
P.mutationList=function(){return Object.keys(BOSSES).map(k=>this.mutationOf(k));};
// Which boss an entry action is for, if it can be fought mutated.
const ENTRY={
 BOSS_ROUTE:a=>{const r=String(a.route||'');return r.startsWith('BRT_')&&FB[r.slice(4)]?r.slice(4):null;},
 MOND_MATERIAL_CHALLENGE:a=>BOSSES[a.boss]&&BOSSES[a.boss].kind==='DAILY'?a.boss:null,
 LIYUE_ARTIFACT_CHALLENGE:a=>BOSSES['LIYUE_'+a.kind+'_FARM']?'LIYUE_'+a.kind+'_FARM':null
};
P.actionReason=function(type,a={}){
 if(ENTRY[type]&&a?.mutation!==undefined){if(typeof a.mutation!=='boolean')return '변이 도전 여부를 확인해 주세요.';if(a.mutation&&!ENTRY[type](a))return '이번 주 변이가 없는 상대입니다.';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(!a||!ENTRY[a.type])return old.apply.call(this,a);
 const key=ENTRY[a.type](a);if(a.mutation===true&&!key)fail('MUTATION','이번 주 변이가 없는 상대입니다.');
 this._mutation=a.mutation===true?key:null;
 // A field boss lost in a mutated fight is retried mutated (BOSS_CONTINUE), like the ley lines keep their step.
 try{const out=old.apply.call(this,a),p=this.s.bossRouteProgress;if(a.type==='BOSS_ROUTE'&&p&&p.route===a.route)p.mutation=a.mutation===true;return out;}finally{this._mutation=null;}
};
const isBoss=(rt,a)=>a.side==='ENEMY'&&(a.fb||rt.row('09_MONSTER_DB',a.source)?.[3]==='보스');
const boost=(a,k)=>{a.maxHp=Math.max(1,Math.round(a.maxHp*k));a.hp=a.maxHp;for(const s of a.shields||[])if(Number.isFinite(s.value)){s.value=Math.round(s.value*k);if(Number.isFinite(s.initialValue))s.initialValue=Math.round(s.initialValue*k);}};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 if(!b||b===before||b.mutation||b.storyConfig)return out;
 const o=String(origin),p=this.s.bossRouteProgress;let key=null;
 if(o.startsWith('BOSS:')){const route=o.slice(5),id=route.startsWith('BRT_')?route.slice(4):'';if(FB[id]&&(this._mutation===id||(p?.route===route&&p.mutation===true)))key=id;}
 else if(o.startsWith('MATERIAL_CHALLENGE:')){const id=o.slice('MATERIAL_CHALLENGE:'.length);if(BOSSES[id]&&this._mutation===id)key=id;}
 if(!key)return out;
 const week=this.mutationWeek(),mods=pick(key,week),has=id=>mods.some(m=>m.id===id);
 for(const t of b.actors.filter(a=>isBoss(this,a))){
  t.mutant=true;
  if(has('GIANT'))boost(t,1.3);if(has('FURY'))t.atk=Math.round(t.atk*1.25);if(has('IRONHIDE'))t.def=Math.round(t.def*1.3);
  if(has('BARRIER'))this.shield(t,Math.round(t.maxHp*.15),'MUTATION_BARRIER',null,{});
 }
 if(has('SUMMONS'))for(const s of b.actors.filter(a=>a.fbSummon)){boost(s,1.5);s.atk=Math.round(s.atk*1.5);}
 b.mutation={version:1,key,week,mods:copy(mods),secondWind:false};
 b.log.push({card:'MUTATION',cardName:'변이',text:BOSSES[key].name+' · 이번 주 변이 · '+mods.map(m=>MODS[m.id].label+(m.element?'('+m.element+')':'')).join(' · '),round:b.round});
 if(b.encounter){b.encounter.label='변이 도전';b.encounter.text=BOSSES[key].name+'에게 이번 주 변이('+mods.map(m=>MODS[m.id].label+(m.element?' · '+m.element:'')).join(', ')+')가 붙었습니다. 이기면 경험치·모라 +'+Math.round(BONUS*100)+'%와 재료 1개를 더 받습니다.';}
 return out;
};
// Later summons of a mutated boss.
if(old.fbSummon)P.fbSummon=function(b,boss,id,extra={}){const a=old.fbSummon.call(this,b,boss,id,extra);if(a&&b?.mutation?.mods?.some(m=>m.id==='SUMMONS')){boost(a,1.5);a.atk=Math.round(a.atk*1.5);}return a;};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const m=this.s.runtime?.mutation;if(!m||!t?.mutant||a?.side!=='ALLY')return n;
 const el=ko(e);for(const x of m.mods){if(x.id==='RESIST'&&x.element===el)n*=.6;if(x.id==='WEAK'&&x.element===el)n*=1.3;}
 return n;
};
P.applyDamage=function(a,t,n,d={}){
 const b=this.s.runtime,m=b?.mutation;if(!m||!t?.mutant)return old.applyDamage.call(this,a,t,n,d);
 const dealt=old.applyDamage.call(this,a,t,n,d),reflect=m.mods.find(x=>x.id==='REFLECT');
 if(reflect&&a?.side==='ALLY'&&a.hp>0&&dealt>0&&ko(d.element)===reflect.element&&!['REACTION_DOT','MUTATION_REFLECT','ABYSS_REFLECT','ABYSS_FIXED'].includes(d.sourceKind))
  old.applyDamage.call(this,t,a,Math.max(1,Math.round(dealt*.2)),{element:'반사',sourceKind:'MUTATION_REFLECT',card:'MUTATION_REFLECT'});
 if(m.mods.some(x=>x.id==='SECOND_WIND')&&!m.secondWind&&t.hp>0&&t.hp<t.maxHp*.5&&!t.fb?.revival){
  m.secondWind=true;const healed=Math.min(t.maxHp-t.hp,Math.round(t.maxHp*.2));t.hp+=healed;t.atk=Math.round(t.atk*1.15);
  b.log.push({target:t.name,targetId:t.id,heal:healed,card:'MUTATION_SECOND_WIND',cardName:'두 번째 숨결',text:t.name+'이(가) 두 번째 숨결을 내쉬었다 · HP '+healed+' 회복 · 공격력 +15%',round:b.round});
 }
 return dealt;
};
P.roundEnd=function(...args){
 const b=this.s.runtime,m=b?.mutation;
 if(m?.mods.some(x=>x.id==='REGEN')&&b.actors.some(a=>a.side==='ALLY'&&a.hp>0))for(const t of b.actors.filter(a=>a.mutant&&a.hp>0&&!a.fb?.revival))this.heal(t,t.maxHp*.03,'변이 · 재생');
 return old.roundEnd.apply(this,args);
};
// A win pays 30% more Mora and experience and one more material; every copy of the result says so.
P.finishBattle=function(victory){
 const b=this.s.runtime,m=b?.mutation?copy(b.mutation):null,allies=m?b.actors.filter(a=>a.side==='ALLY'&&!a.guest).map(a=>a.source):[],noRewards=!!b?.storyConfig?.noRewards;
 const result=old.finishBattle.call(this,victory);if(!m||!result||typeof result!=='object')return result;
 const B=BOSSES[m.key],info={key:m.key,name:B.name,week:m.week,mods:m.mods.map(describe),victory:!!victory,bonus:null};
 let bonus={xp:0,mora:0,items:{}};
 if(victory&&!noRewards){
  bonus={xp:Math.round((Number(result.xp)||0)*BONUS),mora:Math.round((Number(result.mora)||0)*BONUS),items:copy(B.items)};
  if(bonus.xp)for(const src of allies)this.addXp(src,bonus.xp);if(bonus.mora)this.s.global.MORA+=bonus.mora;for(const [id,n] of Object.entries(bonus.items))this.giveItem(id,n);
  info.bonus=copy(bonus);
  const w=m.week,rec=this.s.mutations?.version===1?this.s.mutations:(this.s.mutations={version:1,week:w,wins:{},total:0,ever:{}});
  if(rec.week!==w){rec.week=w;rec.wins={};}rec.wins[m.key]=(rec.wins[m.key]||0)+1;rec.total=(rec.total||0)+1;rec.ever??={};rec.ever[m.key]=(rec.ever[m.key]||0)+1;
 }
 const add=x=>{if(!x||typeof x!=='object')return;x.xp=(Number(x.xp)||0)+bonus.xp;x.mora=(Number(x.mora)||0)+bonus.mora;x.loot={...(x.loot||{})};for(const [id,n] of Object.entries(bonus.items))x.loot[id]=(x.loot[id]||0)+n;x.mutation=copy(info);};
 const key=result.battleId||result.id;add(result);
 if(this.s.combatReceipts?.[key]&&this.s.combatReceipts[key]!==result)add(this.s.combatReceipts[key]);
 let settled=null;try{settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{}
 if(settled&&(settled.battleId||settled.id)===key){add(settled);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);}
 const log=this.s.log.findLast(x=>(x?.battleId||x?.id)===key);if(log&&log!==result)add(log);
 return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,bad=()=>fail('MUTATION_SAVE','변이 보스 기록이 올바르지 않습니다.');
 const m=out.runtime?.mutation;
 if(m!==undefined&&m!==null&&(m.version!==1||!BOSSES[m.key]||!Number.isInteger(m.week)||!Array.isArray(m.mods)||m.mods.length>3||m.mods.some(x=>!MODS[x?.id]||(MODS[x.id].element?!ELEMENTS.includes(x.element):x.element!==undefined))||typeof m.secondWind!=='boolean'))bad();
 const r=out.mutations;
 if(r!==undefined&&(!r||r.version!==1||!Number.isInteger(r.week)||!r.wins||typeof r.wins!=='object'||Object.entries(r.wins).some(([k,n])=>!BOSSES[k]||!Number.isInteger(n)||n<0)||!Number.isInteger(r.total)||r.total<0||(r.ever!==undefined&&(!r.ever||typeof r.ever!=='object'||Object.entries(r.ever).some(([k,n])=>!BOSSES[k]||!Number.isInteger(n)||n<0)))))bad();
 return out;
};
})(globalThis);
