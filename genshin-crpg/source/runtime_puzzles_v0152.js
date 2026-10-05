/* 0.15.2 퍼즐 늘리기 (user: 「퍼즐도 종류를 좀 확 늘려서 재미를 붙이게 해줘. 한 수십가지 있어도 좋을 것 같아」). Twenty-three new
 * puzzle games next to the five of the treasure chests, used by the chests and by the regional events. Each game has a
 * maker (from a seeded random stream, so the server makes the same puzzle) and a checker for the answer; Mond is the
 * gentle region (level 1), Liyue the harder one (level 2). The screens are in app_puzzles_v0152.js.
 * Load after runtime_chests_v01415.js: the games join api.chestRules (make, check, games, level). */
(function(root){'use strict';
const api=root.CRPGRuntime,R=api?.chestRules;if(!R?.make||R.make.ROTATE)return;
const shuffle=(list,r)=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=(list,r)=>list[Math.floor(r()*list.length)];
const range=n=>[...Array(n).keys()];
const isInt=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const sameSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const EL=['불','물','얼음','번개','바람','바위','풀'];
const ICONS=['ING_APPLE','ING_SUNSETTIA','ING_SWEET_FLOWER','ING_MUSHROOM','ING_CARROT','ING_MINT','ING_RADISH','ING_PINECONE','ING_BERRY','ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL','ING_FISH','ING_BIRD_EGG','ING_LOTUS_HEAD','ING_BAMBOO_SHOOT'];
const NAMES={ROTATE:'그림 돌리기',PIPES:'원소 회로 잇기',MIRRORS:'빛의 거울',NONOGRAM:'그림 로직',SYMMETRY:'거울 무늬',MEMGRID:'빛의 위치 기억',MINES:'폭발 꽃 찾기',FLOOD:'원소 물들이기',SIMON:'원소 순서 기억',
 MASTERMIND:'원소 암호',DIALS:'연동 다이얼',WORD:'낱말 맞추기',HANOI:'원소 탑 옮기기',QUIZ:'티바트 상식',ODD:'다른 하나 찾기',COUNT:'원소 세기',REACTION:'원소 반응',BALANCE:'저울 맞추기',PAIRS:'짝 맞추기',
 MAZE:'미로 탈출',CONSTELLATION:'별자리 잇기',SHADOW:'그림자 맞추기',LIGHTS_X:'석판 밝히기 · 대각선'};
// ---------- grids ----------
const N4=(n,i)=>{const x=i%n,y=Math.floor(i/n),out=[];if(y>0)out.push(i-n);if(x<n-1)out.push(i+1);if(y<n-1)out.push(i+n);if(x>0)out.push(i-1);return out;};
// 그림 돌리기: picture tiles turned a quarter at a time.
function makeRotate(lv,r){const n=lv===1?3:4;let rot;do{rot=range(n*n).map(()=>Math.floor(r()*4));}while(rot.filter(Boolean).length<Math.ceil(n*n*.6));return {n,rot};}
function rotateOk(p,a){if(!Array.isArray(a)||a.length>500)return false;const s=p.rot.slice();for(const i of a){if(!isInt(i,0,s.length-1))return false;s[i]=(s[i]+1)%4;}return s.every(v=>v===0);}
// 원소 회로: pipes N1 E2 S4 W8; a tile turns clockwise. Energy enters the left of row src and must leave the right of row dst.
const turn=m=>((m<<1)|(m>>3))&15,DIRS=[[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]],OPP={1:4,2:8,4:1,8:2},SHAPES=[3,6,12,9,5,10,7,11,13,14];
function pipePath(n,r){
 for(let tries=0;tries<60;tries++){
  const src=Math.floor(r()*n),dst=Math.floor(r()*n),path=[src*n],seen=new Set(path);let steps=0;
  const dfs=()=>{if(++steps>4000)return false;const c=path[path.length-1],y=Math.floor(c/n),x=c%n;if(x===n-1&&y===dst)return true;
   for(const d of shuffle([0,1,2,3],r)){const ny=y+DIRS[d][0],nx=x+DIRS[d][1],k=ny*n+nx;if(ny<0||ny>=n||nx<0||nx>=n||seen.has(k))continue;seen.add(k);path.push(k);if(dfs())return true;path.pop();seen.delete(k);}return false;};
  if(dfs()&&path.length>=n+1)return {src,dst,path};
 }
 const src=0,dst=0;return {src,dst,path:range(n)};
}
function makePipes(lv,r){
 const n=lv===1?4:5,{src,dst,path}=pipePath(n,r),solved=range(n*n).map(()=>pick(SHAPES,r));
 path.forEach((c,k)=>{const dir=(a,b)=>b===a-n?1:b===a+1?2:b===a+n?4:8,inn=k?dir(c,path[k-1]):8,out=k<path.length-1?dir(c,path[k+1]):2;solved[c]=inn|out;});
 let masks;do{masks=solved.map(m=>{let x=m;for(let t=Math.floor(r()*4);t>0;t--)x=turn(x);return x;});}while(pipesFlow({n,src,dst,masks}));
 return {n,src,dst,masks};
}
function pipesFlow(p){
 const {n,src,dst,masks}=p;if(!(masks[src*n]&8))return false;const seen=new Set([src*n]),q=[src*n];
 while(q.length){const c=q.shift(),y=Math.floor(c/n),x=c%n;if(x===n-1&&y===dst&&(masks[c]&2))return true;
  for(const [dy,dx,bit] of DIRS){if(!(masks[c]&bit))continue;const ny=y+dy,nx=x+dx,k=ny*n+nx;if(ny<0||ny>=n||nx<0||nx>=n||seen.has(k)||!(masks[k]&OPP[bit]))continue;seen.add(k);q.push(k);}}
 return false;
}
function pipesOk(p,a){if(!Array.isArray(a)||a.length>800)return false;const masks=p.masks.slice();for(const i of a){if(!isInt(i,0,masks.length-1))return false;masks[i]=turn(masks[i]);}return pipesFlow({...p,masks});}
// 빛의 거울: a beam enters the left of row `row` heading east; mirrors ('/'=0, '\\'=1) turn it; it must leave at `target`.
function beam(n,row,mirrors){
 const at=new Map(mirrors.map(m=>[m.i,m.s]));let y=row,x=0,dy=0,dx=1,hits=0;
 for(let step=0;step<4*n*n+8;step++){
  if(y<0)return {exit:'N'+x,hits};if(y>=n)return {exit:'S'+x,hits};if(x<0)return {exit:'W'+y,hits};if(x>=n)return {exit:'E'+y,hits};
  const s=at.get(y*n+x);if(s!==undefined){hits++;[dy,dx]=s===0?[-dx,-dy]:[dx,dy];}
  y+=dy;x+=dx;
 }
 return {exit:'LOOP',hits};
}
function makeMirrors(lv,r){
 const n=lv===1?4:5,k=lv===1?4:6;
 for(let tries=0;tries<200;tries++){
  const row=Math.floor(r()*n),cells=shuffle(range(n*n),r).slice(0,k),solution=cells.map(i=>({i,s:Math.floor(r()*2)})),b=beam(n,row,solution);
  if(b.exit==='LOOP'||b.hits<2||b.exit==='E'+row||b.exit==='W'+row)continue;
  for(let t=0;t<20;t++){const mirrors=solution.map(m=>({i:m.i,s:r()<.5?1-m.s:m.s}));if(beam(n,row,mirrors).exit!==b.exit)return {n,row,target:b.exit,mirrors};}
 }
 return {n,row:0,target:'S0',mirrors:[{i:0,s:1},{i:n,s:0}]};
}
function mirrorsOk(p,a){if(!Array.isArray(a)||a.length>400)return false;const ms=p.mirrors.map(m=>({...m}));for(const i of a){const m=ms.find(x=>x.i===i);if(!m)return false;m.s=1-m.s;}return beam(p.n,p.row,ms).exit===p.target;}
// 그림 로직 (nonogram): the clues of every row and column must match.
const runs=line=>{const out=[];let c=0;for(const v of line){if(v)c++;else if(c){out.push(c);c=0;}}if(c)out.push(c);return out.length?out:[0];};
function makeNonogram(lv,r){const n=lv===1?5:6;let g;do{g=range(n*n).map(()=>r()<.58?1:0);}while(range(n).some(y=>!g.slice(y*n,y*n+n).some(Boolean))||range(n).some(x=>!range(n).some(y=>g[y*n+x])));
 return {n,rows:range(n).map(y=>runs(g.slice(y*n,y*n+n))),cols:range(n).map(x=>runs(range(n).map(y=>g[y*n+x])))};}
function nonogramOk(p,a){const n=p.n;if(!Array.isArray(a)||a.length!==n*n||a.some(v=>v!==0&&v!==1))return false;
 const eq=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);return range(n).every(y=>eq(runs(a.slice(y*n,y*n+n)),p.rows[y]))&&range(n).every(x=>eq(runs(range(n).map(y=>a[y*n+x])),p.cols[x]));}
// 거울 무늬: make the right half the mirror image of the left.
function makeSymmetry(lv,r){const h=lv===1?4:5,m=lv===1?3:4;let left,right;do{left=range(h*m).map(()=>r()<.5?1:0);right=range(h*m).map(()=>r()<.5?1:0);}while(left.every(v=>v===left[0])||symmetryOk({h,m,left},right));return {h,m,left,right};}
function symmetryOk(p,a){const {h,m,left}=p;if(!Array.isArray(a)||a.length!==h*m||a.some(v=>v!==0&&v!==1))return false;return range(h).every(y=>range(m).every(x=>a[y*m+x]===left[y*m+(m-1-x)]));}
// 빛의 위치 기억: some cells light up for a moment; press them all.
function makeMemgrid(lv,r){const n=lv===1?4:5,k=lv===1?5:7;return {n,lit:shuffle(range(n*n),r).slice(0,k).sort((a,b)=>a-b),showMs:lv===1?2600:2200};}
const memgridOk=(p,a)=>sameSet(a,p.lit);
// 폭발 꽃 찾기 (minesweeper): mark every exploding flower; the start cell has none around it.
function makeMines(lv,r){
 const n=lv===1?6:7,k=lv===1?5:8;
 for(let t=0;t<100;t++){const bombs=shuffle(range(n*n),r).slice(0,k).sort((a,b)=>a-b),near=i=>{const x=i%n,y=Math.floor(i/n);let c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if((dy||dx)&&yy>=0&&yy<n&&xx>=0&&xx<n&&bombs.includes(yy*n+xx))c++;}return c;};
  const zeros=range(n*n).filter(i=>!bombs.includes(i)&&near(i)===0);if(zeros.length)return {n,bombs,start:pick(zeros,r)};}
 return {n,bombs:[0],start:n*n-1};
}
const minesOk=(p,a)=>sameSet(a,p.bombs);
// 원소 물들이기 (flood-it): from the top-left cell, colour the whole board within the move limit.
function floodStep(n,g,c){const from=g[0];if(from===c)return g;const out=g.slice(),seen=new Set([0]),q=[0];while(q.length){const i=q.shift();out[i]=c;for(const k of N4(n,i))if(!seen.has(k)&&g[k]===from){seen.add(k);q.push(k);}}return out;}
const floodRegion=(n,g)=>{const seen=new Set([0]),q=[0];while(q.length){const i=q.shift();for(const k of N4(n,i))if(!seen.has(k)&&g[k]===g[0]){seen.add(k);q.push(k);}}return seen.size;};
function floodGreedy(n,colors,g){let moves=0;while(!g.every(v=>v===g[0])&&moves<200){let best=null,size=-1;for(let c=0;c<colors;c++){if(c===g[0])continue;const s=floodRegion(n,floodStep(n,g,c));if(s>size){size=s;best=c;}}g=floodStep(n,g,best);moves++;}return moves;}
function makeFlood(lv,r){const n=lv===1?6:7,colors=lv===1?4:5,grid=range(n*n).map(()=>Math.floor(r()*colors));return {n,colors,grid,limit:floodGreedy(n,colors,grid.slice())+(lv===1?2:1)};}
function floodOk(p,a){if(!Array.isArray(a)||a.length>p.limit)return false;let g=p.grid.slice();for(const c of a){if(!isInt(c,0,p.colors-1))return false;g=floodStep(p.n,g,c);}return g.every(v=>v===g[0]);}
// ---------- sequences ----------
function makeSimon(lv,r){return {seq:range(lv===1?5:7).map(()=>Math.floor(r()*EL.length)),showMs:lv===1?750:600};}
const simonOk=(p,a)=>Array.isArray(a)&&a.length===p.seq.length&&a.every((v,i)=>v===p.seq[i]);
// 원소 암호 (mastermind): four elements; every guess tells how many are right and in place, and right but elsewhere.
function makeMastermind(lv,r){const k=lv===1?5:6;return {k,len:4,max:lv===1?8:7,code:shuffle(range(k),r).slice(0,4)};}
function mastermindOk(p,a){if(!Array.isArray(a)||!a.length||a.length>p.max)return false;if(a.some(g=>!Array.isArray(g)||g.length!==p.len||g.some(v=>!isInt(v,0,p.k-1))))return false;const last=a[a.length-1];return last.every((v,i)=>v===p.code[i]);}
// 연동 다이얼: turning a dial also turns the next one; set every dial to its first mark.
function makeDials(lv,r){const d=lv===1?4:5,base=6,v=range(d).map(()=>0);for(let t=0;t<(lv===1?6:9);t++){const i=Math.floor(r()*d);v[i]=(v[i]+1)%base;v[(i+1)%d]=(v[(i+1)%d]+1)%base;}if(v.every(x=>x===0))v[0]=1,v[1]=1;return {d,base,values:v};}
function dialsOk(p,a){if(!Array.isArray(a)||a.length>400)return false;const v=p.values.slice();for(const i of a){if(!isInt(i,0,p.d-1))return false;v[i]=(v[i]+1)%p.base;v[(i+1)%p.d]=(v[(i+1)%p.d]+1)%p.base;}return v.every(x=>x===0);}
// 낱말 맞추기: put the syllables of a Teyvat word in order.
const WORDS=[['몬드성','바람의 나라의 수도'],['리월항','바위의 나라의 항구 도시'],['바르바토스','몬드를 지키는 바람의 신'],['모락스','리월을 세운 바위의 신'],['페보니우스','몬드의 질서를 지키는 기사단의 이름'],['모험가길드','캐서린이 의뢰를 받는 곳'],
 ['나선비경','달마다 시즌이 바뀌는 도전'],['원소폭발','동료의 가장 강한 기술'],['층암거연','리월의 깊은 광산 지대'],['절운간','선인들이 머무는 리월의 산'],['망서객잔','소가 머무는 리월의 객잔'],['천형산','리월항 곁의 산'],
 ['유리백합','리월에서 나는 푸른 꽃'],['통통연꽃','몬드의 물가에서 자라는 꽃'],['달콤달콤꽃','몬드의 들판에 피는 꽃'],['일몰열매','몬드의 나무 열매'],['보물사냥단','상자를 노리는 무리'],['우인단','스네즈나야의 사절단'],
 ['다이루크','와이너리의 주인'],['엠버','토끼 백작과 함께하는 정찰 기사'],['케이아','페보니우스 기사단의 기병대장'],['바바라','몬드의 아이돌'],['알베도','기사단의 연금술사'],['로자리아','페보니우스 성당의 수녀'],
 ['설탕','알베도의 조수'],['디오나','캣테일의 바텐더'],['노엘','기사단의 메이드 기사'],['피슬','어둠의 나라에서 온 공주'],['레이저','늑대들과 자란 소년'],['응광','리월 칠성의 천권'],
 ['각청','리월 칠성의 옥형'],['감우','리월 칠성의 비서'],['향릉','만민당의 요리사'],['행추','비운 상회의 둘째 도련님'],['호두','왕생당의 당주'],['북두','남십자 함대의 선장'],
 ['백출','불복려의 의사'],['신학','선인을 스승으로 둔 퇴마사'],['운근','운한사의 배우'],['요요','작은 선인의 제자'],['드발린','몬드를 지키던 바람의 용'],['안드리우스','울프 영지의 늑대 왕'],
 ['야타용왕','리월 땅속에 잠든 바위 용'],['신의눈동자','신상에 바치는 원소의 결정'],['슬라임','어디서나 통통 튀는 마물'],['츄츄족','가면을 쓴 들판의 무리'],['페이몬','여행자의 최고의 길잡이'],['캐서린','모험가 길드의 접수원']];
