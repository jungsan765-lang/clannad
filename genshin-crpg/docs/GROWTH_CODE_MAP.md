# 0.15.22 implemented code map

Current authoritative rules: `runtime_growth_v01522.js` (levels, ascension, talents, domains, XP/books, receipts), `runtime_growth_data_v01522.js` (fixed regional/boss levels), `runtime_roster_v01522.js` (ownership/migration/rewards), `runtime_tutorial_v01522.js` (movement first, real action completion), `runtime_battle_capacity_v01522.js` (8+3+3 and reserves), `runtime_life_v01522.js` (input replay), `runtime_status_v01522.js` (status events/Bennett/native aura).

UI: `app_growth_v01522.js`, `app_tutorial.js`, `app_life_v01522.js`, `app_battle_layout_v01522.js`, `growth_v01522.css`; map placement is in `app_shell.js`. New actions are allowlisted in `server/game-core.mjs`. Load order is in `source/index.html`; packaging list is in `tools/build.py`. New regressions are `tests/test_growth{,_online,_balance}_v01522.*`; browser inputs/layout: `tools/check_ui_v01522.cjs`.

The following survey is historical. Its “not implemented / cap20” statements describe 0.15.21, not the new runtime. Current numbers, gates and deferred features: `GROWTH_BALANCE_V01522_KO.md`.

---

# Growth, recruitment and affection — code map (survey of 2026-10-06, at 0.15.20/0.15.21)

Implementer notes for the overhaul designed in `docs/DESIGN_GROWTH_KO.md` (the decisions live there; this file only says
where the code is). Line numbers drift; search for the names when they no longer match.

## Levels and the cap of 20

- No character ascension exists yet. "돌파" today is equipment +10 → +12 (`runtime_enhancement.js:9-16`, `EQUIP_ASCEND` `:77-136`).
- The cap 20 is hard-coded in about 25 places. `26_LEVEL_RULES` rows 1–20: [2] XP to next, [3] proficiency, [4] HP multiplier 1 → 1.76,
  [5] ATK/DEF multiplier 1 → 1.475, [6] SPD 0 → 8. Lv20's XP-to-next is 0; total XP 1 → 20 is 138,600. `00_CORE` `CORE_013 LEVEL_MAX=20` is unused.
- `runtime.js:35` new game (`PLAYER_LEVEL_STATE` 1, `XP_NEXT` 300); `:37` `s.chars[id]={level:1,xp:0}`; `:77` `recalculate` (player);
  `:88` `character()` (companions); `:89` player ATK ×1.2; `:96` `addXp` loops while level < 20.
- Proficiency `2+floor((lv-1)/4)`: `runtime_extensions.js:8`, `runtime_party.js:65-73` (hit reaches its cap of 95 at Lv33).
- 5★ +10% base: `runtime_rarity_v01412.js:17` (`FIVE_BONUS` 1.1, columns 7/8/9), installed `:29-36`, not for `PLAYER_CUSTOM`.
  Rarity: `runtime_constellations_v01411.js:15-62` `NAMES[id][1]`; `premiumRarity` `runtime_premium_v0148.js:54`.
- `growth()` `runtime_flow.js:97-102` (`level>=20`); `addXp` wrapper `:103-111` (full heal on level-up `:107`).
- Admin level op: `runtime_operator.js:10`, `runtime_admin_v01412.js:71-74` (1–20; bug: writes `g.PLAYER_XP` instead of `PLAYER_XP_STATE`);
  UI `admin.js:218,225`; `app_online.js:220`.
- Other 20s: `runtime_flow.js:142-144` (`GROWTH_SAVE`); `runtime_story.js:22`; `runtime_combat.js:188` (guest snapshot);
  `runtime_coop_v0153.js:66,85`; `runtime_mond_balance.js:66`; `runtime_mond_boss_balance.js:47`; `runtime_protagonist.js:63`;
  `runtime_abyss.js:72-80,158-159,221`; texts `runtime_rules.js:102`, `app_revision.js:12`, `app_abyss.js:36`, `app_handbook.js:102`,
  `app_tutorial.js:59`; ley line tiers 6–20 `runtime_ley_lines.js:18-24`; field bosses `runtime_field_bosses.js:83`;
  Azhdaha 20 `runtime_balance_v0152.js:24`; recruit `min(19)` `runtime_rarity_v01412.js:18,44`.
