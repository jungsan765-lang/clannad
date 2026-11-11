/* 0.16.67 축제 미니게임 (runtime_reading.js 0.16.67): 눈싸움 (눈꽃 축제), 윷놀이 (설날), 송편 빚기 (추석). Each plays in its own window over the
 * festival window and sends what was pressed; the engine plays the same game again from the same seed and counts it, and this page draws
 * every moment from the engine's own rules (CRPGRuntime.festivalV01667), so the score shown is the score kept.
 * 0.16.68 (user: 「이벤트 퀄리티좀 높여봐. 좀 재밌게」): 눈싸움 has gift boxes, 진 단장 (do not hit her) and 「눈꽃 피버」; the 윷놀이 friend
 * talks through the game; 송편 is ordered with a filling (깨 · 콩 · 밤) chosen at 소 넣기, and the one who ordered it says what they think.
 * The words are 축제 대사 (tools/editorial/festival_k/talk.md, through the story workbench).
 * window.CRPGFestGames.play(job, {name, foe, parent, finish(input) → result, quit()}). */
(function(){'use strict';
const K=window.CRPGRuntime?.festivalV01667;if(!K)return;
const W=640,H=400,TAU=Math.PI*2;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','fg-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const SND=n=>{try{window.CRPGSound?.play?.(n);}catch{}};
const touch=()=>matchMedia('(hover:none)').matches||navigator.maxTouchPoints>0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=u=>1-Math.pow(1-clamp(u,0,1),3);
const IMG={},pic=src=>{if(!src)return null;let i=IMG[src];if(!i){i=IMG[src]=new Image();i.decoding='async';i.src=src;}return i.complete&&i.naturalWidth?i:null;};
const faceSrc=(id,side='ALLY')=>{try{return typeof combatPortraitSrc==='function'?combatPortraitSrc({side,source:id}):null;}catch{return null;}};
const mapSrc=id=>{try{const m=(typeof MANIFEST!=='undefined'?MANIFEST:window.CRPG_MANIFEST||{}).maps?.[id];return m?.url||(m?.file_name&&typeof assetPath==='function'?assetPath(m.file_name):null)||null;}catch{return null;}};
// 축제 대사: the lines of a talk (app_festival_v01667.js reads them with the player's name)
const talkSet=key=>{try{return window.CRPGFestival?.talkSet?.(key)||[];}catch{return [];}};
// 0.16.68 (user: 「원 같은거 막 있으니까 너무 그림판같아서 이상하긴 한데」): the game's own pictures where it has them — the places,
// the character cards, the 보물상자 — and shaded shapes (light from above, soft shadows) for what it does not have.
const ASSET=f=>'assets/'+f;
const CHEST=ASSET('icons/chests/chest_precious.webp');
function cover(ctx,img,x,y,w,h,fx=.5,fy=.5){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/s,sh=h/s;ctx.drawImage(img,(img.naturalWidth-sw)*fx,(img.naturalHeight-sh)*fy,sw,sh,x,y,w,h);}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
// a character card (the portrait art in a gold frame, like the game's cards), centred on x, standing on y
function card(ctx,src,x,y,w,h,ring='#e9c46a'){
 ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;rrect(ctx,x-w/2,y-h,w,h,8);ctx.fillStyle='#283044';ctx.fill();ctx.restore();
 const i=pic(src);ctx.save();rrect(ctx,x-w/2,y-h,w,h,8);ctx.clip();if(i)cover(ctx,i,x-w/2,y-h,w,h,.5,.18);
 const g=ctx.createLinearGradient(0,y-h,0,y);g.addColorStop(0,'rgba(255,255,255,.12)');g.addColorStop(.6,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=g;ctx.fillRect(x-w/2,y-h,w,h);ctx.restore();
 rrect(ctx,x-w/2,y-h,w,h,8);ctx.lineWidth=2.5;ctx.strokeStyle=ring;ctx.stroke();rrect(ctx,x-w/2+3,y-h+3,w-6,h-6,6);ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.stroke();
}
// a snowdrift: lumpy top, lit from above, a blue shadow underneath
function drift(ctx,x,y,w,h,seed=1){
 ctx.save();ctx.fillStyle='rgba(60,90,140,.18)';ctx.beginPath();ctx.ellipse(x,y+h*.45,w*.55,h*.18,0,0,TAU);ctx.fill();
 ctx.beginPath();ctx.moveTo(x-w/2,y+h*.4);const n=5;for(let k=0;k<=n;k++){const px=x-w/2+w*k/n,bump=Math.sin(seed*3.1+k*1.7)*.18+.82,py=y-h*.5*bump*(k===0||k===n?.4:1);if(k===0)ctx.lineTo(px,py);else{const cx=x-w/2+w*(k-.5)/n;ctx.quadraticCurveTo(cx,py-h*.18,px,py);}}
 ctx.lineTo(x+w/2,y+h*.4);ctx.closePath();const g=ctx.createLinearGradient(0,y-h*.6,0,y+h*.4);g.addColorStop(0,'#ffffff');g.addColorStop(.55,'#eef4fb');g.addColorStop(1,'#c9d8ea');ctx.fillStyle=g;ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
// the far snowbank: one drift across the field, a mound in front of each fort
function bank(ctx,laneX,n,fort){
 ctx.save();ctx.fillStyle='rgba(70,100,150,.16)';ctx.beginPath();ctx.ellipse(W/2,fort+64,W*.52,22,0,0,TAU);ctx.fill();
 ctx.beginPath();ctx.moveTo(-10,fort+56);ctx.lineTo(-10,fort+24);let px=-10,py=fort+24;
 for(let i=0;i<n;i++){const x=laneX(i),top=fort+2+((i*37)%7);ctx.quadraticCurveTo((px+x-46)/2,py+10,x-46,fort+20);ctx.bezierCurveTo(x-36,top-6,x+36,top-6,x+46,fort+20);px=x+46;py=fort+20;}
 ctx.quadraticCurveTo((px+W+10)/2,py+8,W+10,fort+26);ctx.lineTo(W+10,fort+56);ctx.bezierCurveTo(W*.7,fort+70,W*.3,fort+70,-10,fort+56);ctx.closePath();
 const g=ctx.createLinearGradient(0,fort,0,fort+66);g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#eef4fb');g.addColorStop(1,'#c3d4e8');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='rgba(140,170,210,.22)';for(let i=0;i<n;i++){const x=laneX(i);ctx.beginPath();ctx.ellipse(x+14,fort+30,22,6,0,0,TAU);ctx.fill();}ctx.restore();
}
// a lit sphere (snowball, moon)
function sphere(ctx,x,y,r,light='#ffffff',dark='#b9cbe2'){const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,light);g.addColorStop(1,dark);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
// a sheet of 한지: warm paper with fibres (made once)
let PAPER=null;function paper(){if(PAPER)return PAPER;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#f3e6c9';x.fillRect(0,0,256,256);
 let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<900;i++){x.strokeStyle='rgba(150,110,60,'+(r()*.08)+')';x.lineWidth=r()*1.2;x.beginPath();const a=r()*256,b=r()*256;x.moveTo(a,b);x.lineTo(a+(r()-.5)*24,b+(r()-.5)*24);x.stroke();}
 for(let i=0;i<500;i++){x.fillStyle='rgba(120,80,40,'+(r()*.05)+')';x.fillRect(r()*256,r()*256,1.5,1.5);}return PAPER=c;}
function roundFace(ctx,src,x,y,r,ring='#fff'){
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.closePath();ctx.fillStyle='#3b4459';ctx.fill();const i=pic(src);
 if(i){ctx.clip();const s=Math.min(i.naturalWidth,i.naturalHeight*.8);ctx.drawImage(i,(i.naturalWidth-s)/2,0,s,s,x-r,y-r,r*2,r*2);}
 ctx.restore();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.lineWidth=3;ctx.strokeStyle=ring;ctx.stroke();
}
// a speech bubble on the canvas (who: the speaker, at x,y, pointing down)
function bubble(ctx,x,y,who,text,alpha=1,maxW=300){
 ctx.save();ctx.globalAlpha=alpha;ctx.font='600 14px sans-serif';const words=String(text),lines=[];let cur='';
 for(const ch of words){if(ctx.measureText(cur+ch).width>maxW-24){lines.push(cur);cur=ch;}else cur+=ch;}if(cur)lines.push(cur);
 const w=Math.min(maxW,Math.max(...lines.map(l=>ctx.measureText(l).width))+24),h=lines.length*18+(who?22:12),bx=clamp(x-w/2,6,W-w-6),by=y-h-10;
 ctx.fillStyle='rgba(255,252,244,.96)';ctx.strokeStyle='rgba(120,90,50,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect?ctx.roundRect(bx,by,w,h,10):ctx.rect(bx,by,w,h);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(clamp(x,bx+14,bx+w-14)-7,by+h);ctx.lineTo(clamp(x,bx+14,bx+w-14),by+h+9);ctx.lineTo(clamp(x,bx+14,bx+w-14)+7,by+h);ctx.closePath();ctx.fill();
 ctx.textAlign='left';ctx.textBaseline='top';let ty=by+6;if(who){ctx.fillStyle='#a3561c';ctx.font='700 12px sans-serif';ctx.fillText(who,bx+12,ty);ty+=16;}
 ctx.fillStyle='#2c2218';ctx.font='600 14px sans-serif';for(const l of lines){ctx.fillText(l,bx+12,ty);ty+=18;}ctx.restore();
}
// ---------- the window every game shares ----------
function shell(job,opts,title){
 const wrap=mk('div','fg-overlay fg-'+job.game.toLowerCase());wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',title);
 const box=mk('div','fg-box'),top=mk('div','fg-top'),score=mk('b','fg-score','0'),time=mk('span','fg-time',''),quit=btn('그만하기',()=>ui.quit(),'fg-quit');
 top.append(mk('strong','fg-title',title+' · '+job.day+'일째'),mk('span','fg-score-label','점수'),score,time,quit);
 const stage=mk('div','fg-stage'),canvas=mk('canvas','fg-canvas'),bar=mk('div','fg-bar'),panel=mk('div','fg-panel');panel.hidden=true;
 const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 stage.append(canvas,panel);box.append(top,stage,bar);wrap.append(box);(opts.parent||document.body).append(wrap);requestAnimationFrame(()=>wrap.classList.add('open'));
 // the keys go to this window (Esc leaves the game, not the festival window behind it)
 wrap.tabIndex=-1;try{wrap.focus({preventScroll:true});}catch{}
 const ui={wrap,canvas,ctx,bar,panel,alive:true,score:n=>{score.textContent=fmt(n);},time:t=>{time.textContent=t;},
  pos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};},
  destroy(){ui.alive=false;for(const f of ui.offs)try{f();}catch{}wrap.remove();},offs:[],
  on(target,ev,fn,o){target.addEventListener(ev,fn,o);ui.offs.push(()=>target.removeEventListener(ev,fn,o));},
  quit(){if(!ui.alive)return;ui.destroy();opts.quit?.();},
  // the end: what was pressed goes to the engine; its count comes back
  async send(input,words,facts){
   ui.ended=true;panel.hidden=false;panel.replaceChildren(mk('strong','fg-panel-title','기록을 확인하는 중…'));quit.disabled=true;
   const out=await opts.finish(input);if(!ui.alive)return;quit.disabled=false;panel.replaceChildren();
   if(!out){panel.append(mk('strong','fg-panel-title','기록을 맞추지 못했습니다'),mk('p','',window.CRPGFestival?.msg||'다시 해 주세요.'),btn('닫기',()=>ui.quit(),'primary'));return;}
   const stars=mk('div','fg-stars');for(let i=1;i<=3;i++)stars.append(mk('i',i<=out.tier?'on':'',i<=out.tier?'★':'☆'));
   const row=mk('div','fg-facts');for(const [label,value] of facts?.(out)||[]){const f=mk('div','fg-fact');f.append(mk('small','',label),mk('b','',value));row.append(f);}
   panel.append(mk('strong','fg-panel-title',words?.(out)||('점수 '+fmt(out.score))),stars,...(row.childElementCount?[row]:[]),mk('p','',out.points?'축제 점수 +'+out.points+(out.primogem?' · 원석 +'+out.primogem:'')+' · 모두 '+fmt(out.total)+'점':out.tier?'이 날 받은 별보다 많지 않아 점수는 그대로입니다':'별을 받지 못했습니다'),mk('small','','이 날 최고 '+fmt(out.best)),btn('닫기',()=>ui.quit(),'primary'));
   SND(out.tier>=2?'reward':'menu_open');
  }};
 ui.on(wrap,'keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ui.quit();}});
 return ui;
}
const countdown=(ui,start)=>{let n=3;const p=ui.panel;p.hidden=false;p.className='fg-panel count';const tick=()=>{if(!ui.alive)return;if(n===0){p.hidden=true;p.className='fg-panel';start();return;}p.replaceChildren(mk('strong','fg-count',String(n)));n--;setTimeout(tick,650);};tick();};
// ---------- 눈싸움 ----------
const SNOW_FACES=['MOND_AMBER','MOND_BENNETT','MOND_KAEYA','MOND_NOELLE','MOND_RAZOR','MOND_FISCHL','MOND_SUCROSE','MOND_DIONA'];
function snowball(job,opts){
 const S=K.snow,R=S.rules,plan=S.plan(job.seed,job.day),ui=shell(job,opts,opts.name||'눈싸움'),ctx=ui.ctx;
 // 0.16.68: from day 3 a near row of five more places in front (S.lanes(day) = 10); the far row moves up a little to make room
 const ROWS=S.rows?S.rows(job.day):1,LANES=S.lanes?S.lanes(job.day):R.lanes,FAR=ROWS>1?150:176,NEAR=246,near=i=>i>=R.lanes;
 const laneX=i=>near(i)?W*(.10+(i-R.lanes)*.2):W*(.14+i*.18),laneFort=i=>near(i)?NEAR:FAR,FORT=FAR,inputs=[{t:0,a:'s'}];
 const KEYS=['1','2','3','4','5','6','7','8','9','0'];let t0=0,hidden=false,lastThrow=-1e9,raf=0,wall=0;
 const bg=ASSET('bg_place_snow_covered_path.webp'),jeanFace=faceSrc('MOND_JEAN'),faces=plan.map((p,j)=>faceSrc(SNOW_FACES[(j*3+p.lane)%SNOW_FACES.length]));
 const calls={jean:talkSet('SNOW_JEAN'),gift:talkSet('SNOW_GIFT'),fever:talkSet('SNOW_FEVER')};let said=null,counts={jean:0,gift:0,fever:0};const seenLog=new Set();
 const now=()=>performance.now()-t0,playing=()=>t0&&!ui.ended;
 const hide=on=>{if(!playing()||on===hidden)return;const t=Math.min(R.ms,Math.round(now()));hidden=on;inputs.push({t,a:on?'h':'s'});hideBtn.classList.toggle('on',on);};
 const shoot=lane=>{if(!playing()||hidden)return;const t=Math.min(R.ms,Math.round(now())),sim=S.play(job.seed,job.day,inputs,t);if(t<sim.stun||t-lastThrow<R.cooldown)return;lastThrow=t;inputs.push({t,a:'t',lane});SND('menu_open');};
 const hideBtn=btn('숨기',()=>{},'fg-hide');hideBtn.title='누르고 있는 동안 눈 벽 뒤에 숨습니다 (스페이스)';
 ui.on(hideBtn,'pointerdown',e=>{e.preventDefault();hide(true);});for(const ev of ['pointerup','pointercancel','pointerleave'])ui.on(hideBtn,ev,()=>hide(false));
 const lanesRow=mk('div','fg-lanes'+(ROWS>1?' two':''));for(let i=0;i<LANES;i++)lanesRow.append(btn(KEYS[i],()=>shoot(i),'fg-lane'));
 const legend=mk('div','fg-legend');legend.append(mk('span','fg-key friend','동료 +100'),mk('span','fg-key gift','보물상자 +250'),mk('span','fg-key jean','진 단장 −'+R.jean),mk('span','fg-key fever','5연속 = 피버 ×2'));
 ui.bar.append(legend,lanesRow,hideBtn);
 ui.on(ui.canvas,'pointerdown',e=>{const p=ui.pos(e);if(p.y>330)return;let best=-1,d=1e9;for(let i=0;i<LANES;i++){const dd=ROWS>1?Math.hypot(p.x-laneX(i),(p.y-(laneFort(i)-8))*1.2):Math.abs(p.x-laneX(i));if(dd<d){d=dd;best=i;}}if(d<62)shoot(best);});
 ui.on(document,'keydown',e=>{if(!ui.alive)return;if(e.key===' '||e.key==='s'||e.key==='S'||e.key==='ArrowDown'){e.preventDefault();hide(true);}else{const n=KEYS.indexOf(e.key);if(n>=0&&n<LANES)shoot(n);}},true);
 ui.on(document,'keyup',e=>{if(e.key===' '||e.key==='s'||e.key==='S'||e.key==='ArrowDown')hide(false);},true);
 function tag(x,y,text,color){ctx.save();ctx.font='700 11px sans-serif';const w=ctx.measureText(text).width+12;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect?ctx.roundRect(x-w/2,y-9,w,18,6):ctx.rect(x-w/2,y-9,w,18);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);ctx.restore();}
 // the friends' calls: a line from the talk for the first gifts, each 진 단장 hit and each fever
 function listen(sim){for(const e of sim.log){const id=e.k+':'+e.t+':'+(e.lane??'');if(seenLog.has(id))continue;seenLog.add(id);
  if(e.k==='jean'){const l=calls.jean[counts.jean++%Math.max(1,calls.jean.length)];if(l)said={...l,at:e.t,x:laneX(e.lane),y:laneFort(e.lane)-56};SND('hit');}
  else if(e.k==='gift'){if(counts.gift++<2){const l=calls.gift[(counts.gift-1)%Math.max(1,calls.gift.length)];if(l)said={...l,at:e.t,x:laneX(e.lane),y:laneFort(e.lane)-56};}SND('reward');}
  else if(e.k==='fever'){const l=calls.fever[counts.fever++%Math.max(1,calls.fever.length)];if(l)said={...l,at:e.t,x:W/2,y:120};SND('reward');}}}
 function frame(){
  if(!ui.alive)return;const t=t0?Math.min(R.ms,now()):0,sim=t0?S.play(job.seed,job.day,inputs,t):{score:0,combo:0,stun:-1,fever:-1,flying:[],hitBy:plan.map(()=>null),log:[]};
  if(t0)listen(sim);const fever=t0&&t<sim.fever;
  ui.score(sim.score);ui.time(t0?Math.ceil((R.ms-t)/1000)+'초':'');
  ctx.clearRect(0,0,W,H);const b=pic(bg);if(b){const s=Math.max(W/b.naturalWidth,H/b.naturalHeight);ctx.drawImage(b,(W-b.naturalWidth*s)/2,(H-b.naturalHeight*s)/2,b.naturalWidth*s,b.naturalHeight*s);}
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,fever?'rgba(150,200,255,.42)':'rgba(214,232,250,.28)');sky.addColorStop(.6,'rgba(236,244,252,.18)');sky.addColorStop(1,'rgba(250,252,255,.55)');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // falling snow (thicker in the fever) and lights on the forts
  for(let i=0;i<(fever?110:60);i++){const depth=1+i%3,x=(i*97+t*.012*depth+Math.sin(t/900+i)*8)%W,y=(i*53+t*.035*depth*(fever?1.8:1))%H,r=.8+depth*.7;ctx.fillStyle='rgba(255,255,255,'+(.35+depth*.2)+')';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  // who is up behind the forts
  const pop=(p,j)=>{const hit=sim.hitBy[j],gone=Math.min(p.down,hit??Infinity);if(t<p.up||t>gone+260)return;
   const sc=near(p.lane)?1.18:1,rise=t<p.up+160?(t-p.up)/160:t>gone?1-(t-gone)/260:1,x=laneX(p.lane),y=laneFort(p.lane)+18-46*sc*clamp(rise,0,1);
   if(p.kind==='gift'){const c=pic(CHEST);if(c)ctx.drawImage(c,x-32*sc,y-22*sc,64*sc,64*sc);}else card(ctx,p.kind==='jean'?jeanFace:faces[j],x,y+48*sc,54*sc,68*sc,p.kind==='jean'?'#f0c84a':hit!==null&&t>=hit?'#9fd3ff':'#e9c46a');
   if(rise>.8&&(hit===null||t<hit)){if(p.kind==='gift')tag(x,y-42*sc,'보물상자 +250','#b1442f');else if(p.kind==='jean')tag(x,y-46*sc,'단장님! 맞히면 안 돼','#9a6b12');}
   if(hit!==null&&t>=hit&&t<hit+260){ctx.fillStyle='rgba(255,255,255,.85)';for(let k=0;k<9;k++){const a=k/9*TAU,r=10+(t-hit)*.12;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,4,0,TAU);ctx.fill();}}
   if(p.throwAt!==undefined&&(hit===null||hit>p.throwAt)&&t>=p.throwAt-600&&t<p.throwAt){const mx=x+26*sc,my=y-40*sc;ctx.save();ctx.translate(mx,my);ctx.rotate(Math.PI/4);ctx.fillStyle='#e8452f';ctx.shadowColor='rgba(232,69,47,.7)';ctx.shadowBlur=12;ctx.fillRect(-11,-11,22,22);ctx.restore();ctx.fillStyle='#fff';ctx.font='800 17px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',mx,my+1);}
  };
  plan.forEach((p,j)=>{if(!near(p.lane))pop(p,j);});
  bank(ctx,laneX,R.lanes,FAR);
  if(ROWS>1){plan.forEach((p,j)=>{if(near(p.lane))pop(p,j);});bank(ctx,i=>laneX(i+R.lanes),R.lanes,NEAR);}
  // their throws coming in
  plan.forEach((p,j)=>{if(p.throwAt===undefined)return;const hit=sim.hitBy[j];if(hit!==null&&hit<=p.throwAt)return;const u=(t-p.throwAt)/R.incoming;if(u<0||u>1)return;
   const fy=laneFort(p.lane),x=laneX(p.lane)+(W/2-laneX(p.lane))*u,y=fy+(H-70-fy)*u-Math.sin(u*Math.PI)*60,r=6+28*u*u;sphere(ctx,x,y,r);});
  // ours flying out
  for(const f of sim.flying){const u=(t-f.from)/(f.at-f.from),fy=laneFort(f.lane),x=W/2+(laneX(f.lane)-W/2)*u,y=H-40+(fy-(H-40))*u-Math.sin(u*Math.PI)*80,r=14-8*u;if(fever){ctx.save();ctx.shadowColor='rgba(90,170,255,.9)';ctx.shadowBlur=14;sphere(ctx,x,y,r,'#ffffff','#9fd0ff');ctx.restore();}else sphere(ctx,x,y,r);}
  // numbers
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const e of sim.log){const age=t-e.t;if(age<0||age>700)continue;const a=1-age/700;
   if(e.k==='hit'||e.k==='gift'){ctx.fillStyle=e.k==='gift'?'rgba(200,50,40,'+a+')':e.fever?'rgba(20,120,220,'+a+')':'rgba(30,90,170,'+a+')';ctx.font='800 '+(e.fever||e.k==='gift'?26:22)+'px sans-serif';ctx.fillText('+'+e.n,laneX(e.lane),laneFort(e.lane)-50-age*.04);if(e.combo>1){ctx.font='700 14px sans-serif';ctx.fillText(e.combo+'연속',laneX(e.lane),laneFort(e.lane)-28-age*.04);}}
   if(e.k==='jean'){ctx.fillStyle='rgba(170,110,10,'+a+')';ctx.font='800 22px sans-serif';ctx.fillText('−'+R.jean,laneX(e.lane),laneFort(e.lane)-50-age*.04);}
   if(e.k==='block'){ctx.fillStyle='rgba(60,120,80,'+a+')';ctx.font='700 16px sans-serif';ctx.fillText('피했다!',W/2,H-130);}}
  // the fever: a banner and how long is left
  if(fever){const left=(sim.fever-t)/R.fever;ctx.fillStyle='rgba(40,120,220,.85)';ctx.fillRect(W/2-120,10,240,30);ctx.fillStyle='#fff';ctx.font='800 18px sans-serif';ctx.fillText('눈꽃 피버 ×2',W/2,25);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(W/2-120,40,240*left,4);}
  else if(t0&&sim.combo>=2){ctx.fillStyle='rgba(30,70,140,.75)';ctx.font='700 14px sans-serif';ctx.fillText(sim.combo+'연속 · 피버까지 '+(R.feverAt-sim.combo%R.feverAt),W/2,24);}
  // our wall
  wall+=((hidden?1:0)-wall)*.35;const wy=H-34-wall*92;drift(ctx,W/2,wy+70,W*1.25,150,9);
  if(t<sim.stun){ctx.fillStyle='rgba(255,255,255,'+(.75*(sim.stun-t)/R.stun)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(200,60,40,.9)';ctx.font='800 26px sans-serif';ctx.fillText('맞았다! -'+R.hurt,W/2,H/2);}
  if(hidden){ctx.fillStyle='rgba(40,60,90,.75)';ctx.font='700 16px sans-serif';ctx.fillText('숨는 중',W/2,H-24);}
  else if(t0&&!ui.ended&&t>=sim.stun&&t-lastThrow>=R.cooldown){ctx.fillStyle='rgba(40,60,90,.55)';ctx.font='600 13px sans-serif';ctx.fillText('던질 수 있음',W/2,H-20);}
  if(said&&t-said.at<1800)bubble(ctx,said.x,said.y,said.who,said.text,clamp((1800-(t-said.at))/300,0,1),260);
  if(t0&&t>=R.ms&&!ui.ended){ui.send(inputs.slice(),o=>'맞힌 사람 '+(o.detail?.hits??0)+'명 · 점수 '+fmt(o.score),o=>[['최고 연속',(o.detail?.bestCombo||0)+'번'],['보물상자',(o.detail?.gifts||0)+'개'],['눈꽃 피버',(o.detail?.fevers||0)+'번'],['진 단장',(o.detail?.jeans||0)+'번 맞힘']]);hide(false);}
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();countdown(ui,()=>{t0=performance.now();});
}
// ---------- 윷놀이 ----------
// the friend's lines (talk YUT_<character>): start, 윷·모, catches mine, caught, 빽도, wins, loses
const YUT_SAY={start:0,mo:1,catch:2,caught:3,bback:4,win:5,lose:6};
function yut(job,opts){
 const Y=K.yut,ui=shell(job,opts,opts.name||'윷놀이'),ctx=ui.ctx,g=Y.create(job.seed,job.day),decisions=[];
 const foe=opts.foe||Y.foes[job.day-1],mine=faceSrc('PLAYER_CUSTOM'),theirs=faceSrc(foe),lines=talkSet('YUT_'+foe);
 let said=null;const say=k=>{const l=lines[YUT_SAY[k]];if(l)said={...l,at:performance.now()};};
 const BX=24,BY=24,BS=352;
 // where each station sits on the board (0 = 참먹이, bottom right)
 const P={};for(let k=0;k<=4;k++){P[k]=[1,1-k/5];P[5+k]=[1-k/5,0];P[10+k]=[0,k/5];P[15+k]=[k/5,1];}P[20]=[5/6,1/6];P[21]=[4/6,2/6];P[22]=[.5,.5];P[23]=[2/6,4/6];P[24]=[1/6,5/6];P[25]=[1/6,1/6];P[26]=[2/6,2/6];P[27]=[4/6,4/6];P[28]=[5/6,5/6];
 const xy=st=>[BX+P[st][0]*BS,BY+P[st][1]*BS];
 let sel=0,msg='윷을 던지세요',sticks=null,anim=[],waitThrow=null,waitMove=null,raf=0,flash=null;
 const throwBtn=btn('윷 던지기',()=>{if(waitThrow){const f=waitThrow;waitThrow=null;f();}},'primary fg-throw'),chips=mk('div','fg-chips');
 ui.bar.append(mk('span','fg-hint','윷을 던진 뒤, 빛나는 말이나 노란 칸을 누르세요'),chips,throwBtn);
 ui.on(document,'keydown',e=>{if(e.key===' '&&waitThrow){e.preventDefault();throwBtn.click();}},true);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const posOf=(side,i)=>{const p=g.pieces[side][i],st=Y.station(p);
  if(st==='HOME'){const n=g.pieces[side].slice(0,i).filter(q=>q.home).length;return [536+n*30,side?78:314];}
  if(st===-1){const n=g.pieces[side].slice(0,i).filter(q=>!q.home&&Y.station(q)===-1).length;return [436+n*30,side?78:314];}
  const [x,y]=xy(st),stack=g.pieces[side].filter((q,j)=>j<i&&!q.home&&Y.station(q)===st).length;return [x+stack*4+(side?8:-8),y-stack*4+(side?-8:8)];};
 function chipsDraw(){chips.replaceChildren();if(g.phase!=='MOVE'||g.turn!==0)return;g.throws.forEach((v,k)=>{const usable=Y.legal(g).some(m=>m.k===k),b=btn(Y.names[v],()=>{sel=k;chipsDraw();},'fg-chip'+(k===sel?' on':''));b.disabled=!usable;chips.append(b);});}
 function legalNow(){return g.phase==='MOVE'&&g.turn===0?Y.legal(g).filter(m=>m.k===sel):[];}
 ui.on(ui.canvas,'pointerdown',e=>{if(!waitMove)return;const p=ui.pos(e),moves=legalNow();let pick=null,d=1e9;
  for(const m of moves){const [x,y]=posOf(0,m.p),dd=Math.hypot(p.x-x,p.y-y);if(dd<d){d=dd;pick=m;}if(m.to!=='HOME'){const [tx,ty]=xy(m.to),d2=Math.hypot(p.x-tx,p.y-ty);if(d2<d){d=d2;pick=m;}}}
  if(pick&&d<30){const f=waitMove;waitMove=null;f([pick.k,pick.p]);}});
 function drawStick(x,y,flat,marked,rot){ctx.save();ctx.translate(x,y);ctx.rotate(rot);const wood=ctx.createLinearGradient(-9,0,9,0);if(flat){wood.addColorStop(0,'#e9d2a4');wood.addColorStop(.5,'#f8ead0');wood.addColorStop(1,'#dcc08e');}else{wood.addColorStop(0,'#6d4422');wood.addColorStop(.45,'#a8743f');wood.addColorStop(1,'#5e391c');}
  ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=6;ctx.shadowOffsetY=3;ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect?ctx.roundRect(-9,-38,18,76,8):ctx.rect(-9,-38,18,76);ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(60,36,16,.7)';ctx.lineWidth=1.5;ctx.stroke();
  if(!flat){ctx.strokeStyle='rgba(40,22,8,.35)';ctx.lineWidth=1;for(const gx of [-4,0,4]){ctx.beginPath();ctx.moveTo(gx,-34);ctx.bezierCurveTo(gx+2,-10,gx-2,10,gx,34);ctx.stroke();}}
  if(flat){ctx.strokeStyle='#8b5a2b';ctx.lineWidth=1.6;for(const yy of [-22,0,22]){ctx.beginPath();ctx.moveTo(-5,yy-5);ctx.lineTo(5,yy+5);ctx.moveTo(5,yy-5);ctx.lineTo(-5,yy+5);ctx.stroke();}}
  if(marked){ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(0,flat?30:-30,4,0,TAU);ctx.fill();}ctx.restore();}
 const facesFor=v=>{const flats=v===5?0:v===4?4:v===-1?1:v;return [0,1,2,3].map(i=>v===-1?i===0:v===1?i===1:i<flats);};
 function frame(){
  if(!ui.alive)return;const t=performance.now();ctx.clearRect(0,0,W,H);
  const place=pic(ASSET('bg_place_chihu_rock.webp'));if(place){cover(ctx,place,0,0,W,H);}ctx.fillStyle='rgba(28,14,12,.72)';ctx.fillRect(0,0,W,H);
  // the board: a sheet of 한지 with ink lines
  ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;ctx.fillStyle='#efe0c0';ctx.fillRect(BX-16,BY-16,BS+32,BS+32);ctx.restore();
  ctx.save();ctx.fillStyle=ctx.createPattern(paper(),'repeat');ctx.fillRect(BX-16,BY-16,BS+32,BS+32);ctx.restore();
  ctx.strokeStyle='rgba(120,40,30,.75)';ctx.lineWidth=2;ctx.strokeRect(BX-9,BY-9,BS+18,BS+18);
  ctx.lineCap='round';ctx.strokeStyle='rgba(40,28,20,.78)';ctx.lineWidth=3;ctx.strokeRect(BX,BY,BS,BS);ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(...xy(5));ctx.lineTo(...xy(15));ctx.moveTo(...xy(10));ctx.lineTo(BX+BS,BY+BS);ctx.stroke();ctx.lineCap='butt';
  const moves=legalNow(),targets=new Set(moves.map(m=>m.to));
  for(let st=0;st<=28;st++){const [x,y]=xy(st),big=[0,5,10,15,22].includes(st),lit=targets.has(st);
   if(lit){ctx.save();ctx.shadowColor='rgba(255,200,80,.95)';ctx.shadowBlur=16;}ctx.beginPath();ctx.arc(x,y,big?13:8,0,TAU);ctx.fillStyle=lit?'#ffd36b':big?'#b8352a':'#f7ecd2';ctx.fill();if(lit)ctx.restore();
   ctx.strokeStyle='rgba(40,28,20,.85)';ctx.lineWidth=big?2.4:2;ctx.stroke();if(big){ctx.beginPath();ctx.arc(x,y,9,0,TAU);ctx.strokeStyle='rgba(255,230,200,.65)';ctx.lineWidth=1.2;ctx.stroke();}
   if(lit){ctx.beginPath();ctx.arc(x,y,(big?17:12)+Math.sin(t/150)*2,0,TAU);ctx.strokeStyle='rgba(255,211,107,.9)';ctx.lineWidth=2;ctx.stroke();}}
  if(moves.some(m=>m.to==='HOME')){ctx.fillStyle='#ffd36b';ctx.font='800 13px sans-serif';ctx.textAlign='center';ctx.fillText('여기로 나기!',BX+BS,BY+BS-22);}
  ctx.fillStyle='#f3cf82';ctx.font='700 11px sans-serif';ctx.textAlign='center';ctx.fillText('참먹이',BX+BS,BY+BS+30);
  // trays
  const foeName=typeof game!=='undefined'?(game.tables?.['07_CHAR_DB']?.get(foe)?.[1]||''):'';
  for(const [ty,label] of [[30,foeName],[266,'나']]){rrect(ctx,412,ty,212,90,10);ctx.fillStyle='rgba(255,240,220,.07)';ctx.fill();ctx.strokeStyle='rgba(243,207,130,.28)';ctx.lineWidth=1;ctx.stroke();
   ctx.fillStyle='#f3cf82';ctx.font='700 12px sans-serif';ctx.textAlign='left';ctx.fillText(label,420,ty+16);ctx.fillStyle='rgba(233,220,196,.75)';ctx.font='600 11px sans-serif';ctx.fillText('남은 말',420,ty+80);ctx.fillText('난 말',522,ty+80);
   ctx.strokeStyle='rgba(243,207,130,.2)';ctx.beginPath();ctx.moveTo(518,ty+8);ctx.lineTo(518,ty+84);ctx.stroke();}
  // pieces (a stack shows how many go together)
  for(const side of [1,0])for(let i=0;i<g.n;i++){let [x,y]=posOf(side,i);const a=anim.find(q=>q.side===side&&q.i===i);if(a){const u=ease((t-a.at)/320);if(u<1){x=a.x+(x-a.x)*u;y=a.y+(y-a.y)*u-Math.sin(u*Math.PI)*28;}}
   const can=side===0&&moves.some(m=>m.p===i);if(can){ctx.save();ctx.shadowColor='rgba(255,200,80,.95)';ctx.shadowBlur=14+Math.sin(t/160)*6;}card(ctx,side?theirs:mine,x,y+15,24,30,can?'#ffd36b':side?'#e8705a':'#6fc3ff');if(can)ctx.restore();
   const st=Y.station(g.pieces[side][i]),n=st!==-1&&st!=='HOME'?g.pieces[side].filter(q=>!q.home&&Y.station(q)===st).length:1;
   if(n>1&&g.pieces[side].findIndex(q=>!q.home&&Y.station(q)===st)===i){ctx.fillStyle=side?'#e8705a':'#3b8fd6';ctx.beginPath();ctx.arc(x+12,y-12,8,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+n,x+12,y-12);ctx.textBaseline='alphabetic';}}
  // the sticks and what came out
  if(sticks){const u=clamp((t-sticks.at)/650,0,1),air=u<1?Math.sin(u*Math.PI)*46:0;sticks.faces.forEach((f,i)=>drawStick(470+i*40,190-air,u<1?(Math.floor(t/90+i)%2===0):f,i===0,u<1?Math.sin(t/60+i)*.9:(i-1.5)*.08));
   if(u>=1){const big=sticks.v>=4,s=1+(big?Math.max(0,.4-(t-sticks.at-650)/600):0);ctx.save();ctx.translate(520,252);ctx.scale(s,s);ctx.fillStyle=sticks.side?'#ffb3a2':big?'#ffd36b':'#bfe4ff';ctx.font='800 '+(big?34:28)+'px sans-serif';ctx.textAlign='center';ctx.fillText(Y.names[sticks.v]+'!',0,0);ctx.restore();
    if(big&&t-sticks.at<1500){ctx.fillStyle='rgba(255,211,107,.8)';for(let k=0;k<12;k++){const a=k/12*TAU+t/300,r=40+(t-sticks.at-650)*.05;ctx.beginPath();ctx.arc(520+Math.cos(a)*r,240+Math.sin(a)*r*.6,3,0,TAU);ctx.fill();}}}}
  if(flash&&t-flash.at<500){ctx.fillStyle='rgba(255,240,200,'+(0.35*(1-(t-flash.at)/500))+')';ctx.fillRect(0,0,W,H);}
  ctx.fillStyle='#f4e8d2';ctx.font='700 15px sans-serif';ctx.textAlign='center';ctx.fillText(msg,520,142);
  if(said&&t-said.at<2600)bubble(ctx,520,92,said.who,said.text,clamp((2600-(t-said.at))/300,0,1),220);
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();
 const snapshot=side=>g.pieces[side].map((p,i)=>{const [x,y]=posOf(side,i);return {side,i,x,y};});
 async function show(entries,side){for(const v of entries){if(!ui.alive)return;sticks={v,faces:facesFor(v),at:performance.now(),side};SND('menu_open');if(side===1&&v>=4)say('mo');if(side===1&&v<0)say('bback');await wait(1000);}}
 async function moveWith(side,k,p){const before=snapshot(0).concat(snapshot(1)),caughtBefore=g.pieces[1-side].filter(q=>Y.station(q)!==-1&&!q.home).length;Y.play(g,k,p);const at=performance.now();anim=before.map(b=>({...b,at}));
  const caught=caughtBefore-g.pieces[1-side].filter(q=>Y.station(q)!==-1&&!q.home).length;if(caught>0){msg=(side?'잡혔다!':'잡았다! 한 번 더');flash={at:performance.now()};say(side?'catch':'caught');SND(side?'hit':'reward');}await wait(520);}
 (async()=>{
  ui.score(0);say('start');await wait(400);
  for(let guard=0;guard<3000&&ui.alive&&g.phase!=='DONE';guard++){
   ui.score(g.pieces[0].filter(q=>q.home).length*200);ui.time((g.turn?'상대':'내')+' 차례');
   if(g.phase==='THROW'){
    if(g.turn===0){msg=g.extra?'한 번 더 던지세요':'윷을 던지세요';g.extra=false;throwBtn.disabled=false;await new Promise(r=>{waitThrow=r;});throwBtn.disabled=true;}else{msg='상대가 던지는 중';await wait(700);}
    const before=g.log.length,side=g.turn;Y.roll(g);const thrown=g.log.slice(before).filter(x=>x.throw!==undefined).map(x=>x.throw);await show(thrown,side);
    if(g.phase==='THROW'&&g.turn!==side)msg=side?'상대가 움직일 말이 없습니다':'움직일 말이 없습니다';
    sel=0;chipsDraw();continue;
   }
   if(g.turn===1){msg='상대 차례';await wait(500);const m=Y.bot(g);if(!m){g.throws=[];Y.settle(g);continue;}await moveWith(1,m.k,m.p);continue;}
   // our move
   const usable=[...new Set(Y.legal(g).map(m=>m.k))];if(!usable.includes(sel))sel=usable[0]??0;chipsDraw();msg=g.throws.length>1?'쓸 윷을 고르고 말을 누르세요':'움직일 말을 누르세요';
   const d=await new Promise(r=>{waitMove=r;});if(!ui.alive)return;decisions.push(d);chips.replaceChildren();await moveWith(0,d[0],d[1]);
  }
  if(!ui.alive)return;msg=g.winner===0?'이겼다!':'졌다…';say(g.winner===0?'lose':'win');chips.replaceChildren();throwBtn.disabled=true;await wait(1600);
  ui.send(decisions.slice(),o=>(o.detail?.won?'이겼습니다!':'졌습니다')+' · 난 말 '+(o.detail?.home??0)+'개');
 })();
}
// ---------- 송편 빚기 ----------
const STEPS=['떼기','소 넣기','빚기'];
// 0.16.68 (user: 「송편 미니게임이 완성도가 낮아보여 사람이 봤을때. 좀 더 보완해봐」, 「'콩를' 이런거 조심하고」): a table on the night pier. The
// one who ordered stands at the table as a card and says what they think of it; the dough, the three fillings (깨 · 콩 · 밤) and a bamboo
// steamer on pine needles (솔잎) are on the table, and every press is a move of the hands: a piece is pinched off the dough, pressed into a
// cup, filled from the bowl, folded into a half moon and set in the steamer. The rules (the gauge, the marks) are the engine's own.
const SONG_FACES={'향릉':'LIYUE_XIANGLING','행추':'LIYUE_XINGQIU','중운':'LIYUE_CHONGYUN','호두':'LIYUE_HUTAO','페이몬':'ENTITY_PAIMON','종려':'LIYUE_ZHONGLI','가명':'LIYUE_GAMING','북두':'LIYUE_BEIDOU'};
const songFace=who=>{const id=SONG_FACES[who];if(!id)return null;if(id!=='ENTITY_PAIMON')return faceSrc(id);try{return typeof portraitFor==='function'?portraitFor('ENTITY_PAIMON'):null;}catch{return null;}};
// the particle after the filling's name: 콩으로 · 깨로 · 밤을 (never 「콩로」 or 「콩를」)
const josaAfter=(w,p)=>{const s=String(w),c=s.charCodeAt(s.length-1),t=c>=0xac00&&c<=0xd7a3?(c-0xac00)%28:0;if(p==='로'||p==='으로')return t&&t!==8?'으로':'로';
 const pair={을:['을','를'],를:['을','를'],이:['이','가'],가:['이','가'],은:['은','는'],는:['은','는'],과:['과','와'],와:['과','와']}[p];return pair?pair[t?0:1]:p;};
const fillWords=(text,word)=>String(text).replace(/\{소\}(으로|로|을|를|이|가|은|는|과|와)?/g,(m,p)=>word+(p?josaAfter(word,p):''));
function songpyeon(job,opts){
 const S=K.song,R=S.rules,plan=S.plan(job.seed,job.day),orders=S.orders(job.seed),ui=shell(job,opts,opts.name||'송편 빚기'),ctx=ui.ctx,presses=[],fill=Array(R.count).fill(null),marks=[];
 const FILL=R.fillings,orderLines=talkSet('SONG_ORDER'),react={2:talkSet('SONG_PRETTY'),1:talkSet('SONG_OK'),0:talkSet('SONG_BURST')};
 const first=orderLines.length?job.seed%orderLines.length:0;
 const orderOf=i=>{const l=orderLines[(first+i)%Math.max(1,orderLines.length)];return l?{who:l.who,text:fillWords(l.text,FILL[orders[i]])}:{who:'',text:FILL[orders[i]]+' 송편!'};};
 let t0=0,k=0,start=R.start,raf=0,pop=null,score=0,said=null,shownI=-1,shownAt=0;const now=()=>performance.now()-t0;
 // what the hands did, for the drawing: each press (or time-out) and the finished songpyeon on their way to the steamer
 const acts=[],flights=[];
 const qOf=i=>{const sum=marks.slice(i*3,i*3+3).reduce((n,m)=>n+(m===2?100:m===1?60:0),0);return sum>=270?2:sum>=150?1:0;};
 const done=i=>{const q=qOf(i),ms=marks.slice(i*3,i*3+3);if(ms.length===3&&ms.every(m=>m===2))score+=R.pretty;
  const who=orderOf(i).who,set=react[q],l=set.find(x=>x.who===who)||set[(i+q)%Math.max(1,set.length)];if(l)said={...l,at:now(),i};flights.push({i,q,at:now()});};
 const press=f=>{if(!t0||ui.ended||k>=plan.length)return;const t=now();if(t<start)return;const s=plan[k],step=k%3,limit=start+3*s.period,at=Math.max(start,Math.round(t));
  if(step===1&&!(Number.isInteger(f)&&f>=0&&f<FILL.length))return;// 소 넣기 is the filling's bowl
  if(at>limit){timeout();return;}const pos=S.tri((at-start)/s.period),off=Math.abs(pos-s.zone);let m=off<=s.w*.45?2:off<=s.w?1:0;
  if(step===1){fill[Math.floor(k/3)]=f;if(f!==orders[Math.floor(k/3)])m=0;}
  presses.push(at);marks.push(m);score+=m===2?R.perfect:m===1?R.good:0;pop={m,at:t,wrong:step===1&&f!==orders[Math.floor(k/3)]};acts[k]={at:t,m,f:step===1?f:null};start=at+R.pause;k++;SND(m?'menu_open':'hit');if(k%3===0)done(k/3-1);};
 const timeout=()=>{const s=plan[k],limit=start+3*s.period;presses.push(null);marks.push(0);pop={m:0,at:now(),late:true};acts[k]={at:now(),m:0,miss:true,f:null};start=limit+R.pause;k++;if(k%3===0)done(k/3-1);};
 const go=btn('누르기',()=>press(),'primary fg-press'),bowls=mk('div','fg-bowls');FILL.forEach((n,i)=>bowls.append(btn((i+1)+' '+n,()=>press(i),'fg-bowl')));
 ui.bar.append(mk('span','fg-hint',touch()?'금빛 칸에서 누르기 · 소 넣기는 주문한 소의 그릇':'금빛 칸에서 스페이스 · 소 넣기는 주문한 소(1·2·3)'),bowls,go);
 const bg=ASSET('bg_place_liyue_harbor_pier.webp');
 // ---------- the table ----------
 const TABLE=244,CARD={x:92,w:96,h:124},LUMP={x:210,y:272},BOARD={x:332,y:302},GAUGE={x:200,y:170,w:276};
 const BOWLS=[0,1,2].map(i=>({x:62+i*60,y:350}));
 const STEAM={x:550,y:318,rx:74,ry:46},SLOT=i=>({x:STEAM.x-48+(i%4)*32,y:STEAM.y-11+Math.floor(i/4)*25});
 ui.on(ui.canvas,'pointerdown',e=>{e.preventDefault();if(k%3!==1){press();return;}const p=ui.pos(e);let best=-1,d=1e9;BOWLS.forEach((b,i)=>{const x=Math.hypot(p.x-b.x,(p.y-b.y)*1.4);if(x<d){d=x;best=i;}});if(d<40)press(best);});
 ui.on(document,'keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(k%3!==1)press();}else if(/^[1-3]$/.test(e.key)){e.preventDefault();if(k%3===1)press(Number(e.key)-1);}},true);
 const FILL_COLOR=['#2e2017','#c29e57','#d4973c'];
 // three doughs (흰 · 분홍 · 쑥), one per songpyeon in turn
 const DOUGH=[['#fffaf0','#e6d8bf'],['#ffe1e5','#e2b0b9'],['#e2eecb','#acc28a']];
 let seedN=job.seed%9973||7;const rnd=()=>(seedN=(seedN*16807)%2147483647)/2147483647;
 const GRAIN=Array.from({length:14},()=>({y:TABLE+8+rnd()*150,a:rnd()*TAU,amp:1+rnd()*3,w:.6+rnd()*1.2}));
 const SPECKS=Array.from({length:40},()=>[rnd()*2-1,rnd()*2-1,rnd()]);
 const NEEDLES=Array.from({length:70},()=>[rnd()*2-1,rnd()*2-1,rnd()*TAU]);
 const PAPER=ctx.createPattern(paper(),'repeat');
 // a heap of filling, with what it is made of: sesame seeds, beans, chestnut pieces
 function heap(x,y,rx,ry,f){
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,Math.PI,0);ctx.closePath();const g=ctx.createRadialGradient(x-rx*.3,y-ry*.9,1,x,y-ry*.3,rx*1.1);g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(.3,FILL_COLOR[f]);g.addColorStop(1,FILL_COLOR[f]);ctx.fillStyle=g;ctx.fill();ctx.clip();
  for(const [u,v,w] of SPECKS){const px=x+u*rx,py=y-Math.abs(v)*ry;
   if(f===0){ctx.fillStyle=w>.5?'rgba(240,226,190,.85)':'rgba(20,12,6,.8)';ctx.beginPath();ctx.ellipse(px,py,1.4,.8,u*2,0,TAU);ctx.fill();}
   else if(f===1){ctx.fillStyle=w>.6?'#d8c28c':'#9c8350';ctx.beginPath();ctx.ellipse(px,py,2.6,1.8,u,0,TAU);ctx.fill();ctx.strokeStyle='rgba(80,60,30,.35)';ctx.lineWidth=.6;ctx.stroke();}
   else if(w>.35){ctx.fillStyle=w>.7?'#eec276':'#7c4a22';ctx.beginPath();ctx.moveTo(px-2.5,py);ctx.lineTo(px,py-2.2);ctx.lineTo(px+2.8,py-.4);ctx.lineTo(px+.6,py+2);ctx.closePath();ctx.fill();}}
  ctx.restore();}
 // a celadon bowl of filling on the table, its key and name under it
 function bowlAt(b,f,lit){
  ctx.save();if(lit){ctx.shadowColor='rgba(255,214,120,.95)';ctx.shadowBlur=18;}ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(b.x,b.y+14,30,8,0,0,TAU);ctx.fill();ctx.restore();
  heap(b.x,b.y-4,22,13,f);
  const g=ctx.createLinearGradient(0,b.y-6,0,b.y+16);g.addColorStop(0,'#c7dfcf');g.addColorStop(1,'#6e937f');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(b.x-28,b.y-4);ctx.quadraticCurveTo(b.x-26,b.y+18,b.x,b.y+18);ctx.quadraticCurveTo(b.x+26,b.y+18,b.x+28,b.y-4);ctx.closePath();ctx.fill();
  ctx.strokeStyle=lit?'rgba(255,226,150,.95)':'rgba(255,255,255,.55)';ctx.lineWidth=lit?2.5:1.5;ctx.beginPath();ctx.ellipse(b.x,b.y-4,28,6,0,0,TAU);ctx.stroke();
  ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const label=(f+1)+' '+FILL[f],w=ctx.measureText(label).width+14;
  rrect(ctx,b.x-w/2,b.y+24,w,18,6);ctx.fillStyle=lit?'#f3cf82':'rgba(20,14,10,.7)';ctx.fill();ctx.fillStyle=lit?'#2a1d10':'#f6e9cf';ctx.fillText(label,b.x,b.y+33);
 }
 // the dough on its cloth (it gets smaller with every piece taken)
 function lump(cur,glow){
  const x=LUMP.x,y=LUMP.y,s=1-cur*.045,[lt,dk]=DOUGH[cur%3];
  ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+14,38,9,0,0,TAU);ctx.fill();
  ctx.fillStyle='#f4efe4';ctx.beginPath();ctx.moveTo(x-38,y+12);ctx.quadraticCurveTo(x-30,y+2,x-14,y+6);ctx.quadraticCurveTo(x+8,y,x+36,y+8);ctx.quadraticCurveTo(x+40,y+16,x+30,y+20);ctx.quadraticCurveTo(x,y+24,x-34,y+20);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(160,150,130,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-20,y+16);ctx.quadraticCurveTo(x-6,y+12,x+12,y+17);ctx.stroke();
  if(glow){ctx.shadowColor='rgba(255,226,150,.9)';ctx.shadowBlur=14;}
  const g=ctx.createRadialGradient(x-8*s,y-14*s,2,x,y-4*s,30*s);g.addColorStop(0,lt);g.addColorStop(1,dk);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-26*s,y+8);ctx.bezierCurveTo(x-28*s,y-14*s,x-6*s,y-22*s,x+4*s,y-18*s);ctx.bezierCurveTo(x+22*s,y-20*s,x+30*s,y-4*s,x+26*s,y+8);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(x-9*s,y-11*s,7*s,3*s,-.4,0,TAU);ctx.fill();ctx.restore();
 }
 // a piece in the hands: a ball (pinched off), a cup (pressed), a filled cup, a half moon (folded); a poor press shows on it
 function ball(x,y,r,dough,m){const [lt,dk]=DOUGH[dough%3];ctx.save();ctx.translate(x,y);if(m===0)ctx.rotate(.25);ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,r*.8,r*.9,r*.22,0,0,TAU);ctx.fill();
  const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r*1.1);g.addColorStop(0,lt);g.addColorStop(1,dk);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,m===0?r*1.15:r,m===0?r*.72:r*.9,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-r*.35,-r*.38,r*.25,r*.12,-.5,0,TAU);ctx.fill();ctx.restore();}
 function cup(x,y,r,dough,f,m){const [lt,dk]=DOUGH[dough%3];ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,r*.5,r*1.3,r*.25,0,0,TAU);ctx.fill();
  const g=ctx.createRadialGradient(-r*.4,-r*.3,r*.1,0,0,r*1.4);g.addColorStop(0,lt);g.addColorStop(1,dk);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r*1.28,r*.66,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-1,r*1.2,r*.6,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
  const h=ctx.createRadialGradient(0,r*.05,1,0,0,r*.9);h.addColorStop(0,'rgba(120,90,60,.35)');h.addColorStop(1,'rgba(120,90,60,0)');ctx.fillStyle=h;ctx.beginPath();ctx.ellipse(0,-r*.02,r*.82,r*.38,0,0,TAU);ctx.fill();
  ctx.restore();if(f!==null&&f!==undefined){ctx.fillStyle='rgba(60,40,20,.28)';ctx.beginPath();ctx.ellipse(x,y+r*.16,r*.74,r*.2,0,0,TAU);ctx.fill();heap(x,y+r*.16,r*.7,r*.52,f);}if(m===0){ctx.strokeStyle='rgba(120,90,60,.6)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x+r*.9,y-r*.2);ctx.lineTo(x+r*1.05,y+r*.1);ctx.stroke();}}
 function moon(x,y,r,dough,q,f){// the folded songpyeon (cracked with the filling showing when poorly made, sparkling when pretty)
  const [lt,dk]=DOUGH[dough%3];ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,r*.5,r*.95,r*.2,0,0,TAU);ctx.fill();
  const g=ctx.createRadialGradient(-r*.3,-r*.45,r*.1,0,-r*.1,r*1.15);g.addColorStop(0,lt);g.addColorStop(1,dk);ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(-r,r*.3);ctx.bezierCurveTo(-r*.95,-r*.55,-r*.45,-r*.95,0,-r*.95);ctx.bezierCurveTo(r*.45,-r*.95,r*.95,-r*.55,r,r*.3);ctx.quadraticCurveTo(0,r*.6,-r,r*.3);ctx.closePath();ctx.fill();
  // the pinched seam along the top
  ctx.strokeStyle='rgba(140,110,80,.45)';ctx.lineWidth=Math.max(1,r*.05);for(let i=-4;i<=4;i++){const a=Math.PI*(.5+i*.1),sx=Math.cos(a)*r*.86,sy=-Math.sin(a)*r*.86+r*.08;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx*.88,sy*.88+r*.08);ctx.stroke();}
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-r*.38,-r*.42,r*.24,r*.09,-.6,0,TAU);ctx.fill();
  if(q===0){ctx.fillStyle=FILL_COLOR[f??0];ctx.beginPath();ctx.moveTo(-r*.25,-r*.35);ctx.lineTo(-r*.05,r*.05);ctx.lineTo(r*.2,-r*.28);ctx.lineTo(r*.02,-r*.1);ctx.closePath();ctx.fill();ctx.strokeStyle='#6b4a2b';ctx.lineWidth=Math.max(1.2,r*.06);ctx.beginPath();ctx.moveTo(-r*.28,-r*.38);ctx.lineTo(-r*.05,r*.05);ctx.lineTo(r*.22,-r*.3);ctx.stroke();}
  if(q===2){ctx.fillStyle='rgba(255,236,170,.95)';for(const [sx,sy,ss] of [[-r*.8,-r*.75,1],[r*.82,-r*.6,.8],[r*.15,-r*1.12,.9]]){const z=r*.12*ss;ctx.beginPath();ctx.moveTo(sx,sy-z);ctx.lineTo(sx+z*.3,sy-z*.3);ctx.lineTo(sx+z,sy);ctx.lineTo(sx+z*.3,sy+z*.3);ctx.lineTo(sx,sy+z);ctx.lineTo(sx-z*.3,sy+z*.3);ctx.lineTo(sx-z,sy);ctx.lineTo(sx-z*.3,sy-z*.3);ctx.closePath();ctx.fill();}}
  ctx.restore();}
 // the bamboo steamer, lined with pine needles
 function steamer(t,full){
  const {x,y,rx,ry}=STEAM;ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+20,rx+6,ry*.55,0,0,TAU);ctx.fill();
  const side=ctx.createLinearGradient(0,y,0,y+22);side.addColorStop(0,'#c9a46a');side.addColorStop(1,'#8a6a3c');ctx.fillStyle=side;ctx.beginPath();ctx.ellipse(x,y+14,rx,ry,0,0,Math.PI);ctx.lineTo(x-rx,y);ctx.ellipse(x,y,rx,ry,0,Math.PI,0,true);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(90,60,30,.5)';ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.ellipse(x,y+i*4,rx,ry,0,.05,Math.PI-.05);ctx.stroke();}
  ctx.fillStyle='#e2c58c';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.fillStyle='#4f6a34';ctx.beginPath();ctx.ellipse(x,y+1,rx-7,ry-5,0,0,TAU);ctx.fill();
  ctx.save();ctx.beginPath();ctx.ellipse(x,y+1,rx-7,ry-5,0,0,TAU);ctx.clip();for(const [u,v,a] of NEEDLES){const px=x+u*(rx-8),py=y+v*(ry-6);ctx.strokeStyle=a>3?'#7fa356':'#5f8a3c';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(a)*9,py+Math.sin(a)*4);ctx.stroke();}ctx.restore();
  ctx.strokeStyle='#a9844e';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,rx-3,ry-2,0,0,TAU);ctx.stroke();ctx.restore();
  if(full){ctx.save();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=5;ctx.lineCap='round';for(let i=0;i<3;i++){const sx=x-30+i*30,ph=(t/1400+i*.37)%1;ctx.globalAlpha=Math.sin(ph*Math.PI)*.9;ctx.beginPath();ctx.moveTo(sx,y-10-ph*40);ctx.bezierCurveTo(sx+10,y-24-ph*40,sx-10,y-38-ph*40,sx+4,y-52-ph*40);ctx.stroke();}ctx.restore();}
 }
 // lanterns on a rope across the top left
 function lanterns(t){
  ctx.save();ctx.strokeStyle='rgba(60,30,20,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10,4);ctx.quadraticCurveTo(110,30,250,2);ctx.stroke();
  for(const [u,n] of [[.15,0],[.4,1],[.62,2]]){const px=(1-u)*(1-u)*-10+2*(1-u)*u*110+u*u*250,py=(1-u)*(1-u)*4+2*(1-u)*u*30+u*u*2;ctx.save();ctx.translate(px,py);ctx.rotate(Math.sin(t/900+n*1.7)*.07);
   const glow=ctx.createRadialGradient(0,22,2,0,22,34);glow.addColorStop(0,'rgba(255,150,70,.35)');glow.addColorStop(1,'rgba(255,150,70,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,22,34,0,TAU);ctx.fill();
   ctx.strokeStyle='rgba(60,30,20,.8)';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,8);ctx.stroke();
   const body=ctx.createRadialGradient(-3,18,2,0,22,16);body.addColorStop(0,'#ff9a5c');body.addColorStop(.5,'#e0452e');body.addColorStop(1,'#8f2016');ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,22,11,14,0,0,TAU);ctx.fill();
   ctx.strokeStyle='rgba(120,30,20,.6)';ctx.lineWidth=1;for(const dx of [-5,0,5]){ctx.beginPath();ctx.ellipse(0,22,Math.abs(dx)+.5,14,0,0,TAU);ctx.stroke();}
   ctx.fillStyle='#e9c46a';ctx.fillRect(-6,7,12,4);ctx.fillRect(-6,34,12,4);ctx.strokeStyle='#e9c46a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,38);ctx.lineTo(0,48);ctx.stroke();ctx.restore();}
  ctx.restore();}
 // the gauge: a strip of 한지 between two wooden rollers; the gold band is 「좋아요」, its bright middle 「완벽」
 function gauge(t){
  const {x,y,w}=GAUGE;ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';rrect(ctx,x-2,y-11,w+4,28,4);ctx.fill();ctx.fillStyle=PAPER;ctx.fillRect(x,y-13,w,26);ctx.strokeStyle='rgba(120,80,40,.45)';ctx.lineWidth=1;ctx.strokeRect(x,y-13,w,26);
  for(const ex of [x-8,x+w-4]){const g=ctx.createLinearGradient(ex,0,ex+12,0);g.addColorStop(0,'#5a3519');g.addColorStop(.5,'#b07a45');g.addColorStop(1,'#5a3519');ctx.fillStyle=g;rrect(ctx,ex,y-19,12,38,5);ctx.fill();}
  if(k<plan.length){const s=plan[k];ctx.fillStyle='rgba(232,170,60,.42)';ctx.fillRect(x+(s.zone-s.w)*w,y-13,s.w*2*w,26);ctx.save();ctx.shadowColor='rgba(255,200,90,.9)';ctx.shadowBlur=10;ctx.fillStyle='rgba(255,214,110,.95)';ctx.fillRect(x+(s.zone-s.w*.45)*w,y-13,s.w*.9*w,26);ctx.restore();
   ctx.fillStyle='rgba(150,60,20,.7)';ctx.fillRect(x+s.zone*w-1,y-13,2,26);
   const live=t0&&t>=start,pos=live?S.tri((t-start)/s.period):0,mx=x+pos*w;
   ctx.save();if(live){ctx.shadowColor='rgba(255,255,255,.9)';ctx.shadowBlur=8;}ctx.fillStyle=live?'#2a1d10':'rgba(42,29,16,.35)';ctx.beginPath();ctx.moveTo(mx,y-14);ctx.lineTo(mx-8,y-26);ctx.lineTo(mx+8,y-26);ctx.closePath();ctx.fill();ctx.fillRect(mx-1.5,y-14,3,28);ctx.restore();}
  ctx.restore();}
 function chips(step){const names=STEPS,x0=W/2-140;ctx.save();ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  names.forEach((n,i)=>{const x=x0+i*96,on=i===step,past=i<step;rrect(ctx,x,10,88,26,13);ctx.fillStyle=on?'#f3cf82':past?'rgba(243,207,130,.25)':'rgba(10,12,22,.65)';ctx.fill();ctx.strokeStyle=on?'#fff3cf':'rgba(243,207,130,.55)';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle=on?'#2a1d10':past?'#f3cf82':'#f6e9cf';ctx.fillText((past?'✓ ':(i+1)+' ')+n,x+44,23);
   if(i<2){ctx.fillStyle='rgba(243,207,130,.6)';ctx.beginPath();ctx.moveTo(x+90,20);ctx.lineTo(x+95,23);ctx.lineTo(x+90,26);ctx.closePath();ctx.fill();}});ctx.restore();}
 const arc=(a,b,u,hgt)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u-Math.sin(Math.PI*u)*hgt});
 function frame(){
  if(!ui.alive)return;const t=t0?now():0;if(t0&&!ui.ended&&k<plan.length&&t>start+3*plan[k].period)timeout();
  const step=k%3,cur=Math.min(R.count-1,Math.floor(k/3)),making=k<plan.length;bowls.hidden=!(making&&step===1);go.hidden=!making||step===1;
  ui.score(score);ui.time(Math.min(R.count,Math.floor(k/3)+1)+' / '+R.count+'개');
  ctx.clearRect(0,0,W,H);const b=pic(bg);if(b)cover(ctx,b,0,0,W,H,.5,.6);else{ctx.fillStyle='#1a2140';ctx.fillRect(0,0,W,H);}
  const night=ctx.createLinearGradient(0,0,0,H);night.addColorStop(0,'rgba(10,16,44,.72)');night.addColorStop(1,'rgba(22,16,24,.6)');ctx.fillStyle=night;ctx.fillRect(0,0,W,H);
  // the full moon grows brighter with the score
  const glow=clamp(score/2400,0,1),mx=568,my=64,halo=ctx.createRadialGradient(mx,my,26,mx,my,80+glow*40);halo.addColorStop(0,'rgba(255,236,170,'+(.3+.35*glow)+')');halo.addColorStop(1,'rgba(255,236,170,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(mx,my,80+glow*40,0,TAU);ctx.fill();
  sphere(ctx,mx,my,32,'#fffbe8','#efd28a');ctx.fillStyle='rgba(200,170,110,.25)';for(const [cx,cy,cr] of [[-10,-8,6],[10,8,8],[-3,16,4],[12,-12,3.5]]){ctx.beginPath();ctx.arc(mx+cx,my+cy,cr,0,TAU);ctx.fill();}
  lanterns(t);if(making)chips(step);
  // the one who ordered (and, once it is made, says what they think), sliding in for each songpyeon
  const reacting=said&&t-said.at<1500,ci=reacting?said.i:cur;if(ci!==shownI){shownI=ci;shownAt=t;}
  const slide=ease((t-shownAt)/320),o=orderOf(ci),cx=CARD.x-(1-slide)*150;
  ctx.save();ctx.globalAlpha=slide;card(ctx,songFace(o.who),cx,TABLE+6,CARD.w,CARD.h);
  ctx.fillStyle='rgba(10,8,6,.72)';rrect(ctx,cx-CARD.w/2+4,TABLE-24,CARD.w-8,20,5);ctx.fill();ctx.fillStyle='#f3cf82';ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.who||'손님',cx,TABLE-14);ctx.restore();
  if(slide>.6&&(reacting||making))bubble(ctx,cx+6,TABLE-CARD.h-4,'',reacting?said.text:o.text,clamp((slide-.6)/.4,0,1),210);
  // the table
  const wood=ctx.createLinearGradient(0,TABLE,0,H);wood.addColorStop(0,'#8c5c34');wood.addColorStop(1,'#4c2c14');ctx.fillStyle=wood;ctx.fillRect(0,TABLE,W,H-TABLE);
  ctx.strokeStyle='rgba(40,20,8,.28)';for(const g of GRAIN){ctx.lineWidth=g.w;ctx.beginPath();for(let x=0;x<=W;x+=16){const y=g.y+Math.sin(x/70+g.a)*g.amp;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
  ctx.fillStyle='#c48d58';ctx.fillRect(0,TABLE,W,3);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,TABLE+3,W,4);
  // the wooden board (안반)
  ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.moveTo(BOARD.x-92,BOARD.y+42);ctx.lineTo(BOARD.x+92,BOARD.y+42);ctx.lineTo(BOARD.x+84,BOARD.y+48);ctx.lineTo(BOARD.x-84,BOARD.y+48);ctx.closePath();ctx.fill();
  const bd=ctx.createLinearGradient(0,BOARD.y-32,0,BOARD.y+40);bd.addColorStop(0,'#e2b47a');bd.addColorStop(1,'#b6824a');ctx.fillStyle=bd;ctx.beginPath();ctx.moveTo(BOARD.x-72,BOARD.y-32);ctx.lineTo(BOARD.x+72,BOARD.y-32);ctx.lineTo(BOARD.x+88,BOARD.y+40);ctx.lineTo(BOARD.x-88,BOARD.y+40);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(110,70,30,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='rgba(255,240,210,.18)';ctx.fillRect(BOARD.x-70,BOARD.y-30,140,3);ctx.restore();
  lump(Math.min(cur,R.count-1),making&&step===0&&t>=start);
  FILL.forEach((n,i)=>bowlAt(BOWLS[i],i,making&&step===1&&t>=start));
  steamer(t,flights.some(f=>t-f.at>750));
  // the steamer's places: made songpyeon in them, the ones still to make as faint shapes
  for(let i=0;i<R.count;i++){const p=SLOT(i),fl=flights.find(f=>f.i===i);if(fl&&t-fl.at>750)moon(p.x,p.y,12,i,fl.q,fill[i]);else if(!fl){ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='rgba(20,40,10,.5)';ctx.beginPath();ctx.ellipse(p.x,p.y+5,12,4,0,0,TAU);ctx.fill();ctx.setLineDash([3,3]);ctx.strokeStyle='#f4ecd6';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y+3,10,Math.PI,0);ctx.closePath();ctx.stroke();ctx.restore();}}
  // the one in the hands
  if(making){const a0=acts[cur*3],a1=acts[cur*3+1],at=BOARD;const dough=cur;
   if(!a0){ctx.save();ctx.globalAlpha=.35;ctx.setLineDash([5,5]);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(at.x,at.y-4,42,26,0,0,TAU);ctx.stroke();ctx.restore();}
   else if(!a1){const u=(t-a0.at)/260;if(u<1){const p=arc({x:LUMP.x,y:LUMP.y-6},{x:at.x,y:at.y-8},ease(u),46);ball(p.x,p.y,22+u*14,dough,a0.m);}else{const v=clamp((t-a0.at-260)/200,0,1);if(v<1)ball(at.x,at.y-8+v*4,36,dough,a0.m);else cup(at.x,at.y-4,36,dough,null,a0.m);}}
   else{const u=(t-a1.at)/300;cup(at.x,at.y-4,36,dough,u>=1?a1.f:null,acts[cur*3].m);if(u<1&&a1.f!==null){const p=arc({x:BOWLS[a1.f].x,y:BOWLS[a1.f].y-10},{x:at.x,y:at.y-4},ease(u),70);heap(p.x,p.y,16,11,a1.f);}}}
  // a finished one: folded on the board, then set in the steamer
  for(const f of flights){const d=t-f.at;if(d>750)continue;const s=SLOT(f.i);if(d<250){const v=ease(d/200);ctx.save();ctx.globalAlpha=1-v;cup(BOARD.x,BOARD.y-4,36,f.i,fill[f.i],1);ctx.restore();ctx.save();ctx.globalAlpha=v;moon(BOARD.x,BOARD.y-6,36+v*4,f.i,f.q,fill[f.i]);ctx.restore();}
   else{const u=ease((d-250)/500),p=arc({x:BOARD.x,y:BOARD.y-6},s,u,70);moon(p.x,p.y,40-u*28,f.i,f.q,fill[f.i]);}}
  gauge(t);
  if(pop&&t-pop.at<700){const a=1-(t-pop.at)/700;ctx.save();ctx.globalAlpha=a;ctx.font='800 26px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='rgba(20,12,6,.8)';
   const word=pop.wrong?'주문이랑 달라!':pop.late?'늦었어요':pop.m===2?'완벽!':pop.m===1?'좋아요':'아쉬워요';ctx.strokeText(word,GAUGE.x+GAUGE.w/2,GAUGE.y-46-(t-pop.at)*.025);ctx.fillStyle=pop.m===2?'#ffd666':pop.m===1?'#bfe6ff':'#ff9a86';ctx.fillText(word,GAUGE.x+GAUGE.w/2,GAUGE.y-46-(t-pop.at)*.025);ctx.restore();}
  const last=flights.length===R.count?flights[R.count-1].at:null;
  if(t0&&!making&&!ui.ended&&last!==null&&t>=last+900)ui.send({p:presses.slice(),f:fill.slice()},o=>'예쁜 송편 '+(o.detail?.pretty?.filter(x=>x===2).length??0)+'개 · 점수 '+fmt(o.score),o=>[['예쁜 송편',(o.detail?.pretty?.filter(x=>x===2).length||0)+'개'],['보통',(o.detail?.pretty?.filter(x=>x===1).length||0)+'개'],['터진 송편',(o.detail?.pretty?.filter(x=>x===0).length||0)+'개']]);
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();countdown(ui,()=>{t0=performance.now();});
}
window.CRPGFestGames={play(job,opts={}){if(!job||!K)return;if(job.game==='SNOWBALL')return snowball(job,opts);if(job.game==='YUT')return yut(job,opts);if(job.game==='SONGPYEON')return songpyeon(job,opts);}};
})();