// A word of one repeated syllable (요요) cannot be scrambled, so it is left out.
function makeWord(lv,r){const pool=WORDS.filter(([w])=>new Set([...w]).size>1&&(lv===1?[...w].length<=4:[...w].length>=4)),[word,hint]=pick(pool,r),s=[...word];let tiles,tries=0;do{tiles=shuffle(s,r);}while(tiles.join('')===word&&++tries<50);return {word,hint,tiles};}
function wordOk(p,a){if(!Array.isArray(a)||a.length!==p.tiles.length||new Set(a).size!==a.length||a.some(i=>!isInt(i,0,p.tiles.length-1)))return false;return a.map(i=>p.tiles[i]).join('')===p.word;}
// 원소 탑 옮기기 (tower of Hanoi).
function makeHanoi(lv){return {n:lv===1?3:4};}
function hanoiOk(p,a){if(!Array.isArray(a)||a.length>300)return false;const pegs=[range(p.n).reverse(),[],[]];for(const m of a){if(!Array.isArray(m)||m.length!==2||!isInt(m[0],0,2)||!isInt(m[1],0,2)||m[0]===m[1])return false;const from=pegs[m[0]],to=pegs[m[1]];if(!from.length||(to.length&&to[to.length-1]<from[from.length-1]))return false;to.push(from.pop());}return pegs[2].length===p.n;}
// ---------- choices ----------
const QUIZ=[['몬드를 지키는 바람의 신의 이름은?','바르바토스','모락스','바알','부에르'],['리월을 세운 바위의 신의 이름은?','모락스','바르바토스','바알','마르바스'],['몬드의 질서를 지키는 기사단은?','페보니우스 기사단','천암군','우인단','보물 사냥단'],
 ['리월을 다스리는 일곱 상인의 모임은?','리월 칠성','페보니우스 기사단','도금 여단','보물 사냥단'],['모험가 길드에서 의뢰를 받아 주는 사람은?','캐서린','사라','엘라','마리'],['물 원소와 번개 원소가 만나면 일어나는 반응은?','감전','증발','융해','결정'],
 ['불 원소와 얼음 원소가 만나면 일어나는 반응은?','융해','과부하','빙결','개화'],['물 원소와 얼음 원소가 만나면 일어나는 반응은?','빙결','감전','연소','확산'],['불 원소와 번개 원소가 만나면 일어나는 반응은?','과부하','초전도','증발','활성'],
 ['얼음 원소와 번개 원소가 만나면 일어나는 반응은?','초전도','과부하','융해','빙결'],['물 원소와 불 원소가 만나면 일어나는 반응은?','증발','융해','감전','개화'],['바람 원소가 다른 원소를 퍼뜨리는 반응은?','확산','결정','연소','감전'],
 ['바위 원소가 다른 원소와 만나 보호막 조각을 만드는 반응은?','결정','확산','빙결','개화'],['풀 원소와 불 원소가 만나면 일어나는 반응은?','연소','개화','활성','증발'],['풀 원소와 물 원소가 만나면 일어나는 반응은?','개화','연소','감전','빙결'],
 ['다운 와이너리의 주인은?','다이루크','케이아','진','알베도'],['페보니우스 기사단의 대리 단장은?','진','리사','엠버','노엘'],['토끼 백작과 함께 다니는 정찰 기사는?','엠버','피슬','디오나','노엘'],
 ['페보니우스 기사단 도서관의 사서는?','리사','바바라','로자리아','설탕'],['페보니우스 기사단의 메이드 기사는?','노엘','진','엠버','유라'],['페보니우스 기사단의 기병대장은?','케이아','진','다이루크','레이저'],
 ['리월 칠성의 「천권」은?','응광','각청','감우','연비'],['리월 칠성의 「옥형」은?','각청','응광','감우','북두'],['왕생당의 77대 당주는?','호두','종려','행추','향릉'],['남십자 함대를 이끄는 선장은?','북두','응광','요요','운근'],
 ['만민당의 요리사는?','향릉','신염','행추','연비'],['비운 상회의 둘째 도련님은?','행추','중운','소','백출'],['망서 객잔에 머무는 항마대성은?','소','종려','신학','감우'],['불복려의 의사는?','백출','치치','호두','요요'],
 ['치치가 일하는 곳은?','불복려','왕생당','만민당','남십자 함대'],['몬드의 수도 이름은?','몬드성','리월항','이나즈마성','폰타인'],['폭풍의 용이라 불리던 몬드의 용은?','드발린','안드리우스','야타용왕','오셀'],
 ['늑대 왕 안드리우스가 지키는 곳은?','울프 영지','절운간','망서 객잔','층암거연'],['야타용왕이 잠든 나라는?','리월','몬드','이나즈마','수메르'],['레이저가 늑대들과 함께 자란 곳은?','울프 영지','속삭임의 숲','별이 떨어지는 호수','와이너리'],
 ['드래곤 스파인은 어떤 곳인가?','눈 덮인 산','모래 사막','바다 위 섬','불타는 화산'],['원석 160개로 바꿀 수 있는 것은?','인연 1개','모라 160','스타라이트 1개','영웅의 경험 1개'],['나선비경 시즌이 바뀌는 때는?','매달 1일 0시','매주 월요일','매일 자정','해마다 1월'],
 ['신의 눈동자를 바치는 곳은?','일곱신상','모험가 길드','와이너리','대장간']];
