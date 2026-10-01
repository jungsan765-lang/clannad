/* 0.14.7 sound set. Every effect is synthesised in the browser with Web Audio, replacing the web-event slime
 * sounds: element hits, reactions, guard and healing, victory and defeat, encounters, and the interface itself
 * (pointer hover, clicks, menus, tabs, the handbook's pages, rewards and level-ups). Combat sounds render a few
 * variants so repeated hits do not sound identical. Volume and on/off follow the existing 소리 settings; the
 * music player and the recorded nature sounds (birds, bow, boar) are unchanged. Load after app_av.js. */
(function(){
'use strict';
if(typeof GameAudio==='undefined')return;
const SR=44100,NOTE=n=>440*Math.pow(2,(n-69)/12),rnd=(a,b)=>a+Math.random()*(b-a);
const S=window.CRPGSound={lastHover:0,lastTab:0};
const noiseCache=new WeakMap();
function noiseBuffer(o){let b=noiseCache.get(o);if(b)return b;const len=o.sampleRate*2;b=o.createBuffer(1,len,o.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;noiseCache.set(o,b);return b;}
function envelope(param,t,a,peak,d){param.setValueAtTime(.0001,t);param.exponentialRampToValueAtTime(Math.max(peak,.0002),t+Math.max(a,.002));param.exponentialRampToValueAtTime(.0001,t+Math.max(a,.002)+Math.max(d,.005));}
function route(o,node,dest,pan){if(pan){const p=o.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));node.connect(p).connect(dest);}else node.connect(dest);}
function osc(o,dest,{type='sine',f=440,f2=0,glide=0,t=0,a=.005,d=.2,g=.3,pan=0,detune=0}){
 const os=o.createOscillator(),gn=o.createGain();os.type=type;os.frequency.setValueAtTime(f,t);if(f2)os.frequency.exponentialRampToValueAtTime(f2,t+(glide||a+d));os.detune.value=detune;
 envelope(gn.gain,t,a,g,d);os.connect(gn);route(o,gn,dest,pan);os.start(t);os.stop(t+a+d+.05);
}
function noise(o,dest,{t=0,a=.003,d=.2,g=.3,type='bandpass',f=1200,f2=0,glide=0,q=1,pan=0}){
 const src=o.createBufferSource(),fl=o.createBiquadFilter(),gn=o.createGain();src.buffer=noiseBuffer(o);
 fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+(glide||a+d));fl.Q.value=q;
 envelope(gn.gain,t,a,g,d);src.connect(fl).connect(gn);route(o,gn,dest,pan);src.start(t,Math.random()*1.5);src.stop(t+a+d+.05);
}
// Inharmonic partials make glass and metal; near-harmonic ones make soft chimes.
function bell(o,dest,{f=880,t=0,d=.8,g=.2,a=.002,pan=0,partials=[[1,1],[2.01,.42],[3.02,.2],[4.17,.12]]}){for(const [m,amp]of partials)osc(o,dest,{f:f*m,t,a,d:d/Math.sqrt(m),g:g*amp,pan});}
function pluck(o,dest,{f=330,t=0,d=.6,g=.35,pan=0}){
 const os=o.createOscillator(),fl=o.createBiquadFilter(),gn=o.createGain();os.type='sawtooth';os.frequency.value=f;fl.type='lowpass';fl.Q.value=4;
 fl.frequency.setValueAtTime(f*14,t);fl.frequency.exponentialRampToValueAtTime(f*1.2,t+d*.6);envelope(gn.gain,t,.002,g,d);os.connect(fl).connect(gn);route(o,gn,dest,pan);os.start(t);os.stop(t+d+.05);
}
function crackle(o,dest,{t=0,span=.4,n=8,f=[2500,6000],g=[.1,.3]}){for(let i=0;i<n;i++)noise(o,dest,{type:'highpass',f:rnd(f[0],f[1]),t:t+Math.random()*span,a:.001,d:rnd(.008,.025),g:rnd(g[0],g[1])});}
const arp=(o,x,notes,{t=0,step=.06,d=.6,g=.12,spread=.15}={})=>notes.forEach((n,i)=>bell(o,x,{f:NOTE(n),t:t+i*step,d,g,pan:(i-(notes.length-1)/2)*spread}));
// d: rendered length, v: playback level (before the 효과음 음량 setting), n: variants.
const SOUNDS={
 hover:{d:.07,v:.16,b(o,x){osc(o,x,{f:NOTE(rnd(95,99)),a:.002,d:.045,g:.22});osc(o,x,{type:'triangle',f:NOTE(103),t:.006,a:.002,d:.03,g:.06});},n:2},
 click:{d:.14,v:.42,b(o,x){bell(o,x,{f:NOTE(91),d:.1,g:.2,partials:[[1,1],[2.4,.3]]});noise(o,x,{type:'highpass',f:3600,d:.02,g:.1});}},
 tab:{d:.13,v:.4,b(o,x){osc(o,x,{type:'triangle',f:NOTE(84),f2:NOTE(89),glide:.04,d:.08,g:.24});noise(o,x,{f:2400,q:2,d:.03,g:.07});}},
 menu_open:{d:.8,v:.55,b(o,x){noise(o,x,{f:480,f2:3200,q:1.1,a:.07,d:.32,g:.32,glide:.32});arp(o,x,[84,88,91,96],{t:.08,step:.05,d:.55,g:.11,spread:.2});}},
 menu_close:{d:.55,v:.45,b(o,x){noise(o,x,{f:2800,f2:420,q:1.1,a:.02,d:.3,g:.28,glide:.28});bell(o,x,{f:NOTE(79),t:.06,d:.35,g:.11});}},
 page:{d:.34,v:.55,b(o,x){for(let i=0;i<5;i++)noise(o,x,{f:1700+i*480,q:1.4,t:i*.034,a:.004,d:.05,g:.24-i*.03,pan:-.2+i*.1});noise(o,x,{type:'lowpass',f:900,t:.12,d:.15,g:.14});}},
 handbook_open:{d:1.2,v:.6,b(o,x){SOUNDS.page.b(o,x);arp(o,x,[72,76,79,84,88],{t:.12,step:.06,d:.75,g:.11});}},
 toast:{d:.45,v:.38,b(o,x){bell(o,x,{f:NOTE(88),d:.35,g:.17});bell(o,x,{f:NOTE(95),t:.05,d:.3,g:.08});}},
 error:{d:.32,v:.55,b(o,x){osc(o,x,{type:'triangle',f:190,f2:110,d:.18,g:.32});noise(o,x,{type:'lowpass',f:520,d:.1,g:.18});}},
 choice:{d:.65,v:.45,b(o,x){bell(o,x,{f:NOTE(84),d:.45,g:.15});bell(o,x,{f:NOTE(91),t:.06,d:.4,g:.11});}},
 equip:{d:.75,v:.6,b(o,x){bell(o,x,{f:NOTE(81),d:.55,g:.17,partials:[[1,1],[2.76,.45],[5.4,.25],[8.93,.12]]});noise(o,x,{type:'highpass',f:5200,d:.06,g:.14});osc(o,x,{f:NOTE(57),d:.15,g:.16});}},
 travel:{d:1.25,v:.5,b(o,x){noise(o,x,{f:300,f2:1400,q:.8,a:.25,d:.7,g:.34,glide:.5});noise(o,x,{f:1400,f2:400,q:.8,t:.45,a:.05,d:.6,g:.24,glide:.6});bell(o,x,{f:NOTE(88),t:.78,d:.4,g:.07});}},
 item_receive:{d:1.05,v:.55,b(o,x){arp(o,x,[84,88,91,96],{step:.07,d:.5,g:.13,spread:.25});noise(o,x,{type:'highpass',f:7000,t:.05,a:.05,d:.5,g:.07});}},
 unlock:{d:1.45,v:.55,b(o,x){osc(o,x,{f:NOTE(72),f2:NOTE(84),glide:.5,a:.1,d:.6,g:.14});arp(o,x,[79,84,88,91,96],{t:.25,step:.06,d:.7,g:.11});}},
 quest_complete:{d:2.1,v:.65,b(o,x){[60,64,67,72].forEach((n,i)=>{osc(o,x,{type:'triangle',f:NOTE(n),t:i*.09,a:.02,d:1.2,g:.11});bell(o,x,{f:NOTE(n+24),t:i*.09,d:.9,g:.07});});osc(o,x,{f:NOTE(48),a:.2,d:1.4,g:.12});noise(o,x,{type:'highpass',f:6500,t:.3,a:.2,d:.9,g:.06});}},
 commission_accept:{d:.95,v:.55,b(o,x){bell(o,x,{f:NOTE(79),d:.6,g:.15});bell(o,x,{f:NOTE(86),t:.1,d:.6,g:.13});}},
 commission_complete:{d:1.45,v:.6,b(o,x){arp(o,x,[79,83,86,91],{step:.08,d:.8,g:.13});noise(o,x,{type:'highpass',f:6000,t:.2,a:.1,d:.7,g:.06});}},
 cook_complete:{d:1.15,v:.55,b(o,x){for(let i=0;i<4;i++)osc(o,x,{f:500+i*170,f2:900+i*200,glide:.06,t:i*.07,d:.08,g:.14});arp(o,x,[84,88,91],{t:.35,step:.07,d:.5,g:.11});}},
 forge_complete:{d:1.7,v:.6,b(o,x){bell(o,x,{f:330,d:1.2,g:.24,partials:[[1,1],[2.72,.6],[5.1,.35],[8.4,.2],[11.2,.1]]});noise(o,x,{type:'highpass',f:4500,d:.25,g:.18});noise(o,x,{f:2500,q:3,t:.05,d:.5,g:.06});}},
 craft_complete:{d:1.15,v:.55,b(o,x){pluck(o,x,{f:NOTE(64),d:.5,g:.3});arp(o,x,[76,79,84],{t:.12,step:.07,d:.6,g:.11});}},
 level_up:{d:2.3,v:.7,b(o,x){arp(o,x,[60,64,67,72,76,79,84],{step:.07,d:1,g:.11,spread:.12});osc(o,x,{type:'sawtooth',f:NOTE(48),a:.3,d:1.4,g:.035});osc(o,x,{f:NOTE(36),a:.25,d:1.5,g:.14});noise(o,x,{type:'highpass',f:7000,t:.4,a:.3,d:1.2,g:.06});}},
 victory:{d:3,v:.7,b(o,x){[[60,0],[67,.12],[72,.24],[76,.36],[79,.5],[84,.62]].forEach(([n,t])=>{bell(o,x,{f:NOTE(n),t,d:1.4,g:.12});osc(o,x,{type:'triangle',f:NOTE(n),t,a:.02,d:1.2,g:.055});});osc(o,x,{f:NOTE(36),a:.4,d:2.2,g:.17});noise(o,x,{type:'highpass',f:6000,t:.6,a:.4,d:1.6,g:.06});}},
 defeat:{d:2.5,v:.6,b(o,x){[[69,0],[65,.3],[62,.6],[57,.95]].forEach(([n,t])=>osc(o,x,{type:'triangle',f:NOTE(n),t,a:.04,d:.9,g:.14}));noise(o,x,{type:'lowpass',f:300,a:.5,d:1.6,g:.18});}},
 battle_start:{d:1.05,v:.7,b(o,x){osc(o,x,{f:110,f2:40,d:.45,g:.6});noise(o,x,{type:'lowpass',f:900,d:.25,g:.34});noise(o,x,{f:400,f2:2400,q:1,t:.05,a:.05,d:.4,g:.24,glide:.35});osc(o,x,{type:'sawtooth',f:NOTE(50),t:.12,a:.01,d:.35,g:.075});osc(o,x,{type:'sawtooth',f:NOTE(57),t:.12,a:.01,d:.35,g:.055});}},
 hit:{d:.36,v:.75,n:3,b(o,x){const p=rnd(.85,1.15);noise(o,x,{f:1600*p,q:.9,d:.09,g:.58});osc(o,x,{f:170*p,f2:55,d:.16,g:.58});noise(o,x,{type:'highpass',f:4000,d:.03,g:.24,pan:rnd(-.2,.2)});}},
 slime_hit:{d:.46,v:.65,n:2,b(o,x){osc(o,x,{f:rnd(380,460),f2:140,d:.25,g:.5});noise(o,x,{type:'lowpass',f:700,d:.15,g:.28});}},
 guard:{d:.62,v:.65,n:2,b(o,x){bell(o,x,{f:rnd(580,660),d:.4,g:.24,partials:[[1,1],[2.4,.6],[3.9,.35],[6.2,.2]]});noise(o,x,{type:'highpass',f:3000,d:.06,g:.28});}},
 heal:{d:1.25,v:.55,b(o,x){osc(o,x,{f:NOTE(72),f2:NOTE(84),glide:.4,a:.08,d:.6,g:.13});arp(o,x,[84,88,91,96],{t:.15,step:.08,d:.6,g:.095});noise(o,x,{type:'highpass',f:7000,t:.1,a:.2,d:.6,g:.05});}},
 fire:{d:.82,v:.75,n:3,b(o,x){osc(o,x,{f:rnd(85,105),f2:45,d:.35,g:.5});noise(o,x,{type:'lowpass',f:2200,f2:600,a:.01,d:.5,g:.44,glide:.5});crackle(o,x,{t:.03,span:.45,n:9,g:[.1,.32]});}},
 water:{d:.82,v:.7,n:3,b(o,x){osc(o,x,{f:rnd(480,560),f2:170,d:.22,g:.44});for(let i=0;i<4;i++)osc(o,x,{f:rnd(700,1400),f2:rnd(1400,2000),glide:.05,t:.08+i*.07+Math.random()*.03,d:.06,g:.17,pan:rnd(-.3,.3)});noise(o,x,{type:'lowpass',f:1800,f2:500,d:.4,g:.28});}},
 ice:{d:1,v:.65,n:3,b(o,x){const p=rnd(-2,2);bell(o,x,{f:NOTE(96+p),d:.6,g:.15,partials:[[1,1],[2.32,.6],[3.7,.4],[5.1,.25]]});bell(o,x,{f:NOTE(91+p),t:.04,d:.5,g:.11,partials:[[1,1],[2.32,.6],[3.7,.4]]});noise(o,x,{type:'highpass',f:6000,d:.25,g:.19});noise(o,x,{f:3000,q:4,t:.02,d:.12,g:.19});}},
 lightning:{d:.72,v:.7,n:3,b(o,x){osc(o,x,{type:'sawtooth',f:rnd(1500,2100),f2:160,glide:.18,d:.2,g:.24});osc(o,x,{type:'square',f:90,f2:60,d:.25,g:.13});crackle(o,x,{span:.3,n:11,f:[3000,7500],g:[.15,.32]});}},
 wind:{d:1,v:.65,n:2,b(o,x){noise(o,x,{f:300,f2:2400,q:2.2,a:.12,d:.55,g:.5,glide:.35,pan:-.25});noise(o,x,{f:2400,f2:700,q:2,t:.3,a:.05,d:.5,g:.3,glide:.5,pan:.25});osc(o,x,{f:NOTE(79),f2:NOTE(86),glide:.3,t:.1,a:.05,d:.4,g:.055});}},
 rock:{d:.92,v:.75,n:3,b(o,x){osc(o,x,{f:rnd(120,140),f2:42,d:.45,g:.68});noise(o,x,{type:'lowpass',f:700,f2:200,d:.35,g:.48});bell(o,x,{f:240,t:.02,d:.25,g:.11,partials:[[1,1],[2.6,.4]]});for(let i=0;i<5;i++)noise(o,x,{f:rnd(900,2100),q:3,t:rnd(.05,.35),a:.002,d:.04,g:.14});}},
 dendro:{d:.92,v:.65,n:2,b(o,x){pluck(o,x,{f:NOTE(55),d:.5,g:.34});pluck(o,x,{f:NOTE(62),t:.06,d:.45,g:.24});for(let i=0;i<6;i++)noise(o,x,{f:rnd(3200,4700),q:2,t:.05+i*.06,a:.004,d:.05,g:.11,pan:rnd(-.4,.4)});}},
 melt:{d:1.05,v:.7,b(o,x){noise(o,x,{type:'highpass',f:2500,a:.02,d:.7,g:.34});osc(o,x,{f:300,f2:900,glide:.5,a:.05,d:.5,g:.2});osc(o,x,{f:95,f2:45,d:.35,g:.4});}},
 vaporize:{d:1.05,v:.7,b(o,x){noise(o,x,{type:'highpass',f:3500,f2:1500,a:.01,d:.8,g:.44});osc(o,x,{f:600,f2:1600,glide:.4,d:.4,g:.14});osc(o,x,{f:180,f2:60,d:.3,g:.3});}},
 overload:{d:1.25,v:.8,b(o,x){osc(o,x,{f:85,f2:28,d:.8,g:.8});noise(o,x,{type:'lowpass',f:1600,f2:200,a:.005,d:.8,g:.68});crackle(o,x,{span:.5,n:12,f:[2000,7000],g:[.15,.3]});}},
 freeze:{d:1.05,v:.7,b(o,x){for(let i=0;i<6;i++)noise(o,x,{type:'highpass',f:rnd(4000,7000),t:i*.04,a:.001,d:.03,g:.28});bell(o,x,{f:NOTE(100),t:.12,d:.7,g:.11,partials:[[1,1],[2.32,.5],[3.7,.3]]});bell(o,x,{f:NOTE(95),t:.18,d:.6,g:.09});}}
};
SOUNDS.encounter_hilichurl=SOUNDS.battle_start;
const KEEP=new Set(['birds','hunt_bow','hunt_pig']);
const cache=new Map();
async function render(name,variant){
 const def=SOUNDS[name],o=new OfflineAudioContext(2,Math.ceil(SR*def.d),SR);
 const comp=o.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=.002;comp.release.value=.15;
 const master=o.createGain();master.connect(comp).connect(o.destination);def.b(o,master);
 const buf=await o.startRendering();
 // Even out loudness: every sound peaks at the same level before its own playback level.
 let peak=0;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>peak)peak=v;}}
 if(peak>0){const k=.8/peak;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k;}}
 void variant;return buf;
}
function synth(name){
 const def=SOUNDS[name];if(!def)return null;const n=def.n||1,v=Math.floor(Math.random()*n),key=name+'#'+v;
 if(!cache.has(key))cache.set(key,render(name,v).catch(()=>{cache.delete(key);return null;}));return cache.get(key);
}
const priorBuffer=GameAudio.buffer.bind(GameAudio);
GameAudio.buffer=async function(name){if(!this.context)return null;if(KEEP.has(name))return priorBuffer(name);return synth(SOUNDS[name]?name:'hit');};
// Same rules as before (armed, enabled, page visible, six voices), with a level per sound.
GameAudio.play=async function(name){
 if(!this.armed||!this.enabled()||document.hidden||!settings.sfxVolume)return;
 const ui=['click','hover','tab','equip'].includes(name);if(ui){const now=performance.now(),gap=name==='hover'?45:90;if(now-(this['last_'+name]||0)<gap)return;this['last_'+name]=now;}
 const epoch=this.epoch,buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||!this.enabled()||document.hidden||this.context.state!=='running')return;
 if(this.voices.size>=8){const old=this.voices.values().next().value;try{old.stop();}catch{}this.voices.delete(old);}
 const source=this.context.createBufferSource(),gain=this.context.createGain(),level=KEEP.has(name)?.45:(SOUNDS[name]?.v??.5);
 source.buffer=buffer;source.playbackRate.value=SOUNDS[name]?.n?rnd(.97,1.03):1;gain.gain.value=settings.sfxVolume*level;source.connect(gain).connect(this.context.destination);
 this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
};
S.play=name=>{try{GameAudio.play(name);}catch{}};
S.hover=()=>S.play('hover');
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
