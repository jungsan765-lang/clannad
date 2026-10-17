'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','dendro');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});
const fs=require('node:fs'),path=require('node:path');const {env,cp}=require('./probe.cjs');
const root=process.env.CRPG_AUDIT_ROOT||require('node:path').resolve(__dirname,'../../../..'),H=require('../helpers/audit_protagonist_v01618.cjs');
const level=Number(process.argv[2]),mode=process.argv[3],E=env(mode),variant=process.argv[4]==='variant',file=path.join(reviewOutputDir,`campaign_${variant?'variant_':''}${mode}_${level}.json`);
let setups=[
 {name:'burning',team:['LIYUE_YAOYAO','LIYUE_XIANGLING','MOND_KAEYA'],intended:['RX_BURNING','RX_MELT_PYRO','RX_MELT_CRYO']},
 {name:'bloom',team:['LIYUE_YAOYAO','LIYUE_XINGQIU','MOND_BARBARA'],intended:['RX_BLOOM']},
 {name:'hyperbloom',team:['LIYUE_YAOYAO','LIYUE_XINGQIU','MOND_FISCHL'],intended:['RX_BLOOM','RX_HYPERBLOOM']},
 {name:'burgeon',team:['LIYUE_YAOYAO','MOND_BARBARA','LIYUE_XIANGLING'],intended:['RX_BLOOM','RX_BURGEON']},
 {name:'quicken',team:['LIYUE_YAOYAO','MOND_LISA','MOND_FISCHL'],intended:['RX_QUICKEN','RX_AGGRAVATE','RX_SPREAD']}
];
if(variant)setups=[{name:'hyperbloom_lisa',team:['LIYUE_YAOYAO','LIYUE_XINGQIU','MOND_LISA'],intended:['RX_BLOOM','RX_HYPERBLOOM']},{name:'burgeon_diluc',team:['LIYUE_YAOYAO','LIYUE_XINGQIU','MOND_DILUC'],intended:['RX_BLOOM','RX_BURGEON']}];
const originalObserve=H.observe; // campaign captures module-local observe; capture the real last logs through inherited finishBattle.
const originalFinish=E.R.prototype.finishBattle;
E.R.prototype.finishBattle=function(win){const b=this.s.runtime;if(b){this._dendroAudit??={battles:[]};const counts={},damage={};for(const e of b.log||[]){if(e.reaction&&e.reactionName)counts[e.reaction]=(counts[e.reaction]||0)+1;if(e.reaction&&Object.hasOwn(e,'damage'))damage[e.reaction]=(damage[e.reaction]||0)+Number(e.damage||0);}
 this._dendroAudit.battles.push({win,rounds:b.round,origin:b.origin,isMain:!!b.growthDomain,counts,damage,log:cp(b.log),coresEnd:b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length});}return originalFinish.call(this,win);};
// Native wrapper captures after full campaign and no recovery is forced beyond helper's actual <=50% policy.
let auditContext;const OriginalR=E.R;E.R=class extends OriginalR{constructor(...args){super(...args);auditContext=this;}};
const out={mode,level,variant,fingerprint:E.fingerprint,assumptions:{readOnly:true,nativeActions:true,comparison:'same initial party, level, legal phase, craft+6 weapons/armor/healer brooch, talents floor(65%cap), same baseline/candidate, C0/no artifacts, actual DOMAIN_START; 4 consecutive main fights with XP/HP/PRNG/recovery/road encounters carried; in-memory candidate only three rules.',confound:'Current native healing, Traveler Anemo and party AI unchanged; samples do not prove universal reaction balance. Separate acquisition/real human time absent.'},rows:[],errors:[]};
for(const spec of setups)for(const seed of [717,4242]){try{
 const row=H.campaign(E,{...spec,level,domain:(level<=25?'FORSAKEN_RIFT:':'TAISHAN_MANSION:')+level,route:'ROUTE_TRAVELER',seed,gear:'craft',enhance:6,talent:Math.max(1,Math.floor(E.api.growthV01522.talentCaps[E.api.growthV01522.phaseFor(level)]*.65))},{runs:4,finishAtInn:false});
 if(row.stopReason==='RUNS_COMPLETED'){const rest=H.recover(E,auditContext,{finishAtInn:true});row.recoveries.push(rest);row.seconds+=rest.seconds||0;row.lodgingMora+=rest.lodgingMora||0;row.endpoint=rest.endpoint;if(rest.failed)row.stopReason=rest.reason;row.finalHp=H.hp(auditContext);row.finalHpRatio=row.finalHp.reduce((s,a)=>s+a.hp,0)/row.finalHp.reduce((s,a)=>s+a.maxHp,0);}else row.endpointSkippedReason=row.stopReason;
 row.reactionBattles=cp(auditContext._dendroAudit?.battles||[]);row.counts={};row.damage={};for(const b of row.reactionBattles)for(const[k,n]of Object.entries(b.counts))row.counts[k]=(row.counts[k]||0)+n;for(const b of row.reactionBattles)for(const[k,n]of Object.entries(b.damage))row.damage[k]=(row.damage[k]||0)+n;
 row.intended=spec.intended;row.missingIntended=spec.intended.filter(k=>!row.counts[k]);row.mainReactionBattles=row.reactionBattles.filter(x=>x.isMain);row.mainCounts={};for(const rb of row.mainReactionBattles)for(const[k,n]of Object.entries(rb.counts))row.mainCounts[k]=(row.mainCounts[k]||0)+n;row.missingIntended=spec.intended.filter(k=>!row.mainCounts[k]);out.rows.push(row);
 console.log(JSON.stringify({level,mode,name:spec.name,seed,wins:row.wins,losses:row.losses,rounds:row.rounds,mora:row.lodgingMora,seconds:Math.round(row.seconds),counts:row.counts,missing:row.missingIntended}));
 }catch(e){out.errors.push({spec:spec.name,seed,code:e.code||e.name,message:e.message});console.log('ERROR '+JSON.stringify(out.errors.at(-1)));}
 fs.writeFileSync(file,JSON.stringify(out,null,2));}
