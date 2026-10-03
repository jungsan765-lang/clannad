'use strict';
// v0.15.1: the mailbox (operator gifts and notices in the save; letters between adventurers on the account server),
// Katheryne speaking 반말, the operator rollback following the market, the Stella Fortuna and Mora pictures, the wish
// cards' shadow, chances in 틀린 그림 찾기, tradeable/bound items apart, adult mode gone, the fan-project notice on the
// title, the folded sound picker, and the bond note in the mission list.
const assert=require('node:assert/strict'),path=require('path');
const {fs,root,c,db,R,fresh}=require('./helpers_v011.cjs');
const results=[],src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),file=f=>fs.readFileSync(path.join(root,f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const plain=x=>JSON.parse(JSON.stringify(x));
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};

check('mailbox: what the console gives waits as one gift mail; other changes apply at once and send one notice',()=>{
 const g=fresh(),m0=Number(g.s.global.MORA);
 assert.match(g.adminApply({op:'currency',key:'PRIMOGEM',mode:'add',value:1600}),/우편으로 보냄/);
 g.adminApply({op:'item',id:'ING_APPLE',count:5});g.adminApply({op:'equipment_give',id:'EQ_SWORD_HARBINGER',enhance:11,count:2});
 g.adminApply({op:'currency',key:'MORA',mode:'set',value:777});
 assert.equal(Number(g.s.global.PRIMOGEM||0),0,'nothing given yet');assert.equal(g.itemCount('ING_APPLE'),0);assert.equal(Number(g.s.global.MORA),777,'a set value applies at once');
 const ids=plain(g.adminMailFlush({title:'',body:''}));assert.equal(ids.length,2);
 const v=plain(g.mailView());assert.deepEqual(v.list.map(x=>x.kind),['NOTICE','GIFT'],'newest first');assert.equal(v.unclaimed,1);assert.equal(g.mailUnread(),2);
 assert.match(v.list[0].body,/모라/);assert.equal(v.list[1].title,'운영자의 선물');
 const got=plain(g.action('MAIL_CLAIM',{mail:v.list[1].id}).result);
 assert.equal(Number(g.s.global.PRIMOGEM),1600);assert.equal(g.itemCount('ING_APPLE'),5);
 const swords=g.s.inventory.filter(x=>x.equip==='EQ_SWORD_HARBINGER');assert.equal(swords.length,2);assert(swords.every(x=>x.enhance===11&&x.enhancementCap===12),'enhancement kept, past +10 opened to +12');
 assert(got.lines.some(l=>/여명신검 \+11 2개/.test(l)),'the claim says what came: '+got.lines.join(', '));
 assert(refused(()=>g.action('MAIL_CLAIM',{mail:v.list[1].id}),/이미 받은/),'taken once');assert(refused(()=>g.action('MAIL_CLAIM',{mail:'ALL'}),/받을 선물이 없습니다/));
 g.action('MAIL_READ',{ids:[v.list[0].id]});assert.equal(g.mailUnread(),0);
 return {m0,lines:got.lines};
});

check('mailbox: tidy up keeps a gift not yet taken; a claim waits for the battle to end; a broken box is refused',()=>{
 const g=fresh();g.adminApply({op:'currency',key:'STARGLITTER',mode:'add',value:5});g.adminApply({op:'teleport',map:'MAP_MOND_CITY'});g.adminMailFlush({});
 const [notice,gift]=plain(g.mailView().list);
 const out=plain(g.action('MAIL_DELETE',{ids:[notice.id,gift.id]}).result);assert.deepEqual(out,{deleted:1,kept:1});
 g.s.runtime={};assert.match(g.actionReason('MAIL_CLAIM',{mail:gift.id}),/전투가 끝난 뒤/);delete g.s.runtime;
 const bad=plain(g.s);bad.mail.list[0].gifts.currency={GOLD:1};assert(refused(()=>new R(db,bad,true),/우편/),'unknown currency');
 const twice=plain(g.s);twice.mail.list.push({...twice.mail.list[0]});assert(refused(()=>new R(db,twice,true),/우편/),'ids are unique');
 assert.equal(c.CRPGRuntime.mailRules.keep,100);
 for(let i=0;i<120;i++){const m=g.mailAdd({kind:'NOTICE',title:'알림 '+i,body:''});m.read=true;}
 assert(g.s.mail.list.length<=100&&g.s.mail.list.some(x=>x.id===gift.id),'old read mail goes first; a waiting gift stays');
});

check('the account server accepts the mail actions; letters, rollback and the trade log are wired',()=>{
 const core=file('server/game-core.mjs');for(const a of ['MAIL_CLAIM','MAIL_READ','MAIL_DELETE'])assert(core.includes('"'+a+'"'),a);
 const live=file('server/fixed-region-live.mjs');assert.match(live,/letters-v0151\.mjs/);assert.match(live,/'mail-v1'/);assert.match(live,/letterRoute\(/);
 const letters=file('server/letters-v0151.mjs');for(const s of ['/mail/send','/mail/take','/mail/return','/mail/read','/mail/delete','/mail/block','/mail/find','/mail/letters'])assert(letters.includes("'"+s+"'"),s);
 assert.match(letters,/base:50,perEntry:100,moraRate:0\.05/,'postage: 50 + 100 a kind + 5% of the Mora sent');
 const admin=file('server/admin-api.mjs');assert.match(admin,/letterUndo/);assert.match(admin,/marketUndo/);assert.match(admin,/letters:table\('letters'\)|const letters=table\('letters'\)/);
 assert.match(file('server/social-v01415.mjs'),/'market-buy-'\+id\+'-'\+t/,'a purchase undone by a rollback can happen again');
 assert.match(src('admin.js'),/card\('편지'/);
});

check('screens: the mailbox with letters, compose, the sent box, sending back and blocking; a letter from a profile',()=>{
 const html=src('index.html'),build=file('tools/build.py');
 for(const f of ['runtime_mail_v0151.js','app_mail_v0151.js']){assert(html.includes('src="'+f+'"'),f);assert(build.includes(f),'build '+f);}
 assert(html.indexOf('app_mail_v0151.js')>html.indexOf('app_trade.js'),'after the trade screens');
 const mail=src('app_mail_v0151.js');for(const s of ['받은 우편','보낸 편지','편지 쓰기','돌려보내기','되찾기','답장','읽은 우편 정리','정말 차단하기','수수료','/mail/send','/mail/take','/mail/find'])assert(mail.includes(s),s);
 assert.match(src('app_profile_v01415.js'),/편지 보내기/);assert.match(src('app_chat.js'),/우편함에 도착/);
 assert.match(src('shell.css'),/\.ml-compose|\.ml-write/);
});

check('Katheryne speaks 반말 to the traveller at the guild desk',()=>{
 const places=src('app_places_v01411.js');assert(places.includes('별과 심연을 향해! 모험가 길드에 온 걸 환영해.'));
 assert(!places.includes('모험가 길드에 오신 것을 환영합니다'));
});

check('pictures: 운명의 별 and Mora have their Genshin icons; the wish shows gains as pictures and each result comes as a shadow first',()=>{
 const icons=JSON.parse(file('content/item-icons.json')).icons;
 for(const k of ['STELLA_FORTUNA_4','STELLA_FORTUNA_5']){const x=icons[k];assert(x&&fs.existsSync(path.join(root,x.path)),k);assert.equal(x.provenance,'genshin_impact_wiki_file');}
 assert.match(file('assets/icons/CREDITS.md'),/Stella Fortuna/);
 assert.match(src('app_shell.js'),/window\.currencyIcon=/);assert.match(src('app_shell.js'),/currencyIcon\?\.\('MORA','hud-mora-icon'\)/,'the Mora at the top too');assert.match(src('app_adventure.js'),/withCur\(/);assert.match(src('app_premium_v0148.js'),/STELLA_FORTUNA_5/);
 // 0.15.2: the shadow belongs to the one-by-one reveal (cards and weapons), not to the list at the end (user: 「마지막 부분이
 // 그림자여야 된다는게 아니라 하나씩 나올때 그림자여야된다고」)
 const wish=src('app_wish_v01411.js');assert.doesNotMatch(wish,/classList\.add\('lit'\)/);assert.match(wish,/function gainNode/);
 const css=src('shell.css');assert.match(css,/\.wish-reveal\.kind-char \.wish-reveal-art img\{animation:wish-art-shadow/);assert.match(css,/\.wish-reveal\.kind-weapon \.wish-reveal-weapon img\{animation:wish-shadow-in/);
 assert.doesNotMatch(css,/\.wish-card:not\(\.lit\)/,'the list at the end shows everything at once');assert.match(css,/\.wish-card-weapon\{top:6%;width:auto;max-width:84%;height:60%;object-fit:contain\}/);
});

check('틀린 그림 찾기: a wrong press costs a chance (Mond 5, Liyue 3); with none left the search starts over',()=>{
 const chests=src('app_chests_v01415.js');assert.match(chests,/lives0=p\.subtle\?3:5/);assert.match(chests,/기회를 다 써서 처음부터 다시 찾습니다/);
 assert.match(src('shell.css'),/\.ch-lives/);
});

check('tradeable and bound items apart: a bag filter under the kinds, a lock with the reason, the reasons in the trade pickers',()=>{
 assert.match(src('app_experience.js'),/bag-trade-filter/);assert.match(src('app_shell.js'),/n\.matches\('\.bag-trade-filter'\)/);
 const trade=src('app_trade.js');assert.match(trade,/window\.bagTradeRule=/);assert.match(trade,/거래할 수 없는 물건/);
 const g=fresh();assert.equal(g.tradeRule('ING_APPLE').ok,true);assert.match(g.tradeRule('MAT_CHAR_EXP_HERO').reason,/경험치 책/);
 assert.match(src('shell.css'),/body\.teyvat \.bag-cols \.bag-layout\{grid-template-columns:minmax\(0,1fr\);grid-template-rows:auto auto/,'the bag stacks on a phone');
});

check('adult mode is gone; the title carries the fan-project notice; the sound picker is folded',()=>{
 const app=src('app.js');assert(!/성인 모드|성인모드/.test(app.match(/settingsControls[\s\S]{0,4000}/)?.[0]||''),'no adult mode row');assert.match(app,/adultModeEnabled=false/);
 const shell=src('app_shell.js');assert(shell.includes('본 게임은 비영리 비공식 팬 프로젝트이며 HoYoverse의 공식 게임이 아닙니다.'));assert.match(shell,/title-legal/);
 assert.match(shell,/shell-sound-gallery/);assert.match(shell,/효과음 고르기/);
});

check('스타더스트: a spare 3★ weapon gives 15, not 30; 75 buys a fate, five of each kind a month',()=>{
 const g=fresh();for(let i=0;i<3;i++)g.giveEquipment('EQ_SWORD_TRAVELER');const d0=g.premiumBalance().STARDUST;
 assert.equal(plain(g.wishGrant({kind:'weapon',rarity:3,id:'EQ_SWORD_TRAVELER'})).dust,15);assert.equal(g.premiumBalance().STARDUST-d0,15);
 const offers=c.CRPGRuntime.premiumV0148.offers.filter(o=>o.shop==='STARDUST');
 assert.deepEqual(plain(offers.map(o=>o.id+':'+o.price+':'+(o.monthly||'')+':'+(o.weekly||''))),['DUST_ACQUAINT:75:5:','DUST_INTERTWINED:75:5:','DUST_HERO_EXP:20::5','DUST_MORA:10::5']);
 const KST=9*3600000,start=Date.UTC(2026,9,10,3)-KST;g.actionStartedAt=start;g.s.global.STARDUST=1000;
 for(let i=0;i<5;i++)g.action('PREMIUM_BUY',{offer:'DUST_ACQUAINT'});
 assert.equal(g.premiumBalance().ACQUAINT_FATE,5);assert.equal(g.premiumBalance().STARDUST,1000-375);
 assert.match(g.premiumOfferReason({offer:'DUST_ACQUAINT'}),/이번 달에는/);assert.equal(g.premiumOfferReason({offer:'DUST_INTERTWINED'}),'','each kind has its own five');
 g.actionStartedAt=Date.UTC(2026,9,31,14,59)-0;assert.match(g.premiumOfferReason({offer:'DUST_ACQUAINT'}),/이번 달에는/,'still October in Korea at 23:59');
 g.actionStartedAt=Date.UTC(2026,9,31,15,0);assert.equal(g.premiumOfferReason({offer:'DUST_ACQUAINT'}),'','November 1st 00:00 in Korea starts a new month');
 delete g.actionStartedAt;
 const bad=plain(g.s);bad.premiumMonthly={month:1,bought:{DUST_MORA:1}};assert(refused(()=>new R(db,bad,true),/월간 교환/),'only monthly offers are counted by month');
 assert.match(src('app_premium_v0148.js'),/이번 달 '\+used/);assert.match(src('app_wish_v01411.js'),/스타더스트 75개로도 인연을/);
 assert(!/나선비경 1~8층/.test(src('app_premium_v0148.js')+src('app_wish_v01411.js')),'Primogem notes keep only the fan-game line');
});

check('missions: the bond note sits under the name instead of falling into the picture column',()=>{
 assert.match(src('app_liyue_rework.js'),/querySelector\(':scope>\.journal-row-copy'\)/);
});

const passed=results.filter(r=>r.ok).length;console.log(JSON.stringify({total:results.length,passed}));
