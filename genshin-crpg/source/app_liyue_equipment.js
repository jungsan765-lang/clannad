/* v0.13.31: unique visual mappings for Liyue CRPG-only entry armor/accessories.
 * Reuses already shipped original-game textures; no new unverified image downloads.
 */
(function(root){'use strict';
const m=root.CRPG_MANIFEST;if(!m?.itemIcons)return;
m.itemIcons.icons=m.itemIcons.icons||{};
const add=(id,name,path)=>{m.itemIcons.icons[id]={id,name,path,matchType:'crpg_visual_mapping',provenance:'already_shipped_original_game_texture',label:name};};
add('EQ_LIYUE_ARMOR_HARBOR_PATROL','항구 순찰 외투','assets/icons/UI_RelicIcon_14001_3.webp');
add('EQ_LIYUE_ARMOR_STONEGATE','석문 경갑','assets/icons/UI_RelicIcon_15016_3.webp');
add('EQ_LIYUE_ARMOR_QINGCE_PADDED','경책 누비옷','assets/icons/UI_RelicIcon_15037_3.webp');
add('EQ_LIYUE_ARMOR_CLIFFRUNNER','절벽길 경장','assets/icons/UI_RelicIcon_14003_3.webp');
add('EQ_LIYUE_ACC_AMBER_CHARM','호박빛 부적','assets/icons/UI_RelicIcon_10011_4.webp');
add('EQ_LIYUE_ACC_STONE_BEAD','석문 수호구슬','assets/icons/UI_RelicIcon_10003_2.webp');
add('EQ_LIYUE_ACC_COURIER_KNOT','운송상의 매듭','assets/icons/UI_RelicIcon_15002_2.webp');
add('EQ_LIYUE_ACC_TIANHENG_SIGHT','천형 조준침','assets/icons/UI_RelicIcon_10007_4.webp');
})(globalThis);
