/* 0.14.7 sound set. The interface is anchored on the official web-event click; everything around it is modelled
 * on how the real thing makes sound, computed sample by sample and then given a room: plucked strings (harp,
 * guzheng), struck celesta, glass, steel and wood that ring and fade partial by partial, water as dozens of tiny
 * bubbles, fire as a flickering roar with crackles, gravel and leaves as grains, electricity as an irregular
 * pulse train. Nothing slides in pitch, so hits read as blades, fire, water, lightning and stone, never as cartoon
 * boings or shots. Chimes stay in one key (D pentatonic, the official click's own pitch). Recorded in-game and
 * web-event sounds are kept for results and rewards, and every sound can be auditioned and chosen in
 * 설정 → 소리 · 효과음 고르기. Volume and on/off follow the existing 소리 settings. Load after app_av.js. */
(function(){
'use strict';
if(typeof GameAudio==='undefined')return;
const SR=44100,TAU=Math.PI*2,NOTE=n=>440*Math.pow(2,(n-69)/12),rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],logRnd=(a,b)=>Math.exp(rnd(Math.log(a),Math.log(b)));
const S=window.CRPGSound={lastHover:0,lastTab:0};
// D pentatonic from a MIDI note: D E F# A B, rising through the octaves.
const STEPS=[0,2,4,7,9],penta=(from,count)=>Array.from({length:count},(_,i)=>from+12*Math.floor(i/5)+STEPS[i%5]);
// ---- a small sample-by-sample toolkit ----
function coef(type,f,q){const w=TAU*Math.min(Math.max(f,20),SR*.45)/SR,c=Math.cos(w),a=Math.sin(w)/(2*q);let b0,b1,b2;
 if(type==='lp'){b0=b2=(1-c)/2;b1=1-c;}else if(type==='hp'){b0=b2=(1+c)/2;b1=-(1+c);}else{b0=a;b1=0;b2=-a;}
 const a0=1+a;return [b0/a0,b1/a0,b2/a0,-2*c/a0,(1-a)/a0];}
function Filter(type,f,q){this.type=type;this.q=q;this.k=coef(type,f,q);this.x1=this.x2=this.y1=this.y2=0;}
Filter.prototype.set=function(f){this.k=coef(this.type,f,this.q);};
Filter.prototype.run=function(x){const k=this.k,y=k[0]*x+k[1]*this.x1+k[2]*this.x2-k[3]*this.y1-k[4]*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=y;return y;};
const pg=p=>{const a=(Math.max(-1,Math.min(1,p))+1)*Math.PI/4;return [Math.cos(a),Math.sin(a)];};
function mix(d,i,v,gl,gr){if(i>=0&&i<d.n){d.L[i]+=v*gl;d.R[i]+=v*gr;}}
// Struck things: every partial rings and fades on its own, higher ones sooner; beat adds a slow shimmer.
function tone(d,{t=0,f=880,parts=[[1,1,.3]],g=.2,pan=0,att=.002,beat=0}){
 const i0=Math.round(t*SR),[gl,gr]=pg(pan),A=Math.max(1,att*SR);
 for(const [ratio,amp,tau]of parts){const fr=f*ratio;if(fr>SR*.45||fr<20)continue;const n=Math.min(d.n-i0,Math.round(tau*7*SR)),w=TAU*fr/SR,w2=TAU*(fr+beat*rnd(.6,1.4))/SR,ph=Math.random()*TAU,k=Math.exp(-1/(tau*SR));let e=amp*g;
  for(let i=0;i<n;i++){let v=Math.sin(w*i+ph);if(beat)v=(v+.35*Math.sin(w2*i+ph))/1.35;if(i<A)v*=i/A;mix(d,i0+i,v*e,gl,gr);e*=k;}}
}
// Plucked strings: Karplus-Strong. bright shapes the pluck (soft finger to hard plectrum).
function pluck(d,{t=0,f=440,dur=1,g=.3,pan=0,bright=.5}){
 const i0=Math.round(t*SR),n=Math.min(d.n-i0,Math.round(dur*SR));if(n<=0)return;
 const P=Math.max(2,Math.round(SR/f-.5)),line=new Float32Array(P);let lp=0,mean=0;
 for(let i=0;i<P;i++){lp+=(Math.random()*2-1-lp)*bright;line[i]=lp;mean+=lp/P;}for(let i=0;i<P;i++)line[i]-=mean;
 const r=Math.pow(.001,P/(dur*SR)),[gl,gr]=pg(pan);let j=0;
 for(let i=0;i<n;i++){const a=line[j],nj=j+1===P?0:j+1;line[j]=r*.5*(a+line[nj]);j=nj;mix(d,i0+i,a*g*(i>n-256?(n-i)/256:1),gl,gr);}
}
// Filtered noise with a shaped envelope: puffs, whooshes, bodies, splashes. f2 sweeps the band, pan2 moves it
// across, tau gives an exponential tail, flick makes it flicker like flame.
function noise(d,{t=0,dur=.1,g=.2,type='bp',f=1000,f2=0,q=.8,pan=0,pan2=null,att=.1,tau=0,flick=0,depth=.6}){
 const i0=Math.round(t*SR),n=Math.min(d.n-i0,Math.round(dur*SR));if(n<=0)return;
 const fl=new Filter(type,f,q),A=Math.max(1,Math.round(att*dur*SR)),per=flick?Math.max(32,Math.round(SR/flick)):0;let [gl,gr]=pg(pan),fv=1,ft=1;
 for(let i=0;i<n;i++){
  if((i&31)===0){if(f2)fl.set(f*Math.pow(f2/f,i/n));if(pan2!==null)[gl,gr]=pg(pan+(pan2-pan)*i/n);}
  if(per&&i%per===0)ft=1-depth*Math.random();if(per)fv+=(ft-fv)*.004;
  const e=i<A?Math.sin(i/A*Math.PI/2):tau?Math.exp(-(i-A)/(tau*SR)):Math.pow(1-(i-A)/(n-A),2);
  mix(d,i0+i,fl.run(Math.random()*2-1)*e*fv*g*(i>n-64?(n-i)/64:1),gl,gr);
 }
}
// Many tiny noise grains: rustling leaves, gravel, paper, shards. curve>1 crowds them at the start.
function grains(d,{t=0,span=.3,count=20,f=[1000,4000],q=1.5,dur=[.002,.008],g=[.05,.15],pan=[-.5,.5],type='bp',curve=2}){
 for(let k=0;k<count;k++)noise(d,{t:t+span*Math.pow(Math.random(),curve),dur:rnd(dur[0],dur[1]),g:rnd(g[0],g[1]),type,f:logRnd(f[0],f[1]),q,pan:rnd(pan[0],pan[1]),att:.3});
}
// Water: a bubble is a short sine whose pitch lifts a little as it closes; dozens of them make a splash.
function bubbles(d,{t=0,span=.4,count=40,f=[500,3000],dur=[.004,.016],g=[.03,.08],rise=.12,pan=[-.6,.6],curve=1.6}){
 for(let k=0;k<count;k++){const i0=Math.round((t+span*Math.pow(Math.random(),curve))*SR),fr=logRnd(f[0],f[1]),tau=rnd(dur[0],dur[1]),n=Math.min(d.n-i0,Math.round(tau*6*SR)),[gl,gr]=pg(rnd(pan[0],pan[1])),amp=rnd(g[0],g[1]),A=Math.round(.0008*SR);let ph=0;
  for(let i=0;i<n;i++){const x=i/(tau*SR);ph+=TAU*fr*(1+rise*Math.min(1,x/3))/SR;mix(d,i0+i,Math.sin(ph)*Math.exp(-x)*(i<A?i/A:1)*amp,gl,gr);}}
}
// Crackles and cracks: sub-millisecond clicks.
function crackle(d,{t=0,span=.3,count=20,g=[.1,.3],pan=[-.4,.4],curve=1.5,hp=2500}){
 for(let k=0;k<count;k++)noise(d,{t:t+span*Math.pow(Math.random(),curve),dur:rnd(.0004,.002),g:rnd(g[0],g[1]),type:'hp',f:hp,q:.7,pan:rnd(pan[0],pan[1]),att:.1});
}
const click=(d,{t=0,g=.3,pan=0,f=3000}={})=>noise(d,{t,dur:.0025,g,type:'hp',f,q:.7,pan,att:.05});
// Weight: a low sine that settles within ~10 ms, felt as a blow rather than heard as a slide.
function thump(d,{t=0,f=60,tau=.08,g=.5,pan=0}){const i0=Math.round(t*SR),n=Math.min(d.n-i0,Math.round(tau*7*SR)),[gl,gr]=pg(pan);let ph=0;
 for(let i=0;i<n;i++){const s=i/SR;ph+=TAU*f*(1+.7*Math.exp(-s/.004))/SR;mix(d,i0+i,Math.tanh(1.5*Math.sin(ph))/Math.tanh(1.5)*Math.exp(-s/tau)*(i<44?i/44:1)*g,gl,gr);}}
// Electricity: an irregular pulse train through a resonant band.
function buzz(d,{t=0,dur=.25,g=.3,rate=110,jitter=.25,f=3500,q=.9,att=.01,tau=.08,pan=0}){
 const i0=Math.round(t*SR),n=Math.min(d.n-i0,Math.round(dur*SR));if(n<=0)return;const fl=new Filter('bp',f,q),hp=new Filter('hp',1200,.7),[gl,gr]=pg(pan),A=Math.max(1,att*SR);let next=0,lp=0;
 for(let i=0;i<n;i++){let x=(Math.random()*2-1)*.15;if(i>=next){x+=rnd(.4,1)*(Math.random()<.5?-2.5:2.5);next=i+SR/(rate*(1+rnd(-jitter,jitter)));}
  const e=(i<A?i/A:Math.exp(-(i-A)/(tau*SR)))*(i>n-64?(n-i)/64:1);lp+=(fl.run(hp.run(x))-lp)*.6;mix(d,i0+i,lp*e*g,gl,gr);}}
// Instruments and materials: [ratio, level, decay time constant in seconds].
const CEL=[[1,1,.45],[2,.25,.22],[3,.07,.1],[4.02,.04,.06]],GLASS=[[1,1,.3],[1.73,.6,.2],[2.41,.45,.14],[3.13,.3,.1],[4.2,.2,.06]],
 STEEL=[[1,1,.08],[1.47,.6,.06],[2.09,.4,.04],[2.56,.25,.03]],WOOD=[[1,1,.035],[.63,.5,.045],[2.4,.12,.012]],STONE=[[1,1,.05],[2.68,.5,.03],[5.2,.2,.015]],
 SPARK=[[1,1,.08],[2.76,.2,.03]];
const chime=(d,n,o={})=>tone(d,{f:NOTE(n),parts:CEL,beat:.8,...o});
function glitter(d,{t=0,span=.3,count=8,notes=penta(86,10),g=[.03,.07],pan=[-.6,.6],curve=1,rising=false}){
 const ts=Array.from({length:count},()=>t+span*Math.pow(Math.random(),curve)).sort((a,b)=>a-b),ns=Array.from({length:count},()=>pick(notes));if(rising)ns.sort((a,b)=>a-b);
 ts.forEach((at,k)=>tone(d,{t:at,f:NOTE(ns[k]),parts:SPARK.map(([r,a,tau])=>[r,a,tau*rnd(.7,1.4)]),g:rnd(g[0],g[1]),pan:rising?pan[0]+(pan[1]-pan[0])*k/Math.max(1,count-1):rnd(pan[0],pan[1])}));
}
function gliss(d,notes,{t=0,step=.03,g=.25,dur=1.2,bright=.55,pan=[-.4,.4]}={}){notes.forEach((n,i)=>pluck(d,{t:t+i*step,f:NOTE(n),dur,g:g*(1-.25*i/notes.length),bright,pan:pan[0]+(pan[1]-pan[0])*i/Math.max(1,notes.length-1)}));}
// ---- the sounds ----
// d: rendered length, v: playback level (before the 효과음 음량 setting), n: variants, wet/room: reverb.
const SOUNDS={
 // Interface. The official click plays on every button; these are the layers that ride on it.
 hover:{d:.09,v:0.05,n:2,j(d){tone(d,{f:rnd(1650,1750),parts:WOOD,g:.25});}},
 click:{d:.25,v:0.2,j(d){tone(d,{f:1163,parts:WOOD.map(([r,a,tau])=>[r,a,tau*2.2]),g:.4});click(d,{g:.08,f:2500});}},
 tab:{d:.14,v:0.07,n:2,j(d){noise(d,{dur:.08,f:2800,f2:1500,q:.9,att:.25,g:.4,pan:-.15,pan2:.15});grains(d,{span:.05,count:4,f:[3000,6000],dur:[.002,.004],g:[.06,.12]});}},
 choice:{d:.8,v:0.105,wet:.18,j(d){chime(d,78,{t:.01,g:.16,pan:-.1});chime(d,81,{t:.055,g:.12,pan:.1});}},
 toast:{d:.9,v:0.12,wet:.2,j(d){chime(d,81,{g:.15,pan:-.15});chime(d,86,{t:.07,g:.12,pan:.15});glitter(d,{t:.05,span:.25,count:4,notes:penta(93,6),g:[.015,.03]});}},
 error:{d:.3,v:0.13,j(d){tone(d,{f:330,parts:WOOD,g:.5});noise(d,{dur:.04,type:'lp',f:700,att:.05,tau:.012,g:.3});tone(d,{t:.095,f:294,parts:WOOD,g:.42});noise(d,{t:.095,dur:.04,type:'lp',f:650,att:.05,tau:.012,g:.25});}},
 menu_open:{d:1.05,v:0.13,wet:.25,room:1.5,j(d){noise(d,{dur:.34,f:500,f2:3800,q:1.2,att:.55,g:.55,pan:-.2,pan2:.2});noise(d,{dur:.45,type:'hp',f:6000,att:.5,g:.08});glitter(d,{t:.12,span:.28,count:10,notes:penta(93,8),g:[.03,.06]});chime(d,86,{t:.18,g:.1});chime(d,90,{t:.22,g:.06});}},
 menu_close:{d:.5,v:0.095,wet:.12,j(d){noise(d,{dur:.2,f:3000,f2:700,q:1.2,att:.25,g:.45,pan:.2,pan2:-.2});tone(d,{t:.12,f:740,parts:WOOD,g:.16});}},
 page:{d:.32,v:0.095,j(d){noise(d,{dur:.09,type:'lp',f:900,att:.2,tau:.03,g:.35});grains(d,{t:.01,span:.14,count:18,f:[1500,6000],dur:[.002,.006],g:[.05,.15],pan:[-.3,.3],curve:1.2});noise(d,{t:.02,dur:.12,f:2000,f2:3500,q:.8,att:.4,g:.18,pan:-.2,pan2:.25});}},
 handbook_open:{d:1.35,v:0.15,wet:.25,room:1.5,j(d){noise(d,{dur:.12,type:'lp',f:400,att:.15,tau:.04,g:.55});thump(d,{f:90,tau:.05,g:.2});SOUNDS.page.j(shift(d,.06));chime(d,81,{t:.16,g:.1,pan:-.2});chime(d,86,{t:.19,g:.08});chime(d,90,{t:.22,g:.06,pan:.2});glitter(d,{t:.18,span:.3,count:6,notes:penta(93,8),g:[.02,.04]});}},
 // The waypoint feeling: air gathers, a swirl of sparks rises across, and you land.
 travel:{d:1.55,v:0.15,wet:.3,room:1.6,j(d){noise(d,{dur:.6,f:250,f2:1800,q:.9,att:.7,g:.5,pan:-.4,pan2:.2});glitter(d,{t:.15,span:.45,count:14,notes:penta(81,12),g:[.03,.05],pan:[-.6,.6],rising:true});noise(d,{t:.62,dur:.25,type:'lp',f:600,att:.1,tau:.08,g:.4});thump(d,{t:.62,f:70,tau:.07,g:.25});chime(d,74,{t:.64,g:.08,pan:-.1});chime(d,81,{t:.66,g:.06,pan:.1});}},
 equip:{d:.6,v:0.12,wet:.12,j(d){tone(d,{f:1163,parts:WOOD,g:.3});tone(d,{t:.05,f:rnd(1700,1800),parts:STEEL.map(([r,a,tau])=>[r,a,tau*3]),g:.12,beat:1.5});noise(d,{t:.04,dur:.05,type:'lp',f:500,att:.1,tau:.015,g:.3});}},
 item_receive:{d:.9,v:0.105,wet:.2,j(d){click(d,{g:.08});chime(d,93,{t:.03,g:.13,pan:-.1});chime(d,98,{t:.08,g:.1,pan:.1});glitter(d,{t:.06,span:.25,count:6,notes:penta(98,6),g:[.015,.035]});}},
 unlock:{d:1.4,v:0.13,wet:.25,j(d){noise(d,{dur:.5,type:'hp',f:5000,att:.4,g:.035});gliss(d,penta(81,5),{t:.05,step:.045,g:.22,dur:1});chime(d,93,{t:.3,g:.08});}},
 // Results: harp runs and celesta, the orchestra's own colours.
 quest_complete:{d:2.3,v:0.15,wet:.3,room:1.8,j(d){gliss(d,penta(74,9),{step:.028,g:.22,dur:1.6});pluck(d,{f:NOTE(50),dur:1.8,g:.25,bright:.35});[86,90,93].forEach((n,i)=>chime(d,n,{t:.28+i*.02,g:.08}));tone(d,{t:.25,f:NOTE(62),parts:[[1,1,.9],[1.5,.4,.7]],att:.12,g:.06});}},
 commission_accept:{d:1.2,v:0.13,wet:.22,j(d){pluck(d,{f:NOTE(74),dur:1,g:.25});pluck(d,{t:.09,f:NOTE(81),dur:1,g:.22});chime(d,86,{t:.12,g:.07});}},
 commission_complete:{d:1.8,v:0.15,wet:.25,j(d){gliss(d,penta(79,6),{step:.04,g:.22,dur:1.3});[86,90].forEach((n,i)=>chime(d,n,{t:.25+i*.03,g:.08}));}},
 cook_complete:{d:1.4,v:0.13,wet:.2,j(d){grains(d,{span:.3,count:26,f:[2500,7000],dur:[.002,.006],g:[.02,.05],curve:1});bubbles(d,{span:.25,count:10,f:[400,1200],g:[.02,.04]});gliss(d,penta(81,4),{t:.28,step:.05,g:.2,dur:.9});}},
 forge_complete:{d:1.8,v:0.13,wet:.28,j(d){tone(d,{f:620,parts:[[1,1,.5],[2.72,.6,.3],[5.1,.35,.15],[8.4,.2,.08]],g:.25,beat:2});click(d,{g:.4});thump(d,{f:70,tau:.06,g:.35});crackle(d,{t:.01,span:.35,count:14,hp:4000,g:[.05,.15]});chime(d,86,{t:.3,g:.08});chime(d,93,{t:.34,g:.06});}},
 craft_complete:{d:1.3,v:0.13,wet:.2,j(d){tone(d,{f:520,parts:WOOD.map(([r,a,tau])=>[r,a,tau*1.6]),g:.4});gliss(d,penta(81,4),{t:.12,step:.05,g:.2,dur:.9});}},
 level_up:{d:2.8,v:0.19,wet:.35,room:2,j(d){thump(d,{f:55,tau:.2,g:.18});noise(d,{dur:.8,type:'lp',f:260,att:.4,g:.12});gliss(d,penta(62,11),{step:.032,g:.24,dur:1.8,pan:[-.5,.5]});[86,90,93,98].forEach((n,i)=>chime(d,n,{t:.36+i*.025,g:.08,pan:(i-1.5)*.2}));noise(d,{t:.35,dur:1.4,type:'hp',f:6500,att:.3,g:.07});glitter(d,{t:.4,span:.8,count:12,notes:penta(93,8),g:[.015,.03]});}},
 victory:{d:3.2,v:0.17,wet:.35,room:2,j(d){thump(d,{f:55,tau:.25,g:.2});gliss(d,penta(62,13),{step:.03,g:.24,dur:2.2,pan:[-.5,.5]});[74,78,81,86].forEach((n,i)=>tone(d,{t:.4,f:NOTE(n),parts:[[1,1,1.2],[2,.3,.6]],att:.15,g:.05,pan:(i-1.5)*.25}));[86,90,93,98].forEach((n,i)=>chime(d,n,{t:.42+i*.03,g:.08}));glitter(d,{t:.5,span:1,count:14,notes:penta(93,8),g:[.015,.03]});}},
 defeat:{d:2.8,v:0.135,wet:.35,room:2,j(d){[[69,0],[65,.32],[62,.66],[57,1.02]].forEach(([n,t])=>pluck(d,{t,f:NOTE(n),dur:1.6,g:.3,bright:.3}));tone(d,{t:.05,f:NOTE(50),parts:[[1,1,1.2],[2,.3,.6]],att:.3,g:.05});noise(d,{dur:1.8,type:'lp',f:400,att:.3,g:.06});}},
 // A taiko double strike and a blade drawn: the fight begins.
 battle_start:{d:1.3,v:0.21,wet:.3,j(d){for(const [t,f,g]of [[0,58,.9],[.18,65,.75]]){thump(d,{t,f,tau:.11,g:g*.5});noise(d,{t,dur:.2,f:180,q:.7,att:.03,tau:.06,g:g*.7});noise(d,{t,dur:.08,f:420,q:1,att:.04,tau:.025,g:g*.45});noise(d,{t,dur:.012,f:1500,q:.8,att:.1,g:g*.35});}
  noise(d,{t:.2,dur:.38,f:3000,f2:5200,q:6,att:.5,g:.42,pan:-.2,pan2:.3});tone(d,{t:.3,f:rnd(2800,3200),parts:STEEL.map(([r,a,tau])=>[r,a,tau*3]),g:.1,beat:2});noise(d,{t:.22,dur:.4,type:'hp',f:6000,att:.4,g:.06});}},
 // Physical: the swing, the edge's bite, a little ring of steel and the weight behind it.
 hit:{d:.45,v:0.19,n:3,wet:.15,j(d){const p=rnd(.9,1.1),at=.085;noise(d,{dur:.12,f:rnd(3800,4800)*p,f2:rnd(900,1200)*p,q:1.3,att:.55,g:.9,pan:-.3,pan2:.25});
  click(d,{t:at,g:.35,f:2000});noise(d,{t:at,dur:.07,type:'lp',f:1600,att:.05,tau:.02,g:.5});noise(d,{t:at,dur:.06,f:750*p,q:1.4,att:.05,tau:.018,g:.5});thump(d,{t:at,f:rnd(70,80),tau:.035,g:.16});
  tone(d,{t:at,f:rnd(1900,2500),parts:STEEL.map(([r,a,tau])=>[r,a,tau*.6]),g:.07});}},
 // A slime lands a blow: a wet, squelchy splat.
 slime_hit:{d:.38,v:0.21,n:2,wet:.12,j(d){noise(d,{dur:.12,f:700,q:.8,att:.05,tau:.04,g:.6});noise(d,{dur:.08,type:'lp',f:2500,att:.05,tau:.02,g:.25});bubbles(d,{t:.01,span:.14,count:12,f:[400,1500],dur:[.006,.018],g:[.06,.12],rise:.06});thump(d,{f:70,tau:.04,g:.15});}},
 // A shield takes the blow: a glassy ring over a low barrier hum.
 guard:{d:.65,v:0.17,n:2,wet:.2,j(d){click(d,{g:.3});noise(d,{dur:.03,f:2500,q:1,att:.05,tau:.01,g:.3});tone(d,{f:rnd(1250,1450),parts:[[1,1,.25],[2.32,.6,.18],[4.25,.35,.1],[6.63,.2,.06]],beat:2,g:.12});
  tone(d,{f:220,parts:[[1,1,.18],[1.5,.6,.15],[2,.3,.1]],att:.02,g:.08});thump(d,{f:70,tau:.04,g:.25});}},
 heal:{d:1.25,v:0.15,wet:.3,room:1.6,j(d){penta(86,9).forEach((n,i)=>chime(d,n,{t:i*.035,g:.07-.002*i,pan:-.4+.1*i,parts:CEL.map(([r,a,tau])=>[r,a,tau*.55])}));tone(d,{f:NOTE(74),parts:[[1,1,.5],[2,.2,.3]],att:.08,g:.06});tone(d,{f:NOTE(81),parts:[[1,1,.5]],att:.08,g:.04});noise(d,{dur:.7,type:'hp',f:5000,att:.45,g:.06});}},
 // Elements on hit.
 fire:{d:.8,v:0.19,n:2,wet:.2,j(d){noise(d,{dur:.16,type:'lp',f:350,f2:3000,q:.7,att:.35,g:.5});noise(d,{dur:.55,f:900,q:.6,att:.08,tau:.18,flick:22,depth:.6,g:.55});noise(d,{dur:.3,type:'lp',f:400,att:.05,tau:.1,g:.25});thump(d,{f:65,tau:.04,g:.12});crackle(d,{t:.03,span:.5,count:26,hp:2500,g:[.08,.25]});}},
 water:{d:.8,v:0.19,n:2,wet:.25,j(d){noise(d,{dur:.2,type:'lp',f:5500,att:.06,tau:.06,g:.35});noise(d,{dur:.25,f:1200,q:.8,att:.1,tau:.08,g:.3});bubbles(d,{t:.005,span:.4,count:55,f:[500,3200],dur:[.004,.016],g:[.03,.09],rise:.07});bubbles(d,{t:.15,span:.35,count:6,f:[1800,3600],dur:[.006,.012],g:[.05,.08],curve:1});
  tone(d,{t:.05,f:NOTE(93),parts:SPARK,g:.03,pan:-.3});tone(d,{t:.09,f:NOTE(98),parts:SPARK,g:.025,pan:.3});thump(d,{f:70,tau:.04,g:.15});}},
 // Cryo: a crack, then a dense crystalline shimmer of tiny glassy tinkles over cold air.
 ice:{d:.9,v:0.19,n:2,wet:.28,j(d){click(d,{g:.3,f:3500});crackle(d,{span:.05,count:8,hp:3000,g:[.1,.22]});noise(d,{dur:.55,f:3000,q:.7,att:.08,tau:.16,flick:30,depth:.5,g:.4});
  for(let k=0;k<18;k++)tone(d,{t:.01+.4*Math.pow(Math.random(),1.6),f:logRnd(1600,4800),parts:GLASS.map(([r,a,tau])=>[r,a,tau*rnd(.2,.45)]),g:rnd(.03,.07),pan:rnd(-.6,.6)});
  grains(d,{t:.01,span:.25,count:20,f:[1500,6000],q:4,dur:[.003,.01],g:[.05,.12]});noise(d,{dur:.06,f:1400,q:.9,att:.05,tau:.02,g:.35});thump(d,{f:80,tau:.025,g:.08});}},
 // Electro: a snap, then a crackling buzz with a little mains-like hum under it.
 lightning:{d:.7,v:0.25,n:2,wet:.2,j(d){click(d,{g:.25,f:2000});noise(d,{dur:.03,type:'hp',f:2000,att:.05,tau:.006,g:.25});buzz(d,{dur:.3,rate:rnd(95,130),f:2800,q:.9,tau:.11,g:.55});buzz(d,{t:.02,dur:.22,rate:rnd(60,80),f:1400,q:1.2,tau:.08,g:.45});
  noise(d,{dur:.35,type:'hp',f:5000,att:.05,tau:.1,flick:60,depth:.9,g:.08});tone(d,{f:rnd(110,130),parts:[[2,.5,.08],[3,.5,.07],[4,.4,.06],[5,.3,.05],[7,.2,.04]],g:.025});crackle(d,{span:.3,count:22,hp:3000,g:[.05,.12]});}},
 wind:{d:1,v:0.19,n:2,wet:.22,j(d){noise(d,{dur:.45,f:300,f2:1400,q:1.6,att:.5,g:.5,pan:-.5,pan2:.1});noise(d,{t:.22,dur:.5,f:1300,f2:450,q:1.6,att:.35,g:.35,pan:.1,pan2:.5});noise(d,{t:.08,dur:.5,f:1000,f2:1100,q:8,att:.5,g:.05});noise(d,{dur:.6,type:'hp',f:4500,att:.5,g:.035});}},
 rock:{d:.8,v:0.19,n:2,wet:.18,j(d){click(d,{g:.4,f:1500});thump(d,{f:rnd(60,68),tau:.06,g:.3});noise(d,{dur:.14,type:'lp',f:650,att:.03,tau:.05,g:.5});tone(d,{f:rnd(380,440),parts:STONE,g:.3});
  grains(d,{t:.005,span:.3,count:28,f:[700,3500],q:2,dur:[.003,.012],g:[.12,.3]});noise(d,{t:.03,dur:.3,f:1500,q:.7,att:.1,tau:.1,g:.2});tone(d,{t:.05,f:NOTE(93),parts:SPARK,g:.03});}},
 dendro:{d:.8,v:0.19,n:2,wet:.2,j(d){noise(d,{dur:.07,f:4500,f2:1800,q:1.4,att:.4,g:.3});grains(d,{span:.35,count:40,f:[2000,7000],q:1.2,dur:[.002,.007],g:[.03,.08],pan:[-.6,.6],curve:1.3});
  const f=rnd(330,370);pluck(d,{f,dur:.45,bright:.5,g:.35});pluck(d,{t:.03,f:f*1.5,dur:.4,bright:.5,g:.2});tone(d,{t:.08,f:NOTE(90),parts:CEL,g:.03});noise(d,{dur:.06,type:'lp',f:700,att:.05,tau:.02,g:.2});}},
 // Reactions.
 melt:{d:1,v:0.235,wet:.25,j(d){noise(d,{dur:.6,f:3500,q:.7,att:.05,tau:.2,flick:40,depth:.8,g:.3});noise(d,{dur:.5,f:1200,f2:2600,q:.7,att:.3,g:.35});crackle(d,{span:.25,count:10,hp:4000,g:[.1,.2]});bubbles(d,{span:.3,count:12,f:[1000,3000],g:[.02,.05]});noise(d,{dur:.2,type:'lp',f:300,att:.05,tau:.06,g:.4});thump(d,{f:55,tau:.07,g:.35});}},
 vaporize:{d:1,v:0.235,wet:.25,j(d){noise(d,{dur:.75,f:2800,q:.6,att:.04,tau:.25,g:.5});noise(d,{dur:.5,type:'hp',f:6500,att:.05,tau:.15,g:.08});bubbles(d,{span:.4,count:35,f:[400,2000],dur:[.006,.02],g:[.04,.08]});noise(d,{dur:.2,type:'lp',f:400,att:.05,tau:.06,g:.4});thump(d,{f:58,tau:.06,g:.3});}},
 overload:{d:1.4,v:0.235,wet:.3,j(d){click(d,{g:.5,f:1000});noise(d,{dur:.04,type:'hp',f:500,att:.05,tau:.01,g:.6});thump(d,{f:50,tau:.2,g:.4});noise(d,{dur:.8,type:'lp',f:2500,f2:150,q:.7,att:.01,tau:.25,g:.7});noise(d,{dur:.5,f:600,q:.6,att:.02,tau:.15,flick:25,depth:.5,g:.5});crackle(d,{span:.8,count:40,hp:2000,g:[.08,.25]});buzz(d,{t:.02,dur:.25,rate:120,f:4000,tau:.08,g:.2});}},
 freeze:{d:1,v:0.235,wet:.3,j(d){crackle(d,{span:.3,count:18,hp:3000,g:[.12,.28],curve:.6});tone(d,{t:.12,f:1800,parts:GLASS,beat:3,g:.1});tone(d,{t:.18,f:2400,parts:GLASS,beat:3,g:.08});noise(d,{dur:.6,f:3000,q:.7,att:.3,tau:.2,g:.2});noise(d,{dur:.6,type:'hp',f:6000,att:.3,g:.05});thump(d,{f:80,tau:.03,g:.2});noise(d,{dur:.05,type:'lp',f:1500,att:.05,tau:.015,g:.2});}}
};
// Lets one sound reuse another's builder a little later.
function shift(d,seconds){const o=Math.round(seconds*SR);return {L:d.L.subarray(o),R:d.R.subarray(o),n:Math.max(0,d.n-o)};}
SOUNDS.encounter_hilichurl=SOUNDS.battle_start;
const KEEP=new Set(['birds','hunt_bow','hunt_pig']);
const cache=new Map();
// A room: decaying stereo noise as the impulse response.
function room(o,seconds=1.1,decay=3.2){const len=Math.ceil(o.sampleRate*seconds),ir=o.createBuffer(2,len,o.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);let last=0;for(let i=0;i<len;i++){const v=(Math.random()*2-1)*Math.pow(1-i/len,decay);last=last*.55+v*.45;d[i]=last;}}return ir;}
function peakOf(chs){let p=0;for(const d of chs)for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>p)p=v;}return p;}
// Loudness as heard: the loudest 50 ms after a 150 Hz high-pass (small speakers barely play the sub), so clicks,
// swells and booms land at the same level.
function loudness(chs){const hp=new Filter('hp',150,.7),W=Math.round(SR*.05),len=chs[0].length,x=new Float32Array(len);for(let i=0;i<len;i++)x[i]=hp.run((chs[0][i]+(chs[1]?chs[1][i]:chs[0][i]))*.5);
 let loud=0;for(let s=0;s<len;s+=W>>1){let e=0;const end=Math.min(len,s+W);for(let i=s;i<end;i++)e+=x[i]*x[i];loud=Math.max(loud,Math.sqrt(e/W));}return loud;}
