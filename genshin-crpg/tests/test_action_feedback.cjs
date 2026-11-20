'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(new URL('../source/app_av.js','file://'+__filename),'utf8');
let clock=0,id=0;const timers=new Map(),nodes=[];
class Element{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.removed=false;}append(...xs){this.children.push(...xs);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this[k];}remove(){this.removed=true;}}
const context=vm.createContext({performance:{now:()=>clock},document:{hidden:false,querySelector:()=>null,body:{append:n=>nodes.push(n)}},CRPGRuntime:{},game:{tables:{}},el:(tag,cls,text)=>Object.assign(new Element(tag),{className:cls,textContent:text}),setTimeout:(f,ms)=>{timers.set(++id,{f,at:clock+ms});return id;},clearTimeout:i=>timers.delete(i)});
vm.runInContext(source.slice(source.indexOf('function actionCoverPlan('),source.indexOf('function combatSpeedControl(')),context);
function tick(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].f();}clock=end;}
function start(type){return context.startActionCover(type,{kind:'GATHER'});}
let cover=start('LIFE_START');tick(300);assert.match(nodes.at(-1).className,/pending-activity/);assert(!nodes.at(-1).children[1].textContent.includes('준비'));assert(nodes.at(-1).children.find(n=>n.tag==='progress').value>0,'activity must visibly advance BEFORE acknowledgement');tick(1500);cover.finishServer();assert(nodes.at(-1).removed,'life preparation ends on acknowledgement; no second full timer');
cover=start('MOVE');tick(1200);assert.equal(nodes.at(-1).children.find(n=>n.tag==='progress').value,undefined,'delayed travel must be indeterminate');assert(!nodes.at(-1).removed);cover.finishServer();assert(nodes.at(-1).removed);
cover=start('MOVE');cover.finishServer();tick(1000);assert(nodes.at(-1).removed,'fast acknowledgement overlaps travel animation');
cover=start('WAIT');tick(3500);assert(nodes.at(-1).children.some(n=>String(n.textContent).includes('진행 확인 중')));assert(!nodes.at(-1).children.some(n=>String(n.textContent).includes('도착')));cover.finishServer();
const before=nodes.length;cover=start('PARTY');tick(100);assert.equal(nodes.length,before,'fast saves do not flash');cover.finishServer();tick(1000);assert.equal(nodes.length,before);
cover=start('PARTY');tick(1000);assert.match(nodes.at(-1).className,/action-status/);assert(!nodes.at(-1).className.includes('travel-overlay'));cover.abort();assert(nodes.at(-1).removed);assert.equal(timers.size,0);
cover=start('EQUIP');tick(1000);assert.match(nodes.at(-1).className,/action-feedback/);assert.equal(nodes.at(-1).children.filter(n=>n.textContent==='장착 중…').length,1);assert(!nodes.at(-1).children.some(n=>String(n.textContent).includes('진행 확인')));cover.finishServer();assert(nodes.at(-1).removed);
console.log('PASS real action covers: overlapping timers, delayed acknowledgement, nonmodal save and cleanup');
// Headers alone must not cancel the timeout: a stalled JSON body used to leave busy=true forever.
(async()=>{
 const online=fs.readFileSync(new URL('../source/app_online.js','file://'+__filename),'utf8');let timeout;
 const transport=vm.createContext({Date,AbortController,base:'https://fixture.invalid',O:{token:''},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>{timeout=null;},fetch:async(url,{signal})=>({json:()=>new Promise((resolve,reject)=>{const fail=()=>reject(Object.assign(Error('stalled'),{name:'AbortError'}));if(signal.aborted)fail();else signal.addEventListener('abort',fail);})})});
 // request() now stamps its login generation. Load those real source helpers too;
 // keep the stalled-body/abort behavior under test unchanged.
 const sessionHelpers=online.slice(online.indexOf('let sessionEpoch='),online.indexOf('function invalidateSession('));
 vm.runInContext(sessionHelpers+online.slice(online.indexOf('async function request('),online.indexOf('function checkVersion(')),transport);
 const pending=transport.request('/game/action',{});await Promise.resolve();assert(timeout,'timeout stays armed while reading body');timeout();
 await assert.rejects(pending,e=>e.transient===true&&e.retryable===false);assert.equal(timeout,null);
 console.log('PASS stalled response body times out with recoverable pending action');
})().catch(e=>{console.error(e);process.exitCode=1;});
