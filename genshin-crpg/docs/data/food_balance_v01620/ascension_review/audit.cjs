'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Portable read-only reproducer; source files are read from a separately supplied checkout.
// Outputs must be written outside the published evidence pack.
function arg(name){const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];}
const sourceArg=arg('--source-root'),outArg=arg('--out');
if(!sourceArg||!outArg)throw Error('Usage: node audit.cjs --source-root /path/to/checkout --out /path/to/new/output');
const root=path.resolve(sourceArg),out=path.resolve(outArg);
if(out===__dirname)throw Error('--out must not overwrite the published evidence pack');
fs.mkdirSync(out,{recursive:true});
const vm=require('node:vm');let clock=Date.now(),saveCounter=0;
const c=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout});
for(const [,file] of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g))vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),c,{filename:file});
const db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'),'utf8')),R=c.CRPGRuntime.Runtime;
// Same fixture logic as the archived original helpers_v011.cjs; it changes only this probe's in-memory save.
function fresh(map='MAP_MOND_CITY',route='ROUTE_TRAVELER'){
 const r=new R(db);r.newGame({name:'클라나드',route,seed:71247,saveId:'V011-'+(++saveCounter)});
 Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',WORLD_TIME:'12:00',MORA:3000});
 delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();return r;
}
const G=c.CRPGRuntime.growthV01522,copy=x=>JSON.parse(JSON.stringify(x)),PLAYER='PLAYER_CUSTOM';
const ownerIds=[PLAYER,'MOND_AMBER','MOND_DILUC','MOND_BARBARA','LIYUE_YELAN','MOND_SUCROSE','MOND_JEAN','MOND_LISA','LIYUE_KEQING','MOND_KAEYA','LIYUE_QIQI','MOND_NOELLE','LIYUE_ZHONGLI','LIYUE_YAOYAO','LIYUE_BAIZHU'];
function ready(route){const r=fresh('MAP_MOND_CITY',route);for(const k of ['FLAG_TRV_ANEMO_UNLOCKED','FLAG_TRV_MON_CH1_CLEAR','FLAG_TRV_MON_CH2_CLEAR','FLAG_ISK_M03_CLEAR','FLAG_ISK_M05_CLEAR','FLAG_ACCESS_REGION_LIYUE'])r.s.flags[k]=true;for(const rt of ['TRV','ISK'])for(const reg of ['MOND','LIYUE'])for(let n=1;n<=4;n++){const id=`Q_${rt}_${reg}_0${n}`;if(r.tables['22_QUEST_DB'].has(id))r.questState(id).claimed=true;}r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(ownerIds.filter(x=>x!==PLAYER).map(x=>[x,{state:'JOINED'}])));r.s.inventory=[];r.s.global.MORA=0;return r;}
function phase(r,owner,p){const l=G.caps[p];if(owner===PLAYER){r.s.global.PLAYER_LEVEL_STATE=l;r.s.global.PLAYER_XP_STATE=0;}else{r.s.chars[owner].level=l;r.s.chars[owner].xp=0;}r.s.ascensions[owner]=p;r.recalculate();if(owner===PLAYER)r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;else r.s.chars[owner].hp=r.character(owner).maxHp;}
const quotes=[];
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){const r=ready(route);for(const owner of ownerIds)for(let p=0;p<=6;p++){phase(r,owner,p);const q=copy(r.ascensionInfo(owner));quotes.push({route,owner,premiumRarity:r.premiumRarity(owner),growthCostRarity:owner===PLAYER?'PROTAGONIST_BASELINE':r.rarityOf(owner),element:r.growthElement(owner),quote:q});if(owner===PLAYER){const expect=[3,6,12,45,192,1250];assert.equal(q.cost.items.GROWTH_GEM_NEUTRAL??0,expect[p]??0);assert.equal(q.cost.mora,[800,2400,6000,14000,28000,42000,0][p]);}}
}
const domainRows=[],r=ready('ROUTE_TRAVELER');phase(r,PLAYER,6);
for(const [key,site]of Object.entries(G.domains))if(site.kind==='ASCENSION'){r.s.global.CURRENT_MAP_ID=site.map;for(const d of r.growthDomainEntries())for(const element of Object.keys(G.domainAscensionGems)){r.s.domainDaily={day:G.dayOf(c.Date.now()),wins:3};const base=copy(r.growthDomainRewards(d,element));r.s.domainDaily.wins=0;const boosted=copy(r.growthDomainRewards(d,element));const foes=copy(r.growthDomainFoes(d,element));domainRows.push({domain:copy(d),element,base,boosted,foes});assert.equal(boosted.items['GROWTH_GEM_'+element],2*base.items['GROWTH_GEM_'+element]);}}
const protagonistPayments=[];
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){let r=ready(route);for(let p=0;p<6;p++){phase(r,PLAYER,p);const q=copy(r.ascensionInfo());r.s.global.MORA=q.cost.mora+123;for(const [id,n]of Object.entries(q.cost.items))r.giveItem(id,n);const intent={id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type:'CHAR_ASCEND',owner:PLAYER};const paid=copy(r.transact(intent)),saved=r.serialize();assert.equal(r.s.global.MORA,123);assert.equal(r.growth().phase,p+1);for(const [id]of Object.entries(q.cost.items))assert.equal(r.itemCount(id),0);const restored=new R(db,copy(r.s));assert.equal(restored.serialize(),saved);assert.deepEqual(copy(restored.transact(intent)),paid);assert.equal(restored.serialize(),saved);assert.deepEqual(copy(restored.ascensionInfo().cost),copy(r.ascensionInfo().cost));protagonistPayments.push({route,phase:p,quote:q.cost,result:paid,restoredPhase:restored.growth().phase,receiptPreserved:true});r=restored;}}
const meta={version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,readOnly:true,noCombatDurationInference:true,materialRequirementVersion:G.materialRequirementVersion,ascensionRewardVersion:G.ascensionRewardVersion,quoteCount:quotes.length,domainCount:domainRows.length,payments:protagonistPayments.length,files:{}};
for(const file of ['source/runtime_growth_v01522.js','source/runtime_rarity_v01412.js','source/runtime_premium_v0148.js','source/runtime_traveler_geo.js','source/app_growth_v01522.js','source/app_character_v0167.js','content/db.json'])meta.files[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const specialtyIds=[...new Set(quotes.flatMap(x=>Object.keys(x.quote.cost.items)).filter(id=>!id.startsWith('GROWTH_')&&!id.startsWith('MAT_FB_')&&!id.startsWith('MAT_')&&id!=='TRPG_BOSS_ESSENCE'))];
const supplyRows=copy(r.rows('19_SHOP_STOCK_DB').filter(row=>specialtyIds.includes(row[3])||row[3]==='TRPG_BOSS_ESSENCE'||row[3].startsWith('GROWTH_GEM_')));
fs.writeFileSync(path.join(out,'native_quotes.json'),JSON.stringify({meta,quotes,domainRows,protagonistPayments,supplyRows},null,2)+'\n');
console.log(JSON.stringify({meta,protagonist:quotes.filter(x=>x.owner===PLAYER).map(x=>({route:x.route,phase:x.quote.phase,premiumRarity:x.premiumRarity,cost:x.quote.cost})),neutralRewards:domainRows.filter(x=>x.element==='NEUTRAL').map(x=>({level:x.domain.level,base:x.base.items,boosted:x.boosted.items,foes:x.foes})),supplyRows},null,2));