function makeQuiz(lv,r){const qs=shuffle(QUIZ,r).slice(0,lv===1?3:4);const questions=[],answers=[];for(const [q,...opts] of qs){const order=shuffle(range(4),r);questions.push({q,choices:order.map(i=>opts[i])});answers.push(order.indexOf(0));}return {questions,answers};}
const quizOk=(p,a)=>Array.isArray(a)&&a.length===p.answers.length&&a.every((v,i)=>v===p.answers[i]);
// 다른 하나 찾기: one picture among many is turned, bigger or recoloured (a mirrored one could look the same).
function makeOdd(lv,r){return {rounds:range(lv===1?3:4).map(()=>{const size=lv===1?16:25;return {size,icon:pick(ICONS,r),odd:Math.floor(r()*size),kind:pick(['turn','size','hue'],r),amount:lv===1?40+Math.floor(r()*40):18+Math.floor(r()*20)};})};}
const oddOk=(p,a)=>Array.isArray(a)&&a.length===p.rounds.length&&a.every((v,i)=>v===p.rounds[i].odd);
// 원소 세기: count one element among many.
function makeCount(lv,r){return {rounds:range(3).map(()=>{const n=lv===1?20:30,cells=range(n).map(()=>Math.floor(r()*(lv===1?4:6))),target=cells[Math.floor(r()*n)];return {cells,target,answer:cells.filter(c=>c===target).length};})};}
const countOk=(p,a)=>Array.isArray(a)&&a.length===p.rounds.length&&a.every((v,i)=>v===p.rounds[i].answer);
// 원소 반응: which reaction two elements make, and which two elements make a reaction.
const REACTIONS=[['물','불','증발'],['불','얼음','융해'],['불','번개','과부하'],['물','번개','감전'],['물','얼음','빙결'],['얼음','번개','초전도'],['풀','불','연소'],['풀','물','개화'],['풀','번개','활성']];
function makeReaction(lv,r){return {rounds:shuffle(REACTIONS,r).slice(0,lv===1?4:5).map(([a,b,x],i)=>{
 if(i%2===0){const wrong=shuffle(REACTIONS.filter(t=>t[2]!==x).map(t=>t[2]),r).slice(0,3),choices=shuffle([x,...wrong],r);return {q:a+' 원소 + '+b+' 원소 → ?',choices,answer:choices.indexOf(x)};}
 const pair=a+' + '+b,wrong=shuffle(REACTIONS.filter(t=>t[2]!==x).map(t=>t[0]+' + '+t[1]),r).slice(0,3),choices=shuffle([pair,...wrong],r);return {q:'「'+x+'」은(는) 어떤 두 원소가 만나서 일어날까?',choices,answer:choices.indexOf(pair)};})};}
