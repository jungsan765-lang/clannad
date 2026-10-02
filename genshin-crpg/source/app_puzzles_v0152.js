/* 0.15.2 퍼즐 화면 (runtime_puzzles_v0152.js; user: 「퍼즐도 종류를 좀 확 늘려서 재미를 붙이게 해줘. 한 수십가지 있어도 좋을 것
 * 같아」). Twenty-three games join the five of the treasure chests in the chest window (app_chests_v01415.js); the chests
 * and the regional events both use them. Each screen keeps the moves, checks them with the rule the server uses, and hands
 * the answer on once the puzzle is solved. Mond boards are gentle, Liyue boards bigger or trickier.
 * Load after app_chests_v01415.js. */
(function(){
'use strict';
const C=window.CRPGChests,SHELL=window.CRPGShell,R=window.CRPGRuntime?.chestRules,PZ=R?.puzzleV0152;
if(!C?.games||!SHELL||!PZ)return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','ch-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const cell=(cls,label,fn)=>{const b=mk('button',cls);b.type='button';if(label)b.setAttribute('aria-label',label);if(fn)b.onclick=fn;return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const NS='http://www.w3.org/2000/svg';
const svgEl=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const note=(body,text,cls='')=>C.note(body,text,cls);
const tools=(...kids)=>{const r=mk('div','ch-tools');r.append(...kids.filter(Boolean));return r;};
const open=()=>!!C.node;
const later=(fn,ms)=>setTimeout(()=>{if(open())fn();},ms);
const range=n=>[...Array(n).keys()];
const hard=p=>p.region==='LIYUE';
const solvedOf=el=>el.classList.contains('solved');
const shake=el=>{el.classList.remove('pz-shake');void el.offsetWidth;el.classList.add('pz-shake');};
const status=(body,text='')=>{const s=mk('p','ch-count pz-status',text);s.setAttribute('aria-live','polite');body.append(s);return s;};
function itemImg(id,cls=''){const p=MAN().itemIcons?.icons?.[id]?.path;if(!p)return mk('span','pz-item fallback '+cls,'◆');const i=mk('img','pz-item '+cls);i.src=p;i.alt='';i.draggable=false;return i;}
// ---------- elements: colour orbs with a small sign (the game has no element pictures) ----------
const EL=PZ.elements,KEY=['pyro','hydro','cryo','electro','anemo','geo','dendro'];
const GLYPH={
 pyro:['M12 2.5c.9 3.4 5.2 5.4 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.5 1.3-4 2.5-5.2.3 1.7 1 2.7 2.2 3.1 0-3.2.1-5.6.5-8.1z','fill'],
 hydro:['M12 3s6.2 7 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 10 12 3 12 3z','fill'],
 cryo:['M12 2.5v19 M3.8 7.2l16.4 9.6 M3.8 16.8l16.4-9.6 M9.4 3.8L12 6.4l2.6-2.6 M9.4 20.2L12 17.6l2.6 2.6','line'],
 electro:['M13.5 2L5 13.5h6.2L10 22l9-12.2h-6.4z','fill'],
 anemo:['M3.5 9.5h11a3 3 0 1 0-3-3 M3.5 13.5h14a3 3 0 1 1-3 3 M3.5 17.5h6','line'],
 geo:['M12 2.5l7.5 9.5-7.5 9.5-7.5-9.5z M12 2.5v19 M4.5 12h15','both'],
 dendro:['M5 19.5c0-8.5 5.2-14.2 15-15-.8 9.8-6.5 15-15 15z M5 19.5l8.5-8.5','both']
};
function glyph(k){const [d,mode]=GLYPH[k]||GLYPH.geo,s=svgEl('svg',{viewBox:'0 0 24 24','aria-hidden':'true',class:'pz-glyph '+mode});s.append(svgEl('path',{d}));return s;}
function orb(i,cls=''){const k=KEY[i]||'geo',o=mk('span','pz-orb el-'+k+(cls?' '+cls:''));o.append(glyph(k));return o;}
// A piece of the place picture on a square tile (the picture is about 16:10 and is cropped at the sides).
function piece(face,src,i,n){
 if(!src){face.classList.add('noimg');return;}
 const x=i%n,y=Math.floor(i/n),A=1.6;face.style.backgroundImage='url("'+src+'")';face.style.backgroundSize=(A*n*100)+'% '+(n*100)+'%';
 face.style.backgroundPosition=((x+(A-1)*n/2)/(A*n-1)*100)+'% '+(n>1?y/(n-1)*100:0)+'%';
}
// ---------- 그림 돌리기 ----------
C.games.ROTATE=function(p,body,done){
 const src=C.placeImage(),n=p.n,rot=p.rot.slice(),angle=rot.map(r=>r*90),moves=[];
 note(body,'조각을 누를 때마다 시계 방향으로 90°씩 돕니다. 모든 조각을 바로 세워 그림을 완성하세요.'+(hard(p)?' 막히면 「방향 표시」로 조각의 위쪽을 볼 수 있습니다.':' 조각의 ▲가 위를 향하면 바로 선 것입니다.'));
 const grid=mk('div','ch-game pz-rotate'+(hard(p)?'':' guided'));grid.style.setProperty('--n',n);body.append(grid);
 const draw=i=>{const b=tiles[i];b.firstChild.style.transform='rotate('+angle[i]+'deg)';b.classList.toggle('home',rot[i]===0);};
 const tiles=rot.map((r,i)=>{const b=cell('pz-rot',(i+1)+'번 조각'),face=mk('span','pz-rot-face');piece(face,src,i,n);face.append(mk('span','pz-rot-mark','▲'));b.append(face);
  b.onclick=()=>{if(solvedOf(grid))return;rot[i]=(rot[i]+1)%4;angle[i]+=90;moves.push(i);SND('puzzle_step');draw(i);if(rot.every(v=>v===0))done(moves.slice());};
  grid.append(b);return b;});
 tiles.forEach((b,i)=>draw(i));
 C.preview(src,body);
 if(hard(p))body.append(tools(btn('방향 표시',()=>grid.classList.toggle('guided'),'ch-hint')));
};
// ---------- 원소 회로 잇기 ----------
const PIPE_D={1:'M50 50V-2',2:'M50 50H102',4:'M50 50V102',8:'M50 50H-2'};
const SIDES=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
function pipeSvg(mask){const s=svgEl('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'pz-pipe-svg'});for(const bit of [1,2,4,8])if(mask&bit)s.append(svgEl('path',{d:PIPE_D[bit]}));s.append(svgEl('circle',{cx:50,cy:50,r:13}));return s;}
C.games.PIPES=function(p,body,done){
 const n=p.n,masks=p.masks.slice(),angle=masks.map(()=>0),moves=[],turn=PZ.pipes.turn;
 note(body,'관을 누르면 시계 방향으로 돕니다. 왼쪽 원소 결정에서 오른쪽 결정까지 원소가 흐르도록 관을 이으세요.');
 const wrap=mk('div','ch-game pz-pipes');wrap.style.setProperty('--n',n);const board=mk('div','pz-pipe-board');wrap.append(board);
 const end=(cls,row)=>{const e=mk('span','pz-pipe-end '+cls);e.style.top=((row+.5)/n*100)+'%';e.append(orb(cls==='in'?4:5));wrap.append(e);return e;};
 const inMark=end('in',p.src),outMark=end('out',p.dst);body.append(wrap);
 const flow=()=>{const on=new Set(),s=p.src*n;if(!(masks[s]&8))return on;const q=[s];on.add(s);
  while(q.length){const c=q.shift(),y=Math.floor(c/n),x=c%n;for(const [dy,dx,bit,opp] of SIDES){if(!(masks[c]&bit))continue;const ny=y+dy,nx=x+dx,k=ny*n+nx;if(ny<0||ny>=n||nx<0||nx>=n||on.has(k)||!(masks[k]&opp))continue;on.add(k);q.push(k);}}return on;};
 const draw=()=>{const on=flow(),last=p.dst*n+n-1;tiles.forEach((b,i)=>{b.firstChild.style.transform='rotate('+angle[i]+'deg)';b.classList.toggle('on',on.has(i));});inMark.classList.toggle('on',on.size>0);outMark.classList.toggle('on',on.has(last)&&!!(masks[last]&2));};
 const tiles=p.masks.map((m,i)=>{const b=cell('pz-pipe',(Math.floor(i/n)+1)+'행 '+(i%n+1)+'열 관');b.append(pipeSvg(m));
  b.onclick=()=>{if(solvedOf(wrap))return;masks[i]=turn(masks[i]);angle[i]+=90;moves.push(i);SND('puzzle_step');draw();if(PZ.pipes.flow({n,src:p.src,dst:p.dst,masks}))done(moves.slice());};board.append(b);return b;});
 draw();
 body.append(tools(btn('처음부터',()=>{if(solvedOf(wrap))return;masks.splice(0,masks.length,...p.masks);angle.fill(0);moves.length=0;draw();})));
};
// ---------- 빛의 거울 ----------
C.games.MIRRORS=function(p,body,done){
 const n=p.n,ms=p.mirrors.map(m=>({...m})),moves=[],F=n+2;
 note(body,'거울을 누르면 기울기가 바뀝니다 (／ ↔ ＼). 왼쪽 등불의 빛을 반짝이는 결정까지 보내세요.');
 const wrap=mk('div','ch-game pz-mirrors');wrap.style.setProperty('--f',F);
 const svg=svgEl('svg',{viewBox:'0 0 '+F+' '+F,class:'pz-mirror-svg','aria-hidden':'true'});
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)svg.append(svgEl('rect',{x:x+1.04,y:y+1.04,width:.92,height:.92,rx:.12,class:'pz-mirror-cell'}));
 const beam=svgEl('polyline',{class:'pz-beam',points:''}),glow=svgEl('polyline',{class:'pz-beam-glow',points:''});svg.append(glow,beam);
 const side=p.target[0],k=Number(p.target.slice(1)),tx=side==='N'||side==='S'?k+1.5:side==='W'?.5:n+1.5,ty=side==='W'||side==='E'?k+1.5:side==='N'?.5:n+1.5;
 svg.append(svgEl('circle',{cx:.5,cy:p.row+1.5,r:.32,class:'pz-lamp'}));
 const crystal=svgEl('path',{d:'M'+tx+' '+(ty-.38)+'L'+(tx+.28)+' '+ty+'L'+tx+' '+(ty+.38)+'L'+(tx-.28)+' '+ty+'z',class:'pz-crystal'});svg.append(crystal);
 const lines=new Map();for(const m of ms){const l=svgEl('line',{class:'pz-mirror'});svg.append(l);lines.set(m.i,l);}
 wrap.append(svg);body.append(wrap);
 const trace=()=>{const at=new Map(ms.map(m=>[m.i,m.s]));let y=p.row,x=0,dy=0,dx=1,exit='LOOP';const pts=[[.5,y+1.5]];
  for(let step=0;step<4*n*n+8;step++){pts.push([x+1.5,y+1.5]);if(y<0){exit='N'+x;break;}if(y>=n){exit='S'+x;break;}if(x<0){exit='W'+y;break;}if(x>=n){exit='E'+y;break;}
   const s=at.get(y*n+x);if(s!==undefined)[dy,dx]=s===0?[-dx,-dy]:[dx,dy];y+=dy;x+=dx;}
  return {pts,exit};};
 const draw=()=>{
  for(const m of ms){const x=m.i%n,y=Math.floor(m.i/n),l=lines.get(m.i),a=.2,b=.8;if(m.s===0){l.setAttribute('x1',x+1+a);l.setAttribute('y1',y+1+b);l.setAttribute('x2',x+1+b);l.setAttribute('y2',y+1+a);}else{l.setAttribute('x1',x+1+a);l.setAttribute('y1',y+1+a);l.setAttribute('x2',x+1+b);l.setAttribute('y2',y+1+b);}}
  const t=trace(),pts=t.pts.map(q=>q.join(',')).join(' ');beam.setAttribute('points',pts);glow.setAttribute('points',pts);crystal.classList.toggle('on',t.exit===p.target);return t.exit===p.target;};
 for(const m of ms){const x=m.i%n,y=Math.floor(m.i/n),b=cell('pz-mirror-btn',(y+1)+'행 '+(x+1)+'열 거울');b.style.left=((x+1)/F*100)+'%';b.style.top=((y+1)/F*100)+'%';
  b.onclick=()=>{if(solvedOf(wrap))return;m.s=1-m.s;moves.push(m.i);SND('puzzle_step');if(draw())done(moves.slice());};wrap.append(b);}
 draw();
};
// ---------- 그림 로직 ----------
C.games.NONOGRAM=function(p,body,done){
 const n=p.n,a=Array(n*n).fill(0),cross=new Set();let mode='fill';
 note(body,'줄 옆의 숫자는 그 줄에서 이어 칠할 칸의 수입니다. 「2 1」이면 두 칸을 칠하고 한 칸 이상 띄운 뒤 한 칸을 칠합니다. 모든 줄의 숫자에 맞게 칠하세요.');
 const wrap=mk('div','ch-game pz-nono');wrap.style.setProperty('--n',n);
 const clue=(list,cls)=>{const d=mk('div','pz-nono-clue '+cls);for(const v of list)d.append(mk('span','',v));return d;};
 wrap.append(mk('div','pz-nono-corner'));const colClues=p.cols.map(c=>{const d=clue(c,'col');wrap.append(d);return d;}),rowClues=[],cells=[];
 for(let y=0;y<n;y++){const rc=clue(p.rows[y],'row');rowClues.push(rc);wrap.append(rc);for(let x=0;x<n;x++){const i=y*n+x,b=cell('pz-nono-cell',(y+1)+'행 '+(x+1)+'열',()=>tap(i));if(x%5===4&&x<n-1)b.classList.add('edge-r');if(y%5===4&&y<n-1)b.classList.add('edge-b');cells.push(b);wrap.append(b);}}
 body.append(wrap);
 const eq=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
 const draw=()=>{cells.forEach((b,i)=>{b.classList.toggle('on',a[i]===1);b.classList.toggle('x',cross.has(i));});
  let all=true;for(let y=0;y<n;y++){const ok=eq(PZ.runs(a.slice(y*n,y*n+n)),p.rows[y]);rowClues[y].classList.toggle('ok',ok);all=all&&ok;}
  for(let x=0;x<n;x++){const ok=eq(PZ.runs(range(n).map(y=>a[y*n+x])),p.cols[x]);colClues[x].classList.toggle('ok',ok);all=all&&ok;}
  return all;};
 const tap=i=>{if(solvedOf(wrap))return;if(mode==='fill'){a[i]=a[i]?0:1;cross.delete(i);}else{if(cross.has(i))cross.delete(i);else{cross.add(i);a[i]=0;}}SND('puzzle_step');if(draw())done(a.slice());};
 const fill=btn('칠하기',()=>setMode('fill'),'pz-mode on'),mark=btn('✕ 표시',()=>setMode('x'),'pz-mode');
 const setMode=m=>{mode=m;fill.classList.toggle('on',m==='fill');mark.classList.toggle('on',m==='x');};
 body.append(tools(fill,mark,btn('처음부터',()=>{if(solvedOf(wrap))return;a.fill(0);cross.clear();draw();})));
 draw();
};
// ---------- 거울 무늬 ----------
C.games.SYMMETRY=function(p,body,done){
 const {h,m}=p,right=p.right.slice();
 note(body,'가운데 거울선을 사이에 두고, 오른쪽 무늬가 왼쪽 무늬를 거울에 비춘 모양이 되도록 칸을 켜고 끄세요.');
 const counter=status(body),wrap=mk('div','ch-game pz-sym');wrap.style.setProperty('--m',m);
 const L=mk('div','pz-sym-half left'),M=mk('div','pz-sym-mirror'),Rt=mk('div','pz-sym-half right');
 for(let i=0;i<h*m;i++)L.append(mk('span','pz-sym-cell'+(p.left[i]?' on':'')));
 const cells=right.map((v,i)=>{const b=cell('pz-sym-cell',(Math.floor(i/m)+1)+'행 '+(i%m+1)+'열',()=>{if(solvedOf(wrap))return;right[i]^=1;SND('puzzle_light');if(draw())done(right.slice());});Rt.append(b);return b;});
 wrap.append(L,M,Rt);body.append(wrap);
 const draw=()=>{cells.forEach((b,i)=>b.classList.toggle('on',right[i]===1));let rows=0;for(let y=0;y<h;y++)if(range(m).every(x=>right[y*m+x]===p.left[y*m+(m-1-x)]))rows++;counter.textContent='맞은 줄 '+rows+' / '+h;return R.check.SYMMETRY(p,right);};
 draw();
};
// ---------- 빛의 위치 기억 ----------
C.games.MEMGRID=function(p,body,done){
 const n=p.n,lit=new Set(p.lit),picked=new Set();let phase='wait';
 note(body,'잠깐 빛나는 칸들의 위치를 기억했다가, 빛이 꺼지면 같은 칸을 모두 누르세요. 틀리면 다시 보여 줍니다.');
 const counter=status(body,'곧 빛이 납니다…'),grid=mk('div','ch-game pz-mem');grid.style.setProperty('--n',n);
 const cells=range(n*n).map(i=>{const b=cell('pz-mem-cell',(i+1)+'번 칸',()=>tap(i));grid.append(b);return b;});body.append(grid);
 const show=()=>{if(phase==='done')return;phase='show';picked.clear();cells.forEach((b,i)=>{b.classList.remove('ok','bad');b.classList.toggle('lit',lit.has(i));});counter.textContent='기억하세요…';SND('puzzle_light');
  later(()=>{if(phase!=='show')return;cells.forEach(b=>b.classList.remove('lit'));phase='play';counter.textContent='빛났던 칸을 누르세요 · 0 / '+lit.size;},p.showMs);};
 const tap=i=>{if(phase!=='play'||solvedOf(grid)||picked.has(i))return;
  if(!lit.has(i)){cells[i].classList.add('bad');SND('error');phase='wait';counter.textContent='틀렸습니다. 다시 보여 드릴게요.';later(show,1100);return;}
  picked.add(i);cells[i].classList.add('ok');SND('puzzle_step');counter.textContent='빛났던 칸을 누르세요 · '+picked.size+' / '+lit.size;
  if(picked.size===lit.size){phase='done';done([...picked]);}};
 body.append(tools(btn('다시 보기',()=>{if(phase==='play'||phase==='wait')show();},'ch-hint')));
 later(show,700);
};
// ---------- 폭발 꽃 찾기 ----------
C.games.MINES=function(p,body,done){
 const n=p.n,bombs=new Set(p.bombs),lives0=hard(p)?2:3,st=Array(n*n).fill(0);let lives=lives0,flag=false,cool=false;// st: 0 hidden 1 open 2 flag 3 bloomed
 const around=i=>{const x=i%n,y=Math.floor(i/n),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if((dy||dx)&&yy>=0&&yy<n&&xx>=0&&xx<n)out.push(yy*n+xx);}return out;};
 const near=i=>around(i).filter(k=>bombs.has(k)).length;
 note(body,'숫자는 주변 8칸에 숨은 폭발 꽃의 수입니다. 폭발 꽃이 없는 칸을 모두 열면 풀립니다. 「깃발」로 의심 가는 칸에 표시하세요(PC는 오른쪽 클릭). 폭발 꽃을 열면 기회가 하나 줄고, 기회를 다 쓰면 처음부터 다시 엽니다.');
 const hearts=mk('p','ch-lives'),grid=mk('div','ch-game pz-mines');grid.style.setProperty('--n',n);body.append(hearts,grid);
 const drawLives=()=>hearts.replaceChildren(mk('span','','남은 기회'),...range(lives0).map(i=>mk('b',i<lives?'on':'off',i<lives?'♥':'♡')));
 const reveal=i=>{const q=[i];while(q.length){const c=q.pop();if(st[c]===1||bombs.has(c))continue;st[c]=1;if(!near(c))for(const k of around(c))if(st[k]===0)q.push(k);}};
 const cells=range(n*n).map(i=>{const b=cell('pz-mine',(Math.floor(i/n)+1)+'행 '+(i%n+1)+'열',()=>tap(i,false));b.oncontextmenu=e=>{e.preventDefault();tap(i,true);};grid.append(b);return b;});
 const draw=()=>{cells.forEach((b,i)=>{const s=st[i];b.className='pz-mine'+(s===1?' open n'+near(i):s===2?' flag':s===3?' bloom':'');b.textContent=s===1&&near(i)?String(near(i)):s===2?'⚑':s===3?'✿':'';});drawLives();};
 const won=()=>range(n*n).every(i=>bombs.has(i)||st[i]===1);
 const restart=()=>{st.fill(0);lives=lives0;reveal(p.start);draw();};
 const tap=(i,asFlag)=>{
  if(cool||solvedOf(grid)||st[i]===1||st[i]===3)return;
  if(asFlag||flag){st[i]=st[i]===2?0:2;SND('puzzle_step');draw();return;}
  if(st[i]===2)return;
  if(bombs.has(i)){st[i]=3;lives--;SND('error');draw();shake(hearts);
   if(lives<=0){cool=true;const warn=mk('div','ch-solved ch-reset','기회를 다 써서 처음부터 다시 엽니다');grid.append(warn);later(()=>{warn.remove();cool=false;restart();},1500);}
   else{cool=true;later(()=>{cool=false;},500);}return;}
  reveal(i);SND('puzzle_step');draw();if(won()){for(const b of bombs)if(st[b]!==3)st[b]=2;draw();done([...bombs].sort((a,b)=>a-b));}
 };
 const fb=btn('깃발 꽂기',()=>{flag=!flag;fb.classList.toggle('on',flag);fb.textContent=flag?'깃발 꽂는 중':'깃발 꽂기';},'pz-mode');
 body.append(tools(fb));
 restart();
};
// ---------- 원소 물들이기 ----------
const FLOOD_EL=[0,1,6,3,5];
C.games.FLOOD=function(p,body,done){
 const n=p.n;let g=p.grid.slice(),moves=[],cool=false;
 note(body,'왼쪽 위 칸에서 시작해, 같은 색으로 이어진 영역 전체가 고른 원소의 색으로 물듭니다. 정해진 횟수 안에 판 전체를 한 가지 색으로 만드세요. 칸을 눌러 그 색을 골라도 됩니다.');
 const counter=status(body),board=mk('div','ch-game pz-flood');board.style.setProperty('--n',n);
 const cells=g.map((c,i)=>{const b=cell('pz-flood-cell',null,()=>press(g[i]));b.tabIndex=-1;board.append(b);return b;});body.append(board);
 const pal=mk('div','pz-flood-pal');const keys=range(p.colors).map(c=>{const b=cell('pz-flood-key',EL[FLOOD_EL[c]]+' 원소',()=>press(c));b.append(orb(FLOOD_EL[c]));pal.append(b);return b;});body.append(pal);
 const draw=()=>{cells.forEach((b,i)=>{b.className='pz-flood-cell el-'+KEY[FLOOD_EL[g[i]]]+(i===0?' start':'');});keys.forEach((b,c)=>b.classList.toggle('now',c===g[0]));counter.textContent='남은 횟수 '+(p.limit-moves.length)+' / '+p.limit;};
 const press=c=>{
  if(cool||solvedOf(board)||c===g[0])return;g=PZ.floodStep(n,g,c);moves.push(c);SND('puzzle_step');draw();
  if(g.every(v=>v===g[0])){done(moves.slice());return;}
  if(moves.length>=p.limit){cool=true;SND('error');counter.textContent='횟수를 다 썼습니다. 처음부터 다시 해 보세요.';later(()=>{g=p.grid.slice();moves=[];cool=false;draw();},1400);}
 };
 body.append(tools(btn('처음부터',()=>{if(cool||solvedOf(board))return;g=p.grid.slice();moves=[];draw();})));
 draw();
};
// ---------- 원소 순서 기억 ----------
C.games.SIMON=function(p,body,done){
 const seq=p.seq,first=hard(p)?3:1;let round=first,pos=0,phase='wait',timers=[];
 note(body,'원소가 빛나는 순서를 기억했다가 똑같이 누르세요. 맞히면 순서가 하나씩 길어집니다. 모두 '+seq.length+'개까지 이어지면 풀립니다.');
 const counter=status(body,'곧 시작합니다…'),pad=mk('div','ch-game pz-simon');
 const keys=EL.map((name,i)=>{const b=cell('pz-simon-key el-'+KEY[i],name+' 원소',()=>tap(i));b.append(orb(i),mk('small','',name));pad.append(b);return b;});body.append(pad);
 const flash=(i,ms)=>{keys[i].classList.add('lit');timers.push(setTimeout(()=>keys[i].classList.remove('lit'),ms));};
 const play=()=>{if(phase==='done')return;phase='show';pos=0;counter.textContent=round+' / '+seq.length+' · 잘 보세요';const gap=p.showMs+160;
  for(let k=0;k<round;k++)timers.push(setTimeout(()=>{if(!open())return;flash(seq[k],p.showMs);SND('puzzle_light');},k*gap+300));
  timers.push(setTimeout(()=>{if(!open()||phase!=='show')return;phase='play';counter.textContent=round+' / '+seq.length+' · 같은 순서로 누르세요';},round*gap+300));};
 const tap=i=>{
  if(phase!=='play'||solvedOf(pad))return;flash(i,220);
  if(i!==seq[pos]){SND('error');shake(pad);phase='wait';counter.textContent='틀렸습니다. 다시 보여 드릴게요.';later(play,1100);return;}
  SND('puzzle_step');pos++;
  if(pos<round)return;
  if(round>=seq.length){phase='done';done(seq.slice());return;}
  round++;phase='wait';counter.textContent='좋아요!';later(play,700);
 };
 body.append(tools(btn('다시 보기',()=>{if(phase==='play'){for(const t of timers)clearTimeout(t);timers=[];play();}},'ch-hint')));
 later(play,600);
};
// ---------- 원소 암호 ----------
C.games.MASTERMIND=function(p,body,done){
 const k=p.k,len=p.len;let guess=Array(len).fill(-1),tries=[],old=[];
 note(body,'원소 '+len+'개로 된 암호를 맞히세요. 암호에는 서로 다른 원소가 쓰입니다. 시도할 때마다 ● 자리까지 맞은 원소의 수, ○ 들어 있지만 자리가 다른 원소의 수를 알려 줍니다. '+p.max+'번 안에 맞히세요.');
 const counter=status(body),wrap=mk('div','ch-game pz-mm'),list=mk('div','pz-mm-list'),slots=mk('div','pz-mm-slots'),pal=mk('div','pz-mm-pal');wrap.append(list,slots,pal);body.append(wrap);
 const score=g=>{let exact=0;const a={},b={};g.forEach((v,i)=>{if(v===p.code[i])exact++;a[v]=(a[v]||0)+1;});p.code.forEach(v=>b[v]=(b[v]||0)+1);let common=0;for(const v of Object.keys(a))common+=Math.min(a[v],b[v]||0);return [exact,common-exact];};
 const rowOf=(g,cls)=>{const r=mk('div','pz-mm-row '+cls);for(const v of g)r.append(orb(v,'small'));const [e,o]=score(g),fb=mk('span','pz-mm-fb');fb.append(mk('b','','●'.repeat(e)),mk('i','','○'.repeat(o)));if(!e&&!o)fb.append(mk('small','','없음'));r.append(fb);return r;};
 const draw=()=>{
  list.replaceChildren(...old.map(g=>rowOf(g,'old')),...tries.map(g=>rowOf(g,'')));list.scrollTop=list.scrollHeight;
  slots.replaceChildren(...guess.map((v,i)=>{const b=cell('pz-mm-slot'+(v<0?' empty':''),(i+1)+'번째 자리',()=>{if(guess[i]<0)return;guess[i]=-1;SND('puzzle_step');draw();});if(v>=0)b.append(orb(v));return b;}));
  counter.textContent='시도 '+tries.length+' / '+p.max;
 };
 for(let v=0;v<k;v++){const b=cell('pz-mm-key',EL[v]+' 원소',()=>{if(solvedOf(wrap))return;const i=guess.indexOf(-1);if(i<0)return;guess[i]=v;SND('puzzle_step');draw();});b.append(orb(v),mk('small','',EL[v]));pal.append(b);}
 const go=btn('확인',()=>{
  if(solvedOf(wrap))return;if(guess.includes(-1)){counter.textContent='네 자리를 모두 채워 주세요.';shake(slots);return;}
  tries.push(guess.slice());const [e]=score(guess);guess=Array(len).fill(-1);
  if(e===len){draw();done(tries.map(g=>g.slice()));return;}
  SND('error');draw();
  if(tries.length>=p.max){old=[...old,...tries].slice(-8);tries=[];counter.textContent='기회를 모두 썼습니다. 암호는 그대로이니 지난 시도를 보고 다시 추리하세요.';}
 },'primary');
 body.append(tools(go,btn('지우기',()=>{guess=Array(len).fill(-1);draw();})));
 draw();
};
// ---------- 연동 다이얼 ----------
C.games.DIALS=function(p,body,done){
 const d=p.d,base=p.base,v=p.values.slice(),angle=v.map(x=>x*360/base),moves=[];
 note(body,'다이얼을 누르면 그 다이얼과 오른쪽 다이얼이 함께 한 칸 돕니다. 마지막 다이얼은 첫 다이얼과 이어져 있습니다. 모든 바늘이 ★를 가리키게 하세요.');
 const wrap=mk('div','ch-game pz-dials');wrap.style.setProperty('--d',d);
 const dials=range(d).map(i=>{const b=cell('pz-dial',(i+1)+'번 다이얼',()=>tap(i)),face=mk('span','pz-dial-face');
  for(let t=0;t<base;t++){const m=mk('span','pz-dial-tick'+(t===0?' star':''),t===0?'★':'');m.style.setProperty('--a',(t*360/base)+'deg');face.append(m);}
  face.append(mk('span','pz-dial-needle'));b.append(face,mk('small','pz-dial-link',i<d-1?'＋'+(i+2)+'번':'＋1번'));wrap.append(b);return b;});
 body.append(wrap);
 const draw=()=>dials.forEach((b,i)=>{b.querySelector('.pz-dial-needle').style.transform='rotate('+angle[i]+'deg)';b.classList.toggle('home',v[i]===0);});
 const tap=i=>{if(solvedOf(wrap))return;const j=(i+1)%d;for(const x of [i,j]){v[x]=(v[x]+1)%base;angle[x]+=360/base;}moves.push(i);SND('puzzle_step');draw();if(v.every(x=>x===0))done(moves.slice());};
 body.append(tools(btn('처음부터',()=>{if(solvedOf(wrap))return;v.splice(0,d,...p.values);angle.splice(0,d,...p.values.map(x=>x*360/base));moves.length=0;draw();})));
 draw();
};
// ---------- 낱말 맞추기 ----------
C.games.WORD=function(p,body,done){
 const tiles=p.tiles,len=tiles.length,order=[];let cool=false;
 note(body,'흩어진 글자를 순서대로 눌러 티바트의 낱말을 완성하세요. 놓은 글자를 누르면 빠집니다.');
 body.append(mk('p','pz-word-hint','힌트 · '+p.hint));
 const slots=mk('div','ch-game pz-word-slots'),pool=mk('div','pz-word-pool');body.append(slots,pool);
 const draw=()=>{
  slots.replaceChildren(...range(len).map(k=>{const i=order[k],b=cell('pz-word-slot'+(i===undefined?' empty':''),(k+1)+'번째 글자',()=>{if(cool||i===undefined||solvedOf(slots))return;order.splice(k,1);SND('puzzle_step');draw();});if(i!==undefined)b.textContent=tiles[i];return b;}));
  pool.replaceChildren(...tiles.map((t,i)=>{const b=cell('pz-word-tile',t,()=>pick(i));b.textContent=t;b.disabled=order.includes(i);return b;}));
 };
 const pick=i=>{if(cool||solvedOf(slots)||order.includes(i)||order.length>=len)return;order.push(i);SND('puzzle_step');draw();
  if(order.length<len)return;
  if(R.check.WORD(p,order)){done(order.slice());return;}
  cool=true;SND('error');shake(slots);later(()=>{order.length=0;cool=false;draw();},800);};
 draw();
};
// ---------- 원소 탑 옮기기 ----------
const DISK_EL=[1,4,5,3,0];
C.games.HANOI=function(p,body,done){
 const n=p.n,pegs=[range(n).reverse(),[],[]],moves=[],best=2**n-1;let from=-1;
 note(body,'원소 원반을 모두 오른쪽 기둥으로 옮기세요. 한 번에 맨 위 원반 하나만 옮길 수 있고, 작은 원반 위에 큰 원반은 올릴 수 없습니다. 기둥을 눌러 원반을 들고, 놓을 기둥을 누르세요.');
 const counter=status(body),board=mk('div','ch-game pz-hanoi');body.append(board);
 const pegBtns=range(3).map(k=>{const b=cell('pz-peg',['왼쪽','가운데','오른쪽'][k]+' 기둥',()=>tap(k));b.append(mk('span','pz-peg-rod'),mk('span','pz-peg-stack'),mk('small','pz-peg-label',k===2?'목표':''));board.append(b);return b;});
 const draw=()=>{pegBtns.forEach((b,k)=>{const st=b.querySelector('.pz-peg-stack');st.replaceChildren(...pegs[k].map((s,j)=>{const d=mk('span','pz-disk el-'+KEY[DISK_EL[s%DISK_EL.length]]+(k===from&&j===pegs[k].length-1?' up':''));d.style.setProperty('--w',(38+s*58/Math.max(1,n-1))+'%');return d;}));b.classList.toggle('picked',k===from);});
  counter.textContent='옮긴 횟수 '+moves.length+' · 가장 적게는 '+best+'번';};
 const tap=k=>{
  if(solvedOf(board))return;
  if(from<0){if(!pegs[k].length)return;from=k;SND('puzzle_step');draw();return;}
  if(from===k){from=-1;draw();return;}
  const top=pegs[from][pegs[from].length-1],under=pegs[k][pegs[k].length-1];
  if(under!==undefined&&under<top){SND('error');shake(pegBtns[k]);counter.textContent='작은 원반 위에 큰 원반은 올릴 수 없습니다.';return;}
  pegs[k].push(pegs[from].pop());moves.push([from,k]);from=-1;SND('puzzle_step');draw();
  if(pegs[2].length===n){done(moves.map(m=>m.slice()));return;}
  if(moves.length>=280){counter.textContent='너무 많이 옮겼습니다. 처음부터 다시 해 보세요.';later(reset,1200);}
 };
 const reset=()=>{if(solvedOf(board))return;pegs[0]=range(n).reverse();pegs[1]=[];pegs[2]=[];moves.length=0;from=-1;draw();};
 body.append(tools(btn('처음부터',reset)));
 draw();
};
// ---------- questions: 티바트 상식, 원소 반응 ----------
function ask(body,done,qs,answers){
 const counter=status(body),card=mk('div','ch-game pz-quiz');body.append(card);let k=0,cool=false;
 const draw=()=>{counter.textContent=(k+1)+' / '+qs.length;const list=mk('div','pz-quiz-choices');
  qs[k].choices.forEach((c,i)=>{const b=cell('pz-quiz-choice',null,()=>pick(i,b));b.append(mk('b','',String.fromCharCode(65+i)),mk('span','',c));list.append(b);});
  card.replaceChildren(mk('p','pz-quiz-q',qs[k].q),list);};
 const pick=(i,b)=>{
  if(cool||solvedOf(card))return;
  if(i!==answers[k]){b.classList.add('bad');b.disabled=true;SND('error');cool=true;later(()=>{cool=false;},800);return;}
  b.classList.add('ok');SND('puzzle_step');cool=true;
  later(()=>{cool=false;k++;if(k>=qs.length)done(answers.slice());else draw();},650);};
 draw();
}
C.games.QUIZ=function(p,body,done){note(body,'티바트에 관한 문제입니다. 알맞은 답을 고르세요. 틀리면 다른 답을 다시 고를 수 있습니다.');ask(body,done,p.questions,p.answers);};
C.games.REACTION=function(p,body,done){note(body,'두 원소가 만나면 어떤 반응이 일어날까요? 알맞은 답을 고르세요. 틀리면 다른 답을 다시 고를 수 있습니다.');ask(body,done,p.rounds,p.rounds.map(r=>r.answer));};
// ---------- 다른 하나 찾기 ----------
C.games.ODD=function(p,body,done){
 let k=0,cool=false;const picks=[];
 note(body,'똑같은 그림 사이에 하나만 다른 그림이 있습니다. 조금 돌아갔거나, 크거나, 색이 다른 그림을 찾아 누르세요.');
 const counter=status(body),grid=mk('div','ch-game pz-odd');body.append(grid);
 const draw=()=>{const r=p.rounds[k];grid.style.setProperty('--n',Math.round(Math.sqrt(r.size)));counter.textContent=(k+1)+' / '+p.rounds.length;
  grid.replaceChildren(...range(r.size).map(i=>{const b=cell('pz-odd-cell',(i+1)+'번 그림',()=>pick(i,b)),img=itemImg(r.icon);
   if(i===r.odd){if(r.kind==='turn')img.style.transform='rotate('+r.amount+'deg)';else if(r.kind==='size')img.style.transform='scale('+(1+r.amount/200).toFixed(3)+')';else img.style.filter='hue-rotate('+(r.amount*2)+'deg) saturate(1.25)';}
   b.append(img);return b;}));};
 const pick=(i,b)=>{
  if(cool||solvedOf(grid))return;const r=p.rounds[k];
  if(i!==r.odd){b.classList.add('bad');SND('error');cool=true;later(()=>{b.classList.remove('bad');cool=false;},900);return;}
  b.classList.add('ok');picks.push(i);SND('puzzle_step');cool=true;
  later(()=>{cool=false;k++;if(k>=p.rounds.length)done(picks.slice());else draw();},550);};
 draw();
};
// ---------- 원소 세기 ----------
C.games.COUNT=function(p,body,done){
 let k=0,val=0,cool=false;const answers=[];
 note(body,'판에 흩어진 원소 가운데 물어보는 원소가 몇 개인지 세어 답하세요.');
 const counter=status(body),q=mk('p','pz-count-q'),grid=mk('div','ch-game pz-count');body.append(q,grid);
 const num=mk('input','pz-count-num');num.type='number';num.min='0';num.max='40';num.inputMode='numeric';num.setAttribute('aria-label','개수');
 const set=x=>{val=Math.max(0,Math.min(40,Math.floor(Number(x)||0)));num.value=String(val);};num.oninput=()=>set(num.value);
 const stepper=mk('div','pz-count-step');stepper.append(btn('−',()=>set(val-1),'pz-step'),num,btn('+',()=>set(val+1),'pz-step'));
 const draw=()=>{const r=p.rounds[k];counter.textContent=(k+1)+' / '+p.rounds.length;q.replaceChildren(document.createTextNode('「'),orb(r.target,'small'),document.createTextNode(' '+EL[r.target]+'」 원소는 몇 개일까요?'));
  grid.replaceChildren(...r.cells.map((c,i)=>{const o=orb(c);if(hard(p)){o.style.transform='rotate('+((i*47)%360)+'deg) translate('+((i*13)%7-3)+'px,'+((i*29)%7-3)+'px)';}return o;}));set(0);};
 const submit=()=>{
  if(cool||solvedOf(grid))return;const r=p.rounds[k];
  if(val!==r.answer){SND('error');shake(stepper);counter.textContent='틀렸습니다. 다시 세어 보세요.';cool=true;later(()=>{cool=false;counter.textContent=(k+1)+' / '+p.rounds.length;},900);return;}
  answers.push(val);SND('puzzle_step');k++;if(k>=p.rounds.length)done(answers.slice());else draw();};
 body.append(stepper,tools(btn('답하기',submit,'primary')));
 num.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});
 draw();
};
// ---------- 저울 맞추기 ----------
C.games.BALANCE=function(p,body,done){
 const on=new Set();
 note(body,'오른쪽 접시에 추를 올려 왼쪽 접시의 돌과 무게를 같게 맞추세요. 추를 누르면 올리고, 다시 누르면 내립니다.');
 const wrap=mk('div','ch-game pz-balance'),beam=mk('div','pz-beam-bar'),left=mk('div','pz-pan left'),right=mk('div','pz-pan right');
 left.append(mk('span','pz-stone',String(p.target)));beam.append(left,right);wrap.append(mk('span','pz-fulcrum'),beam);
 const counter=status(body),pool=mk('div','pz-weights');body.append(wrap,pool);
 const sum=()=>[...on].reduce((s,i)=>s+p.weights[i],0);
 const draw=()=>{
  const s=sum(),diff=s-p.target;beam.style.transform='rotate('+Math.max(-14,Math.min(14,diff*2.2))+'deg)';
  right.replaceChildren(...[...on].map(i=>mk('span','pz-weight on',String(p.weights[i]))));
  pool.replaceChildren(...p.weights.map((w,i)=>{const b=cell('pz-weight'+(on.has(i)?' used':''),w+' 무게 추',()=>{if(solvedOf(wrap))return;if(on.has(i))on.delete(i);else on.add(i);SND('puzzle_step');if(draw())done([...on]);});b.textContent=String(w);return b;}));
  counter.textContent='오른쪽 '+s+' / 왼쪽 '+p.target+(diff>0?' · 너무 무겁습니다':diff<0&&on.size?' · 조금 더':'');
  return s===p.target&&on.size>0;};
 draw();
};
// ---------- 짝 맞추기 ----------
C.games.PAIRS=function(p,body,done){
 const icons=p.icons,matched=new Set(),pairs=[];let first=-1,lock=false;
 note(body,'카드 두 장을 뒤집어 같은 그림을 찾으세요. 모든 짝을 맞추면 풀립니다.');
 const counter=status(body),grid=mk('div','ch-game pz-pairs');grid.style.setProperty('--n',4);body.append(grid);
 const cards=icons.map((id,i)=>{const b=cell('pz-card',(i+1)+'번 카드',()=>tap(i)),inner=mk('span','pz-card-inner'),front=mk('span','pz-card-front'),back=mk('span','pz-card-back');front.append(itemImg(id));inner.append(back,front);b.append(inner);grid.append(b);return b;});
 const draw=()=>{counter.textContent='찾은 짝 '+pairs.length+' / '+icons.length/2;};
 const tap=i=>{
  if(lock||solvedOf(grid)||matched.has(i)||i===first)return;cards[i].classList.add('up');SND('page');
  if(first<0){first=i;return;}
  const a=first;first=-1;
  if(icons[a]===icons[i]){matched.add(a);matched.add(i);pairs.push([a,i]);cards[a].classList.add('done');cards[i].classList.add('done');SND('puzzle_step');draw();if(matched.size===icons.length)done(pairs.map(x=>x.slice()));return;}
  lock=true;later(()=>{cards[a].classList.remove('up');cards[i].classList.remove('up');lock=false;},850);
 };
 draw();
};
// ---------- 미로 탈출 ----------
const DIRS=[[-1,0,1,'위'],[0,1,2,'오른쪽'],[1,0,4,'아래'],[0,-1,8,'왼쪽']];
C.games.MAZE=function(p,body,done){
 const m=p.m,moves=[],seen=new Set([0]),fog=hard(p);let at=0;
 note(body,'빛나는 길잡이를 오른쪽 아래 출구까지 데려가세요. 화살표 버튼, 방향키(WASD), 옆 칸 누르기로 움직입니다.'+(fog?' 지나온 길 가까이만 보입니다.':''));
 const grid=mk('div','ch-game pz-maze'+(fog?' fog':''));grid.style.setProperty('--m',m);body.append(grid);
 const cells=range(m*m).map(i=>{const o=p.open[i],c=cell('pz-maze-cell'+(o&1?'':' w-n')+(o&2?'':' w-e')+(o&4?'':' w-s')+(o&8?'':' w-w')+(i===m*m-1?' exit':''),null,()=>toward(i));c.tabIndex=-1;grid.append(c);return c;});
 const near=i=>{const x=i%m,y=Math.floor(i/m);for(const s of seen){const sx=s%m,sy=Math.floor(s/m);if(Math.abs(sx-x)+Math.abs(sy-y)<=1)return true;}return false;};
 const draw=()=>cells.forEach((c,i)=>{c.classList.toggle('here',i===at);c.classList.toggle('trail',seen.has(i)&&i!==at);if(fog)c.classList.toggle('dark',!near(i));});
 const move=d=>{
  if(solvedOf(grid)||!grid.isConnected)return;const [dy,dx,bit]=DIRS[d];
  if(!(p.open[at]&bit)){shake(cells[at]);return;}
  at=(Math.floor(at/m)+dy)*m+(at%m)+dx;moves.push(d);seen.add(at);SND('puzzle_step');draw();
  if(at===m*m-1){done(moves.slice());return;}
  if(moves.length>=590){at=0;moves.length=0;draw();SHELL.toast?.('너무 오래 헤매서 입구로 돌아왔습니다.');}
 };
 const toward=i=>{const dx=i%m-at%m,dy=Math.floor(i/m)-Math.floor(at/m);if(Math.abs(dx)+Math.abs(dy)!==1)return;move(dy<0?0:dx>0?1:dy>0?2:3);};
 const pad=mk('div','pz-maze-pad');for(const [d,label] of [[0,'▲'],[3,'◀'],[2,'▼'],[1,'▶']]){const b=btn(label,()=>move(d),'pz-arrow a'+d);b.setAttribute('aria-label',DIRS[d][3]+'으로');pad.append(b);}body.append(pad);
 const KEYS={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
 document.addEventListener('keydown',function key(e){if(!grid.isConnected||solvedOf(grid)){document.removeEventListener('keydown',key);return;}const d=KEYS[e.code];if(d===undefined||e.target?.matches?.('input,textarea'))return;e.preventDefault();move(d);});
 draw();
};
// ---------- 별자리 잇기 ----------
C.games.CONSTELLATION=function(p,body,done){
 const stars=p.stars,want=p.edges.length,lines=new Map(),mirror=hard(p);let pick=-1;
 note(body,(mirror?'왼쪽 그림은 호수에 비친 별자리라 좌우가 뒤집혀 있습니다. ':'')+'별 두 개를 차례로 누르면 선이 이어지고, 이어진 두 별을 다시 누르면 선이 지워집니다. 그림과 같은 별자리를 밤하늘에 그리세요.');
 const counter=status(body),wrap=mk('div','ch-game pz-const');
 const ref=mk('figure','pz-const-ref'),rs=svgEl('svg',{viewBox:'0 0 100 100','aria-hidden':'true'}),X=x=>mirror?100-x:x;
 for(const [a,b] of p.edges)rs.append(svgEl('line',{x1:X(stars[a].x),y1:stars[a].y,x2:X(stars[b].x),y2:stars[b].y}));for(const s of stars)rs.append(svgEl('circle',{cx:X(s.x),cy:s.y,r:2.6}));
 ref.append(rs,mk('figcaption','',mirror?'호수에 비친 별자리':'찾을 별자리'));
 const sky=mk('div','pz-const-sky'),ss=svgEl('svg',{viewBox:'0 0 100 100','aria-hidden':'true'}),lg=svgEl('g');ss.append(lg);sky.append(ss);
 const btns=stars.map((s,i)=>{const b=cell('pz-star',(i+1)+'번 별',()=>tap(i));b.style.left=s.x+'%';b.style.top=s.y+'%';sky.append(b);return b;});
 wrap.append(ref,sky);body.append(wrap);
 const key=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b);
 const draw=()=>{lg.replaceChildren(...[...lines.values()].map(([a,b])=>svgEl('line',{x1:stars[a].x,y1:stars[a].y,x2:stars[b].x,y2:stars[b].y})));btns.forEach((b,i)=>b.classList.toggle('picked',i===pick));counter.textContent='이은 선 '+lines.size+' / '+want;};
 const tap=i=>{
  if(solvedOf(wrap))return;if(pick<0){pick=i;SND('puzzle_step');draw();return;}if(pick===i){pick=-1;draw();return;}
  const k=key(pick,i);if(lines.has(k))lines.delete(k);else lines.set(k,[Math.min(pick,i),Math.max(pick,i)]);pick=-1;SND('puzzle_light');draw();
  const got=[...lines.values()];if(R.check.CONSTELLATION(p,got))done(got.map(e=>e.slice()));
 };
 body.append(tools(btn('모두 지우기',()=>{if(solvedOf(wrap))return;lines.clear();pick=-1;draw();})));
 draw();
};
// ---------- 그림자 맞추기 ----------
C.games.SHADOW=function(p,body,done){
 let k=0,cool=false;const picks=[];
 note(body,'위의 그림과 꼭 같은 그림자를 고르세요. 돌아갔거나 뒤집힌 그림자가 섞여 있습니다.');
 const counter=status(body),card=mk('div','ch-game pz-shadow');body.append(card);
 const draw=()=>{const r=p.rounds[k];counter.textContent=(k+1)+' / '+p.rounds.length;const main=mk('div','pz-shadow-main');main.append(itemImg(r.icon));const opts=mk('div','pz-shadow-opts');
  r.options.forEach((o,i)=>{const b=cell('pz-shadow-opt',(i+1)+'번 그림자',()=>pick(i,b)),img=itemImg(r.icon,'silhouette');img.style.transform='rotate('+o.turn+'deg) scaleX('+(o.flip?-1:1)+') scale('+r.scale+')';b.append(img);opts.append(b);});
  card.replaceChildren(main,opts);};
 const pick=(i,b)=>{
  if(cool||solvedOf(card))return;const r=p.rounds[k];
  if(i!==r.answer){b.classList.add('bad');SND('error');cool=true;later(()=>{b.classList.remove('bad');cool=false;},900);return;}
  b.classList.add('ok');picks.push(i);SND('puzzle_step');cool=true;later(()=>{cool=false;k++;if(k>=p.rounds.length)done(picks.slice());else draw();},550);};
 draw();
};
// ---------- 석판 밝히기 · 대각선 ----------
C.games.LIGHTS_X=function(p,body,done){
 const n=p.n,state=p.state.slice(),moves=[];
 const press=(s,i)=>{const x=i%n,y=Math.floor(i/n);s[i]^=1;for(const [dy,dx] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<n&&xx>=0&&xx<n)s[yy*n+xx]^=1;}};
 note(body,'석판을 누르면 그 석판과 대각선으로 맞닿은 석판의 불이 바뀝니다. 모든 석판에 불을 밝히세요.');
 const grid=mk('div','ch-game ch-lights pz-lights-x');grid.style.setProperty('--n',n);body.append(grid);
 const draw=()=>{grid.replaceChildren(...state.map((v,i)=>{const b=cell('slate'+(v?' lit':''),(i+1)+'번 석판 · '+(v?'켜짐':'꺼짐'),()=>{if(solvedOf(grid))return;press(state,i);moves.push(i);SND('puzzle_light');draw();grid.children[i]?.classList.add('pulse');if(state.every(x=>x===1))done(moves.slice());});return b;}));};
 const solve=()=>{const N=n*n;for(let mask=0;mask<1<<N;mask++){const s=state.slice(),list=[];for(let i=0;i<N;i++)if(mask>>i&1){list.push(i);press(s,i);}if(s.every(v=>v===1))return list;}return [];};
 draw();
 body.append(tools(btn('처음부터',()=>{if(solvedOf(grid))return;state.splice(0,state.length,...p.state);moves.length=0;draw();}),btn('힌트',()=>{const sol=solve();if(!sol.length)return;const b=grid.children[sol[0]];b?.classList.add('hinted');later(()=>b?.classList.remove('hinted'),1500);},'ch-hint')));
};
C.puzzleGames=Object.keys(C.games);
})();