- Enemy level follows the party: `runtime_combat.js:43-52,70`; `runtime_extensions.js:49`; elites `runtime_enemy_tiers.js:113`.
- Raising the cap needs: `26_LEVEL_RULES` to 60, one central `LEVEL_MAX`, every 20 above replaced, a saved ascension phase per
  character (validate level ≤ phase cap, XP 0 at the cap); existing Lv11–20 → phase 1, Lv10 → phase 0; battle/co-op/guest snapshots.
  Test fixtures use the admin level op (cap 20, `tests/helpers_abyss.cjs:3`); progress is reset at release, but fixtures and
  `source/qa_saves.json` must be regenerated.

## Experience, talents, constellations

- Battle XP `(30+15·lv)×{1,3,6,12}` `runtime.js:97` / `runtime_combat.js:186`; ×0.4 outside Mond `:187`; Mond ×0.45 grades 1/2/4
  `runtime_mond_balance.js:39`; only fighters get XP `:188`; quest XP to the active party `runtime.js:85`; books 50/250/1000
  `runtime_extensions.js:42` (party only `runtime_party.js:133-137`; cap loop `runtime_local_revision.js:49-57`).
  `unlockCharacter` `runtime_story.js:8` joins at Lv1.
- Talents: `runtime_premium_v0148.js:23` `{MAX:10,CAP:13,CURVE}`; kinds `runtime_admin_v01412.js:10`; `talentLevels` `:56-61`
  (C3/C5 +3); multiplier `:64`; damage `:140-154`; heals in E/Q `runtime_constellations_v01411.js:534`; save 1–10 `:132`;
  co-op ≤13 `runtime_coop_v0153.js:88`; UI `app_premium_v0148.js:93`. There is no player action or cost to level talents (admin only).
- Constellations `s.constellations` 0–6; `CONSTELLATION_UNLOCK` `:112-114` uses `STELLA_<id>`. Stella from wish duplicates
  `runtime_wish_v01411.js:74-80` or the Starglitter shop (40 for 5★/protagonist, 25 for 4★) `runtime_premium_v0148.js:32,55`;
  4 identical field-boss materials → 1 Starglitter, 5 a week `:33`. Wishes give only Stella/Starglitter, never the character.

## Materials and Mora

- Specialties in `14_ITEM_DB` (지역 특산물): Mond `ING_CALLA_LILY`, `ING_LAMP_GRASS`; Liyue `ING_HORSETAIL`, `MAT_LIYUE_QINGXIN`,
  `MAT_LIYUE_VIOLETGRASS`; `runtime_liyue_forge.js:14-40` adds Cor Lapis, Noctilucous Jade, Glaze Lily, Silk Flower, Starconch,
  Jueyun Chili. Missing Mond originals: Cecilia, Windwheel Aster, Dandelion Seed, Philanemo Mushroom, Valberry, Wolfhook.
- Life jobs `runtime_life.js:6` GATHER/MINE/FISH/HUNT limits 4/6/4/4; pools `32_MAP_DB` columns 25–28 (`:22-23`, `:54-60`);
  Mond mining is fixed to iron / white iron / crystal.
- Field-boss materials: 9 `MAT_FB_*` `runtime_field_bosses.js:20-30`; a win gives 2–3 + 20% `TRPG_BOSS_ESSENCE` `:115`; first win +1
  `:355`; 3 wins per 12 h `runtime_field_boss_limits.js:12`; untradeable `runtime_trade.js:30`. Used by exclusive weapons
  `runtime_exclusive_weapons.js:104-105`, recruitment, Starglitter.
- Mora income: Mond `(8+5·lv)×grade×risk` `runtime_mond_balance.js:12,40`; Dvalin 600, Andrius 900 `:13`; Liyue `(4+2·lv)`
  `runtime_combat.js:160-170`; field boss / rematch `250+60·lv` `runtime_field_bosses.js:150`, `runtime_boss_rematch.js:20`;
  ley lines `600+100·tier lv` `runtime_ley_lines.js:24,136`; commissions fixed 60–800 `runtime_exploration.js:15-41`, 80–880
  `runtime_field_scenes.js:19-453`, 240 `runtime_local_revision.js:38`; events 100–450 `runtime_events_v0152.js:31-65`; chests
  1200/2500 Mond, 2000/4000 Liyue `runtime_chests_v01415.js:19,30`; Abyss 800–6000 `runtime_abyss.js:36-80`; raid 3000/5000
  `runtime_raid_v0152.js:26-27`; Stardust shop 2000 `runtime_premium_v0148.js:40`; mutations +30%.
