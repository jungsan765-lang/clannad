'use strict';
// 0.16.5 전투 이펙트 (user, 2026-10-07: 「전투 이펙트도 좀... 전체적으로 퀄이 낮아서... 외부 에셋을 쓰던지 뭐 어떻게든 해봐...」):
// a canvas draws the light of every blow (app_vfx_v0165.js) — no picture downloaded, every sprite drawn by the file;
// the skill and battle effects hand it their flashes, rings, motes, streaks, bolts, vortices, pillars, blade crescents
// and reaction blasts, and keep their page pieces for when it is missing (움직임 줄이기).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
const vfx=src('app_vfx_v0165.js');

// A page-less sandbox with a canvas that records what is drawn.
function sandbox({reduce=false}={}){
 const drawn={images:0,strokes:0,fills:0};
 const gradient=()=>({addColorStop(){}});
 const context=canvas=>new Proxy({canvas,globalAlpha:1,globalCompositeOperation:'source-over'},{get(t,k){if(k in t)return t[k];if(k==='drawImage')return ()=>{drawn.images++;};if(k==='stroke')return ()=>{drawn.strokes++;};if(k==='fill'||k==='fillRect')return ()=>{drawn.fills++;};if(/Gradient$/.test(k))return gradient;return ()=>{};},set(t,k,v){t[k]=v;return true;}});
 const element=tag=>{const n={tagName:tag.toUpperCase(),style:{},className:'',width:0,height:0,isConnected:false,classList:{contains:()=>false},setAttribute(){},getContext(){return this._ctx||(this._ctx=context(this));},animate(){return {finished:Promise.resolve()};}};return n;};
 const frames=[];
 const doc={documentElement:{classList:{contains:c=>reduce&&c==='reduce-motion'}},body:{classList:{contains:()=>false},append(n){n.isConnected=true;}},createElement:element};
 const s={console,document:doc,innerWidth:748,innerHeight:360,devicePixelRatio:2,settings:{combatSpeed:.5,reducedMotion:false},performance:{now:()=>Date.now()},
  requestAnimationFrame(f){frames.push(f);return frames.length;},addEventListener(){},Math};
 s.window=s;vm.createContext(s);vm.runInContext(vfx,s,{filename:'app_vfx_v0165.js'});
 // The frames on the sandbox's own clock (its performance.now is Date.now).
 const run=(n=1,step=16)=>{let t=s.performance.now();for(let i=0;i<n;i++){const f=frames.shift();if(!f)break;t+=step;f(t);}};
 return {V:s.CRPGVFX,drawn,run,frames};
}

