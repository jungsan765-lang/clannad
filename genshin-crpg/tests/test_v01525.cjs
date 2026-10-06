'use strict';
// 0.15.25 (the user, 2026-10-06): 「튜토리얼 하고 있는데 방어 가르치기도 전에 다 뒤져」, 「비경은 왜 맵마다 나눠져 있는게 아니라 그냥
// 맘대로 들어갈 수 있게 된거야?」, 「성장 비경이 영웅의 경험 두개면 지맥은 뭐하러 있는거냐」, 「비경 준비 이거 다 없애고 그냥 네가
// 만들어라」, 「v 눌러서 고르는거 그거 아예 쓰지 말라」, 「이거 그냥 격동의 바람에 힐이 붙어있는겨? … 못알아쳐먹겠네」.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {fresh,R,db,c,root}=require('./helpers_v011.cjs');
const {prologue,ready}=require('./test_tutorial_v01523.cjs');
const api=c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x)),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

// Follow the lesson the way the spotlight asks: the card it names, else a plain attack.
function playLesson(r){r.action('COMBAT_BEGIN');const steps=[];for(let n=0;r.s.runtime&&n<40;n++){const dir=r.tutorialDirective(),cards=r.combatCards().filter(x=>!x.reason),card=dir?.card&&cards.find(x=>x.id===dir.card)||cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards[0];steps.push(card.id);r.action('COMBAT',{card:card.id,target:card.targets?.[0]?.id});r=new R(db,cp(r.s));}return {r,steps};}

check('the first story fight teaches attack, guard, the elemental skill and the burst before it ends (more slimes come while a lesson waits)',()=>{
 // 0.15.25 again (user: 「여전히 Q스킬 배우기도 전에 몬스터가 잡히는데?」): the burst is the fourth lesson, so three waves.
 const runs=[];for(let i=0;i<6;i++){let r=prologue();ready(r);const before=r.s.runtime;assert.equal(before.tutorialWaves?.waves,3);assert(before.enemyReserve.every(a=>[1,2,3].includes(a.waveHold)),'the waves wait outside the field');
  const out=playLesson(r);r=out.r;const d=r.tutorialState().done;assert(d.combatAttack&&d.combatGuard&&d.combatSkill&&d.combatBurst,JSON.stringify(out.steps));assert.deepEqual(out.steps.slice(0,4).map(x=>x.replace(/^PLAYER_(TRAVELER_ANEMO_|ISEKAI_)?/,'')),['BASIC_ATTACK','BASIC_GUARD','E','Q'],'in the order the spotlight asks');assert(!r.s.runtime);assert(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).victory);runs.push(out.steps.length);}
 return {actions:runs};
});

check('the waves leave once the lessons are learned, never come to a later fight, and cannot be forged',()=>{
 let r=prologue();ready(r);r.action('COMBAT_BEGIN');
 for(const id of ['PLAYER_BASIC_ATTACK','PLAYER_BASIC_GUARD']){const card=r.combatCards().find(x=>x.id===id&&!x.reason);r.action('COMBAT',{card:card.id,target:card.targets?.[0]?.id});if(!r.s.runtime)break;}
 for(const re of [/_E(?:_CHARGE)?$/,/_Q$/])if(r.s.runtime){const e=r.combatCards().find(x=>re.test(x.id)&&!x.reason);r.action('COMBAT',{card:e.id,target:e.targets?.[0]?.id});}
 if(r.s.runtime){assert(r.s.runtime.tutorialWaves.stop);assert(!r.s.runtime.enemyReserve.some(a=>a.waveHold),'no wave after the last lesson');}
 const learned=prologue();Object.assign(learned.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});ready(learned);assert(learned.s.runtime&&!learned.s.runtime.tutorialWaves,'nothing to teach, no waves');
 assert(src('runtime_tutorial_v01522.js').includes("if(b.actors.filter(a=>a.side==='ALLY'&&!a.fbSummon).length<2)return;"),'a hero alone (the isekai route) fights the authored count; tests/test_v0153.cjs wins it at Lv.1');
 const old=prologue();Object.assign(old.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true});const migrated=new R(db,cp(old.s));assert(migrated.tutorialState().done.combatBurst,'a journey past its first fight before 0.15.25 is not stopped for the burst later');
 const random=fresh('MAP_MOND_PLAINS');random.startBattle('EG_MOND_SLIME_SMALL','RANDOM');assert(!random.s.runtime.tutorialWaves,'only a story fight');
 let x=prologue();ready(x);for(const forge of [s=>{s.runtime.tutorialWaves.released=5;},s=>{s.runtime.enemyReserve[0].waveHold=9;},s=>{s.runtime.origin='RANDOM';},s=>{delete s.runtime.tutorialWaves;}]){const s=cp(x.s);forge(s);assert.throws(()=>new R(db,s));}
});

