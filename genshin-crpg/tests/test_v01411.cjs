'use strict';
// v0.14.11: 편성 프리셋 and the battle line as cards, facility pages, the workshop, readable battle numbers, 운명의 자리
// (official names, each fighter's own effects, the chart and the card frames), the talent curve, 기원 (fates, two
// banners, pity, the 10-wish companion, 3★/4★ weapons, the record and the presentation), the exchanges, the original
// currency / constellation / wish textures and sounds, and 자백 becoming event-only.
const assert=require('node:assert/strict'),path=require('path'),{fs,root,fresh,c}=require('./helpers_v011.cjs');
const results=[],src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const plain=x=>JSON.parse(JSON.stringify(x));
const party=(g,ids)=>{for(const [i,id]of ids.entries()){g.adminApply({op:'recruit',char:id});g.action('PARTY',{char:id,slot:i+2});}return g;};
const admin=g=>{g.serverAdmin=true;return g;};
function battle(g){g.startBattle('EG_MOND_HILI_PATROL','EXPLICIT');if(g.s.runtime?.opening?.state==='PENDING')g.beginCombat(g.s.runtime.id);return g.s.runtime;}
const actor=(g,id)=>g.s.runtime.actors.find(a=>a.source===id&&a.side==='ALLY');
const foe=g=>g.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0);

check('presets: a saved party comes back exactly (members, order, roles); a slot can be deleted',()=>{
 const g=party(fresh(),['MOND_AMBER','MOND_LISA','MOND_KAEYA']);
 const before=plain(g.formationOrder());g.action('PRESET_SAVE',{slot:1,name:'몬드 기본'});
 g.action('FORMATION_SET',{order:['MOND_LISA','MOND_AMBER','PLAYER_CUSTOM','MOND_KAEYA']});g.action('PARTY_REMOVE',{slot:4});
 assert.notDeepEqual(plain(g.formationOrder()),before);
 const out=g.action('PRESET_APPLY',{slot:1});assert.deepEqual(plain(g.formationOrder()),before);assert.equal((out.result||out).skipped.length,0);
 assert.equal(g.presetList()[0].name,'몬드 기본');g.validateSave(plain(g.s));
 g.action('PRESET_DELETE',{slot:1});assert.equal(g.presetList()[0].empty,true);
 assert.match(g.actionReason('PRESET_APPLY',{slot:2}),/저장된 프리셋이 없습니다/);
 assert(src('../server/game-core.mjs').includes('"PRESET_APPLY", "PRESET_DELETE", "PRESET_SAVE", "WISH"'),'the server takes the new actions');
 return {order:before};
});

check('편성: the cards are the battle line; press, hold and drag one onto another to swap',()=>{
 const s=src('app_party_v01411.js');
 assert(s.includes('formationLine=function(){}'),'the old ▲▼ battle-line list is gone');
 assert(s.includes("},220);")&&s.includes('card.setPointerCapture(e.pointerId)')&&s.includes("act('FORMATION_SET',{order:next})"),'a 220 ms hold starts the drag, the drop swaps the order');
 assert(s.includes("card.addEventListener('dragstart',e=>e.preventDefault());for(const img of $$('img',card))img.draggable=false;"),'the portrait never starts the browser image drag');
 assert(s.includes("card.addEventListener('click',swallow,{capture:true,once:true})"),'a drag never opens the character screen');
});

check('시설 화면: the host beside what the place offers as tabs; 캐서린 says 별과 심연을 향해',()=>{
 const s=src('app_places_v01411.js'),shell=src('app_shell.js');
 assert(s.includes("'별과 심연을 향해! 모험가 길드에 온 걸 환영해.'"));
 assert(s.includes('동료 영입 임무')&&s.includes('이곳에서'),'recruitment and the rest are separate tabs');
 assert(shell.includes("else if(key==='DIALOGUE'&&game.s.placeVisit&&S.placeLayout&&$(':scope > .place-breadcrumb',p)){mode='menu';S.placeLayout(content,p);}"));
});

