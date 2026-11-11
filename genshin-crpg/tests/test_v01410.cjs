'use strict';
// v0.14.10: the top bar never scrolls, every mark on the travel map takes a normal (held) click, 화면 크기 works on
// large monitors and says what each choice gives, 글자 크기 gains smaller steps around the same 100%, one name per
// screen (설정·캐릭터·가방), no picture coordinates on the map, and enemy cards never overlap on the narrow PC page.
const assert=require('node:assert/strict'),path=require('path'),vm=require('node:vm'),{fs,root}=require('./helpers_v011.cjs');
const results=[],src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

check('top bar: it never scrolls; the labels under its icons show below it',()=>{
 const css=src('shell.css');
 assert(css.includes('body.teyvat main>aside.shell-hud{max-height:none;overflow:visible;overscroll-behavior:auto}'),'the old sidebar scroll rule is undone for the bar');
 assert(/@media\(min-width:761px\)\{aside\{max-height:calc\(100dvh - 140px\);overflow-y:auto/.test(src('style.css')),'(the rule it overrides)');
 return {};
});

check('travel map: a held press on a circle keeps it in place, and every circle chooses its place',()=>{
 const css=src('shell.css'),nav=src('app_navigation.js');
 // A pressed pin used to lose its centring (scale only) and jump 22px away before the release. 0.15.16: the numbered
 // pins, road numbers and pressable roads became one circle per place (tests/test_map_v01516.cjs).
 assert(css.includes('body.teyvat .terrain-navigation button.terrain-node:active:not(:disabled){transform:translate(-50%,-50%)'),'circles keep their place and size while pressed');
 assert(!/terrain-node[^{]*:(hover|active)[^{]*\{[^}]*(width|height|scale)/.test(css),'circles never grow under the pointer');
 assert(nav.includes("this.control('',()=>this.choose(id),'node-'+id)"),'circles are buttons');
 assert(/\.terrain-label\{[^}]*pointer-events:none/.test(css),'names never take a press from the circle under them');
 assert(nav.includes("if(!moved&&Math.hypot(dx,dy)>4){moved=true;try{viewport.setPointerCapture(drag.id);}catch{}}")&&nav.includes("viewport.addEventListener('click',e=>{if(moved){moved=false;e.stopPropagation();e.preventDefault();}},true);"),'dragging only grabs after a real move and never ends in a press');
 assert(nav.includes("viewport.addEventListener('pointerdown',e=>{moved=false;"),'a press after a drag is never swallowed');
 assert(nav.includes('this.zoomButtons.out.disabled=c.zoom<=1.001;this.zoomButtons.in.disabled=c.zoom>=3.999;')&&nav.includes("b.setAttribute('aria-pressed',String((this.view||'near')===mode))"),'zoom buttons grey out at their limits, the chosen view stays lit');
 return {};
});

// 0.16.29 화면 고정: the page has one size, so the 화면 크기 limits and the 글자 크기 steps are gone (test_v01629.cjs).
check('글자 크기: always 16px now, whatever was saved (the fixed screen has one text size)',()=>{
 const app=src('app.js'),code=app.slice(app.indexOf('function applySettings'),app.indexOf('async function persistSettings'));
 assert(code.length>50&&code.includes('function applySettings'));
 const run=prefs=>{const box={settings:{...prefs},game:null,document:{documentElement:{style:{}}}};vm.runInNewContext(code+';applySettings();',box);return {scale:box.settings.fontScale,px:Math.round(parseFloat(box.document.documentElement.style.fontSize)*1000)/1000};};
 for(const scale of [80,100,125,150,117])assert.deepEqual(run({fontScale:scale}),{scale:100,px:16},scale+'%');
 assert(!app.includes("choiceTiles({label:'글자 크기'"),'no 글자 크기 row');
 return {px:16};
});

check('one name per screen: 설정 (not 자동저장·계정), 캐릭터 (equipment, talents, constellations), 가방',()=>{
 const shell=src('app_shell.js');
 assert(shell.includes("STATUS:{icon:'STATUS',key:'C',label:'캐릭터',short:'캐릭터'}")&&shell.includes("INVENTORY:{icon:'INVENTORY',key:'B',label:'가방',short:'가방'}")&&shell.includes("SYSTEM:{icon:'SYSTEM',key:'',label:'설정',short:'설정'}"));
 assert(shell.includes("label.textContent=def.label;}b.setAttribute('aria-label',def.label);"),'the bar and menu use these names');
 assert(shell.includes("if(h1&&['STATUS','INVENTORY','SYSTEM'].includes(key))h1.textContent=NAV[key].label;"),'page titles too');
 for(const [from,to]of [['자동저장·계정','설정'],['소리 시작','소리 켜기'],['게임 시작 화면','시작 화면으로'],['상위 20위','나선비경 랭킹']])assert(shell.includes("'"+from+"':'"+to+"'"),from);
 assert(shell.includes("if(kind==='SYSTEM')continue;"),'the menu does not list 설정 twice');
 assert(src('app_revision.js').includes("['STATUS','캐릭터','◈']")&&src('app_revision.js').includes("['INVENTORY','가방','▣']")&&src('app_revision.js').includes("['SYSTEM','설정','⚙']"));
 assert(src('app_gear.js').includes("el('div','eyebrow','CHARACTER'),el('h1','','캐릭터')"));
 // Nothing in the client (apart from the two files this project does not edit) still uses the old names.
 const old=/장비 장착(에서|으로| 화면| 메뉴)|저장·설정|성장·능력치'|아이템 화면|소지품·식사|왼쪽 메뉴|C는 장비/;
 const hits=fs.readdirSync(path.join(root,'source')).filter(f=>/^app.*\.js$/.test(f)&&!['app_online.js','app_av.js'].includes(f)).filter(f=>old.test(src(f)));
 assert.deepEqual(hits,[]);
 return {};
});

check('travel map words: no picture coordinates or approval notes on screen',()=>{
 const nav=src('app_navigation.js'),ly=src('app_liyue_areas.js');
 // 0.16.29: the 「지도 보는 법」 fold is gone with the fixed screen (no paragraphs); the key under the map stays.
 assert(!nav.includes('승인된 두 지도')&&!nav.includes('지도 보는 법')&&nav.includes("key.append(el('span','terrain-key-item '+k,text))"));
 // 0.15.6: the coordinates stay in the map data (CRPGTerrainMap.points) and the mapper's anchor note is not shown at all.
 assert(!ly.includes('원본 좌표')&&!ly.includes('880 × 786')&&!ly.includes('기준점')&&ly.includes("CRPGTerrainMap.points[a.id]=['liyue',a.point[0],a.point[1]]")&&!ly.includes('shown.anchor'));
 return {};
});

check('battle on the narrow PC page: enemy rows always fit their cards, three cards share a row',()=>{
 const css=src('shell.css');
 assert(css.includes('body.teyvat .combat-panel .shell-enemies{grid-auto-rows:max-content}'));
 assert(css.includes('@media (min-width:761px) and (max-width:1400px){body.teyvat .combat-panel .shell-enemies{--enemy-h:clamp(96px,19vh,200px);grid-template-columns:repeat(auto-fit,minmax(140px,188px))'));
 return {};
});

fs.mkdirSync(path.join(root,'reports/v01410'),{recursive:true});fs.writeFileSync(path.join(root,'reports/v01410/checks.json'),JSON.stringify({version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length}));
