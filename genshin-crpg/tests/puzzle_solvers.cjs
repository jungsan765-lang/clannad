'use strict';
// Reference solvers for every puzzle game (written apart from the game code): given a puzzle, an answer the game must accept.
const range=n=>[...Array(n).keys()];
const DIRS=[[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]],OPP={1:4,2:8,4:1,8:2},turn=m=>((m<<1)|(m>>3))&15;
const neighbours=(n,i)=>{const x=i%n,y=Math.floor(i/n),out=[];if(x>0)out.push(i-1);if(x<n-1)out.push(i+1);if(y>0)out.push(i-n);if(y<n-1)out.push(i+n);return out;};
const runs=line=>{const out=[];let c=0;for(const v of line){if(v)c++;else if(c){out.push(c);c=0;}}if(c)out.push(c);return out.length?out:[0];};
function lightsSolve(p,press){const n=p.n,N=n*n;for(let mask=0;mask<(1<<N);mask++){const s=p.state.slice(),presses=[];for(let i=0;i<N;i++)if(mask>>i&1){presses.push(i);press(n,s,i);}if(s.every(v=>v===1))return presses;}throw Error('lights has no solution');}
const solve={
 SUDOKU(p){const {n,box:[br,bc]}=p,a=p.givens.slice();const ok=(i,v)=>{const y=Math.floor(i/n),x=i%n;for(let k=0;k<n;k++)if(a[y*n+k]===v||a[k*n+x]===v)return false;const by=y-y%br,bx=x-x%bc;for(let yy=0;yy<br;yy++)for(let xx=0;xx<bc;xx++)if(a[(by+yy)*n+bx+xx]===v)return false;return true;};
  const go=i=>{if(i===n*n)return true;if(a[i])return go(i+1);for(let v=1;v<=n;v++)if(ok(i,v)){a[i]=v;if(go(i+1))return true;a[i]=0;}return false;};if(!go(0))throw Error('sudoku has no solution');return a;},
 SWAP(p){const b=p.board.slice(),moves=[];for(let i=0;i<b.length;i++)if(b[i]!==i){const j=b.indexOf(i);moves.push([i,j]);[b[i],b[j]]=[b[j],b[i]];}return moves;},
 LIGHTS(p){return lightsSolve(p,(n,s,i)=>{for(const k of [i,...neighbours(n,i)])s[k]^=1;});},
 SLIDE(p){const n=p.n,N=n*n,start=p.board.join(','),goal=range(N).join(','),prev=new Map([[start,null]]),q=[start];
  for(let head=0;head<q.length;head++){const cur=q[head];if(cur===goal)break;const b=cur.split(',').map(Number),blank=b.indexOf(N-1);for(const i of neighbours(n,blank)){const d=b.slice();d[blank]=d[i];d[i]=N-1;const k=d.join(',');if(!prev.has(k)){prev.set(k,[cur,i]);q.push(k);}}}
  if(!prev.has(goal))throw Error('slide has no solution');const out=[];let k=goal;while(prev.get(k)){const [p2,i]=prev.get(k);out.unshift(i);k=p2;}return out;},
 SPOT(p){return range(p.count);},
 ROTATE(p){return p.rot.flatMap((r,i)=>Array((4-r)%4).fill(i));},
 PIPES(p){
  const {n,src,dst,masks}=p,rot=range(n*n).map(()=>0),seen=new Set();
  const go=(c,inBit)=>{seen.add(c);for(let k=0;k<4;k++){let m=masks[c];for(let t=0;t<k;t++)m=turn(m);if(!(m&inBit))continue;rot[c]=k;const y=Math.floor(c/n),x=c%n;
   if(x===n-1&&y===dst&&(m&2))return true;
   for(const [dy,dx,bit] of DIRS){if(bit===inBit||!(m&bit))continue;const ny=y+dy,nx=x+dx,k2=ny*n+nx;if(ny<0||ny>=n||nx<0||nx>=n||seen.has(k2))continue;if(go(k2,OPP[bit]))return true;}}
   rot[c]=0;seen.delete(c);return false;};
  if(!go(src*n,8))throw Error('pipes has no solution');return rot.flatMap((k,i)=>Array(k).fill(i));},
 MIRRORS(p,api){const ms=p.mirrors;for(let mask=0;mask<(1<<ms.length);mask++){const flips=ms.filter((m,i)=>mask>>i&1).map(m=>m.i);if(api.chestRules.check.MIRRORS(p,flips))return flips;}throw Error('mirrors has no solution');},
 NONOGRAM(p){
  const n=p.n,cands=r=>range(1<<n).map(m=>range(n).map(i=>m>>i&1)).filter(line=>{const a=runs(line),b=p.rows[r];return a.length===b.length&&a.every((v,i)=>v===b[i]);});
  const rows=range(n).map(cands),grid=[];
  const prefixOk=(col,clue,done)=>{const r=[];let c=0;for(const v of col){if(v)c++;else if(c){r.push(c);c=0;}}const open=c;if(done){if(open)r.push(open);const want=clue[0]===0?[]:clue;return r.length===want.length&&r.every((v,i)=>v===want[i]);}
   const want=clue[0]===0?[]:clue;if(r.length>want.length)return false;for(let i=0;i<r.length;i++)if(r[i]!==want[i])return false;if(open&&(r.length>=want.length||open>want[r.length]))return false;return true;};
  const go=y=>{if(y===n)return range(n).every(x=>prefixOk(grid.map(r=>r[x]),p.cols[x],true));for(const line of rows[y]){grid.push(line);if(range(n).every(x=>prefixOk(grid.map(r=>r[x]),p.cols[x],false))&&go(y+1))return true;grid.pop();}return false;};
  if(!go(0))throw Error('nonogram has no solution');return grid.flat();},
 SYMMETRY(p){return range(p.h).flatMap(y=>range(p.m).map(x=>p.left[y*p.m+(p.m-1-x)]));},
 MEMGRID(p){return p.lit.slice();},
 MINES(p){return p.bombs.slice();},
 FLOOD(p,api){const step=api.chestRules.puzzleV0152.floodStep;let g=p.grid.slice();const n=p.n,out=[];
  const region=gr=>{const seen=new Set([0]),q=[0];while(q.length){const i=q.shift();for(const k of neighbours(n,i))if(!seen.has(k)&&gr[k]===gr[0]){seen.add(k);q.push(k);}}return seen.size;};
  while(!g.every(v=>v===g[0])){let best=null,size=-1;for(let c=0;c<p.colors;c++){if(c===g[0])continue;const s=region(step(n,g,c));if(s>size){size=s;best=c;}}g=step(n,g,best);out.push(best);if(out.length>p.limit)throw Error('flood over the limit');}return out;},
 SIMON(p){return p.seq.slice();},
 MASTERMIND(p){return [p.code.slice()];},
 DIALS(p){const {d,base,values:v}=p;for(let c0=0;c0<base;c0++){const c=[c0];for(let i=1;i<d;i++)c.push(((-v[i]-c[i-1])%base+base*2)%base);if(((v[0]+c[0]+c[d-1])%base+base)%base===0)return c.flatMap((k,i)=>Array(k).fill(i));}throw Error('dials has no solution');},
 WORD(p){const used=new Set();return [...p.word].map(s=>{const i=p.tiles.findIndex((t,k)=>t===s&&!used.has(k));used.add(i);return i;});},
 HANOI(p){const out=[],mv=(k,a,b,c)=>{if(!k)return;mv(k-1,a,c,b);out.push([a,b]);mv(k-1,c,b,a);};mv(p.n,0,2,1);return out;},
 QUIZ(p){return p.answers.slice();},
 ODD(p){return p.rounds.map(r=>r.odd);},
 COUNT(p){return p.rounds.map(r=>r.cells.filter(c=>c===r.target).length);},
 REACTION(p){return p.rounds.map(r=>r.answer);},
 BALANCE(p){const n=p.weights.length;for(let mask=1;mask<(1<<n);mask++){const use=range(n).filter(i=>mask>>i&1);if(use.reduce((s,i)=>s+p.weights[i],0)===p.target)return use;}throw Error('balance has no solution');},
 PAIRS(p){const by={};p.icons.forEach((x,i)=>(by[x]??=[]).push(i));return Object.values(by).flatMap(list=>{const out=[];for(let i=0;i<list.length;i+=2)out.push([list[i],list[i+1]]);return out;});},
 MAZE(p){const m=p.m,prev=new Map([[0,null]]),q=[0];while(q.length){const c=q.shift();if(c===m*m-1)break;DIRS.forEach(([dy,dx,bit],d)=>{if(!(p.open[c]&bit))return;const k=(Math.floor(c/m)+dy)*m+(c%m)+dx;if(!prev.has(k)){prev.set(k,[c,d]);q.push(k);}});}
  const out=[];let k=m*m-1;while(prev.get(k)){const [c,d]=prev.get(k);out.unshift(d);k=c;}return out;},
 CONSTELLATION(p){return p.edges.map(e=>e.slice());},
 SHADOW(p){return p.rounds.map(r=>r.answer);},
 LIGHTS_X(p){return lightsSolve(p,(n,s,i)=>{const x=i%n,y=Math.floor(i/n);s[i]^=1;for(const [dy,dx] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<n&&xx>=0&&xx<n)s[yy*n+xx]^=1;}});}
};
module.exports={solve};
