/* Display the loaded release, and activate a new worker only after a saved update. */
const GameVersion={
 latest:null,checking:false,registration:null,updating:false,
 label(){return 'v'+(MANIFEST.appVersion||'알 수 없음');},
 changed(){return !!this.latest&&this.latest.packVersion!==MANIFEST.contentVersion;},
 workerVersion(worker){return new Promise(resolve=>{if(!worker)return resolve(null);const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null);},1500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.version||null);};worker.postMessage({type:'GET_VERSION'},[channel.port2]);});},
 render(){
  let badge=document.getElementById('game-version');if(!badge){badge=button('',()=>this.open());badge.id='game-version';document.body.append(badge);}
  badge.textContent=this.label()+(this.changed()?' · 업데이트 있음':'');badge.setAttribute('aria-label','현재 게임 버전 '+this.label()+(this.changed()?' · 새 버전 있음':''));badge.classList.toggle('update-available',this.changed());badge.title='실행 중인 버전 · 클릭하여 확인';
 },
 async check(){
  if(this.checking)return;this.checking=true;
  try{const response=await fetch('release.json',{cache:'no-store'});if(response.ok){const release=await response.json();if(typeof release.appVersion==='string'&&typeof release.packVersion==='string')this.latest=release;}
   if('serviceWorker'in navigator){this.registration=await navigator.serviceWorker.getRegistration();await this.registration?.update();}
  }catch{}finally{this.checking=false;this.render();}
 },
 open(){
  const box=el('div','version-details');box.append(el('p','','현재 실행 버전 · '+this.label()),el('p','muted','빌드 '+MANIFEST.contentVersion));
  if(this.changed()){box.append(el('p','','새 버전 · v'+this.latest.appVersion),el('p','','진행을 저장한 뒤 새 버전으로 다시 엽니다. 저장한 여정은 유지됩니다.'),button('저장 후 새 버전 적용',()=>this.apply(),busy||this.updating,true));}
  else box.append(el('p','',this.latest?'현재 배포된 최신 버전입니다.':'연결되면 새 버전 유무를 확인할 수 있습니다.'));
  if(MANIFEST.releaseNotes?.version===MANIFEST.appVersion){box.append(el('h2','','이번 수정 내역'));const list=el('ul','release-notes');for(const text of MANIFEST.releaseNotes.changes)list.append(el('li','',text));box.append(list);for(const text of MANIFEST.releaseNotes.notes||[])box.append(el('p','muted',text));}
  box.append(button('업데이트 확인',async()=>{await this.check();this.open();},this.checking));showModal('게임 버전',box);
 },
 async apply(){
  if(busy||this.updating)return;if(game&&autoSavePaused){say('자동 저장이 일시중지되어 있습니다. 저장·설정에서 새 자동 저장을 시작한 뒤 업데이트해 주세요.');return;}
  this.updating=true;busy=true;render();
  try{
   await saveQueue.catch(()=>{});if(game)await storeSave();
   const reg=this.registration||await navigator.serviceWorker?.getRegistration();if(reg)await reg.update();
   let waiting=reg?.waiting;
   if(!waiting&&reg?.installing)waiting=await new Promise((resolve,reject)=>{const worker=reg.installing,timer=setTimeout(()=>{worker.removeEventListener('statechange',done);reject(Error('새 버전 설치를 기다리고 있습니다. 잠시 후 다시 적용해 주세요.'));},10000);const done=()=>{if(['installed','redundant'].includes(worker.state)){clearTimeout(timer);worker.removeEventListener('statechange',done);if(worker.state==='installed')resolve(reg.waiting);else reject(Error('새 버전 파일을 준비하지 못했습니다. 연결을 확인해 주세요.'));}};worker.addEventListener('statechange',done);done();});
   if(waiting){const active=await new Promise(resolve=>{const onChange=()=>resolve(true);navigator.serviceWorker.addEventListener('controllerchange',onChange,{once:true});waiting.postMessage({type:'ACTIVATE_UPDATE'});setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',onChange);resolve(false);},10000);});if(!active)throw Error('새 버전을 준비 중입니다. 잠시 후 다시 적용해 주세요.');}
   if(reg&&navigator.serviceWorker.controller&&this.changed()&&await this.workerVersion(navigator.serviceWorker.controller)!==this.latest.packVersion)throw Error('최신 버전의 준비가 확인되지 않았습니다. 잠시 후 다시 적용하거나 게임 탭을 모두 닫고 다시 열어 주세요.');
   const target=new URL(location.href);target.searchParams.set('release',this.latest?.packVersion||MANIFEST.contentVersion);location.replace(target.href);
  }catch(e){say('업데이트하지 못했습니다. '+e.message);}finally{busy=false;this.updating=false;render();}
 }
};
const versionRender=render;render=function(){versionRender();GameVersion.render();};
GameVersion.render();GameVersion.check();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)GameVersion.check();});
