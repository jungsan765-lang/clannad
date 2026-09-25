/* Sound, impacts and image reuse are view concerns. Committed saves stay authoritative. */
const soundFiles=['click','equip','hit','guard','heal','fire','water','ice','lightning','wind','rock','dendro','melt','vaporize','overload','freeze','victory','defeat','birds','hunt_bow','hunt_pig',...Object.keys(MANIFEST.sfx||{})];
const GameAudio={
  context:null,armed:false,buffers:new Map(),voices:new Set(),music:null,musicKind:null,epoch:0,musicReady:false,lastError:'',lastUI:0,queue:new CRPGMusicQueue(MANIFEST.music),musicTrack:null,failedTracks:new Set(),
  enabled(){return settings.audioEnabled!==false;},
  async unlock(){
    if(!this.enabled()||document.hidden)return;
    this.armed=true;
    try{this.context=this.context||new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();this.failedTracks.clear();this.lastError='';this.sync();}
    catch{this.lastError='브라우저에서 소리를 시작하지 못했습니다. 소리 버튼을 다시 눌러 주세요.';}
  },
  async buffer(name){
    if(!soundFiles.includes(name)||!this.context)return null;
    if(!this.buffers.has(name)){const job=fetch(MANIFEST.sfx?.[name]?.url||(['click','equip'].includes(name)?'audio/official-review-click.mp3':({birds:'audio/life/birds.mp3',hunt_bow:'audio/life/bow-release.wav',hunt_pig:'audio/life/Mudchute_pig_1.ogg'}[name]||'audio/se_'+name+'.wav'))).then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b)).catch(()=>{this.buffers.delete(name);return null;});this.buffers.set(name,job);}
    return this.buffers.get(name);
  },
  async play(name){
    if(!this.armed||!this.enabled()||document.hidden||!settings.sfxVolume)return;
    if(['click','equip'].includes(name)){const now=performance.now();if(now-this.lastUI<100)return;this.lastUI=now;}
    const epoch=this.epoch,buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||!this.enabled()||document.hidden||this.context.state!=='running')return;
    if(this.voices.size>=6){const old=this.voices.values().next().value;old.stop();this.voices.delete(old);}
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=settings.sfxVolume*(['click','equip'].includes(name)?1:.45);source.connect(gain).connect(this.context.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
  },
  stop(){this.epoch++;this.music?.pause();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();},
  musicSelection(){
    const map=game?.s.global.CURRENT_MAP_ID||'TITLE',region=game?.tables['32_MAP_DB'].get(map)?.[1]||'몬드',battle=!!game?.s.runtime,boss=!!game?.s.runtime?.actors.some(a=>a.side==='ENEMY'&&a.grade==='보스');
    return this.queue.select({map,region,place:game?.currentPlace()?.valid?game.s.placeVisit.place:null,battle,boss,battleId:game?.s.runtime?.id});
  },
  setTrack(selection){
    this.music?.pause();this.music?.remove();this.musicKind=selection?.key||null;this.musicTrack=selection;
    if(!selection){this.music=null;return;}
    const music=new Audio();music.id='bgm-player';music.hidden=true;document.body.append(music);music.preload='none';music.loop=false;music.src='audio/'+selection.file;
    music.addEventListener('loadedmetadata',()=>{if(this.music===music&&selection.time>0&&selection.time<music.duration-1)music.currentTime=selection.time;});
    music.addEventListener('ended',()=>{if(this.music!==music)return;this.setTrack(this.queue.next());this.sync();});
    music.addEventListener('error',()=>{if(this.music!==music)return;this.failedTracks.add(selection.id);this.lastError='배경음 일부를 불러오지 못했습니다.';const next=this.queue.next();if(next&&!this.failedTracks.has(next.id)){this.setTrack(next);this.sync();}});
    this.music=music;this.musicReady=false;this.musicPending=null;this.updateTrackLabels();
  },
  updateTrackLabels(){for(const n of document.querySelectorAll('.music-now-playing'))n.textContent=this.musicTrack?'재생 곡 · '+this.musicTrack.title:'배경음 대기 중';},
  sync(){
    if(this.music&&this.queue.key===this.musicKind)this.queue.remember(this.music.currentTime);
    const selection=this.musicSelection();
    if(selection?.key!==this.musicKind||selection?.id!==this.musicTrack?.id)this.setTrack(selection);
    this.updateTrackLabels();
    const shouldPlay=this.armed&&this.enabled()&&!document.hidden&&settings.musicVolume>0;
    if(!shouldPlay){this.music?.pause();if(!this.enabled())this.stop();return;}
    const track=this.music;if(!track||this.failedTracks.has(this.musicTrack?.id))return;
    track.volume=settings.musicVolume*.65*(game?.s.runtime?.interlude ? .6:1);
    if(track.paused&&this.musicPending!==track){this.musicPending=track;track.play().then(()=>{if(this.music===track){this.musicReady=true;this.lastError='';}}).catch(error=>{if(this.music===track&&this.enabled()&&!document.hidden&&error.name!=='AbortError')this.lastError='소리 버튼을 눌러 배경음을 시작해 주세요.';}).finally(()=>{if(this.musicPending===track)this.musicPending=null;});}
  }
};
const originalApplySettings=applySettings;
applySettings=function(){
  originalApplySettings();if(settings.audioRevision!==2){settings.musicVolume=Math.min(Number.isFinite(settings.musicVolume)?settings.musicVolume:.25,.25);settings.audioRevision=2;}settings.audioEnabled=settings.audioEnabled!==false;
  for(const [key,fallback]of [['musicVolume',.25],['sfxVolume',.6]])settings[key]=typeof settings[key]==='number'&&Number.isFinite(settings[key])?Math.min(1,Math.max(0,settings[key])):fallback;
  if(typeof settings.reducedMotion!=='boolean')settings.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  settings.combatSpeed=Number.isFinite(settings.combatSpeed)?Math.min(2,Math.max(.5,settings.combatSpeed)):1;settings.damageFlash=settings.damageFlash!==false;document.documentElement.classList.toggle('reduce-motion',settings.reducedMotion);GameAudio.sync();
};
const avSettings=settingsControls;
settingsControls=function(p){
  p.append(el('h2','','소리·전투 연출'));
  const toggle=(label,key,extra='')=>{const row=el('label','settings-row'),copy=el('div','copy'),input=el('input');input.type='checkbox';input.checked=!!settings[key];copy.append(el('p','',label));if(extra)copy.append(el('small','',extra));input.onchange=()=>{settings[key]=input.checked;persistSettings();if(key==='audioEnabled'&&input.checked)GameAudio.unlock();};row.append(copy,input);p.append(row);};
  toggle('소리 사용','audioEnabled','처음 버튼을 누른 뒤 음악과 효과음이 시작됩니다.');
  for(const [label,key]of [['배경음 음량','musicVolume'],['효과음 음량','sfxVolume']]){const row=el('label','settings-row'),range=el('input'),text=el('span','',label+' '+Math.round(settings[key]*100)+'%');range.type='range';range.min=0;range.max=100;range.step=5;range.value=settings[key]*100;range.setAttribute('aria-label',label);range.oninput=()=>{settings[key]=Number(range.value)/100;text.textContent=label+' '+range.value+'%';GameAudio.sync();};range.onchange=()=>{persistSettings();GameAudio.unlock();if(key==='sfxVolume')GameAudio.play('equip');};row.append(text,range);p.append(row);}
  toggle('움직임 줄이기','reducedMotion','화면 흔들림과 입자 연출을 끄고 결과 수치를 표시합니다.');toggle('피격 시 붉은 화면','damageFlash','아군이 피해를 입으면 화면 가장자리에 짧게 표시합니다. 움직임 줄이기에서는 표시하지 않습니다.');
  p.append(button('효과음 들어보기',async()=>{await GameAudio.unlock();GameAudio.play('equip');}),el('p','muted','원신 OST · 지역별 순환 재생 · 몬드 전투는 Disc 3의 1·2번 곡 무작위 재생 · 일부 탐험곡은 웹이벤트 편집본 · 공식 웹 이벤트 원소 효과음 · 본편 녹음 효과음 · 일부 타격·반응은 프로젝트 제작음'));
  p.append(el('p','muted music-now-playing',GameAudio.musicTrack?'재생 곡 · '+GameAudio.musicTrack.title:'배경음 대기 중'));
  p.append(el('p','muted','© All rights reserved by COGNOSPHERE. Other properties belong to their respective owners.'));
  const lifeCredits=el('a','muted','새·동물·활 효과음 출처');lifeCredits.href='audio/life/CREDITS.txt';lifeCredits.target='_blank';lifeCredits.rel='noopener';p.append(lifeCredits);const sfxCredits=el('a','muted','원소·전투·생활 효과음 출처');sfxCredits.href='audio/genshin-sfx/CREDITS.md';sfxCredits.target='_blank';sfxCredits.rel='noopener';p.append(sfxCredits);
  if(GameAudio.lastError)p.append(el('p','choice-note',GameAudio.lastError));avSettings(p);
};
const avQuick=updateQuick;
updateQuick=function(){avQuick();for(const b of document.querySelectorAll('#quick-actions button'))b.disabled=busy;const q=document.getElementById('quick-actions'),b=button(!GameAudio.enabled()?'소리 켜기':GameAudio.armed?'소리 끄기':'소리 시작',async()=>{if(GameAudio.enabled()&&GameAudio.armed){settings.audioEnabled=false;GameAudio.stop();}else{settings.audioEnabled=true;await GameAudio.unlock();}await persistSettings();updateQuick();});b.setAttribute('aria-label',b.textContent);b.dataset.audioToggle='true';q.append(b);};
document.addEventListener('click',e=>{const control=e.target.closest('button,a,input[type=checkbox],select');if(!control||control.dataset.audioToggle||control.disabled||control.getAttribute('aria-disabled')==='true')return;if(!GameAudio.armed)GameAudio.unlock();GameAudio.play('click');},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){GameAudio.stop();GameEffects.cancel();}else GameAudio.sync();});
window.addEventListener('pagehide',()=>{GameAudio.stop();GameEffects.cancel();});
// Hold decoded images through screen rebuilds. Only GENERAL manifest entries are eligible.
const imageAssets=new Map(Object.values(MANIFEST.assets||{}).filter(a=>a.category==='GENERAL').flatMap(a=>[[a.url,a],[a.thumbnail,a]])),warmImages=new Map();
function warmImage(url){if(!url||warmImages.has(url)||!imageAssets.has(url))return;if(warmImages.size>=24)warmImages.delete(warmImages.keys().next().value);const img=new Image();img.decoding='async';img.fetchPriority='low';img.src=url;warmImages.set(url,img);img.decode?.().catch(()=>{});}
function optimizeImages(old){
  const pooled=new Map();for(const img of old){const key=img.getAttribute('src')+'|'+img.className;if(!pooled.has(key))pooled.set(key,[]);pooled.get(key).push(img);}
  for(const img of root.querySelectorAll('img')){
    let src=img.getAttribute('src'),asset=imageAssets.get(src);if(!asset)continue;
    const small=img.matches('.party-portrait,.actor-image,.relationship-photo');if(small&&asset.thumbnail){src=asset.thumbnail;img.src=src;}
    img.width=asset.width;img.height=asset.height;img.decoding='async';img.loading=img.matches('.relationship-photo')?'lazy':'eager';img.fetchPriority=img.closest('.portrait-frame,.welcome-art')?'high':'auto';
    const key=src+'|'+img.className,reused=pooled.get(key)?.shift();if(reused){reused.alt=img.alt;img.replaceWith(reused);}
    warmImage(src);
  }
  const upcoming=[];
  if(game&&showArt){const n=game.storyNode(),next=n&&game.storyIndex?.().nodes?.get?.(game.s.global.STORY_ROUTE_ID+':'+n[13]);if(next&&String(next[6]).startsWith('PROFILE_'))upcoming.push(portraitFor(next[6]));for(const owner of game.s.party.filter(x=>x.active)){const profile=game.rows('04_CHAR_DB').find(r=>r[1]===owner.source);if(profile){const src=portraitFor(profile[0]);upcoming.push(imageAssets.get(src)?.thumbnail);}}}
  upcoming.slice(0,4).forEach(warmImage);
}
function combatSpeedControl(){
  const row=el('label','combat-speed'),label=el('span','','전투 속도'),range=el('input'),value=el('output');
  range.type='range';range.min='.5';range.max='2';range.step='.25';range.value=settings.combatSpeed||1;range.setAttribute('aria-label','전투 속도');value.textContent=Number(range.value).toFixed(2).replace(/0$/,'')+'×';
  range.oninput=()=>{settings.combatSpeed=Number(range.value);for(const other of document.querySelectorAll('.combat-speed')){other.querySelector('input').value=range.value;other.querySelector('output').textContent=value.textContent=Number(range.value).toFixed(2).replace(/0$/,'')+'×';}GameEffects.reschedule();};range.onchange=()=>persistSettings();row.append(label,range,value);return row;
}
const GameEffects={
  generation:0,timer:null,resolve:null,layer:null,dock:null,seen:new Set(),lastFlash:0,paused:false,active:false,
  cancel(){CombatFX.clear();this.generation++;clearTimeout(this.timer);this.resolve?.();this.resolve=null;this.layer?.replaceChildren();this.dock?.remove();this.dock=null;this.active=false;this.paused=false;document.documentElement.classList.remove('av-running');root.inert=busy;},
  reschedule(){clearTimeout(this.timer);if(this.resolve&&!this.paused)this.timer=setTimeout(()=>this.advance(),(this.beatDuration||1400)/(settings.combatSpeed||1));},
  advance(){clearTimeout(this.timer);const done=this.resolve;this.resolve=null;done?.();},
  layerNode(){if(!this.layer){this.layer=el('div','combat-effects');this.layer.setAttribute('aria-hidden','true');document.body.append(this.layer);}return this.layer;},
  actorNode(id){return id&&[...root.querySelectorAll('.combatant-row[data-actor-id]')].find(n=>n.dataset.actorId===id);},
  showAction(frame){
    const layer=this.layerNode();layer.replaceChildren();CombatFX.clear();
    const auxiliary=frame.periodic||frame.events.every(e=>(e.sourceKind&&e.sourceKind!=='JOINT_ATTACK')||e.kind==='reaction');
    const heading=root.querySelector('.battle-heading .eyebrow');if(heading)heading.textContent='ROUND '+frame.round;
    for(const order of root.querySelectorAll('.battle-order li'))order.classList.toggle('current',order.dataset.actorId===frame.actorId);
    for(const actor of root.querySelectorAll('.combatant-row[data-actor-id]'))actor.classList.toggle('acting',!auxiliary&&actor.dataset.actorId===frame.actorId);
    const actionLabel=[frame.actor,frame.cardName||frame.events.find(e=>e.kind==='skill')?.label||(auxiliary?'효과':'행동'),frame.periodic?'지속 효과':auxiliary?'반응·추가 효과':'1회 행동',frame.attemptCount>1?frame.attemptCount+'연타':''].filter(Boolean).join(' · ');
    if(this.dock){
      this.dock.querySelector('.playback-message').textContent=actionLabel;
      const outcomes=this.dock.querySelector('.playback-outcomes');outcomes.replaceChildren();
      for(const t of frame.targets){
        const parts=[t.damage?'피해 '+t.damage:'',t.critical?'치명타 포함':'',t.heal?'회복 +'+t.heal:'',t.absorbed?'보호막 흡수 '+t.absorbed:'',t.missCount?'빗나감 '+t.missCount+'회':'',t.immuneCount?'면역 '+t.immuneCount+'회':'',Number.isFinite(t.hpBefore)&&Number.isFinite(t.hpAfter)?'HP '+t.hpBefore+' → '+t.hpAfter:''].filter(Boolean);
        if(parts.length)outcomes.append(el('p','',t.target+' · '+parts.join(' / ')));
      }
      if(frame.reactions.length)outcomes.append(el('p','reaction-summary',frame.reactions.join(' · ')));
      if(!outcomes.children.length)outcomes.append(el('p','',frame.events.map(e=>e.label).filter(Boolean).join(' · ')));
    }
    let cue=null,flashed=false;
    for(const t of frame.targets){
      const target=this.actorNode(t.targetId),rect=target?.getBoundingClientRect(),hit=t.events.find(e=>e.kind==='damage')||t.events.find(e=>e.kind==='heal')||t.events[0];
      if(target&&Number.isFinite(t.hpAfter)){
        const max=t.maxHp||Number(target.dataset.maxHp)||1;
        target.querySelector('.stat').textContent='HP  '+t.hpAfter+' / '+max;target.querySelector('.meter i').style.width=Math.max(0,t.hpAfter/max*100)+'%';target.classList.toggle('dead',t.hpAfter<=0);
        if(t.targetId==='PLAYER_CUSTOM'){const sidebar=root.querySelector('.player-card');if(sidebar){const stat=sidebar.querySelector('.stat'),bar=sidebar.querySelector('.meter i');if(stat)stat.textContent='HP  '+t.hpAfter+' / '+max;if(bar)bar.style.width=Math.max(0,t.hpAfter/max*100)+'%';}}
      }
      if(rect&&rect.bottom>100&&rect.top<innerHeight-240){
        const item=el('div','impact effect-'+(hit?.element||'hit')+' kind-action'+(t.critical?' critical':''));
        item.style.left=Math.max(80,Math.min(innerWidth-80,rect.left+rect.width/2))+'px';item.style.top=Math.max(140,Math.min(innerHeight-250,rect.top+rect.height/2))+'px';
        item.append(el('strong','impact-label',t.damage?String(t.damage):t.heal?'+'+t.heal:t.immuneCount?'면역':t.missCount?'빗나감':t.events.find(e=>e.kind==='capacity')?.label||'방어'));
        if(t.attemptCount>1)item.append(el('small','impact-target',t.attemptCount+'연타 합계'));
        if(t.critical)item.append(el('small','impact-target','치명타 포함'));
        layer.append(item);
      }
      if(t.damage&&t.side==='ALLY')flashed=true;
      cue=cue||hit?.cue;
    }
    CombatFX.impact(frame,this);
    if(flashed&&!settings.reducedMotion&&settings.damageFlash&&performance.now()-this.lastFlash>=450){this.lastFlash=performance.now();const flash=el('div','damage-flash');layer.append(flash);setTimeout(()=>flash.remove(),280);}
    if(cue)GameAudio.play(cue==='hit'&&/SLIME/i.test(frame.actorId)?'slime_hit':cue);
  },
  show(event){
    if(['victory','defeat'].includes(event.kind)){for(const node of root.querySelectorAll('.battle-order,.battle-command,.enemy-intel-panel,.enemy-intel-toolbar'))node.hidden=true;BattleTechnique?.clear();const phase=root.querySelector('.phase-note');if(phase)phase.textContent=event.kind==='victory'?'전투 승리':'전투 종료';}
    if(event.kind==='action'){this.showAction(event);return;}
    this.dock?.querySelector('.playback-outcomes')?.replaceChildren();
    const layer=this.layerNode();layer.replaceChildren();
    const heading=root.querySelector('.battle-heading .eyebrow');if(heading)heading.textContent=event.round?'ROUND '+event.round:'전투 진행';
    for(const order of root.querySelectorAll('.battle-order li'))order.classList.toggle('current',order.dataset.actorId===event.actorId);
    const target=this.actorNode(event.targetId),rect=target?.getBoundingClientRect(),item=el('div','impact effect-'+event.element+' kind-'+event.kind+(event.critical?' critical':''));
    const onScreen=rect&&rect.bottom>100&&rect.top<innerHeight-160;
    item.style.left=onScreen?Math.max(80,Math.min(innerWidth-80,rect.left+rect.width/2))+'px':'50%';item.style.top=onScreen?Math.max(140,Math.min(innerHeight-200,rect.top+rect.height/2))+'px':'35%';
    item.append(el('strong','impact-label',event.label));if(event.critical)item.append(el('small','impact-target','치명타'));if(!onScreen&&event.target)item.append(el('small','impact-target',event.target));layer.append(item);
    if(target&&Number.isFinite(event.hpAfter)){
      const max=event.maxHp||Number(target.dataset.maxHp)||1;
      target.querySelector('.stat').textContent='HP  '+event.hpAfter+' / '+max;target.querySelector('.meter i').style.width=Math.max(0,event.hpAfter/max*100)+'%';target.classList.toggle('dead',event.hpAfter<=0);
      if(event.targetId==='PLAYER_CUSTOM'){const sidebar=root.querySelector('.player-card');if(sidebar){const stat=sidebar.querySelector('.stat'),bar=sidebar.querySelector('.meter i');if(stat)stat.textContent='HP  '+event.hpAfter+' / '+max;if(bar)bar.style.width=Math.max(0,event.hpAfter/max*100)+'%';}}
    }
    for(const actor of root.querySelectorAll('.combatant-row[data-actor-id]'))actor.classList.toggle('acting',actor.dataset.actorId===event.actorId);
    if(this.dock){const details=[event.actor&&event.target?event.actor+' → '+event.target:event.actor||event.target,event.kind==='skill'?'':event.cardName,event.kind==='damage'?(event.critical?'치명타 · ':'')+event.amount+' 피해':event.kind==='heal'?event.amount+' 회복':event.label,Number.isFinite(event.hpBefore)?'HP '+event.hpBefore+' → '+event.hpAfter:''].filter(Boolean);this.dock.querySelector('.playback-message').textContent=details.join(' · ');}
    if(!settings.reducedMotion&&['damage','miss','immune'].includes(event.kind)){
      const attacker=this.actorNode(event.actorId);attacker?.animate?.([{transform:'translateX(0)'},{transform:'translateX(10px)',filter:'brightness(1.4)'},{transform:'translateX(0)'}],{duration:350,easing:'ease-out'});
    }
    if(!settings.reducedMotion&&event.kind==='damage'){
      target?.animate?.([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:220,easing:'ease-out'});
      if(event.side==='ALLY'&&settings.damageFlash&&performance.now()-this.lastFlash>=450){this.lastFlash=performance.now();const flash=el('div','damage-flash');layer.append(flash);setTimeout(()=>flash.remove(),280);}
    }
    if(event.cue)GameAudio.play(event.cue);
  },
  async play(events){
    const fresh=[];for(const e of events)if(!this.seen.has(e.key)){this.seen.add(e.key);fresh.push(e);}while(this.seen.size>500)this.seen.delete(this.seen.values().next().value);
    if(!fresh.length||document.hidden)return;
    this.cancel();const generation=this.generation;this.active=true;root.inert=true;const command=root.querySelector('.battle-command');command?.replaceChildren(el('h2','','전투 진행 중'),el('p','','한 행동씩 확인하고 있습니다. 아래에서 속도를 바꾸거나 잠시 멈출 수 있습니다.'));root.querySelector('.encounter-intro')?.remove();const stage=root.querySelector('.compact-battle-stage');if(stage&&command){command.parentNode.insertBefore(stage,command);stage.scrollIntoView({block:'nearest',behavior:'instant'});}const phase=root.querySelector('.phase-note');if(phase)phase.textContent='전투 진행 중';document.documentElement.classList.add('av-running');
    const dock=el('section','combat-playback');dock.setAttribute('aria-label','전투 진행 조절');this.dock=dock;
    const readout=el('p','playback-message');readout.setAttribute('role','status');readout.setAttribute('aria-live','polite');
    const position=el('small','playback-position'),controls=el('div','playback-buttons'),pause=button('일시정지',()=>{this.paused=!this.paused;CombatFX.pause(this.paused);pause.textContent=this.paused?'계속 재생':'일시정지';pause.setAttribute('aria-pressed',String(this.paused));this.reschedule();});
    controls.append(pause,button('다음 표시',()=>this.advance()),button('결과 바로 보기',()=>this.cancel()));dock.append(position,readout,el('div','playback-outcomes'),combatSpeedControl(),controls);document.body.append(dock);
    try{for(let i=0;i<fresh.length;i++){if(generation!==this.generation||document.hidden)break;position.textContent='전투 진행 '+(i+1)+' / '+fresh.length+(fresh[i].round?' · '+fresh[i].round+'라운드':'');if(fresh[i].kind==='action'){CombatFX.windup(fresh[i],this);this.beatDuration=settings.reducedMotion?100:270;await new Promise(resolve=>{this.resolve=resolve;this.reschedule();});if(generation!==this.generation||document.hidden)break;}this.show(fresh[i]);CombatFX.pause(this.paused);this.beatDuration=fresh[i].kind==='action'?1200:1400;await new Promise(resolve=>{this.resolve=resolve;this.reschedule();});}}
    finally{if(generation===this.generation){this.cancel();if(!game?.s.runtime)render();}}
  }
};
let renderedSaveId=null;
const avRender=render;
render=function(){
  const saveId=game?.s.global.SAVE_ID||null;if(saveId!==renderedSaveId){GameEffects.cancel();GameEffects.seen.clear();renderedSaveId=saveId;}
  if(game&&presenterDB!==game.db){presenterDB=game.db;itemPresenter=CRPGInventoryPresenter.create(presenterDB,MANIFEST);}
  const old=[...root.querySelectorAll('img')];avRender();optimizeImages(old);root.inert=busy;root.setAttribute('aria-busy',String(busy));document.documentElement.classList.toggle('action-pending',busy);if(busy){const status=el('div','action-status','처리 중…');status.setAttribute('role','status');root.append(status);}GameAudio.sync();
};
// Commit once, then replay the captured battle view. Saves always use the committed state.
act=async function(type,params={}){
  if(busy||!game)return;busy=true;
  try{
    if(type==='WAIT'){const reason=game.actionReason(type,params);if(reason)throw Error(reason);render();await playWaitProgress(params.minutes);}
    const completedQuestsBefore=new Set(Object.entries(game.s.quests).filter(([,q])=>q.state==='완료').map(([id])=>id));
    const battleBefore=game.s.runtime?JSON.parse(JSON.stringify(game.s)):null,adventureBefore=adventureSnapshot(),before=CRPGPresentation.snapshot(game.s),entryCheckpoint=game.playPhase()==='FREE'&&['JOURNEY_RESUME','STORY_NEXT','MAIN_STORY_ACCEPT','STORY_CHAPTER','STORY_RESUME','LEGEND_ENTER','AFFECTION_ENTER'].includes(type)?JSON.parse(game.serialize()):null;
    let historyEntry=null;if(type==='STORY_NEXT'){const n=game.storyNode();if(n&&n[9]&&scenePermitted())historyEntry={speaker:displayText(n[7]||'이야기'),text:displayText(game.storyDisplayText?.(n)??n[9]),...sceneClassification()};}
    lastResult=game.action(type,params);if(historyEntry)sceneHistory.push(historyEntry);if(type==='NPC')selectedNPC=params.entity;
    if(type==='RELATION_ACTIVITY'&&lastResult?.result?.dialogue){const c=el('div');c.append(el('p','story',lastResult.result.dialogue));showModal('일상 교류',c);}
    const effects=CRPGPresentation.actionFrames(CRPGPresentation.delta(before,game.s));say('');
    if(battleBefore&&effects.length){const committed=game.s;try{game.s=battleBefore;game.s.global.SCREEN_MODE='COMBAT';if(game.s.runtime.interlude)game.s.runtime.interlude=null;render();}finally{game.s=committed;}}else render();
    if(type==='LIFE_START'&&params.kind==='HUNT')GameAudio.play('hunt_bow');if(type==='LIFE_START'&&params.kind==='GATHER')GameAudio.play('birds');if(type==='LIFE_FINISH'&&lastResult?.result?.kind==='HUNT')GameAudio.play(lastResult.result.items?.ING_FOWL?'birds':'hunt_pig');
    if(['EQUIP','UNEQUIP','PARTY','PARTY_REPLACE','PARTY_SWAP'].includes(type))GameAudio.play('equip');
    if(type==='COMMISSION_ACCEPT')GameAudio.play('commission_accept');if(type!=='CLAIM_QUEST'&&Object.entries(game.s.quests).some(([id,q])=>q.state==='완료'&&!completedQuestsBefore.has(id)))GameAudio.play('quest_complete');if(['WORLD_WORK_FINISH','WORLD_WORK_START'].includes(type)&&lastResult?.result?.point&&lastResult.result.items)GameAudio.play('unlock');
    if(['BUY','SELL'].includes(type))GameAudio.play('item_receive');if(type==='CLAIM_QUEST')GameAudio.play('commission_complete');if(type==='CRAFT'){const recipe=game.tables['17_RECIPE_DB'].get(params.recipe);GameAudio.play(recipe?.[1]==='요리'?'cook_complete':recipe?.[1]==='단조'?'forge_complete':'craft_complete');}
    const save=async()=>{if(entryCheckpoint&&game.playPhase()!=='FREE')try{await storeStoryCheckpoint(entryCheckpoint);}catch{say('이야기 시작 전 기록을 남기지 못했습니다. 현재 진행은 자동 저장합니다.');}try{await storeSave();}catch{}};
    await Promise.all([save(),GameEffects.play(effects),playTravel(adventureBefore,type)]);showReceivedLoot(receivedLoot(adventureBefore,type));if(!battleBefore&&game.s.runtime?.actors.some(a=>a.side==='ENEMY'&&/HILI/i.test(a.source)))GameAudio.play('encounter_hilichurl');return lastResult;
  }catch(e){say(e.message);return {ok:false,error:e.message};}
  finally{busy=false;render();}
};
// Loading/restoring is deliberately silent; effects only originate from new actions.
const avRestore=restoreUIState;
restoreUIState=function(){GameEffects.cancel();GameEffects.seen.clear();GameAudio.stop();avRestore();};
boot();