- Mora spending: shops `runtime.js:70`; crafting `runtime_extensions.js:44`; enhancement 6,970 (+1..+10) / 6,800 (+11/+12)
  `runtime_enhancement.js:14-16`; Liyue artifacts 400–3500 `runtime_liyue_artifacts.js:19`; forge 380–620 `runtime_liyue_forge.js:46-66`;
  recruitment `runtime_recruitment.js:21-29`; defeat 10% `runtime_play_fixes.js:8,34`; market fee 5% `server/social-v01415.mjs:15`.
  Level-ups, talents and constellations cost nothing. No commission/quest/event/chest reward scales with level.

## Healing (for the cooldown retune)

- Cooldowns: `08_SKILL_CARD_DB` column 9 (`runtime_combat.js:14`), overridden by `RHYTHM` `runtime_skill_rhythm.js:15-23` (own turns);
  `POWER` E ×1/1.3/1.6, Q ×1/1.25/1.5 (`:24,58`); burst awakening ×1.3 (`:25,45`); set `runtime_combat.js:131`,
  `runtime_liyue_cards.js:79`; tick `:157`.
- Mond: Barbara [E4/Q5] Q heals 25% of her max HP to all (`runtime_combat.js:102`) ×1.5, E melody 6% per hit (`:101,89`);
  Jean [2/5] Q ATK×1.2 + field 0.35/round (`:123,147`); Mika [3/5] Q 12% + 4%/round (`:113,89`); Diona [2/5] field 8%/round (`:147`);
  Noelle [4/4] 50% chance to heal DEF×0.25 while shielded (`:89`); Bennett has no heal (`:118`).
- Liyue: Baizhu E 8% (`runtime_liyue_cards.js:31`), shield break 6% (`:139`); Qiqi summon ATK×0.55 (`:173`), talisman 0.45 (`:146`);
  Xingqiu 6% (`:136`); Xianyun Q 0.8 + 0.25/round (`:52,147`); Yaoyao Q 10% (`:69`), summon 5% (`:179`); Gaming 12% self (`:42`);
  Hu Tao 6% per hit (`:48`).
- Constellation heals `runtime_constellations_v01411.js:86,88,108,115,122,171,183,195,222,268,273,296` (wrapper `:528-541`);
  `HEAL_OUT` 10–25 `runtime_exclusive_weapons.js:19-57,128`; `HEAL_BOOST` `runtime_gear_traits.js:30,80,84,209` and
  `runtime_exclusive_weapons.js:70`; formation `supportOut` 1.12/1.2 `runtime_formations.js:11,19,53`; items 20/15/25% `runtime_combat.js:133`.
- Gate tests that move with heals: `test_balance_v0141` (field bosses with Barbara/Diona/Noelle; Healer Brooch on all),
  `test_balance_v0152` (average HP, 5★ vs 4★ ≥15), `test_osial_v01341`, `test_v0144:73-75` (rhythm pins Barbara 4/5, power 1.6/1.5),
  `test_v01411:89-90` (Barbara C1 cooldown), `tools/test_exclusive_weapons:34` (`HEAL_OUT` 25 → 125). Not gated:
  `test_liyue_rework_balance`, `tools/test_gear_traits:73`, `test_extra_cards:7`, `test_balance_v07/v09`.

## Saves

- About 60 chained `validateSave` overrides (`runtime.js:29,42`); lazy migrations; `save_adapter.js` schema 2 (`:14`),
  migrate → validate `:57`, content check `:58`, backup `:72`; server `compatibility.json` + `game-core.mjs:20-24`.
- Gate list `tools/verify_release.py:10-52` (about 100 entries); it runs `build_server.py` first, 2 workers, logs in `evidence/release/`.

## Recruitment, wishes, affection (for "characters only from wishes")

- Joining: `unlockCharacter` `runtime_story.js:8` → `COMPANION_ELIGIBILITY_JSON[id]={state:'JOINED',event}`; `relations[profile].companion`;
  starter weapon hook `runtime_starter_kit_v0153.js:51-59`.
