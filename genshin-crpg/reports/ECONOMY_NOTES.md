# Economy adapter integration

Load `runtime_economy.js` after the base runtime, extensions, story/common wrappers and `runtime_combat.js`. It extends the existing global `CRPGRuntime` and preserves prior `apply`, story, battle settlement, movement and save-validation wrappers. It does not mutate source tables.

## Public actions

| Action | Input | Behavior |
| --- | --- | --- |
| `USE_ITEM` | `item`, optional `owner`, `quantity: 1` | Ordinary healing food or supported next-battle buff food; combat medicines forward to `combatAction('ITEM:'+id, owner)` during combat; XP items retain the existing handler. |
| `MEAL_BATCH` | `meals: [{item, owner}]` | Up to four distinct active members, one serving each, one shared 10-minute meal. |
| `PARTY_REMOVE` | `slot: 2..4` | Empty a companion slot, preserve permanent HP, ownership, equipment and relationships. |
| `PARTY_REPLACE` | `slot`, `char` | Explicit remove-and-add in the same action transaction. Invalid ownership or duplicate additions restore the original slot. |
| `PARTY_TACTIC` | `slot`, `tactic` | Five implemented DB tactic names; player and mid-battle changes rejected. |
| `TOOL_PREPARE` | `items`, optional `element` | Owned distinct tactical tools; two slots, or three with an active member's equipped field pack. Stores `s.preparedTools` plus existing persistent preparation globals. |
| `CRAFT` | `recipe`, optional `quantity` | Validated facility/place/recipe conditions and child ingredient rows; atomically scales output, cost and time. No automatic eating or equipping. |
| `BOSS_CONTINUE` | none | Resume the saved explicit next route step or retry step at the route entrance. |
| `BOSS_LEAVE` | none | Explicitly end route progress outside combat. |

## Food and persistent data

- Ordinary recovery amount is the numeric `14_ITEM_DB` recovery column. HP is capped; ordinary food cannot revive a knocked-out member. Ten-minute duration, one serving per person and consecutive-same-healing-food rejection follow CE_091/095. Pure buff food does not overwrite the healing-food lock. Inn/time/camping do not clear the lock.
- Player meal history uses `global.LAST_RECOVERY_MEAL_ITEM_ID`; companions use `chars[id].lastRecoveryMeal`.
- Player persistent conditions use `s.playerStatuses`; companions use `chars[id].statuses`. Food handles `STATUS_BOND_OF_LIFE` with a finite nonnegative `value` before HP healing, and fails closed for unresolved other persistent healing restrictions.
- Next-battle buffs use `s.pendingCombatEffects[owner] = [{id, sourceItem}]`. Only `STATUS_FOOD_ATK`, `STATUS_FOOD_FEAST`, `STATUS_FOOD_RESIST`, `STATUS_FOOD_SPEED` are queued. Identical IDs refresh rather than stack. The combat module must consume only battle participants' entries and apply DB-defined stat values.
- Save validation checks companion AI control, distinct active owners, pending food payload shape and preparation-array uniqueness. Existing save wrappers retain their own checks.

## Exact source-row compatibility adapter

Six source rows have an extra blank at column P. `recipeDefinition` removes that blank from a local copy only when the exact known shifted shape matches (`r15` blank, numeric cost at `r16`, duration at `r20`, success 100 at `r21`):

`REC_PROCESS_BUTTER`, `REC_PROCESS_CHEESE`, `REC_PROCESS_HAM`, `REC_PROCESS_SAUSAGE`, `REC_ALCH_HEALING_POTION`, `REC_MEDICAL_BANDAGE`.

The adapter preserves all numeric values and source data. Corrected rows already in the standard shape pass through unchanged. Recipe facilities honor explicitly named merchants, plus-separated simultaneous requirements, alternative facilities and specific map names. Missing/unstructured requirements remain unavailable.

## Explicit limitations

- Scene-only warming/cooling/exploration food, revival food, and food with no standardized `STATUS_ID` are rejected before consumption. In the current DB this includes the 5% attack sashimi and 8% defense soup, despite their descriptive numeric effects; no synthetic status definition is invented.
- Camp setup, free-world healer actions, antidote effects, ordinary non-XP nonfood items and direct use of tactical converters are not implemented here. Combat-tool execution belongs to the combat module.
- `사용자지정` tactic is not selectable: the DB names it, but no user-rule instruction schema exists.
- Unknown recipe requirements, experiments below 100% success, missing ingredients and malformed recipes fail closed. No new facilities, equipment effects, drop rates or numeric balancing are invented.
- Boss continuation is limited by the combat module's supported encounter/card capabilities. Route steps are checked for contiguous IDs and a single terminal boss. No automatic recovery is granted between stages even when the route permits recovery; the user must use an available legitimate recovery action. Routes that prohibit recovery reject meals/inn services while awaiting the next stage, and movement requires explicit route departure.
- Revalidation of prepared tool capacity at battle entry belongs to the combat module, because a field-pack wearer may leave after preparation.

## Validation

`ECONOMY_NO_COMBAT=1 node tests/test_economy.cjs` passes 10 tests against `content/db.json`: serving/time/HP, per-owner food locks and save load, rejection atomicity, life-bond absorption, status refresh, party removal/replacement and tactics, preparation ownership/capacity, six exact column adapters with source immutability, crafting quantities and time, and facility/place failures.

`node tests/test_economy.cjs` passes all 11 tests with the completed combat module, including real battle settlement, saved next-stage recovery restriction, load, and continuation to the next encounter.

## Additional Mond card module

Load `runtime_mond_cards.js` after `runtime_combat.js`; it can precede `runtime_economy.js`. The module implements exactly matching current execution scripts for Eula E/Q, Rosaria Q, and Rosaria's night passive. A changed script fails closed instead of silently retaining old numbers. Rosaria E remains unsupported because the source requires rear movement and large-target topology that is not defined in the present battlefield.

Eula's basic/E/Q positive direct damage adds at most three sword stacks per round and six total; misses, reactions, fields, followups and the sword explosion do not add stacks. Q creates its sword after its opening damage as the source script specifies. Per CE_049, a two-round sword lasts the remainder of its creation round plus two complete rounds, and expires at the third END boundary including creation. Owner death detonates immediately and `detonateEulaSword(owner, reason)` supports explicit departure. Missing-owner detection also runs before automatic combat progression. Detonation marks the sword finished before damage to prevent recursion. Grimheart's stagger-resistance property is retained as a marker; no numerical resistance is invented.

Rosaria's Q field and critical-rate sharing use the same CE_049 convention: creation END does not reduce duration, then two full rounds elapse. An END-triggered field therefore ticks at creation END and the next two ENDs. Night activation uses the stored world clock at battle entry, includes 20:00 and excludes 06:00, boosts only the first positive damage, and expires at the next 06:00 even when a battle is loaded from a save. Night/vulnerability damage modifiers use the shared `combatDamageMultiplier` hook before the base engine's final rounding; `applyDamage` only accounts for successful damage, stacks, and owner death.

`node tests/test_mond_cards.cjs` passes 8 tests against `content/db.json`: script compatibility/support boundaries, Eula coefficients/stacks/AI hold/DEF/vulnerability, sword per-round/total caps and CE_049 lifetime, excluded damage sources and misses, owner death/leave single explosion, Rosaria Q initial/tick/share arithmetic, night interval/one-use/dawn/save persistence, and pre-rounding numerical modifier placement.
