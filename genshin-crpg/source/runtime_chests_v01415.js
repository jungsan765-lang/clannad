/* 0.14.15 보물상자. User: 「보물상자를 만들 때가 됐어. 원석도 조금(적당히). 몬드는 쉬운 편, 몇 개는 숨기고 나머지는
 * 미니게임 퍼즐(틀린그림 찾기, 그림 퍼즐, 스도쿠…). 처음에는 V로 보면 바로 찾을 수 있게, 나중에는 V만으로는 볼 수 없게.
 * 진짜 구석구석 숨겨 — 지도의 일그러짐, 페이몬 메뉴, 기원, 설정… 어느 장소에 있을 때만 보이게.」
 *  - 퍼즐 상자 (몬드 18, 리월 18): 그 장소의 풍경(V)에 보이고, 미니게임을 풀면 열린다. 몬드는 쉬운 판, 리월은 어려운 판.
 *  - 숨은 상자 (몬드 6, 리월 6): 처음 두 개는 풍경(V)에 그대로 보이고, 나머지는 밤에만 보이거나, 그 장소에 서 있을 때만
 *    지도·페이몬 메뉴·설정·기원·핸드북·가방·캐릭터 화면 한구석에 나타난다.
 * 원석은 몬드 580, 리월 690 (모두 1,270, 기원 약 8회). 2.0 레이드 보상을 위해 이보다 늘리지 않는다.
 * 퍼즐은 상자와 여정마다 다른 씨앗으로 만들어지고, 서버가 같은 규칙으로 답을 확인한다. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['actionReason','apply','validateSave','newGame'].map(k=>[k,P[k]]));
const TIER={COMMON:{name:'평범한 보물상자',icon:'common'},EXQUISITE:{name:'정교한 보물상자',icon:'exquisite'},LUXURIOUS:{name:'화려한 보물상자',icon:'luxurious'}};
const GAME={SPOT:'틀린 그림 찾기',SWAP:'그림 맞추기',SLIDE:'밀어서 그림 맞추기',SUDOKU:'스도쿠',LIGHTS:'석판 밝히기'};
const HOW={SCENERY:'풍경',SCENERY_NIGHT:'밤 풍경',MENU:'페이몬 메뉴',MAP:'지도',SETTINGS:'설정',WISH:'기원',HANDBOOK:'모험가 핸드북',BAG:'가방',STATUS:'캐릭터 화면'};
// Puzzle sizes: Mond is the gentle region, Liyue the harder one.
const LEVEL={MOND:{SPOT:3,SWAP:3,SUDOKU:4,LIGHTS:3},LIYUE:{SPOT:5,SLIDE:3,SUDOKU:6,LIGHTS:4}};
const M_ITEMS=[{MAT_CHAR_EXP_ADVENTURER:1},{ORE_WHITE_IRON:2},{ORE_CRYSTAL:1}],L_ITEMS=[{MAT_CHAR_EXP_ADVENTURER:2},{ORE_CRYSTAL:2},{MAT_CHAR_EXP_HERO:1}];
const puzzle=(region,list)=>list.map(([map,game],i)=>({region,map,game,tier:'EXQUISITE',how:'SCENERY',reward:region==='MOND'?{primogem:20,mora:1200,items:M_ITEMS[i%3]}:{primogem:25,mora:2000,items:L_ITEMS[i%3]}}));
const MOND_PUZZLES=puzzle('MOND',[['MAP_MOND_CITY','SPOT'],['MAP_MOND_PLAINS','SWAP'],['MAP_MOND_FOREST','SUDOKU'],['MAP_MOND_WINDRISE','LIGHTS'],['MAP_MOND_SPRINGVALE','SPOT'],['MAP_MOND_WOLVENDOM','SWAP'],
 ['MAP_MOND_DAWN_WINERY','SUDOKU'],['MAP_CRPG_STARFELL_LAKE','LIGHTS'],['MAP_MOND_THOUSAND_WINDS','SPOT'],['MAP_CRPG_STORMBEARER_MOUNTAINS','SWAP'],['MAP_CRPG_FALCON_COAST','SUDOKU'],['MAP_CRPG_DADAUPA_GORGE','LIGHTS'],
 ['MAP_CRPG_CAPE_OATH','SPOT'],['MAP_CRPG_BRIGHTCROWN_CANYON','SWAP'],['MAP_CRPG_DRAGONSPINE_CAMP','SUDOKU'],['MAP_CRPG_SNOW_COVERED_PATH','LIGHTS'],['MAP_CRPG_WYRMREST_VALLEY','SPOT'],['MAP_CRPG_STARGLOW_CAVERN','SWAP']]);
const LIYUE_PUZZLES=puzzle('LIYUE',[['MAP_LIYUE_HARBOR','SPOT'],['MAP_LIYUE_PLAINS','SLIDE'],['MAP_LIYUE_MOUNTAINS','SUDOKU'],['MAP_LIYUE_QINGCE','LIGHTS'],['MAP_LIYUE_JUEYUN','SPOT'],['MAP_CHASM_SURFACE','SLIDE'],
 ['MAP_LY_DETAIL_FEIYUN','SUDOKU'],['MAP_LY_DETAIL_YUJING','LIGHTS'],['MAP_LY_DETAIL_WANGSHU','SPOT'],['MAP_LY_DETAIL_DIHUA','SLIDE'],['MAP_LY_DETAIL_GUILI','SUDOKU'],['MAP_LY_DETAIL_MINGYUN','LIGHTS'],
 ['MAP_LY_DETAIL_LUHUA','SPOT'],['MAP_LY_DETAIL_AOCANG','SLIDE'],['MAP_LY_DETAIL_QINGYUN','SUDOKU'],['MAP_LY_DETAIL_HUAGUANG','LIGHTS'],['MAP_LY_DETAIL_TIANHENG','SPOT'],['MAP_LY_DETAIL_GUYUN','SLIDE']]);
// Hidden chests. The game never says where they are (user: 「보물이 어딨는지 다 알려줘? 그건 안 알려줘도 돼」).
// `spot` places the map shimmer on the region atlas (source/terrain_map.js coordinates).
const hidden=(region,map,how,tier,primogem,extra={})=>({region,map,game:null,tier,how,reward:{primogem,mora:region==='MOND'?2500:4000,items:region==='MOND'?{MAT_CHAR_EXP_HERO:1}:{MAT_CHAR_EXP_HERO:2}},...extra});
const MOND_HIDDEN=[
 hidden('MOND','MAP_CRPG_CIDER_BANK','SCENERY','COMMON',30),
 hidden('MOND','MAP_CRPG_WHISPER_HUNT','SCENERY','COMMON',30),
 hidden('MOND','MAP_MOND_STARSNATCH_CLIFF','SCENERY_NIGHT','LUXURIOUS',40),
 hidden('MOND','MAP_MOND_WINDRISE','MENU','LUXURIOUS',40),
 hidden('MOND','MAP_CRPG_CAPE_OATH','MAP','LUXURIOUS',40,{spot:['mond',716,566]}),
 hidden('MOND','MAP_CRPG_SPRING_POOL','SETTINGS','LUXURIOUS',40)];
const LIYUE_HIDDEN=[
 hidden('LIYUE','MAP_LIYUE_HARBOR','WISH','LUXURIOUS',40,{night:true}),
 hidden('LIYUE','MAP_LY_DETAIL_YAOGUANG','HANDBOOK','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_QINGXU','MAP','LUXURIOUS',40,{spot:['liyue',244,712]}),
 hidden('LIYUE','MAP_LY_DETAIL_NANTIANMEN','BAG','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_DUNYU','STATUS','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_TIANQIU','SCENERY_NIGHT','LUXURIOUS',40)];
const CHESTS=[...MOND_PUZZLES.map((c,i)=>({...c,id:'CHEST_M'+String(i+1).padStart(2,'0')})),...MOND_HIDDEN.map((c,i)=>({...c,id:'CHEST_M'+String(i+19)})),
 ...LIYUE_PUZZLES.map((c,i)=>({...c,id:'CHEST_L'+String(i+1).padStart(2,'0')})),...LIYUE_HIDDEN.map((c,i)=>({...c,id:'CHEST_L'+String(i+19)}))];
const BY_ID=new Map(CHESTS.map(c=>[c.id,c]));
// ---------- deterministic randomness ----------
function hash(str){let h=2166136261;for(const ch of String(str)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(list,r)=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// Where a chest sits in the panorama (percent of the picture): low enough to stand on the ground.
const place=c=>{const h=hash(c.id+':place');return {x:12+h%74,y:64+(h>>>8)%20};};
// ---------- the four games ----------
const BOX={4:[2,2],6:[2,3]};
function makeSudoku(n,r){
 const [br,bc]=BOX[n],grid=[];
 for(let y=0;y<n;y++){const row=[];for(let x=0;x<n;x++)row.push((bc*(y%br)+Math.floor(y/br)+x)%n);grid.push(row);}
 const bands=shuffle([...Array(n/br).keys()],r),stacks=shuffle([...Array(n/bc).keys()],r);
 const rows=bands.flatMap(b=>shuffle([...Array(br).keys()],r).map(i=>b*br+i)),cols=stacks.flatMap(s=>shuffle([...Array(bc).keys()],r).map(i=>s*bc+i)),digits=shuffle([...Array(n).keys()],r);
 const solution=rows.map(y=>cols.map(x=>digits[grid[y][x]]+1)).flat();
 const blanks=n===4?9:20,hide=new Set(shuffle([...Array(n*n).keys()],r).slice(0,blanks));
 return {n,box:[br,bc],givens:solution.map((v,i)=>hide.has(i)?0:v)};
}
function sudokuOk(p,answer){
 const {n,box:[br,bc],givens}=p;if(!Array.isArray(answer)||answer.length!==n*n)return false;
 if(answer.some((v,i)=>!Number.isInteger(v)||v<1||v>n||givens[i]&&givens[i]!==v))return false;
 const ok=cells=>new Set(cells.map(i=>answer[i])).size===n;
 for(let k=0;k<n;k++){if(!ok([...Array(n).keys()].map(x=>k*n+x))||!ok([...Array(n).keys()].map(y=>y*n+k)))return false;}
 for(let by=0;by<n;by+=br)for(let bx=0;bx<n;bx+=bc){const cells=[];for(let y=0;y<br;y++)for(let x=0;x<bc;x++)cells.push((by+y)*n+bx+x);if(!ok(cells))return false;}
 return true;
}
function makeSwap(n,r){let board;do{board=shuffle([...Array(n*n).keys()],r);}while(board.filter((v,i)=>v!==i).length<Math.min(6,n*n-2));return {n,board};}
function swapOk(p,answer){
 if(!Array.isArray(answer)||answer.length>80)return false;const b=p.board.slice();
 for(const m of answer){if(!Array.isArray(m)||m.length!==2)return false;const [i,j]=m;if(![i,j].every(k=>Number.isInteger(k)&&k>=0&&k<b.length)||i===j)return false;[b[i],b[j]]=[b[j],b[i]];}
 return b.every((v,i)=>v===i);
}
const neighbours=(n,i)=>{const x=i%n,y=Math.floor(i/n),out=[];if(x>0)out.push(i-1);if(x<n-1)out.push(i+1);if(y>0)out.push(i-n);if(y<n-1)out.push(i+n);return out;};
function makeSlide(n,r){
 // Random legal moves from the solved picture, so the scramble can always be undone.
 const N=n*n;let board,tries=0;
 do{board=[...Array(N).keys()];let blank=N-1,prev=-1;for(let k=0;k<70;k++){const opts=neighbours(n,blank).filter(i=>i!==prev);const pick=opts[Math.floor(r()*opts.length)];board[blank]=board[pick];board[pick]=N-1;prev=blank;blank=pick;}tries++;}
 while(board.reduce((d,v,i)=>v===N-1?d:d+Math.abs(v%n-i%n)+Math.abs(Math.floor(v/n)-Math.floor(i/n)),0)<8&&tries<20);
 return {n,board};
}
function slideOk(p,answer){
 if(!Array.isArray(answer)||answer.length>400)return false;const n=p.n,N=n*n,b=p.board.slice();
 for(const i of answer){if(!Number.isInteger(i)||i<0||i>=N)return false;const blank=b.indexOf(N-1);if(!neighbours(n,blank).includes(i))return false;b[blank]=b[i];b[i]=N-1;}
 return b.every((v,i)=>v===i);
}
const press=(n,state,i)=>{for(const k of [i,...neighbours(n,i)])state[k]^=1;};
function makeLights(n,r){
 let state;do{state=Array(n*n).fill(1);for(const i of shuffle([...Array(n*n).keys()],r).slice(0,n===3?3:5))press(n,state,i);}while(state.every(v=>v===1));
 return {n,state};
}
function lightsOk(p,answer){if(!Array.isArray(answer)||answer.length>80)return false;const s=p.state.slice();for(const i of answer){if(!Number.isInteger(i)||i<0||i>=s.length)return false;press(p.n,s,i);}return s.every(v=>v===1);}
// Changes that look like part of the scene: an object that was not there, a mirrored piece, a recoloured piece. They sit
// in the lower part of the picture (land, roofs, water), not in the open sky where any change looks like a stain.
// Mond (3) is meant to be easy. Liyue (5) is subtle (user: 「틀린그림 찾기가 너무 쉬운데… 몬드는 이 정도가 맞을지도」):
// smaller pieces, a slight colour shift, small faded objects.
const SPOT_KINDS=['icon','flip','hue'];
function makeSpot(count,r){
 const subtle=count>3,cells=shuffle([...Array(24).keys()],r).slice(0,count),kinds=[...shuffle(SPOT_KINDS,r),...shuffle(SPOT_KINDS,r)];
 return {count,subtle,radius:subtle?4.5:7,diffs:cells.map((cell,i)=>({x:Math.round(10+(cell%6)*15.5+r()*6),y:Math.round(40+Math.floor(cell/6)*14+r()*5),kind:kinds[i%kinds.length],turn:subtle?35+Math.floor(r()*55):60+Math.floor(r()*240),icon:Math.floor(r()*1000)}))};
}
function spotOk(p,answer){return Array.isArray(answer)&&answer.length===p.count&&new Set(answer).size===p.count&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<p.count);}
const MAKE={SUDOKU:makeSudoku,SWAP:makeSwap,SLIDE:makeSlide,LIGHTS:makeLights,SPOT:makeSpot},CHECK={SUDOKU:sudokuOk,SWAP:swapOk,SLIDE:slideOk,LIGHTS:lightsOk,SPOT:spotOk};
api.chestRules={version:1,tiers:TIER,games:GAME,hows:HOW,chests:CHESTS.map(c=>({...c,reward:{...c.reward,items:{...c.reward.items}}})),check:CHECK};
// ---------- state ----------
P.chestState=function(){return this.s.chests??={version:1,opened:{}};};
P.chestOpened=function(id){return !!this.s.chests?.opened?.[id];};
P.chestNight=function(){const h=Number(String(this.s.global.WORLD_TIME||'12:00').split(':')[0]);return h>=19||h<5;};
P.chestPuzzle=function(id){
 const c=BY_ID.get(id);if(!c?.game)return null;const r=rng(hash(id+'|'+(this.s.global.SAVE_ID||'save'))),size=LEVEL[c.region][c.game];
 return {id,game:c.game,name:GAME[c.game],region:c.region,...MAKE[c.game](size,r)};
};
// Why the chest cannot be opened now ('' = it can).
P.chestReason=function(id){
 const c=BY_ID.get(id);if(!c)return '보물상자를 찾을 수 없습니다.';if(this.chestOpened(id))return '이미 연 보물상자입니다.';
 if(this.s.runtime||this.s.battlePreparation||(this.playPhase?.()||'FREE')!=='FREE')return '이야기나 전투를 마친 뒤 열 수 있습니다.';
 if(this.s.global.CURRENT_MAP_ID!==c.map)return '이 보물상자가 있는 곳에 가야 열 수 있습니다.';
 if((c.how==='SCENERY_NIGHT'||c.night)&&!this.chestNight())return '밤(19시~5시)에만 보이는 보물상자입니다.';
 return '';
};
const rewardText=(r,c)=>{const parts=['원석 '+c.reward.primogem+'개',c.reward.mora.toLocaleString('ko-KR')+' 모라'];for(const [id,n] of Object.entries(c.reward.items))parts.push((r.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+n+'개');return parts.join(' · ');};
P.chestView=function(c){
 const pos=c.how==='SCENERY'||c.how==='SCENERY_NIGHT'?place(c):null;
 return {id:c.id,region:c.region,map:c.map,mapName:this.tables['32_MAP_DB'].get(c.map)?.[2]||c.map,tier:c.tier,tierName:TIER[c.tier].name,icon:TIER[c.tier].icon,
  game:c.game,gameName:c.game?GAME[c.game]:'',how:c.how,howName:HOW[c.how],hidden:!c.game,night:c.how==='SCENERY_NIGHT'||!!c.night,spot:c.spot||null,pos,
  reward:{primogem:c.reward.primogem,mora:c.reward.mora,items:{...c.reward.items},text:rewardText(this,c)},opened:this.chestOpened(c.id),reason:this.chestReason(c.id)};
};
// The chests a screen should show right now: here, unopened, and visible at this hour.
P.chestsHere=function(how){return CHESTS.filter(c=>c.map===this.s.global.CURRENT_MAP_ID&&(!how||c.how===how||how==='SCENERY'&&c.how==='SCENERY_NIGHT')&&!this.chestOpened(c.id)&&!this.chestReason(c.id)).map(c=>this.chestView(c));};
// The handbook's treasure page: how many chests each region holds and how many are found, never where.
P.chestJournal=function(){
 return ['MOND','LIYUE'].map(region=>{
  const list=CHESTS.filter(c=>c.region===region),open=list.filter(c=>this.chestOpened(c.id)),count=f=>({found:open.filter(f).length,total:list.filter(f).length});
  return {region,name:region==='MOND'?'몬드':'리월',found:open.length,total:list.length,primogem:list.reduce((n,c)=>n+c.reward.primogem,0),gained:open.reduce((n,c)=>n+c.reward.primogem,0),
   puzzles:count(c=>!!c.game),hidden:count(c=>!c.game),tiers:Object.keys(TIER).map(t=>({tier:t,name:TIER[t].name,icon:TIER[t].icon,...count(c=>c.tier===t)})).filter(t=>t.total)};});
};
P.chestOpen=function(id,answer){
 const why=this.chestReason(id);if(why)fail('CHEST',why);const c=BY_ID.get(id);
 if(c.game&&!CHECK[c.game](this.chestPuzzle(id),answer))fail('CHEST','퍼즐이 아직 풀리지 않았습니다.');
 const g=this.s.global,w=c.reward;g.PRIMOGEM=(Number(g.PRIMOGEM)||0)+w.primogem;g.MORA=(Number(g.MORA)||0)+w.mora;
 for(const [item,n] of Object.entries(w.items))this.giveItem(item,n);
 this.chestState().opened[id]={day:Number(g.WORLD_DAY)||1};
 const list=CHESTS.filter(x=>x.region===c.region);
 return {chest:id,tier:c.tier,tierName:TIER[c.tier].name,icon:TIER[c.tier].icon,primogem:w.primogem,mora:w.mora,items:{...w.items},found:list.filter(x=>this.chestOpened(x.id)).length,total:list.length,region:c.region};
};
P.actionReason=function(type,a={}){if(type==='CHEST_OPEN')return this.chestReason(a.chest);return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='CHEST_OPEN')return this.chestOpen(String(a.chest||''),a.answer);return old.apply.call(this,a);};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s),c=out.chests;
 if(c!==undefined){
  if(!c||typeof c!=='object'||c.version!==1||!c.opened||typeof c.opened!=='object'||Array.isArray(c.opened))fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
  for(const [id,v] of Object.entries(c.opened))if(!BY_ID.has(id)||!v||!Number.isInteger(v.day)||v.day<1)fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
 }
 return out;
};
})(globalThis);