S.loudness=loudness;
async function render(name){
 const def=SOUNDS[name],o=new OfflineAudioContext(2,Math.ceil(SR*(def.d+(def.wet?(def.room||1.1)*.7:0))),SR);
 const dry=o.createBuffer(2,Math.ceil(SR*def.d),SR),L=dry.getChannelData(0),R=dry.getChannelData(1);def.j({L,R,n:L.length});
 // Whatever still rings at the end of the dry take fades out smoothly (the room carries the tail).
 const F=Math.min(L.length,Math.round(SR*.08));for(let i=0;i<F;i++){const k=.5-.5*Math.cos(Math.PI*i/F),j=L.length-1-i;L[j]*=k;R[j]*=k;}
 const p=peakOf([L,R]);if(p>0){const k=.7/p;for(let i=0;i<L.length;i++){L[i]*=k;R[i]*=k;}}
 const comp=o.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=10;comp.ratio.value=3;comp.attack.value=.002;comp.release.value=.15;
 const master=o.createGain();master.connect(comp).connect(o.destination);
 if(def.wet){const verb=o.createConvolver(),wet=o.createGain();verb.buffer=room(o,def.room||1.1,3);wet.gain.value=def.wet;master.connect(verb).connect(wet).connect(comp);}
 const src=o.createBufferSource();src.buffer=dry;src.connect(master);src.start(0);
 const buf=await o.startRendering(),chs=[buf.getChannelData(0),buf.getChannelData(1)];
 const peak=peakOf(chs),loud=loudness(chs);if(peak>0&&loud>0){const k=Math.min(.2/loud,.97/peak);for(const c of chs)for(let i=0;i<c.length;i++)c[i]*=k;}
 return buf;
}
function synth(name,variant){
 const def=SOUNDS[name];if(!def)return null;const n=def.n||1,v=variant??Math.floor(Math.random()*n),key=name+'#'+v;
 if(!cache.has(key))cache.set(key,render(name).catch(()=>{cache.delete(key);return null;}));return cache.get(key);
}
// Prepare the synthesised sounds in idle moments once sound has started, so the first hit of a fight is not late.
const WARM=['tab','choice','toast','menu_open','menu_close','page','error','handbook_open','travel','battle_start','hit','fire','water','ice','lightning','wind','rock','dendro','guard','heal','slime_hit','melt','vaporize','overload','freeze','level_up'];
function warm(){
 if(S.warming)return;S.warming=true;const jobs=[];for(const name of WARM)for(let v=0;v<(SOUNDS[name]?.n||1);v++)jobs.push([name,v]);
 const idle=window.requestIdleCallback?cb=>requestIdleCallback(cb,{timeout:1500}):cb=>setTimeout(cb,60);
 const next=()=>{while(jobs.length){const [name,v]=jobs.shift();if(S.choice(name)!=='syn'||cache.has(name+'#'+v))continue;Promise.resolve(synth(name,v)).finally(()=>idle(next));return;}};
 idle(next);
}
// Recorded sounds: the official click (and hover, a quick high touch of the same click), the in-game recordings for
// results and rewards, and the web event's element sounds as an alternative for combat. Results, rewards and the
// interface default to recordings; combat defaults to the synthesis. Every sound with both can be chosen in
// 설정 → 소리 (settings.sfxChoice).
const RECORDED=new Set(['click','hover','victory','defeat','quest_complete','commission_accept','commission_complete','cook_complete','forge_complete','craft_complete','item_receive','unlock','equip','heal','fire','ice','lightning','wind','slime_hit','encounter_hilichurl']);
const DEFAULT_REC=new Set(['click','hover','victory','defeat','quest_complete','commission_accept','commission_complete','cook_complete','forge_complete','craft_complete','item_receive','unlock','equip','encounter_hilichurl']);
const DERIVED={hover:{from:'click',rate:1.45,cut:.07,level:.35}};
const sfxEntry=id=>{const m=typeof MANIFEST!=='undefined'?MANIFEST.sfx?.[id]:null;return m||(id==='click'?{url:'audio/official-review-click.mp3'}:null);};
const hasRecording=name=>RECORDED.has(name)&&!!sfxEntry(DERIVED[name]?.from||name);
// Victory and defeat have more candidates: OST endings (cut from tracks already in the game), the in-game
// challenge recordings, the official web event's result sounds and the synthesised fanfare.
const VARIANTS={
 victory:[['ost_victory_gallant','OST · Gallant Challenge'],['ost_victory_resolution','OST · His Resolution'],['ost_victory_monoceros','OST · Wrath of Monoceros Caeli'],['ost_victory_mountains','OST · Wind-Washed Mountains'],['rec','본편 도전 성공'],['event_success','웹 이벤트 성공'],['syn','합성']],
 defeat:[['rec','본편 도전 실패'],['event_fail','웹 이벤트 실패'],['ost_defeat_moonlike','OST · Moonlike Smile'],['ost_defeat_fragile','OST · Fragile Fantasy'],['syn','합성']]
};
const DEFAULT_VARIANT={victory:'ost_victory_gallant',defeat:'rec'};
const usable=(name,v)=>v==='syn'||(v==='rec'?hasRecording(name):!!sfxEntry(v));
S.VARIANTS=VARIANTS;S.usable=usable;S.hasRecording=hasRecording;
S.choice=name=>{const c=settings.sfxChoice?.[name];
 if(VARIANTS[name]){if(c&&VARIANTS[name].some(v=>v[0]===c)&&usable(name,c))return c;const d=DEFAULT_VARIANT[name];return usable(name,d)?d:hasRecording(name)?'rec':'syn';}
 return hasRecording(name)?(c==='syn'?'syn':c==='rec'?'rec':DEFAULT_REC.has(name)?'rec':'syn'):'syn';};
