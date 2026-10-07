'use strict';
// 0.15.21 전투 연출 (the user's notes of 2026-10-05/06): element auras, shield bubbles and status overlays on the cards;
// RPG Maker-style blows by weapon instead of the flying motes; red/green flashes on hit/heal; reaction bursts; no
// banner on every joined blow; the speed label doubled so the old 0.5× is the new 1× default.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {fresh,root,c}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const fx=src('app_battle_fx_v01521.js'),css=src('shell.css'),plain=x=>JSON.parse(JSON.stringify(x));
function load(extra={}){
 const listeners=[],sandbox={console,listeners,document:{addEventListener:(t,f)=>listeners.push([t,f]),documentElement:{classList:{contains:()=>false}}},localStorage:{setItem(){}},...extra};
 sandbox.window=sandbox;const ctx=vm.createContext(sandbox);
 // The page loads the icon module first; the battle effects ask it for a fighter's weapon.
 vm.runInContext(src('app_icons_v01521.js'),ctx,{filename:'app_icons_v01521.js'});vm.runInContext(fx,ctx,{filename:'app_battle_fx_v01521.js'});return ctx;
}

check('the module is shipped and loads after the shell, the combat effects and the playback',()=>{
 const html=src('index.html'),at=f=>html.indexOf('<script src="'+f+'"');
 assert(at('app_battle_fx_v01521.js')>at('app_shell.js')&&at('app_battle_fx_v01521.js')>at('app_combat_fx.js')&&at('app_battle_fx_v01521.js')>at('app_av.js'));
 // 0.16.5: the canvas light (app_vfx_v0165.js) loads just before it (tests/test_vfx_v0165.cjs).
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'app_motion.js','app_vfx_v0165.js','app_battle_fx_v01521.js',"),'the build ships it');
 assert(src('app_shell.js').includes("if(typeof BattleFX!=='undefined')BattleFX.decorate(p);"),'every battle render decorates the cards');
});

check('who strikes how: the weapon for allies, the kind of enemy for foes',()=>{
 const r=fresh();
 const actors=[['MOND_DILUC','ALLY'],['MOND_NOELLE','ALLY'],['MOND_BARBARA','ALLY'],['MOND_AMBER','ALLY'],['LIYUE_XIANGLING','ALLY'],['LIYUE_KEQING','ALLY'],['PLAYER_CUSTOM','ALLY']].map(([id,side])=>({id,source:id,side}))
  .concat([{id:'E1',side:'ENEMY',name:'츄츄 화염 궁수',range:'원거리'},{id:'E2',side:'ENEMY',name:'무상의 바람',range:'중거리'},{id:'E3',side:'ENEMY',name:'큰 물 슬라임',range:'근접'},{id:'E4',side:'ENEMY',name:'츄츄 쇠뭉치',range:'근접'},{id:'E5',side:'ENEMY',name:'숲 늑대',range:'근접'}]);
 const game={s:{runtime:{actors},inventory:[]},tables:r.tables,equipmentProficiencies:id=>r.equipmentProficiencies(id)};
 const ctx=load({game}),style=id=>ctx.BattleFX.attackStyle({actorId:id});
 const got=Object.fromEntries(actors.map(a=>[a.id,style(a.id)]));
 assert.deepEqual(plain(got),{MOND_DILUC:'cleave',MOND_NOELLE:'cleave',MOND_BARBARA:'magic',MOND_AMBER:'arrow',LIYUE_XIANGLING:'thrust',LIYUE_KEQING:'slash',PLAYER_CUSTOM:'slash',E1:'arrow',E2:'magic',E3:'slam',E4:'blunt',E5:'claw'});
 assert(fx.includes("if(!['arrow','magic'].includes(style))return;"),'only arrows and spells fly ahead');
 assert(src('app_combat_fx.js').includes("if(typeof BattleFX!=='undefined'&&BattleFX.windupShot){BattleFX.windupShot(frame,effects,from,auxiliary,summonSource,{delay:wait,duration:strike});return;}"),'the old flying motes are replaced');
 return got;
});

