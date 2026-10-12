'use strict';
// 0.16.35 (TODO 6): one daily boss a day in all, their names, the boss echo only from bosses, the board's aura, the keys,
// buying with − / + / 최대 and the market's price per item.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {c,fresh,root}=require('./helpers_v011.cjs');
const api=c.CRPGRuntime,src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};

check('일일 보스: whichever daily boss is entered first takes the day for all of them, Liyue farming included',()=>{
 const r=fresh(),today=r.bossRealDay();
 assert.equal(r.bossAdmission('BOSS_DVALIN').reason,'');assert.equal(r.bossDailyUsed(),null);
 r.s.bossRealAdmissions={BOSS_ANDRIUS:today};
 for(const boss of ['BOSS_ANDRIUS','BOSS_DVALIN'])assert.match(r.bossAdmission(boss).reason,/어느 보스든 합쳐 하루에 한 번.*안드리우스/,boss);
 if(r.liyueArtifactFarmReason)for(const kind of ['TARTAGLIA','AZHDAHA']){const why=r.liyueArtifactFarmReason(kind);assert(why,'farming '+kind+' waits too');}
 r.s.bossRealAdmissions={FARM_TARTAGLIA:today};assert.match(r.bossAdmission('BOSS_ANDRIUS').reason,/타르탈리아/,'a Liyue farming entry counts for Mond');
 r.s.bossRealAdmissions={BOSS_DVALIN:today-1};assert.equal(r.bossAdmission('BOSS_ANDRIUS').reason,'','yesterday does not count');
 r.validateSave(JSON.parse(JSON.stringify(r.s)));
});

check('일일 보스 names: no 「재료 재도전」 or 「보스 재도전」 left on screen; the handbook counts one a day',()=>{
 for(const f of fs.readdirSync(path.join(root,'source')).filter(f=>/^app_.*\.js$/.test(f)))assert(!/재료 재도전|보스 재도전|재도전 기믹|변이 재도전/.test(src(f)),f);
 for(const f of ['runtime_achievements_v0152.js','runtime_enhancement.js','runtime_mond_boss_balance.js'])assert(!src(f).includes('재도전'),f);
 const list=fresh().achievementView().list;assert(!list.some(a=>/재도전/.test(a.name+a.desc)),'achievement names');assert(list.some(a=>a.name==='안드리우스 토벌'&&a.desc==='일일 보스 안드리우스에게 이기기'));
 assert(src('app_enhancement.js').includes("actionButton('일일 보스 토벌','MOND_MATERIAL_CHALLENGE'"));
 assert(src('app_handbook.js').includes("used+' / 1 도전'"));
});

check('강적의 잔향: never from a fight on the road; still from the bosses',()=>{
 const r=fresh('MAP_MOND_PLAINS');const has=()=>r.combatRows('20_LOOT_TABLE').some(x=>x[2]==='TRPG_BOSS_ESSENCE');
 assert(has(),'the table itself still has it');
 r.s.runtime={origin:'RANDOM',actors:[{side:'ENEMY',grade:'일반'}]};assert(r.roadBattle());assert(!has(),'a road fight never rolls it');
 r.s.runtime={origin:'QUEST:Q_X',actors:[]};assert(!has());
 for(const b of [{origin:'MATERIAL_CHALLENGE:BOSS_ANDRIUS',actors:[]},{origin:'RANDOM',fieldBoss:{},actors:[]},{origin:'RANDOM',actors:[{side:'ENEMY',grade:'보스'}]},{origin:'ABYSS:1',abyss:{},actors:[]}]){r.s.runtime=b;assert(has(),JSON.stringify(b));}
 r.s.runtime=null;
 const tiers=src('runtime_enemy_tiers.js');assert(tiers.includes("drops.filter(x=>!BOSS_MATS.has(x[2]))"),'the strengthened monsters\' rarest drop skips it');assert(tiers.includes('rule.essence&&!roadBattle(b)'));
});

check('the daily boss board glows in its element; Space, E/Q and 1–4 work in battle; buying and selling by the piece',()=>{
 const fx=src('app_skill_fx_v0162.js');assert(fx.includes("const BOSS_AURA={BOSS_ANDRIUS:'cryo',BOSS_DVALIN:'anemo',BOSS_TARTAGLIA:'hydro',BOSS_AZHDAHA:'geo'}"));assert(fx.includes("startsWith('MATERIAL_CHALLENGE:')"));
 assert(src('screen_v01629.css').includes('.boss-aura::after'));
 const keys=src('app_protagonist.js');assert(keys.includes('[data-action="COMBAT_BEGIN"]')&&keys.includes('[data-action="COMBAT"]')&&keys.includes('.combatant-row.targetable'));
 const buy=src('app_experience.js'),fn=buy.slice(buy.indexOf('function showPurchaseQuantity'),buy.indexOf('function showPurchaseQuantity')+2200);
 assert(fn.includes("button('최대'")&&fn.includes("button('−'")&&fn.includes("button('+'")&&!fn.includes("el('input')"),'no typed number');
 const sell=src('app_trade.js');assert(sell.includes("'개당 가격 (모라)'")&&sell.includes('price=unit*'),'the price is per piece; the total is sent');
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
