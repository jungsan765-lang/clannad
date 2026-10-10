// 0.15.8 회원가입 안내: a tester could not sign up because their ID had 「!」 「@」 「♡」, and the refusal was one sentence
// about both the ID and the password. The server now names what is wrong, a badly formed form does not use one of the
// connection's five sign-up tries an hour, and the sign-up window shows the ID rule (and the bad characters) while typing.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
import {startLiveRegionStaging,signupReason} from '../server/fixed-region-live.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pepper='server-v0158-test-pepper-'.padEnd(64,'p');
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
const checks=[];const check=async(name,fn)=>{app.store.rates.clear();await fn();checks.push(name);console.log('PASS '+name);};
const register=async(body,ip='203.0.113.7')=>{const r=await fetch(base+'/register',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)});return {status:r.status,json:await r.json()};};

try{
await check('the refusal says exactly what is wrong with the ID or the password',async()=>{
 const symbols=await register({username:'ab!c@d♡e',password:'long-enough-password'});
 assert.equal(symbols.status,400);assert.equal(symbols.json.code,'SIGNUP_FORM');
 for(const ch of ['「!」','「@」','「♡」'])assert(symbols.json.error.includes(ch),symbols.json.error);
 assert.match(symbols.json.error,/한글 · 영문 · 숫자 · 밑줄\(_\)만/);assert.match(symbols.json.error,/비밀번호에는 특수문자를 써도 됩니다/);
 assert.match((await register({username:'물리 경',password:'long-enough-password'})).json.error,/띄어쓰기/);
 assert.match((await register({username:'ab',password:'long-enough-password'})).json.error,/3~24자로 정해 주세요\. \(지금 2자\)/);
 assert.match((await register({username:'mulli_kyung',password:'short'})).json.error,/비밀번호는 8자 이상/);
 assert.equal(signupReason('zhongli_0909','pass!@♡word'),'','symbols are fine in the password');
 assert.equal(signupReason('ABC가나'.normalize('NFKC').toLowerCase(),'12345678'),'');
});

await check('badly formed forms do not use the hourly sign-up tries; a fixed form then signs up',async()=>{
 for(let i=0;i<7;i++)assert.equal((await register({username:'bad!id'+i,password:'long-enough-password'},'203.0.113.9')).status,400);
 const ok=await register({username:'fixed_id_0158',password:'zh!on@gli♡pass'},'203.0.113.9');
 assert.equal(ok.status,200,JSON.stringify(ok.json));assert(ok.json.token);
 const login=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'fixed_id_0158',password:'zh!on@gli♡pass'})});
 assert.equal(login.status,200,'a password with symbols logs in');
});

await check('the sign-up window shows the ID rule under the ID box and names bad characters while typing; the login window does not',()=>{
 class Node{constructor(tag,attrs={}){Object.assign(this,{tag,children:[],parent:null,className:'',textContent:'',type:'',value:'',listeners:{},classes:new Set()},attrs);
  this.classList={toggle:(c,on)=>{if(on)this.classes.add(c);else this.classes.delete(c);},contains:c=>this.classes.has(c)};}
  append(...n){for(const x of n){x.parent=this;this.children.push(x);}}
  after(n){const p=this.parent,i=p.children.indexOf(this);n.parent=p;p.children.splice(i+1,0,n);}
  all(){return this.children.flatMap(c=>[c,...c.all()]);}
  closest(sel){let x=this;while(x){if(sel==='label'&&x.tag==='label')return x;x=x.parent;}return null;}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  querySelector(sel){if(sel==='form.account-form')return this.all().find(x=>x.tag==='form'&&x.className==='account-form')||null;if(sel==='.account-id-hint')return this.all().find(x=>x.className==='account-id-hint')||null;
   if(sel==='input[autocomplete="username"]')return this.all().find(x=>x.tag==='input'&&x.autocomplete==='username')||null;return null;}
  querySelectorAll(sel){return sel==='button'?this.all().filter(x=>x.tag==='button'):[];}
 }
 const page=submitLabel=>{const modal=new Node('dialog'),form=new Node('form',{className:'account-form'}),label=new Node('label'),input=new Node('input',{autocomplete:'username'}),pw=new Node('label'),b=new Node('button',{type:'submit',textContent:submitLabel});
  label.append(input);form.append(label,pw,b);modal.append(form);
  const ctx=vm.createContext({window:{},document:{getElementById:id=>id==='modal'?modal:null,createElement:t=>new Node(t),body:{}}});
  vm.runInContext(fs.readFileSync(path.join(root,'source/app_signup_v0158.js'),'utf8'),ctx);ctx.window.CRPGSignupHint.hint();return {form,label,input};};
 const s=page('계정 만들기'),note=s.form.children[s.form.children.indexOf(s.label)+1];
 assert.equal(note.className,'account-id-hint','right under the ID box');assert.match(note.textContent,/한글 · 영문 · 숫자 · 밑줄\(_\) 3~24자/);
 s.input.value='zh!on@gli';for(const fn of s.input.listeners.input)fn();assert.match(note.textContent,/쓸 수 없는 글자: ! @/);assert(note.classList.contains('bad'));
 s.input.value='zhongli_0909';for(const fn of s.input.listeners.input)fn();assert(!note.classList.contains('bad'));assert(!/쓸 수 없는/.test(note.textContent));
 const l=page('로그인');assert(!l.form.all().some(x=>x.className==='account-id-hint'),'login window unchanged');
 const html=fs.readFileSync(path.join(root,'source/index.html'),'utf8');assert(html.includes('<script src="app_signup_v0158.js"></script>'));
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'app_signup_v0158.js'"));
});
console.log(JSON.stringify({ok:true,checks}));
}finally{await app.close?.();}