check('a beat between the turn and the blow: the card lights up, waits, then strikes',()=>{
 const cfx=src('app_combat_fx.js');
 assert(cfx.includes('windupDuration:460,')&&cfx.includes('windupLead:300,'),'300 ms of the 460 ms windup is the pause (×2 at the default speed)');
 assert(cfx.includes("const strike=Math.max(60,this.windupDuration-(this.windupLead||0)),wait=(this.windupLead||0)/(settings.combatSpeed||1);"));
 assert(cfx.includes('{duration:strike,delay:wait,fill:\'forwards\',easing:\'ease-in\'}'),'the step-in waits for the pause');
 assert(fx.includes('CombatFX.windup=function(frame,effects){try{turnTo(frame,effects);}'),'the glow comes first, as the action begins');
 // The user's 「여전히 제 턴이 오면서 같이 공격하는 느낌」: turnBadge lived only inside app_shell.js, so the early glow never ran
 // and the card lit up with the blow. It is reached through CRPGShell now; this runs the real wrapper.
 assert(src('app_shell.js').includes('S.turnBadge=turnBadge;S.orderNow=orderNow;'));
 const calls=[],row={classList:{contains:c=>c==='combatant-row'}};
 const ctx=load({CombatFX:{windup(){calls.push('windup');}},CRPGShell:{turnBadge(r){calls.push(r===row?'glow':'?');},orderNow(){}},document:{addEventListener(){},querySelector:()=>null,documentElement:{classList:{contains:()=>false}}}});
 ctx.CombatFX.windup({kind:'action',actorId:'A',round:1},{actorNode:()=>row});
 assert.deepEqual(calls,['glow','windup'],'the card lights up before the step-in and the blow');
 const shell=src('app_shell.js');assert(shell.includes("row.classList.add('shell-acting');}")&&!shell.includes("mk('span','shell-turn-badge','차례')"),'no 「차례」 tag: the whole card glows');
 assert(/\.combatant-row\.shell-acting\{[^}]*animation:fxActingGlow/.test(css)&&css.includes('@keyframes fxActingGlowFoe'));
});

check('text that has a picture becomes the picture',()=>{
 const exp=src('app_experience.js');assert(exp.includes("const chips=battleStatusChips(a);if(chips)copy.append(chips);c.append(copy);")&&!exp.includes("status.join(' · ')"),'no line of words on a battle card');
 const party=src('app_party.js');assert(party.includes("mark=icons?.element(element),arm=icons?.weapon(weapon,'pick-weapon')")&&party.includes("(element?' · '+element+' 원소':'')"),'the picker shows the symbols and still says the element aloud');
 assert(css.includes('.combat-panel .battle-effect-button{font-size:0!important')&&css.includes(".combat-panel .battle-effect-button::before{content:''"),'「효과」 is an ⓘ button');
});