const reactionOk=(p,a)=>Array.isArray(a)&&a.length===p.rounds.length&&a.every((v,i)=>v===p.rounds[i].answer);
// 저울 맞추기: put weights on the scale until it balances the target.
function makeBalance(lv,r){const n=lv===1?5:6,weights=range(n).map(()=>1+Math.floor(r()*9)),k=lv===1?2:3,use=shuffle(range(n),r).slice(0,k);return {weights,target:use.reduce((s,i)=>s+weights[i],0)};}
function balanceOk(p,a){if(!Array.isArray(a)||!a.length||new Set(a).size!==a.length||a.some(i=>!isInt(i,0,p.weights.length-1)))return false;return a.reduce((s,i)=>s+p.weights[i],0)===p.target;}
// 짝 맞추기 (memory cards).
function makePairs(lv,r){const k=lv===1?6:8;return {icons:shuffle([...shuffle(ICONS,r).slice(0,k),...[]].flatMap(x=>[x,x]),r)};}
function pairsOk(p,a){if(!Array.isArray(a)||a.length!==p.icons.length/2)return false;const used=new Set();for(const m of a){if(!Array.isArray(m)||m.length!==2)return false;const [i,j]=m;if(!isInt(i,0,p.icons.length-1)||!isInt(j,0,p.icons.length-1)||i===j||used.has(i)||used.has(j)||p.icons[i]!==p.icons[j])return false;used.add(i);used.add(j);}return used.size===p.icons.length;}
// 미로 탈출: walls between cells; walk from the top-left cell to the bottom-right one. open: N1 E2 S4 W8.
function makeMaze(lv,r){const m=lv===1?6:8,open=range(m*m).map(()=>0),seen=new Set([0]),stack=[0];
 while(stack.length){const c=stack[stack.length-1],y=Math.floor(c/m),x=c%m,next=shuffle(DIRS.map(([dy,dx,bit])=>[y+dy,x+dx,bit]).filter(([yy,xx])=>yy>=0&&yy<m&&xx>=0&&xx<m&&!seen.has(yy*m+xx)),r);
  if(!next.length){stack.pop();continue;}const [yy,xx,bit]=next[0],k=yy*m+xx;open[c]|=bit;open[k]|=OPP[bit];seen.add(k);stack.push(k);}
 return {m,open};}
