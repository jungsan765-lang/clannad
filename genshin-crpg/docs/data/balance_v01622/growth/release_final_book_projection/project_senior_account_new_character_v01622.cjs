'use strict';
// Conditional acquisition ledger, NOT native combat or elapsed farming time.
// An already-unlocked level60 four-person account farms while a new owned
// level1 four-star stays on the bench. Reward settlement uses an explicitly
// injected victory fixture; books, ascension, payments and hourly quota use
// native methods. No product function or stat coefficient is overridden;
// enemy HP is explicitly zeroed only in the declared settlement fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const A=require('../audit_growth_v01622.cjs'),env=A.env,api=env.c.CRPGRuntime,G=env.G,cp=x=>JSON.parse(JSON.stringify(x)),owner='MOND_FISCHL',{r,owners:seniorOwners}=A.setup({level:60,team:'story4',seed:717});
const owned=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);owned[owner]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);
r.s.chars[owner].level=1;r.s.chars[owner].xp=0;r.s.ascensions[owner]=0;r.s.constellations[owner]=0;r.s.talents[owner]={na:1,e:1,q:1};r.recalculate();r.s.chars[owner].hp=r.character(owner).maxHp;
assert.equal(r.rarityOf(owner),4);assert(r.premiumOwns(owner));assert(!r.s.party.some(p=>p.source===owner));
const seniorBefore=cp(A.actors(r,seniorOwners)),newBefore=cp(r.growth(owner)),walletBefore=r.s.global.MORA,partyBefore=cp(r.s.party);
const top=api.leyLines.tiers.at(-1);assert.equal(top.level,60);assert.equal(top.books.MAT_CHAR_EXP_HERO,180);assert.equal(r.leyLineTierReason(top.tier,'몬드'),'');assert.equal(r.leyLineTierReason(top.tier,'리월'),'');
const claims=[],uses=[],ascensions=[];let usedBooks=0,actualBookXp=0,nominalBookXp=0,nominalBenchXp=0,actualBenchXp=0;
function absolute(g){let n=g.xp;for(let l=1;l<g.level;l++)n+=G.xpNext(l);return n;}
function ascend(){const g=r.growth(owner);if(!g.max||g.final)return;const quote=cp(r.ascensionInfo(owner)),stockBefore=Object.fromEntries(Object.keys(quote.cost.items).map(id=>[id,r.itemCount(id)]));
 // These six material packages are declared synthetic procurement inputs;
 // their acquisition time, drop chance and farming difficulty are excluded.
 for(const[id,n]of Object.entries(quote.cost.items))r.giveItem(id,n);
 const money=r.s.global.MORA,receipt=cp(r.action('CHAR_ASCEND',{owner}).result);assert.equal(money-r.s.global.MORA,quote.cost.mora);
 for(const[id]of Object.entries(quote.cost.items))assert.equal(r.itemCount(id),stockBefore[id]);
 ascensions.push({level:g.level,phaseBefore:g.phase,nextCap:quote.nextCap,cost:quote.cost,receipt,source:'Synthetic exact material supply followed by native CHAR_ASCEND payment; initial account funding, no earned Mora supplied per action.'});}
