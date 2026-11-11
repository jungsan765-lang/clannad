'use strict';
// 0.16.4 (the user's notes of 2026-10-07, with a recording and four phone pictures): 「크기조절 좀 하고 위치 누르다보면 이런식으로
// 덜덜 떨리면서 아무데도 안눌리는 버그. 종려의 무한 석화 버그.(이건 좀 전체적으로 바꿀 필요가 있어보인다) 그리고 휴대폰에서 상자 얻고나면
// 화면 짤리거나, 아이템창이 너무 커서 확인하기 어렵다거나 … 전투 패배하면 이야기로 돌아가기 버튼 있는거 없애주고. … 종려 기둥을
// 저딴식으로 설계한다고...?」
const assert=require('node:assert/strict');
const {fresh,fs,path,vm,root}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
const fnBody=(text,name)=>{const at=text.indexOf('function '+name+'(');assert(at>=0,name);let depth=0,i=text.indexOf('{',at);for(let j=i;j<text.length;j++){if(text[j]==='{')depth++;else if(text[j]==='}'){depth--;if(!depth)return text.slice(at,j+1);}}throw new Error('unclosed '+name);};

// 종려 with his burst ready every time it comes back, against sturdy foes: each foe's turns in order, 'a' acted, 's' lost.
function stoneRun(cons){
 const r=fresh('MAP_LIYUE_PLAINS');r.adminApply({op:'level',target:'ALL',value:40});r.adminApply({op:'recruit',char:'LIYUE_ZHONGLI'});
 r.s.party[1]={slot:'PARTY_2',type:'CHAR',source:'LIYUE_ZHONGLI',control:'AI',active:true,tactic:'균형'};
 if(cons)(r.s.constellations??={}).LIYUE_ZHONGLI=cons;
 r.startBattle('EG_LIYUE_HILI_ROCK','RANDOM');try{r.action('COMBAT_BEGIN');}catch(e){}
 for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY')){a.maxHp*=40;a.hp=a.maxHp;}
 // Each foe's turns as they begin (runtime_combat.js has just dropped what ended): lost if something still holds it.
 const turns={},prior=r.onCombatTurnStart;let seen=0,stone=0,resisted=0;
 r.onCombatTurnStart=function(a){if(prior)prior.call(this,a);if(a.side==='ENEMY')(turns[a.id]??=[]).push(this.combatActionLocked(a)?'s':'a');};
 for(let n=0;n<80&&r.s.runtime&&r.s.runtime.round<=14;n++){
  const cards=r.combatCards().filter(x=>!x.reason),card=cards.find(x=>x.id==='PLAYER_BASIC_GUARD')||cards[0];if(!card)break;
  r.action('COMBAT',{card:card.id,target:card.targets?.[0]?.id});const b=r.s.runtime;if(!b)break;
  for(const l of b.log.slice(seen)){if(l.statusApplied?.id==='LIYUE_PETRIFY')stone++;if(l.resisted)resisted++;}
  seen=b.log.length;
 }
 return {turns,stone,resisted};
}
function runs(seq){const out=[];let cur=null;for(const x of seq){if(cur&&cur.k===x)cur.n++;else out.push(cur={k:x,n:1});}return out;}

