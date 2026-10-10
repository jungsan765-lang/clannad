'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','dendro');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});
const fs=require('node:fs'),assert=require('node:assert/strict');
const {env,arena,packet,cp}=require('./probe.cjs'),E=env(),rows=[];
function state(A){return {auras:cp(A.target.auras),statuses:cp(A.target.statuses),cores:A.b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length};}
for(const element of ['물','불']){
 const A=arena(E,20);A.r.setAura(A.target,'풀');A.r.applyCombatAura(A.p,A.target,'번개');const before=state(A),rx=A.r.applyCombatAura(A.p,A.target,element);rows.push({name:'native_created_quicken_'+element,selected:rx?.[0],before,after:state(A),electroAfter:A.r.reactionFor(A.target,'번개')?.[0]});
}
for(const element of ['물','불']){
 const A=arena(E,20);A.r.addCombatStatus(A.target,'QUICKEN',2);const before=state(A),rx=A.r.applyCombatAura(A.p,A.target,element);rows.push({name:'status_only_quicken_'+element,selected:rx?.[0]||null,before,after:state(A)});
}
for(const level of [20,40,60])for(const dead of [false,true]){
 const A=arena(E,level,1,['LIYUE_ZIBAI','LIYUE_NINGGUANG','MOND_BARBARA']),n=A.actor('LIYUE_NINGGUANG'),z=A.actor('LIYUE_ZIBAI');if(dead)z.hp=0;A.r.setAura(A.target,'물');const pk=packet(A.r,()=>A.r.damage(n,A.target,.65,'바위',{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'}));rows.push({name:'lunar_crystal',level,dead,base:A.r.reactionBase(n),packets:pk,shields:cp(n.shields)});
}
fs.writeFileSync(require('node:path').join(reviewOutputDir,'edges.json'),JSON.stringify({readOnly:true,fingerprint:E.fingerprint,rows},null,2));console.log(JSON.stringify(rows.map(x=>({name:x.name,level:x.level,dead:x.dead,selected:x.selected,quickenAfter:x.after?.statuses.some(s=>s.id==='QUICKEN'),cores:x.after?.cores,damage:x.packets?.map(x=>({reaction:x.reaction,n:x.damage})),shield:x.shields?.reduce((s,x)=>s+x.value,0)})),null,2));