function mazeOk(p,a){if(!Array.isArray(a)||a.length>600)return false;let c=0;const m=p.m;for(const d of a){if(!isInt(d,0,3))return false;const [dy,dx,bit]=DIRS[d];if(!(p.open[c]&bit))return false;c=(Math.floor(c/m)+dy)*m+(c%m)+dx;}return c===m*m-1;}
// 별자리 잇기: draw the constellation shown in the mirror, the right way round.
function makeConstellation(lv,r){const k=lv===1?6:8,stars=[];let guard=0;
 while(stars.length<k&&guard++<500){const s={x:10+Math.floor(r()*80),y:12+Math.floor(r()*76)};if(stars.every(t=>Math.hypot(t.x-s.x,t.y-s.y)>=18))stars.push(s);}
 while(stars.length<k)stars.push({x:10+stars.length*10,y:50});
 const order=shuffle(range(k),r),edges=order.slice(1).map((v,i)=>[order[i],v].sort((a,b)=>a-b));
 if(lv===2){for(let t=0;t<20;t++){const e=[Math.floor(r()*k),Math.floor(r()*k)].sort((a,b)=>a-b);if(e[0]!==e[1]&&!edges.some(x=>x[0]===e[0]&&x[1]===e[1])){edges.push(e);break;}}}
 return {stars,edges};}