check('turn-taking statuses on either side: the next turn only (4돌 석화: two), then two turns of the foe’s own',()=>{
 const st=src('runtime_status_v01522.js');
 assert(/const HARD=\{STATUS_FREEZE:[^}]*LIYUE_PETRIFY:[^}]*STATUS_STUN:[^}]*ILLUSORY_BUBBLE:/.test(st),'freeze, petrify, stun and the bubble');
 assert(st.includes("(a.side==='ALLY'||a.side==='ENEMY')"),'both sides');
 for(const cons of [0,4]){
  const out=stoneRun(cons),max=cons>=4?2:1;assert(out.stone>0,'종려 turned someone to stone (C'+cons+')');
  for(const [id,seq] of Object.entries(out.turns)){
   const rs=runs(seq);
   for(const [i,x] of rs.entries()){
    if(x.k==='s')assert(x.n<=max,'C'+cons+' '+id+' lost '+x.n+' turns in a row: '+seq.join(''));
    // between two locks, two turns of the foe's own (the last free stretch may be cut short by the end of the test)
    if(x.k==='a'&&i>0&&i<rs.length-1)assert(x.n>=2,'C'+cons+' '+id+' was locked again after '+x.n+' turn: '+seq.join(''));
   }
  }
 }
 const cons=src('runtime_constellations_v01411.js');
 assert(cons.includes('천성의 석화가 한 차례 더 이어진다.'),'4돌 says what it does now');
 assert(/statusExtend[\s\S]{0,400}untilTurn[\s\S]{0,200}controlGuard/.test(cons),'and it moves the end and the guard together');
});

check('종려’s 석주, 응광’s 병풍, 감우’s 연꽃, 리사’s 장미 stand in the lane with the skill’s official picture and the rounds left',()=>{
 const exp=src('app_experience.js'),ui=json('content/genshin-ui-assets.json'),fx=src('app_skill_fx_v0162.js');
 const want={STONE_STELE:['지핵의 석주','LIYUE_ZHONGLI','e'],JADE_SCREEN:['선기 병풍','LIYUE_NINGGUANG','e'],ICE_LOTUS:['얼음 연꽃','LIYUE_GANYU','e'],ROSE:['번개 장미','MOND_LISA','q']};
 for(const [kind,[name,who,slot]] of Object.entries(want)){
  assert(exp.includes(kind+":{name:'"+name+"',icon:['"+who+"','"+slot+"']"),kind);
  const p=ui.skills?.[who]?.[slot]?.path;assert(p&&fs.existsSync(path.join(root,p)),kind+' has its official picture ('+p+')');
 }
 assert(exp.includes("card=el('div','battle-summon'+(m.icon?' construct':''))")&&exp.includes("el('img','summon-portrait construct-icon')"),'a card of its own');
 assert(exp.includes("cp.append(el('small','',m.line+' · 남은 '+remaining+'라운드'))"),'the rounds it stays');
 assert(fx.includes("STONE_STELE:['construct','stele','geo']")&&fx.includes("where==='construct'"),'the pillar is drawn on its card');
 assert(fx.includes("const CONSTRUCT_OF={LIYUE_ZHONGLI_E:'STONE_STELE',MOND_LISA_Q:'ROSE'}"),'and its blows start from it');
 const css=src('shell.css');assert(css.includes('.battle-summon.construct')&&css.includes('.construct-icon'),'styled');
});

check('a lost story fight: the way back is 「전투 직전부터 다시 준비」, never 「이야기로 돌아가기」',()=>{
 const exp=src('app_experience.js'),gear=src('app_gear.js'),shell=src('app_shell.js'),ctx=vm.createContext({game:null});
 vm.runInContext(fnBody(exp,'journeyReturn'),ctx);const back=game=>{ctx.game=game;return plain(vm.runInContext('journeyReturn()',ctx));};
 assert.deepEqual(back({s:{storyRecovery:{}},playPhase:()=>'RECOVERY',actionReason:()=>'blocked'}),{label:'전투 직전부터 다시 준비',retry:true});
 assert.deepEqual(back({s:{},playPhase:()=>'FREE',actionReason:()=>''}),{label:'메인 화면으로',screen:'LOCATION'});
 for(const [f,text] of [['app_experience.js',exp],['app_gear.js',gear]])assert(text.includes("back.retry?actionButton(back.label,'STORY_RETRY',{},true)"),f+' presses the retry');
 assert(shell.includes("game?.s?.storyRecovery&&!game.s.runtime")&&shell.includes("'전투 직전부터 다시 준비'"),'the page head too');
 const r=fresh();assert(typeof r.action==='function');
});

