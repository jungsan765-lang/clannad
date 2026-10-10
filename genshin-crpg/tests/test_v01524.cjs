'use strict';
// 0.15.24 (docs/handoffs/UI_INSTALLED_LANDSCAPE_KO.md; the user: 「튜토리얼은 엠버가 도와주는 형식으로 자연스럽게 스토리상 흘러가면
// 더 좋겠네」, 「위치를 잘 보고 해주고」, 「대화할때 사진 작은건 여기서만 그런거지?」, 「이것도 시간이 안맞아.」): phones play the
// installed game sideways (install guide in a browser tab, 「가로로 돌려 주세요」 when upright), every screen has a short
// sideways layout, the 0.15.21 battle composition is back with as many cards as fighters, the turn order shows faces,
// the tutorial is spoken by Amber (Paimon for the traveller's first steps) in a bubble placed beside its target, the
// story picture grows with the screen and the defeat countdown is live everywhere.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){return Promise.resolve().then(fn).then(evidence=>{results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);},e=>{results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;});}
const html=src('index.html'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8'),land=src('landscape_v01524.css');
const fnBody=(code,name)=>{const at=code.indexOf('function '+name+'(');assert(at>=0,name);let i=code.indexOf('{',at),depth=0;for(let j=i;j<code.length;j++){if(code[j]==='{')depth++;else if(code[j]==='}'&&!--depth)return code.slice(i,j+1);}throw Error(name);};

// ---------- a small page for the install guide: a phone (or not), a browser tab (or the installed app) ----------
class Node{
 constructor(tag){Object.assign(this,{tag,className:'',id:'',textContent:'',children:[],attrs:{},type:'',onclick:null,parent:null,open:false,inert:false});}
 append(...n){for(const x of n){const c=typeof x==='string'?Object.assign(new Node('#text'),{textContent:x}):x;c.parent=this;this.children.push(c);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 get classList(){const self=this,set=()=>new Set(String(self.className).split(/\s+/).filter(Boolean));return {contains:c=>set().has(c),add:c=>{const s=set();s.add(c);self.className=[...s].join(' ');},toggle:(c,on)=>{const s=set();if(on??!s.has(c))s.add(c);else s.delete(c);self.className=[...s].join(' ');}};}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 get text(){return [this.textContent,...this.children.map(c=>c.text)].join('');}
 showPopover(){this.open=true;}hidePopover(){this.open=false;}matches(sel){return sel===':popover-open'?this.open:false;}
 find(cls){return this.all().find(x=>String(x.className).split(/\s+/).includes(cls))||null;}
}
function page({ua='Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36',coarse=true,screen=[390,844],display='browser',search='',platform='Linux armv8l',href='https://clannad.shop/genshin-crpg/'}={}){
 const listeners={},said=[],body=new Node('body'),rootEl=new Node('div'),docEl=new Node('html'),footer=new Node('div');footer.className='title-footer';rootEl.id='root';body.append(rootEl);
 const portrait=screen[1]>screen[0];const locks=[];let opened=null;
 const doc={body,documentElement:docEl,fullscreenEnabled:true,fullscreenElement:null,visibilityState:'visible',
  createElement:t=>new Node(t),createElementNS:(ns,t)=>new Node(t),createTextNode:t=>Object.assign(new Node('#text'),{textContent:t}),
  addEventListener(){},getElementById:id=>id==='root'?rootEl:{close(){}},querySelector:sel=>sel==='.title-footer'?footer:null,querySelectorAll:()=>[]};
 const media=q=>q==='(pointer: coarse)'||q==='(hover: none)'?coarse:q==='(orientation: portrait)'?portrait:q==='(display-mode: '+display+')';
 const location={href:href+(search?'?'+search:''),search:search?'?'+search:''};
 const win={innerWidth:screen[0],innerHeight:screen[1],screen:{width:screen[0],height:screen[1],orientation:{lock:async o=>{locks.push(o);throw Error('not allowed');}}},location,
  addEventListener:(k,fn)=>{(listeners[k]??=[]).push(fn);},matchMedia:q=>({matches:media(q),addEventListener(){}})};
 Object.defineProperty(location,'href',{get:()=>href+(search?'?'+search:''),set:v=>{opened=v;}});
 const store={};
 const ctx=vm.createContext({console,window:win,document:doc,URL,URLSearchParams,encodeURIComponent,setTimeout:fn=>fn(),
  navigator:{userAgent:ua,platform,maxTouchPoints:coarse?5:0,standalone:display==='standalone-ios'?true:undefined,clipboard:{writeText:async()=>{}}},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);}},render(){},showModal(){},say:t=>said.push(t)});
 Object.assign(win,{CRPGShell:{menuHooks:[],icon:()=>new Node('svg')}});
 vm.runInContext(src('app_install_v0157.js'),ctx,{filename:'app_install_v0157.js'});
 vm.runInContext(src('app_install_v01524.js'),ctx,{filename:'app_install_v01524.js'});
 return {ctx,win,body,rootEl,docEl,listeners,said,locks,get opened(){return opened;},gate:()=>body.children.find(c=>c.id==='crpg-gate')||null,fire:(k,e)=>{for(const fn of listeners[k]||[])fn(e);}};
}
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