for(let window=0;window<30&&!r.growth(owner).final;window++){
 if(window)env.advance(api.leyLines.hourMs);const hour=r.leyLineHour(),blossom=r.leyLineStatus().blossoms.find(b=>b.kind==='REVELATION'&&b.region==='몬드');assert(blossom);assert.equal(r.leyLineClaimed('REVELATION'),false);
 const booksBefore=r.itemCount('MAT_CHAR_EXP_HERO'),targetBefore=cp(r.growth(owner));
 // Excluded travel is an explicit starting-location fixture, not a MOVE.
 r.s.global.CURRENT_MAP_ID=blossom.map;r.s.global.SCREEN_MODE='LOCATION';r.s.placeVisit=null;
 r.action('PLACE_ENTER',{place:'BOSS:'+blossom.route,mode:'BOSS'});r.action('BOSS_ROUTE',{route:blossom.route,entry:'DIRECT',tier:top.tier});
 const battle=r.s.runtime,enemyInputs=cp(battle.actors.filter(a=>a.side==='ENEMY'));assert.equal(battle.leyLine.hour,hour);assert.equal(battle.leyLine.level,60);
 for(const foe of battle.actors.filter(a=>a.side==='ENEMY'))foe.hp=0; // INJECTED VICTORY, no native attack/win claim.
 const settlement=cp(r.finishBattle(true));assert.equal(settlement.leyLine.claimed,true);assert.equal(r.itemCount('MAT_CHAR_EXP_HERO')-booksBefore,180);assert.equal(r.s.leyLine.REVELATION,hour);assert.equal(r.leyLineClaimed('REVELATION'),true);
 const acrossRegion=r.leyLineStatus().blossoms.find(b=>b.kind==='REVELATION'&&b.region==='리월');assert(acrossRegion);assert.equal(r.leyLineRouteInfo(acrossRegion.route).claimed,true);
 const settledSave=r.serialize();assert.equal(r.finishBattle(true),undefined);assert.equal(r.serialize(),settledSave,'same settlement gives no duplicate180-book reward');
 const sharedNominal=Math.floor(settlement.xp*.25),sharedApplied=absolute(r.growth(owner))-absolute(targetBefore);assert.equal(sharedNominal,100);assert(sharedApplied>=0&&sharedApplied<=sharedNominal);nominalBenchXp+=sharedNominal;actualBenchXp+=sharedApplied;
 let spent=0;while(r.itemCount('MAT_CHAR_EXP_HERO')>0&&!r.growth(owner).final){ascend();const before=cp(r.growth(owner)),limit=r.experienceBookLimit('MAT_CHAR_EXP_HERO',owner),quantity=Math.min(r.itemCount('MAT_CHAR_EXP_HERO'),limit);assert(quantity>0);
  const stock=r.itemCount('MAT_CHAR_EXP_HERO'),money=r.s.global.MORA,receipt=cp(r.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',quantity,owner}).result),after=cp(r.growth(owner)),applied=absolute(after)-absolute(before);
  assert.equal(stock-r.itemCount('MAT_CHAR_EXP_HERO'),quantity);assert.equal(r.s.global.MORA,money,'books have no Mora fee');assert.equal(receipt.quantity,quantity);
  spent+=quantity;usedBooks+=quantity;actualBookXp+=applied;nominalBookXp+=quantity*1000;uses.push({window,before,after,limit,quantity,nominalXp:quantity*1000,appliedXp:applied,capDiscardedXp:quantity*1000-applied,receipt});
 }
 claims.push({window,hour,route:blossom.route,tier:top.tier,enemyLevel:top.level,enemyInputs,rewardBooks:180,participantDirectXp:settlement.xp,newCharacterParticipantXp:0,newCharacterBenchSharedNominalXp:sharedNominal,newCharacterBenchSharedAppliedXp:sharedApplied,sharedRegionalQuota:true,duplicateSettlementNoop:true,stockBefore:booksBefore,usedBooks:spent,stockAfter:r.itemCount('MAT_CHAR_EXP_HERO'),targetAfter:cp(r.growth(owner)),settlement});
}
assert.equal(r.growth(owner).final,true);assert.deepEqual(cp(r.s.party),partyBefore);assert.deepEqual(cp(A.actors(r,seniorOwners)),seniorBefore);assert.equal(actualBookXp+actualBenchXp,3784770);assert.equal(claims.length,22);assert.equal(claims.length*180-usedBooks,r.itemCount('MAT_CHAR_EXP_HERO'));assert.equal(ascensions.length,6);assert.equal(walletBefore-r.s.global.MORA,93200);
const materialTotals={};for(const q of ascensions)for(const[id,n]of Object.entries(q.cost.items))materialTotals[id]=(materialTotals[id]||0)+n;assert.equal(materialTotals.GROWTH_GEM_ELECTRO,140718);
const data={schema:1,provenance:{...env.provenance,runnerSHA256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')},scope:'Conditional22-window reward-supply ledger for an already-unlocked Lv60 account feeding one newly owned Lv1 four-star on the bench. Actual combat was NOT played: live legal Lv60 blossom entries are followed by an explicitly injected zero-enemy-HP victory settlement fixture. Native USE_ITEM, CHAR_ASCEND, native exact current material/Mora payment, cap limits, shared once-kind-per-hour claim, reward and duplicate-settlement behavior are executed. No production code overrides, no new mixed-party victory assertion, no claim of guaranteed22h/48h farming or new-player unlock time. Ownership/story gates, old-party gear/initial funding, exact ascension materials and excluded blossom travel location are declared synthetic inputs. Only the old60 party participates: the new character receives no participant400XP but DOES receive the existing25% bench sharing100XP per settlement, with native cap discard separately recorded.',owner,name:r.character(owner).name,rarity:4,seniorPartyBefore:seniorBefore,seniorPartyAfter:cp(A.actors(r,seniorOwners)),newCharacterBefore:newBefore,newCharacterAfter:cp(r.growth(owner)),summary:{rewardWindows:claims.length,firstAlignedWindowToLastHours:claims.length-1,upperTierHeroBooksPerWindow:180,booksSupplied:claims.length*180,usedBooks,unusedBooks:r.itemCount('MAT_CHAR_EXP_HERO'),nominalBookXp,actualBookXp,capDiscardedBookXp:nominalBookXp-actualBookXp,nominalBenchXp,actualBenchXp,capDiscardedBenchXp:nominalBenchXp-actualBenchXp,totalActualLevelingXp:actualBookXp+actualBenchXp,nativeUseItemActions:uses.length,nativeAscensionActions:ascensions.length,ascensionMora:walletBefore-r.s.global.MORA,bookUseMora:0,materialTotals,measuredCombatBattles:0,measuredCombatSeconds:null,measuredProcurementSeconds:null,calendarGuarantee:false},ascensions,uses,claims};
fs.writeFileSync(path.join(__dirname,'senior_account_new_character_projection.json'),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({ok:true,...data.summary}));
