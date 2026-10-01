/* 0.14.7 sound set: every effect is a Genshin recording. In-game recordings (the Sam Toki collection already
 * credited in audio/genshin-sfx/CREDITS.md, trimmed so they start at once and levelled to the same loudness) and
 * official web-event sounds. Nothing is synthesised. Each game sound has one or more candidates; the first is the
 * default and the player can audition and pick another in 설정 → 소리 · 효과음 고르기 (settings.sfxChoice).
 * Plain hits take the attacker's colour where a recording exists (a bow user's shot, a hilichurl's blow).
 * Volume and on/off follow the existing 소리 settings. Load after app_av.js. */
(function(){
'use strict';
if(typeof GameAudio==='undefined')return;
const S=window.CRPGSound={};
// Game sound → candidates [asset id, label]. Asset ids are audio/genshin-sfx files (MANIFEST.sfx) or the
// official web-event click; 'none' plays nothing.
const CHOICES={
 click:[['ig_click_general2','본편 기본 클릭'],['ig_click_general1','본편 클릭 2'],['ig_click_general3','본편 클릭 3'],['official_click','웹 이벤트 클릭']],
 hover:[['ig_hover_nav','본편 초점 이동'],['ig_click_general5','본편 짧은 클릭'],['none','소리 없음']],
 tab:[['ig_tab_click2','본편 탭'],['ig_tab_click1','본편 큰 탭'],['ig_tab_small','본편 작은 탭']],
 choice:[['ig_next','본편 대화 넘김'],['ig_ding','본편 딩'],['ig_dialog_open','본편 대화창']],
 toast:[['ig_notification','본편 알림'],['ig_hint','본편 짧은 힌트'],['ig_quest_hint','본편 임무 힌트']],
 error:[['ig_didi','본편 삐빅'],['ig_beep3','본편 삑 1'],['ig_beep1','본편 삑 2']],
 menu_open:[['ig_paimon_open','본편 페이몬 메뉴 열기'],['ig_menu_open','본편 메뉴 열기']],
 menu_close:[['ig_paimon_close','본편 페이몬 메뉴 닫기'],['ig_menu_close','본편 메뉴 닫기']],
 page:[['ig_page_flip1','본편 책장 넘김 1'],['ig_page_flip2','본편 책장 넘김 2']],
 handbook_open:[['ig_quests_open','본편 임무 일지 열기'],['ig_battlepass_open','본편 기행 열기'],['ig_archive_home','본편 도감 열기'],['ig_achievements_open','본편 업적 열기']],
 travel:[['ig_teleport','본편 순간이동'],['ig_reach_destination','본편 목적지 도착']],
 equip:[['equip','본편 장착 1'],['ig_item_arm2','본편 장착 2']],
 item_receive:[['item_receive','본편 아이템 획득'],['ig_obtained1','본편 획득 2'],['ig_reward_popup','본편 보상 표시']],
 unlock:[['unlock','웹 이벤트 해제'],['ig_chest_unlock','본편 상자 잠금 해제']],
 quest_complete:[['quest_complete','본편 임무 완료']],
 commission_accept:[['commission_accept','본편 의뢰 수락']],
 commission_complete:[['commission_complete','본편 의뢰 완료']],
 cook_complete:[['cook_complete','본편 요리 완료']],
 forge_complete:[['forge_complete','본편 단조 완료']],
 craft_complete:[['craft_complete','본편 합성 완료']],
 level_up:[['ig_battlepass_levelup','본편 기행 레벨업'],['ig_obtained2','본편 획득 팡파르'],['ig_constellation','본편 운명의 자리'],['ig_rank_popup','본편 모험 등급']],
 victory:[['quest_complete','본편 임무 완료'],['victory','본편 도전 성공']],
 defeat:[['defeat','본편 도전 실패'],['event_fail','웹 이벤트 실패'],['ost_defeat_moonlike','OST · Moonlike Smile'],['ost_defeat_fragile','OST · Fragile Fantasy']],
 battle_start:[['ig_abyss_deepen','본편 나선비경 진입'],['ig_domain_enter','본편 비경 입장'],['ig_countdown','본편 카운트다운']],
 encounter_hilichurl:[['encounter_hilichurl','본편 츄츄족 발견']],
 hit:[['ig_box_break','본편 나무 상자 타격'],['ig_pot_break','본편 항아리 깨짐'],['ig_chest_open','본편 상자 뚜껑'],['ig_hilichurl_attacked','본편 츄츄족 피격']],
 bow_hit:[['ig_bow_shot','본편 활 공격']],
 hili_hit:[['ig_hilichurl_attack','본편 츄츄족 공격'],['ig_box_break','본편 나무 상자 타격']],
 slime_hit:[['slime_hit','본편 슬라임 공격']],
 guard:[['ig_chest_open','본편 상자 뚜껑'],['ig_box_break','본편 나무 상자 타격'],['ig_pot_break','본편 항아리 깨짐']],
 heal:[['ig_statue_heal','본편 신상 회복'],['ig_exp_up','본편 경험치 상승'],['heal','본편 신상 회복(전체)']],
 fire:[['ig_torch','본편 횃불 점화'],['fire','웹 이벤트 불']],
 water:[['ig_swim_splash_a','본편 물보라 1'],['ig_swim_splash_b','본편 물보라 2'],['ig_swim_stroke','본편 물살'],['slime_hit','본편 슬라임 공격']],
 ice:[['ice','웹 이벤트 얼음']],
 lightning:[['ig_thunder_sphere','본편 번개 구체'],['lightning','웹 이벤트 번개'],['ig_raiden_burst','본편 라이덴 원소폭발'],['ig_electrogranum','본편 번개 석류']],
 wind:[['ig_venti_skill','본편 벤티 원소전투'],['wind','웹 이벤트 바람'],['ig_venti_burst','본편 벤티 원소폭발'],['ig_wing','본편 날개']],
 rock:[['ig_zhongli_burst','본편 종려 원소폭발'],['ig_pressure_plate','본편 발판 장치'],['ig_pot_break','본편 항아리 깨짐']],
 dendro:[['ig_nahida_skill','본편 나히다 원소전투'],['ig_nahida_charged','본편 나히다 강공격'],['ig_nahida_hit','본편 나히다 일반공격']],
 melt:[['fire','웹 이벤트 불'],['ig_torch','본편 횃불 점화']],
 vaporize:[['ig_swim_splash_b','본편 물보라'],['fire','웹 이벤트 불']],
 overload:[['ig_raiden_burst','본편 라이덴 원소폭발'],['ig_thunder_sphere2','본편 번개 구체 2']],
 freeze:[['ice','웹 이벤트 얼음']]
};
// Playback level per sound. Every recording is first brought to the same loudness (see normal()); 0.45 is the
// level the game always used for recordings, and interface ticks sit a little under the rest.
const LEVEL={hover:.35,click:.7,tab:.7,choice:.75,error:.75,page:.75};
const BASE=.45,OST=.6;
// Loudness as heard: the loudest 50 ms above 150 Hz. Recordings from different sources differ by up to ~10 dB, so
// each buffer gets a gain toward -24 dBFS (at most +8 dB, never past full scale).
const norms=new WeakMap();
function normal(b){
 let g=norms.get(b);if(g)return g;
 const sr=b.sampleRate,n=Math.min(b.length,Math.round(sr*3)),ch=b.numberOfChannels,w=2*Math.PI*150/sr,c=Math.cos(w),a=Math.sin(w)/1.414,a0=1+a,k=[(1+c)/2/a0,-(1+c)/a0,(1+c)/2/a0,-2*c/a0,(1-a)/a0];
 let x1=0,x2=0,y1=0,y2=0,peak=0;const x=new Float32Array(n),data=Array.from({length:ch},(_,i)=>b.getChannelData(i));
 for(let i=0;i<n;i++){let v=0;for(const d of data)v+=d[i]/ch;const y=k[0]*v+k[1]*x1+k[2]*x2-k[3]*y1-k[4]*y2;x2=x1;x1=v;y2=y1;y1=y;x[i]=y;}
 for(const d of data)for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>peak)peak=v;}
 const W=Math.round(sr*.05);let loud=0;for(let s=0;s<n;s+=W>>1){let e=0;const end=Math.min(n,s+W);for(let i=s;i<end;i++)e+=x[i]*x[i];loud=Math.max(loud,Math.sqrt(e/W));}
 g=loud>0?Math.min(Math.pow(10,-24/20)/loud,2.5,peak>0?.98/peak:2.5):1;norms.set(b,g);return g;
}
const KEEP=new Set(['birds','hunt_bow','hunt_pig']);
const sfxEntry=id=>{if(id==='official_click')return {url:'audio/official-review-click.mp3'};return typeof MANIFEST!=='undefined'?MANIFEST.sfx?.[id]||null:null;};
const usable=id=>id==='none'||!!sfxEntry(id);
S.CHOICES=CHOICES;S.usable=usable;
S.options=name=>(CHOICES[name]||[]).filter(([id])=>usable(id));
S.choice=name=>{const list=S.options(name),saved=settings.sfxChoice?.[name];return list.some(([id])=>id===saved)?saved:list[0]?.[0]||null;};
S.setChoice=function(name,id){settings.sfxChoice={...(settings.sfxChoice||{}),[name]:id};try{persistSettings();}catch{}};
const priorBuffer=GameAudio.buffer.bind(GameAudio);
// The official click is fetched by app_av.js under the name 'click'.
GameAudio.buffer=async function(name,force){if(!this.context)return null;if(KEEP.has(name))return priorBuffer(name);const id=force||S.choice(name);if(!id||id==='none')return null;return priorBuffer(id==='official_click'?'click':id);};
const levelOf=(name,id)=>String(id).startsWith('ost_')?OST:BASE*(LEVEL[name]??1);
// OST endings fade in quickly and out gently; everything else plays as recorded.
function playBuffer(buffer,level,id){
 const c=GameAudio.context,src=c.createBufferSource(),g=c.createGain(),t=c.currentTime;src.buffer=buffer;level*=normal(buffer);
 if(String(id).startsWith('ost_')){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.12);g.gain.setValueAtTime(level,t+Math.max(.2,buffer.duration-1.1));g.gain.linearRampToValueAtTime(0,t+buffer.duration);}else g.gain.value=level;
 src.connect(g).connect(c.destination);return {src,g};
}
// Fanfares dip the music for their length so they are heard.
const DUCK=new Set(['victory','defeat','level_up','quest_complete','commission_complete']);let duckUntil=0;
const priorSync=GameAudio.sync.bind(GameAudio);
GameAudio.sync=function(...args){const out=priorSync(...args);if(this.music&&performance.now()<duckUntil)this.music.volume=Math.min(this.music.volume,settings.musicVolume*.65*.25);return out;};
function duck(seconds){duckUntil=performance.now()+seconds*1000;const m=GameAudio.music;if(m)m.volume=Math.min(m.volume,settings.musicVolume*.65*.25);clearTimeout(S.duckTimer);S.duckTimer=setTimeout(()=>{duckUntil=0;try{GameAudio.sync();}catch{}},seconds*1000+120);}
// Settings: listen to a candidate (it does not change the choice by itself).
S.audition=async function(name,id){try{await GameAudio.unlock?.();S.stopAudition();if(id==='none')return;const b=await GameAudio.buffer(name,id);if(!b||!GameAudio.context)return;const {src}=playBuffer(b,(settings.sfxVolume||.6)*levelOf(name,id),id);S.auditionSource=src;src.start();if(DUCK.has(name))duck(b.duration);}catch{}};
S.stopAudition=()=>{try{S.auditionSource?.stop();}catch{}S.auditionSource=null;};
// A tab, page or menu has its own sound in Genshin; the generic click that every button makes yields to it.
const OWN_CLICK=new Set(['tab','page','menu_open','menu_close','handbook_open']);
GameAudio.play=async function(name){
 if(!this.armed||!this.enabled()||document.hidden||!settings.sfxVolume)return;
 const now=performance.now();
 if(OWN_CLICK.has(name)&&now-(this.clickAt||0)<150){this.clickSkip=this.clickToken;try{this.clickSource?.stop();}catch{}}
 let token=0;if(name==='click'){token=this.clickToken=(this.clickToken||0)+1;this.clickAt=now;}
 const ui=['click','hover','tab','equip'].includes(name);if(ui){const gap=name==='hover'?45:90;if(now-(this['last_'+name]||0)<gap)return;this['last_'+name]=now;}
 const epoch=this.epoch,id=KEEP.has(name)?name:S.choice(name),buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||!this.enabled()||document.hidden||this.context.state!=='running')return;
 if(token&&this.clickSkip===token)return;
 if(this.voices.size>=8){const old=this.voices.values().next().value;try{old.stop();}catch{}this.voices.delete(old);}
 const {src:source,g:gain}=playBuffer(buffer,settings.sfxVolume*levelOf(name,id),id);
 this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();if(this.clickSource===source)this.clickSource=null;};source.start();if(token)this.clickSource=source;if(DUCK.has(name))duck(buffer.duration);
};
S.play=name=>{try{GameAudio.play(name);}catch{}};
S.hover=()=>S.play('hover');
// Plain hits take the attacker's colour: a bow user's shot sounds like a bow, a hilichurl's blow like a hilichurl.
// Slimes keep app_av.js's own slime sound; elemental hits keep their element.
function weaponOf(id){
 try{const owner=String(id||'').split('#')[0],inv=game.s.inventory.find(i=>i.equipped&&i.owner===owner&&i.equip&&['한손검','양손검','장병기','활','법구'].includes(game.row('16_EQUIP_DB',i.equip)?.[2]));
  return inv?game.row('16_EQUIP_DB',inv.equip)[2]:(game.equipmentProficiencies?.(owner)||[])[0]||null;}catch{return null;}
}
if(window.CRPGPresentation?.actionFrames){
 const priorFrames=CRPGPresentation.actionFrames;
 CRPGPresentation.actionFrames=function(events){
  const frames=priorFrames(events);
  try{for(const f of frames){if(f.kind!=='action')continue;const id=String(f.actorId||'');let cue=null;
   if(/^MON_.*HILI/i.test(id))cue='hili_hit';else if(!/^MON_/i.test(id)&&typeof game!=='undefined'&&game&&weaponOf(id)==='활')cue='bow_hit';
   if(cue)for(const t of f.targets)for(const e of t.events)if(e.cue==='hit')e.cue=cue;}}catch{}
  return frames;
 };
}
// Sounds for things that happen through actions.
if(typeof act==='function'){
 const priorAct=act;
 act=async function(type,params={}){
  const lv=typeof game!=='undefined'&&game?Number(game.s.global.PLAYER_LEVEL_STATE)||0:0;
  const out=await priorAct(type,params);
  try{
   if(out&&out.ok===false){if(type!=='MENU')S.play('error');}
   else if(typeof game!=='undefined'&&game){
    if(type==='STORY_CHOICE')S.play('choice');
    if(type==='COMBAT_BEGIN')S.play('battle_start');
    if(type==='MOVE')S.play('travel');
    const now=Number(game.s.global.PLAYER_LEVEL_STATE)||0;if(lv&&now>lv){S.play('level_up');window.CRPGShell?.levelUp?.(lv,now);}
   }
  }catch{}
  return out;
 };
}
})();