- `storySetCompanion` `runtime_nodes.js:226` (effects `:55-57`, applied `:207-210`): `UNLOCK_CARD` → AVAILABLE, `COMPANION_ELIGIBLE` → ELIGIBLE,
  `JOIN_ACCEPTED` / `UNLOCK_CARD_ONCE` → JOINED (+flag). `markContact` hook `runtime_quality_fixes.js:193-200`.
- Only JOINED is usable: `setParty` `runtime.js:87`, `startBattle` `runtime_journey.js:46-48`, `ownedActors` `runtime_party.js:12`,
  `premiumOwns` `runtime_premium_v0148.js:66`, `companionJoined` `runtime_exclusive_weapons.js:116`. ELIGIBLE (deferred; migrated
  TEMPORARY `runtime_journey.js:99`), AVAILABLE (traveller card joins), DEPARTED (`runtime_events.js:61`).
- Personal missions: `56_MOND_LEGEND_DB` 86 definitions (43 per route); the end choice N025 `JOIN_ACCEPTED` → END_JOIN
  (`COMPLETE_LEGEND`, `UNLOCK_CARD_ONCE`) or N026 `COMPANION_ELIGIBLE` → END_DEFER; 82 `*_REJOIN_START`; `RECRUIT_REJOIN` is free
  (`runtime_recruitment.js:175-187`, applied `:196`).
- `runtime_recruitment.js`: `storyIndex` `:61-104` (Liyue stages `:7-12`; `START_CONDITION` `:65-66`; costs `:18-30`; contact places
  `:31-60`; Isekai Diluc `:72-94`, cost waiver `legendEffectiveCost` `:105-110`; traveller Diluc join stripped `:100-102`);
  `legendRequirements` `:123-139`; `recruitmentEntries` `:157-168`.
- `runtime_rarity_v01412.js:38-59`: Liyue 4★ Lv.10/12/14/16 + 2 boss materials; Liyue 5★ stage ≥2, Lv.16/18/19, Geoculi 8/10/12,
  Mora ×1.5, 4 boss materials; Mond 5★ Mond story, Lv.10, 6 Anemoculi, +1000 Mora, 2 boss materials. `legendUnderWay` `:61`;
  oculus reason `:95-101`. Liyue gates `runtime_liyue.js:134,142-143`; `runtime_liyue_places.js:124-126`.
- 자백 is event-only (`:48-51`, `:67-68`, `:164`, `:192`) and not in the wish rotation (`runtime_wish_v01411.js:19-20`).
- Archons: Venti joins at the last Anemoculus `runtime_exploration.js:144` (save check `:180`); Zhongli at the last Geoculus
  `runtime_geo_oculi.js:53` (check `:62`).
- Story joins: `TRV_M02_JOIN_{AMBER,KAEYA,LISA}_ACCEPT` → `_02` (`UNLOCK_CARD` + `FLAG_TRV_CARD_*`); `ISK_M01_T_JOIN` →
  `EVT_ISK_RECRUIT_AMBER` (`runtime_story.js:14`; guard `:15` `FLAG_ISK_RECRUIT_AMBER`); `ISK_M03_AB_202` (Diluc), `ISK_M04_K_077` (Jean)
  through `storyEvent` recruit `runtime_events.js:62`.
- Admin recruit `runtime_admin_v01412.js:79-82` → `unlockCharacter`; the ALL list `adminCompanions` `:17` = `recruitmentEntries()`.
- Wishes `runtime_wish_v01411.js`: pools `:18-24` (5 standard 5★, 13 rotating limited 5★ including Venti/Zhongli, 24 4★ companions,
  13 4★ weapons, 10 3★ weapons); rates `:25-26`; `wishRoll` `:47-73` (0.6%, soft pity 74 +6%, hard 90; 4★ 5.1%, ≤10; 50/50 +
  guarantee; 4★ half featured; every 10-pull has ≥1 companion `:67-71`); `wishFeatured` `:31` weekly; `wishState` `:32`
  (`s.wish{EVENT,STANDARD,history≤60,seq}`); save check `:102-110`; `wishGrant` `:74-80` = `STELLA_<id>` + Starglitter (4★ 2, 5★ 10;
  5/25 when C + held ≥ 6) — never joins; weapons `:81-84`.
