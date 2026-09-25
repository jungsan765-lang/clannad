# Common story runtime

Load order: `runtime.js`, `runtime_extensions.js`, `runtime_story.js`, `runtime_nodes.js`, `runtime_events.js`, `runtime_combat.js`, `runtime_economy.js`. The relationship adapter can install after these scripts. All modules modify the existing Runtime prototype; source DB arrays are not mutated.

Use `runtime.action(type, params)` for mutations. The existing action receipt, revision validation, rollback and PRNG transaction remain in charge.

| Action | Input | Behavior |
| --- | --- | --- |
| STORY_NEXT | node | Resolve the currently displayed authored row. |
| STORY_CHOICE | node | Resolve one visible choice in the current pending group. One-choice groups still require input. |
| STORY_NAME | name | Validate and commit the existing name-input node. |
| LEGEND_ENTER | quest: legend ID or quest ID | Enter current 56/57 story, preserve exact main cursor, pending choice, map and screen. |
| AFFECTION_ENTER | event | Validate 58 conditions and enter 57 through the same interpreter. |
| STORY_RETURN | none | Return to saved context; a voluntary exit awards no completion. |
| STORY_RESUME | none | Explicitly advance the next authored STORY_PAUSE target. |
| STORY_CHAPTER | node | Start an eligible separate main chapter after the previous chapter's END. |
| MAIN_STORY_ACCEPT | quest | Runtime events adapter's exact 51 offer acceptance, including isekai chapter 2. |
| MENU | screen | Preserve a pending scene; SAVE_LOAD_ONLY prevents menu/economy bypass. |

Read APIs:

- `storyNode()` and `storyChoices()` preserve the old 20-column normalized array API. Both 55 and57 are mapped by header name. Arrays have nonenumerable `table` and `sourceRow` metadata.
- `storyEntries()` returns `{kind,id,title,label,profile,reason,definition}` for the active route's 56/58 definitions. Empty reason means available. Unknown condition support is shown as a preparation reason, never silently treated as a false authored fact.
- `storyChapterEntries()` returns authored META/ORDER_INDEX=1 entry points whose conditions pass and quest is incomplete. Actual snapshot yields traveler chapter 2 after its prologue.
- `storyActiveNodeId()` resolves the active personal/combat context before the main cursor.
- `StoryParser.parseCondition()` and `.parseEffects()` expose typed AST/commands for content validation. No `eval` or generated function execution is used.
- `runtime_events.js` separately supplies `mainStoryEntries()`, `storyEventSupport()` and `storyDisplayText(row)` for author-supplied first/reunion text variants.

State:

- `global.STORY_CURSOR_NODE_ID` is the single main cursor. `CURRENT_STORY_NODE_ID` mirrors it exactly.
- `storyContext={kind,entry,node,table}` holds personal or battle interlude cursors. `storyReturnStack` contains complete return frames. `storyMenuFrame` stores a temporary menu return.
- `global.STORY_NODE_EFFECTS_JSON` stores route-qualified once receipts; old ID-only receipts are honored. Selected choices become the resolving cursor within their transaction, so exact source event validation is correct and failed choices restore the original pending group.
- Legend costs use `storyCostReceipts[quest]`; completion and relational timing use `storyEventReceipts[event]={day,turn,node}`. Relationship adapter receipts remain the general relationship authority.
- `global.STORY_MENU_POLICY=SAVE_LOAD_ONLY` blocks menu and direct economic/party mutations. Event adapter owns when this policy changes.
- Current unverified mature scenes cannot enter. An imported save pointing into one is suspended into SYSTEM before rendering, preserving main return context and completed receipts. `storySuspendedContext` records the interrupted cursor. No adult eligibility is inferred from project age tags.

Combat contract:

- `startBattle(group, 'STORY:'+node)` begins the authored gate.
- Combat settlement calls `storyBattleResolved(victory, normalizedNode)` **after** committing its real result receipt. This applies ON_VICTORY commands and advances once. Defeat preserves the gate for retry.
- `startCombatInterlude(rootNode,scene)` saves a separate context at an action boundary. `RETURN:CURRENT_COMBAT` restores it and calls `resumeCombatInterlude()`.

Verified tests:

```bash
node test_nodes.js
CRPG_TEST_RELATIONSHIPS=1 node test_nodes.js
CRPG_SOURCE=/absolute/build/source CRPG_DB=/absolute/content.json node test_story_isekai.js
```

`test_nodes.js` has 19 passing suites against the latest snapshot: all active 55/57 condition/effect syntax, independent starts, full traveler prologue and FLAG-colon regression, choice/return atomicity, menu restriction, all20 traveler legend routes (cost/reward/join/return), all100 traveler H01–H05 scene routes, general upper bond compatibility, personal save/reload and imported mature-cursor suspension. The personal-route tests set explicit eligible fixtures; they do not claim those states were all earned through main-story combat.

`test_story_isekai.js` follows actual public story actions from new saves through K472 / AA513 / AB582 / B425 authored nodes and choices to each M04 battle gate. No victory receipt is injected by this test. Postcombat story branch tests live with the event adapter and must be described separately as fixture-based tests when they inject a result.

`test_story_combat.js` is a **remaining release gate**, not a passing full-game test: it uses level20 actors, authored joined companions and a supplied food/medicine inventory, then public battle/meal actions. A mixed party hit unsupported topology-dependent elemental reactions. Restricting that fixture to Amber/Kaeya/Diluc reaches an actual defeat at TRV_M02_N371. Neither result has been converted into victory. The combat adapter's own successful boss/cutin tests are separate evidence, not proof of this full playthrough or game balance.

Known scope limits:

- Current maturity policy has no independently verified eligibility map, so authored mature paths remain closed; general friendship and B110/B120 are separate.
- Legacy sixth-heart checks are compatibility-mapped to five hearts, with the explicit current58 `BOND_SCORE_MIN` retained. Some current B110 IDs actually specify120; this interpreter does not rewrite that authored threshold to110.
- New source content needs a new fixed pack. STORY_PAUSE resumes only an existing authored next target and never writes a missing scene.
- Complete mandatory combat/reaction coverage and balancing are outside this node module and still require the reported combat release gates.
