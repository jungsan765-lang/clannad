/* Mond enemy addon: load AFTER runtime_rules.js and existing combat/card wrappers.
 * Source: 12_ENEMY_CARD_DB, exact READY scripts below. Does not mutate DB rows.
 * CORE INTEGRATION (root-owned):
 * 1. startBattle boss allowlist must include BOSS_ANDRIUS.
 * 2. autoUntilPlayer initializes actionsRemaining = combatActionsPerTurn(actor)
 *    once per OWNER TURN after cooldown decrement, executes that many AI actions,
 *    then advances cursor. Do not increment turns/cooldowns per extra action.
 * 3. Call resolveEnemyPhases() after an atomic system/normal action and before the
 *    next player wait. This addon also wraps executeCard/aiTurn/tickFields/newRound.
 * 4. runtime_rules supplies applyCombatAura(source,target,element,options) for
 *    fixed claw splash packets and hasElementImmunity/nearbyTargets helpers.
 * 5. Shared independent damage code must call combatDamageMultiplier exactly once
 *    before rounding (runtime_rules already does this for REACTION packets).
 *    Do not also multiply andriusIncomingDamageMultiplier separately.
 * 6. Shared applyDamage calls captureAndriusPrimaryPacket(a,t,finalPacket,d)
 *    after final modifiers/rounding, immediately before shield consumption.
 *    SPLASH details.skipSourceModifiers=true skips reapplying outgoing modifiers
 *    already included in the primary packet, while target effects still apply.
 * Phase transitions are automatic interrupts, not additional owner turns.
 */
