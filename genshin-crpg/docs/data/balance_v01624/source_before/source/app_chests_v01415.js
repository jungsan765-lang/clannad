/* 0.14.15 보물상자 화면 (runtime_chests_v01415.js). User: 「상자 열 때나 퍼즐 할 때 이펙트와 에셋을 잘 써서 상자 먹었다는
 * 느낌이 제대로 들게」, 「스도쿠는 할 줄 모르는 사람이 많으니 튜토리얼을 간단하게」.
 *  - 풍경 보기(V)에 퍼즐 상자와 처음 숨은 상자가 놓이고, 밤에만 보이는 상자는 희미하게 일렁인다.
 *  - 그 장소에 있을 때만 지도·페이몬 메뉴·설정·기원·핸드북·가방·캐릭터 화면 한구석에 숨은 상자의 반짝임이 나타난다.
 *  - 미니게임: 틀린 그림 찾기, 그림 맞추기, 밀어서 그림 맞추기, 스도쿠(규칙 안내와 힌트), 석판 밝히기.
 *  - 풀면 원작 「봉인 해제」 소리와 함께 판이 빛나고, 상자가 빛줄기 속에 나타나고(등장 소리), 누르면 열리는 소리·섬광·
 *    빛 조각과 함께 원석·모라·재료가 한 장씩 튀어나온다.
 * Load after app_shell.js, app_wish_v01411.js and app_handbook.js. */
