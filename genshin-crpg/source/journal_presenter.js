/* Read-only mission and affinity journal. Builds view models from the runtime; never acts or changes a save. */
(function (root) {
  'use strict';
  const STAGE = /_H0([1-5])$/, DEEP = /_B1([12])0$/, BOND_REASON = '함께 활동하며 관계를 더 쌓아 주세요.';
  const RANK = {active:-1, ready:0, travel:1, locked:2, done:3};
  const stageOf = id => Number(String(id).match(STAGE)?.[1] || 0);
  const bondNeed = d => Number(d?.BOND_SCORE_MIN || Number(d?.HEART_MIN || 0) * 20);
  const general = entry => !/ADULT/.test(entry.definition?.RELATION_KIND || '');
  // storyEntryReason reports "go to the place" before every other blocker, so ask again as if
  // the player stood at the entry's map: an empty answer means travelling is all that is left.
  function reasonThere(game, entry) {
    const map = entry.definition?.MAP_ID, g = game.s.global;
    if (!map || map === g.CURRENT_MAP_ID) return entry.reason;
    const facade = Object.create(game);
    facade.s = {...game.s, global:{...g, CURRENT_MAP_ID:map}};
    try { return facade.storyEntryReason(entry.definition); } catch { return entry.reason; }
  }
  // The story the player is inside right now: where it continues, not why it cannot start.
  function activeState(game, entry) {
    const c = game.s.storyContext;
    if (!c || c.kind === 'COMBAT_INTERLUDE' || c.entry !== entry.id) return null;
    const j = game.s.storyJourney;
    return {status:'active', reason:'', map:j ? j.target : null, arrived:!!j && j.target === game.s.global.CURRENT_MAP_ID};
  }
  function progress(game, entry) {
    if (game.storyDone(entry.id)) return {status:'done', reason:''};
    const active = activeState(game, entry);
    if (active) return active;
    if (!entry.reason) return {status:'ready', reason:''};
    const there = reasonThere(game, entry), d = entry.definition || {};
    if (there === '') return {status:'travel', reason:entry.reason, map:d.MAP_ID};
    if (there === BOND_REASON) return {status:'locked', reason:'호감도 ' + bondNeed(d) + '점 필요 · 현재 ' + game.storyBond(d.PROFILE_ID) + '점'};
    return {status:'locked', reason:there || entry.reason};
  }
  function affectionTrack(game, profile, entries = game.storyEntries()) {
    return entries.filter(e => e.kind === 'AFFECTION' && e.profile === profile && general(e))
      .sort((a, b) => (stageOf(a.id) || 9) - (stageOf(b.id) || 9) || a.id.localeCompare(b.id))
      .map(e => {
        const stage = stageOf(e.id), deep = String(e.id).match(DEEP)?.[1];
        return {id:e.id, stage, label:stage ? '일상 교류 · ' + stage + '단계' : '유대 이야기' + (deep ? ' ' + deep : ''),
          short:stage ? stage + '단계' : '유대 이야기' + (deep ? ' ' + deep : ''), need:bondNeed(e.definition), map:e.definition?.MAP_ID || null, ...progress(game, e)};
      });
  }
  // Every character met on this journey, the ones with a story to play right now first.
  function relations(game) {
    const entries = game.storyEntries(), activities = game.relationshipActivityEntries?.() || [], people = game.tables['04_CHAR_DB'];
    return Object.entries(game.s.relations).filter(([profile, r]) => r && r.firstContact !== null && people.get(profile)).map(([profile, r], order) => {
      const track = affectionTrack(game, profile, entries), score = Number(r.BOND_SCORE ?? (r.heart || 0) * 20);
      const acts = activities.filter(a => a.profileId === profile).map(a => ({id:a.id, label:(a.title || a.name) + ' · 30분', reason:a.reason || ''}));
      return {profile, name:people.get(profile)[2], order, score, hearts:Math.min(5, Math.floor(score / 20)), track,
        next:track.find(t => t.status !== 'done') || null, done:track.filter(t => t.status === 'done').length,
        activities:acts, activityReady:acts.some(a => !a.reason)};
    }).sort((a, b) => (RANK[a.next?.status] ?? 3) - (RANK[b.next?.status] ?? 3) || a.order - b.order);
  }
  // What the player has actually taken on: introduced companion missions and the next playable affinity story.
  function inProgress(game) {
    const quests = game.tables['22_QUEST_DB'];
    const legends = game.storyEntries().filter(e => e.kind === 'LEGEND' && game.legendRegistered(e.id) && !game.storyDone(e.id)).map(e => {
      const d = e.definition;
      return {id:e.id, definition:d, title:quests.get(d.QUEST_ID)?.[1] || e.title, name:d.DISPLAY_NAME || e.title, region:d.REGION || '',
        accepted:!!game.s.storyCostReceipts?.[d.QUEST_ID], requirements:game.legendRequirements?.(d, {introduction:false}) || [], ...progress(game, e)};
    }).sort((a, b) => RANK[a.status] - RANK[b.status]);
    const people = relations(game);
    return {legends, affections:people.filter(p => p.next && p.next.status !== 'locked').map(p => ({profile:p.profile, name:p.name, next:p.next})),
      waiting:people.filter(p => p.next?.status === 'locked').length};
  }
  root.CRPGJournalPresenter = {progress, affectionTrack, relations, inProgress};
})(globalThis);
