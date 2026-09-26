# Liyue Isekai rework · v0.13.39

The four parent routes and eight leaves retain original event IDs, evidence, consent choices, deaths, orb facts, endings, real boss receipts, and chapter rewards. Original cursors remain readable. Changes to geographic event metadata are paired with scene destinations and outgoing travel origins.

- 48 route-qualified field entry points; seven episodes per leaf, with 17–18 investigation, puzzle, escort, defense, destruction, or choice stages.
- Bishui supply/track investigation; Minlin crossing, rockfall and signs; Chasm supports and clearing; Guyun signal and relief defense. AA1/AB2 investigations now use the Chasm; AA2 uses Mingyun; AB1 uses Qingce; B1 uses Huaguang; B2 uses Guyun.
- 615 single-response acknowledgements become prose. 791 consecutive scenes are condensed, removing 1,367 mandatory next clicks. Full transcripts remain available in scene disclosures. Effect, condition, meaningful choice, consent, and arrival boundaries are retained.
- Structure HP is real durability. Escort/defense objects receive real enemy attacks; guarding reduces objective damage. Completion requires three full rounds and all enemies defeated. Loss leaves the objective retryable. No field XP or loot farming.
- Field combat uses the post-Dvalin party as its baseline and never scales enemies down when companions are removed. Native level-6/8 solo fixtures lost all 18 trials; two four-person compositions passed 36 trials. The Amber/Kaeya/Barbara composition typically took 6–7 rounds and finished defense at 22% integrity. These are synthetic, ungeared, deterministic trials, not an exhaustive difficulty study.
- Crisis mechanics respect immobility: AA2 uses eye signals, AB1 reconstructs evidence while confined, and other leaves work with their actual rubble/boat/rope constraints. Travel is restricted while those short crisis objectives are active.
- New Isekai Venti legend and H01–H05 use the normal relationship, daily activity, completion, and save systems. Zhongli's introduction is connected to Wangsheng Funeral Parlor in both routes. Oculus recruitment remains unchanged.
- All companion ATK/DEF gain 1% per heart, capped at 5%. No base-stat mutation, HP gain, or heal-on-load. All playable companion definitions were checked.
- Inazuma's Korean location spelling is 이도; internal IDs remain stable.

## Validation

- Eight Isekai leaves and both Traveler Golden House variants completed through actual public story/movement/combat actions, including opening/mid-battle/settlement reloads. Flow fixtures deliberately use boosted stats; difficulty is checked separately.
- B2's escape objective was moved to the common post-evidence node so both local responses encounter it; the updated B2 route completed again.
- `test_liyue_rework_mechanics.cjs`: puzzles, wrong actions, exact-action replay, save identity, durability, post-Dvalin combat, Venti progression, and Zhongli contact/catalog.
- `test_liyue_rework_balance.cjs`: 54 native-stat battle trials, including level-6/8 solo and two four-person compositions.
- Zhongli H01–H05 in both routes: 20 choice paths, all passed with native affection actions and save/reload.
- Existing v0.13.35–38 regressions passed: quest pinning, facilities after first Harbor arrival, return navigation, equipment/shop constraints, and detailed-area UI.
- Reproducible static build includes the new runtime, content, and UI modules; v0.13.38 compatibility identifiers are explicitly retained.

The new scenes and travel durations are CRPG-authored fiction, not claims about official Genshin quests. No temporary companions are granted by field scenes.