function constellationOk(p,a){if(!Array.isArray(a)||a.length!==p.edges.length)return false;const key=e=>Array.isArray(e)&&e.length===2&&e.every(v=>isInt(v,0,p.stars.length-1))&&e[0]!==e[1]?Math.min(...e)+'-'+Math.max(...e):null;
 const want=new Set(p.edges.map(key)),got=a.map(key);return !got.includes(null)&&new Set(got).size===got.length&&got.every(k=>want.has(k));}
// 그림자 맞추기: which silhouette is exactly the picture. The wrong ones are turned a quarter (a mirror image or a half turn
// of a symmetric picture would look just like it).
function makeShadow(lv,r){return {rounds:range(3).map(()=>{const right={turn:0,flip:false},fakes=shuffle([{turn:90,flip:false},{turn:270,flip:false},{turn:90,flip:true},{turn:270,flip:true}],r).slice(0,3),options=shuffle([right,...fakes],r);return {icon:pick(ICONS,r),options,answer:options.indexOf(right),scale:lv===1?1:.8};})};}
const shadowOk=(p,a)=>Array.isArray(a)&&a.length===p.rounds.length&&a.every((v,i)=>v===p.rounds[i].answer);
// 석판 밝히기 · 대각선: a press turns the slab and its four diagonal neighbours.
const diag=(n,i)=>{const x=i%n,y=Math.floor(i/n),out=[];for(const [dy,dx] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<n&&xx>=0&&xx<n)out.push(yy*n+xx);}return out;};
const pressX=(n,s,i)=>{for(const k of [i,...diag(n,i)])s[k]^=1;};
function makeLightsX(lv,r){const n=lv===1?3:4;let state;do{state=range(n*n).map(()=>1);for(const i of shuffle(range(n*n),r).slice(0,lv===1?3:5))pressX(n,state,i);}while(state.every(v=>v===1));return {n,state};}
function lightsXOk(p,a){if(!Array.isArray(a)||a.length>120)return false;const s=p.state.slice();for(const i of a){if(!isInt(i,0,s.length-1))return false;pressX(p.n,s,i);}return s.every(v=>v===1);}
// ---------- join the chest games ----------
const MAKE={ROTATE:makeRotate,PIPES:makePipes,MIRRORS:makeMirrors,NONOGRAM:makeNonogram,SYMMETRY:makeSymmetry,MEMGRID:makeMemgrid,MINES:makeMines,FLOOD:makeFlood,SIMON:makeSimon,MASTERMIND:makeMastermind,DIALS:makeDials,
 WORD:makeWord,HANOI:makeHanoi,QUIZ:makeQuiz,ODD:makeOdd,COUNT:makeCount,REACTION:makeReaction,BALANCE:makeBalance,PAIRS:makePairs,MAZE:makeMaze,CONSTELLATION:makeConstellation,SHADOW:makeShadow,LIGHTS_X:makeLightsX};
const CHECK={ROTATE:rotateOk,PIPES:pipesOk,MIRRORS:mirrorsOk,NONOGRAM:nonogramOk,SYMMETRY:symmetryOk,MEMGRID:memgridOk,MINES:minesOk,FLOOD:floodOk,SIMON:simonOk,MASTERMIND:mastermindOk,DIALS:dialsOk,
 WORD:wordOk,HANOI:hanoiOk,QUIZ:quizOk,ODD:oddOk,COUNT:countOk,REACTION:reactionOk,BALANCE:balanceOk,PAIRS:pairsOk,MAZE:mazeOk,CONSTELLATION:constellationOk,SHADOW:shadowOk,LIGHTS_X:lightsXOk};
Object.assign(R.make,MAKE);Object.assign(R.check,CHECK);Object.assign(R.games,NAMES);
for(const g of Object.keys(MAKE)){R.level.MOND[g]=1;R.level.LIYUE[g]=2;}
R.puzzleV0152={games:Object.keys(MAKE),elements:EL.slice(),icons:ICONS.slice(),words:WORDS.length,quiz:QUIZ.length,pipes:{turn,flow:pipesFlow},beam,runs,floodStep};
})(globalThis);
