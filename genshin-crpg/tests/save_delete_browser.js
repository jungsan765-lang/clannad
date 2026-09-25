async function runSaveDeleteTests(){

   const check=(ok,label)=>{if(!ok)throw Error(label)},results=[];
   const dbName='party-delete-regression-'+Date.now()+'-'+Math.random().toString(36).slice(2),a=new CRPGSave.SaveAdapter({dbName}),b=new CRPGSave.SaveAdapter({dbName});
   const state={schema:2,global:{SAVE_SCHEMA_VERSION:2,SAVE_ID:'delete-fixture',STORY_ROUTE_ID:'ROUTE_TRAVELER',SAVE_REVISION:0,PRNG_STATE:42,MODE:'NORMAL',PLAYER_NAME:'삭제 검증'},party:[],inventory:[],quests:{},relations:{},flags:{}};
   const reject=async(fn,code)=>{try{await fn();throw Error('expected '+code)}catch(e){check(e.code===code,'unexpected rejection: '+e.code)}};
   const backups=()=>a.transact(['backups'],'readonly',(tx,set)=>{const r=tx.objectStore('backups').getAll();r.onsuccess=()=>set(r.result)});
   try{
    const record=await a.save('delete-me',state),kept=await a.save('keep-me',state);await a.setPreferences({adultModeEnabled:false,fontSize:21});
    const events=[];a.subscribe(e=>events.push(e));
    const otherTabEvent=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('no external-delete notification')),2000);b.subscribe(e=>{if(e.type==='external-delete'&&e.slotId==='delete-me'){clearTimeout(timeout);resolve(e)}})});
    check(await a.remove('delete-me',{expectedSlotRevision:record.slotRevision})===true,'boolean API preserved');
    check(!(await a.list()).some(r=>r.slotId==='delete-me'),'slot removed');check(JSON.stringify(await a.load('keep-me'))===JSON.stringify({...kept,migrationChanged:false}),'unrelated slot preserved');
    const audit=(await backups()).find(x=>x.operation==='DELETE');check(!!audit&&JSON.stringify(audit.envelope)===JSON.stringify(record),'exact pre-delete backup');check(!!audit.createdAt,'audit timestamp');
    check((await a.getPreferences()).fontSize===21,'preferences preserved');check(events.some(e=>e.type==='removed'&&e.slotRevision===1),'committed local event');
    const remote=await otherTabEvent;check(remote.slotRevision===1&&remote.operation==='delete','remote revision and operation');results.push('atomic deletion preserves exact backup, unrelated slot and preferences; committed local/remote notifications');

    const count=(await backups()).length;await reject(()=>b.save('delete-me',state,{expectedSlotRevision:1}),'SAVE_CONFLICT');await reject(()=>a.remove('delete-me',{expectedSlotRevision:1}),'SAVE_CONFLICT');check((await backups()).length===count,'no backup from failed deletion');results.push('delete first makes stale writer and repeated deletion conflict without side effects');

    const next=structuredClone(state);next.global.SAVE_REVISION=1;await b.save('keep-me',next,{expectedSlotRevision:1});await reject(()=>a.remove('keep-me',{expectedSlotRevision:1}),'SAVE_CONFLICT');check((await a.load('keep-me')).slotRevision===2,'new revision survived stale delete');check(a.lastError?.code==='SAVE_CONFLICT','conflict remains visible');results.push('save first makes stale confirmation conflict while retaining newest state');

    await a.save('race',state);const race=await Promise.allSettled([a.remove('race',{expectedSlotRevision:1}),b.save('race',next,{expectedSlotRevision:1})]);check(race.filter(r=>r.status==='fulfilled').length===1,'one CAS race winner');check(race.find(r=>r.status==='rejected').reason.code==='SAVE_CONFLICT','race loser conflict');results.push('concurrent save/delete transactions have exactly one winner');

    const before=await a.exportSlot('keep-me');for(const revision of [undefined,0,-1,1.5,'2'])await reject(()=>a.remove('keep-me',{expectedSlotRevision:revision}),'SAVE_SLOT');check(await a.exportSlot('keep-me')===before,'invalid deletion leaves state exact');check(a.lastError?.code==='SAVE_SLOT','invalid API input is persistent error');results.push('invalid deletion revision is rejected before mutation and persists error');

    await a.save('closed-channel',state);a.channel.close();check(await a.remove('closed-channel',{expectedSlotRevision:1})===true,'closed channel cannot falsify committed deletion');check(!(await a.list()).some(r=>r.slotId==='closed-channel'),'committed deletion retained');results.push('notification failure cannot make committed deletion appear failed');
    return{passed:results.length,results};
   }finally{a.close();b.close();}
}
