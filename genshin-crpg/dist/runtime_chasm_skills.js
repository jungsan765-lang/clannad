/* v0.13.18 / gameplay item 1 only. Execute existing Chasm card definitions.
 * No encounter, level, stat, reward, recruitment or story DB edits.
 */
(function (root) {
  'use strict';
  const api = root.CRPGRuntime, P = api.Runtime.prototype;
  const old = Object.fromEntries(['cardSupport', 'startBattle', 'newRound', 'actorCards',
    'cardTargets', 'cardReason', 'executeCard', 'applyDamage', 'aiTurn', 'enemyIntel',
    'validateSave'].map(k => [k, P[k]]));
  const scope = new Set(['MON_HUSK_STANDARD', 'MON_HUSK_BOW', 'MON_BLACK_SERPENT_SWORD']);
  const BANNER = 'ECARD_HUSK_STANDARD_BANNER', VOLLEY = 'ECARD_HUSK_BOW_VOLLEY';
  const COMBO = 'ECARD_BLACK_SWORD_COMBO', BREAKER = 'ECARD_BLACK_SWORD_BREAKER';
  const BREAK_BUFF = 'BLACK_SWORD_BREAKER_ATK_BUFF';
  const specs = {
    [BANNER]: {owner:'MON_HUSK_STANDARD', target:'ENEMY_SIDE_MAX3', trigger:'ACTIVE_IF_AT_LEAST_2_ENEMIES_WITHOUT_SAME_BUFF',
      script:'APPLY_STATUS:STATUS_ATK_UP:VALUE=+10%:2R:REFRESH_ONLY'},
    [VOLLEY]: {owner:'MON_HUSK_BOW', target:'ALLY_MAX2', trigger:'ACTIVE_IF_ALLY_COUNT>=2',
      script:'DMG_AOE:ATK*0.65:PHYSICAL:MAX2;STATUS_CHECK:STATUS_SLOW:1R:BASE55+BONUS5'},
    [COMBO]: {owner:'MON_BLACK_SERPENT_SWORD', target:'ALLY_1', trigger:'ACTIVE',
      script:'MULTIHIT:ATK*0.48:PHYSICAL:HITS=2:ALLY_1;IF_TARGET_HIT2:NEXT_ACTION_SCORE-8'},
    [BREAKER]: {owner:'MON_BLACK_SERPENT_SWORD', target:'ALLY_1', trigger:'ACTIVE_IF_TARGET_HAS_SHIELD',
      script:'DMG:ATK*1.15:PHYSICAL:ALLY_1;SHIELD_DAMAGE*1.50;IF_SHIELD_BROKEN_BY_THIS_ATTACK:APPLY_SELF_ATK_MOD:+10%:2R'}
  };
  const fail = (code, message) => { throw new api.RuleError(code, message); };
  const status = (a, id) => (a.statuses || []).find(s => s.id === id && (!Number.isFinite(s.rounds) || s.rounds > 0));
  const shielded = a => (a.shields || []).some(s => s.value > 0 && (!Number.isFinite(s.rounds) || s.rounds > 0));
  const active = r => r.s?.runtime?.chasmSkillVersion === 1;
  const local = (r, a) => active(r) && a?.side === 'ENEMY' && scope.has(a.source);
  const friends = (r, a) => r.s.runtime.actors.filter(t => t.side === a.side && t.hp > 0);
  const sameBanner = a => status(a, 'STATUS_ATK_UP')?.sourceCard === BANNER;
  const buff = (r, a, id, card) => r.addCombatStatus(a, id, 2, {
    mods: {atk: {pct: 10}}, sourceCard: card, chasmStatus: 1
  });

  // Admission is limited to the exact authored scripts. READY alone is not support.
  P.cardSupport = function (c) {
    const spec = c.enemy && specs[c.id];
    if (!spec) return old.cardSupport.call(this, c);
    return c.ready && c.owner === spec.owner && c.script === spec.script &&
      c.target === spec.target && c.trigger === spec.trigger ? '' :
      '층암거연 기술 정의가 실행기와 일치하지 않습니다.';
  };
  P.startBattle = function (...args) {
    const prior = this._chasmSkillStarting;
    this._chasmSkillStarting = true;
    try { return old.startBattle.apply(this, args); }
    finally { this._chasmSkillStarting = prior; }
  };
  P.newRound = function (...args) {
    const b = this.s.runtime;
    if (b && this._chasmSkillStarting && b.actors.some(a => a.side === 'ENEMY' && scope.has(a.source))) b.chasmSkillVersion = 1;
    return old.newRound.apply(this, args);
  };
  P.actorCards = function (a) {
    const cards = old.actorCards.call(this, a);
    // Already-running older fights outside this scope keep their previous behavior.
    return active(this) ? cards : cards.filter(c => !c.enemy || !specs[c.id]);
  };
  P.cardTargets = function (a, c) {
    if (!local(this, a) || !specs[c.id]) return old.cardTargets.call(this, a, c);
    if (c.id === BANNER) return friends(this, a);
    const legal = old.cardTargets.call(this, a, c);
    return c.id === BREAKER ? legal.filter(shielded) : legal;
  };
  P.cardReason = function (a, c) {
    const reason = old.cardReason.call(this, a, c);
    if (reason || !c.enemy || !specs[c.id]) return reason;
    if (!local(this, a) || a.source !== specs[c.id].owner) return '이 전투에서는 해당 층암거연 기술을 사용할 수 없습니다.';
    if (this.combatActionLocked(a)) return '행동 제한 상태입니다.';
    if (c.id === BANNER && friends(this, a).filter(t => !sameBanner(t)).length < 2) return '같은 기치 강화가 없는 생존 동료가 2명 이상 필요합니다.';
    if (c.id === VOLLEY && this.cardTargets(a, c).length < 2) return '공격 가능한 상대가 2명 이상 필요합니다.';
    if (c.id === BREAKER && !this.cardTargets(a, c).length) return '공격 가능한 보호막 대상이 없습니다.';
    return '';
  };
  P.aiTurn = function (a, targets) {
    if (local(this, a)) {
      if (a.source === 'MON_BLACK_SERPENT_SWORD') targets = targets.slice().sort((x,y) => Number(shielded(y))-Number(shielded(x)) || x.hp-y.hp || x.id.localeCompare(y.id));
      if (a.source === 'MON_HUSK_BOW') targets = targets.slice().sort((x,y) => this.combatStat(y,'spd')-this.combatStat(x,'spd') || y.slot-x.slot || x.id.localeCompare(y.id));
    }
    // Delegate control/decoys/cooldowns to the existing AI; do not change item 7.
    return old.aiTurn.call(this, a, targets);
  };
  P.applyDamage = function (a, t, amount, details = {}) {
    const primaryBreaker = local(this, a) && a.source === specs[BREAKER].owner &&
      a.side !== t.side && details.card === BREAKER && !details.sourceKind;
    return old.applyDamage.call(this, a, t, amount, primaryBreaker ?
      {...details, shieldDamageMultiplier: 1.5} : details);
  };
  P.executeCard = function (a, c, target, branch) {
    if (!c.enemy || !specs[c.id]) return old.executeCard.call(this, a, c, target, branch);
    const reason = this.cardReason(a, c);
    if (reason) fail('CHASM_CARD', reason);
    const b = this.s.runtime, legal = this.cardTargets(a, c);
    const hit = (t, coefficient) => this.damage(a, t, coefficient, 'PHYSICAL', {range:c.range, hitBonus:c.hit, card:c.id, aoe:c.id===VOLLEY});
    if (c.id === BANNER) {
      // Always include the caster. Multiple banners refresh one named status, never multiply it.
      const selected = [a, ...legal.filter(t => t.id !== a.id).sort((x,y) => Number(sameBanner(x))-Number(sameBanner(y)) || x.id.localeCompare(y.id))].slice(0,3);
      for (const t of selected) buff(this, t, 'STATUS_ATK_UP', BANNER);
      this.enemySkillLog(a, c, {targets:selected.map(t=>t.id), text:'심연 기치 · 같은 진영 최대 3명 공격력 +10% (2라운드)'});
    } else {
      const picked = target ? legal.find(t => t.id === target) : legal[0];
      if (!picked) fail('TARGET', '현재 기술에 맞는 살아 있는 대상을 선택해 주세요.');
      if (c.id === COMBO) {
        let hits = 0;
        for (let n=0; n<2 && picked.hp>0 && a.hp>0; n++) if (hit(picked, .48)) hits++;
        if (hits===2 && picked.hp>0) picked.nextScorePenalty = Math.max(8, picked.nextScorePenalty||0);
        this.enemySkillLog(a, c, {targetId:picked.id, hits});
      } else if (c.id === BREAKER) {
        const start = b.log.length;
        const landed = hit(picked, 1.15);
        // Only this primary packet can grant the break bonus. Counterattacks and follow-ups cannot.
        const broken = landed && b.log.slice(start).some(e => e.actor===a.name && e.target===picked.name && e.card===BREAKER && !e.sourceKind && e.brokenShields?.length);
        if (broken && a.hp>0) buff(this, a, BREAK_BUFF, BREAKER);
        this.enemySkillLog(a, c, {targetId:picked.id, shieldBroken:!!broken});
      } else {
        const selected = [picked, ...legal.filter(t=>t.id!==picked.id).sort((x,y)=>this.combatStat(y,'spd')-this.combatStat(x,'spd') || y.slot-x.slot || x.id.localeCompare(y.id))].slice(0,2);
        for (const t of selected) if (a.hp>0 && hit(t,.65) && t.hp>0) {
          // Existing CE_020 formula: base + bonus + proficiency*2 - target resistance, clamped 5..95.
          this.andriusStatusCheck(a,t,c,'STATUS_SLOW',1,55,5);
        }
        this.enemySkillLog(a, c, {targets:selected.map(t=>t.id)});
      }
    }
    a.cooldowns[c.id] = c.cooldown;
  };
  P.enemyIntel = function (id) {
    const out = old.enemyIntel.call(this, id);
    if (out && active(this)) for (const s of out.statuses) if (s.name===BREAK_BUFF) s.name='방벽 절단 · 공격력 증가';
    return out;
  };
  P.validateSave = function (s) {
    const b = s.runtime;
    if (b?.chasmSkillVersion !== undefined && b.chasmSkillVersion !== 1) fail('CHASM_SKILL_VERSION','지원하지 않는 층암거연 전투 저장 버전입니다.');
    if (b?.actors?.some(a=>a.side==='ENEMY'&&scope.has(a.source)) && b.chasmSkillVersion!==1) fail('CHASM_SKILL_SAVE','층암거연 전투 버전 기록이 없습니다. 전투 이전 저장을 사용해 주세요.');
    for (const a of b?.actors||[]) for (const st of a.statuses||[]) if (st.chasmStatus!==undefined) {
      const valid = st.chasmStatus===1 && Number.isInteger(st.rounds) && st.rounds>0 && st.rounds<=2 &&
        Number.isInteger(st.createdRound) && st.createdRound>=1 && st.createdRound<=b.round &&
        st.mods?.atk?.pct===10 && ((st.id==='STATUS_ATK_UP'&&st.sourceCard===BANNER) || (st.id===BREAK_BUFF&&st.sourceCard===BREAKER));
      if (!valid) fail('CHASM_SKILL_SAVE','층암거연 강화 효과의 저장 값이 손상되었습니다.');
    }
    return old.validateSave.call(this, s);
  };
  api.chasmSkillConfig = {version:1, scope:[...scope], cards:Object.keys(specs)};
})(globalThis);
