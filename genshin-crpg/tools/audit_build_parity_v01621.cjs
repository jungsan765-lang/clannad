'use strict';
// Read only native parity for the already generated browser and server engines.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib'),{pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..'),args=process.argv.slice(2),option=n=>args.includes(n)?args[args.indexOf(n)+1]:undefined;
const sourceRoot=path.resolve(option('--source-root')||ROOT),browserRoot=path.resolve(option('--browser-root')||path.join(sourceRoot,'dist')),serverFile=path.resolve(option('--server-file')||path.join(sourceRoot,'server/generated/engine.mjs')),out=path.resolve(option('--out')||path.join(sourceRoot,'docs/data/full_balance_v01621/build/parity_raw.json'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),digest=x=>sha(JSON.stringify(x));
const H=require(path.join(sourceRoot,'tools/audit_food_lodging_v01617.cjs')),policy=JSON.parse(fs.readFileSync(path.join(sourceRoot,'docs/data/food_balance_v01620/approved_policy_v01620.json'))),ids=policy.rows.map(x=>x.food),foodSet=new Set(ids),checks=[];
function check(name,ok,detail){checks.push({name,passed:!!ok,detail});assert(ok,name);}
function browserEnvironment(){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1791529200000;}},setTimeout,clearTimeout});c.window=c;
 const html=fs.readFileSync(path.join(browserRoot,'index.html'),'utf8'),loaded=[];
 vm.runInContext(fs.readFileSync(path.join(browserRoot,'data.js'),'utf8'),c,{filename:'built/data.js'});
 for(const [,file]of html.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"/g))if(file==='world_content.js'||file==='presentation.js'||file.startsWith('runtime')){const bytes=fs.readFileSync(path.join(browserRoot,file));loaded.push({file,bytes:bytes.length,sha256:sha(bytes)});vm.runInContext(bytes.toString(),c,{filename:'built/'+file});}
 return {c,db:c.CRPG_DATA,R:c.CRPGRuntime.Runtime,G:c.CRPGRuntime.growthV01522,loaded};
}
function foodRows(r){return ids.map(id=>copy(r.row('14_ITEM_DB',id)));}
function preparedRows(r){return r.rows('19_SHOP_STOCK_DB').filter(row=>row[2]==='ITEM'&&foodSet.has(row[3])).map(copy).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));}
function balanceWitness(name,env){
 const r=H.setup(env,{levels:9}),owner='MOND_AMBER';r.s.chars[owner].hp=0;r.s.chars[owner].xp=r.growth(owner).next-1;r.giveItem('MAT_CHAR_EXP_WANDERER',1);
 const book=copy(r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',owner,quantity:1}).result);check(name+': native XP book level gain does not revive KO',r.growth(owner).level===10&&r.economyOwner(owner).hp===0);
 const ascend=H.setup(env,{levels:10}),prior=ascend.economyOwner(owner);ascend.s.chars[owner].hp=1;const quote=copy(ascend.ascensionInfo(owner));for(const [id,n]of Object.entries(quote.cost.items))ascend.giveItem(id,n);const ascended=copy(ascend.action('CHAR_ASCEND',{owner}).result),after=ascend.economyOwner(owner);check(name+': native ascension keeps HP deficit',after.maxHp-after.hp===prior.maxHp-1);
 const C=require(path.join(sourceRoot,'tools/audit_healing_helpers_v01619.cjs')),runtimeApi=env.c?env.c.CRPGRuntime:globalThis.CRPGRuntime,n=C.setup({R:env.R,db:env.db,api:runtimeApi},{level:25,team:['MOND_NOELLE','MOND_AMBER','LIYUE_XIANGLING'],route:'ROUTE_TRAVELER',seed:717,enhance:3,talent:4,map:'MAP_MOND_PLAINS'});n.s.constellations={MOND_NOELLE:1};n.startBattle('EG_MOND_HILI_PATROL','RANDOM');n.die=()=>1;n.random=()=>.5;const a=n.s.runtime.actors.find(x=>x.source==='MOND_NOELLE'),foe=n.s.runtime.actors.find(x=>x.side==='ENEMY');for(const t of n.s.runtime.actors.filter(x=>x.side==='ENEMY'))t.hp=t.maxHp=1000000;for(const id of ['MOND_NOELLE_E','MOND_NOELLE_Q'])n.executeCard(a,n.actorCards(a).find(x=>x.id===id),foe.id);for(const t of n.s.runtime.actors.filter(x=>x.side==='ALLY'))t.hp=1;const heals=[],heal=n.heal;n.heal=function(t,v,s,...rest){const applied=heal.call(this,t,v,s,...rest);heals.push({target:t.source,nominal:v,applied});return applied;};n.basicHit(a,foe);check(name+': native Noelle C1 E/Q hit heals four recipients once',heals.length===4&&new Set(heals.map(x=>x.target)).size===4);
 const task=H.setup(env,{levels:60});task.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});task.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});task.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});delete task.s.tasks;task.taskView();check(name+': new weekly assignment omits finite Abyss',!task.s.tasks.weeklyIds.includes('W_V168_ABYSS'));
 return {book,bookGrowth:copy(r.growth(owner)),bookHp:r.economyOwner(owner).hp,ascensionQuote:quote,ascensionReceipt:ascended,ascensionHp:after.hp,noelleHeals:heals,gemRewards:copy(runtimeApi.growthV01522.domainAscensionGems),gemCosts:copy(runtimeApi.growthV01522.ascensionGemCosts),talentBooks:copy(runtimeApi.growthV01522.domainTalentBooks),weeklyIds:copy(task.s.tasks.weeklyIds),weeklyBonus:copy(task.taskView().weeklyBonus)};
}
function summarize(name,env){
 const sharedBefore=digest(env.db),r=H.setup(env,{levels:20}),rows=foodRows(r),stocks=preparedRows(r),canonicalDbBefore=digest(r.db),second=new env.R(r.db);second.newGame({name:'빌드 복제 검사',route:'ROUTE_TRAVELER',seed:717,saveId:'BUILD-PARITY-SECOND'});
 check(name+': all 45 authoritative rows equal approved bases',rows.length===45&&rows.every((row,i)=>Number(row[8])===policy.rows[i].after));
 check(name+': normalized DB second Runtime keeps all food rows',same(rows,foodRows(second)));
 check(name+': normalized DB second Runtime keeps all prepared prices',same(stocks,preparedRows(second)));
 check(name+': normalized input DB remains unchanged',canonicalDbBefore===digest(r.db));
 check(name+': shared raw input DB remains unchanged',sharedBefore===digest(env.db));
 const effects=[];
 for(const level of [5,20,60])for(const item of ['FOOD_TEA_BREAK_PANCAKE','FOOD_HASH_BROWN','FOOD_PERCH_STEW'])for(const variant of ['NORMAL','BARBARA_SPECIAL']){
  const t=H.setup(env,{levels:level}),owner='MOND_AMBER';t.s.chars[owner].hp=1;t.giveItem(item,1);if(variant==='BARBARA_SPECIAL')t.s.specialFoodLots={[item]:{BARBARA_SPECIAL:1}};
  const spec=copy(t.foodSpec(item)),expected=t.foodHealingAmount(spec.heal,owner),receipt=copy(t.action('USE_ITEM',{item,owner}).result);
  check(name+': AUTO '+level+' '+item+' '+variant,receipt.meals[0].variant===variant&&receipt.meals[0].requestedHealing===expected&&t.itemCount(item)===0);
  effects.push({level,item,variant,autoSpec:spec,expected,receipt});
 }
 const balance=balanceWitness(name,env);
 return {name,balance,rawInputBeforeSha256:sharedBefore,rawInputAfterSha256:digest(env.db),canonicalFoodRows:rows,preparedRecoveryStockRows:stocks,normalizedInputBeforeSha256:canonicalDbBefore,normalizedInputAfterSha256:digest(r.db),secondRuntimeFoodRowsSha256:digest(foodRows(second)),secondRuntimeStockRowsSha256:digest(preparedRows(second)),foodRowsSha256:digest(rows),preparedRowsSha256:digest(stocks),allShopStockRowsSha256:digest(copy(r.rows('19_SHOP_STOCK_DB'))),effects};
}
(async()=>{
 const rawDbBytes=fs.readFileSync(path.join(sourceRoot,'content/db.json')),source=H.loadEnvironment(sourceRoot),browser=browserEnvironment(),server=await import(pathToFileURL(serverFile).href),serverEnv={db:server.DB,R:server.R,G:globalThis.CRPGRuntime.growthV01522},cleanDataFile=fs.readFileSync(path.join(browserRoot,'data.js'));
 const release=JSON.parse(fs.readFileSync(path.join(browserRoot,'release.json'))),manifest=JSON.parse(fs.readFileSync(path.join(browserRoot,'asset-manifest.json'))),dataPayload=cleanDataFile.toString().replace(/^window\.CRPG_DATA=/,'').replace(/;\s*$/,''),cleanDataSha=sha(dataPayload);
 const dbContract=JSON.parse(fs.readFileSync(path.join(sourceRoot,'docs/data/full_balance_v01621/product_manifest.json'))).dbContract,rawGitBlob=crypto.createHash('sha1').update('blob '+rawDbBytes.length+'\0').update(rawDbBytes).digest('hex');
 check('known unchanged QA or published authored raw DB file',dbContract.acceptedRaw.some(row=>row.bytes===rawDbBytes.length&&(!row.sha256||row.sha256===sha(rawDbBytes))&&(!row.gitBlob||row.gitBlob===rawGitBlob)));
 check('built browser and server raw clean DB equality',same(browser.db,server.DB));
 const browserInputBefore=digest(browser.db),serverInputBefore=digest(server.DB),runtimeFiles=browser.loaded.map(x=>x.file),html=fs.readFileSync(path.join(sourceRoot,'source/index.html'),'utf8'),sourceRuntimeFiles=[...html.matchAll(/<script src="([^"?]+)/g)].map(x=>x[1]).filter(x=>x==='world_content.js'||x==='presentation.js'||x.startsWith('runtime'));
 check('actual browser built runtime order equals server build registry',same(runtimeFiles,sourceRuntimeFiles)&&runtimeFiles.length===119);
 for(const row of browser.loaded)check('browser/source bytes: '+row.file,row.sha256===sha(fs.readFileSync(path.join(sourceRoot,'source',row.file))));
 check('built abyss display source matches frozen source',sha(fs.readFileSync(path.join(browserRoot,'app_abyss.js')))===sha(fs.readFileSync(path.join(sourceRoot,'source/app_abyss.js'))));
 const protocol=JSON.parse(fs.readFileSync(path.join(sourceRoot,'server/protocol.json'))).version,d=crypto.createHash('sha256');d.update('crpg-protocol-'+protocol+'\0');
 for(const row of browser.loaded){d.update(row.file+'\0');d.update(fs.readFileSync(path.join(browserRoot,row.file)));d.update('\0');}d.update(dataPayload);
 const rules='engine3-'+d.digest('hex'),aliases=JSON.parse(fs.readFileSync(path.join(sourceRoot,'server/compatibility.json'))),calculatedFingerprint=aliases[rules]||rules;
 check('actual browser/server/recomputed engine identity',release.engineVersion===server.ENGINE_FINGERPRINT&&manifest.engineVersion===server.ENGINE_FINGERPRINT&&calculatedFingerprint===server.ENGINE_FINGERPRINT);
 check('actual browser/server version',release.appVersion===server.ENGINE_VERSION&&server.ENGINE_VERSION===JSON.parse(fs.readFileSync(path.join(sourceRoot,'package.json'))).version);
 const engines=[summarize('source runtime from raw DB',source),summarize('built browser runtime',browser),summarize('actual imported server engine',serverEnv)];
 for(const e of engines.slice(1)){
  check(e.name+': growth, material rewards, Noelle and weekly native parity',same(engines[0].balance,e.balance));
  check(e.name+': same complete 45 food rows',same(engines[0].canonicalFoodRows,e.canonicalFoodRows));
  check(e.name+': same complete table 19 recovery prepared-stock rows',same(engines[0].preparedRecoveryStockRows,e.preparedRecoveryStockRows));
  check(e.name+': all table 19 rows same',engines[0].allShopStockRowsSha256===e.allShopStockRowsSha256);
  check(e.name+': actual normal/special AUTO meal parity',same(engines[0].effects,e.effects));
 }
 check('browser and exported server raw DB retained after all instances',browserInputBefore===digest(browser.db)&&serverInputBefore===digest(server.DB));
 check('authored raw DB file retained after all instances',sha(rawDbBytes)===sha(fs.readFileSync(path.join(sourceRoot,'content/db.json'))));
 const serverBytes=fs.readFileSync(serverFile),result={schema:1,collectedUTC:new Date().toISOString(),passed:true,assumptions:{scope:'Executes the real generated browser runtime scripts in a Node VM and imports the real generated server ESM. This is engine/data parity, not a graphical browser UI test.',fixture:'Declared same level/seed/ownership/legal gear through the existing native helper; one food serving and imposed HP=1 isolate effect receipts. No live account/server or free ingredient claim.',writes:'Only the requested QA output and gzip; no product/build/source mutation.'},provenance:{sourceRoot,browserRoot,serverFile,tool:{path:path.relative(sourceRoot,__filename),bytes:fs.statSync(__filename).size,sha256:sha(fs.readFileSync(__filename))},helper:{path:'tools/audit_food_lodging_v01617.cjs',sha256:sha(fs.readFileSync(path.join(sourceRoot,'tools/audit_food_lodging_v01617.cjs')))},policySha256:sha(fs.readFileSync(path.join(sourceRoot,'docs/data/food_balance_v01620/approved_policy_v01620.json'))),authoredDbSha256:sha(rawDbBytes),cleanDbSerializedSha256:cleanDataSha,cleanDbObjectSha256:browserInputBefore,serverEngine:{bytes:serverBytes.length,sha256:sha(serverBytes),gzipBytesLevel6:zlib.gzipSync(serverBytes,{level:6}).length},engineVersion:server.ENGINE_VERSION,engineFingerprint:server.ENGINE_FINGERPRINT,recomputedEngineFingerprint:calculatedFingerprint,serverBuild:server.SERVER_BUILD,browserRelease:release,browserRuntimeFiles:browser.loaded},counts:{engines:engines.length,foodRowsPerEngine:ids.length,preparedRecoveryStockRowsPerEngine:engines[0].preparedRecoveryStockRows.length,nativeMeals:engines.reduce((n,e)=>n+e.effects.length,0),checks:checks.length,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length},checks,engines};
 fs.mkdirSync(path.dirname(out),{recursive:true});const raw=Buffer.from(JSON.stringify(result,null,2)+'\n');fs.writeFileSync(out,raw);fs.writeFileSync(out+'.gz',zlib.gzipSync(raw,{level:9}));console.log(JSON.stringify({out,...result.counts,engineFingerprint:result.provenance.engineFingerprint,serverBuild:result.provenance.serverBuild}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
