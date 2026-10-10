'use strict';
// The real board and existing paginator run against a deterministic page model. This checks
// bindings and accessible pages, not browser font/media sizing (that needs browser validation).
const assert=require('node:assert/strict');
const {fresh,c,advance,fs,path,root,vm}=require('./helpers_v011.cjs');
const source=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
class Node{
 constructor(tag='div'){Object.assign(this,{tagName:tag.toUpperCase(),nodeType:1,className:'',dataset:{},style:{},attrs:{},childNodes:[],parentElement:null,hidden:false,_text:'',_height:0});}
 get children(){return this.childNodes.filter(n=>n.nodeType===1);}
 get firstChild(){return this.childNodes[0]||null;}get firstElementChild(){return this.children[0]||null;}
 get classList(){const n=this,parts=()=>n.className.split(/\s+/).filter(Boolean);return {contains:x=>parts().includes(x),add:(...xs)=>n.className=[...new Set([...parts(),...xs])].join(' '),remove:(...xs)=>n.className=parts().filter(x=>!xs.includes(x)).join(' '),toggle:(x,on)=>{const yes=on===undefined?!parts().includes(x):!!on;if(yes)n.classList.add(x);else n.classList.remove(x);return yes;}};}
 get textContent(){return this._text+this.childNodes.map(n=>n.textContent).join('');}set textContent(v){this.replaceChildren();this._text=String(v??'');}
 append(...ns){for(let n of ns){if(typeof n!=='object')n={nodeType:3,textContent:String(n),parentElement:null,remove(){this.parentElement?.childNodes.splice(this.parentElement.childNodes.indexOf(this),1);this.parentElement=null;}};n.remove();this.childNodes.push(n);n.parentElement=this;}}
 prepend(...ns){for(const n of ns.reverse()){n.remove();this.childNodes.unshift(n);n.parentElement=this;}}
 replaceChildren(...ns){for(const n of [...this.childNodes])n.remove();this._text='';this.append(...ns);}
 remove(){if(this.parentElement)this.parentElement.childNodes.splice(this.parentElement.childNodes.indexOf(this),1);this.parentElement=null;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 matches(s){return s.split(',').some(x=>{x=x.trim();if(x==='[data-paged]')return this.dataset.paged!==undefined;const a=x.match(/^([\w-]*)([.#\w-]*)$/);if(!a)return false;return(!a[1]||this.tagName===a[1].toUpperCase())&&a[2].split('.').slice(1).every(k=>this.classList.contains(k));});}
 querySelectorAll(s){if(s.startsWith(':scope>'))return this.children.filter(n=>n.matches(s.slice(7)));const parts=s.trim().split(/\s+/),out=[];const match=n=>{let i=parts.length-1;if(!n.matches(parts[i]))return false;for(n=n.parentElement;--i>=0;){while(n&&!n.matches(parts[i]))n=n.parentElement;if(!n)return false;n=n.parentElement;}return true;};const walk=n=>{for(const k of n.children){if(match(k))out.push(k);walk(k);}};walk(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 get offsetParent(){return this.parentElement;}
 get clientHeight(){return this._height;}
 get intrinsicHeight(){if(this.hidden)return 0;if(this.classList.contains('task-row'))return 32;if(this.classList.contains('task-head'))return 44;if(this.classList.contains('pane-pager'))return 28;return this.children.reduce((n,k)=>n+k.intrinsicHeight,0);}
 get scrollHeight(){return this.intrinsicHeight;}
 getBoundingClientRect(){const prior=this.parentElement?.children.slice(0,this.parentElement.children.indexOf(this))||[];return {top:(this.parentElement?.getBoundingClientRect().top||0)+prior.reduce((n,k)=>n+k.intrinsicHeight,0),height:this.intrinsicHeight};}
}
function screen(){
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:60});r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(['MOND_AMBER','MOND_KAEYA','MOND_LISA'].map(id=>[id,{state:'JOINED'}])));r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});assert(r.taskView().weekly.length>1);assert(r.taskView().weekly.length<r.s.tasks.weeklyIds.length);
 const body=new Node('body'),page=new Node('section'),pane=new Node('div');page.className='shell-page-quest';pane.className='quest-list';pane._height=200;body.append(page);page.append(pane);
 const calls=[],toasts=[],timers=[],events=[];
 const doc={body,createElement:t=>new Node(t),querySelector:s=>body.querySelector(s),querySelectorAll:s=>s.includes('.quest-list:has(.task-board)')&&pane.querySelector('.task-board')?[pane]:[],addEventListener:(type,fn)=>events.push({type,fn})};
 const context={console,document:doc,game:r,Date,button:(label,fn)=>{const b=new Node('button');b.textContent=label;b.onclick=fn;return b;},actionButton:(label,type,params)=>{const b=new Node('button');b.textContent=label;b.onclick=()=>calls.push({type,params});return b;},safeName:(_table,id)=>id,currencyIcon:()=>new Node('img'),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},addEventListener(){},requestAnimationFrame:fn=>fn(),getComputedStyle:()=>({display:'block',gridTemplateColumns:'1fr',paddingTop:'0',paddingBottom:'0',rowGap:'0'}),CRPGShell:{toast:x=>toasts.push(x)}};
 context.window=context;context.render=()=>{pane.replaceChildren();context.CRPGTaskBoard?.board(pane);};vm.createContext(context);
 for(const f of ['app_mainscreen_v0167.js','app_tasks_v0167.js','app_pages_v0167.js'])vm.runInContext(source(f),context,{filename:f});
 context.render();return {r,body,pane,context,calls,toasts,timers};
}
check('실제 임무판은 일일·주간의 열린 갈래와 모두달성 보상을 별도로 표시한다',()=>{
 const p=screen();assert.equal(p.pane.querySelectorAll('.task-row').length,p.r.taskView().daily.length+1);
 const tabs=p.pane.querySelectorAll('.task-scope');tabs[1].onclick();const rows=p.pane.querySelectorAll('.task-row');assert.equal(rows.length,p.r.taskView().weekly.length+1);assert.equal(new Set(rows.map(n=>n.dataset.task)).size,rows.length);
 const all=rows.find(n=>n.dataset.task==='W_ALL');assert(all);assert(all.textContent.includes('200'));assert.equal(p.r.taskView().weeklyBonus.goal,p.r.s.tasks.weeklyIds.length);
 const bonus=p.r.taskView().weeklyBonus;assert(!bonus.done);assert(p.pane.querySelector('.task-scope.active b').textContent==='주간');
});
check('기존 쪽 넘기기로 열린 주간 갈래·보너스에 접근하고 주간·일일 쪽 기억을 구분한다',()=>{
 const p=screen();p.pane.querySelectorAll('.task-scope')[1].onclick();const reached=new Set();let pages=0;
 for(;;){for(const row of p.pane.querySelectorAll('.task-row'))if(!row.hidden)reached.add(row.dataset.task);assert(p.pane.scrollHeight<=p.pane.clientHeight+1,'each modeled page fits');pages++;const buttons=p.pane.querySelectorAll('.pane-page');assert.equal(buttons.length,2);if(buttons[1].disabled)break;buttons[1].onclick();assert(pages<30);}
 assert(pages>1);assert.equal(reached.size,p.r.taskView().weekly.length+1);assert(reached.has('W_ALL'),'the last bonus is reachable');
 p.pane.querySelectorAll('.task-scope')[0].onclick();assert.equal((p.pane.querySelector('.pane-page-no')?.textContent||'1 / 1').split('/')[0].trim(),'1','daily starts on its own page');
 p.pane.querySelectorAll('.task-scope')[1].onclick();const pager=p.pane.querySelectorAll('.pane-page');assert(pager[1].disabled,'weekly retains its previous last page');
});
check('주간 모두달성 버튼은 정확한 기존 TASK_CLAIM 경로와 수령 알림에 연결된다',()=>{
 const p=screen(),box=p.r.tasksBox(true);
 // Explicit completed-activity quotas isolate the board binding; real claims unlock each next frontier.
 for(let count=0;count<box.weeklyIds.length+1;count++){const frontier=p.r.taskView().weekly;if(!frontier.length)break;for(const row of frontier){const live=p.r.tasksBox(true),def=live.weeklyDefinitions[row.id];live.weeklyProgress[row.id]=def.goal;p.r.action('TASK_CLAIM',{task:row.id});}}assert(p.r.s.tasks.weeklyIds.every(id=>p.r.s.tasks.claimed[id]));
 p.r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';p.r.s.global.WORLD_TIME='12:00';p.r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});
 p.context.render();p.pane.querySelectorAll('.task-scope')[1].onclick();const row=p.pane.querySelectorAll('.task-row').find(n=>n.dataset.task==='W_ALL');assert(row);row.querySelector('.task-claim').onclick();assert.deepEqual(JSON.parse(JSON.stringify(p.calls.at(-1))),{type:'TASK_CLAIM',params:{task:'W_ALL'}});
 const out=p.r.action('TASK_CLAIM',{task:'W_ALL'}).result;assert.equal(out.primogem,200);assert.deepEqual(JSON.parse(JSON.stringify(out.claimed)),['W_ALL']);p.context.CRPGTaskBoard.gained(out);const gain=p.body.querySelector('.task-gain');assert(gain&&gain.textContent.includes('200'));
 p.context.render();assert(p.pane.querySelectorAll('.task-row').find(n=>n.dataset.task==='W_ALL').classList.contains('claimed'));assert.throws(()=>p.r.action('TASK_CLAIM',{task:'W_ALL'}),/이미/);
});
check('메인 일일 완료 숫자는 새 갈래가 열려도 고정된 전체 목표와 완료 기록을 유지한다',()=>{
 const p=screen(),box=p.r.tasksBox(true),total=box.dailyIds.length+1;
 const number=()=>{const host=new Node('section');p.context.CRPGTaskBoard.mini(host);return host.querySelector('.task-mini-head small').textContent;};
 assert.equal(number(),'0 / '+total);box.dailyProgress.D_WIN=box.dailyDefinitions.D_WIN.goal;p.r.action('TASK_CLAIM',{task:'D_WIN'});assert.equal(number(),'1 / '+total);assert(!p.r.taskView().daily.some(t=>t.id==='D_WIN'));
 for(let n=0;n<box.dailyIds.length+1;n++){const frontier=p.r.taskView().daily;if(!frontier.length)break;for(const row of frontier){const live=p.r.tasksBox(true);live.dailyProgress[row.id]=live.dailyDefinitions[row.id].goal;p.r.action('TASK_CLAIM',{task:row.id});}}
 assert(p.r.taskView().bonus.done);assert.equal(number(),total+' / '+total);
});
console.log(JSON.stringify({ok:!process.exitCode,checks:passed,scope:'real board/module bindings + deterministic layout; browser media sizing excluded'}));