check('작업장 and battle text: the workshop bar, a 치명타! badge and 부착 tags',()=>{
 const forge=src('app_forge_v0148.js'),fx=src('app_combat_fx.js');
 assert(forge.includes('판매 상품')&&forge.includes('강화·돌파'),'the workshop bar names its three parts');
 assert(fx.includes('impact-crit')&&fx.includes('치명타!'),'critical hits say so');
 assert(fx.includes('aura-tag')&&fx.includes(' 부착'),'an element applied without a reaction is named');
});

check('words: 얼어붙은 구라구라꽃, and 가방 everywhere instead of 소지품',()=>{
 const enc=src('runtime_mond_encounters.js');assert(enc.includes('얼어붙은 구라구라꽃'));
 for(const f of ['app_party.js','app_equipment.js','app_cooking.js','app_gear.js','app_revision.js','app_market.js'])assert(!src(f).includes('소지품'),f);
});

check('talents: a rising curve, and C3/C5 raise the talent the original raises',()=>{
 const g=fresh(),P=c.CRPGRuntime.premiumV0148;
 assert.deepEqual(plain(P.talent.CURVE),[100,108,117,127,138,150,163,177,192,208,225,243,262]);
 const steps=P.talent.CURVE.slice(1).map((v,i)=>v-P.talent.CURVE[i]);assert(steps.every((d,i)=>i===0||d>=steps[i-1]),'each level is worth at least the one before');
 g.s.constellations={MOND_AMBER:3,MOND_ALBEDO:3};
 assert.equal(g.talentLevels('MOND_AMBER').q,4,'앰버 C3 raises 화살비');assert.equal(g.talentLevels('MOND_AMBER').e,1);
 assert.equal(g.talentLevels('MOND_ALBEDO').e,4,'알베도 C3 raises 창생법');
 g.s.constellations.MOND_AMBER=5;assert.equal(g.talentLevels('MOND_AMBER').e,4);assert.equal(g.premiumTalentMultiplier('MOND_AMBER','q'),1.27);
 assert.equal(g.constellationInfo('MOND_AMBER').talentNames.na,'명사수','normal attacks have their own names');
 return {curve:P.talent.CURVE};
});

check('운명의 자리: every fighter has the six official names and effects that the interpreter knows',()=>{
 const C=c.CRPGRuntime.constellationsV01411,keys=Object.keys(C.names),known=new Set(['dmg','stat','team','onCast','onHit','cd','charge','taken','heal','shieldPow','start','lowHp','revive','onHurt','onKill','shieldBreak','shieldHeal','roundEnd','fieldEnd','teamHit','teamCast','enemyStat','onHealed']);
 assert.equal(keys.length,46,'43 companions, the Traveler (wind and rock) and 이세계인');
 for(const k of keys){const N=C.names[k];assert.equal(N[6].length,6,k);assert(/^[eq]{2}$/.test(N[5])&&N[5][0]!==N[5][1],k);
  for(const n of [1,2,4,6]){const e=C.effects[k][n];assert(e&&e.text.length>12&&e.fx.length,k+' C'+n);for(const fx of e.fx)assert(known.has(fx.t),k+' C'+n+' '+fx.t);}
  assert.match(C.nodeText(k,3),/특성 레벨 \+3/);assert.match(C.nodeText(k,5),/특성 레벨 \+3/);}
 assert.deepEqual(plain(C.names.MOND_AMBER[6]),['일석이츄츄!','일촉즉발','타오르기 시작했어!','보통 봉제 인형일 리가 없잖아','토끼 백작이야!','맹렬한 불길']);
 const g=fresh();assert.equal(g.constellationInfo('PLAYER_CUSTOM').group,'나그네자리');
 const i=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');assert.equal(i.constellationInfo('PLAYER_CUSTOM').group,'표류자리');
 return {fighters:keys.length};
});