// 0.15.21 icons (user: 「원래 퍼즐때 쓰던 아이콘 있잖아 여기다가도 넣으면 되잖아 … 전투할때도 아군, 적 원소같은것도」, then 「아이콘이 저게
// 맞아? 그냥 딴데서 에셋을 가져오는게 맞지 않아?」 and the choice 「전부 공식 아이콘으로」).
const ui=JSON.parse(fs.readFileSync(path.join(root,'content/genshin-ui-assets.json'),'utf8')),icons=src('app_icons_v01521.js');
check('the original game\'s element, weapon and talent pictures are listed with their sources and hashes',()=>{
 // 0.15.24 adds the tutorial speakers' round avatars (ui.avatars) to the same folder.
 const crypto=require('node:crypto'),all=[...Object.values(ui.elements),...Object.values(ui.weaponTypes),...Object.values(ui.normalAttacks),...Object.values(ui.skills).flatMap(s=>[s.na,s.e,s.q]),...Object.values(ui.avatars||{})];
 assert.deepEqual(Object.keys(ui.elements),['pyro','hydro','cryo','electro','anemo','geo','dendro']);
 assert.deepEqual(Object.keys(ui.weaponTypes),['한손검','양손검','장병기','활','법구']);assert.deepEqual(Object.keys(ui.normalAttacks),['한손검','양손검','장병기','활','법구']);
 assert.deepEqual(Object.keys(ui.skills).sort(),Object.keys(ui.constellations).sort(),'every character with constellations has its talents');
 for(const r of all){const file=path.join(root,r.path);assert(r.path.startsWith('assets/icons/ui/')&&fs.existsSync(file),r.path);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),r.sha256,r.path);
  assert(/^https:\/\/(enka\.network\/ui|gi\.yatta\.moe\/assets\/UI)\//.test(r.source)&&/^original_game_texture_mirror/.test(r.provenance)&&r.source_sha256,r.path);}
 assert.equal(ui.skills.LIYUE_KEQING.e.file,'Skill_S_Keqing_01');assert.equal(ui.skills.LIYUE_KEQING.q.file,'Skill_E_Keqing_01');assert.equal(ui.skills.MOND_AMBER.e.file,'Skill_S_Ambor_01');
 assert.equal(ui.skills.TRAVELER_GEO.e.file,'Skill_S_PlayerRock_01');assert.equal(ui.skills.TRAVELER_ANEMO.q.file,'Skill_E_PlayerWind_01');
 assert.equal(fs.readdirSync(path.join(root,'assets/icons/ui')).length,new Set(all.map(r=>r.path)).size,'no stray files');
 assert(fs.readFileSync(path.join(root,'assets/icons/CREDITS.md'),'utf8').includes('# v0.15.21 원소 · 무기 종류 · 특성 아이콘'));
 return {files:new Set(all.map(r=>r.path)).size};
});

