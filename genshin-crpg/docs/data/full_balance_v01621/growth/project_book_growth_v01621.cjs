'use strict';
// Conditional supply projection. Blossom victories are NOT simulated here.
// Only native book consumption/ascension and current level-selected quotes run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),A=require('./audit_growth_v01621.cjs'),G=A.env.G,api=A.env.c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x)),rows=[];
for(const mode of ['ONE_OWNER_FOCUS','FOUR_OWNERS_BALANCED']){
 const {r,owners}=A.setup({level:5,team:'story4',seed:717});r.s.inventory=[];const target=mode==='ONE_OWNER_FOCUS'?[owners[0]]:owners,claims=[],ascensions=[];let usedBooks=0;
 function ascend(owner){const g=r.growth(owner);if(!g.max||g.final)return;const q=cp(r.ascensionInfo(owner).cost);for(const[id,n]of Object.entries(q.items))r.giveItem(id,n);r.s.global.MORA+=q.mora;r.action('CHAR_ASCEND',{owner});ascensions.push({owner,level:g.level,cost:q});}
 for(let hour=0;hour<250&&!target.every(id=>r.growth(id).final);hour++){
  for(const id of target)ascend(id);
  const before=target.map(id=>cp(r.growth(id))),tier=api.leyLines.tiers.filter(t=>t.minLevel<=r.growth().level).at(-1),stockBefore=r.itemCount('MAT_CHAR_EXP_HERO');assert(tier);
  // Conditional on winning this currently available Revelation tier, exactly
  // its shared books and per-participant low direct XP become available.
  r.giveItem('MAT_CHAR_EXP_HERO',tier.books.MAT_CHAR_EXP_HERO);for(const id of owners)r.addXp(id,tier.directXp);for(const id of target)ascend(id);
  const portions=mode==='ONE_OWNER_FOCUS'?[r.itemCount('MAT_CHAR_EXP_HERO')]:target.map((id,i)=>Math.floor(r.itemCount('MAT_CHAR_EXP_HERO')/target.length)+(i<r.itemCount('MAT_CHAR_EXP_HERO')%target.length?1:0));let used=0;
  for(let i=0;i<target.length;i++){let budget=portions[i],owner=target[i];while(budget>0&&!r.growth(owner).final){ascend(owner);const quantity=Math.min(budget,r.experienceBookLimit('MAT_CHAR_EXP_HERO',owner));if(!quantity)break;const wallet=r.s.global.MORA;r.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',owner,quantity});assert.equal(r.s.global.MORA,wallet,'no book Mora fee');used+=quantity;usedBooks+=quantity;budget-=quantity;}}
  claims.push({hourWindow:hour,tier:tier.tier,enemyLevel:tier.level,sharedBooks:tier.books.MAT_CHAR_EXP_HERO,directXpPerParticipant:tier.directXp,stockBefore,usedBooks:used,stockAfter:r.itemCount('MAT_CHAR_EXP_HERO'),before,after:target.map(id=>cp(r.growth(id)))});
 }
 assert(target.every(id=>r.growth(id).final));rows.push({mode,claims:claims.length,firstClaimAtAlignedHourToLastClaimHours:claims.length-1,usedBooks,unusedBooks:r.itemCount('MAT_CHAR_EXP_HERO'),final:target.map(id=>cp(r.growth(id))),ascensions,claimTrace:claims});
}
fs.writeFileSync(path.join(__dirname,'book_growth_projection.json'),JSON.stringify({schema:1,provenance:A.env.provenance,scope:'Conditional reward supply, never a claim that any blossom fight was won. Levels5 start; Lv1→5 needs860XP/owner from play. Ownership/story gates and exact ascension ingredients/funding are synthetic. Native public book and ascension actions, cap waste, shared inventory, region-shared once-kind-per-hour supply and current level-selected tiers. Balanced four-owner books allocate each current stock equally; one-owner focus leaves companion directXP separate. Human playtime, travel, active fight duration, failed claims and actual server timing are excluded. Claims count hourly windows; aligned-hour interval is not a cooldown measured from each purchase.',rows},null,2)+'\n');console.log(JSON.stringify(rows.map(({mode,claims,firstClaimAtAlignedHourToLastClaimHours,usedBooks,unusedBooks})=>({mode,claims,firstClaimAtAlignedHourToLastClaimHours,usedBooks,unusedBooks}))));
