/* Item and equipment tiers on screen (0.14.4): 일반 white, 상급 green, 희귀 blue, 영웅 purple, 전설 gold.
   Tiers come from the item/equipment tables (and an artifact's own quality), never from display names. */
function itemTierRank(id,inv){
 const P=window.CRPGInventoryPresenter;if(!P||!game)return 1;
 const eq=game.tables['16_EQUIP_DB']?.get(id);
 if(eq)return P.tierRank(true,String(eq[13]||''),eq[27],inv?.artifact?inv.artifact.quality:null);
 const it=game.tables['14_ITEM_DB']?.get(id);return it?P.tierRank(false,String(it[3]||''),null,null):1;
}
// 0.14.8: a reward weapon that only the forge makes (4★ and up) arrives as its 단조 도면.
function rewardEquipLabel(id){const name=safeName('16_EQUIP_DB',id);return game?.weaponBlueprintId?.(id)?name+' 단조 도면':name;}
// x is a presenter detail (with .tier) or an item/equipment id.
function tierMark(node,x,inv){
 const rank=x&&typeof x==='object'?(x.tier?.rank||1):itemTierRank(x,inv);
 node.classList.add('tier-text','tier-'+rank);node.dataset.tier=window.CRPGInventoryPresenter?.TIER_LABELS?.[rank]||'';return node;
}