check('운명의 자리 effects act in battle: damage, charges, cooldowns, party bonuses, weaknesses, rescues',()=>{
 // 앰버 C2: 토끼 백작's explosion is three times as strong.
 let g=party(fresh(),['MOND_AMBER']);battle(g);let a=actor(g,'MOND_AMBER'),t=foe(g);
 const base=g.combatDamageMultiplier(a,t,'불',{sourceKind:'OBJECT'});g.s.constellations={MOND_AMBER:2};
 assert.equal(Math.round(g.combatDamageMultiplier(a,t,'불',{sourceKind:'OBJECT'})/base*100),300);
 // 앰버 C4: one more 폭탄 인형 before the cooldown.
 g.s.constellations={MOND_AMBER:4};a.cooldowns.MOND_AMBER_E=2;g.consAfterCast(a,'MOND_AMBER_E','e',{});assert.equal(a.cooldowns.MOND_AMBER_E,0);
 a.cooldowns.MOND_AMBER_E=2;g.consAfterCast(a,'MOND_AMBER_E','e',{});assert.equal(a.cooldowns.MOND_AMBER_E,2);
 // 바바라 C1: the burst comes a turn sooner; C6: a fall is undone once.
 g=party(fresh(),['MOND_BARBARA']);battle(g);a=actor(g,'MOND_BARBARA');g.s.constellations={MOND_BARBARA:6};
 a.cooldowns.MOND_BARBARA_Q=3;g.consAfterCast(a,'MOND_BARBARA_Q','q',{});assert.equal(a.cooldowns.MOND_BARBARA_Q,2);
 const p=actor(g,'PLAYER_CUSTOM'),e=foe(g);g.applyDamage(e,p,p.hp+9999,{element:'물리'});assert.equal(p.hp,p.maxHp,'revived at full');
 g.applyDamage(e,p,p.hp+9999,{element:'물리'});assert.equal(p.hp,0,'only once per battle');
 // 호두 C6: a lethal blow leaves her standing, harder to hurt.
 g=party(fresh(),['LIYUE_HUTAO']);battle(g);a=actor(g,'LIYUE_HUTAO');g.s.constellations={LIYUE_HUTAO:6};
 g.applyDamage(foe(g),a,a.hp+5000,{element:'물리'});assert.equal(a.hp,1);assert(a.statuses.some(s=>s.id==='CONS_HUTAO_6'));
 // 치치 C4: a marked enemy hits softer. 알베도 C4: the whole party's plain attacks hit harder.
 g=party(fresh(),['LIYUE_QIQI','MOND_ALBEDO']);battle(g);t=foe(g);const atk=g.combatStat(t,'atk');g.s.constellations={LIYUE_QIQI:4,MOND_ALBEDO:4};
 g.addCombatStatus(t,'FORTUNE_TALISMAN',2);assert.equal(Math.round(g.combatStat(t,'atk')/atk*100),75);
 const pl=actor(g,'PLAYER_CUSTOM'),na0=(g.s.constellations={},g.combatDamageMultiplier(pl,t,'물리',{card:'PLAYER_BASIC_ATTACK'}));g.s.constellations={MOND_ALBEDO:4};
 assert.equal(Math.round(g.combatDamageMultiplier(pl,t,'물리',{card:'PLAYER_BASIC_ATTACK'})/na0*100),130);
 // 소 C4: below half HP his defence doubles (an effect on the fighter's own stat).
 g=party(fresh(),['LIYUE_XIAO']);battle(g);a=actor(g,'LIYUE_XIAO');a.hp=Math.floor(a.maxHp*.4);const def0=g.combatStat(a,'def');g.s.constellations={LIYUE_XIAO:4};
 assert.equal(Math.round(g.combatStat(a,'def')/def0*100),200);a.hp=a.maxHp;assert.equal(g.combatStat(a,'def'),def0);
 // 벤티 C6: enemies hit by 바람신의 시 take 40% more elemental damage from everyone.
 g=party(fresh(),['MOND_VENTI']);battle(g);a=actor(g,'MOND_VENTI');t=foe(g);const fire0=g.combatDamageMultiplier(actor(g,'PLAYER_CUSTOM'),t,'불',{});g.s.constellations={MOND_VENTI:6};
 g.consRun(g.consFx('MOND_VENTI').find(f=>f.t==='onCast'&&f.kind==='q'),a,{target:t});
 g.s.constellations={};assert.equal(Math.round(g.combatDamageMultiplier(actor(g,'PLAYER_CUSTOM'),t,'불',{})/fire0*100),140);
 return {checked:8};
});

