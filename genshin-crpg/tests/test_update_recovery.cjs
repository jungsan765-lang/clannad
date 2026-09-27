'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 let replaced='',message='',saved=0;
 const context={console,setTimeout,clearTimeout,URL,MessageChannel,location:{href:'https://test.invalid/',replace:url=>{replaced=url}},window:{CRPGOnline:{active:true}},navigator:{},document:{addEventListener(){},getElementById(){return {setAttribute(){},classList:{toggle(){}}};},querySelector(){return null;}},MANIFEST:{appVersion:'old',contentVersion:'old'},busy:false,game:{},autoSavePaused:false,saveQueue:Promise.resolve(),storeSave:async()=>{saved++;throw Object.assign(Error('rules changed'),{code:'VERSION_MISMATCH'});},say:s=>{message=s;},render(){},fetch:async()=>({ok:false})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('source/app_version.js','utf8')+'\n globalThis.version=GameVersion;',context);
 context.version.latest={appVersion:'next',packVersion:'next'};await context.version.apply();assert.equal(saved,1);assert(replaced.includes('release=next'),'durable online commands must not trap an update behind an obsolete engine');assert.equal(context.busy,false);
 replaced='';context.storeSave=async()=>{throw Error('local storage failed');};await context.version.apply();assert.equal(replaced,'','a real persistence failure still prevents unsafe reload');assert(message.includes('local storage failed'));
 console.log(JSON.stringify({ok:true,engineMismatchUpdateRecovery:true,realSaveFailurePreserved:true}));
})();
