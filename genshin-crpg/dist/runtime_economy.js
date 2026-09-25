(function (root) {
  'use strict';
  // Load after runtime, extensions, story/common, and combat. Never replace prior apply wrappers.
  const api = root.CRPGRuntime;
  if (!api) throw new Error('CRPGRuntime must be loaded before runtime_economy.js');
  const P = api.Runtime.prototype;
  const clone = x => JSON.parse(JSON.stringify(x));
  const json = (v, d = {}) => { try { return JSON.parse(v); } catch { return d; } };
  const fail = (c, m) => { throw new api.RuleError(c, m); };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const tactics = ['균형', '공격우선', '생존우선', '지원우선', '연계우선'];
  const foodStatuses = ['STATUS_FOOD_ATK', 'STATUS_FOOD_FEAST', 'STATUS_FOOD_RESIST', 'STATUS_FOOD_SPEED'];
  const shiftedRecipes = new Set(['REC_PROCESS_BUTTER', 'REC_PROCESS_CHEESE', 'REC_PROCESS_HAM', 'REC_PROCESS_SAUSAGE', 'REC_ALCH_HEALING_POTION', 'REC_MEDICAL_BANDAGE']);
  const old = Object.fromEntries(['apply', 'useItem', 'buy', 'finishBattle', 'bossRoute', 'move', 'equip', 'setParty', 'validateSave'].map(k => [k, P[k]]));

  P.apply = function (a) {
    switch (a.type) {
      case 'MEAL_BATCH': return this.meal(a.meals);
      case 'PARTY_REMOVE': return this.removeParty(a.slot);
      case 'PARTY_REPLACE': {
        this.removeParty(a.slot);
        return this.setParty(a.char, a.slot);
      }
      case 'PARTY_TACTIC': return this.setPartyTactic(a.slot, a.tactic);
      case 'TOOL_PREPARE': return this.prepareTools(a.items, a.element);
      case 'BOSS_CONTINUE': return this.continueBossRoute();
      case 'BOSS_LEAVE': return this.leaveBossRoute();
      case 'CRAFT': return this.craft(a.recipe, a.quantity ?? 1);
      default: return old.apply.call(this, a);
    }
  };

  P.economyOwner = function (owner) {
    if (owner === 'PLAYER_CUSTOM') return { hp: this.s.global.PLAYER_HP_CURRENT, maxHp: this.s.global.PLAYER_HP_MAX, statuses: this.s.playerStatuses || [], lastMeal: this.s.global.LAST_RECOVERY_MEAL_ITEM_ID };
    if (!this.s.party.some(p => p.active && p.type === 'CHAR' && p.source === owner) || !this.s.chars[owner]) fail('OWNER', '활성 파티의 식사 대상을 선택해 주세요.');
    const st = this.s.chars[owner];
    return { hp: st.hp, maxHp: this.character(owner).maxHp, statuses: st.statuses || [], lastMeal: st.lastRecoveryMeal || 'NONE' };
  };

  P.bossRecoveryReason = function () {
    const p = this.s.bossRouteProgress;
    return p?.phase === 'AWAIT_NEXT' && this.row('35_BOSS_ROUTE_DB', p.route)[11] !== 'Y' ? '이 보스 루트는 전초전 사이 회복을 허용하지 않습니다.' : '';
  };

  P.foodSpec = function (id) {
    const r = this.row('14_ITEM_DB', id);
    if (r[2] !== '음식' || /사용 금지/.test(String(r[6]) + String(r[7]))) fail('FOOD', '실제 사용할 수 있는 음식을 선택해 주세요.');
    if (r[10] !== 'N') fail('FOOD_SCHEMA', '음식의 1인분 대상 정의를 확인해야 합니다.');
    if (/전투불능|기상|부활/.test(r[7] || '')) fail('FOOD_REVIVE', '이 음식의 부활·스토리 사망 구분은 아직 실행 범위 밖입니다.');
    const heal = Number(r[8] || 0), status = r[9] || null;
    if (!Number.isFinite(heal) || heal < 0 || (status && !foodStatuses.includes(status)) || (!heal && !status)) fail('FOOD_EFFECT', '이 음식의 특수 효과는 아직 실행 범위 밖입니다.');
    if (status && this.row('13_STATUS_EFFECT_DB', status)[16] !== 'NEXT_COMBAT') fail('FOOD_STATUS', '음식 효과의 지속 범위를 확인해야 합니다.');
    return { item: id, heal, status };
  };

  P.economyHeal = function (owner, amount) {
    const a = this.economyOwner(owner), statuses = clone(a.statuses);
    let left = amount, absorbed = 0;
    // Persistent healing restrictions need an exact numeric definition; never silently bypass them.
    for (const st of statuses) {
      const def = this.row('13_STATUS_EFFECT_DB', st.id);
      if (st.id === 'STATUS_BOND_OF_LIFE') {
        if (!Number.isFinite(st.value) || st.value < 0) fail('HEAL_STATE', '생명의 계약 수치를 확인해야 합니다.');
        const used = Math.min(left, st.value); st.value -= used; left -= used; absorbed += used;
      } else if (/회복.*(?:방해|제약|금지|감소)|치유.*(?:흡수|감소|금지)/.test(String(def[3]))) {
        fail('HEAL_RESTRICTION', '현재 지속 상태의 치유 제한을 먼저 해결해야 합니다.');
      }
    }
    const hp = Math.min(a.maxHp, a.hp + left), kept = statuses.filter(st => st.id !== 'STATUS_BOND_OF_LIFE' || st.value > 0);
    if (owner === 'PLAYER_CUSTOM') { this.s.global.PLAYER_HP_CURRENT = hp; this.s.playerStatuses = kept; }
    else { this.s.chars[owner].hp = hp; this.s.chars[owner].statuses = kept; }
    return { healed: hp - a.hp, absorbed };
  };

  P.meal = function (meals) {
    if (this.s.runtime || this.s.global.MODE === 'COMBAT') fail('COMBAT', '전투 중에는 음식을 먹을 수 없습니다.');
    const blocked = this.bossRecoveryReason(); if (blocked) fail('BOSS_RECOVERY', blocked);
    if (!Array.isArray(meals) || !meals.length || meals.length > 4) fail('MEAL', '식사할 대상별로 음식 한 개를 골라 주세요.');
    const seen = new Set(), needed = {}, entries = [];
    for (const entry of meals) {
      const owner = entry?.owner || 'PLAYER_CUSTOM';
      if (seen.has(owner)) fail('MEAL_QUANTITY', '한 번의 식사에서는 한 사람당 음식 한 개만 먹습니다.');
      seen.add(owner);
      const spec = this.foodSpec(entry?.item, entry), a = this.economyOwner(owner);
      if (a.hp <= 0) fail('TARGET_DOWN', '전투불능 대상은 일반 음식을 먹을 수 없습니다.');
      if (spec.heal && a.lastMeal === spec.item) fail('MEAL_REPEAT', '직전에 먹은 회복 음식과 다른 음식을 골라 주세요.');
      if (!spec.status && a.hp >= a.maxHp && !a.statuses.some(s => s.id === 'STATUS_BOND_OF_LIFE')) fail('HP_FULL', '이미 HP가 가득 찬 대상입니다.');
      needed[spec.item] = (needed[spec.item] || 0) + 1;
      entries.push({ owner, ...spec });
    }
    for (const [id, n] of Object.entries(needed)) if (this.itemCount(id) < n) fail('QUANTITY', '식사에 필요한 음식이 부족합니다.');
    // Public action transactions make the whole multi-person meal atomic, including healing restrictions.
    const results = entries.map(e => {
      const result = e.heal ? this.economyHeal(e.owner, e.heal) : { healed: 0, absorbed: 0 };
      if (e.heal) {
        if (e.owner === 'PLAYER_CUSTOM') this.s.global.LAST_RECOVERY_MEAL_ITEM_ID = e.item;
        else this.s.chars[e.owner].lastRecoveryMeal = e.item;
      }
      if (e.status) {
        const pending = this.s.pendingCombatEffects || (this.s.pendingCombatEffects = {});
        const list = pending[e.owner] || (pending[e.owner] = []);
        const effect = { id: e.status, sourceItem: e.item };
        const index = list.findIndex(x => x.id === e.status);
        if (index < 0) list.push(effect); else list[index] = effect;
      }
      return { item: e.item, owner: e.owner, quantity: 1, status: e.status, ...result };
    });
    this.consumeMealFoods(entries, needed);
    this.advanceTime(10); // LIFE_MEAL / CE_091 / CE_095, one shared meal.
    return { meals: results, minutes: 10 };
  };
  P.consumeMealFoods = function (_entries, needed) { this.pay({ items: needed }); };

  P.useItem = function (id, n = 1, owner = 'PLAYER_CUSTOM') {
    const row = this.row('14_ITEM_DB', id);
    if (row[2] === '음식') {
      if (n !== 1) fail('MEAL_QUANTITY', '한 번의 식사에서는 한 사람당 음식 한 개만 먹습니다.');
      return this.meal([{ item: id, owner }]);
    }
    if (row[2] === '전투 치료품') {
      if (!this.s.runtime) fail('COMBAT_MEDICINE', '전투 치료품은 전투 중에만 사용할 수 있습니다.');
      if (n !== 1) fail('QUANTITY', '전투 치료품은 한 번에 한 개씩 사용합니다.');
      return this.combatAction('ITEM:' + id, owner);
    }
    return old.useItem.call(this, id, n, owner);
  };

  P.removeParty = function (slot) {
    if (this.s.runtime) fail('COMBAT', '전투 중 편성을 바꿀 수 없습니다.');
    if (!Number.isInteger(slot) || slot < 2 || slot > 4) fail('SLOT', '동료는 2~4번 슬롯을 사용합니다.');
    const p = this.s.party[slot - 1];
    if (!p?.active || p.type !== 'CHAR') fail('PARTY_EMPTY', '해제할 동료가 없는 슬롯입니다.');
    const result = { char: p.source, slot };
    this.s.party[slot - 1] = { slot: 'PARTY_' + slot, active: false };
    return result;
  };
  P.setPartyTactic = function (slot, tactic) {
    if (this.s.runtime) fail('COMBAT', '전투 밖에서 전술을 변경해 주세요.');
    if (!Number.isInteger(slot) || slot < 2 || slot > 4 || !this.s.party[slot - 1]?.active) fail('SLOT', '활성 동료 슬롯을 선택해 주세요.');
    if (!tactics.includes(tactic)) fail('TACTIC', '실행 가능한 전술 프로필을 선택해 주세요.');
    this.s.party[slot - 1].tactic = tactic;
    return { slot, tactic };
  };
  P.partyTactics = function () { return tactics.slice(); };

  P.tacticalCapacity = function () {
    const active = new Set(this.s.party.filter(p => p.active).map(p => p.source));
    return this.s.inventory.some(i => i.equipped && active.has(i.owner) && i.equip === 'EQ_SPECIAL_FIELD_PACK') ? 3 : 2;
  };
  P.prepareTools = function (items, element = 'NONE') {
    if (this.s.runtime) fail('COMBAT', '전투 중 준비 도구를 바꿀 수 없습니다.');
    if (!Array.isArray(items) || items.length > this.tacticalCapacity() || new Set(items).size !== items.length) fail('TOOL_SLOTS', '준비 슬롯 안에서 서로 다른 도구를 골라 주세요.');
    for (const id of items) if (this.row('14_ITEM_DB', id)[2] !== '전술 도구' || this.itemCount(id) < 1) fail('TOOL_OWNERSHIP', '보유한 전술 도구만 준비할 수 있습니다.');
    if (!['NONE', 'PYRO', 'HYDRO', 'ELECTRO', 'CRYO', 'DENDRO'].includes(element)) fail('TOOL_ELEMENT', '원소 변환기의 대기 원소를 확인해 주세요.');
    if (element !== 'NONE' && !items.includes('TRPG_TACTICAL_ELEMENT_CONVERTER')) fail('TOOL_ELEMENT', '원소 공명 변환기를 먼저 준비해 주세요.');
    this.s.preparedTools = items.slice();
    this.s.global.TACTICAL_ELEMENT_STANDBY = element;
    for (let i = 0; i < 3; i++) this.s.global['TACTICAL_SLOT_' + (i + 1)] = items[i] || 'NONE';
    this.s.global.TACTICAL_SLOT_MAX = this.tacticalCapacity();
    return { items: items.slice(), capacity: this.tacticalCapacity(), element };
  };

  P.recipeDefinition = function (id) {
    const r = this.row('17_RECIPE_DB', id);
    // Six audited source rows contain one extra blank at column P. Adapt only the exact known shape.
    if (shiftedRecipes.has(id) && r[15] == null && Number.isFinite(r[16]) && /^\d+(분|시간)$/.test(r[20] || '') && Number(r[21]) === 100) {
      const fixed = r.slice(); fixed.splice(15, 1); return fixed;
    }
    return r;
  };
  P.recipeFacilityReason = function (r) {
    const schedules = this.schedules(), map = this.row('32_MAP_DB', this.s.global.CURRENT_MAP_ID);
    const has = x => {
      x = x.trim();
      if (x.startsWith('MRC_')) return schedules.some(s => s.merchant_id === x);
      if (x === '조리시설' || x === '모닥불') return schedules.some(s => /조리시설|모닥불/.test(s.facility || ''));
      if (x === '대장간') return schedules.some(s => /대장간/.test(s.facility || '') || s.merchant_id === 'MRC_BLACKSMITH_COMMON');
      if (x === '연금대' || x === '연금 시설') return schedules.some(s => /연금/.test(s.facility || '') || s.merchant_id === 'MRC_ALCHEMY_COMMON');
      return schedules.some(s => s.facility === x || s.label === x);
    };
    const requirement = String(r[17] || '');
    if (!requirement || !requirement.split('+').every(and => and.split(/ 또는 |\//).some(has))) return '제작법이 지정한 시설이 필요합니다.';
    const places = String(r[16] || '').split('/');
    const generic = /시설|작업대|대장간|모닥불|연금대/;
    if (!places.some(place => generic.test(place) ? has(place) || requirement.split(/ 또는 |\+|\//).some(has) : [map[2], ...schedules.map(s => s.facility)].includes(place))) return '제작법이 지정한 장소에서만 제작할 수 있습니다.';
    return '';
  };
  P.craftReason = function (input) {
    const r = this.recipeDefinition(input[0]);
    if (this.s.runtime) return '전투를 먼저 해결해 주세요.';
    if (r[1] === '강화') return '강화할 개별 장비를 선택해 주세요.';
    if (/레거시|사용 금지/.test(r[18] || '')) return '사용하지 않는 예시 제작법입니다.';
    if (!['ITEM', 'EQUIP'].includes(r[2]) || !Number.isInteger(r[4]) || r[4] < 1 || !Number.isFinite(r[15]) || r[15] < 0 || Number(r[20]) !== 100 || !/^\d+(분|시간)$/.test(r[19] || '')) return '제작 결과·비용·시간·성공률의 실행 정의를 확인해야 합니다.';
    const facility = this.recipeFacilityReason(r); if (facility) return facility;
    const req = String(r[18] || '');
    if (!['', '없음', '기본', '기본 해금', '전투 중 아님'].includes(req)) {
      const purchased = req.match(/^(STK_\w+) 구매완료$/);
      if (purchased) {
        if (!Object.keys(json(this.s.global.SHOP_STOCK_USAGE_STATE)).some(k => k.startsWith(purchased[1] + '|'))) return '제작법을 먼저 구매해 주세요.';
      } else if (!api.condition(req, this.vars())) {
        const match = /^\s*LEVEL\s*>=\s*(\d+)(?:\s*$|\s*\/)/.exec(req);
        const current = this.s.global.PLAYER_LEVEL_STATE, needed = match && Number(match[1]);
        if (match && Number.isSafeInteger(needed) && Number.isSafeInteger(current) && current < needed)
          return needed + '레벨부터 제작할 수 있습니다. (현재 ' + current + '레벨)';
        return '제작법의 추가 해금 조건을 확인해야 합니다.';
      }
    }
    return '';
  };
  P.craft = function (id, quantity = 1) {
    const r = this.recipeDefinition(id), reason = this.craftReason(r);
    if (reason) fail('CRAFT', reason);
    if (!Number.isInteger(quantity) || quantity < 1) fail('QUANTITY', '제작 수량은 1 이상의 정수여야 합니다.');
    const minutes = Number(r[19].match(/\d+/)[0]) * (r[19].includes('시간') ? 60 : 1) * quantity;
    if (minutes > 1440) fail('TIME', '한 번의 제작은 24시간 이내로 선택해 주세요.');
    const cost = this.recipeCost(r, quantity);
    this.row(r[2] === 'ITEM' ? '14_ITEM_DB' : '16_EQUIP_DB', r[3]);
    this.pay(cost);
    if (r[2] === 'ITEM') this.giveItem(r[3], r[4] * quantity);
    else for (let n = 0; n < r[4] * quantity; n++) this.giveEquipment(r[3]);
    this.advanceTime(minutes);
    return { recipe: id, result: r[3], quantity: r[4] * quantity, crafts: quantity, minutes, cost };
  };
  P.recipeCost = function (r, quantity = 1) {
    const ingredients = this.rows('48_RECIPE_INGREDIENT_DB').filter(i => i[1] === r[0]).sort((a, b) => a[2] - b[2]);
    const seq = new Set(), cost = { mora: r[15] * quantity, items: {} };
    if (!ingredients.length) fail('RECIPE', '제작 재료 정의가 없습니다.');
    for (const i of ingredients) {
      if (!Number.isInteger(i[2]) || i[2] < 1 || seq.has(i[2]) || !Number.isInteger(i[4]) || i[4] <= 0) fail('RECIPE_INGREDIENT', '제작 재료의 순서·수량 정의를 확인해야 합니다.');
      seq.add(i[2]); this.row('14_ITEM_DB', i[3]); cost.items[i[3]] = (cost.items[i[3]] || 0) + i[4] * quantity;
    }
    return cost;
  };

  P.buy = function (id, qty) {
    const row = this.row('19_SHOP_STOCK_DB', id);
    if (row[2] === 'SERVICE') { const reason = this.bossRecoveryReason(); if (reason) fail('BOSS_RECOVERY', reason); }
    return old.buy.call(this, id, qty);
  };

  P.bossSteps = function (id) {
    const steps = this.rows('50_BOSS_ROUTE_STEP_DB').filter(r => r[1] === id).sort((a, b) => a[2] - b[2]);
    if (!steps.length || steps.filter(r => r[3] === 'BOSS').length !== 1 || steps.at(-1)[3] !== 'BOSS' || steps.some((r, i) => r[2] !== i + 1 || !['PRELIM', 'BOSS'].includes(r[3]))) fail('BOSS_STEPS', '보스 루트 단계에 누락·중복·잘못된 보스 순서가 있습니다.');
    for (const step of steps) this.row('33_ENCOUNTER_GROUP_DB', step[4]);
    return steps;
  };
  P.bossRoute = function (id, entry = 'DIRECT') {
    if (this.s.bossRouteProgress && ['AWAIT_NEXT', 'IN_BATTLE', 'RETRY'].includes(this.s.bossRouteProgress.phase)) fail('BOSS_ACTIVE', '진행 중인 보스 루트를 계속하거나 먼저 이탈해 주세요.');
    const r = this.row('35_BOSS_ROUTE_DB', id), steps = this.bossSteps(id);
    if (r[14] === 'N' && r[13] && this.s.flags[r[13]]) fail('BOSS_COMPLETE', '이미 완료한 일회성 보스 루트입니다.');
    if (r[3] === 'DIRECT' && entry !== 'DIRECT' || r[3] === 'GAUNTLET' && entry !== 'GAUNTLET') fail('ENTRY', '이 루트에서 허용하는 진입 방식을 선택해 주세요.');
    const step = entry === 'DIRECT' ? steps.at(-1) : steps[0];
    this.s.bossRouteProgress = { route: id, step: step[2], phase: 'IN_BATTLE', entry };
    return old.bossRoute.call(this, id, entry);
  };
  P.finishBattle = function (victory) {
    const b = this.s.runtime && clone(this.s.runtime);
    const result = old.finishBattle.call(this, victory);
    if (b?.origin?.startsWith('BOSS:')) {
      const id = b.origin.slice(5), r = this.row('35_BOSS_ROUTE_DB', id), steps = this.bossSteps(id);
      const p = this.s.bossRouteProgress || { route: id, step: this.s.global.BOSS_ROUTE_STEP, entry: this.s.global.BOSS_ENTRY_MODE };
      const current = steps.find(s => s[2] === p.step && s[4] === b.group);
      if (!current) fail('BOSS_STEP', '실제 전투와 보스 단계가 일치하지 않습니다.');
      if (victory && current[3] === 'BOSS') {
        p.phase = 'COMPLETE'; this.s.global.ACTIVE_BOSS_ROUTE_ID = ''; this.s.global.BOSS_ROUTE_STEP = 0;
      } else if (victory) { p.step = steps[steps.indexOf(current) + 1][2]; p.phase = 'AWAIT_NEXT'; }
      else { p.step = r[10] === 'ROUTE_START' ? (p.entry === 'DIRECT' ? steps.at(-1)[2] : steps[0][2]) : current[2]; p.phase = 'RETRY'; }
      this.s.bossRouteProgress = p;
      if (p.phase !== 'COMPLETE') { this.s.global.ACTIVE_BOSS_ROUTE_ID = id; this.s.global.BOSS_ROUTE_STEP = p.step; }
    }
    return result;
  };
  P.continueBossRoute = function () {
    if (this.s.runtime) fail('COMBAT', '현재 전투를 먼저 마쳐 주세요.');
    const p = this.s.bossRouteProgress;
    if (!p || !['AWAIT_NEXT', 'RETRY'].includes(p.phase)) fail('BOSS_PROGRESS', '계속할 보스 단계가 없습니다.');
    const route = this.row('35_BOSS_ROUTE_DB', p.route);
    if (this.s.global.CURRENT_MAP_ID !== route[2]) fail('LOCATION', '해당 보스의 진입 장소로 돌아가 주세요.');
    const step = this.bossSteps(p.route).find(s => s[2] === p.step);
    p.phase = 'IN_BATTLE';
    this.s.global.BOSS_ROUTE_STEP = p.step;
    return this.startBattle(step[4], 'BOSS:' + p.route);
  };
  P.leaveBossRoute = function () {
    if (this.s.runtime) fail('COMBAT', '전투 중에는 루트를 이탈할 수 없습니다.');
    const p = this.s.bossRouteProgress;
    if (!p || ['COMPLETE', 'LEFT'].includes(p.phase)) fail('BOSS_PROGRESS', '이탈할 보스 루트가 없습니다.');
    p.phase = 'LEFT'; this.s.global.ACTIVE_BOSS_ROUTE_ID = ''; this.s.global.BOSS_ROUTE_STEP = 0;
    return { route: p.route, left: true };
  };
  P.move = function (id) {
    const p = this.s.bossRouteProgress;
    if (p?.phase === 'AWAIT_NEXT') fail('BOSS_PROGRESS', '보스 루트를 계속하거나 이탈을 선택해 주세요.');
    return old.move.call(this, id);
  };
  P.validateSave = function (s) {
    old.validateSave.call(this, s);
    const active = s.party.filter(p => p.active), owners = new Set();
    if (s.party.length !== 4 || active.length > 4) fail('PARTY', '파티 슬롯 수가 잘못되었습니다.');
    for (const p of active) {
      if (owners.has(p.source)) fail('PARTY', '파티에 중복 인물이 있습니다.'); owners.add(p.source);
      if (p.type === 'CHAR' && (!s.chars[p.source] || p.control !== 'AI')) fail('PARTY', '동료 상태 또는 조작 권한이 잘못되었습니다.');
    }
    if (s.preparedTools && (!Array.isArray(s.preparedTools) || s.preparedTools.length > 3 || new Set(s.preparedTools).size !== s.preparedTools.length)) fail('TOOL_SLOTS', '준비 도구 저장값이 잘못되었습니다.');
    if (s.pendingCombatEffects) {
      if (typeof s.pendingCombatEffects !== 'object' || Array.isArray(s.pendingCombatEffects)) fail('FOOD_STATE', '음식 효과 저장값이 잘못되었습니다.');
      for (const [owner, effects] of Object.entries(s.pendingCombatEffects)) {
        if (owner !== 'PLAYER_CUSTOM' && !own(s.chars, owner) || !Array.isArray(effects) || effects.some(e => !foodStatuses.includes(e.id))) fail('FOOD_STATE', '음식 효과의 대상·상태를 확인해야 합니다.');
      }
    }
    return s;
  };
  api.economyCapabilities = { tactics: tactics.slice(), foodStatuses: foodStatuses.slice(), recipeColumnAdapters: Array.from(shiftedRecipes) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRPGRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