- Constellations `runtime_premium_v0148.js`: `constellationReason` `:80-86` needs JOINED; Stella items `:156-164`; offers `:29-41`.
- Affection: `s.relations[PROFILE]` `BOND_SCORE` 0–120, hearts `floor(/20)` max 5, events, `eventCompletedAt`, unlocked, firstContact,
  companion (`runtime_relationships.js:40-69`, migrate `:81`). `changeBond` `:90-94`; +10 at `storyCompleteLegend`
  `runtime_nodes.js:229-238`; +1 per win for each party companion whose mission is done (`runtime_relationships.js:95-117`;
  `runtime_combat.js:71,189`). `ADD_HEART` is ignored (`:214-215`); `completeAffection` `:120-129`.
- `58_MOND_AFFECTION_DB` 458 rows: H01–H05 need 20/40/60/80/100 (H03/H05 `AFTER_PRIOR_DAILY` `runtime_nodes.js:148-151`); 26 upper scenes
  (B110/B120 ×8, H110/H120 ×5) + 2 adult FIRST at 120; all require `Q_LEG_*` and `FLAG_LEG_*_CLEAR`. `AFFECTION_ENTER`
  `storyEntryReason` `runtime_nodes.js:239-258`; Liyue scenes need the Liyue story (`runtime_liyue.js:134`).
- Affection already gives +1% ATK/DEF per heart, max 5% (`runtime_liyue_rework.js` `P.character` `:121`); info keys
  `runtime_nodes.js:216`; achievements `runtime_achievements_v0152.js:51-54,127-128`.
- What depends on personal missions: battle bond, affection gates, LEGEND achievements, the Isekai Venti mission (needs Venti JOINED,
  `runtime_liyue_rework.js:122-128`), exclusive weapon recipes (joined, `runtime_exclusive_weapons.js:120-122`), the tutorial's
  'personal' step. Not: main story conditions, Abyss marks.
- Gate tests to update for wish-only joining: `tests/v013/test_recruitment_cost_consistency.cjs:34-95`; `tests/test_update_v01341.cjs:4-14`;
  `tests/test_v0144.cjs:99-109`; `tests/test_v01411.cjs:40,124-126,157,166-171`; `tests/test_v0148.cjs:134-160`;
  `tests/test_content_boundaries_v01513.cjs:100-111`; `tests/test_quality_fixes_v01338.cjs:14-15`; `tests/test_work_validation.cjs:6-15`;
  `tests/test_liyue_rework_mechanics.cjs:13-16,31-35`. Admin recruit is used as setup in `test_v01519:12`, `test_admin_v01412.mjs:94`,
  `test_social_v01415.mjs:40`, `test_server_coop_v0153.mjs:26-30,62-65`, `test_server_load_boundaries_v01513.mjs:54`;
  `unlockCharacter` is setup in many tests — keep it and the JOINED format.
- Saves for wish-only: keep JOINED; ELIGIBLE needs a migration; held Stellas of characters not joined → the first Stella joins?;
  do not delete mission definitions or scene rows (guildLegends check, storyDone receipts `runtime_nodes.js:101-103,318-323`,
  paused storyContext); recount bond from `relations.events` / `storyEventReceipts[AFF_*]` in `migrateState`
  (`relationSchemaVersion`); loosen the archon save checks; a wish join should call `markContact` (`syncOwnedRelations`
  `runtime_quality_fixes.js:263-270`); `server/game-core.mjs:17` allowed actions; `tools/build_server.py:19`.
- UI touched by wish-only joining: `app_recruitment.js:5-39`; `app_adventure.js:134-199`; `app_experience.js` relationsScreen `:198-223`,
  missions `:171-188`; `journal_presenter.js:4,32,45-66`; `app_handbook.js:112-128`; `app_wish_v01411.js:107,114,133,210,225-229`;
  `app_premium_v0148.js:37,116-118`; `app_tutorial.js:5-6,25,60,65`; `app_party.js:90,109-112`; `app_liyue_rework.js:36`;
  `app_motion.js:70`; `app_life.js:57-70`; `app_liyue_places.js:19-35`; `app_places_v01411.js:50`; `app_shell.js:491`;
  `app_quality_fixes.js:244-289`; manuscripts `personal_k/trv_mond_amber.md:73-77`, `isk_mond_amber.md:100-108`,
  `WRITING_GUIDE.md:37` (the join choice at the end of a mission).
