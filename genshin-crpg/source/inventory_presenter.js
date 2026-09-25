/* Read-only item presentation. Does not call Runtime or change a save. */
(function (root) {
  'use strict';
  const GROUPS = ['장비', '소모품', '음식', '재료', '퀘스트/핵심', '기타'];
  const WEAPON_ICONS = {한손검:'ASSET_ICON_WEAPON_SWORD',양손검:'ASSET_ICON_WEAPON_CLAYMORE',장병기:'ASSET_ICON_WEAPON_POLEARM',법구:'ASSET_ICON_WEAPON_CATALYST',활:'ASSET_ICON_WEAPON_BOW'};
  const STAT_FIELDS = [
    ['ATK','공격력','기본 ATK',''],['DEF','방어력','기본 DEF',''],['MAX_HP','최대 HP','기본 HP',''],
    ['CRIT','치명타 확률','치확%','%'],['CRIT_DMG','치명타 피해','치피%','%'],
    ['SPD','속도','SPD 보정',''],['HIT','명중','명중 보정',''],['EVA','회피','회피 보정',''],['STATUS_RESIST','상태 저항','상태저항 보정','']
  ];
  const EXP_IDS = new Set(['MAT_CHAR_EXP_WANDERER','MAT_CHAR_EXP_ADVENTURER','MAT_CHAR_EXP_HERO']);
  const MEDICINE_IDS = new Set(['TRPG_BANDAGE','TRPG_MEDKIT','TRPG_HEALING_POTION']);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => value == null ? '' : String(value);
  const present = value => value !== undefined && value !== null && value !== '';
  const numeric = value => present(value) && Number.isFinite(Number(value)) ? Number(value) : null;
  const yes = value => value === 'Y' || value === true;
  function table(db, name) {
    const rows = db[name] || [], headers = rows[0] || [];
    return new Map(rows.slice(1).filter(row => row[0]).map(row => [row[0], Object.fromEntries(headers.map((key, i) => [key, row[i] ?? '']))]));
  }
  function field(label, value) { return present(value) ? {label, value:text(value)} : null; }
  function fields(pairs) { return pairs.map(([label,value]) => field(label,value)).filter(Boolean); }
  function create(db, manifest = {}) {
    const items = table(db,'14_ITEM_DB'), equipment = table(db,'16_EQUIP_DB'), quests = table(db,'22_QUEST_DB');
    const statuses=table(db,'13_STATUS_EFFECT_DB'),statNames=Object.fromEntries(STAT_FIELDS.map(([id,label])=>[id,label]));
    function readable(value){
      return text(value).replace(/\bATK\b/g,'공격력').replace(/\bDEF\b/g,'방어력').replace(/ROUND\(MAX_HP[×*]([\d.]+)\)/g,(_,n)=>'최대 HP의 '+Math.round(Number(n)*100)+'%').replace(/\{[^{}]*\}/g,raw=>{try{return Object.entries(JSON.parse(raw)).map(([key,n])=>(statNames[key]||'추가 효과')+' '+(Number(n)>0?'+':'')+n).join(' · ');}catch{return raw;}}).replace(/STATUS_[A-Z0-9_]+/g,id=>statuses.get(id)?.['이름']||'상태 효과').replace(/\bMAX_HP\b/g,'최대 HP').replace(/\bCHAR_ID\b/g,'캐릭터').replace(/\bXP\b/g,'경험치');
    }
    const displayFields=pairs=>fields(pairs).map(f=>({...f,value:readable(f.value)}));
    const assetRows = table(db,'03_IMAGE'), deployed = manifest.assets || {};
    function iconFor(record, isEquipment) {
      const catalog=manifest.itemIcons,recordId=record.ITEM_ID||record.EQUIP_ID,exact=catalog?.icons?.[recordId];
      if(exact)return {id:recordId,registered:true,deployed:true,url:exact.path,label:record['이름']||exact.name,matchType:exact.matchType};
      const categoryLabel=isEquipment?record['장비 종류']:yes(record['퀘스트 아이템 여부'])?'퀘스트/핵심':record['재료 여부']==='Y'?'재료':record['분류'],categoryId=catalog?.categoryByLabel?.[categoryLabel]||(isEquipment?'CATEGORY_EQUIPMENT':'CATEGORY_GADGET'),category=catalog?.categories?.[categoryId];
      if(category)return {id:categoryId,registered:true,deployed:true,url:category.path,label:category.label,matchType:'category_fallback'};
      const explicit = [...assetRows.values()].find(row => row.RECORD_TYPE === 'ASSET' && row.STATUS === 'ACTIVE' && row.OWNER_ID === (record.ITEM_ID || record.EQUIP_ID) && row.ENTITY_TYPE === 'ICON');
      const id = explicit?.ASSET_ROW_ID || (isEquipment ? WEAPON_ICONS[record['장비 종류']] : null);
      const registered = id ? assetRows.get(id) : null, asset = id ? deployed[id] : null;
      return {id:id || null, registered:!!registered, deployed:!!asset, url:asset?.thumbnail || asset?.url || null, label:isEquipment ? record['장비 종류'] : record['분류']};
    }
    function groupFor(record, isEquipment) {
      if (isEquipment) return '장비';
      if (yes(record['퀘스트 아이템 여부'])) return '퀘스트/핵심';
      if (record['분류'] === '음식') return '음식';
      if (yes(record['재료 여부'])) return '재료';
      if (['전투 치료품','소모품','전술 도구','탐험 도구','생활 도구','탐험 장치'].includes(record['분류'])) return '소모품';
      return '기타';
    }
    function actionHint(id, record, isEquipment) {
      if (isEquipment) return 'EQUIPMENT';
      if (EXP_IDS.has(id)) return 'EXPERIENCE';
      if (MEDICINE_IDS.has(id)) return 'COMBAT_MEDICINE';
      if (record['분류'] === '음식') return 'FOOD';
      if (record['분류'] === '전술 도구') return 'TACTICAL_PREPARATION';
      return null;
    }
    function itemDetail(instance, options = {}) {
      const isEquipment = !!instance.equip, id = instance.equip || instance.item;
      const record = (isEquipment ? equipment : items).get(id), quantity = numeric(options.quantity ?? instance.quantity);
      const variant = isEquipment ? null : options.variant || instance.variant || null;
      const base = {
        key:isEquipment ? instance.slot : id + (variant ? ':' + variant : ''), id,
        kind:isEquipment ? 'EQUIPMENT' : 'ITEM', quantity, variant,
        slot:instance.slot || null, issues:[], fields:[], stats:[]
      };
      if (!record) return {...base, name:id || '미등록 소지품', group:'기타', category:'', rarity:'', description:'', effect:'', icon:{id:null,registered:false,deployed:false,url:null,label:''}, actionHint:null, issues:['MISSING_DEFINITION']};
      const sourceName = text(record[isEquipment ? '장비명' : '아이템명']);
      Object.assign(base, {
        name:!isEquipment && variant === 'BARBARA_SPECIAL' ? '[바바라특제요리] ' + sourceName : sourceName,
        sourceName, group:groupFor(record,isEquipment), category:text(record[isEquipment ? '장비 종류' : '분류']),
        rarity:text(record['등급']), description:isEquipment ? '' : readable(record['설명']),
        effect:readable(record[isEquipment ? '고유 효과' : '효과']), icon:iconFor(record,isEquipment),
        actionHint:actionHint(id,record,isEquipment)
      });
      if (!isEquipment) {
        const heal = numeric(record['회복량']);
        base.heal = heal === null ? null : variant === 'BARBARA_SPECIAL' ? heal * 11 / 10 : heal;
        base.material = yes(record['재료 여부']); base.questItem = yes(record['퀘스트 아이템 여부']);
        base.relatedQuests = text(record.RELATED_QUEST_IDS).split(';').filter(Boolean).map(id=>({id,name:quests.get(id)?.['이름']})).filter(q=>q.name);
        if(base.questItem){base.category='퀘스트 아이템';base.questLabel=base.relatedQuests.map(q=>q.name).join(' · ')||(record.ITEM_ID==='KEY_CRPG_ANEMOCULUS'?'몬드의 바람 · 탐험 수집':'');}
        base.fields = displayFields([
          ['관련 임무',base.questLabel],['설명',record['설명']],['효과',record['효과']],['회복량',base.heal === null ? record['회복량'] : base.heal],
          ['사용 가능 상황',record['사용 가능 상황']],['대상',record['배분 대상']],['지속 시간',record['지속 시간']],
          ['사용 제한',record['포만/사용 제한']],['획득처',record['획득처']],['판매가',record['판매가']],['구매가',record['구매가']]
        ]);
        return base;
      }
      base.enhance = numeric(instance.enhance) ?? 0;
      base.equipped = instance.equipped === true; base.owner = instance.owner || null;
      base.minimumLevel = numeric(record['최소 레벨']);
      base.equipmentCategory = WEAPON_ICONS[record['장비 종류']] ? 'WEAPON' : ({방어구:'ARMOR',장신구:'ACCESSORY',특수:'SPECIAL'}[record['장비 종류']] || null);
      let profile = {};
      if (record.ENHANCEMENT_PROFILE_JSON) {
        try { profile = JSON.parse(record.ENHANCEMENT_PROFILE_JSON); if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw Error('profile'); }
        catch { profile = {}; base.issues.push('INVALID_ENHANCEMENT_PROFILE'); }
      }
      const additions = {}, overrides = {}, appliedMilestones = [];
      // Numeric keys are cumulative milestones; each override replaces the earlier value.
      for (const [level,milestone] of Object.entries(profile.milestones || {}).sort((a,b) => Number(a[0])-Number(b[0]))) {
        if (!Number.isFinite(Number(level)) || Number(level) > base.enhance) continue;
        appliedMilestones.push(Number(level));
        for (const [key,value] of Object.entries(milestone.stats_add || {})) {
          if (typeof value === 'number' && Number.isFinite(value)) additions[key] = (additions[key] || 0) + value;
          else base.issues.push('INVALID_ENHANCEMENT_STAT:' + key);
        }
        Object.assign(overrides,clone(milestone.effect_override || {}));
      }
      base.stats = STAT_FIELDS.map(([key,label,column,unit]) => {
        const value = numeric(record[column]);
        return {key,label,unit,base:value,enhancement:additions[key] || 0,value:value === null ? null : value+(additions[key] || 0)};
      }).filter(stat => stat.value !== null && (stat.value !== 0 || stat.enhancement !== 0));
      base.enhancement = {
        allowed:yes(record.ENHANCE_ALLOWED), limit:numeric(record.ENHANCE_LIMIT), reason:text(record.NO_ENHANCE_REASON),
        growthText:readable(record['강화 성장']), appliedMilestones, statsAdd:clone(additions), effectOverrides:clone(overrides),
        requiresEffectHandler:profile.requires_effect_handler === true
      };
      const pct=n=>Math.round(n*100)+'%',effectLines=[];
      const effectNames={wet_cryo_damage_bonus:n=>'물/얼음 부착 대상에게 주는 피해 +'+pct(n),wet_pyro_damage_bonus:n=>'물/불 부착 대상에게 주는 피해 +'+pct(n),on_kill_heal_flat:n=>'적 처치 후 HP '+n+' 회복',after_skill_next_normal_bonus:n=>'스킬 사용 후 다음 일반 공격 피해 +'+pct(n),normal_damage_bonus:n=>'일반 공격 피해 +'+pct(n),first_hit_damage_bonus:n=>'전투 첫 적중 피해 +'+pct(n),close_shot_damage_bonus:n=>'근거리 사격 피해 +'+pct(n),exposed_weakpoint_damage_bonus:n=>'약점/노출 부위 공격 피해 +'+pct(n),received_heal_bonus:n=>'받는 회복량 +'+pct(n),skill_damage_bonus:n=>'스킬 피해 +'+pct(n),normal_charged_damage_bonus:n=>'일반·차지 공격 피해 +'+pct(n),normal_charged_damage_bonus_when_all_e_q_ready:n=>'모든 스킬을 사용할 수 있을 때 일반·차지 공격 피해 +'+pct(n),on_skill_hit_q_cooldown_reduce:n=>'스킬 적중 시 궁극기 재사용 대기시간 '+n+'라운드 감소'+(overrides.once_per_battle?' · 전투당 1회':''),on_hit_atk_def_per_stack:n=>'공격 적중마다 공격력·방어력 +'+pct(n)+' · 최대 '+overrides.stack_cap+'중첩 · '+overrides.duration_rounds+'라운드',consecutive_hit_atk_per_stack:n=>'연속 적중마다 공격력 +'+pct(n)+' · 최대 '+overrides.stack_cap+'중첩 · '+overrides.duration_rounds+'라운드'};
      for(const [key,n]of Object.entries(overrides))if(effectNames[key])effectLines.push(effectNames[key](n));
      if(effectLines.length){if(id==='EQ_BOW_RUST')effectLines.push(base.effect);if(id==='EQ_ACC_VITAL_RING')effectLines.push('전투 종료·이동·시간 경과만으로 HP가 회복되지는 않습니다.');base.effect=effectLines.join('\n');}
      base.fields = displayFields([
        ['장착 가능 대상',record['장착 가능 대상']],['보조 스탯',record['기타 보조 스탯']],
        ['기본 고유 효과',record['고유 효과']],['강화 성장',record['강화 성장']],['최소 레벨',record['최소 레벨']],
        ['전용 대상',record['전용 대상']],['사거리 보정',record['사거리 보정']],['획득처',record['획득처/조건']],['판매가',record['판매가']]
      ]);
      return base;
    }
    function inventoryEntries(state) {
      const result = [], stacks = new Map();
      for (const instance of state.inventory || []) {
        if (!(instance.quantity > 0)) continue;
        if (instance.equip) { result.push(itemDetail(instance)); continue; }
        if (!instance.item || instance.item === 'CUR_MORA') continue; // Currency is global.MORA.
        stacks.set(instance.item,(stacks.get(instance.item) || 0)+instance.quantity);
      }
      for (const [id,quantity] of stacks) {
        const record = items.get(id), special = state.specialFoodLots?.[id]?.BARBARA_SPECIAL || 0;
        if (record?.['분류'] === '음식') {
          if (!Number.isSafeInteger(special) || special < 0 || special > quantity) {
            const detail = itemDetail({item:id,quantity}); detail.issues.push('INVALID_FOOD_LOT'); result.push(detail); continue;
          }
          if (quantity > special) result.push(itemDetail({item:id,quantity:quantity-special},{variant:'NORMAL'}));
          if (special > 0) result.push(itemDetail({item:id,quantity:special},{variant:'BARBARA_SPECIAL'}));
        } else result.push(itemDetail({item:id,quantity}));
      }
      return result.sort((a,b) => GROUPS.indexOf(a.group)-GROUPS.indexOf(b.group) || a.name.localeCompare(b.name,'ko') || text(a.key).localeCompare(text(b.key)));
    }
    return {itemDetail,inventoryEntries};
  }
  const api = {create,GROUPS:GROUPS.slice(),WEAPON_ICONS:{...WEAPON_ICONS},itemDetail:(db,instance,options={}) => create(db,options.manifest).itemDetail(instance,options)};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CRPGInventoryPresenter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
