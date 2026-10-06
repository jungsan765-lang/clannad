'use strict';
// 0.16.2 기술 연출 (user, 2026-10-07: 「살을 에는 윤무 효과가 하나도 없으니 이거 뭐 보이지가 않노... 캐릭터마다 스킬 쓰면 그에 해당하는
// 이펙트랑 SE들을 다 만들어야 하지 않겠냐...? 드발린이나, 오셀, 필드보스 등등 전부 다 체크해서 스킬 이펙트 없는 놈들 다 만들어야 돼」):
// every playable E and Q has its own cast picture, effect and sound; what a skill leaves is drawn; boss moves and the
// board have theirs; every sound is a Genshin recording (the five made by this project are gone).
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fresh,c,fs,path,vm,root}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const cp=x=>JSON.parse(JSON.stringify(x));
let passed=0,failed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failed++;process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
vm.runInContext(src('presentation.js'),c,{filename:'presentation.js'});
const PR=c.CRPGPresentation,api=c.CRPGRuntime;
const fx=src('app_skill_fx_v0162.js'),css=src('skill_fx_v0162.css'),ui=json('content/genshin-ui-assets.json'),catalog=json('assets/audio/genshin-sfx/catalog.json');
// The module in a page-less sandbox: only its tables and the frame logic run here (the browser check draws it).
function load(game=null,extra={}){
 const sandbox={console,game,settings:{combatSpeed:1},innerHeight:800,innerWidth:1280,CSS:{escape:s=>s},addEventListener(){},
  document:{documentElement:{classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[]},MANIFEST:{uiAssets:ui},...extra};
 sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(fx,sandbox,{filename:'app_skill_fx_v0162.js'});return sandbox;
}
const FX=load().CRPGSkillFX;
// app_sound.js's choices, with the shipped catalog as the manifest (what build.py writes into MANIFEST.sfx).
function sounds(){
 const sfx=Object.fromEntries(catalog.files.map(f=>[f.id,{url:'audio/genshin-sfx/'+f.file,sourceNature:f.sourceNature}]));
 const sandbox={console,settings:{sfxChoice:{},sfxChoiceRev:2},persistSettings(){},performance:{now:()=>0},document:{hidden:false},MANIFEST:{sfx},
  GameAudio:{buffer:async()=>null,sync(){},stop(){},play(){},enabled:()=>true,voices:new Set(),epoch:0}};
 sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(src('app_sound.js'),sandbox,{filename:'app_sound.js'});return sandbox.CRPGSound;
}
const SND=sounds();

check('the module and its style sheet ship and load right after the 0.15.21 battle effects, before the sounds',()=>{
 const html=src('index.html'),at=f=>html.indexOf('<script src="'+f+'"'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
 assert(at('app_skill_fx_v0162.js')>at('app_battle_fx_v01521.js')&&at('app_skill_fx_v0162.js')<at('app_sound.js')&&at('app_battle_fx_v01521.js')>0);
 assert(html.includes('<script src="app_battle_fx_v01521.js"></script><script src="app_skill_fx_v0162.js"></script>'),'right after it');
 assert(html.indexOf('href="skill_fx_v0162.css"')>html.indexOf('href="landscape_v01524.css"'),'after the sideways-phone sheet');
 assert(build.includes("'app_battle_fx_v01521.js','app_skill_fx_v0162.js',")&&build.includes("'landscape_v01524.css','skill_fx_v0162.css',"),'the build ships both');
 assert(!/el\('select'\)|createElement\(\s*['"]select|<select/.test(fx),'no drop-down');
});

const pools=api.wishV01411.pools,playable=[...pools.STANDARD5,...pools.LIMITED5,...pools.FOUR,'LIYUE_ZIBAI','TRAVELER_ANEMO','TRAVELER_GEO','ISEKAI'];
check('every playable fighter is in the cast table with an element: the wish pools, 자백, the Traveler by element and 이세계인',()=>{
 assert.deepEqual(Object.keys(FX.ROSTER).sort(),[...new Set(playable)].sort());
 assert.deepEqual(Object.keys(FX.ROSTER).filter(k=>k!=='ISEKAI').sort(),Object.keys(ui.skills).sort(),'everyone with official talent pictures');
 const r=fresh();for(const k of Object.keys(FX.ROSTER).filter(k=>!k.startsWith('TRAVELER')&&k!=='ISEKAI')){const el=api.constellationsV01411&&String(r.row('07_CHAR_DB',k)[3]||'').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)?.[1];assert.equal(FX.ROSTER[k],{'불':'pyro','물':'hydro','얼음':'cryo','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro'}[el],k);}
 return Object.keys(FX.ROSTER).length;
});

const cardIds=Object.keys(FX.ROSTER).flatMap(k=>FX.cardIdsOf(k)).concat(['LIYUE_ZIBAI_E_CHARGE']);
check('every playable E and Q has a cast picture (its own talent picture, the burst band with the character) and a sound that resolves to a recording',()=>{
 const r=fresh(),rows=new Set(r.combatRows('08_SKILL_CARD_DB').map(x=>x[0]));
 for(const id of cardIds){const s=FX.SPEC[id];assert(s&&rows.has(id),id);assert(['e','q'].includes(s.slot)&&s.el&&s.owner,id);
  const pic=s.key==='ISEKAI'?ui.normalAttacks['한손검'].path:ui.skills[s.key][s.slot].path;assert(fs.existsSync(path.join(root,pic)),id+' '+pic);
  if(s.el!=='neutral')assert(fs.existsSync(path.join(root,ui.elements[s.el].path)),id+' element');
  for(const cue of [s.cue,FX.impactCue(s)].filter(Boolean)){const opts=SND.options(cue);assert(opts.length,id+' → '+cue+' has a recording');
   for(const [sid]of opts)if(sid!=='none'){const f=catalog.files.find(x=>x.id===sid);assert(f&&fs.existsSync(path.join(root,'assets/audio/genshin-sfx',f.file)),cue+' '+sid);}}}
 assert.equal(FX.SPEC.MOND_VENTI_Q.cue,'skill_q_venti');assert.equal(FX.SPEC.LIYUE_ZHONGLI_Q.cue,'skill_q_zhongli');assert.equal(FX.SPEC.LIYUE_HUTAO_Q.cue,'skill_q_hutao');assert.equal(FX.SPEC.MOND_VENTI_E.cue,'skill_e_venti');
 assert.equal(FX.SPEC.MOND_KAEYA_Q.cue,'skill_q');assert.equal(FX.SPEC.MOND_KAEYA_E.cue,'cast_ice');assert.equal(FX.SPEC.PLAYER_ISEKAI_E.cue,'skill_e');
 assert(fx.includes("band(cast.spec,frame,node)")&&fx.includes("iconPop(cast.spec,node)"),'E pops its picture, Q crosses the board');
 return {cards:cardIds.length};
});

// The skills that showed nothing but their name (no damage: a field, summon, stance or shield), heals and status-only.
const N=['MOND_AMBER_E','MOND_DAHLIA_E','MOND_KAEYA_Q','MOND_KLEE_Q','MOND_MONA_E','MOND_SUCROSE_Q','LIYUE_BAIZHU_Q','LIYUE_BEIDOU_Q','LIYUE_GANYU_E','LIYUE_GANYU_Q','LIYUE_QIQI_E','LIYUE_SHENHE_Q','LIYUE_XIANGLING_E','LIYUE_XIANGLING_Q','LIYUE_XINGQIU_Q','LIYUE_YAOYAO_E','LIYUE_YELAN_Q','LIYUE_YUNJIN_Q','LIYUE_ZHONGLI_E'];
const H=['MOND_BARBARA_Q','MOND_MIKA_Q','LIYUE_XIANYUN_Q'],S=['MOND_BARBARA_E','MOND_BENNETT_Q','MOND_MONA_Q','LIYUE_BEIDOU_E','LIYUE_HUTAO_E','LIYUE_XIANYUN_E','LIYUE_XIAO_Q','LIYUE_YUNJIN_E','LIYUE_ZIBAI_E'];
check('every skill that drew nothing now has its own effect, and what it leaves is drawn while it lasts',()=>{
 for(const id of [...N,...H,...S]){const s=FX.SPEC[id];assert(s.summon||s.field||s.persist||s.self||s.allies||s.area||s.hit,id);}
 const look=k=>FX.FIELD_LOOK[k]||FX.STATUS_LOOK[k];
 for(const id of N){const s=FX.SPEC[id];assert(s.summon||look(s.field||s.persist),id+' leaves a look');}
 assert.deepEqual(cp(FX.FIELD_LOOK.ICE),['card','blades','cryo'],'Kaeya: three ice blades circle her caster');
 assert.equal(FX.FIELD_LOOK.PYRONADO[1],'pyronado');assert.equal(FX.FIELD_LOOK.CELESTIAL_SHOWER[1],'hail');assert.equal(FX.FIELD_LOOK.EXQUISITE_THROW[1],'dice');
 assert.equal(FX.FIELD_LOOK.DIVINE_MAIDEN[1],'talismans');assert.equal(FX.FIELD_LOOK.FLYING_CLOUD_FLAG[1],'banner');assert.equal(FX.FIELD_LOOK.WIND_SPIRIT[1],'vortex');assert.equal(FX.FIELD_LOOK.BOMBARD[1],'sparks');
 assert.equal(FX.FIELD_LOOK.STORMBREAKER[1],'arcs');assert.equal(FX.FIELD_LOOK.STONE_STELE[1],'stele');assert.equal(FX.SPEC.LIYUE_XINGQIU_Q.shape,'sword');
 for(const k of ['BUNNY','OZ','GOU_BA','YUEGUI_THROWING']){assert(fs.existsSync(path.join(root,'assets/summons',fx.match(new RegExp(k+":'(summon_[a-z_]+\\.webp)'"))[1])),k);}
 for(const [k,[,kind]]of Object.entries(FX.FIELD_LOOK))assert(css.includes('.sfx-k-'+kind),k+' '+kind+' is drawn');
 for(const [k,[kind]]of Object.entries(FX.STATUS_LOOK))assert(css.includes('.sfx-k-'+kind),k+' '+kind+' is drawn');
 for(const kind of Object.keys(FX.PARTS))assert(css.includes('.sfx-k-'+kind),kind);
});

// The real battle: every E and Q is cast, its frames come back to it, and what it left has a look.
function setup(ids,route){
 const r=fresh('MAP_MOND_PLAINS',route),own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');
 ids.forEach((id,i)=>{own[id]={state:'JOINED'};r.s.chars[id].hp=r.character(id).maxHp;r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};});
 r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);
 // The Traveler's skills open with the story; here both elements' are open (the hero's battle snapshot takes them).
 if(route==='ROUTE_TRAVELER'){const t=['PLAYER_TRAVELER_ANEMO_E','PLAYER_TRAVELER_ANEMO_Q','PLAYER_TRAVELER_GEO_E','PLAYER_TRAVELER_GEO_Q'];r.protagonistAllowedIds=()=>t.slice();r.s.global.PLAYER_SKILL_CARD_IDS='PLAYER_BASIC_ATTACK;PLAYER_BASIC_GUARD;'+t.join(';');}
 r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');
 const b=r.s.runtime,e=b.actors.find(a=>a.side==='ENEMY');while(b.actors.filter(a=>a.side==='ENEMY').length<3){const x=cp(e);x.id=e.source+'#'+(b.actors.length+10);b.actors.push(x);}
 for(const a of b.actors){a.hp=a.maxHp=Math.max(a.maxHp,5000);if(a.side==='ALLY')a.hp=Math.round(a.maxHp*.6);}return r;
}
// Left to the 0.15.21 card overlays and chips (app_battle_fx_v01521.js): reaction states, control, plain stat changes.
const SKIP_FIELD=new Set(['MAN_CHAI','XINYAN_SHIELD_FLAME','CHILI']),SKIP_STATUS=new Set(['STATUS_DEF_DOWN','STATUS_BURN','STATUS_SLOW','STATUS_ISEKAI_EXPOSED','ROSARIA_BEHIND','STATUS_FREEZE','STATUS_WET','STATUS_ELECTROCHARGED','STATUS_CHILL','STATUS_POISON','STATUS_CORROSION','STATUS_TAUNT','STATUS_STUN','BOSS_CONTROL']);
check('cast for real, every E and Q comes back to its own card on its first frame; what it leaves is drawn',()=>{
 const seen={},left={};
 for(const key of Object.keys(FX.ROSTER)){
  const char=key.startsWith('TRAVELER')||key==='ISEKAI'?null:key,r=setup(char?[char]:['MOND_AMBER'],key==='ISEKAI'?'ROUTE_ISEKAI':'ROUTE_TRAVELER'),F=load(r).CRPGSkillFX,actor=char?r.combatActor(char):r.combatActor();
  for(const id of FX.cardIdsOf(key).concat(key==='LIYUE_ZIBAI'?['LIYUE_ZIBAI_E_CHARGE']:[])){
   const b=r.s.runtime;for(const a of b.actors)a.cooldowns={};if(id==='LIYUE_ZIBAI_E_CHARGE'){const g=actor.statuses.find(s=>s.id==='AGE_GAP');Object.assign(g,{light:100,uses:0});}
   const row=r.combatRows('08_SKILL_CARD_DB').find(x=>x[0]===id),card=r.actorCards(actor).find(x=>x.id===id)||r.cardDefinition(row);
   const fields=new Set(b.fields.map(f=>f.kind+'@'+f.actor)),statuses=new Set(b.actors.flatMap(a=>(a.statuses||[]).map(s=>a.id+':'+s.id)));
   const before=PR.snapshot(r.s);r.s.global.LAST_COMMITTED_ACTION_ID='qa:'+id;b.actionSequence=(b.actionSequence||0)+1;
   try{r.executeCard(actor,card,b.actors.find(a=>a.side==='ENEMY'&&a.hp>0).id,'TAP');}catch(e){throw Error(id+': '+e.message);}
   const frames=PR.actionFrames(PR.delta(before,r.s));F.newPlayback(frames);
   const casts=frames.map(f=>F.castOf(f)).filter(Boolean);
   assert(casts.length&&casts[0].id===id&&casts[0].first&&casts.filter(x=>x.first).length===1,id+' '+JSON.stringify(frames.map(f=>[f.cardId,f.cardName])));
   seen[id]=frames.length;
   for(const f of b.fields)if(!fields.has(f.kind+'@'+f.actor)&&!SKIP_FIELD.has(f.kind)){assert(FX.FIELD_LOOK[f.kind]||['BUNNY','OZ','GOU_BA','YUEGUI_THROWING'].includes(f.kind),id+' leaves '+f.kind);(left[id]||=[]).push(f.kind);}
   for(const a of b.actors)for(const s of a.statuses||[]){if(statuses.has(a.id+':'+s.id)||SKIP_STATUS.has(s.id)||/^CONS_/.test(s.id))continue;assert(FX.STATUS_LOOK[s.id],id+' leaves '+s.id+' on '+a.id);(left[id]||=[]).push(s.id);}
  }
 }
 assert.equal(Object.keys(seen).length,cardIds.length);assert.deepEqual(cp(left.MOND_KAEYA_Q),['ICE']);
 return {cards:Object.keys(seen).length,left};
});

check('a field strikes its own way when it ticks; a summon and a follow-up too; each tick has its own sound',()=>{
 for(const id of ['MOND_KAEYA_Q','LIYUE_GANYU_Q','LIYUE_XIANGLING_Q','MOND_KLEE_Q','MOND_LISA_Q','MOND_DIONA_Q','LIYUE_SHENHE_Q','LIYUE_ZHONGLI_E','MOND_MONA_E','LIYUE_QIQI_E','MOND_SUCROSE_Q','MOND_ROSARIA_Q','LIYUE_GANYU_E'])assert(FX.HIT[FX.TICK[id]],id);
 assert.equal(FX.TICK.MOND_KAEYA_Q,'frostslash','the blades slash when they hit');
 for(const k of ['BUNNY','OZ','GOU_BA','YUEGUI_THROWING'])assert(FX.HIT[FX.SUMMON_TICK[k]],k);
 for(const k of ['LIYUE_BEIDOU','LIYUE_XINGQIU','LIYUE_YELAN','LIYUE_XIANYUN'])assert(FX.HIT[FX.FOLLOW[k]],k);
 // Kaeya's blades tick for real: the frame is FIELD, its card is the burst, its sound is the ice tick.
 const r=setup(['MOND_KAEYA'],'ROUTE_TRAVELER'),k=r.combatActor('MOND_KAEYA');r.executeCard(k,r.actorCards(k).find(x=>x.id==='MOND_KAEYA_Q'),r.s.runtime.actors.find(a=>a.side==='ENEMY').id);
 const box=load(r,{CRPGPresentation:{actionFrames:PR.actionFrames}}),before=PR.snapshot(r.s);r.s.global.LAST_COMMITTED_ACTION_ID='qa:tick';r.roundEnd();
 const frames=box.CRPGPresentation.actionFrames(PR.delta(before,r.s)),tick=frames.find(f=>f.periodic&&f.cardId==='MOND_KAEYA_Q');
 assert(tick,'a tick frame');assert.equal(tick.sourceKind,'FIELD');assert.equal(box.CRPGSkillFX.castOf(tick),null,'a tick is no new cast');
 assert(tick.targets.some(t=>t.events.some(e=>e.cue==='tick_ice')),'tick_ice');assert(SND.options('tick_ice').length);
});

check('bosses and named enemies: wind-ups glow with the move, storms, frost, floods, the formation and the deluge have their look',()=>{
 const src=fs.readFileSync(path.join(root,'source/runtime_field_bosses.js'),'utf8'),rot=src.match(/const ROTATION=(\{[^;]+\});/)[1],moves=new Set([...rot.matchAll(/'([A-Z_]+)'/g)].map(m=>m[1]));
 for(const m of [...moves,'SLAM','EMERGE','RISE','STUNNED','REVIVING','HEAD','BEAM_REFLECT'])assert(FX.ENEMY['FB_'+m],'FB_'+m);
 for(const m of ['PULL','STORM','ORBS','BLAST','UPHEAVAL','BEAM','CHARGE']){const mv=FX.enemyMoveOf({kind:'action',cardId:'FB_'+m+'_READY',cardName:'준비',events:[]});assert(mv&&mv.ready,m+' wind-up');}
 assert(FX.enemyMoveOf({kind:'action',cardId:'ECARD_WHOPPER_PYRO_CHARGE',events:[{charging:true}]}).ready,'a charging enemy');
 for(const id of ['ECARD_DVALIN_BREATH','ECARD_DVALIN_DIVE','ECARD_ANDRIUS_CLAW','ECARD_ANDRIUS_SWEEP','ECARD_ANDRIUS_LEAP','ECARD_ANDRIUS_RUN_PHASE','ECARD_ANDRIUS_PHASE3','ECARD_ANDRIUS_WIND_BLADE','ECARD_ANDRIUS_ROAR','TWIN_HUNT_MARK','TWIN_FIELD','OSIAL_DELUGE','ECARD_CICIN_ELECTRO_SUMMON','ECARD_CICIN_CRYO_SUMMON'])assert(FX.ENEMY[id],id);
 assert(FX.enemyMoveOf({kind:'action',cardId:'ECARD_LAWA_FROST_ARMOR',events:[]})?.spec.self==='armour','a passive armour');
 for(const k of ['FIRE','FROST','LIGHTNING','FLOOD','CORROSION'])assert(css.includes('.sfx-k-'+FX.HAZARD_LOOK[k]),k);
 for(const kind of ['storm','blizzard','formation','leyline','crumble','warn','burrow','stun','expose','armour','cicin'])assert(css.includes('.sfx-k-'+kind),kind);
 assert(fx.includes("b.fieldBoss.telegraph.label+' 준비'")&&fx.includes("a.enemyCharge.name+' 준비'"),'the wind-up names the move on the boss');
 assert(fx.includes("sound('reinforce')")&&fx.includes("e.target==='선인 진법'"),'reinforcements and the struck formation');
});

check('Osial\'s round-end deluge is named 마신의 대해일, not 기본 공격',()=>{
 const s={global:{SAVE_ID:'qa',LAST_COMMITTED_ACTION_ID:'qa:1',LAST_BATTLE_RESULT_JSON:'{}'},runtime:{id:'b1',log:[],actors:[{id:'BOSS_OSIAL#1',name:'오셀',side:'ENEMY'},{id:'p',name:'여행자',side:'ALLY'}]}},before=PR.snapshot(s);
 s.runtime.log.push({actor:'오셀',actorId:'BOSS_OSIAL#1',target:'여행자',targetId:'p',damage:120,element:'물',presentationCardId:'OSIAL_DELUGE',round:3,actionSequence:9});
 const r=fresh(),box=load(r,{CRPGPresentation:{actionFrames:PR.actionFrames}}),frames=box.CRPGPresentation.actionFrames(PR.delta(before,s));
 assert.equal(frames[0].cardName,'마신의 대해일');assert.equal(box.CRPGSkillFX.enemyMoveOf(frames[0]).spec.area,'deluge');
 assert.equal(r.row('12_ENEMY_CARD_DB','ECARD_OSIAL_DELUGE')[2],'마신의 대해일','the name is the card table\'s own');
});

check('sounds are Genshin recordings only: the 0.16.2 files match their records, nothing made by this project is left',()=>{
 const dir=path.join(root,'assets/audio/genshin-sfx'),added=catalog.files.filter(f=>f.addedIn==='0.16.2');
 assert(added.length>=15);
 for(const f of added){const bytes=fs.readFileSync(path.join(dir,f.file));assert.equal(bytes.length,f.bytes,f.id);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.id);
  assert.equal(f.sourceNature,'public_third_party_in_game_recording',f.id);assert.equal(f.original,false);assert.equal(f.sourceArchiveSha256,'d922980840c5bc78deeae61d4a3a4c45eaacdec00aa74b17f9923fdfd0f45100');assert(!/Nahida/.test(f.originalFilename),'no leaked pre-release recording');}
 assert(!catalog.files.some(f=>f.sourceNature==='project_original_synthesis'),'no synthesised file in the catalog');
 for(const id of ['prev_battle_start','prev_hit','made_dendro_slice','made_dendro_slice2','made_dendro_whirl']){const r=catalog.retired.find(x=>x.id===id);assert(r&&r.removedIn==='0.16.2',id);assert(!fs.existsSync(path.join(dir,r.file)),r.file+' removed');}
 const ids=new Set(catalog.files.map(f=>f.id));
 for(const [name,list]of Object.entries(SND.CHOICES))for(const [id]of list){assert(id==='none'||id==='official_click'||ids.has(id),name+' → '+id);assert(!/^(prev_|made_)/.test(id),name+' → '+id);}
 assert.deepEqual(cp(SND.options('hit').map(x=>x[0])),['ig_pot_hit','ig_box_hit','ig_unarm2']);assert.equal(SND.options('battle_start')[0][0],'ig_domain_enter');assert.equal(SND.options('dendro')[0][0],'ig_tree_rustle');
 const shell=src('app_shell.js');for(const cue of ['skill_e','skill_q','summon','shield_up','cast_dendro','tick_ice','telegraph','hazard','reinforce'])assert(shell.includes("'"+cue+"']"),cue+' can be heard and chosen in 효과음 고르기');
 assert(!shell.includes('「이전」·「새로 만든」'),'the settings no longer speak of sounds made by this project');
 assert(fs.readFileSync(path.join(dir,'CREDITS.md'),'utf8').includes('0.16.2'),'credited');
});

check('settings: battle speed, the pause, 움직임 줄이기, phones sideways, nothing takes a click, co-op playback',()=>{
 assert(fx.includes("duration:Math.max(16,(o.duration||600)/speed())")&&fx.includes("CombatFX.pause=function(p)"),'every effect follows the speed and the pause');
 assert(fx.includes('const reduced=()=>')&&fx.includes("still?[{opacity:0}"),'reduced motion: a fade only');
 assert(fx.includes("CombatFX.windupDuration=baseWindup+STRETCH")&&fx.includes('function unstretch()'),'a burst holds its beat a little longer, then the beat goes back');
 for(const layer of ['.sfx-layer{','>.sfx-card{','.shell-allies>.sfx-zone{','.sfx-band{','.sfx-p{','.sfx-look{']){const at=css.indexOf(layer);assert(at>=0&&/pointer-events:none/.test(css.slice(at,css.indexOf('}',at))),layer+' takes no click');}
 assert(css.includes('html.reduce-motion body.teyvat .sfx-look')&&css.includes('@media (max-height:500px)'));
 assert(!/@media[^{]*max-width:\s*[1-7]\d\dpx(?![^{]*min-height:501px)/.test(css),'upright-phone rules keep min-height:501px');
 for(const line of css.split('\n'))if(/\{/.test(line)&&!/^\s*(@|html\.reduce-motion|from|to|\d|\}|\/\*)/.test(line)&&!/^\s*body\.(teyvat|cp-fx-on)/.test(line))assert.fail('unscoped rule: '+line.slice(0,80));
 assert(fx.includes('CRPGCoopWorld?.fightGame?.()'),'a co-op guest reads the fight it shows');
 assert(fx.includes("node.closest?.('.combat-panel,.cp-battle')"),'effects find the board they play on');
});

console.log(JSON.stringify({passed,failed}));