check('the map no longer shakes: no scroll bars to come and go, and the same size never lays the map out again',()=>{
 const css=src('shell.css'),nav=src('app_navigation.js');
 assert(/\.terrain-viewport\{[^}]*scrollbar-width:none/.test(css)&&css.includes('.terrain-viewport::-webkit-scrollbar{display:none}'),'no scroll bars');
 assert(nav.includes("let laidOut='';")&&nav.includes("if(size===laidOut)return;laidOut=size;"),'a layout only when the size or the camera changed');
});

check('sideways phones: the cut-out side is dark, the rail clears it, and the CSS has no stray PowerShell 「`n」',()=>{
 const html=src('index.html'),css=src('shell.css'),land=src('landscape_v01524.css');
 assert(/<meta name="viewport" content="[^"]*viewport-fit=cover/.test(html),'viewport-fit=cover');
 assert(css.includes('html:has(>body.teyvat){background-color:#070a12}'),'a dark page behind the game');
 assert(land.includes('calc(var(--rail-w) + env(safe-area-inset-left) + 6px)'),'the rail clears the cut-out');
 for(const f of fs.readdirSync(path.join(root,'source')).filter(f=>f.endsWith('.css')))assert(!src(f).includes('`n'),f+' has a literal `n');
});

check('sideways phones: smaller letters, buttons and pictures, so every screen and window shows its content',()=>{
 const land=src('landscape_v01524.css'),at=land.indexOf('0.16.4 폰 화면 손질');assert(at>0,'the 0.16.4 block');
 const block=land.slice(land.lastIndexOf('@media (orientation:landscape) and (max-height:500px){',land.indexOf('body.teyvat{font-size:12.5px}')));
 assert(land.indexOf('body.teyvat{font-size:12.5px}')>at,'inside the sideways-phone block');
 for(const rule of [
  '.ch-reveal{min-height:0;display:grid;grid-template-columns:minmax(140px,44%) minmax(0,1fr)', // the chest beside its rewards
  'body.teyvat .bag-cols .bag-grid{grid-template-columns:repeat(auto-fill,minmax(66px,1fr))',  // six items a row
  'body.teyvat .shell-loc-main .terrain-layout{grid-template-columns:minmax(0,1fr) minmax(124px,144px)', // a bigger map
  '.ml-box{height:calc(100dvh - 12px)',                                                        // the mailbox keeps 「받기」 in sight
  'body.teyvat .hb-book{height:calc(100dvh - 12px);grid-template-columns:132px minmax(0,1fr)', // the handbook
  'body.teyvat :where(#root) button.gear-slot{min-height:64px',                                 // the character's gear slots
  'body.teyvat .party-cols .role-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))', // the party's roles
  'body.teyvat .shop-main .market-grid{grid-template-columns:repeat(auto-fill,minmax(70px,1fr))',    // shops
  'body.teyvat .shell-loc-side .re-head>svg{width:20px',                                         // the 「할 일」 card
 ])assert(block.includes(rule),rule);
 assert(!/<select|el\('select'\)/.test(land),'no drop-downs');
});

check('version 0.16.4 with its notes on top of the full chain',()=>{
 const pkg=json('package.json'),lock=json('package-lock.json'),notes=json('content/release-notes.json');
 const [maj,min,pat]=pkg.version.split('.').map(Number);assert(maj>0||min>16||(min===16&&pat>=4),pkg.version);assert.equal(lock.version,pkg.version);
 let n=notes;while(n&&n.version!=='0.16.4')n=n.previous;assert(n,'0.16.4 is in the chain');
 assert.equal(n.previous.version,'0.16.3');assert.equal(n.previous.previous.version,'0.16.2');
 for(const word of ['떨리며','석화','석주','전투 직전부터 다시 준비','휴대폰'])assert(n.changes.some(x=>x.includes(word)),word);
 assert(fs.existsSync(path.join(root,'docs/PATCH_0.16.4_KO.md')),'the patch notes');
});

console.log(JSON.stringify({ok:!process.exitCode,checks:passed}));