(function (root) {
  'use strict';
  const api = root.CRPGRuntime;
  if (!api?.Runtime) throw new Error('runtime_andrius.js requires CRPGRuntime');
  const P = api.Runtime.prototype;
  const old = Object.fromEntries(['cardSupport', 'cardReason', 'executeCard', 'aiTurn', 'tickFields', 'newRound', 'damage', 'applyDamage', 'combatStat', 'combatDamageMultiplier', 'hasElementImmunity', 'applyCombatControl', 'moveCombatActor', 'combatActionsPerTurn'].map(k => [k, P[k]]));
  const fail = (code, message) => { throw new api.RuleError(code, message); };
  const element = value => ({ CRYO: '얼음', ANEMO: '바람', PYRO: '불', HYDRO: '물', ELECTRO: '번개', GEO: '바위', DENDRO: '풀', PHYSICAL: '물리' }[value] || value);
  const active = s => s && (!Number.isFinite(s.rounds) || s.rounds > 0);
  const status = (a, id) => (a.statuses || []).find(s => s.id === id && active(s));
  const alive = a => a.hp > 0;
  const isAndrius = a => a?.source === 'BOSS_ANDRIUS';
  const signatures = {
    ECARD_MITA_ICE_SHIELD: 'APPLY_SHIELD:MAX_HP*0.30:CRYO;ON_SHIELD_DAMAGE_BY_PYRO:SHIELD_DAMAGE*1.50',
    ECARD_MITA_ICE_CHARGE: 'DMG:ATK*1.10:CRYO:ALLY_1;APPLY_STATUS:STATUS_SLOW:1R',
    ECARD_ANDRIUS_PASSIVE: 'IMMUNE_DAMAGE:ELEMENT=CRYO/ANEMO;IMMUNE_CONTROL_DEPENDENT=CRYO/ANEMO;ROUND_START_FROM_2:ATK_CURRENT*1.10:UNBOUNDED',
    ECARD_ANDRIUS_CLAW: 'DMG:ATK*1.25:CRYO:PRIMARY;DMG:PRIMARY_DAMAGE*0.60:CRYO:ADJACENT;ON_HIT:NEXT_ROUND_ACTION_SCORE-10',
    ECARD_ANDRIUS_SWEEP: 'DMG_AOE:ATK*1.05:CRYO:ALLY_ALL;STATUS_CHECK:STATUS_SLOW:1R:BASE70+BONUS10;IF_ALREADY_SLOW:DAMAGE*1.20',
    ECARD_ANDRIUS_LEAP: 'DMG_AOE:ATK*1.65:CRYO:MAX2;IF_TARGET_SLOW_OR_FREEZE:FINAL_DAMAGE*1.25',
    ECARD_ANDRIUS_RUN_PHASE: 'PHASE_SHIFT:1_TO_2:ON_HP<=65_OR_ROUND>=4:ONCE;FORCED_MULTIHIT:ATK*0.85:CRYO:HITS=2:DIFFERENT_ALLIES_FIRST;FINISH_DMG:ATK*1.35:CRYO:HIGHEST_HP;DURING_RESOLVE:IGNORE_FORCED_MOVE_TAUNT;DAMAGE_TAKEN*0.5',
    ECARD_ANDRIUS_PHASE3: 'PHASE_SHIFT:2_TO_3:ONCE;ACTIONS_PER_TURN=2;NO_STACK_WITH_EXTRA_ACTION;ROUND_END_AUTO_DMG:ATK*0.35:CRYO:RANDOM_MAX2',
    ECARD_ANDRIUS_WIND_BLADE: 'MULTIHIT:ATK*0.75:ANEMO:HITS=3:DISTRIBUTE_MAX3:MAX2_PER_TARGET;IF_TARGET_HIT2:NEXT_ROUND_EVA-10',
    ECARD_ANDRIUS_ROAR: 'DMG_AOE:ATK*1.35:ANEMO:ALLY_ALL;SUMMON:GHOST_WOLVES:2R;ROUND_END:DMG:ATK*0.45:CRYO:LOWEST_HP_ALLY+RANDOM_ALLY;IF_ALREADY_ACTIVE:REFRESH2R+IMMEDIATE_PROC'
  };
  const ids = new Set(Object.keys(signatures));
  const phaseIds = new Set(['ECARD_ANDRIUS_RUN_PHASE', 'ECARD_ANDRIUS_PHASE3']);
  const passiveIds = new Set(['ECARD_ANDRIUS_PASSIVE', 'ECARD_MITA_ICE_SHIELD']);
  const ownedBy = id => id.startsWith('ECARD_ANDRIUS_') ? 'BOSS_ANDRIUS' : 'MON_MITACHURL_ICE';

  P.cardSupport = function (c) {
    if (!ids.has(c.id)) return old.cardSupport.call(this, c);
    return c.enemy && c.owner === ownedBy(c.id) && c.ready && c.script === signatures[c.id] ? '' : '적 카드의 최신 실행 정의가 전용 실행기와 일치하지 않습니다.';
  };
  P.andriusCard = function (id) {
    const c = this.cardDefinition(this.row('12_ENEMY_CARD_DB', id), true), reason = this.cardSupport(c);
    if (reason) fail('ENEMY_DEFINITION', reason);
    return c;
  };
  P.initializeMondEnemy = function (a) {
    if (a.source === 'MON_MITACHURL_ICE' && !a.mondIceShieldInitialized) {
      this.andriusCard('ECARD_MITA_ICE_SHIELD');
      a.mondIceShieldInitialized = true;
      this.shield(a, a.maxHp * 0.30, 'ECARD_MITA_ICE_SHIELD', null, { element: '얼음', damageMultipliers: { 불: 1.50 } });
      this.s.runtime.log.push({ actor: a.name, card: 'ECARD_MITA_ICE_SHIELD', initialized: true });
    }
    if (isAndrius(a) && !a.andrius) {
      this.andriusCard('ECARD_ANDRIUS_PASSIVE');
      a.andrius = { phase: 1, runResolved: false, phase3Resolved: false, rageStacks: 0, lastRageRound: 1, lastStormRound: 0, runResolving: false };
      this.s.runtime.log.push({ actor: a.name, card: 'ECARD_ANDRIUS_PASSIVE', initialized: true });
    }
    return a;
  };
  P.hasElementImmunity = function (target, el) {
    return (isAndrius(target) && ['얼음', '바람'].includes(element(el))) || !!old.hasElementImmunity?.call(this, target, el);
  };
  P.andriusIncomingDamageMultiplier = function (target) { return isAndrius(target) && target.andrius?.runResolving ? 0.50 : 1; };
  P.combatDamageMultiplier = function (a, t, el, options = {}) {
    return (old.combatDamageMultiplier ? old.combatDamageMultiplier.call(this, a, t, el, options) : 1)
      * this.andriusIncomingDamageMultiplier(t) * Number(options.andriusFinalMultiplier || 1);
  };
  P.damage = function (a, t, coefficient, el, options = {}) {
    if (t && this.hasElementImmunity(t, el)) {
      this.s.runtime?.log.push({ actor: a.name, target: t.name, card: options.card || null, immune: true, damage: 0, element: element(el), sourceKind: options.sourceKind || null });
      return false; // No hit RNG, aura, reaction, status, or positive-hit trigger.
    }
    return old.damage.call(this, a, t, coefficient, el, options);
  };
  P.applyDamage = function (a, t, amount, details = {}) {
    if (this.hasElementImmunity(t, details.element)) {
      this.s.runtime?.log.push({ actor: a.name, target: t.name, ...details, immune: true, damage: 0, absorbed: 0 });
      return 0;
    }
    return old.applyDamage.call(this, a, t, amount, details);
  };
  P.captureAndriusPrimaryPacket = function (a, t, finalPacket, details = {}) {
    const capture = this._andriusPrimaryCapture;
    if (capture && capture.actor === a.id && capture.target === t.id && details.card === 'ECARD_ANDRIUS_CLAW' && !/^(REACTION|SPLASH|FIXED)/.test(details.sourceKind || '') && capture.amount === null) capture.amount = finalPacket;
  };
  if (old.applyCombatControl) P.applyCombatControl = function (a, t, kind, options = {}) {
    const el = options.element || (/FREEZE|CRYO/.test(kind) ? 'CRYO' : null);
    if (isAndrius(t) && (this.hasElementImmunity(t, el) || (t.andrius?.runResolving && /MOVE|PUSH|PULL|KNOCKBACK|TAUNT/.test(kind)))) {
      this.s.runtime?.log.push({ actor: a.name, target: t.name, control: kind, immune: true });
      return false;
    }
    return old.applyCombatControl.call(this, a, t, kind, options);
  };
  if (old.moveCombatActor) P.moveCombatActor = function (a, to, options = {}) {
    if (isAndrius(a) && a.andrius?.runResolving && options.voluntary !== true) return false;
    return old.moveCombatActor.call(this, a, to, options);
  };
  P.combatStat = function (a, key) {
    let value = old.combatStat.call(this, a, key);
    if (key === 'eva' && a.andriusWindEva?.round === this.s.runtime?.round) value -= 10;
    return value;
  };
  P.andriusIsSlowed = function (a) {
    return !!status(a, 'STATUS_SLOW') || (a.statuses || []).some(s => active(s) && (Number(s.mods?.spd?.flat || 0) < 0 || Number(s.mods?.spd?.pct || 0) < 0));
  };
  P.andriusStatusCheck = function (source, target, c, id, rounds, base, bonus) {
    if (this.hasElementImmunity(target, c.row[12])) return false;
    const proficiency = 2 + Math.floor((source.level - 1) / 4);
    const chance = Math.max(5, Math.min(95, base + bonus + proficiency * 2 - this.combatStat(target, 'resist')));
    const success = this.die() <= chance;
    this.s.runtime.log.push({ actor: source.name, target: target.name, card: c.id, status: id, statusApplied: success });
    if (success) this.addCombatStatus(target, id, rounds, id === 'STATUS_SLOW' ? { value: -10 } : {});
    return success;
  };
  P.cardReason = function (a, c) {
    const reason = old.cardReason.call(this, a, c);
    if (reason || !ids.has(c.id)) return reason;
    const enemies = this.s.runtime.actors.filter(t => t.side !== a.side && alive(t));
    if (passiveIds.has(c.id)) return '전투 시작 시 자동 적용하는 효과입니다.';
    if (phaseIds.has(c.id)) return '전투 페이즈 조건에서 자동 적용하는 효과입니다.';
    if (c.id === 'ECARD_MITA_ICE_CHARGE' && !(a.shields || []).some(s => s.source === 'ECARD_MITA_ICE_SHIELD' && s.value > 0)) return '얼음 방패가 남아 있어야 합니다.';
    if (c.id === 'ECARD_ANDRIUS_SWEEP' && enemies.length < 2) return '살아 있는 상대가 두 명 이상이어야 합니다.';
    if (c.id === 'ECARD_ANDRIUS_WIND_BLADE' && a.andrius?.phase !== 3) return '세 번째 페이즈에서만 사용할 수 있습니다.';
    if (c.id === 'ECARD_ANDRIUS_ROAR' && a.hp / a.maxHp > 0.20) return '체력이 20% 이하일 때 사용할 수 있습니다.';
    return '';
  };
  P.andriusOpponents = function (a) {
    return this.s.runtime.actors.filter(t => t.side !== a.side && alive(t)).sort((x, y) => x.hp - y.hp || x.id.localeCompare(y.id));
  };
  P.andriusRandomTargets = function (a, count) {
    const pool = this.andriusOpponents(a), selected = [];
    while (pool.length && selected.length < count) selected.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]);
    return selected;
  };
  P.andriusGhostWolves = function (a, immediate = false) {
    const b = this.s.runtime, opponents = this.andriusOpponents(a);
    if (!alive(a) || !opponents.length) return;
    const low = opponents.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id.localeCompare(y.id))[0];
    // The script does not require distinct targets; the random wolf may pick low again.
    const random = opponents[Math.floor(this.random() * opponents.length)], applied = new Set();
    for (const target of [low, random]) if (alive(target)) {
      const hit = this.damage(a, target, 0.45, 'CRYO', { range: '전장', card: 'ECARD_ANDRIUS_ROAR', sourceKind: 'SUMMON', noAura: applied.has(target.id) });
      if (hit) applied.add(target.id);
    }
    b.log.push({ actor: a.name, card: 'ECARD_ANDRIUS_GHOST_WOLVES', immediate });
  };
  P.executeAndriusCard = function (a, c, targetId) {
    const b = this.s.runtime;
    if (!b) fail('COMBAT', '전투 중에만 적 카드를 해결할 수 있습니다.');
    const support = this.cardSupport(c); if (support) fail('ENEMY_DEFINITION', support);
    this.initializeMondEnemy(a);
    const opponents = this.andriusOpponents(a).filter(t => this.hasAirAccess(a, t, c.range));
    const target = opponents.find(t => t.id === targetId) || opponents[0];
    const ordered = target ? [target, ...opponents.filter(t => t !== target)] : [];
    const hit = (t, k, el = 'CRYO', options = {}) => alive(a) && alive(t) && this.damage(a, t, k, el, { range: c.range, hitBonus: c.hit, card: c.id, ...options });
    if (passiveIds.has(c.id)) return; // initialization above applies these once.
    switch (c.id) {
      case 'ECARD_MITA_ICE_CHARGE': {
        if (!(a.shields || []).some(s => s.source === 'ECARD_MITA_ICE_SHIELD' && s.value > 0)) fail('ICE_SHIELD', '얼음 방패가 남아 있어야 합니다.');
        if (target && hit(target, 1.10)) this.andriusStatusCheck(a, target, c, 'STATUS_SLOW', 1, Number(c.row[27]), Number(c.row[28]));
        break;
      }
      case 'ECARD_ANDRIUS_CLAW': {
        if (!target) break;
        if (typeof this.nearbyTargets !== 'function' || typeof this.applyCombatAura !== 'function') fail('ANDRIUS_HOOK', '인접 대상·원소 부착 실행기가 필요합니다.');
        const adjacent = this.nearbyTargets(target, target.side, Infinity).filter(t => t.id !== target.id && alive(t))[0];
        const capture = { actor: a.id, target: target.id, amount: null }, previous = this._andriusPrimaryCapture;
        this._andriusPrimaryCapture = capture;
        let landed;
        try { landed = hit(target, 1.25); } finally { this._andriusPrimaryCapture = previous; }
        if (landed && capture.amount === null) fail('ANDRIUS_PACKET_HOOK', '최종 피해 패킷 기록 훅이 연결되지 않았습니다.');
        if (landed) target.nextScorePenalty = Math.max(10, target.nextScorePenalty || 0);
        if (landed && adjacent && alive(adjacent) && capture.amount > 0 && !this.hasElementImmunity(adjacent, 'CRYO')) {
          // Source PRIMARY_DAMAGE*0.60: pre-shield final primary packet, no second DEF/crit roll.
          this.applyDamage(a, adjacent, capture.amount * 0.60, { element: '얼음', card: c.id, sourceKind: 'SPLASH', derivedFrom: target.id, skipSourceModifiers: true });
          if (alive(adjacent)) this.applyCombatAura(a, adjacent, 'CRYO', { card: c.id, sourceKind: 'SPLASH' });
          adjacent.nextScorePenalty = Math.max(10, adjacent.nextScorePenalty || 0);
        }
        break;
      }
      case 'ECARD_ANDRIUS_SWEEP':
        if (opponents.length < 2) fail('ENEMY_CARD_CONDITION', '살아 있는 상대가 두 명 이상이어야 합니다.');
        for (const t of ordered) {
          const slowed = this.andriusIsSlowed(t);
          if (hit(t, 1.05, 'CRYO', { andriusFinalMultiplier: slowed ? 1.20 : 1 }) && !slowed) this.andriusStatusCheck(a, t, c, 'STATUS_SLOW', 1, Number(c.row[27]), Number(c.row[28]));
        }
        break;
      case 'ECARD_ANDRIUS_LEAP': {
        const sorted = ordered.slice().sort((x, y) => Number(this.andriusIsSlowed(y) || !!status(y, 'STATUS_FREEZE')) - Number(this.andriusIsSlowed(x) || !!status(x, 'STATUS_FREEZE')));
        for (const t of sorted.slice(0, 2)) hit(t, 1.65, 'CRYO', { andriusFinalMultiplier: this.andriusIsSlowed(t) || status(t, 'STATUS_FREEZE') ? 1.25 : 1 });
        break;
      }
      case 'ECARD_ANDRIUS_RUN_PHASE': {
        if (a.andrius.runResolved || !(a.hp / a.maxHp <= 0.65 || b.round >= 4)) fail('ENEMY_PHASE', '질주 페이즈 전환 조건이 아닙니다.');
        a.andrius.runResolved = true;
        a.andrius.runResolving = true;
        const used = new Set(), auraApplied = new Set();
        try {
          for (let n = 0; n < 2 && alive(a); n++) {
            const current = this.andriusOpponents(a), t = current.find(x => !used.has(x.id)) || current[0];
            if (!t) break;
            used.add(t.id);
            if (hit(t, 0.85, 'CRYO', { noAura: auraApplied.has(t.id) })) auraApplied.add(t.id);
          }
          const high = this.andriusOpponents(a).sort((x, y) => y.hp - x.hp || x.id.localeCompare(y.id))[0];
          if (high && alive(a)) hit(high, 1.35, 'CRYO', { noAura: auraApplied.has(high.id) });
        } finally { a.andrius.runResolving = false; }
        a.andrius.phase = 2;
        break;
      }
      case 'ECARD_ANDRIUS_PHASE3':
        if (a.andrius.phase !== 2 || a.andrius.phase3Resolved || a.hp / a.maxHp > 0.50) fail('ENEMY_PHASE', '세 번째 페이즈 전환 조건이 아닙니다.');
        a.andrius.phase3Resolved = true; a.andrius.phase = 3;
        break;
      case 'ECARD_ANDRIUS_WIND_BLADE': {
        if (a.andrius.phase !== 3) fail('ENEMY_PHASE', '세 번째 페이즈에서만 사용할 수 있습니다.');
        const pool = ordered.slice().sort((x, y) => Number(y.range === '원거리') - Number(x.range === '원거리') || (x.position?.x ?? x.pos?.x ?? 0) - (y.position?.x ?? y.pos?.x ?? 0)).slice(0, 3);
        const attempts = {}, hits = {}, applied = new Set();
        for (let n = 0; n < 3; n++) {
          const legal = pool.filter(t => alive(t) && (attempts[t.id] || 0) < 2);
          if (!legal.length) { b.log.push({ actor: a.name, card: c.id, unusedProjectile: true }); continue; }
          const t = legal.slice().sort((x, y) => (attempts[x.id] || 0) - (attempts[y.id] || 0))[0];
          attempts[t.id] = (attempts[t.id] || 0) + 1;
          if (hit(t, 0.75, 'ANEMO', { noAura: applied.has(t.id) })) { applied.add(t.id); hits[t.id] = (hits[t.id] || 0) + 1; }
        }
        for (const t of pool) if ((hits[t.id] || 0) >= 2) t.andriusWindEva = { round: b.round + 1 };
        break;
      }
      case 'ECARD_ANDRIUS_ROAR': {
        if (a.hp / a.maxHp > 0.20) fail('ENEMY_CARD_CONDITION', '체력이 20% 이하일 때 사용할 수 있습니다.');
        for (const t of ordered) hit(t, 1.35, 'ANEMO');
        const prior = b.fields.find(f => f.kind === 'ANDRIUS_GHOST_WOLVES' && f.actor === a.id && !f.done && f.rounds > 0);
        const lastTickRound = prior?.lastTickRound ?? null;
        this.addField('ANDRIUS_GHOST_WOLVES', a, 2, { sourceCardId: c.id, lastTickRound });
        if (prior) this.andriusGhostWolves(a, true);
        break;
      }
      default: fail('ENEMY_CARD', '정의되지 않은 몬드 적 카드입니다.');
    }
    a.cooldowns[c.id] = c.cooldown;
    b.log.push({ actor: a.name, card: c.id, cardName: c.name, phase: a.andrius?.phase });
  };
  P.resolveEnemyPhases = function () {
    const b = this.s.runtime;
    if (!b || b.andriusPhaseResolving) return false;
    let changed = false;
    b.andriusPhaseResolving = true;
    try {
      for (const a of b.actors.filter(t => isAndrius(t) && alive(t))) {
        this.initializeMondEnemy(a);
        if (!a.andrius.runResolved && (a.hp / a.maxHp <= 0.65 || b.round >= 4)) {
          this.executeAndriusCard(a, this.andriusCard('ECARD_ANDRIUS_RUN_PHASE'));
          changed = true;
        }
        if (alive(a) && a.andrius.phase === 2 && !a.andrius.phase3Resolved && a.hp / a.maxHp <= 0.50) {
          this.executeAndriusCard(a, this.andriusCard('ECARD_ANDRIUS_PHASE3'));
          changed = true;
        }
      }
    } finally { delete b.andriusPhaseResolving; }
    return changed;
  };
  P.combatActionsPerTurn = function (a) {
    const base = old.combatActionsPerTurn ? old.combatActionsPerTurn.call(this, a) : 1;
    return isAndrius(a) && a.andrius?.phase === 3 ? Math.max(2, base) : base;
  };
  P.executeCard = function (a, c, target, branch) {
    const out = ids.has(c.id) ? this.executeAndriusCard(a, c, target) : old.executeCard.call(this, a, c, target, branch);
    this.resolveEnemyPhases();
    return out;
  };
  P.aiTurn = function (a, targets) {
    this.resolveEnemyPhases();
    if (!alive(a) || !this.s.runtime || !this.andriusOpponents(a).length) return;
    const out = old.aiTurn.call(this, a, targets.filter(alive));
    this.resolveEnemyPhases();
    return out;
  };
  P.prepareAndriusRound = function () {
    const b = this.s.runtime;
    if (!b) return;
    for (const a of b.actors) {
      this.initializeMondEnemy(a);
      if (a.andriusWindEva && a.andriusWindEva.round < b.round) delete a.andriusWindEva;
      if (isAndrius(a) && alive(a)) {
        while (a.andrius.lastRageRound < b.round) {
          a.andrius.lastRageRound++;
          if (a.andrius.lastRageRound >= 2) { a.atk *= 1.10; a.andrius.rageStacks++; }
        }
      }
    }
  };
  P.newRound = function () {
    const b = this.s.runtime;
    if (!b) return;
    this.prepareAndriusRound();
    this.resolveEnemyPhases();
    return old.newRound.call(this);
  };
  P.tickFields = function (timing) {
    // Core roundEnd increments round and calls START fields before newRound.
    // Rage therefore belongs here as well, with an idempotent per-round stamp.
    if (timing === 'START') this.prepareAndriusRound();
    const out = old.tickFields.call(this, timing), b = this.s.runtime;
    if (!b) return out;
    this.resolveEnemyPhases();
    if (timing === 'END') {
      for (const a of b.actors.filter(t => isAndrius(t) && alive(t))) {
        if (a.andrius?.phase === 3 && a.andrius.lastStormRound !== b.round) {
          a.andrius.lastStormRound = b.round;
          for (const t of this.andriusRandomTargets(a, 2)) this.damage(a, t, 0.35, 'CRYO', { range: '전장', card: 'ECARD_ANDRIUS_PHASE3', sourceKind: 'FIELD' });
        }
      }
      for (const field of b.fields.slice()) if (field.kind === 'ANDRIUS_GHOST_WOLVES' && !field.done && field.rounds > 0 && field.lastTickRound !== b.round) {
        field.lastTickRound = b.round;
        const owner = b.actors.find(a => a.id === field.actor);
        if (owner?.hp > 0) this.andriusGhostWolves(owner);
      }
      this.resolveEnemyPhases();
    }
    return out;
  };
  // HOUSE_ROUTE_V1: explicit optional side-boss connection, separate from source map rows.
  const bossEdges=[
    ['HR_EDGE_PLAINS_TO_WOLF','MAP_MOND_PLAINS','MAP_WOLF_ARENA','WORLD_MOVE',1,30,null,null,'Y','북풍의 왕랑 도전 구역으로 이동','HR_EDGE_WOLF_TO_PLAINS','ACTIVE','HOUSE_ROUTE_V1',''],
    ['HR_EDGE_WOLF_TO_PLAINS','MAP_WOLF_ARENA','MAP_MOND_PLAINS','WORLD_MOVE',1,30,null,null,'Y','몬드 외곽 초원으로 돌아가기','HR_EDGE_PLAINS_TO_WOLF','ACTIVE','HOUSE_ROUTE_V1','']
  ];
  const oldRows=P.rows,oldRow=P.row;
  P.rows=function(name){const rows=oldRows.call(this,name);return name==='47_MAP_EDGE_DB'?[...rows,...bossEdges]:rows;};
  P.row=function(name,id){return name==='47_MAP_EDGE_DB'&&bossEdges.find(r=>r[0]===id)||oldRow.call(this,name,id);};
  api.andriusCapabilities = { version: 1, supported: Array.from(ids), bosses: ['BOSS_ANDRIUS'], requires: ['applyCombatAura', 'nearbyTargets', 'core combatActionsPerTurn loop', 'BOSS_ANDRIUS entry allowlist'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRPGRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
