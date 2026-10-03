'use strict';
// 0.15.7 앱처럼 하기 (user: 「휴대폰으로 인게임 들어갈 때 위아래가 잘리는 느낌이 없지 않아서 apk가 필요할 것 같다」 → 「일단 A
// 해봐」): the installed game opens full screen, the title screen offers 「앱으로 설치」 (the browser's prompt, or the steps
// for this browser), and Android browsers get a 전체 화면 toggle on Paimon's menu.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){return Promise.resolve().then(fn).then(evidence=>{results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);},e=>{results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;});}
class Element{
 constructor(tag){Object.assign(this,{tag,className:'',textContent:'',children:[],type:'',onclick:null});}
 append(...n){for(const x of n){if(typeof x==='string'){const t=new Element('#text');t.textContent=x;this.children.push(t);}else this.children.push(x);}}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 querySelector(sel){const cls=sel.replace(/^\./,'');return this.all().find(x=>String(x.className).split(/\s+/).includes(cls))||null;}
 get text(){return [this.textContent,...this.children.map(c=>c.text)].join(' ');}
}
// One page in its own context: a browser (user agent, screen, display mode), the title footer and the game hooks.
function page({ua='Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36',coarse=true,width=390,height=844,display='browser',fullscreen=true,platform='Linux armv8l'}={}){
 const listeners={},modals=[],said=[],footer=new Element('div');footer.className='title-footer';
 const fullCalls=[];let fullEl=null,closed=0;
 const doc={fullscreenEnabled:fullscreen,get fullscreenElement(){return fullEl;},documentElement:{requestFullscreen:fullscreen?async o=>{fullCalls.push(o);fullEl={};}:undefined},
  exitFullscreen:async()=>{fullEl=null;},createElement:t=>new Element(t),addEventListener(){},getElementById:()=>({close(){closed++;}}),
  querySelector:sel=>sel==='.title-footer'?footer:null,querySelectorAll:()=>[]};
 const win={innerWidth:width,innerHeight:height,addEventListener:(k,fn)=>{(listeners[k]??=[]).push(fn);},
  matchMedia:q=>({matches:q==='(pointer: coarse)'||q==='(hover: none)'?coarse:q==='(display-mode: '+display+')'})};
 const shell={menuHooks:[],icon:()=>new Element('svg')};win.CRPGShell=shell;
 const ctx=vm.createContext({console,window:win,document:doc,navigator:{userAgent:ua,platform,maxTouchPoints:coarse?5:0,standalone:display==='standalone-ios'?true:undefined},
  render(){},showModal:(title,content)=>modals.push({title,content}),say:t=>said.push(t)});
 vm.runInContext(src('app_install_v0157.js'),ctx,{filename:'app_install_v0157.js'});
 return {ctx,win,listeners,modals,said,footer,shell,fullCalls,get closed(){return closed;},fire:(k,e)=>{for(const fn of listeners[k]||[])fn(e);}};
}
const button=(node,cls)=>node.all().find(x=>x.tag==='button'&&String(x.className).split(/\s+/).includes(cls));

(async()=>{
await check('the installed game opens full screen (standalone as the fallback); iPhone gets its home-screen metas and icon',()=>{
 const m=JSON.parse(src('manifest.webmanifest'));assert.equal(m.display,'fullscreen');assert.deepEqual(m.display_override,['fullscreen','standalone']);
 assert(m.icons.some(i=>i.sizes==='192x192')&&m.icons.some(i=>i.sizes==='512x512'));
 const html=src('index.html');for(const meta of ['name="mobile-web-app-capable" content="yes"','name="apple-mobile-web-app-capable" content="yes"','name="apple-mobile-web-app-status-bar-style" content="black"','rel="apple-touch-icon" href="icon-192.png"'])assert(html.includes(meta),meta);
 const at=f=>html.indexOf('src="'+f+'"');assert(at('app_install_v0157.js')>at('app_shell.js')&&at('app_install_v0157.js')>at('app_online.js')&&at('app_shell.js')>0,'loads after the shell and the title screen');
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'app_install_v0157.js'"));
});

await check('Android Chrome: the title offers 「앱으로 설치」, which opens the browser’s own install prompt; 전체 화면 is offered too',async()=>{
 const p=page();let prompted=0,prevented=0;
 p.fire('beforeinstallprompt',{preventDefault(){prevented++;},prompt:async()=>{prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});assert.equal(prevented,1);
 p.ctx.render();const open=button(p.footer,'title-install');assert(open,'button on the title');assert.equal(open.textContent,'앱으로 설치');
 p.ctx.render();assert.equal(p.footer.all().filter(x=>String(x.className).includes('title-install')).length,1,'added once');
 open.onclick();const box=p.modals.at(-1).content;assert.equal(p.modals.at(-1).title,'앱처럼 하기');
 const go=button(box,'install-go');assert(go);assert(button(box,'install-full'),'full screen without installing');
 await go.onclick();assert.equal(prompted,1);assert.equal(p.closed,1);assert.match(p.said.at(-1),/설치했습니다/);
});

await check('iPhone Safari: the steps (share → 홈 화면에 추가), no full screen toggle (pages cannot go full screen there)',()=>{
 const p=page({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',fullscreen:false,platform:'iPhone'});
 p.ctx.render();button(p.footer,'title-install').onclick();const box=p.modals.at(-1).content,text=box.text;
 assert.match(text,/공유 버튼/);assert.match(text,/홈 화면에 추가/);assert.match(text,/다시 로그인/);assert(!button(box,'install-full'));assert(!button(box,'install-go'));
 const menu=new Element('div'),foot=new Element('div');foot.className='pm-foot';menu.append(foot);for(const add of p.shell.menuHooks)add(menu,{close(){}});assert.equal(foot.children.length,0,'no toggle on Paimon’s menu');
});

await check('a chat app’s browser is told to open the page in the real browser first',()=>{
 const p=page({ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 KAKAOTALK 10.8.0'});
 p.ctx.render();button(p.footer,'title-install').onclick();assert.match(p.modals.at(-1).content.text,/브라우저로 열기/);
});

await check('Paimon’s menu on an Android browser: 전체 화면 hides the browser bars (navigationUI hide)',async()=>{
 const p=page(),menu=new Element('div'),foot=new Element('div');foot.className='pm-foot';menu.append(foot);let closed=0;
 for(const add of p.shell.menuHooks)add(menu,{close(){closed++;}});const b=button(menu,'pm-fullscreen');assert(b,'toggle added');assert.match(b.text,/전체 화면/);
 await b.onclick();assert.equal(closed,1);assert.equal(JSON.stringify(p.fullCalls),'[{"navigationUI":"hide"}]');
});

await check('already installed (full screen or standalone) and desktop browsers: no install button, no toggle',()=>{
 const desk='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36';
 for(const opts of [{display:'fullscreen'},{display:'standalone'},{ua:desk,coarse:false,width:1920,height:1080,platform:'Win32'},{ua:desk,coarse:false,width:800,height:600,platform:'Win32'}]){
  const p=page(opts);p.ctx.render();assert(!button(p.footer,'title-install'),JSON.stringify(opts));
  if(opts.display==='fullscreen'){const menu=new Element('div'),foot=new Element('div');foot.className='pm-foot';menu.append(foot);for(const add of p.shell.menuHooks)add(menu,{close(){}});assert.equal(foot.children.length,0);}
 }
});

const out=path.join(root,'reports/v0157');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({version:'0.15.7',total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
})();