check('domains stand at their places in the original (official names), one material each, four stages, own enemies; experience is the ley lines\' job',()=>{
 const sites=api.growthV01522.domains,names=Object.fromEntries(Object.entries(sites).map(([k,d])=>[k,d.name+'@'+d.map+':'+d.kind]));
 assert.deepEqual(names,{FORSAKEN_RIFT:'잊혀진 협곡@MAP_MOND_SPRINGVALE:TALENT',VALLEY_OF_REMEMBRANCE:'각인의 골짜기@MAP_MOND_DAWN_WINERY:ASCENSION',CECILIA_GARDEN:'세실리아의 모밭@MAP_MOND_WOLVENDOM:GEAR',TAISHAN_MANSION:'태산부@MAP_LIYUE_JUEYUN:TALENT',ZHOU_FORMULA:'무망 인구 밀궁@MAP_LY_DETAIL_WANGSHU:ASCENSION',LIANSHAN_FORMULA:'천둥 연산 밀궁@MAP_LY_DETAIL_MINGYUN:GEAR'});
 const seen=new Set();
 for(const [key,d]of Object.entries(sites))for(const stage of [1,4])for(const element of d.kind==='ASCENSION'?['NEUTRAL','PYRO','ELECTRO','DENDRO']:['NEUTRAL']){
  const r=fresh(d.map);r.adminApply({op:'level',target:'ALL',value:60});for(const k of ['FLAG_TRV_MON_CH1_CLEAR','FLAG_TRV_MON_CH2_CLEAR'])r.s.flags[k]=true;for(let n=1;n<=3;n++){for(const q of ['Q_TRV_MOND_0'+n,'Q_TRV_LIYUE_0'+n])if(r.tables['22_QUEST_DB'].has(q))r.questState(q).claimed=true;}
  r.s.global.SCREEN_MODE='LOCATION';r.action('DOMAIN_START',{domain:key+':'+stage,element});const foes=r.s.runtime.actors.filter(a=>a.side==='ENEMY');assert(foes.length>=2&&foes.length<=8);seen.add(foes.map(a=>a.source).sort().join(','));new R(db,cp(r.s));}
 assert(seen.size>=12,'every stage has its own lineup');
 const ley=api.leyLines.regionalTiers('몬드');assert(ley.every(t=>t.books.MAT_CHAR_EXP_HERO>0),'계시의 꽃 still pays experience books');
 return {lineups:seen.size};
});

