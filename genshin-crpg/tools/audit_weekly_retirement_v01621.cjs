'use strict';
// Native reporting and reloads; declared earned-quota fixtures isolate bonuses.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadEnvironment,setup}=require('./audit_food_lodging_v01617.cjs');
const ROOT=path.resolve(__dirname,'..'),DAY=86400000,copy=x=>JSON.parse(JSON.stringify(x));
function guild(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function seed(e){const r=setup(e,{levels:60});guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});delete r.s.tasks;r.taskView();return r;}
function complete(e,r,scope){guild(r);for(let i=0;i<80;i++){const frontier=r.taskView()[scope];if(!frontier.length)break;for(const x of frontier){const b=r.tasksBox(true);b[scope+'Progress'][x.id]=b[scope+'Definitions'][x.id].goal;r.action('TASK_CLAIM',{task:x.id});}}assert(r.s.tasks[scope+'Ids'].every(id=>r.s.tasks.claimed[id]));}
function audit({baselineRoot,sourceRoot=ROOT,out=null}={}){
 assert(baselineRoot,'--baseline-root requires the published0.16.20 snapshot');
 const before=loadEnvironment(baselineRoot),after=loadEnvironment(sourceRoot),old=seed(before),checks=[],check=(name,test,evidence)=>{assert(test,name);checks.push({name,pass:true,...(evidence?{evidence}:{})});};
 check('Published baseline actually assigns the problematic weekly Abyss quota',old.s.tasks.weeklyIds.includes('W_V168_ABYSS'));
 const prior=copy(old.s.tasks),wallet=old.s.global.MORA,primo=old.s.global.PRIMOGEM;
 let current=new after.R(after.db,copy(old.s));current.taskView();check('Current period goal, reward, progress and claimed markers are preserved',JSON.stringify(current.s.tasks)===JSON.stringify(prior));check('Loading a patch never pays or deducts currencies',current.s.global.MORA===wallet&&current.s.global.PRIMOGEM===primo);check('An old Abyss quota is optional and cannot block this weeks all-clear',current.taskView().weeklyBonus.goal===prior.weeklyIds.length-1);
 for(let day=0;day<7;day++)current.action('WAIT',{minutes:1440});current.taskView();check('Game-world waiting does not retire or reroll the real-world weekly assignment',current.s.tasks.weeklyIds.includes('W_V168_ABYSS')&&current.s.tasks.week===prior.week);
 after.advance(7*DAY);current.taskView();check('At the real weekly reset no new Abyss quota is assigned',!current.s.tasks.weeklyIds.includes('W_V168_ABYSS'));check('Daily all-clear bonus20 and weekly all-clear bonus200 remain',current.taskView().bonus.reward.primogem===20&&current.taskView().weeklyBonus.reward.primogem===200);
 const nextWeek=copy(current.s.tasks);current=new after.R(after.db,copy(current.s));check('The retired next-week assignment reloads without losing other goals',JSON.stringify(current.s.tasks)===JSON.stringify(nextWeek));
 complete(after,current,'daily');complete(after,current,'weekly');guild(current);const initial=current.s.global.PRIMOGEM,d=current.action('TASK_CLAIM',{task:'D_BONUS'}).result,w=current.action('TASK_CLAIM',{task:'W_ALL'}).result;
 check('Native all-clear reporting pays exactly220 Primogems',d.primogem===20&&w.primogem===200&&current.s.global.PRIMOGEM===initial+220);
 const saved=current.serialize();for(const id of ['D_BONUS','W_ALL'])assert.throws(()=>current.action('TASK_CLAIM',{task:id}),/이미/);check('Repeated report attempts are atomic and pay nothing',current.serialize()===saved);
 const earned=seed(before);complete(before,earned,'weekly');guild(earned);const earnedWallet=earned.s.global.MORA;
 const currentPeriod=loadEnvironment(sourceRoot),loaded=new currentPeriod.R(currentPeriod.db,copy(earned.s));guild(loaded);const paid=loaded.action('TASK_CLAIM',{task:'W_ALL'}).result;check('A completed old week retains its promised all-clear reward',paid.primogem===200&&loaded.s.global.MORA===earnedWallet);const oldReceipt=copy(loaded.s.tasks.claimed);loaded.taskView();check('Previously paid weekly markers are not reset by installation',JSON.stringify(loaded.s.tasks.claimed)===JSON.stringify(oldReceipt));
 const report={schema:1,version:'0.16.21',provenance:{before:before.provenance,after:after.provenance},assumptions:['Four party members, levels60, legal declared equipment/ownership; reported acceptance-root uses actual native actions.','Activity quotas are explicit pre-earned fixtures solely for bonus/report bookkeeping; no fake combat victory is claimed.','Existing current-period assignments and their promised rewards remain until ordinary real KST weekly reset; only new weekly selection excludes Abyss.'],checks,oldAssignment:prior,nextWeekAssignment:nextWeek,bonusReceipts:{daily:copy(d),weekly:copy(w),oldWeek:copy(paid)},counts:{checks:checks.length,priorWeeklyGoals:prior.weeklyIds.length,nextWeeklyGoals:nextWeek.weeklyIds.length}};
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}return report;
}
if(require.main===module){const a=process.argv.slice(2),v=k=>a.includes(k)?a[a.indexOf(k)+1]:null;const r=audit({baselineRoot:v('--baseline-root'),sourceRoot:v('--source-root')||ROOT,out:v('--out')||path.join(ROOT,'docs/data/full_balance_v01621/economy/weekly_native.json')});console.log(JSON.stringify(r.counts));}
module.exports={audit};