check('one icon module draws them; no hand-drawn pictures are left',()=>{
 const html=src('index.html'),at=f=>html.indexOf('<script src="'+f+'"');
 assert(at('app_icons_v01521.js')>0&&at('app_icons_v01521.js')<at('app.js')&&at('app_icons_v01521.js')<at('app_puzzles_v0152.js'),'loaded before every screen');
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'app.js','app_icons_v01521.js','app_legacy.js',"));
 assert(!/GLYPH|LINE=\{|createElementNS/.test(icons),'no drawn element signs or line pictures');
 assert(!/const GLYPH=|function glyph\(/.test(src('app_puzzles_v0152.js'))&&src('app_puzzles_v0152.js').includes('function orb(i,cls=\'\'){return ICONS.orb(KEY[i]||\'geo\',cls);}'),'the puzzles take their orbs from it');
 assert(!src('app_battle_fx_v01521.js').includes('emblem'),'the battle effects no longer draw their own');
 assert(css.includes('.pz-orb>img.pz-glyph{')&&css.includes('filter:brightness(0) invert(1)'),'the symbol is white on a puzzle orb');
});

check('who gets which picture: elements of characters and fighters, weapon kinds, talents',()=>{
 const rows={'07_CHAR_DB':new Map([['LIYUE_KEQING',['LIYUE_KEQING','각청','','[번개]']],['MOND_BARBARA',['MOND_BARBARA','바바라','','[물]']]]),'16_EQUIP_DB':new Map([['EQ_BOW',['EQ_BOW','활','활']]])};
 const made=[],mkNode=tag=>{const n={tag,className:'',attrs:{},children:[],dataset:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},append(...c){this.children.push(...c);}};made.push(n);return n;};
 const game={route:'TRAVELER_GEO',tables:{get '07_CHAR_DB'(){return rows['07_CHAR_DB'];},get '16_EQUIP_DB'(){return rows['16_EQUIP_DB'];}},s:{inventory:[]},constellationKey(id){return id==='PLAYER_CUSTOM'?this.route:id;},equipmentProficiencies:id=>id==='LIYUE_KEQING'?['한손검']:['법구']};
 const ctx=load({game,MANIFEST:{uiAssets:ui},document:{createElement:mkNode,addEventListener(){},documentElement:{classList:{contains:()=>false}}}}),I=ctx.CRPGIcons;
 assert.equal(I.ofCharacter('LIYUE_KEQING'),'electro');assert.equal(I.ofCharacter('PLAYER_CUSTOM'),'geo');game.route='ISEKAI';assert.equal(I.ofCharacter('PLAYER_CUSTOM'),null,'이세계인 has no element');
 assert.equal(I.ofActor({side:'ENEMY',element:'불'}),'pyro');assert.equal(I.ofActor({side:'ENEMY',element:'물리'}),null,'no symbol for 물리');assert.equal(I.ofActor({side:'ALLY',source:'MOND_BARBARA'}),'hydro');
 const e=I.element('번개');assert.equal(e.className,'el-icon el-electro');assert.equal(e.attrs['aria-label'],'번개 원소');assert.equal(e.children[0].src,ui.elements.electro.path);
 assert.equal(I.weapon('활').children[0].src,ui.weaponTypes['활'].path);assert.equal(I.weapon('없음'),null);
 assert.equal(I.talentRecord('LIYUE_KEQING','e').file,'Skill_S_Keqing_01');assert.equal(I.talentRecord('PLAYER_CUSTOM','e'),null,'이세계인\'s E keeps its letter');
 game.s.inventory=[{equipped:true,owner:'PLAYER_CUSTOM',equip:'EQ_BOW'}];assert.equal(I.talentRecord('PLAYER_CUSTOM','na').file,'Skill_A_02','the protagonist\'s normal attack follows the weapon worn');
 game.route='TRAVELER_ANEMO';assert.equal(I.talentRecord('PLAYER_CUSTOM','q').file,'Skill_E_PlayerWind_01');
 const o=I.orb('pyro','small');assert.equal(o.className,'pz-orb el-pyro small');assert.equal(o.children[0].className,'pz-glyph');
});

check('the screens use them: battle cards and skill buttons, the 캐릭터 screen, 편성, the floating 부착',()=>{
 const shell=src('app_shell.js');
 assert(shell.includes("const own=typeof CRPGIcons!=='undefined'?CRPGIcons.ofActor(a):null;if(own&&name&&!$('.own-element',name))name.prepend(CRPGIcons.element(own,'own-element'));"),'each fighter\'s element before its name');
 assert(shell.includes("badge=mk('span','shell-aura-badge aura-'+aura,pic?'부착':AURA_LABEL[aura]+' 부착');if(pic)badge.prepend(pic);"),'the aura badge: symbol + 부착');
 assert(shell.includes("pic=slot&&owner&&typeof CRPGIcons!=='undefined'?CRPGIcons.talent(owner,slot,'shell-card-glyph'):null;"),'skill buttons wear the talent pictures');
 assert(shell.includes("CRPGIcons.element(CRPGIcons.ofCharacter(c.dataset.owner),'shell-roster-element')"),'the character list');
 const gear=src('app_gear.js');assert(gear.includes("const mark=icons?.element(icons.ofCharacter(id),'gear-element'),arm=icons?.weapon(weapon,'gear-weapon-kind');"));
 assert(src('app_premium_v0148.js').includes("pic=icons?.talent(id,kind),mark=pic||mk('span','',KIND[kind]);"),'talent rows');
 assert(src('app_combat_fx.js').includes("pic=typeof CRPGIcons!=='undefined'?CRPGIcons.element(hit.element):null;if(pic)tag.append(pic,'부착');else tag.textContent=NAME[hit.element]+' 부착';"));
});

check('the turn order on screen is the order they act in: a new round brings its own list, a boss says ×2',()=>{
 const game={s:{runtime:{round:3,order:[{id:'B'},{id:'A'}],actors:[]}}};
 const ctx=load({game,GameEffects:{play(){return 'played';}}});
 assert.equal(ctx.GameEffects.play([{kind:'action',round:2,actorId:'A'},{kind:'impact'},{kind:'action',round:2,actorId:'SUMMON:X'},{kind:'action',round:2,actorId:'C'},{kind:'action',round:2,actorId:'A'},{kind:'action',round:3,actorId:'B'}]),'played','the playback itself is untouched');
 // 0.15.25 (user: 「토끼백작 … 공격을 연속 세번 하노? … 위에 X3 적혀있어야」): a summon's own turn is part of the order, and a
 // fighter acting twice in a round says ×2.
 assert.deepEqual(plain(ctx.BattleFX.roundOrder(2)),['A','SUMMON:X','C'],'an earlier round: everyone as they acted, a summon\'s own turn included');
 assert.deepEqual(plain(ctx.BattleFX.roundTimes(2)),{A:2,'SUMMON:X':1,C:1},'A acted twice');
 assert.deepEqual(plain(ctx.BattleFX.roundOrder(3)),['B','A'],'the round the battle stands in: its own order');
 ctx.GameEffects.play([{kind:'action',round:3,actorId:'SUMMON:BUNNY:A',periodic:true},{kind:'action',round:3,actorId:'B'}]);
 assert.deepEqual(plain(ctx.BattleFX.roundOrder(3)),['SUMMON:BUNNY:A','B','A'],'a blast at the start of the round leads it');
 assert(fx.includes('if(order){followRound(order,frame.round);'),'rebuilt as each action begins');
 const exp=src('app_experience.js');assert(exp.includes("order.dataset.round=String(b.round);")&&exp.includes("const n=game.fieldBossActions?.(a)||1;if(n<=1)return;const tag=el('small','order-times','×'+n);"));
 assert(src('runtime_field_bosses.js').includes('P.fieldBossActions=function(a){'),'a read-only count that does not mark the enrage as seen');
 const r=fresh(),boss=c.CRPGRuntime.fieldBosses.bosses.FB_ANEMO_HYPOSTASIS?{fb:{},source:'FB_ANEMO_HYPOSTASIS',hp:100,maxHp:100}:null;assert(boss&&r.fieldBossActions(boss)>=1);
});

check('buffs and debuffs are chips with what they do; the formation is the battle\'s own tag',()=>{
 const exp=src('app_experience.js'),from=exp.indexOf('const STATUS_ELEMENT='),to=exp.indexOf('function statusChip(');assert(from>0&&to>from);
 const rows=new Map([['STATUS_WET',['STATUS_WET','습윤','원소 상태','물·얼음·번개 연계 조건으로 취급. 단독 피해 없음']],['STATUS_DEF_DOWN',['STATUS_DEF_DOWN','방어력 감소','디버프','DEF 감소']],['STATUS_FREEZE',['STATUS_FREEZE','빙결','제어','행동 제한']]]);
 // Names now come from audited catalog/DB rows, not a safeName-only alias stub.
 const names={DILUC_INFUSION:c.CRPGRuntime.statusCatalog.DILUC_INFUSION.name,OMEN:c.CRPGRuntime.statusCatalog.OMEN.name};
 for(const [id,name]of Object.entries(names))rows.set(id,[id,name,id==='OMEN'?'디버프':'버프','']);
 const ctx=vm.createContext({game:{tables:{'13_STATUS_EFFECT_DB':rows}},safeName:(t,id)=>rows.get(id)?.[1]||names[id]||id,window:{CRPGRuntime:{formationConfig:{roles:{공격우선:{label:'공격 담당',text:'공격력 +6% · 받는 피해 +6%'}}}}}});
 vm.runInContext(exp.slice(from,to),ctx);
 const list=plain(vm.runInContext("battleStatusList({airborne:true,statuses:[{id:'FORMATION',rounds:null,mods:{atk:{pct:6}}},{id:'ROLE',role:'공격우선',rounds:null},{id:'STATUS_WET',rounds:2},{id:'STATUS_DEF_DOWN',rounds:1},{id:'STATUS_FREEZE',rounds:1},{id:'DILUC_INFUSION',rounds:2,mods:{atk:{pct:20},crit:{flat:5}}},{id:'OMEN',rounds:2},{id:'OLD',rounds:0}]})",ctx));
 assert.deepEqual(list.map(x=>[x.name,x.kind,x.rounds,x.element||null]),[['공중','hold',null,null],['공격 담당','role',null,null],['습윤','element',2,'hydro'],['방어력 감소','debuff',1,null],['빙결','hold',1,'cryo'],['불 원소 부여','buff',2,'pyro'],['성이','debuff',2,null]],'no 「진형 효과」 chip, nothing that ran out');
 assert.equal(list[5].text,'공격력 +20% · 치명타 확률 +5%p','a buff\'s numbers are spelled out');assert.equal(list[1].text,'공격력 +6% · 받는 피해 +6%');
 // Harmful statuses the table does not type must not look like buffs (docs/STATUS_EFFECTS_KO.md).
 const kinds=plain(vm.runInContext("battleStatusList({statuses:['LIFTED','BOSS_CONTROL','LIYUE_PETRIFY','QUICKEN','RIPTIDE','HAZARD_CORRODED','CONS_VENTI_6','CHILI_BUFF'].map(id=>({id,rounds:1}))}).map(x=>x.kind)",ctx));
 assert.deepEqual(kinds,['hold','hold','hold','element','debuff','debuff','debuff','buff']);
 assert(exp.includes("const row=button('',()=>battleStatusDetails(a,row._statusList));row._statusList=list;row.className='status-chips';"),'a press lists them');
 assert(exp.includes('const fm=battleFormationTag(b);if(fm)head.append(fm);')&&exp.includes("box.append(el('p','','편성에서 고른 진형입니다. 이 전투에서 파티 전원에게 적용됩니다.'),el('p','',text));"),'the formation explains itself');
 for(const k of ['buff','debuff','hold','element','role'])assert(css.includes('.st-chip.'+k+'{'),k);
});

check('blows grow with what was won for the fighter: the weapon\'s grade and enhancement, the constellation — not the level',()=>{
 const inv=[],rows=new Map([['W5',['W5','검','한손검']],['W4',['W4','검','한손검']]]),cons={MOND_A:0,MOND_B:3,MOND_C:6};
 const game={tables:{'16_EQUIP_DB':rows},s:{inventory:inv},growth:()=>({level:20}),constellationLevel:id=>cons[id]};
 const ctx=load({game,itemTierRank:id=>id==='W5'?5:4}),pw=id=>plain(ctx.BattleFX.powerOf({side:'ALLY',source:id}));
 assert.deepEqual(pw('MOND_A'),{power:0,grade:0},'Lv20 alone: a plain blow (user: 「레벨....에는 그런게 필요한가?」)');
 inv.push({equipped:true,owner:'MOND_A',equip:'W4',enhance:0});assert.deepEqual(pw('MOND_A'),{power:.5,grade:4},'a 4★ weapon: violet, sparks');
 assert.equal(pw('MOND_B').power,1,'C3');
 inv.push({equipped:true,owner:'MOND_C',equip:'W5',enhance:10});assert.deepEqual(pw('MOND_C'),{power:3,grade:5},'C6 with a +10 5★ weapon: everything, in gold');
 assert.deepEqual(plain(ctx.BattleFX.powerOf({side:'ENEMY'})),{power:0,grade:0});
 assert(!/level>=10|growth\?\.\(/.test(fx),'the level does not count');
 // 0.16.5: a critical hit is a little larger as well.
 assert(fx.includes("const GRADE_GLOW={4:'#c79bff',5:'#ffd36b'};")&&fx.includes('strike(layer,style,p,{tint:TINT[hit.element]||\'#ffffff\',size:(burst?1.3:1)*(t.critical?1.15:1),angle},pw);'));
 assert(fx.includes('if(pw.power>=.5)')&&fx.includes('if(pw.power>=1.5)')&&fx.includes('if(pw.power>=2.5)'),'sparks, an afterimage, then a shockwave');
});

check('약점 간파 shows on the target the moment it lands: a debuff chip and a red sight',()=>{
 assert(src('runtime_status_v01522.js').includes('statusApplied:JSON.parse(JSON.stringify(result))'),'only successful, actual status applications enter playback');
 assert(fx.includes('if(e.statusApplied){if(!e.presentationActorsAfter?.length)liveStatus(node,e.statusApplied)'));assert(!fx.includes('APPLIES['),'removed prediction table must have no live references');
 // Current snapshot-bearing events are applied by playback at their impact callback.
 // Legacy events still use the old liveStatus path. Execute the real hook for both.
 let applications=0;const ctx=load({game:{s:{runtime:{actors:[]}}},CombatFX:{point:()=>null},battleStatusList(){applications++;return [];},statusChip(){}});
 const e={kind:'status',sourceKind:'STATUS_APPLY',statusApplied:{id:'STATUS_ISEKAI_EXPOSED'},presentationActorsAfter:[{id:'TARGET',statuses:[{id:'STATUS_ISEKAI_EXPOSED'}]}]},frame={kind:'action',sourceKind:'STATUS_APPLY',events:[e],targets:[{targetId:'TARGET',events:[e]}]},effects={layerNode:()=>({}),actorNode:()=>({querySelector:()=>null})};
 ctx.BattleFX.onFrame(frame,effects);assert.equal(applications,0,'snapshot events must not apply future effects at frame start');
 delete e.presentationActorsAfter;ctx.BattleFX.onFrame(frame,effects);assert.equal(applications,1,'legacy effect events remain visible');
 assert(fx.includes("['STATUS_ISEKAI_EXPOSED','exposed']"),'the sight stays while it lasts');
 assert(src('runtime_combat_v0148.js').includes("statuses.push([EXPOSED,'약점 간파','디버프','파티에게 받는 피해가 늘어난다(일반 '"),'listed as a 디버프 with what it does');
 assert(css.includes('.combat-panel .status-fx>.st-exposed::before{')&&css.includes('.combat-light.wfx-sight{')&&css.includes('.st-chip.fresh{'));
});

check('the main screen\'s tabs never run off a narrow PC column',()=>{
 assert(css.includes('body.teyvat .shell-loc-side>.shell-tabbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(136px,1fr));overflow-x:visible;gap:5px}'),'equal cells that fold two by two');
});

check('PC battle layout keeps the fighters in view: two command rows and a playback band at the bottom',()=>{
 const pc=css.slice(css.indexOf('/* PC: the commands are two short rows'));
 assert(pc.includes('grid-template-areas:"turn cards cards" "exec note speed"'),'two command rows');
 assert(pc.includes('.battle-command>.battle-cards{grid-area:cards;flex-wrap:nowrap'),'skills in one row');
 assert(pc.includes('body.teyvat .combat-panel .compact-battle-stage{min-height:48%}'),'the field keeps about half the height');
 assert(/body\.teyvat \.combat-playback\{left:50%;right:auto;bottom:10px;[^}]*grid-template-rows:auto auto;/.test(pc),'the playback is a two-line band');
 assert(css.includes('@media (min-width:761px) and (max-height:820px){'),'short windows shrink the cards');
});

check('the speed slider stops at 2× (the old 1×)',()=>{
 const settings={combatSpeed:2,combatSpeedScale:2},ctx=load({settings});ctx.BattleFX.migrateSpeed();assert.equal(settings.combatSpeed,1,'a stored 4× comes down to 2×');
 assert(fx.includes("if(range){range.max=String(SPEED_MAX);"),'the slider ends at 2×');
});

check('the speed label is twice the real rate, and a stored speed moves once to the new scale',()=>{
 const settings={combatSpeed:1},ctx=load({settings});
 assert.equal(ctx.BattleFX.speedLabel(.5),'1.0×');assert.equal(ctx.BattleFX.speedLabel(1),'2.0×');assert.equal(ctx.BattleFX.speedLabel(.75),'1.5×');
 ctx.BattleFX.migrateSpeed();assert.equal(settings.combatSpeed,.5,'the old 1× becomes the new 1× (0.5 real)');assert.equal(settings.combatSpeedScale,2);
 ctx.BattleFX.migrateSpeed();assert.equal(settings.combatSpeed,.5,'only once');
 const fast={combatSpeed:2};load({settings:fast}).BattleFX.migrateSpeed();assert.equal(fast.combatSpeed,1,'the old 2× is the new 2×');
 assert(fx.includes("combatSpeedControl=function(){migrateSpeed();const row=prior();"),'the slider is relabelled where it is built');
});

check('cards: emblem, living aura, shield bubble inside the card (no lattice), status overlays, red/green flashes',()=>{
 const rule=css.match(/body\.teyvat \.combat-panel \.combatant-row>\.shield-fx\{[^}]*\}/)?.[0]||'';
 assert(rule.includes('inset:0')&&rule.includes('overflow:hidden'),'the bubble stays inside the card, so no scroll bar appears');
 assert(!rule.includes('repeating-linear-gradient'),'no net pattern');
 for(const k of ['fxShieldHit','fxShieldAppear']){const kf=css.match(new RegExp('@keyframes '+k+'\\{[^@]*?\\}\\}'))?.[0]||'';assert(kf&&!/scale\(1\.[0-9]/.test(kf),k+' never grows past the card');}
 for(const k of ['pyro','hydro','cryo','electro','dendro','geo'])assert(css.includes('.aura-fx.aura-'+k),k);
 for(const k of ['freeze','burn','charged','wet','poison','chill','corrosion','taunt'])assert(css.includes('.status-fx>.st-'+k),k);
 assert(css.includes('.combatant-row>.hit-flash.damage{')&&css.includes('.combatant-row>.hit-flash.heal{'));
 assert(fx.includes("if(Number(t.damage)>0||Number(t.absorbed)>0)flash(node,'damage');else if(Number(t.heal)>0)flash(node,'heal');"));
 assert(/html\.reduce-motion[^{]*\.aura-fx[^{]*\{animation:none!important\}/.test(css),'움직임 줄이기 stops them');
});

check('no banner on every joined blow and no burst sweep',()=>{
 assert(!fx.includes('burst-splash')&&!css.includes('burst-splash'));
 assert(!src('app_protagonist.js').includes("el('div','joint-attack-banner'"),'the per-blow 「Q · 함께하는 일격」 banner is gone');
});

check('every reaction kind has a burst',()=>{
 const ctx=load({}),of=ctx.BattleFX.reactionOf;
 const kinds={REACTION_OVERLOADED:'overload',REACTION_VAPORIZE:'vaporize',REACTION_MELT:'melt',REACTION_FROZEN:'frozen',REACTION_SUPERCONDUCT:'superconduct',REACTION_ELECTRO_CHARGED:'charged',REACTION_SWIRL:'swirl',REACTION_CRYSTALLIZE:'crystallize',REACTION_BURNING:'burning',REACTION_BLOOM:'bloom','과부하':'overload','결정':'crystallize'};
 for(const [id,k] of Object.entries(kinds))assert.equal(of(id),k,id);
 for(const k of new Set(Object.values(kinds)))assert(fx.includes(' '+k+'(l,p){'),k+' burst');
});

const out=path.join(root,'reports','test_v01521.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));