check('no drop-down list in the game: the domain gate, the battle commands and a safety net that turns any <select> into buttons',()=>{
 const growth=src('app_growth_v01522.js'),exp=src('app_experience.js'),choice=src('app_choice_v01525.js'),html=src('index.html'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
 assert(!/el\('select'\)|new Option|showModal\('성장 비경/.test(growth),'the domain window and its lists are gone');
 assert(growth.includes("const go=actionButton('도전','DOMAIN_START',{domain:d.id,element},true)")&&growth.includes("b.className='domain-stage'")&&growth.includes("b.className='domain-element'"),'stages and elements are pictures to press');
 assert(!growth.includes('편성·육성 후 도전')&&!growth.includes('편성·프리셋 바꾸기'),'no party step');
 assert(!/el\('select'\)/.test(exp),'battle: target on the cards, skill ways as buttons');assert(exp.includes("c.tabIndex=0;c.setAttribute('role','button')"));
 assert(choice.includes("box.className='choice-tiles'")&&choice.includes("sel.dispatchEvent(new Event('change',{bubbles:true}))"));
 const at=f=>html.indexOf('<script src="'+f+'"');assert(at('app_choice_v01525.js')>at('app_battle_layout_v01522.js')&&at('app_choice_v01525.js')>at('app_growth_v01522.js'),'loads after every screen');assert(build.includes("'app_choice_v01525.js'"));
 const agents=fs.readFileSync(path.join(root,'AGENTS.md'),'utf8');assert(agents.includes('ChatGPT 작업 금지')&&agents.includes('드롭다운 절대 금지'));
 for(const doc of ['docs/AI_HANDOFF.md','docs/NEXT_STEPS_KO.md'])assert(fs.readFileSync(path.join(root,doc),'utf8').includes('ChatGPT 작업 금지'),doc);
 // Every game screen this team edits builds buttons, not <select>: settings, tools, party roles, the bag, the shop's
 // comparison, the market's order, the exchange, the Spiral Abyss, co-op commands, the operator's grant and the old
 // offline form. Only the operator console (admin.js, not the game) and a file another team owns (app_online.js, caught
 // by the safety net) may still build one.
 // ui.html is the old one-file prototype: not built or shipped, and its baseline hash is a fixture.
 const owned=new Set(['admin.js','app_online.js','app_choice_v01525.js','ui.html']),re=/(?:mk|el|h|make|node)\(\s*['"]select['"]|createElement\(\s*['"]select['"]|new Option\(|<select/;
 const left=fs.readdirSync(path.join(root,'source')).filter(f=>/\.(js|html)$/.test(f)&&!owned.has(f)&&re.test(src(f)));
 assert.deepEqual(left,[],'no drop-down built anywhere else');
 assert(choice.includes('function choiceTiles(')&&choice.includes("value===null?null:"),'the button row screens build (nothing picked until pressed where that matters)');
});

check('a picture for every growth material (official icons the user approved), the ley-line card without its paragraph',()=>{
 const icons=JSON.parse(fs.readFileSync(path.join(root,'content/item-icons.json'),'utf8')).icons;
 for(const [id,asset]of Object.entries({GROWTH_TALENT_MOND:104301,GROWTH_TALENT_LIYUE:104310,GROWTH_GEM_NEUTRAL:104101,GROWTH_GEM_PYRO:104111,GROWTH_GEM_HYDRO:104121,GROWTH_GEM_ANEMO:104151,GROWTH_GEM_ELECTRO:104141,GROWTH_GEM_CRYO:104161,GROWTH_GEM_GEO:104171,GROWTH_GEM_DENDRO:104131})){
  const e=icons[id];assert(e&&e.assetId===asset&&e.matchType==='crpg_visual_mapping'&&e.source==='https://enka.network/ui/UI_ItemIcon_'+asset+'.png',id);
  const file=path.join(root,e.path);assert(fs.existsSync(file),e.path);assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'),e.sha256,id);}
 assert(fs.readFileSync(path.join(root,'assets/icons/CREDITS.md'),'utf8').includes('# v0.15.25 성장 재료 아이콘'));
 const growth=src('app_growth_v01522.js');assert(!growth.includes("'書'"),'no placeholder character');assert(growth.includes("function costTile("),'costs as pictures');
 const ley=src('app_ley_lines.js');assert(!ley.includes('적은 파티 레벨에 맞춰 강해집니다'),'the old line was also wrong: the steps are fixed');assert(ley.includes("rewardIcon(b.kind==='REVELATION'?'MAT_CHAR_EXP_HERO':'CUR_MORA'"));
});

check('sideways phone: the windows 0.15.24 left fit the screen; the keyboard keeps the box being typed in view',()=>{
 const css=src('landscape_v01524.css'),shell=src('shell.css');
 for(const part of ['.shop-main>.market-layout{','.shell-forge{grid-template-columns:minmax(0,1fr) minmax(220px,280px)','.panel.shell-workshop .enhance-panel{display:grid','.shell-workarea:has(>.cook-tabs){display:grid','.mk-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))','.chat-head{height:auto','.cp-head,.cp-bhead,.rd-head){flex:0 0 auto','.abyss-floors{gap:4px','.gear-picker .gear-options{display:grid','html.kb-open .chat-window{'])assert(css.includes(part),part);
 assert(shell.includes('.battle-summons.top .battle-summon.summon-actor{position:relative;display:grid'),'field-boss summons are pills, the boss keeps its card');
 assert(src('index.html').includes('interactive-widget=resizes-content'));
 const install=src('app_install_v01524.js');assert(install.includes("root.classList.toggle('kb-open',open)")&&install.includes("root.style.setProperty('--vv-h',h+'px')"));
 const abyss=src('app_abyss.js');assert(abyss.includes("function floorTabs(v,onPick)")&&!abyss.includes('층마다 방이 세 개 있고, 방마다 전투를 한 번씩 치릅니다'),'floors as buttons, no rule paragraphs');
 assert(src('app_battle_layout_v01522.js').includes("if(title)title.after(line)"),'the objective rides in the heading row');
 // The GitHub check tests/test_online_browser.mjs failed from 0.15.24 on (「playback controls occupy the reserved command
 // area」): the band lies on the command area again and that area keeps its height while a round plays.
 const fit=src('app_battle_layout_v01522.js');assert(fit.includes("dock.classList.add('command-docked')")&&fit.includes("if(reserved&&command.offsetHeight<reserved)command.style.minHeight=reserved+'px'")&&fit.includes("reserved=c?.offsetHeight||0;const out=priorPlay.apply(this,args)"),'the playback band is fitted to the commands');
 assert(shell.includes('body.teyvat .combat-playback.command-docked{position:fixed;'));
});

check('a guest\'s co-op fight is the battle screen (pictures, order faces, skills, a target by touching the enemy), not a list',()=>{
 // User: 「왜 얘만 다른 화면이야? 그냥 화면 다 똑같이 하면 안되는거야?」
 const coop=src('app_coop_v0153.js');
 assert(coop.includes("p=mk('section','panel combat-panel coop-combat')")&&coop.includes("mk('div','battle-teams compact-teams')")&&coop.includes("const s=mk('section','battle-command')"),'the battle screen\'s own parts');
 assert(!coop.includes("mk('div','cp-sides')")&&!coop.includes('function unitRow('),'the old list is gone');
 assert(coop.includes("c.classList.add('targetable')")&&coop.includes("CRPGIcons.talent(owner,slot,'shell-card-glyph')"));
 const view=src('runtime_coop_v0153.js');assert(view.includes("source:a.source,side:a.side==='ALLY'?'ALLY':'ENEMY'")&&view.includes("order:(b.order||[]).map(x=>x.id)"),'the server sends whose picture and the order');
});

check('a heal that comes from gear says what it is, where it comes from and what it did (no paragraph about the playback)',()=>{
 const t=src('app_mond_boss_balance.js');
 assert(t.includes("if(key&&who){const gear=game.s.inventory.filter(i=>i.equipped&&i.owner===who.source&&i.equip)")&&t.includes("source:gear?safeName('16_EQUIP_DB',gear.i.equip):'장비 효과'"));
 assert(!t.includes('현재 행동의 피해·회복·방어 결과는 아래 전투 결과 영역에 별도로 표시됩니다.')&&!t.includes('이번 행동은 이미 계산된 결과를 재생 중입니다.'),'the old paragraphs are gone');
 const r=fresh();assert.deepEqual(cp(r.gearTraitLines('EQ_SWORD_TRAVELER')[0]),{key:'ON_KILL_HEAL',label:'처치 회복',group:'지원',text:'처치 회복 · 적을 쓰러뜨리면 HP 60 회복',innate:false},'the line the window shows');
});

check('a 4★ met in the story joins when its chapter ends: a party of four after the first chapter, five of Mond and five of Liyue later; wishes untouched',()=>{
 // User: 「스토리 진행하면서 만나는 캐릭터중에 4성 있으면 좀 나눠줘서 적어도 4인은」, 「리월에서도 좀 많이 퍼주기도」, 「가챠는 냅둬」.
 const look=r=>r.action('MENU',{screen:'STATUS'}),owned=r=>cp(r.premiumFighters()).filter(id=>id!=='PLAYER_CUSTOM'),of=(r,region)=>owned(r).filter(id=>id.startsWith(region+'_')&&r.rarityOf(id)===4);
 let r=fresh();r.s.global.PLAYER_LEVEL_STATE=20;r.s.ascensions.PLAYER_CUSTOM=api.growthV01522.phaseFor(20);r.recalculate();look(r);assert.deepEqual(owned(r),[],'nothing before the chapter ends');
 r.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR=true;look(r);assert.deepEqual(owned(r).sort(),['MOND_AMBER','MOND_KAEYA','MOND_LISA'],'the three who came along in Mond\'s first chapter');
 assert(owned(r).every(id=>r.s.chars[id].level===15),'joins like a wished companion: the hero\'s level − 5');assert(owned(r).every(id=>!r.itemCount('STELLA_'+id)),'no Stella');
 r=new R(db,cp(r.s));look(r);look(r);assert.equal(owned(r).length,3,'they stay (the wish-only guard keeps who joined before an action)');
 r.s.flags.FLAG_TRV_MON_CH2_CLEAR=true;look(r);assert(owned(r).includes('MOND_BARBARA')&&of(r,'MOND').length>=5,'Mond ends with five of its 4★');
 r.s.flags.FLAG_TRV_LY1_CLEAR=true;look(r);assert(owned(r).includes('LIYUE_NINGGUANG'));
 r.s.flags.FLAG_TRV_LY2_CLEAR=true;look(r);assert(owned(r).includes('LIYUE_XIANGLING')&&of(r,'LIYUE').length>=3);
 r.s.flags.FLAG_TRV_LIYUE_CLEAR=true;look(r);assert(owned(r).includes('LIYUE_BEIDOU')&&of(r,'LIYUE').length>=5,'Liyue ends with five of its 4★');
 const before=owned(r).length;look(r);assert.equal(owned(r).length,before,'each chapter gives once');
 assert.equal(r.recruitmentEntries().find(e=>e.character==='MOND_AMBER')?.method?.startsWith('캐릭터 소유: 이야기에서 합류'),true,'the companions list says how she came');
 // Every Isekai branch: who they meet, and the same floors.
 const branches={K:[{FLAG_ISK_META_KNOWLEDGE:'KNOWN'},'K2',['MOND_DIONA'],['MOND_DAHLIA'],['LIYUE_XINGQIU','LIYUE_CHONGYUN','LIYUE_YANFEI'],['LIYUE_YAOYAO']],AA:[{FLAG_ISK_MOND_BRANCH:'EXPEDITION',FLAG_ISK_EXPEDITION_FORK:'RIDE'},'AA2',['MOND_KAEYA'],['MOND_BARBARA'],['LIYUE_CHONGYUN'],[]],AB:[{FLAG_ISK_MOND_BRANCH:'EXPEDITION',FLAG_ISK_EXPEDITION_FORK:'RETURN'},'AB1',['MOND_KAEYA'],[],['LIYUE_XIANGLING','LIYUE_YANFEI'],['LIYUE_YUNJIN','LIYUE_XINYAN']],B:[{FLAG_ISK_MOND_BRANCH:'GUILD'},'B1',['MOND_KAEYA'],[],['LIYUE_BEIDOU','LIYUE_GAMING'],[]]};
 const counts={};
 for(const [name,[flags,leaf,prologue,mond,liyue1,later]]of Object.entries(branches)){
  let x=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');Object.assign(x.s.flags,flags);const set=f=>{x.s.flags[f]=true;look(x);x=new R(db,cp(x.s));};
  set('FLAG_ISK_RECRUIT_AMBER');assert.deepEqual(owned(x),['MOND_AMBER'],name);
  set('FLAG_ISK_MON_PROLOGUE_CLEAR');assert(prologue.every(id=>owned(x).includes(id))&&of(x,'MOND').length>=3,name+' prologue');
  set('FLAG_ISK_M05_CLEAR');assert(mond.every(id=>owned(x).includes(id))&&of(x,'MOND').length>=5,name+' Mond');
  x.s.flags.FLAG_ISK_L01_LEAF=leaf;set('FLAG_ISK_L01_CONTENT_GATE');assert(liyue1.every(id=>owned(x).includes(id)),name+' L01');
  set('FLAG_ISK_L02_CONTENT_GATE');assert(owned(x).includes('LIYUE_NINGGUANG')&&of(x,'LIYUE').length>=3,name+' L02');
  set('FLAG_ISK_L03_CONTENT_GATE');set('FLAG_ISK_L04_CONTENT_GATE');assert(later.every(id=>owned(x).includes(id))&&of(x,'LIYUE').length>=5,name+' Liyue');
  counts[name]=owned(x).length;}
 // One already wished for is not given twice (no Stella), and the floor takes the next in line.
 const w=fresh();w.wishGrant({kind:'char',id:'MOND_LISA',rarity:4});const stella=w.itemCount('STELLA_MOND_LISA');w.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR=true;look(w);
 assert.equal(w.itemCount('STELLA_MOND_LISA'),stella);assert(!w.s.storyCompanions.joined.MOND_LISA&&owned(w).length===3,'Amber and Kaeya come; Lisa was already along');
 // Nothing while Amber is only lent for the first fight, nor inside a fight.
 const lent=prologue();lent.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR=true;assert(lent.s.tutorialV2?.loan);assert.deepEqual(cp(lent.storyCompanionGrants()),[]);
 const story=src('runtime_story_companions_v01525.js');assert(!/wishRoll|banner|pity/.test(story),'wishes untouched');
 for(const forge of [s=>{s.storyCompanions.steps.ANYWHERE=true;},s=>{s.storyCompanions.joined.MOND_AMBER='NOW';},s=>{s.storyCompanions.news=Array(13).fill('MOND_AMBER');},s=>{s.storyCompanions.version=2;}]){const s=cp(r.s);forge(s);assert.throws(()=>new R(db,s));}
 // The reward window (「새 동료 합류!」) shows them as character cards, then 「편성」; no lines of text about it.
 const app=src('app_story_companions_v01525.js'),html=src('index.html'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
 assert(app.includes("mk('article','sc-card rarity-'")&&app.includes("window.CRPGShell?.open?.('PARTY')"));
 assert(src('app_adventure.js').includes("if((loot.joins||[]).length&&window.CRPGCompanionCards)box.append(window.CRPGCompanionCards.joined(loot.joins));else for(const id of loot.joins||[])"),'cards in the window that already says who joined');
 for(const f of ['runtime_story_companions_v01525.js','app_story_companions_v01525.js'])assert(html.includes('<script src="'+f+'"')&&build.includes("'"+f+"'"),f);
 assert(html.indexOf('runtime_story_companions_v01525.js')>html.indexOf('runtime_tutorial_v01522.js'),'after the roster and the tutorial');
 assert(!src('app_recruitment.js').includes('캐릭터는 기원으로 얻습니다'));
 return {isekai:counts,traveler:owned(r).length};
});

const out=path.join(root,'reports/v01525');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({version:'0.15.25',total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
