/* Additional exactly defined Mond cards. Load after runtime_combat.js. */
(function (root) {
  'use strict';
  const api = root.CRPGRuntime, P = api.Runtime.prototype;
  const old = Object.fromEntries(['cardSupport', 'cardReason', 'executeCard', 'initCombatActor', 'combatStat', 'basicHit', 'combatDamageMultiplier', 'applyDamage', 'tickFields', 'autoUntilPlayer', 'combatCards'].map(k => [k, P[k]]));
  const supported = new Set(['MOND_EULA_E', 'MOND_EULA_Q', 'MOND_ROSARIA_Q', 'MOND_ROSARIA_PASSIVE_NIGHT']);
  const fail = (code, message) => { throw new api.RuleError(code, message); };
  const copy = value => JSON.parse(JSON.stringify(value));
  const status = (a, id) => (a.statuses || []).find(s => s.id === id && (!Number.isFinite(s.rounds) || s.rounds > 0));
  const clock = runtime => {
    const [h, m] = runtime.s.global.WORLD_TIME.split(':').map(Number);
    return { minute: h * 60 + m, absolute: (Number(runtime.s.global.WORLD_DAY) - 1) * 1440 + h * 60 + m };
  };
  const night = (runtime, actor) => {
    const st = status(actor, 'ROSARIA_NIGHT');
    if (st && clock(runtime).absolute >= st.endsAt) {
      actor.statuses = actor.statuses.filter(s => s !== st);
      return null;
    }
    return st;
  };
  const signature = {
    MOND_EULA_E: 'CHOICE:TAP/HOLD;TAP:DMG:ATK*0.9:CRYO:ENEMY_1;GAIN_STACK:GRIMHEART+1:MAX2;WHILE_STACK:SELF_DEF+10%PER_STACK:STAGGER_RESIST;HOLD:DMG_AOE:ATK*1.4:CRYO:MAX3;EXTRA_HIT_PER_STACK:ATK*0.35:CRYO;CONSUME_ALL:GRIMHEART;APPLY_VULN:CRYO+PHYSICAL:+15%:2R',
    MOND_EULA_Q: 'DMG_AOE:ATK*0.8:CRYO:MAX4;CREATE_RUNTIME:LIGHTFALL_SWORD:2R:STACK=0;ON_SELF_DAMAGE_BY_NORMAL_OR_E_OR_Q:STACK+1:MAX3_PER_ROUND:MAX6_TOTAL;ON_EXPIRE_OR_SELF_LEAVE:DMG_AOE:ATK*(1.2+0.45*STACK):PHYSICAL:MAX4',
    MOND_ROSARIA_Q: 'DMG_AOE:ATK*1.0:CRYO:MAX4;CREATE_FIELD:ICE_LANCE:2R;ROUND_END_DMG:ATK*0.55:CRYO:MAX4;BUFF_ALL_EXCEPT_SELF:CRIT_CURRENT+=MIN(15pp,SOURCE_CRIT_CURRENT*0.15):2R',
    MOND_ROSARIA_PASSIVE_NIGHT: 'IF_WORLD_TIME_IN[20:00,06:00):SELF_CRIT+10pp;FIRST_DAMAGE_DEALT_THIS_COMBAT*1.10;BUFF_END=COMBAT_END_OR_06:00'
  };
  P.cardSupport = function (card) {
    if (supported.has(card.id)) {
      if (!card.ready || card.script !== signature[card.id]) return '카드의 최신 실행 정의와 추가 실행기가 일치하지 않습니다.';
      return '';
    }
    return old.cardSupport.call(this, card);
  };
  P.cardReason = function (actor, card) {
    const reason = old.cardReason.call(this, actor, card);
    if (reason) return reason;
    if (card.id === 'MOND_EULA_Q' && this.s.runtime.fields.some(f => f.kind === 'LIGHTFALL_SWORD' && f.actor === actor.id && !f.done)) return '빛의 검이 이미 유지 중입니다.';
    return '';
  };
  P.combatCards = function (owner) {
    return old.combatCards.call(this, owner).map(card => card.id === 'MOND_EULA_E' ? { ...card, branches: ['TAP', 'HOLD'] } : card);
  };
  P.initCombatActor = function (actor, slot) {
    const a = old.initCombatActor.call(this, actor, slot);
    if (a.source === 'MOND_ROSARIA') {
      const row = this.tables['08_SKILL_CARD_DB']?.get('MOND_ROSARIA_PASSIVE_NIGHT');
      if (row && !this.cardSupport(this.cardDefinition(row))) {
        const time = clock(this);
        if (time.minute >= 1200 || time.minute < 360) {
          const endsAt = time.absolute - time.minute + (time.minute >= 1200 ? 1800 : 360);
          this.addCombatStatus(a, 'ROSARIA_NIGHT', null, { mods: { crit: { flat: 10 } }, firstDamageUsed: false, endsAt });
        }
      }
    }
    return a;
  };
  P.combatStat = function (actor, key) {
    night(this, actor);
    return old.combatStat.call(this, actor, key);
  };
  P.basicHit = function (actor, target, coefficient) {
    const prior = this._mondNormalActor;
    this._mondNormalActor = actor.id;
    try { return old.basicHit.call(this, actor, target, coefficient); }
    finally { this._mondNormalActor = prior; }
  };
  P.combatDamageMultiplier = function (actor, target, element, options = {}) {
    let multiplier = old.combatDamageMultiplier ? old.combatDamageMultiplier.call(this, actor, target, element, options) : 1;
    const nightBuff = night(this, actor);
    if (nightBuff && !nightBuff.firstDamageUsed) multiplier *= 1.1;
    if (status(target, 'EULA_CRYO_PHYSICAL_VULN') && ['CRYO', 'PHYSICAL', '얼음', '물리'].includes(element)) multiplier *= 1.15;
    return multiplier;
  };
  P.applyDamage = function (actor, target, amount, details = {}) {
    const nightBuff = night(this, actor), b = this.s.runtime, logStart = b?.log.length || 0;
    const result = old.applyDamage.call(this, actor, target, amount, details);
    // A broken shield may immediately replenish; inspect actual damage events, not net shield change.
    const dealt = b?.log.slice(logStart).some(event => event.target === target.name && ((event.damage || 0) > 0 || (event.absorbed || 0) > 0));
    if (dealt && nightBuff) nightBuff.firstDamageUsed = true;
    if (b && dealt && actor.source === 'MOND_EULA' && !details.sourceKind && (details.card === 'MOND_EULA_E' || details.card === 'MOND_EULA_Q' || this._mondNormalActor === actor.id)) {
      const sword = b.fields.find(f => f.kind === 'LIGHTFALL_SWORD' && f.actor === actor.id && !f.done);
      if (sword) {
        if (sword.stackRound !== b.round) { sword.stackRound = b.round; sword.roundStacks = 0; }
        if (sword.roundStacks < 3 && sword.stacks < 6) { sword.roundStacks++; sword.stacks++; }
        sword.ownerSnapshot = copy(actor);
      }
    }
    if (b && target.hp <= 0) this.detonateEulaSword(target, 'OWNER_DOWN');
    return result;
  };
  P.detonateEulaSword = function (owner, reason = 'OWNER_LEFT') {
    const b = this.s.runtime; if (!b) return false;
    const id = typeof owner === 'string' ? owner : owner.id;
    const sword = b.fields.find(f => f.kind === 'LIGHTFALL_SWORD' && f.actor === id && !f.done);
    if (!sword) return false;
    const actor = typeof owner === 'object' ? owner : b.actors.find(a => a.id === id) || sword.ownerSnapshot;
    // Mark first, so the explosion and chained owner deaths can never recursively detonate this sword.
    sword.done = true;
    b.log.push({ actor: actor.name, card: 'MOND_EULA_Q_EXPLOSION', stacks: sword.stacks, reason });
    for (const target of b.actors.filter(a => a.side !== actor.side && a.hp > 0 && this.hasAirAccess(actor, a, sword.range)).slice(0, 4)) {
      this.damage(actor, target, 1.2 + 0.45 * sword.stacks, 'PHYSICAL', { range: sword.range, card: 'MOND_EULA_Q', sourceKind: 'LIGHTFALL_EXPLOSION' });
    }
    b.fields = b.fields.filter(f => !f.done);
    return true;
  };
  P.executeCard = function (actor, card, target, branch) {
    if (!supported.has(card.id) || card.id === 'MOND_ROSARIA_PASSIVE_NIGHT') return old.executeCard.call(this, actor, card, target, branch);
    const support = this.cardSupport(card); if (support) fail('CARD_IMPLEMENTATION', support);
    const b = this.s.runtime;
    if (!b) fail('COMBAT', '전투 중에만 카드를 사용할 수 있습니다.');
    const eligible = b.actors.filter(a => a.side !== actor.side && a.hp > 0 && this.hasAirAccess(actor, a, card.range));
    const picked = eligible.find(a => a.id === target), targets = this.combatOrderedTargets ? this.combatOrderedTargets(actor, eligible, target) : (picked ? [picked, ...eligible.filter(a => a !== picked)] : eligible);
    if (!targets.length) fail('TARGET', '현재 사거리로 공격할 대상이 없습니다.');
    const hit = (t, k, more = {}) => this.damage(actor, t, k, 'CRYO', { range: card.range, hitBonus: card.hit, card: card.id, ...more });
    if (card.id === 'MOND_EULA_E') {
      const grimheart = status(actor, 'EULA_GRIMHEART'), stacks = grimheart?.stacks || 0;
      // AI chooses the DB's explicit two-stack hold rule; manual callers must send an explicit branch.
      const mode = actor.control === 'AI' ? (stacks >= 2 ? 'HOLD' : 'TAP') : branch;
      if (!['TAP', 'HOLD'].includes(mode)) fail('CARD_BRANCH', '즉발 또는 홀드를 선택해 주세요.');
      if (mode === 'TAP') {
        hit(targets[0], 0.9);
        const next = Math.min(2, stacks + 1);
        this.addCombatStatus(actor, 'EULA_GRIMHEART', null, { stacks: next, mods: { def: { pct: next * 10 } }, staggerResist: true });
      } else {
        actor.statuses = actor.statuses.filter(s => s.id !== 'EULA_GRIMHEART');
        for (const t of targets.slice(0, 3)) {
          let landed = hit(t, 1.4);
          for (let n = 0; n < stacks && t.hp > 0; n++) landed = hit(t, 0.35, { noAura: landed }) || landed;
          if (stacks && landed && t.hp > 0) this.addCombatStatus(t, 'EULA_CRYO_PHYSICAL_VULN', 2);
        }
      }
    } else if (card.id === 'MOND_EULA_Q') {
      if (b.fields.some(f => f.kind === 'LIGHTFALL_SWORD' && f.actor === actor.id && !f.done)) fail('LIGHTFALL_ACTIVE', '빛의 검이 이미 유지 중입니다.');
      for (const t of targets.slice(0, 4)) hit(t, 0.8);
      this.addField('LIGHTFALL_SWORD', actor, 2, { stacks: 0, roundStacks: 0, stackRound: b.round, expiresEndRound: b.round + 2, ownerSnapshot: copy(actor), range: card.range });
    } else if (card.id === 'MOND_ROSARIA_Q') {
      for (const t of targets.slice(0, 4)) hit(t, 1.0);
      this.addField('ICE_LANCE', actor, 2, { lastTickRound: null, range: card.range });
      const sharedCrit = Math.min(15, this.combatStat(actor, 'crit') * 0.15);
      for (const ally of b.actors.filter(a => a.side === actor.side && a.id !== actor.id && a.hp > 0)) this.addCombatStatus(ally, 'ROSARIA_CRIT_SHARE', 2, { mods: { crit: { flat: sharedCrit } } });
    }
    actor.cooldowns[card.id] = card.cooldown;
    b.log.push({ actor: actor.name, card: card.id, cardName: card.name });
  };
  P.tickFields = function (timing) {
    old.tickFields.call(this, timing);
    const b = this.s.runtime; if (!b || timing !== 'END') return;
    for (const f of b.fields.slice()) {
      if (f.done) continue;
      const actor = b.actors.find(a => a.id === f.actor);
      if (f.kind === 'LIGHTFALL_SWORD') {
        if (!actor || actor.hp <= 0) this.detonateEulaSword(actor || f.actor, 'OWNER_LEFT');
        else if (b.round >= f.expiresEndRound) this.detonateEulaSword(actor, 'EXPIRED');
      } else if (f.kind === 'ICE_LANCE' && f.lastTickRound !== b.round) {
        f.lastTickRound = b.round;
        if (actor?.hp > 0) for (const target of b.actors.filter(a => a.side !== actor.side && a.hp > 0 && this.hasAirAccess(actor, a, f.range)).slice(0, 4)) this.damage(actor, target, 0.55, 'CRYO', { range: f.range, card: 'MOND_ROSARIA_Q', sourceKind: 'FIELD' });
        // CE_049: creation END does not decrement; common roundEnd owns the two full rounds.
      }
    }
    b.fields = b.fields.filter(f => !f.done);
  };
  P.autoUntilPlayer = function () {
    const b = this.s.runtime;
    if (b) for (const f of b.fields.slice()) if (f.kind === 'LIGHTFALL_SWORD' && !f.done && !b.actors.some(a => a.id === f.actor && a.hp > 0)) this.detonateEulaSword(f.actor, 'OWNER_LEFT');
    return old.autoUntilPlayer.call(this);
  };
  api.mondCardCapabilities = { supported: Array.from(supported), unsupported: ['MOND_ROSARIA_E'], reason: '후방 이동·대형 판정에 필요한 전장 위치 규칙 없음' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRPGRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
