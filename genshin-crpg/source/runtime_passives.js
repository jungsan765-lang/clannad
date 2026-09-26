/* Source-defined noncombat passives. Load after economy and Mond combat cards. */
(function (root) {
  'use strict';
  const api = root.CRPGRuntime, P = api.Runtime.prototype;
  if (!P.recipeCost || !P.consumeMealFoods) throw new Error('runtime_passives.js requires economy recipeCost/consumeMealFoods hooks');
  const old = Object.fromEntries(['apply', 'recipeCost', 'craft', 'foodSpec', 'meal', 'pay', 'validateSave', 'cardSupport', 'cardReason'].map(k => [k, P[k]]));
  const fail = (code, message) => { throw new api.RuleError(code, message); };
  // Barbara's passive keeps the dish's own name first so a fried egg still reads as a fried egg.
  const special = 'BARBARA_SPECIAL', specialName = name => name + ' · 바바라 특제';
  const definitions = {
    MOND_BARBARA_PASSIVE_DISH: { owner: 'MOND_BARBARA', trigger: 'PASSIVE_ON_COOK', script: 'COOK_HEAL_OUTPUT_MULT*1.1;PREFIX_SPECIAL_DISH' },
    MOND_ALBEDO_PASSIVE_CRAFT: { owner: 'MOND_ALBEDO', trigger: 'PASSIVE_ON_CRAFT', script: 'IF_PARTY_HAS:MOND_ALBEDO_AND_REGION=MOND_AND_RECIPE_KIND_IN(PROCESS/EQUIP):REDUCE_ONE_COMMON_MATERIAL_QTY_BY1:MIN1:ONCE_PER_CRAFT;EXCLUDE_RARE_QUEST_BOSS' },
    MOND_MONA_PASSIVE_ALCHEMY: { owner: 'MOND_MONA', trigger: 'PASSIVE_ON_ALCHEMY', script: 'IF_PARTY_HAS:MOND_MONA_AND_REGION=MOND_AND_ACTION=ALCHEMY_OR_MATERIAL_CONVERT:REDUCE_HIGHEST_QTY_COMMON_MATERIAL_BY1:MIN1;EXCLUDE_POTION_COMBAT_CONSUMABLE_RARE_QUEST' },
    MOND_LISA_PASSIVE_BREW: { owner: 'MOND_LISA', trigger: 'PASSIVE_ON_BREW', script: 'IF_PARTY_HAS:MOND_LISA_AND_REGION=MOND_AND_RECIPE_KIND_IN(POTION/ALCHEMY_CONSUMABLE):REDUCE_ONE_COMMON_MATERIAL_QTY_BY1:MIN1;EXCLUDE_EQUIP_RARE_QUEST' }
  };
  const consumableCategories = new Set(['전투 치료품', '소모품']);
  const reductionIds = ['MOND_ALBEDO_PASSIVE_CRAFT', 'MOND_LISA_PASSIVE_BREW', 'MOND_MONA_PASSIVE_ALCHEMY'];

  P.noncombatPassiveDefinitionReason = function (id) {
    const expected = definitions[id], r = this.tables['08_SKILL_CARD_DB']?.get(id);
    if (!expected || !r || r[2] !== expected.owner || r[4] !== '패시브' || r[30] !== expected.trigger || r[32] !== expected.script || r[35] !== 'READY') return '패시브의 최신 실행 정의가 실행기와 일치하지 않습니다.';
    return '';
  };
  P.hasNoncombatPassive = function (id) {
    const expected = definitions[id];
    if (!expected || !this.s.party.some(p => p.active && p.type === 'CHAR' && p.source === expected.owner)) return false;
    const reason = this.noncombatPassiveDefinitionReason(id); if (reason) fail('PASSIVE_DEFINITION', reason);
    return this.s.chars[expected.owner].level >= Number(this.row('08_SKILL_CARD_DB', id)[22] || 1);
  };
  P.commonMaterialReason = function (id) {
    const r = this.row('14_ITEM_DB', id);
    if (r[18] !== 'Y') return 'NOT_MATERIAL';
    if (r[19] !== 'N') return 'QUEST_OR_UNCLASSIFIED';
    if (r[2] === '보스 재료') return 'BOSS_MATERIAL';
    if (r[3] !== '일반') return 'NOT_COMMON_GRADE';
    return '';
  };
  P.passiveRecipeKind = function (r) {
    if (r[2] === 'EQUIP' && r[1] !== '강화') return 'EQUIP';
    if (r[1] === '식재료 가공' || r[1] === '가공') return 'PROCESS';
    if (r[2] !== 'ITEM') return 'OTHER';
    if (r[1] === '요리') return 'COOK';
    if (!['연금', '소재 변환', '연금 소재 변환'].includes(r[1])) return 'OTHER';
    const item = this.row('14_ITEM_DB', r[3]);
    if (consumableCategories.has(item[2])) return 'BREW';
    if (item[18] === 'Y' && item[19] === 'N') return 'ALCHEMY';
    return 'UNCLASSIFIED_ALCHEMY';
  };
  P.recipeCost = function (r, quantity = 1) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) fail('QUANTITY', '제작 수량은 1 이상의 정수여야 합니다.');
    // Reduce a single craft first, then multiply: batch crafting cannot evade or dilute MIN1.
    const unit = old.recipeCost.call(this, r, 1), kind = this.passiveRecipeKind(r), effects = [];
    if (this.row('32_MAP_DB', this.s.global.CURRENT_MAP_ID)[1] === '몬드') {
      if (kind === 'UNCLASSIFIED_ALCHEMY' && (this.hasNoncombatPassive('MOND_LISA_PASSIVE_BREW') || this.hasNoncombatPassive('MOND_MONA_PASSIVE_ALCHEMY'))) fail('PASSIVE_RECIPE_CLASS', '연금 결과의 재료·소모품 분류가 명확하지 않아 패시브 적용을 결정할 수 없습니다.');
      const id = kind === 'PROCESS' || kind === 'EQUIP' ? reductionIds[0] : kind === 'BREW' ? reductionIds[1] : kind === 'ALCHEMY' ? reductionIds[2] : null;
      if (id && this.hasNoncombatPassive(id)) {
        const candidates = Object.keys(unit.items).filter(item => !this.commonMaterialReason(item) && unit.items[item] > 1);
        if (id === 'MOND_MONA_PASSIVE_ALCHEMY') candidates.sort((a, b) => unit.items[b] - unit.items[a]);
        const item = candidates[0];
        if (item) { const before = unit.items[item]; unit.items[item]--; effects.push({ passive: id, item, perCraftBefore: before, perCraftAfter: unit.items[item], saved: quantity }); }
      }
    }
    const cost = { mora: unit.mora * quantity, items: Object.fromEntries(Object.entries(unit.items).map(([id, n]) => [id, n * quantity])) };
    if (effects.length) cost.passives = effects;
    return cost;
  };
  P.craft = function (id, quantity = 1) {
    const r = this.recipeDefinition(id), item = r[2] === 'ITEM' ? this.row('14_ITEM_DB', r[3]) : null;
    let enhanced = false;
    if (this.passiveRecipeKind(r) === 'COOK' && item[2] === '음식' && Number(item[8]) > 0 && this.hasNoncombatPassive('MOND_BARBARA_PASSIVE_DISH')) {
      // A supported numeric healing food is mandatory; never strengthen an unimplemented revive/effect.
      old.foodSpec.call(this, item[0]); enhanced = true;
    }
    const out = old.craft.call(this, id, quantity);
    if (enhanced) {
      this.s.specialFoodLots ||= {};
      const lot = this.s.specialFoodLots[out.result] ||= { [special]: 0 };
      lot[special] += out.quantity;
      out.outputVariant = special; out.outputName = specialName(item[1]); out.healMultiplier = 1.1;
    }
    return out;
  };

  P.foodLots = function (id) {
    const r = this.row('14_ITEM_DB', id), count = this.itemCount(id), boosted = this.s.specialFoodLots?.[id]?.[special] || 0;
    if (r[2] !== '음식') return [];
    return [
      { item: id, variant: 'NORMAL', quantity: count - boosted, name: r[1], heal: Number(r[8] || 0) },
      { item: id, variant: special, quantity: boosted, name: specialName(r[1]), heal: Number(r[8] || 0) * 11 / 10 }
    ].filter(lot => lot.quantity > 0);
  };
  P.foodSpec = function (id, entry = {}) {
    const spec = old.foodSpec.call(this, id), requested = entry?.variant || 'AUTO';
    if (!['AUTO', 'NORMAL', special].includes(requested)) fail('FOOD_VARIANT', '사용할 음식 종류를 확인해 주세요.');
    const reserved = this._mealLotReservations, counts = reserved?.counts[id] || Object.fromEntries(this.foodLots(id).map(lot => [lot.variant, lot.quantity]));
    const variant = requested === 'AUTO' ? (counts.NORMAL > 0 ? 'NORMAL' : counts[special] > 0 ? special : 'NORMAL') : requested;
    if (reserved) {
      if (!(counts[variant] > 0)) fail('QUANTITY', '선택한 종류의 음식이 부족합니다.');
      counts[variant]--; reserved.counts[id] = counts;
    }
    const base = this.row('14_ITEM_DB', id)[1], name = variant === special ? specialName(base) : base;
    const enhanced = { ...spec, variant, name, heal: variant === special ? spec.heal * 11 / 10 : spec.heal };
    if (reserved) reserved.entries.push(enhanced);
    return enhanced;
  };
  P.meal = function (meals) {
    if (this._mealLotReservations) fail('MEAL', '식사 처리가 이미 진행 중입니다.');
    const reservation = { counts: Object.create(null), entries: [] };
    this._mealLotReservations = reservation;
    try {
      const out = old.meal.call(this, meals);
      out.meals.forEach((entry, i) => Object.assign(entry, { variant: reservation.entries[i].variant, name: reservation.entries[i].name, requestedHealing: reservation.entries[i].heal }));
      return out;
    } finally { delete this._mealLotReservations; }
  };
  P.consumeMealFoods = function (entries, needed) {
    const exact = {};
    for (const e of entries) { exact[e.item] ||= { NORMAL: 0, [special]: 0 }; exact[e.item][e.variant]++; }
    this._foodSpendLots = exact;
    try { this.pay({ items: needed }); } finally { delete this._foodSpendLots; }
  };
  P.pay = function (cost) {
    const changes = {};
    for (const [id, n] of Object.entries(cost.items || {})) {
      const available = this.s.specialFoodLots?.[id]?.[special] || 0, ordinary = this.itemCount(id) - available, exact = this._foodSpendLots?.[id];
      if (exact && (exact.NORMAL + exact[special] !== n || exact.NORMAL > ordinary || exact[special] > available)) fail('FOOD_LOT', '선택한 음식의 보유 수량을 확인해 주세요.');
      if (available) changes[id] = available - (exact ? exact[special] : Math.max(0, n - ordinary));
    }
    const out = old.pay.call(this, cost);
    for (const [id, count] of Object.entries(changes)) {
      if (count > 0) this.s.specialFoodLots[id][special] = count;
      else delete this.s.specialFoodLots[id];
    }
    return out;
  };
  P.apply = function (a) {
    if (a.type === 'USE_ITEM' && this.row('14_ITEM_DB', a.item)[2] === '음식') {
      if ((a.quantity ?? 1) !== 1) fail('MEAL_QUANTITY', '한 번의 식사에서는 한 사람당 음식 한 개만 먹습니다.');
      return this.meal([{ item: a.item, owner: a.owner || 'PLAYER_CUSTOM', variant: a.variant || 'AUTO' }]);
    }
    return old.apply.call(this, a);
  };
  P.validateSave = function (s) {
    old.validateSave.call(this, s);
    if (s.specialFoodLots !== undefined) {
      if (!s.specialFoodLots || typeof s.specialFoodLots !== 'object' || Array.isArray(s.specialFoodLots)) fail('FOOD_LOT_SAVE', '특제 음식 저장값이 잘못되었습니다.');
      for (const [id, lot] of Object.entries(s.specialFoodLots)) {
        const item = this.tables['14_ITEM_DB']?.get(id), count = lot?.[special];
        if (!lot || typeof lot !== 'object' || Array.isArray(lot) || Object.keys(lot).length !== 1 || !Number.isSafeInteger(count) || count < 1 || !item || item[2] !== '음식' || !Number.isFinite(Number(item[8])) || Number(item[8]) <= 0 || count > s.inventory.filter(i => i.item === id).reduce((n, i) => n + i.quantity, 0)) fail('FOOD_LOT_SAVE', '특제 음식 종류·수량과 소지품이 일치하지 않습니다.');
      }
    }
    return s;
  };
  if (old.cardSupport) P.cardSupport = function (card) {
    if (definitions[card.id]) return this.noncombatPassiveDefinitionReason(card.id);
    return old.cardSupport.call(this, card);
  };
  if (old.cardReason) P.cardReason = function (actor, card) {
    if (definitions[card.id]) return '제작·요리 과정에서 자동 적용하는 비전투 패시브입니다.';
    return old.cardReason.call(this, actor, card);
  };
  P.noncombatPassiveReport = function () {
    return Object.entries(definitions).map(([id, d]) => ({ id, owner: d.owner, supported: !this.noncombatPassiveDefinitionReason(id), reason: this.noncombatPassiveDefinitionReason(id), matchingRecipes: this.rows('17_RECIPE_DB').filter(r => { const kind = this.passiveRecipeKind(this.recipeDefinition(r[0])); return id === 'MOND_BARBARA_PASSIVE_DISH' ? kind === 'COOK' && Number(this.row('14_ITEM_DB', r[3])[8]) > 0 : id === reductionIds[0] ? ['PROCESS', 'EQUIP'].includes(kind) : id === reductionIds[1] ? kind === 'BREW' : kind === 'ALCHEMY'; }).map(r => r[0]) })).concat([
      { id: 'MOND_KLEE_PASSIVE_SPECIALTY', supported: false, reason: 'LIFE_GATHER/LIFE_FORAGE 실행 수명주기와 지역 특산물 분류가 연결되지 않았습니다.' },
      { id: 'MOND_MIKA_PASSIVE_SCOUT_GATHER', supported: false, reason: 'LIFE_SCOUT 성공 및 LIFE_GATHER 실행 수명주기가 연결되지 않았습니다.' }
    ]);
  };
  api.noncombatPassiveCapabilities = { supported: Object.keys(definitions), foodVariants: ['NORMAL', special], defaultFoodSelection: 'NORMAL_FIRST', unsupported: ['MOND_KLEE_PASSIVE_SPECIALTY', 'MOND_MIKA_PASSIVE_SCOUT_GATHER'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRPGRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