(async()=>{
await check('the sideways-phone style sheet and the install script ship, after everything they adjust',()=>{
 const css=f=>html.indexOf('href="'+f+'"'),js=f=>html.indexOf('src="'+f+'"');
 assert(css('landscape_v01524.css')>css('tutorial_v01523.css')&&css('tutorial_v01523.css')>css('shell.css'),'the last style sheet');
 assert(js('app_install_v01524.js')>js('app_install_v0157.js')&&js('app_install_v0157.js')>0,'after the 0.15.7 install module');
 assert(build.includes("'tutorial_v01523.css','landscape_v01524.css',")&&build.includes("'app_install_v0157.js','app_install_v01524.js',"),'the build ships both');
 assert.equal(JSON.parse(src('manifest.webmanifest')).orientation,'landscape','installed Android apps open sideways');
});

await check('a phone in a browser tab gets the install guide, not the game; Android’s own prompt installs it',async()=>{
 const p=page();assert.equal(p.gate()?.className,'crpg-gate install');assert(p.gate().open,'on the top layer');assert(p.rootEl.inert,'the page behind cannot be used');
 assert.match(p.gate().text,/앱으로 설치해서 플레이해요/);assert.match(p.gate().text,/⋮ 메뉴에서 「앱 설치」/);assert(!p.gate().find('gate-go'),'no button before the browser offers its prompt');
 let prompted=0;p.fire('beforeinstallprompt',{preventDefault(){},prompt:async()=>{prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
 const go=p.gate().find('gate-go');assert(go,'「설치하기」 once the prompt is offered');assert.equal(go.textContent,'설치하기');
 await go.onclick();assert.equal(prompted,1);assert.match(p.gate().text,/설치했습니다/);assert.match(p.gate().text,/아이콘을 누릅니다/);
 return {after:p.gate().text.slice(0,80)};
});

await check('iPhone: Share → 홈 화면에 추가 (no install prompt exists for pages there); log in once in the installed app',()=>{
 const p=page({ua:IPHONE,platform:'iPhone',screen:[393,852]});const t=p.gate().text;
 assert.match(t,/공유 버튼/);assert.match(t,/홈 화면에 추가/);assert.match(t,/웹 앱으로 열기/);assert.match(t,/다시 로그인/);assert(!p.gate().find('gate-go'));
});

await check('chat apps’ browsers cannot install: KakaoTalk and Android apps open Chrome, others say how; the address can be copied',()=>{
 const k=page({ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 KAKAOTALK 10.8.0'});
 k.gate().find('gate-go').onclick();assert.equal(k.opened,'kakaotalk://web/openExternal?url='+encodeURIComponent('https://clannad.shop/genshin-crpg/'));
 const a=page({ua:'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 Instagram 300.0'});
 a.gate().find('gate-go').onclick();assert.match(a.opened,/^intent:\/\/clannad\.shop\/genshin-crpg\/#Intent;scheme=https;package=com\.android\.chrome;S\.browser_fallback_url=/);
 const i=page({ua:IPHONE+' Instagram 300.0',platform:'iPhone'});assert(!i.gate().find('gate-go'),'iPhone apps cannot be left by a link');assert.match(i.gate().text,/Safari로 열기/);assert(i.gate().find('gate-copy'));
 const l=page({ua:IPHONE+' Line/13.0.0',platform:'iPhone'});l.gate().find('gate-go').onclick();assert.equal(l.opened,'https://clannad.shop/genshin-crpg/?openExternalBrowser=1');
});

await check('the installed game: upright shows 「가로로 돌려 주세요」 (with the rotation-lock hint), sideways plays',()=>{
 const up=page({display:'fullscreen'});assert.equal(up.gate()?.className,'crpg-gate rotate');assert.match(up.gate().text,/가로로 돌려 주세요/);assert.match(up.gate().text,/자동 회전/);assert(up.locks.includes('landscape'),'Android is asked to lock it');
 const ios=page({display:'standalone-ios',ua:IPHONE,platform:'iPhone',screen:[393,852]});assert.match(ios.gate().text,/화면 세로 방향 고정/);
 const side=page({display:'fullscreen',screen:[844,390]});assert.equal(side.gate(),null);assert(!side.rootEl.inert);
 assert.match(side.said.at(-1)||'',/가로로 들고/,'the first start from the home screen says so once');
});

await check('tablets and desktop browsers keep the browser; ?display=app opens the installed layout for testing',()=>{
 for(const opts of [{screen:[820,1180]},{ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36',coarse:false,screen:[1920,1080],platform:'Win32'}]){const p=page(opts);assert.equal(p.gate(),null,JSON.stringify(opts));}
 const t=page({search:'display=app',screen:[390,844]});assert.equal(t.gate()?.className,'crpg-gate rotate');
 assert.equal(page({search:'display=app',screen:[844,390]}).gate(),null);
});

await check('upright-phone rules stop at sideways phones; the shell treats a sideways phone as a wide screen',()=>{
 const narrow=[];
 for(const f of ['shell.css','style.css','growth_v01522.css'])for(const m of src(f).matchAll(/@media\s*([^{]+)\{/g))for(const part of m[1].split(',')){const w=/\(max-width:\s*(\d+)px\)/.exec(part);if(w&&+w[1]<=780&&!/min-height:501px/.test(part))narrow.push(f+': '+part.trim());}
 assert.deepEqual(narrow,[]);
 const shell=src('app_shell.js');assert(shell.includes("const MOBILE_QUERY='(max-width: 760px) and (min-height: 501px)';")&&shell.includes('const isMobile=()=>matchMedia(MOBILE_QUERY).matches;'));
 assert(land.startsWith('/* 0.15.24 가로 휴대폰')&&land.includes('@media (orientation:landscape) and (max-height:500px){'));
 // one thin top bar, the menus down a rail, the rail away during a fight
 assert(land.includes('body.teyvat{--hud-h:44px;--rail-w:54px;')&&/body\.teyvat nav\.hud-nav\{position:fixed;z-index:44;left:0;[^}]*flex-direction:column/.test(land));
 assert(land.includes('body.teyvat[data-mode=battle] nav.hud-nav{display:none}'));
 // the map's destinations in one column, the move button always under the map
 assert(land.includes('body.teyvat .shell-loc-main .terrain-destination-list{grid-template-columns:minmax(0,1fr);gap:0}')&&land.includes('body.teyvat .shell-loc-main .terrain-travel-dock{margin-top:6px;'));
});

await check('battle: the 0.15.21 composition, enemy rows by count (1–4 one row, 5–8 two), summon strips only when present',()=>{
 const lay=src('app_battle_layout_v01522.js'),g=src('growth_v01522.css');
 assert(!/battle-fit/.test(lay+g),'the 0.15.22 scaled board is gone');
 assert(lay.includes("enemies.dataset.rows=n>4?'2':'1';")&&lay.includes("String(n>4?Math.ceil(n/2):Math.max(1,n))"));
 assert(lay.includes("'아군 소환체':'적 소환체'")&&!lay.includes('우리 소환체'));
 assert(src('shell.css').includes('html:has(body.battle-screen),body.battle-screen{overflow:hidden}'),'a fight never scrolls the page');
 assert(/shell-enemies\[data-rows="2"\]\{--enemy-h:clamp\(40px,calc\(\(100dvh - 282px\) \/ 2\),92px\)/.test(land),'two short rows fit a sideways phone');
});

await check('turn order: a face (or the ✦ mark of a fighter without a picture) and the name, also when playback redraws it',()=>{
 const exp=src('app_experience.js'),fx=src('app_battle_fx_v01521.js'),face=fnBody(exp,'battleOrderFace');
 assert(face.includes("el('img','order-face')")&&face.includes("el('span','order-face mark','✦')")&&face.includes("entry.classList.add('with-face')"));
 assert(/battleOrderFace\(entry,a\)/.test(fnBody(exp,'battleOrder')),'first drawing');
 assert(/battleOrderFace\(li,a\)/.test(fx),'the round playback rebuilds the list with faces too');
});

await check('the tutorial speaks: Amber (Paimon for the traveller’s first steps), a line for every step, beside its target',()=>{
 const tut=src('app_tutorial.js');
 const at=tut.indexOf('const TUTORIAL_LINES=')+'const TUTORIAL_LINES='.length;let depth=0,end=at;for(;end<tut.length;end++){if(tut[end]==='{')depth++;else if(tut[end]==='}'&&!--depth)break;}
 const lines=vm.runInNewContext('('+tut.slice(at,end+1)+')');
 const said=[...tut.matchAll(/say:'([\w.]+)'/g)].map(m=>m[1]).concat(['life']);
 for(const k of said)assert(lines.AMBER[k],'Amber has a line for '+k);
 for(const k of ['move.map','move.pick','move.go','move.tab','storyTravel','arrival'])assert(lines.PAIMON[k],'Paimon has a line for '+k);
 assert(/traveller&&\['move','storyTravel','arrival'\]\.includes\(step\.id\)&&!game\.tutorialState\(\)\.done\.arrival\?'PAIMON':'AMBER'/.test(tut),'Paimon until the traveller reaches the plains, then Amber');
 const pos=fnBody(tut,'tutorialPosition');
 assert(pos.includes("text.dataset.tail=tail")&&pos.includes('top0')&&pos.includes('left0'),'the bubble picks a side, never over the top bar or the menu rail');
 const css=src('tutorial_v01523.css');assert(css.includes('#tutorial-tour.tutorial-say::after')&&!/\.speaker/.test(css),'its own tail, not the dialogue speaker line');
 return {keys:said.length};
});

await check('story picture grows with the screen and fades at its edges; the defeat countdown is live in every message',()=>{
 const css=src('shell.css');assert(css.includes('body.teyvat .shell-story-figure .portrait-frame img{max-width:min(58vw,1100px);'));
 assert(/mask-composite:intersect/.test(css));
 const gear=src('app_gear.js'),reasons=src('app_reasons_v01413.js');
 assert(gear.includes('const DEFEAT_NOTE=/정신을 차리는 중입니다 · (\\d+초) 남음/;')&&gear.includes('function liveDefeatNotes('));
 assert(reasons.includes('game.actionReason(act.type,act.params||{})'),'the reason is asked again when the button is pressed');
});

const out=path.join(root,'reports/v01524');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({version:'0.15.24',total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
})();