check('운명의 자리: whole battles with every effect unlocked run to the end',()=>{
 const all=['MOND_AMBER','MOND_FISCHL','MOND_KLEE','MOND_NOELLE','LIYUE_ZHONGLI','LIYUE_XINGQIU','LIYUE_YELAN','LIYUE_SHENHE','LIYUE_CHONGYUN'];let ended=0;
 for(let i=0;i<all.length;i+=3){const g=admin(party(fresh(),all.slice(i,i+3)));g.action('OPERATOR_DEBUG',{op:'level',value:12});g.s.constellations={PLAYER_CUSTOM:6};for(const id of all.slice(i,i+3))g.s.constellations[id]=6;
  battle(g);let guard=0;while(g.s.runtime&&g.s.runtime.phase==='WAIT_PLAYER'&&guard++<200){const cs=g.combatCards().filter(x=>!x.reason&&!x.system),card=cs.find(x=>/_Q$/.test(x.id))||cs.find(x=>/_E$/.test(x.id))||cs[0];if(!card)g.combatAction('PLAYER_BASIC_GUARD');else g.combatAction(card.id,card.targets?.[0]?.id,card.branches?.[0]);}
  if(!g.s.runtime)ended++;}
 assert.equal(ended,3);return {battles:ended};
});

check('exchanges: fates for 원석, a chosen 운명의 별 by rarity, boss materials and stardust within weekly limits',()=>{
 const g=admin(fresh());g.action('OPERATOR_DEBUG',{op:'premium',currency:'PRIMOGEM',value:1600});
 g.action('PREMIUM_BUY',{offer:'FATE_INTERTWINED',count:10});assert.deepEqual([g.premiumBalance().PRIMOGEM,g.premiumBalance().INTERTWINED_FATE],[0,10]);
 assert.match(g.premiumOfferReason({offer:'FATE_ACQUAINT'}),/원석이\(가\) 부족/);
 assert.equal(g.premiumStellaPrice('LIYUE_ZHONGLI'),40);assert.equal(g.premiumStellaPrice('MOND_AMBER'),25);assert.equal(g.premiumStellaPrice('PLAYER_CUSTOM'),40);
 assert.equal(g.premiumOwns('MOND_AMBER'),false,'a companion who has not joined is not offered');assert(!g.premiumFighters().includes('MOND_AMBER'));
 g.adminApply({op:'recruit',char:'MOND_AMBER'});assert(g.premiumFighters().includes('MOND_AMBER'));
 g.action('OPERATOR_DEBUG',{op:'premium',currency:'STARGLITTER',value:25});g.action('PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'});assert.equal(g.itemCount('STELLA_MOND_AMBER'),1);
 g.giveItem('MAT_FB_HURRICANE_SEED',40);for(let i=0;i<5;i++)g.action('PREMIUM_BUY',{offer:'BOSS_GLITTER',item:'MAT_FB_HURRICANE_SEED'});
 assert.equal(g.premiumBalance().STARGLITTER,5);assert.match(g.premiumOfferReason({offer:'BOSS_GLITTER',item:'MAT_FB_HURRICANE_SEED'}),/이번 주에는/);
 g.action('OPERATOR_DEBUG',{op:'premium',currency:'STARDUST',value:200});for(let i=0;i<5;i++)g.action('PREMIUM_BUY',{offer:'DUST_MORA'});
 assert.match(g.premiumOfferReason({offer:'DUST_MORA'}),/이번 주에는/);
 // A new week opens the limits again.
 g.actionStartedAt=Date.now()+8*86400000;assert.equal(g.premiumOfferReason({offer:'DUST_MORA'}),'');delete g.actionStartedAt;
 g.validateSave(plain(g.s));
 assert.throws(()=>{const x=fresh();x.action('OPERATOR_DEBUG',{op:'premium',currency:'PRIMOGEM',value:1});},/운영자/);
 return {balance:plain(g.premiumBalance())};
});

