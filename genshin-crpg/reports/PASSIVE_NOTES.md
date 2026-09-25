# Noncombat passive candidate

Files: `runtime_passives.js`, `test_passives.cjs`, `passive-test-results.json`.

Load `runtime_passives.js` after `runtime_economy.js`, `runtime_combat.js`, and `runtime_mond_cards.js`. The candidate economy module now exposes two behavior-preserving hooks: `recipeCost(recipeRow, craftCount)` and `consumeMealFoods(entries, needed)`. Its meal invokes `foodSpec(itemId, entry)` so a selected lot reaches the effect resolver. No game checkout or Google Sheets writes were made by this subtask.

## Implemented source effects

- `MOND_BARBARA_PASSIVE_DISH`: an active party owner making a supported numeric healing food generates the recipe's full produced quantity with a `[바바라특제요리] ` display prefix and healing ×1.1. Cooking does not consume the dish or heal anyone. Buff-only food is ordinary. The effect belongs to the produced servings and survives the owner leaving the party.
- `MOND_ALBEDO_PASSIVE_CRAFT`: in a map whose source region is exactly `몬드`, an active party owner reduces one common material type by one per craft, minimum one, for ingredient processing or EQUIP production.
- `MOND_LISA_PASSIVE_BREW`: under the same party/region requirements, an alchemy recipe producing an explicitly classified consumable or combat medicine reduces one common ingredient type by one per craft, minimum one. Ordinary `생활 제작` medical recipes are not relabeled as alchemy.
- `MOND_MONA_PASSIVE_ALCHEMY`: implemented for a source-defined alchemy/material conversion recipe whose output is explicitly a non-quest material. It reduces the highest-count eligible common ingredient, minimum one. Potions/combat consumables are excluded. **The current real catalog has zero such material-conversion recipes**: its one alchemy recipe is a potion, so no Mona benefit can currently be triggered through the real recipe catalog. This is reported separately from handler implementation.

Discount eligibility comes directly from `14_ITEM_DB`: material `Y`, quest item `N`, grade exactly `일반`, category other than `보스 재료`. Missing/other classifications never qualify. Albedo/Lisa choose the first eligible ingredient in source `INGREDIENT_SEQ`; Mona chooses highest quantity with source sequence as the deterministic tie-break. The first/one-type cases do not invent a strongest-material rule. Recipes with only quantity-one eligible ingredients receive no reduction. A batch applies the one-craft reduction separately to every craft before multiplying costs; the minimum cannot be bypassed by selecting a larger batch.

Every implemented passive checks the current source owner, trigger, exact execution script, PASSIVE kind, and READY state. An active owner's changed script raises `PASSIVE_DEFINITION` before spending. Unclassified alchemy outputs with an active Lisa/Mona raise `PASSIVE_RECIPE_CLASS` rather than guessing a category.

## Serving lots and caller API

Inventory ITEM_ID and aggregate count remain unchanged. The optional schema-2 save extension is:

```json
{"specialFoodLots":{"FOOD_TEA_BREAK_PANCAKE":{"BARBARA_SPECIAL":3}}}
```

Normal quantity is aggregate inventory count minus special quantity. Purchasing/granting more of an existing item adds only normal quantity. Ordinary generic spending drains normal quantity first and then reduces special quantity so phantom lots cannot remain. Empty lot entries are removed. Save validation rejects unknown lot kinds, non-healing items, invalid/nonpositive/noninteger counts, and counts exceeding inventory.

Public display query:

```js
runtime.foodLots(itemId)
// [{item, variant: 'NORMAL'|'BARBARA_SPECIAL', quantity, name, heal}, ...]
```

To expose the prefix and let the player choose the serving type, the inventory/meal UI should render `foodLots(itemId)`, not just the static `14_ITEM_DB` item name. Existing callers work unchanged with default `AUTO`, which consumes normal first.

```js
runtime.action('USE_ITEM', {item: itemId, variant: 'BARBARA_SPECIAL'});
runtime.action('MEAL_BATCH', {meals: [
  {item: itemId, owner: 'PLAYER_CUSTOM', variant: 'NORMAL'},
  {item: itemId, owner: 'MOND_BARBARA', variant: 'BARBARA_SPECIAL'}
]});
```

The same item may be assigned to different active recipients; the batch reserves each serving independently. The meal receipt adds `variant`, `name`, and `requestedHealing` to each existing per-recipient result. Existing HP caps, life-bond absorption, repeated-food lock, shared 10-minute cost, and whole-action atomicity are preserved. Both variants use the same base item for the last-food lock.

Craft receipts for Barbara output add `outputVariant`, `outputName`, `healMultiplier`. Discounted craft cost includes `passives: [{passive,item,perCraftBefore,perCraftAfter,saved}]`; Mora is unchanged. `recipeCost(recipeDefinition(id), quantity)` is a read-only cost preview. `noncombatPassiveReport()` reports source-match support and matching recipe IDs. The capability object is `CRPGRuntime.noncombatPassiveCapabilities`.

## Explicit absent lifecycle

`MOND_KLEE_PASSIVE_SPECIALTY` is not wired because the current runtime has no LIFE_GATHER/LIFE_FORAGE resolution hook and no executable regional-specialty classification.

`MOND_MIKA_PASSIVE_SCOUT_GATHER` is not wired because the current runtime has no LIFE_SCOUT success or LIFE_GATHER resolution hook. No fake scouting action, reward, specialty, replacement choice, mark persistence, or duration was invented.

## Verification

- `node tests/test_passives.cjs`: 15 passed.
- `node tests/test_economy.cjs`: 11 existing regressions passed after the hook extraction.
- Tests cover produced-quantity accounting, mixed normal/special serving selection, one shared batch-meal time, late-failure rollback, reload/party removal, generic spending, invalid saves, region/party gating, batch minimum, equipment discount, potion exclusions, and source drift.
- Three tests use isolated in-memory fixture changes: a cooked-food shop stock (the current source sells ingredients, not cooked food), an alchemy material-conversion recipe (absent from current real catalog), and an intentionally changed passive script. No fixture recipe or stock is added to production data. Other tests use actual recipe/item definitions from `content/db.json`.
