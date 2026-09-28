'use strict';
// Synthetic saves made by the actual production v0.13.43 engine, not player data.
const assert=require('node:assert/strict'),cp=require('node:child_process');
const {fs,path,vm,root,db,R}=require('./helpers_v011.cjs');
const baseline='f0c08d6',cache=new Map();
// A verified export can supply the historical engine in a shallow checkout.
const baselineDir=process.env.CRPG_COMPAT_BASELINE_DIR;
function read(p){if(!cache.has(p))cache.set(p,baselineDir?fs.readFileSync(path.join(baselineDir,p),'utf8'):cp.execFileSync('git',['show',baseline+':genshin-crpg/'+p],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}));return cache.get(p);}
if(baselineDir){const bytes=Buffer.from(read('content/db.json')),sha=require('node:crypto').createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.equal(sha,'75626bf50ac3417feb33ac65a49fa268db9a34b6','verified v0.13.43 database');}
const old=vm.createContext({console,Date,setTimeout,clearTimeout});
for(const [,f]of read('source/index.html').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g))vm.runInContext(read('source/'+f),old,{filename:f});
const oldDB=JSON.parse(read('content/db.json')),results=[];
for(const route of ['ROUTE_ISEKAI','ROUTE_TRAVELER'])for(const mode of ['opening','departure','battle','work']){
 const r=new old.CRPGRuntime.Runtime(oldDB);r.newGame({name:'기존 모험가',route,seed:71247,saveId:'COMPAT43-'+route+'-'+mode});
 r.s.global.MORA=4321;r.giveItem('ORE_IRON',3);r.s.flags.V44_COMPAT_SENTINEL=true;
 if(mode!=='opening'){Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_PLAINS',STORY_MENU_POLICY:''});r.prepareStory();}
 if(mode==='departure'&&route==='ROUTE_ISEKAI')Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'ISK_M05_AA_173',STORY_CURSOR_NODE_ID:'ISK_M05_AA_173',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_WAITING:false});
 if(mode==='battle')r.startBattle('EG_MOND_SLIME_SMALL','RANDOM');
 if(mode==='work')r.action('LIFE_START',{kind:'GATHER'});
 const before=JSON.parse(r.serialize()),raw=JSON.stringify(before),loaded=new R(db,before),after=JSON.parse(loaded.serialize());
 for(const key of ['SAVE_ID','PLAYER_NAME','STORY_ROUTE_ID','PRNG_STATE','MORA','PLAYER_XP_STATE','PLAYER_LEVEL_STATE','CURRENT_STORY_NODE_ID','STORY_CURSOR_NODE_ID'])assert.deepEqual(after.global[key],before.global[key],key);
 for(const key of ['inventory','party','quests','relations','processed','runtime','lifeJob'])assert.deepEqual(after[key],before[key],route+' '+mode+' '+key);
 assert(after.flags.V44_COMPAT_SENTINEL);assert.equal(JSON.stringify(before),raw,'source save is not mutated');
 results.push({route,mode,ok:true});
}
fs.mkdirSync(path.join(root,'reports/mond-v01344'),{recursive:true});
fs.writeFileSync(path.join(root,'reports/mond-v01344/save-compatibility.json'),JSON.stringify({baseline,results},null,2));
console.log('PASS production v0.13.43 → current: '+results.length+' dialogue, departure, combat and timed-work saves');