check('기원: rates and pity, the weekly banner, the 10-wish companion, weapons, the record',()=>{
 const g=admin(fresh());g.action('OPERATOR_DEBUG',{op:'premium',currency:'INTERTWINED_FATE',value:400});g.action('OPERATOR_DEBUG',{op:'premium',currency:'ACQUAINT_FATE',value:20});
 assert.match(fresh().actionReason('WISH',{banner:'EVENT',count:1}),/뒤얽힌 인연이\(가\) 부족/);
 let n5=0,n4=0,chars=0,batches=0;
 for(let i=0;i<30;i++){const out=g.action('WISH',{banner:'EVENT',count:10}),res=(out.result||out).results;batches++;if(res.some(r=>r.kind==='char'))chars++;n5+=res.filter(r=>r.rarity===5).length;n4+=res.filter(r=>r.rarity===4).length;}
 assert.equal(chars,batches,'every 10-wish holds a companion');assert(n4>=30,'a 4★ or better within every ten');
 const s=g.wishState();assert.equal(s.history.length,60);assert(s.EVENT.total>=300);
 // Hard pity, and the featured 5★ after a miss.
 g.s.wish.EVENT.pity5=89;g.s.wish.EVENT.guarantee5=true;let r=(g.action('WISH',{banner:'EVENT',count:1}).result||{}).results||g.s.wish.history.slice(-1);
 const last=g.s.wish.history[g.s.wish.history.length-1];assert.equal(last.rarity,5);assert.equal(last.id,g.wishFeatured().five);assert.equal(g.wishState().EVENT.guarantee5,false);
 g.s.wish.STANDARD={pity5:0,pity4:9,total:0};g.action('WISH',{banner:'STANDARD',count:1});assert(g.s.wish.history[g.s.wish.history.length-1].rarity>=4);
 // The featured companions change every week; 자백 is not in the rotation.
 const W=c.CRPGRuntime.wishV01411,weeks=new Set();for(let w=0;w<13;w++)weeks.add(g.wishFeatured(w).five);
 assert.equal(weeks.size,13);assert(!W.pools.LIMITED5.includes('LIYUE_ZIBAI'));assert.notEqual(g.wishFeatured(5).five,g.wishFeatured(6).five);
 // Weapons go to the bag; a fourth copy of a 3★ weapon turns into 스타더스트.
 const h=fresh();for(let i=0;i<3;i++)h.giveEquipment('EQ_SWORD_HARBINGER');const bag=h.s.inventory.length,dust=h.premiumBalance().STARDUST;
 const x=h.wishGrant({kind:'weapon',rarity:3,id:'EQ_SWORD_HARBINGER'});assert.equal(x.converted,true);assert.equal(h.s.inventory.length,bag);assert.equal(h.premiumBalance().STARDUST-dust,15,'the copy comes as its 15 alone (0.15.1)');
 const y=h.wishGrant({kind:'weapon',rarity:4,id:'EQ_BOW_FAVONIUS'});assert(y.slot&&h.s.inventory.some(i=>i.slot===y.slot));
 // A companion whose six 운명의 자리 are covered gives 스타라이트 instead of another 별.
 h.adminApply({op:'recruit',char:'LIYUE_ZHONGLI'});h.s.constellations={LIYUE_ZHONGLI:6};const z=h.wishGrant({kind:'char',rarity:5,id:'LIYUE_ZHONGLI'});assert.equal(z.stella,false);assert.equal(z.glitter,25);
 // The record is checked; the draw mixes in the server's action time.
 g.validateSave(plain(g.s));assert.throws(()=>g.validateSave({...plain(g.s),wish:{...plain(g.s.wish),EVENT:{...plain(g.s.wish.EVENT),pity5:95}}}),/기원 기록/);
 const save=plain(g.s),a1=new c.CRPGRuntime.Runtime(g.db,plain(save)),a2=new c.CRPGRuntime.Runtime(g.db,plain(save));a1.actionStartedAt=1790000000000;a2.actionStartedAt=1790000000777;
 const p1=a1.action('WISH',{banner:'EVENT',count:10}),p2=a2.action('WISH',{banner:'EVENT',count:10});
 assert.notDeepEqual(plain((p1.result||p1).results.map(q=>q.id)),plain((p2.result||p2).results.map(q=>q.id)));
 return {pulls:batches*10,n5,n4};
});