check('the engine ships right before the battle effects, and the build lists it there too',()=>{
 const html=src('index.html'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
 assert(html.includes('<script src="app_motion.js"></script><script src="app_vfx_v0165.js"></script><script src="app_battle_fx_v01521.js"></script><script src="app_skill_fx_v0162.js"></script>'));
 assert(build.includes("'app_motion.js','app_vfx_v0165.js','app_battle_fx_v01521.js','app_skill_fx_v0162.js',"));
});

check('every sprite is drawn by the file: no picture, no address, no download',()=>{
 assert(!/https?:|\.(png|webp|jpe?g|gif|svg)\b|new Image\(|fetch\(|XMLHttpRequest/.test(vfx),'nothing fetched or loaded');
 for(const k of ['glow','spark','shard','flame','drop','leaf','rock','star','smoke','hex'])assert(new RegExp('\\b'+k+'\\(\\)\\{const c=board\\(').test(vfx),k+' is drawn by code');
});

check('each element throws its own light, and a blow, a bolt, a blade, a vortex and a pillar draw',()=>{
 const {V,drawn,run}=sandbox();assert(V.on());
 for(const el of ['pyro','hydro','cryo','electro','anemo','geo','dendro','physical'])V.burst(200,150,el);
 V.bolt(600,0,600,150,'electro');V.slash(400,200,'#ffffff',{heavy:true});V.vortex(300,250,'anemo');V.pillar(500,300,'geo');V.beam(100,100,300,120,'#ff8a50');V.ring(200,200,'geo',{hex:true,flat:.4});V.sparks(200,200,'pyro',{n:12,dir:0,spread:1});
 const c=V.count();assert(c.particles>150&&c.strokes>=10,JSON.stringify(c));
 run(40,16);assert(drawn.images>200&&drawn.strokes>20&&drawn.fills>0,JSON.stringify(drawn));
});

check('colours from the other effect files find their element; names in either language too',()=>{
 const {V}=sandbox();
 for(const [x,el] of [['#ff8a50','pyro'],['#4cc2f1','hydro'],['#a6e4f2','cryo'],['#c79bff','electro'],['#74e0c2','anemo'],['#f5c542','geo'],['#a5d63b','dendro'],['#ffffff','physical'],['불','pyro'],['fire','pyro'],['GEO','geo'],['wind','anemo']])assert.equal(V.elOf(x),el,x);
 assert.equal(V.palOf('#123456')[1],'#123456','an unknown colour is used as it is');
});

check('a phone keeps it light: the particles stop at a cap',()=>{
 const {V}=sandbox();for(let i=0;i<120;i++)V.motes(200,150,'pyro',{n:12,r:60});assert(V.count().particles<=560,JSON.stringify(V.count()));
});

check('움직임 줄이기 turns it off (the page pieces are used instead), and the playback’s pause holds it',()=>{
 const {V}=sandbox({reduce:true});assert.equal(V.on(),false);V.burst(100,100,'pyro');V.bolt(0,0,10,10);assert.deepEqual({...V.count()},{particles:0,strokes:0});
 assert(vfx.includes("CombatFX.pause=function(p){const out=prior.call(this,p);V.hold(!!p);return out;}"),'pause');
 assert(/GameEffects\.cancel=function\(\.\.\.args\)\{const natural=this\.active&&!this\.resolve&&fighting\(\);held=false;if\(!natural\)V\.clear\(\);/.test(vfx),'a skipped playback clears it');
 assert(vfx.includes("const speed=()=>")&&vfx.includes('dt*=speed()'),'the battle speed is its clock');
});

check('the skill effects hand their pieces to the canvas and keep the page pieces for when it is missing',()=>{
 const fx=src('app_skill_fx_v0162.js');
 assert(fx.includes("const VFX=()=>{const v=window.CRPGVFX;return v&&v.on()?v:null;};"));
 for(const call of ['v.ring(p.x,p.y,c,','v.flash(p.x,p.y,c,','v.motes(p.x,p.y,el,o)','v.beam(a.x,a.y,b.x,b.y,c,','v.vortex(p.x,p.y,c,','v.pillar(p.x,p.y+(o.dy??20),c,','v.bolt(p.x+'])assert(fx.includes(call),call);
 for(const kind of ['flames','gust','claw','frostslash'])assert(new RegExp(kind+'\\(p,c,el,o\\)\\{[^\\n]*VFX\\(\\)').test(fx),kind+' as light');
 assert(fx.includes("VFX()?.shake(panel?.querySelector("),'a burst jolts the side it struck');
});

check('every weapon blow and every reaction has its light; a critical hit flares gold',()=>{
 const bfx=src('app_battle_fx_v01521.js');
 const motion=[...bfx.matchAll(/^ (\w+)\(l,p,o\)\{/gm)].map(m=>m[1]),light=[...bfx.slice(bfx.indexOf('const LIGHT={'),bfx.indexOf('};',bfx.indexOf('const LIGHT={'))).matchAll(/^ (\w+)\(v,p,o\)\{/gm)].map(m=>m[1]);
 assert.deepEqual(light.sort(),[...new Set(motion)].sort(),'the same blows');
 const react=[...bfx.slice(bfx.indexOf('const REACTION_FX={'),bfx.indexOf('};',bfx.indexOf('const REACTION_FX={'))).matchAll(/^ (\w+)\(l,p\)\{/gm)].map(m=>m[1]),lightReact=[...bfx.slice(bfx.indexOf('const LIGHT_REACTION={'),bfx.indexOf('};',bfx.indexOf('const LIGHT_REACTION={'))).matchAll(/^ (\w+)\(v,p(,node)?\)\{/gm)].map(m=>m[1]);
 assert.deepEqual(lightReact.sort(),react.sort(),'the same reactions');
 assert(bfx.includes("if(v&&LIGHT[style]){")&&bfx.includes("if(v&&LIGHT_REACTION[k])LIGHT_REACTION[k](v,p,node);else REACTION_FX[k](layer,p);"));
 assert(bfx.includes("if(t.critical){const v=VFX();if(v){v.flash(p.x,p.y,'#ffd36b'"),'critical');
});

check('version 0.16.5 with its notes on top of the full chain',()=>{
 const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),pkg=json('package.json'),lock=json('package-lock.json');
 const [maj,min,pat]=pkg.version.split('.').map(Number);assert(maj>0||min>16||(min===16&&pat>=5),pkg.version);assert.equal(lock.version,pkg.version);
 let n=json('content/release-notes.json');while(n&&n.version!=='0.16.5')n=n.previous;assert(n,'0.16.5 is in the chain');
 assert.equal(n.previous.version,'0.16.4');assert.equal(n.previous.previous.version,'0.16.3');
 for(const word of ['전투 이펙트','검광','치명타','움직임 줄이기'])assert(n.changes.some(x=>x.includes(word)),word);
 assert(fs.existsSync(path.join(root,'docs/PATCH_0.16.5_KO.md')),'the patch notes');
});

console.log(JSON.stringify({ok:!process.exitCode,checks:passed}));
