'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'test-save-fixture.json')));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/html');res.end(req.url==='/save_adapter.js'?fs.readFileSync(path.join(__dirname,'../source/save_adapter.js')):'<!doctype html><html><body><script src="/save_adapter.js"></script></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const localBrowser='/tmp/crpg-browser/chrome-headless-shell-linux64/chrome-headless-shell';
 let browser;try{browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CRPG_CHROMIUM_PATH?{executablePath:process.env.CRPG_CHROMIUM_PATH}:fs.existsSync(localBrowser)?{executablePath:localBrowser}:{})});}catch(error){server.close();throw error;}
 try{
  const ctx=await browser.newContext(),p1=await ctx.newPage(),p2=await ctx.newPage();await Promise.all([p1.goto(url),p2.goto(url)]);
  await Promise.all([p1,p2].map(p=>p.evaluate(state=>{window.state=state;window.adapter=new CRPGSave.SaveAdapter({dbName:'test-cas',contentVersion:'test-pack-1'})},fixture)));
  const first=await p1.evaluate(()=>adapter.save('autosave',state));assert.equal(first.slotRevision,1);
  const simultaneous=await Promise.all([p1,p2].map((p,n)=>p.evaluate(async n=>{const s=JSON.parse(JSON.stringify(state));s.global.SAVE_REVISION++;s.global.MORA+=n;try{const r=await adapter.save('autosave',s,{expectedSlotRevision:1});return {ok:true,revision:r.slotRevision}}catch(e){return{ok:false,code:e.code}}},n)));
  assert.equal(simultaneous.filter(x=>x.ok).length,1);assert.equal(simultaneous.find(x=>!x.ok).code,'SAVE_CONFLICT');
  const result=await p1.evaluate(async()=>{
   const checks=[];const check=(name,v)=>{if(!v)throw new Error(name);checks.push(name)};
   const current=await adapter.load('autosave');check('CAS winner preserved',current.slotRevision===2);
   try{await adapter.save('autosave',state,{expectedSlotRevision:2})}catch(e){check('stale runtime revision rejected',e.code==='SAVE_STALE')}
   check('last error persists',adapter.lastError?.code==='SAVE_STALE');await adapter.list();check('read success does not erase error',adapter.lastError?.code==='SAVE_STALE');
   await adapter.setPreferences({adultModeEnabled:false,fontSize:20});const text=adapter.exportState(state);const imported=JSON.parse(text);imported.state.adultModeEnabled=true;imported.state.global.ADULT_CONSENT_FLAG=true;
   await adapter.importJSON('manual-copy',JSON.stringify(imported));const copy=await adapter.load('manual-copy');check('import strips transient consent',copy.state.global.ADULT_CONSENT_FLAG===undefined);check('import keeps current mode OFF',(await adapter.getPreferences()).adultModeEnabled===false);
   const before=JSON.stringify((await adapter.load('autosave')).state);try{await adapter.importJSON('autosave','{broken',{expectedSlotRevision:2})}catch(e){check('corrupt import explicit error',e.code==='SAVE_CORRUPT')}
   check('corrupt import preserves old save',JSON.stringify((await adapter.load('autosave')).state)===before);
   localStorage.setItem('legacy-crpg-test',JSON.stringify(state));await adapter.importLegacyLocalStorage('legacy-slot',{key:'legacy-crpg-test'});check('legacy source retained',localStorage.getItem('legacy-crpg-test')!==null);
   const a=new CRPGSave.SaveAdapter({indexedDB:null,dbName:'disabled'});try{await a.save('none',state)}catch(e){check('unavailable storage explicit error',e.code==='INDEXEDDB_UNAVAILABLE')};check('export still available',JSON.parse(a.exportState(state)).state.global.SAVE_ID===state.global.SAVE_ID);a.close();
   const exportAfterError=adapter.exportState((await adapter.load('autosave')).state);check('errors do not block recovery export',typeof exportAfterError==='string');
   const db=await adapter.open();const backupCount=await new Promise((resolve,reject)=>{const tx=db.transaction('backups','readonly'),req=tx.objectStore('backups').count();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});check('import originals backed up',backupCount>=2);
   adapter.close();return checks;
  });
  result.unshift('real IndexedDB concurrent tabs: exactly one CAS winner');console.log(JSON.stringify({passed:result.length,checks:result},null,2));await ctx.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1});
