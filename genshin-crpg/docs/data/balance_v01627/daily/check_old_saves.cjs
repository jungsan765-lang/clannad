'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];},oldRoot=path.resolve(arg('--old-root')||'.'),newRoot=path.resolve(arg('--new-root')||'.'),out=path.resolve(arg('--out')||'old_save_compatibility.json'),cases=path.resolve(arg('--cases')||path.join(__dirname,'baseline_cases.json')),H=require(oldRoot+'/tools/audit_protagonist_v01618.cjs');
const realNow=Date.now,fixedClock=Date.parse('2026-10-10T16:04:00Z');Date.now=()=>fixedClock;
const old=H.load(oldRoot),cur=H.load(newRoot),rows=[];
const specs=JSON.parse(fs.readFileSync(cases)).filter(s=>s.strategy==='PREPARED');
for(const s of specs){
 const r=H.setup(old,s);for(const f of['FLAG_BOSS_ANDRIUS_CLEAR','FLAG_BOSS_DVALIN_CLEAR'])r.s.flags[f]=true;const ar=r.tables['35_BOSS_ROUTE_DB'].get('BRT_AZHDAHA');if(ar?.[13])r.s.flags[ar[13]]=true;
 r.action(s.action,s.args);const save=JSON.parse(r.serialize());assert.equal(save.runtime.enemyBalanceRevision,undefined);const a=new old.R(old.db,save),b=new cur.R(cur.db,save);assert.deepEqual(JSON.parse(b.serialize()),JSON.parse(a.serialize()));
 H.observe(old,a);H.observe(cur,b);const ao=H.play(a),bo=H.play(b);assert.deepEqual(bo,ao);assert.deepEqual(b._auditLast,a._auditLast);assert.deepEqual(JSON.parse(b.serialize()),JSON.parse(a.serialize()));
 rows.push({boss:s.boss,team:s.team,actualConstellations:Object.fromEntries(['PLAYER_CUSTOM',...s.team].map(id=>[id,r.constellationLevel(id)])),oldBattleId:save.runtime.id,oldRevision:null,oldStats:save.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,hp:a.hp,atk:a.atk,def:a.def,level:a.level})),result:ao,finalKo:a._auditLast.actors.filter(a=>a.side==='ALLY'&&a.hp<=0).map(a=>a.source),checks:['save load exact','public full battle result exact','pre-reward actors and log exact','full final save and RNG exact']});console.log(s.boss,s.investment,ao.victory,ao.rounds);
}
fs.writeFileSync(out,JSON.stringify({clock:fixedClock,clockPolicy:'Identical fixed real clock in both comparison VM engines, including native defeat cooldown; no battle HP/action/stat overrides.',oldFingerprint:old.fingerprint,newFingerprint:cur.fingerprint,conditions:rows.length,rows},null,2)+'\n');

Date.now=realNow;
