/* 0.14.7 sound set. Every effect is synthesised in the browser with Web Audio, replacing the web-event slime
 * sounds. Combat is built from noise, short transients and a room reverb, never from sliding tones, so hits read
 * as blades, fire, water, lightning and stone instead of cartoon boings: element hits, reactions, guard and
 * healing, victory and defeat, encounters. The interface keeps soft chimes (pointer hover, clicks, menus, tabs,
 * the handbook's pages, rewards and level-ups). Combat sounds render a few variants so repeated hits differ.
 * Volume and on/off follow the existing 소리 settings; music and the recorded nature sounds are unchanged.
 * Load after app_av.js. */
(function(){
'use strict';
if(typeof GameAudio==='undefined')return;
const SR=44100,NOTE=n=>440*Math.pow(2,(n-69)/12),rnd=(a,b)=>a+Math.random()*(b-a);
const S=window.CRPGSound={lastHover:0,lastTab:0};
const noiseCache=new WeakMap();
function noiseBuffer(o){let b=noiseCache.get(o);if(b)return b;const len=o.sampleRate*2;b=o.createBuffer(1,len,o.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;noiseCache.set(o,b);return b;}
function envelope(param,t,a,peak,d){param.setValueAtTime(.0001,t);param.exponentialRampToValueAtTime(Math.max(peak,.0002),t+Math.max(a,.002));param.exponentialRampToValueAtTime(.0001,t+Math.max(a,.002)+Math.max(d,.005));}
function route(o,node,dest,pan){if(pan){const p=o.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));node.connect(p).connect(dest);}else node.connect(dest);}
function osc(o,dest,{type='sine',f=440,t=0,a=.005,d=.2,g=.3,pan=0,detune=0}){
 const os=o.createOscillator(),gn=o.createGain();os.type=type;os.frequency.setValueAtTime(f,t);os.detune.value=detune;
 envelope(gn.gain,t,a,g,d);os.connect(gn);route(o,gn,dest,pan);os.start(t);os.stop(t+a+d+.05);
}
function noise(o,dest,{t=0,a=.003,d=.2,g=.3,type='bandpass',f=1200,f2=0,glide=0,q=1,pan=0}){
 const src=o.createBufferSource(),fl=o.createBiquadFilter(),gn=o.createGain();src.buffer=noiseBuffer(o);
 fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+(glide||a+d));fl.Q.value=q;
 envelope(gn.gain,t,a,g,d);src.connect(fl).connect(gn);route(o,gn,dest,pan);src.start(t,Math.random()*1.5);src.stop(t+a+d+.05);
}
// Inharmonic partials make glass and metal; near-harmonic ones make soft chimes.
function bell(o,dest,{f=880,t=0,d=.8,g=.2,a=.002,pan=0,partials=[[1,1],[2.01,.42],[3.02,.2],[4.17,.12]]}){for(const [m,amp]of partials)osc(o,dest,{f:f*m,t,a,d:d/Math.sqrt(m),g:g*amp,pan});}
// A body blow: the pitch settles within 18 ms, so it is felt as weight, not heard as a slide.
function thump(o,dest,{t=0,f=58,d=.09,g=.6}){const os=o.createOscillator(),gn=o.createGain();os.frequency.setValueAtTime(f*2.2,t);os.frequency.exponentialRampToValueAtTime(f,t+.018);envelope(gn.gain,t,.002,g,d);os.connect(gn).connect(dest);os.start(t);os.stop(t+d+.05);}
function tick(o,dest,{t=0,f=6000,g=.3,pan=0}){noise(o,dest,{t,a:.001,d:.012,g,type:'highpass',f,pan});}
function swish(o,dest,{t=0,from=5200,to=1000,d=.14,g=.45,q=1.3,pan=0}){noise(o,dest,{t,a:.014,d,g,type:'bandpass',f:from,f2:to,glide:d*.85,q,pan});}
function crackle(o,dest,{t=0,span=.4,n=8,f=[2500,6000],g=[.1,.3]}){for(let i=0;i<n;i++)noise(o,dest,{type:'highpass',f:rnd(f[0],f[1]),t:t+Math.random()*span,a:.001,d:rnd(.008,.025),g:rnd(g[0],g[1]),pan:rnd(-.3,.3)});}
// Electricity: bright noise chopped by a square wave.
function buzz(o,dest,{t=0,d=.24,g=.32,f=2600,rate=90}){
 const src=o.createBufferSource(),fl=o.createBiquadFilter(),am=o.createGain(),gn=o.createGain(),lfo=o.createOscillator(),depth=o.createGain();
 src.buffer=noiseBuffer(o);fl.type='highpass';fl.frequency.value=f;lfo.type='square';lfo.frequency.value=rate;depth.gain.value=.5;am.gain.value=.5;lfo.connect(depth).connect(am.gain);
 envelope(gn.gain,t,.004,g,d);src.connect(fl).connect(am).connect(gn).connect(dest);src.start(t,Math.random());src.stop(t+d+.05);lfo.start(t);lfo.stop(t+d+.05);
}
// Water: a droplet is a 20 ms upward chirp ("plip"); a body of water is noise whose colour sways.
function plip(o,dest,{t=0,f=1100,g=.14,pan=0}){const os=o.createOscillator(),gn=o.createGain();os.frequency.setValueAtTime(f,t);os.frequency.exponentialRampToValueAtTime(f*1.7,t+.02);envelope(gn.gain,t,.002,g,.04);os.connect(gn);route(o,gn,dest,pan);os.start(t);os.stop(t+.08);}
function slosh(o,dest,{t=0,d=.5,g=.4,f=900,depth=450,rate=7,q=1.3,pan=0}){
 const src=o.createBufferSource(),fl=o.createBiquadFilter(),gn=o.createGain(),lfo=o.createOscillator(),amt=o.createGain();src.buffer=noiseBuffer(o);
 fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;lfo.frequency.value=rate;amt.gain.value=depth;lfo.connect(amt).connect(fl.frequency);
 envelope(gn.gain,t,.045,g,d);src.connect(fl).connect(gn);route(o,gn,dest,pan);src.start(t,Math.random());src.stop(t+d+.1);lfo.start(t);lfo.stop(t+d+.1);
}
const arp=(o,x,notes,{t=0,step=.06,d=.6,g=.12,spread=.15}={})=>notes.forEach((n,i)=>bell(o,x,{f:NOTE(n),t:t+i*step,d,g,pan:(i-(notes.length-1)/2)*spread}));
// d: rendered length, v: playback level (before the 효과음 음량 setting), n: variants, wet: room reverb.
const SOUNDS={
 hover:{d:.07,v:.15,n:2,b(o,x){osc(o,x,{f:NOTE(rnd(95,99)),a:.002,d:.045,g:.22});osc(o,x,{type:'triangle',f:NOTE(103),t:.006,a:.002,d:.03,g:.06});}},
 click:{d:.14,v:.4,b(o,x){bell(o,x,{f:NOTE(91),d:.1,g:.2,partials:[[1,1],[2.4,.3]]});noise(o,x,{type:'highpass',f:3600,d:.02,g:.1});}},
 tab:{d:.13,v:.38,b(o,x){osc(o,x,{type:'triangle',f:NOTE(86),d:.07,g:.22});noise(o,x,{f:2400,q:2,d:.03,g:.07});}},
 menu_open:{d:.85,v:.5,wet:.2,b(o,x){noise(o,x,{f:480,f2:3200,q:1.1,a:.07,d:.32,g:.3,glide:.32});arp(o,x,[84,88,91,96],{t:.08,step:.05,d:.55,g:.1,spread:.2});}},
 menu_close:{d:.6,v:.42,wet:.15,b(o,x){noise(o,x,{f:2800,f2:420,q:1.1,a:.02,d:.3,g:.27,glide:.28});bell(o,x,{f:NOTE(79),t:.06,d:.35,g:.1});}},
 page:{d:.36,v:.52,b(o,x){for(let i=0;i<5;i++)noise(o,x,{f:1700+i*480,q:1.4,t:i*.034,a:.004,d:.05,g:.24-i*.03,pan:-.2+i*.1});noise(o,x,{type:'lowpass',f:900,t:.12,d:.15,g:.14});}},
 handbook_open:{d:1.25,v:.55,wet:.2,b(o,x){SOUNDS.page.b(o,x);arp(o,x,[72,76,79,84,88],{t:.12,step:.06,d:.75,g:.1});}},
 toast:{d:.45,v:.35,b(o,x){bell(o,x,{f:NOTE(88),d:.35,g:.17});bell(o,x,{f:NOTE(95),t:.05,d:.3,g:.08});}},
 error:{d:.3,v:.5,b(o,x){thump(o,x,{f:90,d:.12,g:.4});noise(o,x,{type:'lowpass',f:520,d:.1,g:.2});}},
 choice:{d:.7,v:.42,wet:.15,b(o,x){bell(o,x,{f:NOTE(84),d:.45,g:.15});bell(o,x,{f:NOTE(91),t:.06,d:.4,g:.11});}},
 equip:{d:.8,v:.55,wet:.15,b(o,x){bell(o,x,{f:NOTE(81),d:.55,g:.17,partials:[[1,1],[2.76,.45],[5.4,.25],[8.93,.12]]});tick(o,x,{f:5200,g:.2});thump(o,x,{f:80,d:.06,g:.2});}},
 travel:{d:1.3,v:.48,wet:.2,b(o,x){noise(o,x,{f:300,f2:1400,q:.8,a:.25,d:.7,g:.34,glide:.5});noise(o,x,{f:1400,f2:400,q:.8,t:.45,a:.05,d:.6,g:.24,glide:.6});bell(o,x,{f:NOTE(88),t:.78,d:.4,g:.07});}},
 item_receive:{d:1.1,v:.52,wet:.2,b(o,x){arp(o,x,[84,88,91,96],{step:.07,d:.5,g:.13,spread:.25});noise(o,x,{type:'highpass',f:7000,t:.05,a:.05,d:.5,g:.07});}},
 unlock:{d:1.5,v:.52,wet:.25,b(o,x){noise(o,x,{type:'highpass',f:5000,a:.2,d:.5,g:.08});arp(o,x,[79,84,88,91,96],{t:.12,step:.06,d:.75,g:.11});}},
 quest_complete:{d:2.2,v:.6,wet:.25,b(o,x){[60,64,67,72].forEach((n,i)=>{osc(o,x,{type:'triangle',f:NOTE(n),t:i*.09,a:.02,d:1.2,g:.1});bell(o,x,{f:NOTE(n+24),t:i*.09,d:.9,g:.07});});osc(o,x,{f:NOTE(48),a:.2,d:1.4,g:.11});noise(o,x,{type:'highpass',f:6500,t:.3,a:.2,d:.9,g:.06});}},
 commission_accept:{d:1,v:.52,wet:.2,b(o,x){bell(o,x,{f:NOTE(79),d:.6,g:.15});bell(o,x,{f:NOTE(86),t:.1,d:.6,g:.13});}},
 commission_complete:{d:1.5,v:.56,wet:.2,b(o,x){arp(o,x,[79,83,86,91],{step:.08,d:.8,g:.13});noise(o,x,{type:'highpass',f:6000,t:.2,a:.1,d:.7,g:.06});}},
 cook_complete:{d:1.2,v:.52,wet:.15,b(o,x){for(let i=0;i<4;i++)noise(o,x,{f:rnd(1200,2200),q:6,t:i*.07,a:.002,d:.05,g:.18});arp(o,x,[84,88,91],{t:.3,step:.07,d:.5,g:.11});}},
 forge_complete:{d:1.8,v:.56,wet:.25,b(o,x){bell(o,x,{f:330,d:1.2,g:.24,partials:[[1,1],[2.72,.6],[5.1,.35],[8.4,.2],[11.2,.1]]});tick(o,x,{f:4500,g:.3});thump(o,x,{f:70,d:.08,g:.35});noise(o,x,{f:2500,q:3,t:.05,d:.5,g:.06});}},
 craft_complete:{d:1.2,v:.52,wet:.15,b(o,x){noise(o,x,{f:900,q:8,d:.08,g:.3});arp(o,x,[76,79,84],{t:.1,step:.07,d:.6,g:.11});}},
 level_up:{d:2.4,v:.66,wet:.3,b(o,x){arp(o,x,[60,64,67,72,76,79,84],{step:.07,d:1,g:.11,spread:.12});osc(o,x,{type:'triangle',f:NOTE(48),a:.3,d:1.4,g:.07});osc(o,x,{f:NOTE(36),a:.25,d:1.5,g:.13});noise(o,x,{type:'highpass',f:7000,t:.4,a:.3,d:1.2,g:.06});}},
 victory:{d:3.1,v:.66,wet:.3,b(o,x){thump(o,x,{f:48,d:.25,g:.5});[[60,0],[67,.12],[72,.24],[76,.36],[79,.5],[84,.62]].forEach(([n,t])=>{bell(o,x,{f:NOTE(n),t,d:1.4,g:.12});osc(o,x,{type:'triangle',f:NOTE(n),t,a:.02,d:1.2,g:.05});});osc(o,x,{f:NOTE(36),a:.4,d:2.2,g:.15});noise(o,x,{type:'highpass',f:6000,t:.6,a:.4,d:1.6,g:.06});}},
 defeat:{d:2.6,v:.56,wet:.3,b(o,x){[[69,0],[65,.3],[62,.6],[57,.95]].forEach(([n,t])=>osc(o,x,{type:'triangle',f:NOTE(n),t,a:.04,d:.9,g:.13}));noise(o,x,{type:'lowpass',f:300,a:.5,d:1.6,g:.16});}},
 // A drum-like double strike and a rising rush of air: the fight begins.
 battle_start:{d:1.2,v:.66,wet:.35,b(o,x){thump(o,x,{f:44,d:.3,g:.9});noise(o,x,{type:'lowpass',f:650,d:.28,g:.5});thump(o,x,{t:.21,f:50,d:.26,g:.75});noise(o,x,{t:.21,type:'lowpass',f:600,d:.24,g:.42});noise(o,x,{f:280,f2:2600,glide:.42,q:1.1,a:.06,d:.45,g:.26});tick(o,x,{t:.21,f:3500,g:.3});}},
 // Physical: the blade's swish, the edge's bite and the body's weight.
 // A blade, not a shot: the swish carries it, then a short metallic ring and a soft body impact.
 hit:{d:.5,v:.7,n:4,wet:.2,b(o,x){const p=rnd(.88,1.12);swish(o,x,{from:4800*p,to:900*p,d:.16,g:.5,q:1.1,pan:rnd(-.25,.25)});bell(o,x,{f:rnd(1800,2400),t:.07,d:.14,g:.05,partials:[[1,1],[2.76,.4],[5.4,.2]]});noise(o,x,{t:.07,f:700*p,q:1.4,a:.008,d:.1,g:.3});thump(o,x,{t:.07,f:52*p,d:.08,g:.28});}},
 slime_hit:{d:.4,v:.62,n:2,wet:.12,b(o,x){noise(o,x,{f:rnd(500,700),q:5,d:.12,g:.48});noise(o,x,{t:.02,type:'lowpass',f:800,d:.14,g:.34});thump(o,x,{f:54,d:.08,g:.38});}},
 guard:{d:.62,v:.62,n:2,wet:.2,b(o,x){bell(o,x,{f:rnd(320,380),d:.3,g:.22,partials:[[1,1],[2.76,.5],[5.4,.3],[8.9,.18]]});tick(o,x,{f:4000,g:.42});thump(o,x,{f:72,d:.06,g:.3});}},
 heal:{d:1.3,v:.52,wet:.25,b(o,x){noise(o,x,{type:'highpass',f:6000,a:.15,d:.6,g:.06});arp(o,x,[84,88,91,96],{t:.05,step:.08,d:.65,g:.095});osc(o,x,{type:'triangle',f:NOTE(72),a:.1,d:.6,g:.06});}},
 fire:{d:.9,v:.7,n:3,wet:.24,b(o,x){noise(o,x,{type:'lowpass',f:400,f2:2600,glide:.14,a:.05,d:.5,g:.5});crackle(o,x,{t:.04,span:.45,n:11,g:[.1,.26]});thump(o,x,{t:.02,f:50,d:.1,g:.25});noise(o,x,{t:.06,f:900,q:.7,d:.32,g:.24});}},
 // Hydro: a swell of moving water and scattered droplets; no sharp crack, no punch.
 water:{d:1,v:.62,n:3,wet:.32,b(o,x){slosh(o,x,{d:.5,g:.42,f:rnd(800,1000),depth:420,rate:rnd(6,9),pan:rnd(-.2,.2)});slosh(o,x,{t:.12,d:.4,g:.22,f:1800,depth:600,rate:rnd(9,12),q:2});for(let i=0;i<7;i++)plip(o,x,{t:.06+i*.055+rnd(0,.04),f:rnd(900,1700),g:rnd(.07,.14),pan:rnd(-.5,.5)});noise(o,x,{type:'highpass',f:5200,a:.03,d:.3,g:.06});}},
 ice:{d:1,v:.64,n:3,wet:.3,b(o,x){bell(o,x,{f:NOTE(rnd(93,98)),d:.5,g:.14,partials:[[1,1],[2.32,.6],[3.7,.4],[5.1,.25]]});crackle(o,x,{span:.12,n:6,f:[5000,9000],g:[.2,.35]});noise(o,x,{type:'highpass',f:7000,d:.3,g:.14});thump(o,x,{f:70,d:.06,g:.25});}},
 lightning:{d:.75,v:.64,n:3,wet:.24,b(o,x){buzz(o,x,{d:.26,g:.4,f:2200,rate:rnd(70,110)});crackle(o,x,{span:.3,n:12,f:[3000,8000],g:[.16,.32]});noise(o,x,{type:'bandpass',f:3200,q:2,a:.01,d:.18,g:.2});thump(o,x,{f:60,d:.06,g:.18});}},
 wind:{d:1,v:.62,n:2,wet:.2,b(o,x){noise(o,x,{f:300,f2:2400,q:2,a:.12,d:.55,g:.5,glide:.35,pan:-.25});noise(o,x,{f:2400,f2:700,q:2,t:.3,a:.05,d:.5,g:.3,glide:.5,pan:.25});tick(o,x,{t:.12,f:4500,g:.15});}},
 rock:{d:.85,v:.72,n:3,wet:.2,b(o,x){noise(o,x,{type:'lowpass',f:500,a:.003,d:.25,g:.6});thump(o,x,{f:46,d:.16,g:.75});for(let i=0;i<5;i++)noise(o,x,{f:rnd(900,2200),q:3,t:rnd(.02,.25),a:.002,d:.04,g:.2,pan:rnd(-.3,.3)});tick(o,x,{f:2500,g:.32});}},
 dendro:{d:.85,v:.62,n:2,wet:.2,b(o,x){for(let i=0;i<6;i++)noise(o,x,{f:rnd(2800,4800),q:2,t:i*.05,a:.004,d:.05,g:.13,pan:rnd(-.4,.4)});noise(o,x,{f:900,q:9,d:.09,g:.45});noise(o,x,{t:.07,f:700,q:9,d:.09,g:.35});thump(o,x,{f:62,d:.07,g:.25});}},
 melt:{d:1.05,v:.66,wet:.25,b(o,x){noise(o,x,{type:'highpass',f:2500,a:.02,d:.7,g:.35});noise(o,x,{type:'lowpass',f:500,f2:2200,glide:.1,a:.03,d:.4,g:.4});thump(o,x,{f:55,d:.1,g:.4});}},
 vaporize:{d:1.05,v:.66,wet:.25,b(o,x){noise(o,x,{type:'highpass',f:3500,f2:1500,a:.01,d:.8,g:.45});noise(o,x,{f:1200,q:.8,d:.3,g:.3});thump(o,x,{f:58,d:.1,g:.35});}},
 overload:{d:1.4,v:.76,wet:.32,b(o,x){noise(o,x,{type:'lowpass',f:1800,f2:180,glide:.6,a:.004,d:.9,g:.75});thump(o,x,{f:42,d:.25,g:.8});crackle(o,x,{span:.5,n:14,f:[2000,7000],g:[.15,.3]});}},
 freeze:{d:1.05,v:.66,wet:.3,b(o,x){crackle(o,x,{span:.25,n:8,f:[4000,9000],g:[.25,.4]});bell(o,x,{f:NOTE(100),t:.08,d:.6,g:.1,partials:[[1,1],[2.32,.5],[3.7,.3]]});noise(o,x,{type:'highpass',f:6000,d:.4,g:.12});}}
};
SOUNDS.encounter_hilichurl=SOUNDS.battle_start;
const KEEP=new Set(['birds','hunt_bow','hunt_pig']);
const cache=new Map();
// A short room: decaying stereo noise as the impulse response.
function room(o,seconds=1.1,decay=3.2){const len=Math.ceil(o.sampleRate*seconds),ir=o.createBuffer(2,len,o.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);let last=0;for(let i=0;i<len;i++){const v=(Math.random()*2-1)*Math.pow(1-i/len,decay);last=last*.55+v*.45;d[i]=last;}}return ir;}
async function render(name){
 const def=SOUNDS[name],o=new OfflineAudioContext(2,Math.ceil(SR*(def.d+(def.wet?.6:0))),SR);
 const comp=o.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=.002;comp.release.value=.15;
 const master=o.createGain();master.connect(comp).connect(o.destination);
 if(def.wet){const verb=o.createConvolver(),wet=o.createGain();verb.buffer=room(o);wet.gain.value=def.wet;master.connect(verb).connect(wet).connect(comp);}
 def.b(o,master);
 const buf=await o.startRendering();
 // Even out loudness: every sound peaks at the same level before its own playback level.
 let peak=0;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>peak)peak=v;}}
 if(peak>0){const k=.8/peak;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k;}}
 return buf;
}
function synth(name){
 const def=SOUNDS[name];if(!def)return null;const n=def.n||1,v=Math.floor(Math.random()*n),key=name+'#'+v;
 if(!cache.has(key))cache.set(key,render(name).catch(()=>{cache.delete(key);return null;}));return cache.get(key);
}
// Two sets: the recorded official web-event sounds where they exist, and the synthesised set. Results and
// rewards default to the recordings (they are real fanfares); combat hits default to the new synthesis.
// Every sound that has both can be auditioned and chosen in 설정 → 소리 (settings.sfxChoice).
const RECORDED=new Set(['victory','defeat','quest_complete','commission_accept','commission_complete','cook_complete','forge_complete','craft_complete','item_receive','unlock','equip','heal','fire','ice','lightning','wind','slime_hit','encounter_hilichurl']);
const DEFAULT_REC=new Set(['victory','defeat','quest_complete','commission_accept','commission_complete','cook_complete','forge_complete','craft_complete','item_receive','unlock','equip','encounter_hilichurl']);
const hasRecording=name=>RECORDED.has(name)&&!!(window.MANIFEST?.sfx?.[name]||(typeof MANIFEST!=='undefined'&&MANIFEST.sfx?.[name]));
S.choice=name=>{const c=settings.sfxChoice?.[name];return hasRecording(name)?(c==='syn'?'syn':c==='rec'?'rec':DEFAULT_REC.has(name)?'rec':'syn'):'syn';};
S.RECORDED=RECORDED;S.names=Object.keys(SOUNDS);
const priorBuffer=GameAudio.buffer.bind(GameAudio);
GameAudio.buffer=async function(name,force){if(!this.context)return null;if(KEEP.has(name))return priorBuffer(name);const use=force||S.choice(name);if(use==='rec'&&hasRecording(name)){const b=await priorBuffer(name);if(b)return b;}return synth(SOUNDS[name]?name:'hit');};
// Fanfares dip the music for their length so they are heard.
const DUCK=new Set(['victory','defeat','level_up','quest_complete','commission_complete']);let duckUntil=0;
const priorSync=GameAudio.sync.bind(GameAudio);
GameAudio.sync=function(...args){const out=priorSync(...args);if(this.music&&performance.now()<duckUntil)this.music.volume=Math.min(this.music.volume,settings.musicVolume*.65*.25);return out;};
function duck(seconds){duckUntil=performance.now()+seconds*1000;const m=GameAudio.music;if(m)m.volume=Math.min(m.volume,settings.musicVolume*.65*.25);clearTimeout(S.duckTimer);S.duckTimer=setTimeout(()=>{duckUntil=0;try{GameAudio.sync();}catch{}},seconds*1000+120);}
// Settings: listen to either version and keep the one you like.
S.audition=async function(name,which){try{await GameAudio.unlock?.();const b=await GameAudio.buffer(name,which);if(!b||!GameAudio.context)return;const src=GameAudio.context.createBufferSource(),g=GameAudio.context.createGain();src.buffer=b;g.gain.value=(settings.sfxVolume||.6)*(which==='rec'?.45:(SOUNDS[name]?.v??.5));src.connect(g).connect(GameAudio.context.destination);src.start();if(DUCK.has(name))duck(b.duration);}catch{}};
S.setChoice=function(name,which){settings.sfxChoice={...(settings.sfxChoice||{}),[name]:which};try{persistSettings();}catch{}};
// Same rules as before (armed, enabled, page visible, a limited number of voices), with a level per sound.
GameAudio.play=async function(name){
 if(!this.armed||!this.enabled()||document.hidden||!settings.sfxVolume)return;
 const ui=['click','hover','tab','equip'].includes(name);if(ui){const now=performance.now(),gap=name==='hover'?45:90;if(now-(this['last_'+name]||0)<gap)return;this['last_'+name]=now;}
 const epoch=this.epoch,buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||!this.enabled()||document.hidden||this.context.state!=='running')return;
 if(this.voices.size>=8){const old=this.voices.values().next().value;try{old.stop();}catch{}this.voices.delete(old);}
 const recorded=KEEP.has(name)||S.choice(name)==='rec'&&hasRecording(name),source=this.context.createBufferSource(),gain=this.context.createGain(),level=recorded?.45:(SOUNDS[name]?.v??.5);
 source.buffer=buffer;source.playbackRate.value=!recorded&&SOUNDS[name]?.n?rnd(.97,1.03):1;gain.gain.value=settings.sfxVolume*level;source.connect(gain).connect(this.context.destination);
 this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();if(DUCK.has(name))duck(buffer.duration);
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