check('자백 is met only through events',()=>{
 const g=fresh();const e=g.recruitmentEntries().find(x=>x.character==='LIYUE_ZIBAI');assert.equal(e.method,'이벤트 전용 · 획득 임무 없음');
 assert.equal(g.actionReason('ZIBAI_RETURN_CHECK',{step:0}),'자백은 이벤트에서만 만날 수 있습니다.');
 assert(!g.placeCatalog().some(p=>p.id==='EVT_CRPG_LIYUE_MOUNTAIN_RETURN'));
 assert(src('app_recruitment.js').includes("game.recruitEventOnly?.('LIYUE_ZIBAI'))return;"));
});

check('original textures and sounds are in place and recorded',()=>{
 const icons=json('content/item-icons.json').icons;for(const id of ['CUR_PRIMOGEM','CUR_STARGLITTER','CUR_STARDUST','CUR_INTERTWINED_FATE','CUR_ACQUAINT_FATE']){assert(icons[id],id);assert(fs.existsSync(path.join(root,'assets',icons[id].path.replace(/^assets\//,''))),id);}
 const ui=json('content/genshin-ui-assets.json');assert.equal(Object.keys(ui.constellations).length,45);
 for(const [id,list]of Object.entries(ui.constellations)){assert.equal(list.length,6,id);for(const r of list)assert(fs.existsSync(path.join(root,'assets',r.path.replace(/^assets\//,''))),r.path);}
 for(const k of ['fire','water','ice','electro','anemo','geo','dendro','weapon','default','summary','quality4','quality5'])assert(fs.existsSync(path.join(root,'assets',ui.wish[k].path.replace(/^assets\//,''))),k);
 const cat=json('assets/audio/genshin-sfx/catalog.json').files,ids=['ig_wish_open','ig_wish_click','ig_wish_execute3','ig_wish_execute4','ig_wish_execute5','ig_wish_return','ig_wish_close','ig_constellation_activate','ig_constellation_open','ig_character_constellation'];
 for(const id of ids){const f=cat.find(x=>x.id===id);assert(f,id);assert(fs.existsSync(path.join(root,'assets/audio/genshin-sfx',f.file)),f.file);}
 const snd=src('app_sound.js');for(const k of ['wish_open','wish_3','wish_4','wish_5','wish_return','constellation'])assert(snd.includes(' '+k+':[['),k);
 assert(src('../tools/build.py').includes("public['uiAssets']="));
 return {constellationIcons:270};
});

check('screens: the wish screen and its presentation, the constellation chart and card frames are wired in',()=>{
 const html=src('index.html'),build=src('../tools/build.py');
 for(const f of ['runtime_constellations_v01411.js','runtime_wish_v01411.js','app_wish_v01411.js'])assert(html.includes('<script src="'+f+'"></script>')&&build.includes("'"+f+"'"),f);
 assert(html.indexOf('runtime_premium_v0148.js')<html.indexOf('runtime_constellations_v01411.js')&&html.indexOf('runtime_constellations_v01411.js')<html.indexOf('runtime_wish_v01411.js'));
 // 0.14.12: the falling star is the original wish video; every result then appears on its own, 3★ weapons too.
 const w=src('app_wish_v01411.js');assert(w.includes("'assets/video/wish/'")&&w.includes("const sound='wish_reveal'+r.rarity;SND(sound);")&&w.includes('건너뛰기')&&w.includes("SND('wish_return')"),'the original wish video, every result in turn, skippable, then the results');
 for(const v of ['3star-single','4star-single','5star-single','4star-multi','5star-multi'])assert(fs.existsSync(path.join(root,'assets/video/wish',v+'.mp4')),v);
 assert(w.includes("then:count")&&w.includes("'교환하고 기원'"),'missing fates are exchanged on the spot');
 const p=src('app_premium_v0148.js');assert(p.includes("sfx('constellation')")&&p.includes("'cons-frame','cons-'+lv"),'opening a constellation plays the original sound; cards wear a frame per level');
 assert(src('app_equipment.js').includes("document.querySelector('.wish-screen'))return;"),'the first-equipment guide waits for the wish screen to close');
});

const out=path.join(root,'reports/v01411');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'runtime-tests.json'),JSON.stringify({version:'0.14.11',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