(function(){
'use strict';
const SHELL=window.CRPGShell;if(!SHELL)return;
const C=window.CRPGChests={node:null};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','ch-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const chestImg=k=>'assets/icons/chests/chest_'+k+'.webp';
const curIcon=(key,cls)=>{const p=MAN().itemIcons?.icons?.['CUR_'+key]?.path;if(!p)return mk('span',cls+' fallback','◆');const i=mk('img',cls);i.src=p;i.alt='';i.draggable=false;return i;};
// 0.16: a guest solving the host's chest (app_coop_v0153.js) sees the picture of the place in the host's world (C.play spec.map).
const placeImage=()=>{try{const m=MAN().maps?.[C.mapOverride||game.s.global.CURRENT_MAP_ID];return m?.url||(m?.file_name&&typeof assetPath==='function'?assetPath(m.file_name):null);}catch{return null;}};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.chestsHere==='function';
const ICON_ITEMS=['ING_APPLE','ING_SUNSETTIA','ING_SWEET_FLOWER','ING_MUSHROOM','ING_CARROT','ING_MINT','ING_RADISH','ING_PINECONE','ING_BERRY'];
// ---------- the overlay ----------
function close(){if(!C.node)return;const n=C.node;C.node=null;clearInterval(C.timer);n.classList.remove('open');setTimeout(()=>n.remove(),220);try{C.onClose?.(n);}catch{}}
C.close=close;
function overlay(chest){
 close();const wrap=mk('div','ch-overlay region-'+chest.region.toLowerCase());wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',chest.tierName);
 const bg=placeImage();if(bg)wrap.style.setProperty('--ch-bg','url("'+bg+'")');
 const box=mk('div','ch-box'),head=mk('header','ch-head');
 // 0.15.2: a regional event's device shows a glyph instead of a chest (C.play).
 if(chest.glyph)head.append(SHELL.icon(chest.glyph,'shell-icon ch-head-icon ch-head-glyph'),mk('div','ch-head-copy'));
 else{head.append(mk('img','ch-head-icon'),mk('div','ch-head-copy'));head.firstChild.src=chestImg(chest.icon);head.firstChild.alt='';}
 head.lastChild.append(mk('strong','',chest.tierName+(chest.game?' · '+chest.gameName:'')),mk('small','',chest.mapName+(chest.hidden?' · 숨은 보물':'')));
 const x=mk('button','ch-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=close;head.append(x);
 const body=mk('div','ch-body');box.append(head,body);wrap.append(box);
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 document.body.append(wrap);C.node=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));return body;
}
const note=(body,text,cls='')=>{const p=mk('p','ch-note '+cls,text);body.append(p);return p;};
// ---------- the reveal: the chest rises, opens, and its rewards fly out ----------
function reveal(chest,answer,body){
 body.replaceChildren();body.className='ch-body ch-reveal';body.closest('.ch-box')?.classList.remove('wide');
 const stage=mk('div','ch-stage tier-'+chest.icon);stage.append(mk('div','ch-rays'),mk('div','ch-glow'));
 const img=mk('img','ch-chest');img.src=chestImg(chest.icon);img.alt=chest.tierName;stage.append(img);
 for(let i=0;i<14;i++){const s=mk('span','ch-mote');s.style.setProperty('--a',(i*360/14)+'deg');s.style.setProperty('--d',(0.6+((i*37)%10)/10).toFixed(2)+'s');stage.append(s);}
 body.append(stage);SND('chest_appear');
 const open=btn('상자 열기',async()=>{
  if(open.disabled)return;open.disabled=true;open.textContent='여는 중…';
  let receipt;try{receipt=await act('CHEST_OPEN',{chest:chest.id,answer});}catch(e){receipt={ok:false,error:e};}
  const ok=receipt?.ok!==false&&game.chestOpened(chest.id);
  if(!ok){open.disabled=false;open.textContent='다시 열기';note(body,(receipt?.error?.message||lastResult?.error?.message||'상자를 열 수 없습니다. 전투를 마친 뒤 다시 시도해 주세요.'),'warn');SND('error');return;}
  const out=receipt?.result||lastResult?.result||{};open.remove();
  stage.classList.add('opened');SND('chest_open');
  const flash=mk('div','ch-flash');stage.append(flash);
  for(let i=0;i<26;i++){const s=mk('span','ch-spark');s.style.setProperty('--a',(i*360/26+((i*53)%17))+'deg');s.style.setProperty('--r',(90+(i*29)%110)+'px');s.style.setProperty('--t',(0.55+((i*13)%9)/20).toFixed(2)+'s');stage.append(s);}
  setTimeout(()=>rewards(chest,out,body),650);
 },'primary ch-open');
 body.append(open);setTimeout(()=>open.focus({preventScroll:true}),400);
}
function rewards(chest,out,body){
 const w=chest.reward;body.append(rewardRow({primogem:out.primogem??w.primogem,mora:w.mora,items:w.items},true));SND('chest_reward');
 const region=chest.region==='MOND'?'몬드':'리월';body.append(mk('p','ch-progress',region+' 보물상자 '+(out.found??'?')+' / '+(out.total??24)+' 발견'));
 body.append(btn('확인',close,'primary ch-done'));
}
// The reward cards, the 원석 count running up (also the regional events' rewards). `always` keeps 원석 and Mora at 0.
function rewardRow(w,always=false){
 const row=mk('div','ch-rewards');
 const card=(icon,label,count,cls='')=>{const c=mk('div','ch-reward '+cls);c.append(icon,mk('strong','ch-reward-count',count),mk('span','ch-reward-name',label));return c;};
 const target=Number(w.primogem)||0,prim=always||target?card(curIcon('PRIMOGEM','ch-reward-icon'),'원석','×0','primo'):null;if(prim)row.append(prim);
 if(always||w.mora)row.append(card(curIcon('MORA','ch-reward-icon'),'모라','×'+fmt(w.mora),'mora'));
 for(const [id,n] of Object.entries(w.items||{})){let d;try{d=itemPresenter.itemDetail({item:id,quantity:n});}catch{d={name:id};}let g;try{g=itemGlyph(d);}catch{g=mk('span','item-glyph','◆');}g.classList.add('ch-reward-icon');row.append(card(g,d.name||id,'×'+n,'tier-'+(d.tier?.rank||1)));}
 [...row.children].forEach((c,i)=>{c.style.setProperty('--i',i);});
 if(prim){const startAt=performance.now(),tick=t=>{const k=Math.min(1,(t-startAt)/700);prim.querySelector('.ch-reward-count').textContent='×'+Math.round(target*k);if(k<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
 return row;
}
C.rewardRow=rewardRow;
// ---------- the games ----------
function start(chest){
 C.mapOverride=null;if(!ready())return;const why=game.chestReason(chest.id);if(why){SHELL.toast?.(why);SND('error');return;}
 // 0.16 같이 풀기: in a room, the host's puzzle is a board shared with whoever stands here (app_coop_puzzle_v0160.js joins it
 // first and opens it again through C.startSolo).
 if(!C.solo&&chest.game&&!chest.unsealed&&C.together?.(chest))return;
 const body=overlay(chest);
 // 0.16 (user: 「(손님)님이 상자의 암호를 풀어냈다 이런식으로 적어두고 먹게」): a chest someone in the room unsealed opens at once.
 if(chest.unsealed){reveal(chest,undefined,body);body.querySelector('.ch-open')?.before(mk('p','ch-note by-friend',chest.unsealed.by+' 님이 '+(chest.game?'상자의 암호를 풀어냈다':'이 상자를 찾아냈다')));return;}
 if(!chest.game){note(body,chest.how==='SCENERY'?'풍경 속에 놓여 있던 보물상자입니다.':'아무도 모르는 곳에 숨겨져 있던 보물상자입니다.');reveal(chest,undefined,body);return;}
 const p=game.chestPuzzle(chest.id);if(!p){close();return;}
 const play=C.games[p.game];if(!play){note(body,'이 퍼즐을 표시하지 못했습니다. 게임을 새로 고친 뒤 다시 열어 주세요.','warn');return;}
 play(p,body,answer=>solved(chest,answer,body));
}
C.start=start;
C.startSolo=function(chest){C.solo=true;try{start(chest);}finally{C.solo=false;}return C.node?.querySelector('.ch-body')||null;};
// 0.15.2: the regional events play the same games in the same window (app_events_v0152.js). spec: {title, sub, region,
// glyph | icon, puzzle, solvedText, done(answer, body)}; done settles the event and draws what it paid.
C.play=function(spec){
 const body=overlay({region:spec.region||'MOND',tierName:spec.title,icon:spec.icon||'common',glyph:spec.glyph,game:spec.puzzle.game,gameName:spec.puzzle.name,mapName:spec.sub||'',hidden:false});
 C.mapOverride=spec.map||null;if(spec.map){const bg=placeImage();if(bg)C.node?.style.setProperty('--ch-bg','url("'+bg+'")');}
 const play=C.games[spec.puzzle.game];if(!play){note(body,'이 퍼즐을 표시하지 못했습니다.','warn');return;}
 play(spec.puzzle,body,answer=>{
  SND('chest_unlock');body.querySelector('.ch-game')?.classList.add('solved');body.append(mk('div','ch-solved',spec.solvedText||'봉인이 풀렸다!'));
  setTimeout(()=>{if(C.node&&body.isConnected)spec.done?.(answer,body);},1300);
 });
};
function solved(chest,answer,body){
 SND('chest_unlock');const board=body.querySelector('.ch-game');board?.classList.add('solved');
 const banner=mk('div','ch-solved','봉인이 풀렸다!');body.append(banner);
 setTimeout(()=>reveal(chest,answer,body),1400);
}
const preview=(src,body)=>{if(!src)return;const d=mk('details','ch-preview');const s=mk('summary','','완성된 그림 보기');const i=mk('img','');i.src=src;i.alt='';d.append(s,i);body.append(d);};
// 0.15.15: with no chances left the board rests for 30 seconds before the search starts over (user: 「틀린그림찾기 기회 다
// 닳으면 30초 기다리는거도 추가하자. 해보니까 그게 없으니까 그냥 체력이 있나 없나 똑같은 것 같아」). The rest belongs to the
// puzzle (its changes), so closing and opening the window again, or reloading, does not cut it short.
const SPOT_REST=30000,spotRest=new Map();
try{for(const [k,v] of Object.entries(JSON.parse(localStorage.getItem('crpg-spot-rest')||'{}')))if(Number(v)>Date.now())spotRest.set(k,Number(v));}catch{}
const keepRest=()=>{try{const o={};for(const [k,v] of spotRest)if(v>Date.now())o[k]=v;localStorage.setItem('crpg-spot-rest',JSON.stringify(o));}catch{}};
// 틀린 그림 찾기: the right picture has small changes; press them on either picture.
function spotGame(p,body,done){
 // 0.15.1: a wrong press costs a chance (Mond 5, Liyue 3) and pauses the board for a moment; with no chances left the
 // found spots start over (user: 「그냥 아무렇게나 눌러도 되니까 이것도 좀 바꿔야」), after a 30-second rest since 0.15.15.
 const lives0=p.subtle?3:5;let lives=lives0,cool=false,locked=false;
 const key='spot:'+p.diffs.map(d=>Math.round(d.x)+','+Math.round(d.y)).join(';');
 const src=placeImage();body.closest('.ch-box')?.classList.add('wide');note(body,'두 그림에서 다른 곳 '+p.count+'군데를 찾아 누르세요. 없던 물건, 좌우가 뒤집힌 부분, 색이 바뀐 부분을 잘 보세요. 엉뚱한 곳을 누르면 기회가 줄고, 기회를 다 쓰면 30초 쉰 뒤 처음부터 다시 찾습니다.');
 const counter=mk('p','ch-count','찾은 곳 0 / '+p.count),hearts=mk('p','ch-lives');body.append(counter,hearts);
 const drawLives=()=>{hearts.replaceChildren(mk('span','','남은 기회'),...Array.from({length:lives0},(_,i)=>mk('b',i<lives?'on':'off',i<lives?'♥':'♡')));};drawLives();
 const wrap=mk('div','ch-game ch-spot'+(p.subtle?' subtle':'')),A=mk('div','spot-pic'),B=mk('div','spot-pic changed');
 for(const el of [A,B]){if(src)el.style.backgroundImage='url("'+src+'")';else el.classList.add('noimg');}
 wrap.append(A,B);body.append(wrap);
 const found=new Set(),R=p.radius;
 // the changes, drawn on B only
 const patches=p.diffs.map((d,i)=>{const e=mk('div','spot-diff '+d.kind);e.style.left=d.x+'%';e.style.top=d.y+'%';e.style.setProperty('--r',R+'%');e.style.setProperty('--turn',d.turn+'deg');
  if(d.kind==='icon'){const id=ICON_ITEMS[d.icon%ICON_ITEMS.length],path=MAN().itemIcons?.icons?.[id]?.path;if(path){const img=mk('img','');img.src=path;img.alt='';e.append(img);}else e.classList.replace('icon','hue');}
  B.append(e);return e;});
 // a mirrored patch needs the picture's drawn size
 const layout=()=>{const W=B.clientWidth,H=B.clientHeight;if(!W||!src)return;const im=C.spotImg;if(!im?.naturalWidth)return;const sc=Math.max(W/im.naturalWidth,H/im.naturalHeight),dw=im.naturalWidth*sc,dh=im.naturalHeight*sc,ox=(W-dw)/2,oy=(H-dh)/2;
  p.diffs.forEach((d,i)=>{if(d.kind!=='flip')return;const r=R/100*W,cx=d.x/100*W,cy=d.y/100*H,e=patches[i];e.style.backgroundImage='url("'+src+'")';e.style.backgroundSize=dw+'px '+dh+'px';e.style.backgroundPosition=(ox-(cx-r))+'px '+(oy-(cy-r))+'px';});};
 if(src){C.spotImg=new Image();C.spotImg.onload=layout;C.spotImg.src=src;}new ResizeObserver(layout).observe(B);
 const mark=(el,d,cls)=>{const m=mk('span','spot-mark '+cls);m.style.left=d.x+'%';m.style.top=d.y+'%';m.style.setProperty('--r',R+'%');el.append(m);return m;};
 const pause=ms=>{cool=true;wrap.classList.add('cooling');setTimeout(()=>{cool=false;wrap.classList.remove('cooling');},ms);};
 // The rest: hearts empty, the board dimmed and locked with the seconds left; then the chances come back.
 let restTimer=0;
 const rest=()=>{
  const until=spotRest.get(key)||0;if(until<=Date.now())return;
  locked=true;lives=0;drawLives();wrap.classList.add('cooling','resting');syncHint();
  const warn=mk('div','ch-solved ch-reset ch-rest'),left=mk('small','');warn.append(mk('strong','','기회를 다 써서 처음부터 다시 찾습니다'),left);warn.setAttribute('role','status');wrap.append(warn);
  const tick=()=>{
   if(!wrap.isConnected){clearInterval(restTimer);return;}
   const s=Math.ceil((until-Date.now())/1000);
   if(s>0){left.textContent=s+'초 뒤에 다시 찾을 수 있습니다';return;}
   clearInterval(restTimer);spotRest.delete(key);keepRest();warn.remove();locked=false;lives=lives0;drawLives();wrap.classList.remove('cooling','resting');syncHint();
  };
  tick();clearInterval(restTimer);restTimer=setInterval(tick,250);
 };
 const tap=(el,e)=>{
  if(cool||locked||wrap.classList.contains('solved'))return;
  const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
  const hit=p.diffs.findIndex((d,i)=>!found.has(i)&&Math.hypot((x-d.x)*r.width,(y-d.y)*r.height)/100<=R/100*r.width*(p.subtle?1.3:1.15));
  if(hit<0){
   const m=mark(el,{x,y},'miss');setTimeout(()=>m.remove(),600);SND('error');lives--;drawLives();hearts.classList.remove('shake');void hearts.offsetWidth;hearts.classList.add('shake');
   if(lives>0){pause(700);return;}
   // no chances left: the found spots start over, after the rest
   found.clear();for(const x of wrap.querySelectorAll('.spot-mark.hit'))x.remove();counter.textContent='찾은 곳 0 / '+p.count;
   spotRest.set(key,Date.now()+SPOT_REST);keepRest();rest();return;
  }
  found.add(hit);mark(A,p.diffs[hit],'hit');mark(B,p.diffs[hit],'hit');SND('puzzle_step');counter.textContent='찾은 곳 '+found.size+' / '+p.count;
  if(found.size===p.count)done([...found]);
 };
 A.onclick=e=>tap(A,e);B.onclick=e=>tap(B,e);
 // A hint rings one change for a moment, then waits (20 s in Mond, 45 s in Liyue). Not while the board rests.
 const wait=p.subtle?45000:20000;let hintWaiting=false;
 const hint=btn('힌트',()=>{if(locked||hintWaiting)return;const i=p.diffs.findIndex((d,k)=>!found.has(k));if(i<0)return;const m=mark(B,p.diffs[i],'hint');setTimeout(()=>m.remove(),1600);hintWaiting=true;syncHint();setTimeout(()=>{hintWaiting=false;syncHint();},wait);},'ch-hint');
 function syncHint(){const why=locked?'기회를 다 써서 쉬는 동안에는 힌트를 쓸 수 없습니다.':hintWaiting?Math.round(wait/1000)+'초 뒤에 다시 쓸 수 있습니다.':'';hint.disabled=!!why;hint.title=why;if(why)hint.dataset.reason=why;else delete hint.dataset.reason;}
 body.append(hint);
 // Opened again while this puzzle still rests: the rest goes on.
 rest();
}
// 그림 맞추기: press two pieces to swap them.
function swapGame(p,body,done){
 const src=placeImage(),n=p.n,board=p.board.slice(),moves=[];let pick=-1;
 note(body,'조각 두 개를 차례로 누르면 자리가 바뀝니다. 그림을 원래대로 맞추세요.');
 const grid=mk('div','ch-game ch-tiles');grid.style.setProperty('--n',n);body.append(grid);preview(src,body);
 const draw=()=>{grid.replaceChildren();board.forEach((t,pos)=>{const b=mk('button','tile'+(pos===pick?' picked':'')+(t===pos?' home':''));b.type='button';b.setAttribute('aria-label',(pos+1)+'번 칸');
  if(src){b.style.backgroundImage='url("'+src+'")';b.style.backgroundSize=n*100+'% '+n*100+'%';b.style.backgroundPosition=(t%n)*100/(n-1)+'% '+Math.floor(t/n)*100/(n-1)+'%';}else b.textContent=t+1;
  b.onclick=()=>{if(grid.classList.contains('solved'))return;if(pick<0){pick=pos;SND('puzzle_step');draw();return;}if(pick===pos){pick=-1;draw();return;}
   [board[pick],board[pos]]=[board[pos],board[pick]];moves.push([pick,pos]);pick=-1;SND('puzzle_step');draw();if(board.every((v,i)=>v===i))done(moves);};
  grid.append(b);});};
 draw();
}
// 밀어서 그림 맞추기: slide pieces into the empty square.
function slideGame(p,body,done){
 const src=placeImage(),n=p.n,N=n*n,board=p.board.slice(),moves=[];
 note(body,'빈칸 옆의 조각을 누르면 빈칸으로 미끄러집니다. 그림을 원래대로 맞추세요.');
 const grid=mk('div','ch-game ch-tiles slide');grid.style.setProperty('--n',n);body.append(grid);preview(src,body);
 const adj=(a,b)=>Math.abs(a%n-b%n)+Math.abs(Math.floor(a/n)-Math.floor(b/n))===1;
 const draw=()=>{grid.replaceChildren();board.forEach((t,pos)=>{const b=mk('button','tile'+(t===N-1?' blank':''));b.type='button';
  if(t!==N-1){if(src){b.style.backgroundImage='url("'+src+'")';b.style.backgroundSize=n*100+'% '+n*100+'%';b.style.backgroundPosition=(t%n)*100/(n-1)+'% '+Math.floor(t/n)*100/(n-1)+'%';}else b.textContent=t+1;}
  b.onclick=()=>{const blank=board.indexOf(N-1);if(t===N-1||!adj(pos,blank)||grid.classList.contains('solved'))return;board[blank]=t;board[pos]=N-1;moves.push(pos);SND('puzzle_step');draw();if(board.every((v,i)=>v===i))done(moves);};
  grid.append(b);});};
 draw();
}
// 석판 밝히기: a slate flips itself and its neighbours; light them all.
function lightsGame(p,body,done){
 const n=p.n,state=p.state.slice(),moves=[];
 note(body,'석판을 누르면 그 석판과 위·아래·양옆 석판의 불이 바뀝니다. 모든 석판에 불을 밝히세요.');
 const grid=mk('div','ch-game ch-lights');grid.style.setProperty('--n',n);body.append(grid);
 const flip=(s,i)=>{const x=i%n,y=Math.floor(i/n);for(const k of [i,x>0?i-1:-1,x<n-1?i+1:-1,y>0?i-n:-1,y<n-1?i+n:-1])if(k>=0)s[k]^=1;};
 const draw=()=>{grid.replaceChildren();state.forEach((v,i)=>{const b=mk('button','slate'+(v?' lit':''));b.type='button';b.setAttribute('aria-label',(i+1)+'번 석판 · '+(v?'켜짐':'꺼짐'));b.onclick=()=>{if(grid.classList.contains('solved'))return;flip(state,i);moves.push(i);SND('puzzle_light');draw();grid.children[i]?.classList.add('pulse');if(state.every(x=>x===1))done(moves);};grid.append(b);});};
 draw();
 const row=mk('div','ch-tools');
 row.append(btn('처음부터',()=>{state.splice(0,state.length,...p.state);moves.length=0;draw();},''),btn('힌트',()=>{const sol=solveLights(state,n);if(!sol.length)return;grid.children[sol[0]]?.classList.add('hinted');setTimeout(()=>grid.children[sol[0]]?.classList.remove('hinted'),1500);},'ch-hint'));
 body.append(row);
}
// The games by name; app_puzzles_v0152.js adds the 0.15.2 ones.
C.games={SPOT:spotGame,SWAP:swapGame,SLIDE:slideGame,SUDOKU:sudokuGame,LIGHTS:lightsGame};
C.note=note;C.preview=preview;C.placeImage=placeImage;
// 0.15.17: the same rest for every puzzle with chances (user: 「지뢰찾기 이런 기회 있는것들은 전부 기다리는 시간을 가지게 하자
// 30초같은거」). Keys name the puzzle ('spot:…', 'mines:…', 'code:…'); the rests are kept with the spot game's.
C.rest={ms:SPOT_REST,until:key=>spotRest.get(key)||0,start:key=>{spotRest.set(key,Date.now()+SPOT_REST);keepRest();},end:key=>{spotRest.delete(key);keepRest();}};
function solveLights(state,n){const N=n*n;for(let mask=0;mask<1<<N;mask++){const s=state.slice(),list=[];for(let i=0;i<N;i++)if(mask>>i&1){list.push(i);const x=i%n,y=Math.floor(i/n);for(const k of [i,x>0?i-1:-1,x<n-1?i+1:-1,y>0?i-n:-1,y<n-1?i+n:-1])if(k>=0)s[k]^=1;}if(s.every(v=>v===1))return list;}return [];}
// 스도쿠, with a short lesson the first time and on request.
function sudokuGame(p,body,done){
 const {n,box:[br,bc]}=p,cells=p.givens.slice();let sel=cells.findIndex(v=>!v),hints=3;
 note(body,n+'×'+n+' 칸을 1부터 '+n+'까지 채우세요. 같은 가로줄·세로줄·굵은 선 상자 안에는 같은 숫자가 두 번 들어가면 안 됩니다.');
 const grid=mk('div','ch-game ch-sudoku');grid.style.setProperty('--n',n);grid.style.setProperty('--br',br);grid.style.setProperty('--bc',bc);body.append(grid);
 const pad=mk('div','sd-pad');body.append(pad);
 const clash=i=>{const v=cells[i];if(!v)return false;const y=Math.floor(i/n),x=i%n,by=y-y%br,bx=x-x%bc;for(let k=0;k<n*n;k++){if(k===i||cells[k]!==v)continue;const ky=Math.floor(k/n),kx=k%n;if(ky===y||kx===x||ky-ky%br===by&&kx-kx%bc===bx)return true;}return false;};
 const draw=()=>{grid.replaceChildren();cells.forEach((v,i)=>{const y=Math.floor(i/n),x=i%n,b=mk('button','sd-cell'+(p.givens[i]?' given':'')+(i===sel?' sel':'')+(clash(i)?' clash':'')+(x%bc===bc-1&&x<n-1?' edge-r':'')+(y%br===br-1&&y<n-1?' edge-b':''),v||'');b.type='button';b.setAttribute('aria-label',(y+1)+'행 '+(x+1)+'열 '+(v||'빈칸'));
  if(!p.givens[i])b.onclick=()=>{sel=i;SND('puzzle_step');draw();};grid.append(b);});
  if(cells.every(v=>v)&&!cells.some((v,i)=>clash(i))){grid.classList.add('done');done(cells.slice());}};
 const put=v=>{if(sel<0||p.givens[sel])return;cells[sel]=v;SND('puzzle_step');draw();};
 for(let v=1;v<=n;v++)pad.append(btn(String(v),()=>put(v),'sd-num'));pad.append(btn('지우기',()=>put(0),'sd-erase'));
 const row=mk('div','ch-tools');const hint=btn('힌트 ('+hints+')',()=>{const sol=solveSudoku(p.givens.map((g,i)=>g||0),n,br,bc);if(!sol)return;const empty=cells.map((v,i)=>v!==sol[i]?i:-1).filter(i=>i>=0&&!p.givens[i]);if(!empty.length||!hints)return;const i=empty[0];cells[i]=sol[i];sel=i;hints--;hint.textContent='힌트 ('+hints+')';if(!hints)hint.disabled=true;SND('puzzle_step');draw();},'ch-hint');
 row.append(btn('규칙 보기',()=>sudokuLesson(n,br,bc),''),hint);body.append(row);
 document.addEventListener('keydown',function key(e){if(!C.node){document.removeEventListener('keydown',key);return;}const top=window.CRPGShell?.topOverlay?.();if(top&&!top.contains(C.node))return;const v=Number(e.key);if(v>=1&&v<=n){put(v);e.preventDefault();}else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){put(0);e.preventDefault();}});
 draw();
 let seen=false;try{seen=localStorage.getItem('crpg-sudoku-lesson')==='1';}catch{}if(!seen)sudokuLesson(n,br,bc);
}
function solveSudoku(a,n,br,bc){a=a.slice();const ok=(i,v)=>{const y=Math.floor(i/n),x=i%n;for(let k=0;k<n;k++)if(a[y*n+k]===v||a[k*n+x]===v)return false;const by=y-y%br,bx=x-x%bc;for(let yy=0;yy<br;yy++)for(let xx=0;xx<bc;xx++)if(a[(by+yy)*n+bx+xx]===v)return false;return true;};
 const go=i=>{if(i===n*n)return true;if(a[i])return go(i+1);for(let v=1;v<=n;v++)if(ok(i,v)){a[i]=v;if(go(i+1))return true;a[i]=0;}return false;};return go(0)?a:null;}
// Three steps on a small example: rows, columns, boxes.
function sudokuLesson(n,br,bc){
 const host=C.node?.querySelector('.ch-box');if(!host)return;host.querySelector('.sd-lesson')?.remove();
 const L=mk('div','sd-lesson'),card=mk('div','sd-lesson-card');L.append(card);host.append(L);
 const ex=[1,2,3,4,3,4,1,2,2,1,4,3,4,3,2,1],steps=[
  {t:'가로줄',d:'가로 한 줄에는 1부터 4까지가 한 번씩만 들어갑니다.',hl:i=>Math.floor(i/4)===1},
  {t:'세로줄',d:'세로 한 줄에도 1부터 4까지가 한 번씩만 들어갑니다.',hl:i=>i%4===2},
  {t:'굵은 선 상자',d:'굵은 선으로 묶인 작은 상자 안에도 같은 숫자가 두 번 들어가지 않습니다.',hl:i=>Math.floor(i/4)<2&&i%4<2},
  {t:'이렇게 풀어요',d:'빈칸을 누르고 아래 숫자를 고르세요. 겹치는 숫자는 빨갛게 표시됩니다. 막히면 「힌트」를 누르세요.'+(n===6?' 이 상자는 6×6이라 1부터 6까지, 굵은 선 상자는 2×3입니다.':''),hl:()=>false,blank:[5,10]}];
 let k=0;
 const draw=()=>{const s=steps[k];card.replaceChildren(mk('small','sd-step',(k+1)+' / '+steps.length),mk('strong','',s.t),mk('p','',s.d));
  const g=mk('div','sd-mini');ex.forEach((v,i)=>{const c=mk('span','sd-mini-cell'+(s.hl(i)?' hl':'')+(i%4===1?' edge-r':'')+(Math.floor(i/4)===1?' edge-b':''),s.blank?.includes(i)?'':v);g.append(c);});card.append(g);
  const row=mk('div','ch-tools');if(k>0)row.append(btn('이전',()=>{k--;draw();}));row.append(btn(k<steps.length-1?'다음':'시작하기',()=>{if(k<steps.length-1){k++;SND('page');draw();}else{try{localStorage.setItem('crpg-sudoku-lesson','1');}catch{}L.remove();}},'primary'));card.append(row);};
 draw();
}
// ---------- where chests are seen ----------
// 풍경 보기 (V): puzzle chests and the first hidden ones stand there plainly; night chests only shimmer.
SHELL.sceneryHooks.push((stage,{close:closeView})=>{
 if(!ready())return;
 for(const c of game.chestsHere('SCENERY')){if(c.how!=='SCENERY'&&c.how!=='SCENERY_NIGHT')continue;
  const b=mk('button','scenery-chest tier-'+c.icon+(c.how==='SCENERY_NIGHT'&&!c.unsealed?' night':'')+(c.unsealed?' unsealed':''));b.type='button';b.style.left=c.pos.x+'%';b.style.top=c.pos.y+'%';
  b.setAttribute('aria-label',c.unsealed?c.unsealed.by+' 님이 암호를 풀어낸 '+c.tierName+' 열기':c.how==='SCENERY_NIGHT'?'어둠 속에서 무언가 일렁인다':c.tierName+' 살펴보기');
  if(c.how!=='SCENERY_NIGHT'||c.unsealed){const i=mk('img','');i.src=chestImg(c.icon);i.alt='';i.draggable=false;b.append(i);}
  // 0.16: the name of whoever in the room unsealed it, on the chest.
  if(c.unsealed)b.append(mk('em','scenery-chest-note',c.unsealed.by+' 님이 '+(c.game?'암호를 풀어냈다':'찾아냈다')));
  b.onclick=e=>{e.stopPropagation();closeView();setTimeout(()=>start(c),120);};stage.append(b);}
});
// a small glint used by the hidden chests inside interface screens
function glint(c,cls){const b=mk('button','ch-glint '+cls);b.type='button';b.setAttribute('aria-label','희미하게 반짝이는 무언가');b.onclick=e=>{e.stopPropagation();e.preventDefault();SND('chest_appear');setTimeout(()=>start(c),60);};return b;}
// 페이몬 메뉴
SHELL.menuHooks.push((box,{close:closeMenu})=>{if(!ready())return;const c=game.chestsHere('MENU')[0];if(!c)return;const g=glint(c,'in-menu');g.onclick=e=>{e.stopPropagation();closeMenu();SND('chest_appear');setTimeout(()=>start(c),200);};box.querySelector('.pm-card')?.append(g);});
// The other screens are drawn by many modules; a light watcher adds the glint wherever its screen is open.
const SPOTS=[['SETTINGS','.panel.shell-page-system .shell-page-body,.panel.shell-page-system','in-settings'],['WISH','.wish-screen .wish-banner','in-wish'],['HANDBOOK','.handbook .hb-body','in-handbook'],['BAG','.panel.shell-page-inventory .shell-page-body','in-bag'],['STATUS','.panel.gear-screen .shell-page-body,.panel.gear-screen','in-status']];
let pending=0;
const scan=()=>{pending=0;if(!ready())return;
 for(const [how,sel,cls] of SPOTS){const host=document.querySelector(sel);if(!host)continue;const c=game.chestsHere(how)[0];const have=host.querySelector(':scope > .ch-glint');
  if(!c){have?.remove();continue;}if(!have)host.append(glint(c,cls));}
 // 지도: the travel map shows a shimmer at the chest's spot on the atlas
 const pins=document.querySelector('#journey-map .terrain-pins'),T=window.CRPGTerrainMap,c=game.chestsHere('MAP')[0],have=pins?.querySelector('.ch-ripple');
 if(pins&&T&&c?.spot&&T.atlases?.[c.spot[0]]){const atlas=document.querySelector('#journey-map .terrain-raster')?.getAttribute('src')||'';if(atlas.includes(T.atlases[c.spot[0]].url.split('/').pop())){if(!have){const g=glint(c,'ch-ripple');g.style.left=c.spot[1]/T.width*100+'%';g.style.top=c.spot[2]/T.height*100+'%';pins.append(g);}}else have?.remove();}
 else have?.remove();
};
new MutationObserver(()=>{if(!pending)pending=requestAnimationFrame(scan);}).observe(document.body,{childList:true,subtree:true});
// ---------- the handbook's treasure page ----------
// How many chests each region holds and how many are found. Where they are is for the player to find (user:
// 「보물이 어딨는지 다 알려줘? 그건 안 알려줘도 돼. 몇 개 있고 이런 건 해도 되는데」).
C.journal=function(host){
 if(!ready())return;host.replaceChildren();
 for(const r of game.chestJournal()){
  const s=mk('section','ch-journal'+(r.found===r.total?' complete':''));const h=mk('h3','',r.name+' 보물상자');h.append(mk('small','',' '+r.found+' / '+r.total));s.append(h);
  const bar=mk('div','ch-journal-bar');bar.style.setProperty('--p',(r.found/r.total*100).toFixed(1)+'%');s.append(bar);
  const facts=mk('div','ch-journal-facts');
  const fact=(label,value)=>{const f=mk('div','ch-journal-fact');f.append(mk('small','',label),mk('strong','',value));return f;};
  facts.append(fact('얻은 원석',r.gained+' / '+r.primogem),fact('퍼즐 상자',r.puzzles.found+' / '+r.puzzles.total),fact('숨은 보물',r.hidden.found+' / '+r.hidden.total));
  s.append(facts);
  const tiers=mk('div','ch-journal-tiers');
  for(const t of r.tiers){const d=mk('div','ch-journal-tier'+(t.found===t.total?' done':''));const icon=mk('img','');icon.src=chestImg(t.icon);icon.alt='';d.append(icon,mk('span','',t.name),mk('b','',t.found+' / '+t.total));tiers.append(d);}
  s.append(tiers);
  if(r.found===r.total)s.append(mk('p','ch-journal-done',r.name+'의 보물상자를 모두 찾았습니다.'));
  host.append(s);
 }
};
})();