S.RECORDED=RECORDED;S.names=Object.keys(SOUNDS).filter(n=>n!=='encounter_hilichurl');S.renderSynth=render;S.level=name=>SOUNDS[name]?.v??.4;
const priorBuffer=GameAudio.buffer.bind(GameAudio),priorUnlock=GameAudio.unlock.bind(GameAudio);
GameAudio.unlock=async function(...args){const out=await priorUnlock(...args);try{if(this.armed&&this.context&&this.enabled())warm();}catch{}return out;};
GameAudio.buffer=async function(name,force){if(!this.context)return null;if(KEEP.has(name))return priorBuffer(name);const use=force||S.choice(name);
 if(use==='rec'&&hasRecording(name)){const b=await priorBuffer(DERIVED[name]?.from||name);if(b)return b;}
 else if(use!=='syn'&&use!=='rec'&&sfxEntry(use)){const b=await priorBuffer(use);if(b)return b;}
 return synth(SOUNDS[name]?name:'hit');};
// Recorded variants play at a fixed level; OST endings fade in quickly and out gently; a derived sound plays its
// source faster and cut short.
function playBuffer(buffer,level,variant,name){
 const c=GameAudio.context,src=c.createBufferSource(),g=c.createGain(),t=c.currentTime,der=variant==='rec'&&DERIVED[name];src.buffer=buffer;
 if(String(variant).startsWith('ost_')){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.12);g.gain.setValueAtTime(level,t+Math.max(.2,buffer.duration-1.1));g.gain.linearRampToValueAtTime(0,t+buffer.duration);}
 else if(der){src.playbackRate.value=der.rate;g.gain.setValueAtTime(level*der.level,t);g.gain.setValueAtTime(level*der.level,t+der.cut*.6);g.gain.linearRampToValueAtTime(0,t+der.cut);}
 else g.gain.value=level;
 src.connect(g).connect(c.destination);return {src,g,length:der?der.cut:buffer.duration};
}
const levelOf=(name,variant)=>String(variant).startsWith('ost_')?.6:variant==='syn'?(SOUNDS[name]?.v??.4):.45;
// Fanfares dip the music for their length so they are heard.
const DUCK=new Set(['victory','defeat','level_up','quest_complete','commission_complete']);let duckUntil=0;
const priorSync=GameAudio.sync.bind(GameAudio);
GameAudio.sync=function(...args){const out=priorSync(...args);if(this.music&&performance.now()<duckUntil)this.music.volume=Math.min(this.music.volume,settings.musicVolume*.65*.25);return out;};
function duck(seconds){duckUntil=performance.now()+seconds*1000;const m=GameAudio.music;if(m)m.volume=Math.min(m.volume,settings.musicVolume*.65*.25);clearTimeout(S.duckTimer);S.duckTimer=setTimeout(()=>{duckUntil=0;try{GameAudio.sync();}catch{}},seconds*1000+120);}
// Settings: listen to any version and keep the one you like.
S.audition=async function(name,which){try{await GameAudio.unlock?.();S.stopAudition();const b=await GameAudio.buffer(name,which);if(!b||!GameAudio.context)return;const {src,length}=playBuffer(b,(settings.sfxVolume||.6)*levelOf(name,which),which,name);S.auditionSource=src;src.start();if(DERIVED[name]&&which==='rec')src.stop(GameAudio.context.currentTime+length+.02);if(DUCK.has(name))duck(b.duration);}catch{}};
S.stopAudition=()=>{try{S.auditionSource?.stop();}catch{}S.auditionSource=null;};
S.setChoice=function(name,which){settings.sfxChoice={...(settings.sfxChoice||{}),[name]:which};try{persistSettings();}catch{}};
// Same rules as before (armed, enabled, page visible, a limited number of voices), with a level per sound.
GameAudio.play=async function(name){
 if(!this.armed||!this.enabled()||document.hidden||!settings.sfxVolume)return;
 const ui=['click','hover','tab','equip'].includes(name);if(ui){const now=performance.now(),gap=name==='hover'?45:90;if(now-(this['last_'+name]||0)<gap)return;this['last_'+name]=now;}
 const epoch=this.epoch,buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||!this.enabled()||document.hidden||this.context.state!=='running')return;
 if(this.voices.size>=8){const old=this.voices.values().next().value;try{old.stop();}catch{}this.voices.delete(old);}
 const variant=KEEP.has(name)?'rec':S.choice(name),{src:source,g:gain,length}=playBuffer(buffer,settings.sfxVolume*levelOf(name,variant),variant,name);
 if(variant==='syn'&&SOUNDS[name]?.n)source.playbackRate.value=rnd(.98,1.02);
 this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();if(DERIVED[name]&&variant==='rec')source.stop(this.context.currentTime+length+.02);if(DUCK.has(name))duck(buffer.duration);
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
