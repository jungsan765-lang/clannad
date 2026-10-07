/* 0.16.2 기술 연출 (user, 2026-10-07: 「살을 에는 윤무 효과가 하나도 없으니 이거 뭐 보이지가 않노... 캐릭터마다 스킬 쓰면 그에
 * 해당하는 이펙트랑 SE들을 다 만들어야 하지 않겠냐...? 드발린이나, 오셀, 필드보스 등등 전부 다 체크해서 스킬 이펙트 없는 놈들
 * 다 만들어야 돼」).
 * - Every playable elemental skill (E) pops its own talent picture (the original game's, content/genshin-ui-assets.json)
 *   over the caster with a ring of its element; every burst (Q) crosses the board as a band with the character's picture,
 *   the burst's picture and official name, then bursts in its element. The beat before a burst is a little longer so the
 *   band can be seen; a 공명 각성 band (app_resonance.js) takes its place when the burst awakens.
 * - What a skill does lands its own way (falling hail, a planet, rain swords, a tornado, a wave, lightning…), and what it
 *   leaves is drawn while it lasts, from the battle itself: fields, summons, stances, debuffs, shields, terrain. A
 *   field's tick strikes the same way.
 * - Bosses and named enemies: a wind-up 「…준비」 glows on the boss with the move's name; storms, frost, floods, the
 *   formation, a deluge, reinforcements and summons show on the board. Osial's 마신의 대해일 is named as such.
 * - Sounds are Genshin recordings only (app_sound.js: skill_e, skill_q, cast_*, summon, shield_up, telegraph, hazard,
 *   reinforce, tick_*).
 * Presentation only: frames (presentation.js), the battle and the DOM are read and no game state is written. 움직임
 * 줄이기 keeps short fades only, the battle speed scales every duration, the playback's pause holds them, and nothing
 * here takes a click. Load after app_battle_fx_v01521.js. */
(function(){
'use strict';
const TINT={pyro:'#ff8a50',hydro:'#4cc2f1',cryo:'#a6e4f2',electro:'#c79bff',anemo:'#74e0c2',geo:'#f5c542',dendro:'#a5d63b',neutral:'#f3dfae',physical:'#f3dfae'};
const FRAME_EL={fire:'pyro',water:'hydro',ice:'cryo',lightning:'electro',wind:'anemo',rock:'geo',dendro:'dendro'};
const CUE_EL={pyro:'fire',hydro:'water',cryo:'ice',electro:'lightning',anemo:'wind',geo:'rock',dendro:'dendro'};
const KO_EL={'불':'pyro','물':'hydro','얼음':'cryo','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro',PYRO:'pyro',HYDRO:'hydro',CRYO:'cryo',ELECTRO:'electro',ANEMO:'anemo',GEO:'geo',DENDRO:'dendro'};

// ---- who casts what ---------------------------------------------------------------------------------------------
// Every playable fighter and the element they fight with: the wish pools (runtime_wish_v01411.js), 자백, the Traveler by
// the element they resonate with, and 이세계인 (no element).
const ROSTER={MOND_ALBEDO:'geo',MOND_AMBER:'pyro',MOND_BARBARA:'hydro',MOND_BENNETT:'pyro',MOND_DAHLIA:'hydro',MOND_DILUC:'pyro',MOND_DIONA:'cryo',MOND_EULA:'cryo',MOND_FISCHL:'electro',MOND_JEAN:'anemo',MOND_KAEYA:'cryo',MOND_KLEE:'pyro',MOND_LISA:'electro',MOND_MIKA:'cryo',MOND_MONA:'hydro',MOND_NOELLE:'geo',MOND_RAZOR:'electro',MOND_ROSARIA:'cryo',MOND_SUCROSE:'anemo',MOND_VENTI:'anemo',
 LIYUE_BAIZHU:'dendro',LIYUE_BEIDOU:'electro',LIYUE_CHONGYUN:'cryo',LIYUE_GAMING:'pyro',LIYUE_GANYU:'cryo',LIYUE_HUTAO:'pyro',LIYUE_KEQING:'electro',LIYUE_LANYAN:'anemo',LIYUE_NINGGUANG:'geo',LIYUE_QIQI:'cryo',LIYUE_SHENHE:'cryo',LIYUE_TARTAGLIA:'hydro',LIYUE_XIANGLING:'pyro',LIYUE_XIANYUN:'anemo',LIYUE_XIAO:'anemo',LIYUE_XINGQIU:'hydro',LIYUE_XINYAN:'pyro',LIYUE_YANFEI:'pyro',LIYUE_YAOYAO:'dendro',LIYUE_YELAN:'hydro',LIYUE_YUNJIN:'geo',LIYUE_ZHONGLI:'geo',LIYUE_ZIBAI:'geo',
 TRAVELER_ANEMO:'anemo',TRAVELER_GEO:'geo',ISEKAI:null};
const cardIdsOf=key=>key.startsWith('TRAVELER_')||key==='ISEKAI'?['PLAYER_'+key+'_E','PLAYER_'+key+'_Q']:[key+'_E',key+'_Q'];
// What lands when a skill resolves and what it leaves behind.
//  hit: drawn on each fighter it damaged · area: once over the opponents' side · self: on the caster · allies: on each ally
//  summon: the summon's own picture pops out · field: the field drawn over a side while it lasts · persist: what stays
//  on a card (decorate() draws it from the battle while it lasts) · shape: the falling thing of a rain/petal effect.
const FX={
 MOND_ALBEDO_E:{hit:'sigil'},MOND_ALBEDO_Q:{hit:'bloom',area:'quake'},
 MOND_AMBER_E:{summon:'BUNNY'},MOND_AMBER_Q:{area:'rain',shape:'arrow'},
 MOND_BARBARA_E:{self:'ring',persist:'STATUS_BARBARA_MELODY_LOOP'},MOND_BARBARA_Q:{self:'ring',allies:'petals'},
 MOND_BENNETT_E:{hit:'flames'},MOND_BENNETT_Q:{self:'ring',allies:'sigil',field:'ENCOURAGEMENT'},
 MOND_DAHLIA_E:{self:'ring',persist:'MIST_TRACE'},MOND_DAHLIA_Q:{area:'wave'},
 MOND_DILUC_E:{hit:'flames'},MOND_DILUC_Q:{area:'dash',shape:'phoenix'},
 MOND_DIONA_E:{hit:'spikes'},MOND_DIONA_Q:{field:'FROST_MIST'},
 MOND_EULA_E:{hit:'spikes'},MOND_EULA_Q:{field:'LIGHTFALL_SWORD',hit:'swordfall'},
 MOND_FISCHL_E:{summon:'OZ',hit:'bolt'},MOND_FISCHL_Q:{area:'dash',shape:'raven',hit:'bolt'},
 MOND_JEAN_E:{hit:'vortex'},MOND_JEAN_Q:{area:'tornado',allies:'petals',shape:'seed'},
 MOND_KAEYA_E:{hit:'spikes'},MOND_KAEYA_Q:{self:'orbit',persist:'ICE'},
 MOND_KLEE_E:{hit:'meteor',field:'KLEE_MINE'},MOND_KLEE_Q:{field:'BOMBARD'},
 MOND_LISA_E:{hit:'bolt'},MOND_LISA_Q:{field:'ROSE',hit:'bolt'},
 MOND_MIKA_E:{hit:'pierce'},MOND_MIKA_Q:{self:'ring',allies:'petals',shape:'feather'},
 MOND_MONA_E:{field:'PHANTOM'},MOND_MONA_Q:{hit:'bubble',area:'rain',shape:'star'},
 MOND_NOELLE_E:{hit:'spikes',self:'ring'},MOND_NOELLE_Q:{area:'quake',self:'aura'},
 MOND_RAZOR_E:{hit:'bolt'},MOND_RAZOR_Q:{hit:'bolt',self:'aura'},
 MOND_ROSARIA_E:{hit:'pierce'},MOND_ROSARIA_Q:{field:'ICE_LANCE',hit:'spikes'},
 MOND_SUCROSE_E:{hit:'vortex'},MOND_SUCROSE_Q:{field:'WIND_SPIRIT'},
 MOND_VENTI_E:{hit:'vortex',allies:'updraft'},MOND_VENTI_Q:{area:'tornado'},
 LIYUE_BAIZHU_E:{hit:'chain'},LIYUE_BAIZHU_Q:{self:'orbit',persist:'BAIZHU_SEAMLESS_SHIELD'},
 LIYUE_BEIDOU_E:{self:'aura',persist:'LIYUE_COUNTER'},LIYUE_BEIDOU_Q:{self:'ring',allies:'aura',field:'STORMBREAKER'},
 LIYUE_CHONGYUN_E:{hit:'spikes',allies:'sigil',field:'CHONGYUN_FROST'},LIYUE_CHONGYUN_Q:{hit:'swordfall'},
 LIYUE_GAMING_E:{hit:'meteor'},LIYUE_GAMING_Q:{hit:'flames',self:'ring'},
 LIYUE_GANYU_E:{field:'ICE_LOTUS'},LIYUE_GANYU_Q:{field:'CELESTIAL_SHOWER'},
 LIYUE_HUTAO_E:{self:'aura',persist:'PARAMITA_PAPILIO'},LIYUE_HUTAO_Q:{hit:'flames',area:'wave'},
 LIYUE_KEQING_E:{hit:'mark'},LIYUE_KEQING_Q:{area:'dash',hit:'bolt'},
 LIYUE_LANYAN_E:{hit:'vortex'},LIYUE_LANYAN_Q:{area:'dash',shape:'swallow',hit:'vortex'},
 LIYUE_NINGGUANG_E:{hit:'stars',field:'JADE_SCREEN'},LIYUE_NINGGUANG_Q:{hit:'stars'},
 LIYUE_QIQI_E:{self:'orbit',persist:'HERALD_OF_FROST'},LIYUE_QIQI_Q:{hit:'talisman'},
 LIYUE_SHENHE_E:{hit:'pierce',self:'orbit',persist:'ICY_QUILL'},LIYUE_SHENHE_Q:{field:'DIVINE_MAIDEN'},
 LIYUE_TARTAGLIA_E:{hit:'pierce',self:'aura'},LIYUE_TARTAGLIA_Q:{area:'wave',hit:'bubble'},
 LIYUE_XIANGLING_E:{summon:'GOU_BA'},LIYUE_XIANGLING_Q:{self:'orbit',persist:'PYRONADO'},
 LIYUE_XIANYUN_E:{allies:'updraft'},LIYUE_XIANYUN_Q:{self:'ring',allies:'petals',shape:'star'},
 LIYUE_XIAO_E:{area:'dash'},LIYUE_XIAO_Q:{self:'aura',persist:'BANE_OF_ALL_EVIL'},
 LIYUE_XINGQIU_E:{hit:'swordfall',self:'orbit',persist:'RAIN_SWORDS'},LIYUE_XINGQIU_Q:{area:'rain',shape:'sword',self:'ring',field:'RAINCUTTER'},
 LIYUE_XINYAN_E:{hit:'flames',self:'ring'},LIYUE_XINYAN_Q:{area:'quake',hit:'flames'},
 LIYUE_YANFEI_E:{hit:'flames'},LIYUE_YANFEI_Q:{hit:'flames',self:'aura'},
 LIYUE_YAOYAO_E:{summon:'YUEGUI_THROWING'},LIYUE_YAOYAO_Q:{area:'rain',shape:'jade',allies:'petals'},
 LIYUE_YELAN_E:{hit:'lifeline'},LIYUE_YELAN_Q:{self:'orbit',persist:'EXQUISITE_THROW'},
 LIYUE_YUNJIN_E:{self:'aura',persist:'LIYUE_COUNTER'},LIYUE_YUNJIN_Q:{self:'ring',allies:'aura',field:'FLYING_CLOUD_FLAG'},
 LIYUE_ZHONGLI_E:{self:'orbit',persist:'STONE_STELE'},LIYUE_ZHONGLI_Q:{area:'planet'},
 LIYUE_ZIBAI_E:{self:'aura',persist:'AGE_GAP'},LIYUE_ZIBAI_E_CHARGE:{area:'dash'},LIYUE_ZIBAI_Q:{area:'quake',hit:'sigil'},
 PLAYER_TRAVELER_ANEMO_E:{hit:'vortex'},PLAYER_TRAVELER_ANEMO_Q:{area:'tornado'},
 PLAYER_TRAVELER_GEO_E:{hit:'meteor'},PLAYER_TRAVELER_GEO_Q:{area:'quake',hit:'spikes'},
 PLAYER_ISEKAI_E:{hit:'mark'},PLAYER_ISEKAI_Q:{area:'dash',shape:'joint'}
};
// The characters with their own recording of a skill (app_sound.js); everyone else uses the element's cast and the
// burst-ready chime.
const OWN_CUE={MOND_VENTI_E:'skill_e_venti',MOND_VENTI_Q:'skill_q_venti',LIYUE_ZHONGLI_Q:'skill_q_zhongli',LIYUE_HUTAO_Q:'skill_q_hutao'};
// Skills that raise shields (runtime_combat.js does not log a raise): who gets one when the battle cannot be read.
const SHIELDS={LIYUE_ZHONGLI_E:['party','geo'],MOND_DAHLIA_Q:['party','hydro'],MOND_NOELLE_E:['self','geo'],MOND_DIONA_E:['ally','cryo'],LIYUE_LANYAN_E:['ally','anemo'],LIYUE_XINYAN_E:['ally','pyro']};
const SPEC={};
for(const [key,el]of Object.entries(ROSTER)){const owner=key.startsWith('TRAVELER_')||key==='ISEKAI'?'PLAYER_CUSTOM':key;
 cardIdsOf(key).forEach((id,i)=>{const slot=i?'q':'e';SPEC[id]={id,key,owner,slot,el:el||'neutral',cue:OWN_CUE[id]||(slot==='q'?'skill_q':el?'cast_'+CUE_EL[el]:'skill_e'),...FX[id]};});}
SPEC.LIYUE_ZIBAI_E_CHARGE={id:'LIYUE_ZIBAI_E_CHARGE',key:'LIYUE_ZIBAI',owner:'LIYUE_ZIBAI',slot:'e',el:'geo',cue:'cast_rock',...FX.LIYUE_ZIBAI_E_CHARGE};
const impactCue=s=>s.summon?'summon':SHIELDS[s.id]?'shield_up':s.slot==='q'||s.field||s.persist?(s.el==='neutral'?'skill_e':'cast_'+CUE_EL[s.el]):null;

// What a field, summon or status looks like while it lasts. card: on the caster's card · allies: on every card of its
// side · zone: over a side of the board (foe: the opponents of its owner).
const FIELD_LOOK={ICE:['card','blades','cryo'],PYRONADO:['card','pyronado','pyro'],RAIN_SWORDS:['card','rainswords','hydro'],EXQUISITE_THROW:['card','dice','hydro'],HERALD_OF_FROST:['card','herald','cryo'],ICY_QUILL:['card','quills','cryo'],STONE_STELE:['construct','stele','geo'],BAIZHU_SEAMLESS_SHIELD:['card','seamless','dendro'],MIST_TRACE:['card','mist','hydro'],
 STORMBREAKER:['allies','arcs','electro'],FLYING_CLOUD_FLAG:['allies','banner','geo'],ENCOURAGEMENT:['allies','encourage','pyro'],CHONGYUN_FROST:['allies','frost','cryo'],BAMBOO_STAR:['allies','stars','anemo'],RAINCUTTER:['allies','raincut','hydro'],DANDELION:['allies','seeds','anemo'],
 CELESTIAL_SHOWER:['foe','hail','cryo'],BOMBARD:['foe','sparks','pyro'],WIND_SPIRIT:['foe','vortex','anemo'],ROSE:['foe','rose','electro'],FROST_MIST:['foe','fog','cryo'],DIVINE_MAIDEN:['foe','talismans','cryo'],ICE_LANCE:['foe','lance','cryo'],FIRE_STAGE:['foe','fire','pyro'],KLEE_MINE:['foe','mines','pyro'],PHANTOM:['foe','phantom','hydro'],LIGHTFALL_SWORD:['foe','sword','cryo'],ANDRIUS_GHOST_WOLVES:['foe','wolves','cryo'],
 JADE_SCREEN:['own','jade','geo'],ICE_LOTUS:['own','lotus','cryo']};
// Statuses that show on the card that carries them (stances, buffs, marks).
const STATUS_LOOK={STATUS_BARBARA_MELODY_LOOP:['melody','hydro'],LIYUE_COUNTER:['counter',null],PARAMITA_PAPILIO:['papilio','pyro'],BANE_OF_ALL_EVIL:['bane','anemo'],AGE_GAP:['moon','geo'],SKY_LADDER:['cloud','anemo'],MELEE_FORM:['stance','hydro'],NOELLE_SWEEP:['stance','geo'],DILUC_INFUSION:['stance','pyro'],THUNDERWOLF:['stance','electro'],BRILLIANCE:['seal','pyro'],SCARLET_SEAL:['seal','pyro'],ENCOURAGEMENT_TAG:['encourage','pyro'],HAWK_FEATHER:['feather','cryo'],LEVITATION:['lift','anemo'],STATUS_TACTICAL_LEVITATION:['lift','anemo'],SKILL_COEFF:['glint','geo'],REACTION_BOOST:['glint','anemo'],MIKA_SPEED:['glint','cryo'],EULA_GRIMHEART:['stance','cryo'],BREAKTHROUGH:['glint','hydro'],CHILI_BUFF:['glint','pyro'],ROSARIA_CRIT_SHARE:['glint','cryo'],
 ILLUSORY_BUBBLE:['bubble','hydro'],OMEN:['omen','hydro'],FORTUNE_TALISMAN:['talisman','cryo'],BLOOD_BLOSSOM:['blossom','pyro'],LIYUE_PETRIFY:['petrify','geo'],LIYUE_BOSS_PETRIFY:['petrify','geo'],LIFTED:['lift','anemo'],RIPTIDE:['riptide','hydro'],ANEMO_VULN:['glint','anemo'],AGENT_STEALTH:['stealth','pyro'],ENEMY_CHARGE_EXPOSED:['expose','neutral'],RUIN_VARIANT_CORE_EXPOSED:['expose','neutral'],PHYS_VULN:['glint','physical']};
// Parts (child elements) a look needs.
const PARTS={blades:3,pyronado:2,rainswords:3,dice:2,herald:1,quills:3,seamless:4,cicin:2,stele:1,mist:3,melody:4,counter:1,papilio:5,bane:5,moon:3,cloud:3,stance:5,seal:3,encourage:3,feather:2,lift:3,glint:3,arcs:3,banner:2,frost:3,stars:4,raincut:3,seeds:4,bubble:1,omen:1,talisman:1,blossom:1,petrify:2,riptide:1,stealth:2,expose:1,armour:1,stun:3,burrow:3,warn:0,
 hail:10,sparks:7,vortex:2,rose:3,fog:3,talismans:5,lance:2,fire:5,mines:3,phantom:2,sword:1,wolves:3,jade:1,lotus:5,storm:6,blizzard:10,formation:2,heat:5,frostfield:4,lightning:3,flood:3,corrosion:4,leyline:3,crumble:6};
// Field-boss and boss moves by the card each logs (field bosses log FB_<move>; a wind-up is FB_<move>_READY).
const ENEMY={
 FB_GUST:{hit:'gust',el:'anemo'},FB_PULL:{hit:'vortex',el:'anemo'},FB_SLAM:{hit:'meteor',el:'anemo',area:'quake'},FB_RISE:{self:'rise',el:'anemo'},
 FB_SPIKES:{hit:'bolt',el:'electro'},FB_HAMMER:{hit:'bolt',el:'electro'},FB_STORM:{hit:'bolt',el:'electro',hazard:true},FB_PRISM:{hit:'bolt',el:'electro'},
 FB_WHIP:{hit:'gust',el:'cryo'},FB_SPREAD:{el:'cryo',hazard:true},FB_ORBS:{hit:'meteor',el:'cryo'},FB_LANCE:{hit:'pierce',el:'cryo'},FB_BLAST:{hit:'spikes',el:'cryo',hazard:true},FB_WALL:{self:'armour',el:'cryo'},
 FB_ROCKFALL:{hit:'meteor',el:'geo'},FB_UPHEAVAL:{hit:'spikes',el:'geo',area:'quake'},
 FB_VINE:{hit:'gust',el:'pyro'},FB_BOMBS:{hit:'meteor',el:'pyro'},FB_LASH:{hit:'gust',el:'physical'},
 FB_SPOUT:{hit:'pierce',el:'hydro'},FB_WAVE:{hazard:true},FB_CLAW:{hit:'claw',el:'geo'},FB_LEAP:{hit:'meteor',el:'geo',area:'quake'},FB_BEAM:{area:'beam'},FB_BEAM_REFLECT:{self:'shatter'},
 FB_BURROW:{self:'burrow',el:'physical'},FB_EMERGE:{hit:'spikes',el:'physical',area:'quake'},FB_CHARGE:{area:'dash',el:'physical'},FB_BIND:{hit:'bind',el:'physical'},FB_HEAD:{self:'expose'},
 FB_STUNNED:{self:'stun'},FB_REVIVING:{self:'revive'},FB_OCEANID_FORMS:{area:'splash',el:'hydro',cue:'summon'},FB_PRIMO_INFUSE:{self:'absorb'},
 FB_FB_MIMIC_BOAR:{hit:'pierce',el:'hydro'},FB_FB_MIMIC_CRANE:{hit:'pierce',el:'hydro'},FB_FB_MIMIC_FROG:{hit:'bubble',el:'hydro'},FB_FB_MIMIC_CRAB:{hit:'claw',el:'hydro'},FB_FB_MIMIC_FALCON:{hit:'pierce',el:'hydro'},
 TWIN_HUNT_MARK:{self:'roar',el:'cryo'},TWIN_FIELD:{hazard:true},
 ECARD_DVALIN_BREATH:{area:'beam',el:'anemo'},ECARD_DVALIN_DIVE:{hit:'meteor',el:'anemo',area:'quake'},
 ECARD_ANDRIUS_CLAW:{hit:'claw',el:'cryo'},ECARD_ANDRIUS_SWEEP:{area:'wave',el:'cryo'},ECARD_ANDRIUS_LEAP:{hit:'meteor',el:'cryo'},ECARD_ANDRIUS_RUN_PHASE:{area:'dash',el:'cryo'},ECARD_ANDRIUS_PHASE3:{area:'blizzard',el:'cryo',self:'absorb'},ECARD_ANDRIUS_WIND_BLADE:{hit:'gust',el:'anemo'},ECARD_ANDRIUS_ROAR:{self:'roar',el:'anemo',cue:'summon'},ECARD_ANDRIUS_GHOST_WOLVES:{hit:'claw',el:'cryo'},
 OSIAL_DELUGE:{area:'deluge',el:'hydro'},ECARD_OSIAL_DELUGE:{area:'deluge',el:'hydro'},ECARD_ISK_L04_OSIAL_DELUGE:{area:'deluge',el:'hydro'},
 ECARD_AZHDAHA_QUAKE:{area:'quake',el:'geo'},ECARD_AZHDAHA_ELEMENT_ERUPTION:{hit:'pillar'},ECARD_AZHDAHA_TAILSTORM:{area:'quake',hit:'meteor',el:'geo'},ECARD_AZHDAHA_PHASE_SHIFT:{self:'absorb'},ECARD_AZHDAHA_ELEMENT_CORE:{self:'absorb'},ECARD_AZHDAHA_ZHONGLI:{self:'absorb',el:'geo'},
 ECARD_CICIN_ELECTRO_SUMMON:{self:'cicin',el:'electro',cue:'summon'},ECARD_CICIN_CRYO_SUMMON:{self:'cicin',el:'cryo',cue:'summon'},ECARD_CICIN_ELECTRO_BURST:{hit:'bolt',el:'electro'},
 ECARD_ABYSS_PYRO_RING:{hit:'flames',el:'pyro'},ECARD_ABYSS_CRYO_RAIN:{area:'rain',shape:'hail',el:'cryo'},ECARD_ABYSS_ELECTRO_ARC:{hit:'bolt',el:'electro'},ECARD_ABYSS_HYDRO_BUBBLE:{hit:'bubble',el:'hydro'},
 ECARD_SAMA_ANEMO_FIELD:{hit:'vortex',el:'anemo'},ECARD_SAMA_CRYO_FIELD:{hit:'spikes',el:'cryo'},ECARD_LAWA_FROST_LEAP:{hit:'meteor',el:'cryo'},ECARD_LAWA_FROST_ROAR:{self:'roar',el:'cryo'},
 ECARD_FATUI_AGENT_STEALTH:{self:'stealth',el:'pyro'},ECARD_FATUI_CRYO_SPRAY:{hit:'spikes',el:'cryo'},ECARD_FATUI_PYRO_AIM:{hit:'pierce',el:'pyro'},
 ECARD_MITA_AXE_LEAP:{hit:'meteor',el:'physical'},ECARD_MITA_ROCK_CHARGE:{area:'dash',el:'geo'},ECARD_GEOVISHAP_QUAKE:{area:'quake',el:'geo'},ECARD_RUIN_GRADER_STOMP:{area:'quake',el:'physical'},ECARD_RUIN_DESTROYER_BLAST:{hit:'flames',el:'physical'},ECARD_LECTOR_ELECTRO_STORM:{hit:'bolt',el:'electro'},ECARD_HERALD_CRYO_FALL:{hit:'spikes',el:'cryo'}
};
// A shield an enemy wears from the start (passive armour), by the card that logs it, and anything else that raises one.
const ARMOUR=/(SHIELD|ARMOR|BARRIER|GUARD|WALL|SHELL)$/;
// A field's own way of striking when it ticks (sourceKind FIELD/OBJECT, by the card that made it), a summon's, and
// the follow-up strikes some fields make when an ally attacks.
const TICK={MOND_KAEYA_Q:'frostslash',LIYUE_GANYU_Q:'icicle',LIYUE_XIANGLING_Q:'firewhirl',MOND_KLEE_Q:'meteor',MOND_KLEE_E:'flames',MOND_LISA_Q:'bolt',MOND_DIONA_Q:'spikes',LIYUE_SHENHE_Q:'talisman',LIYUE_ZHONGLI_E:'resonate',MOND_MONA_E:'bubble',LIYUE_QIQI_E:'pierce',MOND_SUCROSE_Q:'vortex',MOND_ROSARIA_Q:'spikes',LIYUE_GANYU_E:'spikes',LIYUE_XINYAN_E:'flames',LIYUE_XINYAN_Q:'flames',MOND_FISCHL_E:'bolt',MOND_FISCHL_Q:'bolt',LIYUE_XIANGLING_E:'flames',LIYUE_YAOYAO_E:'jade',LIYUE_YAOYAO_Q:'jade',LIYUE_HUTAO_E:'blossom',MOND_EULA_Q:'swordfall',ECARD_ANDRIUS_ROAR:'claw',LIYUE_BAIZHU_Q:'bloom',MOND_AMBER_E:'flames'};
const SUMMON_TICK={BUNNY:'flames',OZ:'bolt',GOU_BA:'flames',YUEGUI_THROWING:'jade'};
const FOLLOW={LIYUE_BEIDOU:'bolt',LIYUE_XINGQIU:'swordfall',LIYUE_YELAN:'dice',LIYUE_XIANYUN:'stars',LIYUE_TARTAGLIA:'pierce',LIYUE_BAIZHU:'bloom'};
const HAZARD_LOOK={FIRE:'heat',FROST:'frostfield',LIGHTNING:'lightning',FLOOD:'flood',CORROSION:'corrosion'};
const HAZARD_EL={heat:'pyro',frostfield:'cryo',lightning:'electro',flood:'hydro',corrosion:'neutral'};
const SUMMON_ART={BUNNY:'summon_baron_bunny.webp',OZ:'summon_oz.webp',GOU_BA:'summon_guoba.webp',YUEGUI_THROWING:'summon_yuegui.webp'};

// ---- reading the battle -----------------------------------------------------------------------------------------
const reduced=()=>document.documentElement.classList.contains('reduce-motion')||(typeof settings!=='undefined'&&!!settings.reducedMotion);
const speed=()=>{const v=typeof settings!=='undefined'?Number(settings.combatSpeed):1;return v>0?v:1;};
// The fight on screen: one's own, or (0.16 co-op) the fight drawn from the room's view.
function battle(){try{const f=window.CRPGCoopWorld?.fightGame?.();if(f?.s?.runtime)return f.s.runtime;}catch{}try{return typeof game!=='undefined'&&game?.s?.runtime||null;}catch{return null;}}
const actorIn=(b,id)=>b?.actors?.find(a=>a.id===id)||null;
const live=a=>!!a&&(!Number.isFinite(a.rounds)||a.rounds>0);
const UI=()=>{const m=typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});return m.uiAssets||{};};
function talentPath(key,slot){
 if(key==='ISEKAI'){try{return window.CRPGIcons?.talentRecord?.('PLAYER_CUSTOM','na')?.path||UI().normalAttacks?.['한손검']?.path||null;}catch{return UI().normalAttacks?.['한손검']?.path||null;}}
 return UI().skills?.[key]?.[slot]?.path||null;
}
const elementPath=el=>UI().elements?.[el]?.path||null;
function talentName(spec){try{const n=window.CRPGRuntime?.constellationsV01411?.names?.[spec.key];return n?.[spec.slot==='e'?3:4]||'';}catch{return '';}}
// The card a frame belongs to: its own id, an id on one of its events, or (a status-only frame logs no id) its name.
let names=null;
function byName(name){
 if(!name)return null;
 if(!names){try{const rows=typeof game!=='undefined'&&game?.combatRows?game.combatRows('08_SKILL_CARD_DB'):[];if(rows.length){names=new Map();for(const r of rows)if(SPEC[r[0]]&&r[3]&&!names.has(r[3]))names.set(r[3],r[0]);names.set('토끼 백작','MOND_AMBER_E');}}catch{}}
 return names?.get(name)||null;
}
function cardOfFrame(f){
 const ids=[f?.cardId,...(f?.events||[]).map(e=>e.cardId)].filter(Boolean);
 for(const id of ids)if(SPEC[id]||ENEMY[id])return id;
 if(ids.length)return ids[0];
 return byName(f?.cardName);
}
const elementOfFrame=f=>{for(const t of f.targets||[])for(const e of t.events||[])if(e.kind==='damage'&&FRAME_EL[e.element])return FRAME_EL[e.element];return null;};
const NOT_CAST=new Set(['FIELD','OBJECT','REACTION','REACTION_DOT','FOLLOWUP','SUMMON','HAZARD','SHIELD_BREAK','COUNTER','ASSIST','BUBBLE','SPREAD','SPLASH','CONSTELLATION','TRAIT_PROC','ENEMY_SUMMON','LIGHTFALL_EXPLOSION','AZHDAHA_LEYLINE','AZHDAHA_PHASE','BOSS_ARENA','ELEMENT_ABSORPTION','JOINT_SKIPPED','TEMP_MAX_HP']);
// One cast is one skill used once (round · action · card) within one playback; its first frame draws the cast, later
// frames only their hits. A cast that damages nobody (a buff, a debuff) draws its hit on whoever it marked.
const seen=new Map(),damaging=new Set();
function castKey(f){
 if(!f||f.kind!=='action'||f.periodic||NOT_CAST.has(f.sourceKind||''))return null;
 const id=cardOfFrame(f);if(!SPEC[id])return null;return {id,key:[f.round,f.action,id].join('|')};
}
function castOf(f){
 const k=castKey(f);if(!k)return null;
 let first=seen.get(k.key);if(first===undefined){first=f;seen.set(k.key,f);}
 return {id:k.id,spec:SPEC[k.id],key:k.key,first:first===f};
}
function newPlayback(frames){seen.clear();damaging.clear();for(const f of frames||[]){const k=castKey(f);if(k&&(f.targets||[]).some(t=>(t.events||[]).some(e=>e.kind==='damage'||e.kind==='guard'||e.kind==='miss')))damaging.add(k.key);}}
function enemyMoveOf(f){
 if(!f||f.kind!=='action')return null;const id=cardOfFrame(f)||'';
 const charging=(f.events||[]).some(e=>e.charging),released=(f.events||[]).some(e=>e.released),interrupted=(f.events||[]).some(e=>e.interrupted);
 const ready=/_READY$/.test(id)||charging||id==='FB_RISE';
 const spec=ENEMY[id]||ENEMY[id.replace(/_READY$/,'')]||(ARMOUR.test(id)&&/^ECARD_|^FB_/.test(id)?{self:'armour'}:null);
 if(!spec&&!ready&&!released&&!interrupted)return null;
 return {id,spec:spec||{},ready,released,interrupted,label:f.cardName||''};
}

// ---- the clock: every effect follows the battle speed and the playback's pause ------------------------------------
const running=new Set();let held=false,layer=null;
function fxLayer(){if(layer?.isConnected)return layer;layer=document.createElement('div');layer.className='sfx-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);return layer;}
function anim(n,frames,o={},remove=true){
 if(!n)return null;if(!n.animate){if(remove)n.remove?.();return null;}
 const a=n.animate(frames,{fill:'both',easing:'ease-out',...o,duration:Math.max(16,(o.duration||600)/speed()),delay:Math.max(0,(o.delay||0)/speed())});
 running.add(a);const end=()=>{running.delete(a);if(remove)n.remove();};a.finished.then(end,end);if(held)a.pause();return a;
}
function stopAll(){for(const a of [...running]){try{a.cancel();}catch{}}running.clear();layer?.replaceChildren();}
const busyLayer=()=>fxLayer().childElementCount>260;
function part(cls,p,o={}){
 const n=document.createElement('i');n.className='sfx-p '+cls;n.style.left=Math.round(p.x)+'px';n.style.top=Math.round(p.y)+'px';
 if(o.c)n.style.setProperty('--fx',o.c);if(o.w)n.style.width=o.w+'px';if(o.h)n.style.height=o.h+'px';(o.parent||fxLayer()).append(n);return n;
}
const T=(x,y,s=1,r=0)=>'translate(calc(-50% + '+x+'px),calc(-50% + '+y+'px)) scale('+s+') rotate('+r+'deg)';
function centerOf(node){const r=node?.getBoundingClientRect?.();if(!r||!r.width)return null;const v=clipRect(node,r);return v?{x:v.x,y:v.y,r:v}:null;}
// The face on a card (its picture), where a cast rises from.
function faceOf(node){const pic=node?.querySelector?.(':scope > img.combat-portrait,:scope > .combat-player-mark,:scope > img.summon-portrait');return centerOf(pic)||centerOf(node);}
// What of a box is really seen: the boxes around it that clip it (the battle stage hides the foes' lower half) and the screen.
function clipRect(node,r){
 if(!r)return null;let l=r.left,t=r.top,rr=r.right,b=r.bottom;
 for(let n=node;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.overflowX!=='visible'||cs.overflowY!=='visible'){const q=n.getBoundingClientRect();l=Math.max(l,q.left);t=Math.max(t,q.top);rr=Math.min(rr,q.right);b=Math.min(b,q.bottom);}if(n.matches?.('.combat-panel,.cp-battle'))break;}
 l=Math.max(l,0);t=Math.max(t,0);rr=Math.min(rr,innerWidth);b=Math.min(b,innerHeight);
 return rr-l<4||b-t<4?null:{left:l,top:t,right:rr,bottom:b,width:rr-l,height:b-t,x:(l+rr)/2,y:(t+b)/2};
}
function onScreen(p){return p&&p.y>40&&p.y<innerHeight-60;}
function unionRect(rects){rects=rects.filter(r=>r&&r.width);if(!rects.length)return null;const l=Math.min(...rects.map(r=>r.left)),t=Math.min(...rects.map(r=>r.top)),rr=Math.max(...rects.map(r=>r.right)),b=Math.max(...rects.map(r=>r.bottom));return {left:l,top:t,right:rr,bottom:b,width:rr-l,height:b-t,x:(l+rr)/2,y:(t+b)/2};}
function sideRect(node,side){const panel=node?.closest?.('.combat-panel,.cp-battle')||document.querySelector('.combat-panel');const col=panel?.querySelector(side==='ENEMY'?'.shell-enemies':'.shell-allies');const r=unionRect([...(col?.querySelectorAll(':scope > .combatant-row')||[])].map(n=>n.getBoundingClientRect()))||(col?col.getBoundingClientRect():null);return col&&r?clipRect(col,r)||r:r;}

// ---- the pieces effects are made of ----------------------------------------------------------------------------
function ring(p,c,o={}){if(!p)return;const n=part('sfx-ring'+(o.hex?' hex':'')+(o.cls?' '+o.cls:''),p,{c,w:o.size||90,h:o.size||90});anim(n,[{transform:T(0,0,o.from??.25),opacity:o.alpha??.95},{transform:T(0,0,o.to??1.9),opacity:0}],{duration:o.dur||640,delay:o.delay||0});}
function flash(p,c,o={}){if(!p)return;const n=part('sfx-flash',p,{c,w:o.size||110,h:o.size||110});anim(n,[{transform:T(0,0,.3),opacity:0},{offset:.25,transform:T(0,0,1),opacity:o.alpha??.95},{transform:T(0,0,1.25),opacity:0}],{duration:o.dur||520,delay:o.delay||0});}
const SHAPE={pyro:'flame',hydro:'drop',cryo:'shard',electro:'spark',anemo:'leaf',geo:'gem',dendro:'leaf',neutral:'dot',physical:'dot'};
function motes(p,el,o={}){
 if(!p||busyLayer())return;const n=o.n||8,r=o.r||60,c=TINT[el]||TINT.neutral,shape=o.shape||SHAPE[el]||'dot';
 for(let i=0;i<n;i++){const a=i*Math.PI*2/n+(o.turn||.3),dx=Math.cos(a)*r,dy=Math.sin(a)*r*(o.flat||1),m=part('sfx-mote m-'+shape,p,{c});
  const from=o.inward?T(dx,dy,1,a*57):T(0,0,.4,a*57),to=o.inward?T(0,0,.3,a*57+90):T(dx,dy+(o.fall||0),.5,a*57+120);
  anim(m,[{transform:from,opacity:0},{offset:.2,opacity:1},{transform:to,opacity:0}],{duration:(o.dur||620)+i*12,delay:(o.delay||0)+(o.stagger?i*o.stagger:0),easing:'cubic-bezier(.2,.7,.3,1)'});}
}
function streak(a,b,c,o={}){
 if(!a||!b)return;const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
 const n=part('sfx-streak'+(o.cls?' '+o.cls:''),a,{c,w:len,h:o.width||6});n.style.transformOrigin='0 50%';
 anim(n,[{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(0)',opacity:0},{offset:.35,transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1)',opacity:1},{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1)',opacity:0}],{duration:o.dur||420,delay:o.delay||0,easing:'cubic-bezier(.3,.8,.3,1)'});
}
function fall(p,c,o={}){
 if(!p)return;const h=o.from||170,n=part('sfx-fall f-'+(o.shape||'orb'),p,{c,w:o.size,h:o.size?o.size*(o.tall||1):undefined}),d=o.dur||380,delay=o.delay||0;
 anim(n,[{transform:T(o.dx||0,-h,.6,o.rot||0),opacity:0},{offset:.25,opacity:1},{offset:.92,transform:T(0,0,1,o.rot||0),opacity:1},{transform:T(0,0,1.1,o.rot||0),opacity:0}],{duration:d,delay,easing:'cubic-bezier(.55,0,.9,.6)'});
 if(o.land!==false){ring(p,c,{size:(o.size||40)*1.6,delay:delay+d*.9,dur:420});if(o.sparks!==false)motes(p,o.el||'neutral',{n:5,r:34,dur:380,delay:delay+d*.9});}
}
function rainOver(rect,el,o={}){
 if(!rect||busyLayer())return;const c=TINT[el]||TINT.neutral,n=reduced()?0:(o.n||14);
 for(let i=0;i<n;i++){const x=rect.left+rect.width*((i*.618+.13)%1),y=rect.top+rect.height*(.25+((i*.37)%1)*.6);fall({x,y},c,{shape:o.shape||'streak',from:o.from||rect.height*.9+60,dur:o.dur||300,delay:(o.delay||0)+i*(o.gap||45),dx:o.dx??-24,rot:o.rot??0,el,land:o.land!==false,sparks:false,size:o.size});}
}
function vortexAt(p,c,o={}){if(!p)return;const n=part('sfx-vortex',p,{c,w:o.size||120,h:o.size||120});anim(n,[{transform:T(0,0,.2,0),opacity:0},{offset:.2,opacity:1},{offset:.75,transform:T(0,0,1,320),opacity:1},{transform:T(0,0,1.25,420),opacity:0}],{duration:o.dur||820,delay:o.delay||0});}
// A magic circle lying on the ground (flattened first, so the pattern turns within the ellipse).
function sigilAt(p,c,o={}){if(!p)return;const n=part('sfx-sigil',p,{c,w:o.size||120,h:o.size||120}),f=o.flat||1,S=(s,r)=>'translate(-50%,-50%) scaleY('+f+') scale('+s+') rotate('+r+'deg)';anim(n,[{transform:S(.3,0),opacity:0},{offset:.3,opacity:1},{offset:.8,opacity:1,transform:S(1,120)},{transform:S(1.1,160),opacity:0}],{duration:o.dur||900,delay:o.delay||0});}
function pillar(p,c,o={}){if(!p)return;const h=o.h||150,n=part('sfx-pillar',{x:p.x,y:p.y+(o.dy??20)},{c,w:o.w||46,h});n.style.transformOrigin='50% 100%';anim(n,[{transform:'translate(-50%,-100%) scaleY(0)',opacity:0},{offset:.3,transform:'translate(-50%,-100%) scaleY(1)',opacity:1},{transform:'translate(-50%,-100%) scaleY(1.1) scaleX(.4)',opacity:0}],{duration:o.dur||640,delay:o.delay||0});}
function bolt(p,c,o={}){if(!p)return;const h=o.h||Math.min(260,p.y-20),n=part('sfx-bolt',{x:p.x,y:p.y},{c,w:o.w||38,h});n.style.transformOrigin='50% 100%';anim(n,[{transform:'translate(-50%,-100%) scaleY(.2)',opacity:0},{offset:.12,transform:'translate(-50%,-100%) scaleY(1)',opacity:1},{offset:.3,opacity:.2},{offset:.42,opacity:1},{transform:'translate(-50%,-100%) scaleY(1)',opacity:0}],{duration:o.dur||460,delay:o.delay||0,easing:'linear'});flash(p,c,{size:90,delay:(o.delay||0)+60,dur:380});}
function shake(node,amp=6,dur=360){if(!node?.animate||reduced())return;anim(node,[{transform:'translate(0,0)'},{transform:'translate(-'+amp+'px,1px)'},{transform:'translate('+amp+'px,-1px)'},{transform:'translate(-'+(amp/2)+'px,0)'},{transform:'translate(0,0)'}],{duration:dur,fill:'none'},false);}

// What lands on one fighter. p: its face (p.r: the picture's box) · c: colour · el: element · o: {k: size (the skill's
// weight × how big the picture is), from: the caster's face, prev: the last one struck, i: index}
const foot=p=>p.r?{x:p.x,y:p.r.bottom-p.r.height*.1}:{x:p.x,y:p.y+26};
const HIT={
 burst(p,c,el,o){flash(p,c,{size:100*o.k});ring(p,c,{size:80*o.k});motes(p,el,{n:6,r:46*o.k});},
 bolt(p,c,el,o){bolt(p,c,{delay:o.i*70,w:40*o.k});ring(foot(p),c,{size:90*o.k,cls:'flat',delay:o.i*70+60,dur:460});motes(p,'electro',{n:7,r:44*o.k,delay:o.i*70+80});},
 spikes(p,c,el,o){const f=foot(p);for(let i=0;i<5;i++){const h=Math.round((62-Math.abs(i-2)*12)*o.k),n=part('sfx-spike'+(el==='geo'?' geo':''),{x:f.x+(i-2)*15*o.k,y:f.y},{c,w:Math.round(16*o.k),h});n.style.transformOrigin='50% 100%';const r=(i-2)*10;anim(n,[{transform:'translate(-50%,-100%) scaleY(0) rotate('+r+'deg)',opacity:0},{offset:.3,transform:'translate(-50%,-100%) scaleY(1.08) rotate('+r+'deg)',opacity:1},{offset:.75,transform:'translate(-50%,-100%) scaleY(1) rotate('+r+'deg)',opacity:1},{transform:'translate(-50%,-100%) scaleY(.85) rotate('+r+'deg)',opacity:0}],{duration:720,delay:o.i*60+Math.abs(i-2)*40});}ring(f,c,{size:110*o.k,delay:o.i*60,dur:560,cls:'flat'});motes(p,el,{n:6,r:40*o.k,delay:o.i*60+120});},
 flames(p,c,el,o){const f=foot(p);for(let i=0;i<4;i++){const n=part('sfx-flame',{x:f.x+(i-1.5)*18*o.k,y:f.y},{c,w:Math.round(28*o.k),h:Math.round(64*o.k)});n.style.transformOrigin='50% 100%';anim(n,[{transform:'translate(-50%,-100%) scale(.3,.1)',opacity:0},{offset:.3,transform:'translate(-50%,-100%) scale(1,'+(1.25-Math.abs(i-1.5)*.25)+')',opacity:1},{transform:'translate(-50%,-112%) scale(.6,1.45)',opacity:0}],{duration:680,delay:o.i*50+i*40});}flash(p,c,{size:100*o.k,delay:o.i*50});},
 vortex(p,c,el,o){vortexAt(p,c,{size:120*o.k,delay:o.i*50});motes(p,el,{n:8,r:58*o.k,inward:true,delay:o.i*50,dur:700});},
 bloom(p,c,el,o){const n=part('sfx-bloom',p,{c,w:100*o.k,h:100*o.k});anim(n,[{transform:T(0,0,.2,0),opacity:0},{offset:.35,transform:T(0,0,1,40),opacity:1},{transform:T(0,0,1.3,70),opacity:0}],{duration:760,delay:o.i*60});motes(p,el,{n:6,r:50*o.k,delay:o.i*60+120});},
 meteor(p,c,el,o){fall(p,c,{shape:el==='geo'?'rock':'orb',size:34*o.k,from:200,dur:380,delay:o.i*90,el});},
 sigil(p,c,el,o){const f=foot(p);sigilAt(f,c,{size:130*o.k,flat:.42,delay:o.i*60});pillar(f,c,{h:130*o.k,w:34*o.k,delay:o.i*60+220,dy:0});},
 bubble(p,c,el,o){const n=part('sfx-bubble',p,{c,w:90*o.k,h:90*o.k});anim(n,[{transform:T(0,0,.3),opacity:0},{offset:.4,transform:T(0,0,1.05),opacity:1},{offset:.8,transform:T(0,0,1),opacity:1},{transform:T(0,0,1.3),opacity:0}],{duration:820,delay:o.i*60});motes(p,'hydro',{n:6,r:52*o.k,delay:o.i*60+500});},
 stars(p,c,el,o){const from=o.from||{x:p.x-160,y:p.y-80};for(let i=0;i<4;i++){const s=part('sfx-star',from,{c,w:22*o.k,h:22*o.k});anim(s,[{transform:T(0,(i-1.5)*14,.5,0),opacity:0},{offset:.2,opacity:1},{transform:T(p.x-from.x,p.y-from.y,1,240),opacity:1}],{duration:360,delay:o.i*60+i*55,easing:'cubic-bezier(.4,0,.8,.6)'});}ring(p,c,{size:80*o.k,delay:o.i*60+380,hex:el==='geo'});motes(p,el,{n:6,r:44*o.k,delay:o.i*60+380});},
 talisman(p,c,el,o){const n=part('sfx-talisman',p,{c});anim(n,[{transform:T(0,-70,.6*o.k,-30),opacity:0},{offset:.4,transform:T(0,-8,o.k,-8),opacity:1},{offset:.85,transform:T(0,-8,o.k,-8),opacity:1},{transform:T(0,-8,1.2*o.k,-8),opacity:0}],{duration:760,delay:o.i*70});flash(p,c,{size:90*o.k,delay:o.i*70+300});},
 mark(p,c,el,o){const n=part('sfx-markd',p,{c,w:32*o.k,h:32*o.k});anim(n,[{transform:T(0,0,2.2,45),opacity:0},{offset:.4,transform:T(0,0,1,45),opacity:1},{offset:.8,transform:T(0,0,1,45),opacity:1},{transform:T(0,0,.6,45),opacity:0}],{duration:640,delay:o.i*60});ring(p,c,{size:76*o.k,delay:o.i*60+260});},
 swordfall(p,c,el,o){for(let i=0;i<3;i++)fall({x:p.x+(i-1)*22*o.k,y:p.y},c,{shape:'sword',size:14*o.k,tall:4.6,from:210,dur:300,delay:o.i*70+i*80,el,land:i===1,sparks:i===1});},
 chain(p,c,el,o){const from=o.prev||o.from;if(from)streak(from,p,c,{width:4,dur:360,delay:o.i*140,cls:'soft'});const orb=part('sfx-orb',p,{c,w:30*o.k,h:30*o.k});anim(orb,[{transform:T(0,0,.2),opacity:0},{offset:.4,transform:T(0,0,1),opacity:1},{transform:T(0,0,1.6),opacity:0}],{duration:520,delay:o.i*140+200});},
 lifeline(p,c,el,o){if(o.from)streak(o.from,p,c,{width:3,dur:700,delay:o.i*60,cls:'thread'});ring(p,c,{size:66*o.k,delay:o.i*60+300});},
 pierce(p,c,el,o){const a=o.from||{x:p.x-220,y:p.y},d=Math.hypot(p.x-a.x,p.y-a.y)||1,b={x:p.x+(p.x-a.x)/d*60,y:p.y+(p.y-a.y)/d*60};streak(a,b,c,{width:8*o.k,dur:340,delay:o.i*60,cls:'lance'});flash(p,c,{size:90*o.k,delay:o.i*60+200,dur:360});},
 gust(p,c,el,o){for(let i=0;i<3;i++){const n=part('sfx-crescent',{x:p.x+(i-1)*10,y:p.y+(i-1)*12},{c,w:110*o.k,h:110*o.k});anim(n,[{transform:T(-40,0,.7,-40+i*20),opacity:0},{offset:.3,opacity:1},{transform:T(40,0,1.1,30+i*20),opacity:0}],{duration:380,delay:o.i*60+i*70});}},
 claw(p,c,el,o){for(let i=0;i<3;i++){const n=part('sfx-claw',{x:p.x+(i-1)*14*o.k,y:p.y},{c,w:92*o.k});anim(n,[{transform:T(0,0,1,62)+' scaleX(0)',opacity:1},{offset:.5,transform:T(0,0,1,62)+' scaleX(1)',opacity:1},{transform:T(0,0,1,62)+' scaleX(1)',opacity:0}],{duration:340,delay:o.i*60+i*50});}},
 bind(p,c,el,o){ring(p,c,{size:86*o.k,from:1.6,to:.6,dur:520,delay:o.i*60});ring(p,c,{size:64*o.k,from:1.4,to:.5,dur:520,delay:o.i*60+120});},
 dice(p,c,el,o){const from=o.from||{x:p.x+160,y:p.y};for(let i=0;i<2;i++){const s=part('sfx-die',from,{c,w:20*o.k,h:20*o.k});anim(s,[{transform:T(0,i*16,.6,0),opacity:0},{offset:.2,opacity:1},{transform:T(p.x-from.x+(i-.5)*16,p.y-from.y,1,540),opacity:1}],{duration:420,delay:o.i*60+i*90,easing:'cubic-bezier(.4,0,.8,.6)'});}ring(p,c,{size:84*o.k,delay:o.i*60+460});motes(p,'hydro',{n:6,r:44*o.k,delay:o.i*60+460});},
 frostslash(p,c,el,o){const n=part('sfx-crescent big',p,{c,w:150*o.k,h:150*o.k});anim(n,[{transform:T(-30,-10,.8,-70),opacity:0},{offset:.3,opacity:1},{transform:T(30,10,1.15,35),opacity:0}],{duration:420,delay:o.i*70});motes(p,'cryo',{n:7,r:56*o.k,delay:o.i*70+140});},
 icicle(p,c,el,o){for(let i=0;i<3;i++)fall({x:p.x+(i-1)*20*o.k,y:p.y},c,{shape:'icicle',size:11*o.k,tall:3.4,from:200,dur:280,delay:o.i*60+i*70,el:'cryo',land:i===1});},
 firewhirl(p,c,el,o){vortexAt(p,c,{size:110*o.k,dur:620,delay:o.i*60});HIT.flames(p,c,el,o);},
 resonate(p,c,el,o){ring(p,c,{size:86*o.k,hex:true,delay:o.i*60});ring(p,c,{size:64*o.k,hex:true,delay:o.i*60+140});motes(p,'geo',{n:5,r:40*o.k,delay:o.i*60+100});},
 jade(p,c,el,o){fall(p,c,{shape:'jade',size:22*o.k,tall:1.25,from:170,dur:320,delay:o.i*70,el:'dendro'});HIT.bloom(p,c,el,{...o,k:o.k*.7});},
 blossom(p,c,el,o){const n=part('sfx-bloom crimson',p,{c,w:84*o.k,h:84*o.k});anim(n,[{transform:T(0,0,.3,0),opacity:0},{offset:.35,transform:T(0,0,1.1,60),opacity:1},{transform:T(0,0,1.4,90),opacity:0}],{duration:640,delay:o.i*60});HIT.flames(p,c,el,o);},
 pillar(p,c,el,o){const f=foot(p);pillar(f,c,{h:180*o.k,w:56*o.k,delay:o.i*60,dy:0});ring(f,c,{size:100*o.k,delay:o.i*60+120,cls:'flat'});}
};
function hitAll(frame,effects,kind,el,o={}){
 const fn=HIT[kind]||HIT.burst;let i=0,prev=null;const from=o.from;
 for(const t of frame.targets||[]){
  if(i>=6)break;const hit=(t.events||[]).find(e=>e.kind==='damage'||e.kind==='guard'||(o.any&&e.kind!=='miss'))||(o.miss&&(t.events||[]).find(e=>e.kind==='miss'));if(!hit&&!o.any)continue;if(t.targetId===frame.actorId&&!o.self)continue;
  const p=faceOf(effects.actorNode(t.targetId));if(!onScreen(p))continue;const e=FRAME_EL[hit?.element]||el||'neutral';
  // Bigger pictures (the foes' full figures) take bigger effects than the party's round faces.
  const k=(o.k||1)*Math.max(.75,Math.min(1.6,(p.r?.height||80)/110));
  fn(p,TINT[e]||TINT.neutral,e,{k,i,from,prev});prev=p;i++;
 }
 return i;
}
// ---- the opponents' side: once per cast ----------------------------------------------------------------------------
function areaRect(frame,effects,casterNode,foeSide){
 const rects=(frame.targets||[]).filter(t=>t.events?.some(e=>e.kind==='damage')).map(t=>{const n=effects.actorNode(t.targetId),r=n?.getBoundingClientRect?.();return r&&r.width?clipRect(n,r):null;}).filter(Boolean);
 return unionRect(rects)||sideRect(casterNode,foeSide);
}
const AREA={
 rain(r,el,o){rainOver(r,el,{shape:o.shape==='arrow'?'arrow':o.shape==='sword'?'sword':o.shape==='jade'?'jade':o.shape==='star'?'star':o.shape==='hail'?'icicle':'streak',n:o.shape==='star'?10:16,gap:o.shape==='arrow'?38:48});},
 tornado(r,el){const c=TINT[el];const y=r.y,n=part('sfx-tornado',{x:r.left,y},{c,w:Math.min(220,r.height*1.1),h:Math.min(260,r.height*1.3)});anim(n,[{transform:T(0,0,.4),opacity:0},{offset:.15,opacity:1},{offset:.85,transform:T(r.width,0,1),opacity:1},{transform:T(r.width+40,0,.6),opacity:0}],{duration:1100,easing:'ease-in-out'});motes({x:r.x,y},el,{n:12,r:Math.max(70,r.width/2),inward:true,dur:900,delay:200});},
 wave(r,el,o){const c=TINT[el],n=part('sfx-wave',{x:r.left-40,y:r.y},{c,w:Math.max(140,r.width*.45),h:r.height+40});anim(n,[{transform:T(0,0,.6)+' skewX(-12deg)',opacity:0},{offset:.2,opacity:.95},{transform:T(r.width+80,0,1.1)+' skewX(-12deg)',opacity:0}],{duration:820,easing:'cubic-bezier(.3,.6,.4,1)'});},
 quake(r,el,o,panel){const c=TINT[el];for(let i=0;i<6;i++){const n=part('sfx-crack',{x:r.x,y:r.bottom-14},{c,w:Math.max(80,r.width*.35)});n.style.transformOrigin='0 50%';const ang=-180+i*36+((i%2)*10);anim(n,[{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(0)',opacity:1},{offset:.5,transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1)',opacity:1},{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1)',opacity:0}],{duration:620,delay:i*30});}ring({x:r.x,y:r.bottom-14},c,{size:Math.max(160,r.width*.6),cls:'flat',dur:620});shake(panel?.querySelector(o.foe==='ALLY'?'.shell-allies':'.shell-enemies'),5,380);},
 dash(r,el,o){const c=TINT[el],y=r.y,n=part('sfx-dash'+(o.shape?' s-'+o.shape:''),{x:r.left-60,y},{c,w:Math.max(160,r.width*.5),h:o.shape==='phoenix'?70:26});anim(n,[{transform:T(0,0,.6),opacity:0},{offset:.2,opacity:1},{transform:T(r.width+120,0,1),opacity:0}],{duration:560,easing:'cubic-bezier(.5,0,.4,1)'});},
 planet(r,el){const c=TINT.geo,p={x:r.x,y:r.y+r.height*.1},s=Math.min(180,Math.max(110,r.width*.32));fall(p,c,{shape:'planet',size:s,from:Math.max(260,r.height+180),dur:620,el:'geo',land:false});const at=620;ring(p,c,{size:s*1.4,delay:at,dur:700,hex:true});ring(p,c,{size:s*2,delay:at+80,dur:800});flash(p,c,{size:s*1.6,delay:at,dur:600});motes(p,'geo',{n:12,r:s*.9,delay:at,dur:700});},
 beam(r,el,o){const c=TINT[el],from=o.from||{x:r.left-200,y:r.y};const n=part('sfx-beam',from,{c,w:Math.hypot(r.x-from.x,r.y-from.y)+r.width*.6,h:Math.min(110,r.height*.55)});n.style.transformOrigin='0 50%';const ang=Math.atan2(r.y-from.y,r.x-from.x)*180/Math.PI;anim(n,[{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(0) scaleY(.3)',opacity:0},{offset:.25,transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1) scaleY(1)',opacity:1},{offset:.75,opacity:1},{transform:'translate(0,-50%) rotate('+ang+'deg) scaleX(1) scaleY(.2)',opacity:0}],{duration:820});},
 deluge(r,el,o,panel){const c=TINT.hydro,top=r.top-30,n=part('sfx-deluge',{x:r.left-30,y:top},{c,w:r.width+60,h:r.height+60});n.style.transformOrigin='50% 0';anim(n,[{transform:'translate(0,-40%) scaleY(.2)',opacity:0},{offset:.3,transform:'translate(0,0) scaleY(1)',opacity:.95},{offset:.7,opacity:.85},{transform:'translate(0,8%) scaleY(1)',opacity:0}],{duration:1100});AREA.wave(r,'hydro');shake(panel?.querySelector('.shell-allies'),7,460);},
 blizzard(r,el){rainOver(r,'cryo',{shape:'flake',n:22,gap:28,dx:-60,land:false});flash({x:r.x,y:r.y},TINT.cryo,{size:r.width*.9,dur:700});},
 splash(r,el){const c=TINT.hydro;for(let i=0;i<3;i++)ring({x:r.left+r.width*(.25+i*.25),y:r.bottom-20},c,{size:90,cls:'flat',delay:i*90});motes({x:r.x,y:r.bottom-20},'hydro',{n:10,r:Math.max(60,r.width*.4),flat:.4,fall:-30});},
 joint(r,el,o){flash({x:r.x,y:r.y},TINT.neutral,{size:Math.max(160,r.width*.7),dur:620});ring({x:r.x,y:r.y},TINT.neutral,{size:Math.max(160,r.width*.6),dur:700});}
};

// ---- the caster's side --------------------------------------------------------------------------------------------
function selfFx(kind,node,el){
 const p=faceOf(node),c=TINT[el]||TINT.neutral;if(!p)return;
 if(kind==='ring'||kind==='aura'||kind==='orbit'){ring(p,c,{size:110,dur:700});ring(p,c,{size:80,dur:700,delay:120});motes(p,el,{n:8,r:58,inward:kind!=='ring',dur:640});if(kind!=='ring')flash(p,c,{size:120,delay:200});}
 else if(kind==='rise'){pillar(p,c,{h:200,w:70});motes(p,'anemo',{n:8,r:50,fall:-60});}
 else if(kind==='armour'){ring(p,c,{size:120,hex:true,from:1.6,to:.9,dur:520});flash(p,c,{size:130,delay:300});}
 else if(kind==='shatter'){motes(p,el||'geo',{n:12,r:90,shape:'shard'});flash(p,TINT.neutral,{size:150});}
 else if(kind==='burrow'){ring({x:p.x,y:p.y+40},TINT.physical,{size:160,cls:'flat'});motes({x:p.x,y:p.y+40},'physical',{n:10,r:70,flat:.35,fall:-20});}
 else if(kind==='expose'){ring(p,'#ff6a5a',{size:90,from:1.8,to:.8,dur:600});flash(p,'#ffb36b',{size:110,delay:300});}
 else if(kind==='stun'){for(let i=0;i<3;i++){const s=part('sfx-star',{x:p.x,y:p.y-60},{c:TINT.geo});anim(s,[{transform:T(Math.cos(i*2.1)*40,Math.sin(i*2.1)*10,.6,0),opacity:0},{offset:.3,opacity:1},{transform:T(Math.cos(i*2.1+3)*40,Math.sin(i*2.1+3)*10,.9,300),opacity:0}],{duration:900});}}
 else if(kind==='revive'){ring(p,c,{size:140,from:2,to:.4,dur:800});flash(p,c,{size:120,delay:500});}
 else if(kind==='absorb'){motes(p,el,{n:12,r:110,inward:true,dur:760});flash(p,c,{size:140,delay:600});}
 else if(kind==='roar'){ring(p,c,{size:120,dur:700});ring(p,c,{size:120,dur:700,delay:160});ring(p,c,{size:120,dur:700,delay:320});}
 else if(kind==='stealth'){flash(p,'#3a2a2a',{size:140,alpha:.7});motes(p,'pyro',{n:6,r:50,fall:-30});}
 else if(kind==='cicin'){motes(p,el,{n:6,r:70,inward:true});ring(p,c,{size:90,delay:300});}
 else flash(p,c,{size:110});
}
function alliesFx(kind,frame,effects,casterNode,el,shape){
 const panel=casterNode?.closest?.('.combat-panel,.cp-battle')||document;const side=casterNode?.dataset?.side==='ENEMY'?'.shell-enemies':'.shell-allies';
 const nodes=[...panel.querySelectorAll(side+' > .combatant-row')].filter(n=>!n.classList.contains('dead')).slice(0,4);const c=TINT[el]||TINT.neutral;
 nodes.forEach((node,i)=>{const p=faceOf(node);if(!onScreen(p))return;
  if(kind==='petals'){const r=node.getBoundingClientRect(),s=shape||'petal';for(let k=0;k<5;k++){const x=r.left+r.width*(.1+k*.2),q={x,y:r.top+r.height*.6};const n=part('sfx-petal p-'+s,q,{c:s==='petal'?'#9be27a':c});anim(n,[{transform:T((k%2?-8:8),-r.height*.9-30,.7,k*40),opacity:0},{offset:.25,opacity:1},{transform:T((k%2?10:-10),0,1,k*40+160),opacity:0}],{duration:900,delay:i*90+k*70,easing:'ease-in-out'});}ring(p,'#8eefad',{size:70,delay:i*90+300,dur:560});}
  else if(kind==='sigil')sigilAt({x:p.x,y:p.y+16},c,{size:96,flat:.4,delay:i*80});
  else if(kind==='updraft'){pillar(p,c,{h:120,w:40,delay:i*70});motes(p,'anemo',{n:6,r:36,fall:-50,delay:i*70});}
  else {ring(p,c,{size:80,delay:i*80});motes(p,el,{n:5,r:40,inward:true,delay:i*80});}
 });
}
// The summon's own picture comes out of the caster's card and lands where the summons stand.
function summonPop(kind,node,el){
 const p=faceOf(node),c=TINT[el];if(!p)return;const art=SUMMON_ART[kind],strip=node.closest?.('.combat-panel,.cp-battle')?.querySelector('.battle-summons')?.getBoundingClientRect();
 const to=strip&&strip.width?{x:strip.left+40,y:strip.top+strip.height/2}:{x:p.x,y:p.y-70};
 ring(p,c,{size:100});motes(p,el,{n:8,r:50});
 if(!art||(typeof showArt!=='undefined'&&!showArt)){flash(to,c,{size:90,delay:300});return;}
 const n=part('sfx-summon',p,{c});const img=document.createElement('img');img.src='assets/summons/'+art;img.alt='';img.decoding='async';n.append(img);
 anim(n,[{transform:T(0,0,.2),opacity:0},{offset:.25,transform:T(0,-30,1.15),opacity:1},{offset:.75,transform:T(to.x-p.x,to.y-p.y,1),opacity:1},{transform:T(to.x-p.x,to.y-p.y,1.1),opacity:0}],{duration:1000,easing:'cubic-bezier(.3,.7,.3,1)'});
 ring(to,c,{size:80,delay:760});
}
// Shields: a ring of plates (geo) or a bubble that closes over each card that got one.
function shieldRaise(node,kind){const p=centerOf(node);if(!p||!onScreen(p))return;const c=TINT[kind]||'#cfe9ff',geo=kind==='geo';ring(p,c,{size:Math.min(160,p.r.width*.9),from:1.5,to:.95,dur:480,hex:geo,cls:'shield'});flash(p,c,{size:Math.min(170,p.r.width),delay:300,dur:420,alpha:.6});if(geo)motes(p,'geo',{n:6,r:60,inward:true,dur:460});}
function shieldTargets(spec,frame,effects,casterNode){
 const b=battle(),out=[];
 if(b){for(const a of b.actors||[])if((a.shields||[]).some(s=>s.source===spec.id&&s.value>0)){const n=effects.actorNode(a.id);if(n)out.push(n);}}
 if(out.length)return out;const how=SHIELDS[spec.id]?.[0];
 if(how==='party'){const panel=casterNode?.closest?.('.combat-panel,.cp-battle');return [...(panel?.querySelectorAll('.shell-allies > .combatant-row:not(.dead)')||[])];}
 return casterNode?[casterNode]:[];
}

// ---- the band across the board for a burst (like the original's close-up) -----------------------------------------
const STRETCH=520;let baseWindup=null,stretched=false,linger=0;
function stretch(){if(typeof CombatFX==='undefined'||reduced())return;if(baseWindup===null)baseWindup=CombatFX.windupDuration;CombatFX.windupDuration=baseWindup+STRETCH;stretched=true;}
function unstretch(){if(stretched&&typeof CombatFX!=='undefined'){CombatFX.windupDuration=baseWindup;stretched=false;}}
function artOf(owner,node){
 if(typeof showArt!=='undefined'&&!showArt)return null;
 try{const g=window.CRPGCoopWorld?.fightGame?.()||(typeof game!=='undefined'?game:null),profile=g?.rows?.('04_CHAR_DB')?.find(r=>r[1]===owner)?.[0];const src=profile&&typeof portraitFor==='function'?(portraitFor(profile,7)||portraitFor(profile,1)):null;if(src)return src;}catch{}
 return node?.querySelector?.(':scope > img.combat-portrait')?.getAttribute('src')||null;
}
function band(spec,frame,node){
 document.querySelector('.sfx-band')?.remove();
 const el=spec.el,c=TINT[el]||TINT.neutral,still=reduced();
 const b=document.createElement('div');b.className='sfx-band el-'+el+(still?' still':'');b.style.setProperty('--fx',c);b.setAttribute('aria-hidden','true');
 const art=artOf(spec.owner,node);
 if(art){const a=document.createElement('div');a.className='sfx-band-art';a.style.backgroundImage='url("'+art+'")';b.append(a);}
 const sweep=document.createElement('i');sweep.className='sfx-band-sweep';b.append(sweep);
 const copy=document.createElement('div');copy.className='sfx-band-copy';
 const pics=document.createElement('div');pics.className='sfx-band-pics';
 const icon=talentPath(spec.key,'q');if(icon){const s=document.createElement('span');s.className='sfx-band-icon';const img=document.createElement('img');img.src=icon;img.alt='';s.append(img);pics.append(s);}
 const mark=elementPath(el);if(mark){const s=document.createElement('span');s.className='sfx-band-el';const img=document.createElement('img');img.src=mark;img.alt='';s.append(img);pics.append(s);}
 const name=document.createElement('strong');name.textContent=talentName(spec)||frame.cardName||'';
 const who=document.createElement('small');who.textContent=node?.querySelector?.('.combatant-copy > strong')?.textContent?.trim()||frame.actor||'';
 copy.append(pics,name,who);b.append(copy);
 for(let i=0;i<(still?0:9);i++){const m=document.createElement('i');m.className='sfx-band-mote';m.style.setProperty('--i',i);b.append(m);}
 (fxLayer()).append(b);
 const ms=still?700:(baseWindup??460)+STRETCH;
 anim(b,still?[{opacity:0},{offset:.15,opacity:1},{offset:.8,opacity:1},{opacity:0}]:[{opacity:0,transform:'translateX(6%) skewX(-8deg)'},{offset:.14,opacity:1,transform:'translateX(0) skewX(-8deg)'},{offset:.84,opacity:1,transform:'translateX(-1%) skewX(-8deg)'},{opacity:0,transform:'translateX(-5%) skewX(-8deg)'}],{duration:ms,easing:'ease-out'});
 if(!still){const a=b.querySelector('.sfx-band-art');if(a)anim(a,[{transform:'translateX(22%) skewX(8deg)',opacity:0},{offset:.25,transform:'translateX(0) skewX(8deg)',opacity:1},{transform:'translateX(-4%) skewX(8deg)',opacity:1}],{duration:ms,easing:'cubic-bezier(.2,.8,.3,1)'},false);
  anim(sweep,[{transform:'translateX(-120%) skewX(-20deg)'},{transform:'translateX(320%) skewX(-20deg)'}],{duration:ms*.7,delay:ms*.08,easing:'ease-in-out'},false);
  anim(copy,[{transform:'translateX(-30px)',opacity:0},{offset:.3,transform:'translateX(0)',opacity:1},{transform:'translateX(6px)',opacity:1}],{duration:ms,easing:'cubic-bezier(.2,.8,.3,1)'},false);}
}
// The skill's own picture pops over the caster for an elemental skill.
function iconPop(spec,node){
 const p=faceOf(node);if(!onScreen(p))return;const el=spec.el,c=TINT[el]||TINT.neutral,src=talentPath(spec.key,'e');
 const box=part('sfx-epop',{x:p.x,y:p.y-8},{c});if(src){const img=document.createElement('img');img.src=src;img.alt='';box.append(img);}
 const still=reduced();
 anim(box,still?[{opacity:0},{offset:.2,opacity:1},{offset:.8,opacity:1},{opacity:0}]:[{transform:T(0,0,.3),opacity:0},{offset:.22,transform:T(0,-34,1.15),opacity:1},{offset:.32,transform:T(0,-30,1),opacity:1},{offset:.82,transform:T(0,-40,1),opacity:1},{transform:T(0,-58,.9),opacity:0}],{duration:still?600:900});
 if(still)return;ring({x:p.x,y:p.y},c,{size:96,dur:620});ring({x:p.x,y:p.y},c,{size:70,dur:620,delay:110});motes(p,el,{n:8,r:62,inward:true,dur:560});
}

// ---- what stays while it lasts (drawn from the battle on every render, and at once when a skill makes it) ---------
const mk=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;n.setAttribute('aria-hidden','true');return n;};
function lookNode(kind,el,extra=''){const n=mk('span','sfx-look sfx-k-'+kind+(extra?' '+extra:''));n.style.setProperty('--fx',TINT[el]||TINT.neutral);for(let i=0;i<(PARTS[kind]||0);i++){const k=document.createElement('i');k.style.setProperty('--i',i);n.append(k);}return n;}
// The card's own layer: over the card, clipped to it, placed on its picture.
function cardLayer(row){
 let box=row.querySelector(':scope > .sfx-card');if(box)return box;box=mk('span','sfx-card');row.append(box);placeCard(row,box);return box;
}
function placeCard(row,box){const r=row.getBoundingClientRect(),pic=row.querySelector(':scope > img.combat-portrait,:scope > .combat-player-mark,:scope > img.summon-portrait')?.getBoundingClientRect();
 if(!r.width)return;const f=pic&&pic.width?pic:{left:r.left+r.width/2-24,top:r.top+r.height/2-24,width:48,height:48},size=Math.max(f.width,f.height);
 // --o: what circles the picture stays within the card; --m: a mark over the picture covers it.
 const ax=f.left-r.left+f.width/2,o=Math.max(28,Math.min(size,r.width*.36,r.height*.95));
 box.style.setProperty('--ax',Math.round(ax)+'px');box.style.setProperty('--ay',Math.round(f.top-r.top+f.height/2)+'px');
 // A ring around the picture moves in from the card's edge so it is whole.
 box.style.setProperty('--ox',Math.round(Math.max(ax,o*1.36+2))+'px');
 box.style.setProperty('--o',Math.round(o)+'px');box.style.setProperty('--m',Math.round(Math.max(36,Math.min(size,r.width*.95,160)))+'px');}
function addLook(row,kind,el,extra){if(!row)return null;const box=cardLayer(row);if(box.querySelector(':scope > .sfx-k-'+kind))return null;const n=lookNode(kind,el,extra);box.append(n);return n;}
function zoneLayer(col){if(!col)return null;let z=col.querySelector(':scope > .sfx-zone');if(z)return z;z=mk('span','sfx-zone');col.prepend(z);return z;}
function addZone(col,kind,el,extra){const z=zoneLayer(col);if(!z||z.querySelector(':scope > .sfx-k-'+kind))return null;const n=lookNode(kind,el,extra);z.append(n);return n;}
// Something new on the board lights up as it comes (opacity and brightness only, so its own loop keeps running).
const appear=(n,wait=0)=>{if(n?.animate&&!reduced())n.animate([{opacity:0,filter:'brightness(2.6)'},{opacity:1,filter:'brightness(1)'}],{duration:640/speed(),delay:wait/speed(),fill:'backwards',easing:'ease-out'});};
const arrive=n=>{if(n?.animate&&!reduced())n.animate([{opacity:0,transform:'scale(.72)',filter:'brightness(2.6)'},{offset:.6,opacity:1,filter:'brightness(1.5)'},{opacity:1,transform:'none',filter:'brightness(1)'}],{duration:720/speed(),easing:'cubic-bezier(.2,.8,.3,1.25)'});};
// A field's or status's look on the board, from its owner and side.
function placeField(panel,f,b,fresh){
 const look=FIELD_LOOK[f.kind];if(!look||f.done)return;const [where,kind,el]=look,owner=f.actor,side=f.side||actorIn(b,owner)?.side||'ALLY';
 if(f.kind==='RAIN_SWORDS'&&!(Number(f.stacks)>0))return;
 const rows=(s)=>[...panel.querySelectorAll((s==='ENEMY'?'.shell-enemies':'.shell-allies')+' > .combatant-row')];
 if(where==='card'){const row=panel.querySelector('.combatant-row[data-actor-id="'+CSS.escape(owner)+'"]');const n=addLook(row,kind,el);if(fresh)appear(n);}
 // 0.16.4: a thing set down on the field (종려's 석주) glows on its own card in the summon lane (app_experience.js battleSummons).
 else if(where==='construct'){const card=panel.querySelector('.battle-summon[data-summon-id="'+CSS.escape('SUMMON:'+f.kind+':'+owner)+'"]');const n=addLook(card,kind,el);if(fresh)appear(n);}
 else if(where==='allies'){for(const row of rows(side)){if(row.classList.contains('dead'))continue;const n=addLook(row,kind,el);if(fresh)appear(n);}}
 else{const foe=where==='foe'?(side==='ENEMY'?'ALLY':'ENEMY'):side;const n=addZone(panel.querySelector(foe==='ENEMY'?'.shell-enemies':'.shell-allies'),kind,el);if(fresh)appear(n);}
}
function placeStatus(row,s,a){const look=STATUS_LOOK[s.id];if(!look)return null;let [kind,el]=look;if(s.id==='LIYUE_COUNTER')el=s.card==='LIYUE_YUNJIN_E'?'geo':'electro';return addLook(row,kind,el);}
function placeHazards(col,b,fresh){for(const h of b?.hazards||[]){const kind=HAZARD_LOOK[h.kind];if(kind&&(!Number.isFinite(h.rounds)||h.rounds>0)){const n=addZone(col,kind,HAZARD_EL[kind]);if(fresh)appear(n);}}}
function decorateBoard(p){
 const b=battle();if(!b||!p)return;
 for(const old of p.querySelectorAll('.sfx-card,.sfx-zone'))old.remove();
 for(const row of p.querySelectorAll('.combatant-row[data-actor-id]')){const a=actorIn(b,row.dataset.actorId);if(!a||a.hp<=0)continue;
  for(const s of a.statuses||[])if(live(s))placeStatus(row,s,a);
  const fb=a.fb;if(fb?.burrowed)addLook(row,'burrow','physical');if(fb?.stunned)addLook(row,'stun','geo');if(a.bossExposed&&fb&&fb.exposedUntil>=b.round||a.enemyCore)addLook(row,'expose','neutral');
  const cicin=(Number(a.enemyCicinCryo)||0)+(Number(a.cicinCount)||0);if(cicin>0)addLook(row,'cicin',a.enemyCicinCryo>0?'cryo':'electro');
  const armour=(a.shields||[]).find(s=>s.value>0&&a.side==='ENEMY'&&(ARMOUR.test(String(s.source))||s.source==='FB_SHELL'));if(armour)addLook(row,'armour',KO_EL[armour.element]||'neutral');
  // A wind-up: the boss glows and says what is coming.
  const tele=a.side==='ENEMY'?(a.enemyCharge?a.enemyCharge.name+' 준비':(fb&&b.fieldBoss?.telegraph?(b.fieldBoss.telegraph.move==='RISE'?b.fieldBoss.telegraph.label:b.fieldBoss.telegraph.label+' 준비'):(b.twinBoss?.telegraph&&a.source===b.twinBoss.boss?b.twinBoss.telegraph.label:''))):'';
  if(tele){const n=addLook(row,'warn','pyro');if(n){const tag=document.createElement('b');tag.textContent=tele;n.append(tag);}}
  if(b.twinBoss?.mark===a.id)addLook(row,'expose','cryo','hunt');
 }
 for(const f of b.fields||[])placeField(p,f,b,false);
 // Terrain and the battle itself.
 const allies=p.querySelector('.shell-allies'),foes=p.querySelector('.shell-enemies');
 placeHazards(allies,b,false);
 if(b.actors?.some(a=>a.source==='BOSS_DVALIN'&&a.hp>0)){addZone(allies,'storm','anemo');addZone(foes,'storm','anemo');}
 if(b.actors?.some(a=>a.source==='BOSS_ANDRIUS'&&a.hp>0&&a.andrius?.phase===3))addZone(foes,'blizzard','cryo');
 if(b.liyueObjective&&b.liyueObjective.hp>0){const n=addZone(allies,'formation','geo');if(n)n.style.setProperty('--charge',String(Math.min(1,(Number(b.liyueObjective.charge)||0)/(Number(b.liyueObjective.target)||8))));}
 const azh=b.actors?.find(a=>a.source==='BOSS_AZHDAHA'&&a.hp>0&&a.azhdaha?.current&&a.azhdaha.current!=='GEO');if(azh)addZone(allies,'leyline',KO_EL[azh.azhdaha.current]||'geo');
 arrivals(p,b);
}
// Fighters and summons that were not there at the last drawing of this fight arrive with a flash; reinforcements are
// heard. Dvalin's ground crumbling shows when it does.
const known=new Map();
function arrivals(p,b){
 const ids=[...p.querySelectorAll('.combatant-row[data-actor-id]')].map(n=>n.dataset.actorId).concat([...p.querySelectorAll('.battle-summon[data-summon-id]:not(.combatant-row)')].map(n=>'S:'+n.dataset.summonId));
 const rec=known.get(b.id);if(!rec){known.set(b.id,{ids:new Set(ids),terrain:b.terrain});while(known.size>8)known.delete(known.keys().next().value);return;}
 let foes=0;
 for(const id of ids){if(rec.ids.has(id))continue;rec.ids.add(id);const node=id.startsWith('S:')?p.querySelector('.battle-summon[data-summon-id="'+CSS.escape(id.slice(2))+'"]'):p.querySelector('.combatant-row[data-actor-id="'+CSS.escape(id)+'"]');if(!node)continue;
  arrive(node);if(node.dataset.side==='ENEMY'&&!id.startsWith('S:'))foes++;}
 rec.ids=new Set(ids);
 if(foes)sound('reinforce');
 if(Number.isFinite(b.terrain)&&Number.isFinite(rec.terrain)&&b.terrain<rec.terrain&&!reduced()){const z=addZone(p.querySelector('.shell-allies'),'crumble','geo');if(z)setTimeout(()=>z.remove(),1800);sound('hazard');}
 rec.terrain=b.terrain;
}
window.addEventListener('resize',()=>{for(const box of document.querySelectorAll('.combatant-row > .sfx-card'))placeCard(box.parentElement,box);});

// ---- sounds (app_sound.js picks the recording) -------------------------------------------------------------------
function sound(name){if(!name)return;try{if(window.CRPGSound?.play)window.CRPGSound.play(name);else if(typeof GameAudio!=='undefined')GameAudio.play(name);}catch{}}
const frameHasCue=f=>(f.targets||[]).some(t=>(t.events||[]).some(e=>e.cue));

// ---- the playback --------------------------------------------------------------------------------------------------
function casterNode(spec,frame,effects){
 const b=battle();
 if(frame.actorId){const a=actorIn(b,frame.actorId);if(!b||!a||a.source===spec.owner||a.id===spec.owner){const n=effects.actorNode(frame.actorId);if(n&&(!a||a.side==='ALLY'))return n;}}
 const own=b?.actors?.find(a=>a.side==='ALLY'&&(a.source===spec.owner||a.id===spec.owner));if(own){const n=effects.actorNode(own.id);if(n)return n;}
 return effects.actorNode(spec.owner)||null;
}
let current=null;
function onWindup(frame,effects){
 current=null;if(!frame||frame.kind!=='action')return;
 const cast=castOf(frame);
 if(cast){current={frame,cast};if(!cast.first)return;const node=casterNode(cast.spec,frame,effects);current.node=node;
  if(cast.spec.slot==='q'){const awakened=[...document.querySelectorAll('.resonance-cue')].some(n=>!n.dataset.sfxSeen&&(n.dataset.sfxSeen='1'));if(!awakened)band(cast.spec,frame,node);stretch();}
  else iconPop(cast.spec,node);
  sound(cast.spec.cue);return;}
 const move=enemyMoveOf(frame);if(!move)return;current={frame,move};
 const node=effects.actorNode(frame.actorId),p=faceOf(node);
 if(move.ready){if(node&&!reduced()){const n=addLook(node,'warn','pyro');if(n){const tag=document.createElement('b');tag.textContent=move.label||'';n.append(tag);appear(n);}}if(p)ring(p,'#ff7a4a',{size:140,from:1.8,to:.7,dur:620});sound('telegraph');}
 else if(p&&!reduced()&&(move.spec.area||move.released))flash(p,TINT[move.spec.el]||'#ffb36b',{size:150,dur:520});
}
function onShow(frame,effects){
 if(!frame||frame.kind!=='action')return;const motion=!reduced();
 const cur=current?.frame===frame?current:null;current=null;
 // Heals: green petals over whoever was healed; shields raised by a reshield.
 for(const t of frame.targets||[]){const node=effects.actorNode(t.targetId);if(!node)continue;
  if(motion&&Number(t.heal)>0&&!frame.periodic){const p=faceOf(node);if(onScreen(p))for(let k=0;k<4;k++){const n=part('sfx-petal p-petal',{x:p.x+(k-1.5)*18,y:p.y},{c:'#9be27a'});anim(n,[{transform:T(k%2?-6:6,-60,.6,k*50),opacity:0},{offset:.3,opacity:1},{transform:T(k%2?8:-8,10,1,k*50+140),opacity:0}],{duration:820,delay:k*60});}}
  const before=Number(t.shieldBefore),after=Number(t.shieldAfter);if(motion&&Number.isFinite(before)&&Number.isFinite(after)&&after>before)shieldRaise(node,'hydro');
 }
 // Crystallize gives its attacker a shield.
 if(motion&&(frame.events||[]).some(e=>/CRYSTALLIZE/.test(String(e.reactionId||e.reaction||''))&&!/LUNAR/.test(String(e.reactionId||e.reaction||'')))){const n=effects.actorNode(frame.actorId);if(n?.dataset?.side==='ALLY')shieldRaise(n,'geo');}
 // Osial's formation is struck (it is no card on the board).
 if(motion&&(frame.events||[]).some(e=>e.target==='선인 진법'&&e.kind==='damage')){const z=document.querySelector('.shell-allies > .sfx-zone > .sfx-k-formation');if(z?.animate)z.animate([{filter:'brightness(2.6) hue-rotate(-40deg)'},{filter:'brightness(1)'}],{duration:520/speed(),easing:'ease-out'});shake(z?.closest('.shell-allies'),4,300);}
 const cast=cur?.cast||castOf(frame);
 if(cast)return showCast(cast,frame,effects,cur?.node||casterNode(cast.spec,frame,effects),motion);
 const move=cur?.move||enemyMoveOf(frame);if(move)return showEnemy(move,frame,effects,motion);
 showTick(frame,effects,motion);
}
function showCast(cast,frame,effects,node,motion){
 const s=cast.spec,el=s.el==='neutral'?(elementOfFrame(frame)||'neutral'):s.el,c=TINT[el],from=faceOf(node),panel=node?.closest?.('.combat-panel,.cp-battle')||document.querySelector('.combat-panel');
 const marked=!damaging.has(cast.key);
 if(motion&&s.hit)hitAll(frame,effects,s.hit,el,{from,k:s.slot==='q'?1.2:1,any:marked,self:marked});
 // A buff or debuff the skill put on someone shows on that card at once (a falling planet's, when it lands).
 const land=s.area==='planet'?620:0;
 for(const t of frame.targets||[])for(const e of t.events||[])if(e.statusApplied&&STATUS_LOOK[e.statusApplied.id]){const n=placeStatus(effects.actorNode(t.targetId),e.statusApplied);if(motion)appear(n,land);}
 if(!cast.first)return;
 // Persistent looks appear at once (the board is drawn again after the playback).
 const b=battle();
 if(s.persist&&node){const f=b?.fields?.find(x=>x.kind===s.persist&&(x.actor===node.dataset.actorId));if(f)placeField(panel,f,b,true);else if(FIELD_LOOK[s.persist])placeField(panel,{kind:s.persist,actor:node.dataset.actorId,side:node.dataset.side||'ALLY',stacks:2},b,true);else if(STATUS_LOOK[s.persist]){const st=STATUS_LOOK[s.persist];appear(addLook(node,st[0],s.persist==='LIYUE_COUNTER'?(s.id==='LIYUE_YUNJIN_E'?'geo':'electro'):st[1]));}}
 if(s.field&&node){const f=b?.fields?.find(x=>x.kind===s.field&&x.actor===node.dataset.actorId);placeField(panel,f||{kind:s.field,actor:node.dataset.actorId,side:node.dataset.side||'ALLY'},b,true);}
 if(SHIELDS[s.id]&&motion)for(const n of shieldTargets(s,frame,effects,node))shieldRaise(n,SHIELDS[s.id][1]);
 if(motion){
  if(s.summon&&node)summonPop(s.summon,node,el);
  if(s.self&&node)selfFx(s.self,node,el);
  if(s.allies)alliesFx(s.allies,frame,effects,node,el,s.shape);
  if(s.area){const r=areaRect(frame,effects,node,node?.dataset?.side==='ENEMY'?'ALLY':'ENEMY');if(r)AREA[s.area]?.(r,el,{shape:s.shape,from,foe:'ENEMY'},panel);}
  // A burst lands with its element over the caster.
  if(s.slot==='q'&&from){flash(from,c,{size:170,dur:620});ring(from,c,{size:150,dur:760});motes(from,el,{n:12,r:110,dur:700});}
 }
 // A burst's landing is seen before the next fighter moves (a planet falls a while).
 if(motion&&s.slot==='q'&&s.area)linger=s.area==='planet'?600:300;
 if(!frameHasCue(frame))sound(impactCue(s));
}
function showEnemy(move,frame,effects,motion){
 const s=move.spec,node=effects.actorNode(frame.actorId),from=faceOf(node),panel=node?.closest?.('.combat-panel,.cp-battle')||document.querySelector('.combat-panel');
 const el=s.el||elementOfFrame(frame)||'physical',c=TINT[el]||TINT.neutral;
 if(move.ready&&!s.self)return;// glowing since the wind-up (onWindup), heard there
 if(s.hazard)placeHazards(panel?.querySelector('.shell-allies'),battle(),motion);
 if(!motion){if(!frameHasCue(frame))sound(s.cue||(s.hazard?'hazard':null));return;}
 if(move.interrupted&&from){selfFx('shatter',node,el);return;}
 // A foe's move is seen where it was aimed, dodged or not.
 if(s.hit)hitAll(frame,effects,s.hit,el,{from,k:1.15,miss:true});
 if(s.self&&node)selfFx(s.self,node,el);
 const r=(s.area||s.hazard||move.released)?areaRect(frame,effects,node,'ALLY'):null;
 if(r&&s.area)AREA[s.area]?.(r,el,{from,shape:s.shape,foe:'ALLY'},panel);
 if(r&&move.released){flash({x:r.x,y:r.y},c,{size:Math.max(160,r.width*.6)});ring({x:r.x,y:r.y},c,{size:Math.max(140,r.width*.5)});}
 if(s.hazard&&r){const wash=part('sfx-wash',{x:r.left,y:r.top},{c,w:r.width,h:r.height});anim(wash,[{opacity:0},{offset:.3,opacity:.85},{opacity:0}],{duration:900});}
 if(!frameHasCue(frame))sound(s.cue||(s.hazard?'hazard':s.self==='armour'?'shield_up':null));
}
// The field ticks that come from a thing on the field start at its card.
const CONSTRUCT_OF={LIYUE_ZHONGLI_E:'STONE_STELE',MOND_LISA_Q:'ROSE'};
function showTick(frame,effects,motion){
 if(!motion)return;const id=frame.cardId||(frame.events||[]).find(e=>e.cardId)?.cardId||'';
 const summon=String(frame.actorId||'').startsWith('SUMMON:')?String(frame.actorId).split(':')[1]:null;
 let kind=null;
 if(summon)kind=SUMMON_TICK[summon];
 else if(frame.periodic||['FIELD','OBJECT','SUMMON'].includes(frame.sourceKind))kind=TICK[id]||TICK[String(id).replace(/_EXPLOSION$/,'')];
 else if(frame.sourceKind==='LIGHTFALL_EXPLOSION')kind='swordfall';
 else if(frame.sourceKind==='FOLLOWUP'||frame.sourceKind==='SHIELD_BREAK'){const a=actorIn(battle(),frame.actorId);kind=FOLLOW[a?.source||String(frame.actorId).split('#')[0]];}
 else if(frame.sourceKind==='HAZARD'||String(frame.actorId||'').startsWith('HAZARD:')){for(const t of frame.targets||[]){const p=faceOf(effects.actorNode(t.targetId));const e=FRAME_EL[(t.events||[]).find(x=>x.kind==='damage')?.element]||'neutral';if(onScreen(p)){flash(p,TINT[e],{size:80,alpha:.7});motes(p,e,{n:5,r:36,fall:-20});}}return;}
 if(!kind)return;const built=CONSTRUCT_OF[id]&&document.querySelector('.battle-summon[data-summon-id="'+CSS.escape('SUMMON:'+CONSTRUCT_OF[id]+':'+frame.actorId)+'"]'),from=faceOf(built||effects.actorNode(frame.actorId));
 hitAll(frame,effects,kind,null,{from,k:.9});
}

// ---- hooks ---------------------------------------------------------------------------------------------------------
if(typeof CombatFX!=='undefined'&&typeof CombatFX.windup==='function'){
 const prior=CombatFX.windup;CombatFX.windup=function(frame,effects){unstretch();linger=0;const out=prior.call(this,frame,effects);try{onWindup(frame,effects);}catch(e){console.warn('skill fx',e);}return out;};
 const priorPause=CombatFX.pause;CombatFX.pause=function(p){const out=priorPause.call(this,p);held=!!p;for(const a of running){try{p?a.pause():a.play();}catch{}}return out;};
}
if(typeof GameEffects!=='undefined'){
 if(typeof GameEffects.play==='function'){const prior=GameEffects.play;GameEffects.play=function(events,...args){try{newPlayback(Array.isArray(events)?events:[]);}catch{}return prior.call(this,events,...args);};}
 if(typeof GameEffects.showAction==='function'){const prior=GameEffects.showAction;GameEffects.showAction=function(frame,...args){unstretch();const out=prior.call(this,frame,...args);try{onShow(frame,this);}catch(e){console.warn('skill fx',e);}return out;};}
 // The beat after a burst lands is a little longer (the playback reads it when it schedules the next fighter).
 if(typeof GameEffects.reschedule==='function'){const prior=GameEffects.reschedule;GameEffects.reschedule=function(...args){if(linger&&this.resolve)this.beatDuration=(Number(this.beatDuration)||650)+linger;linger=0;return prior.apply(this,args);};}
 // Skipped or replaced, everything stops; at the playback's own end the last effects finish (unless the fight is over).
 if(typeof GameEffects.cancel==='function'){const prior=GameEffects.cancel;GameEffects.cancel=function(...args){const natural=this.active&&!this.resolve&&!!battle();unstretch();current=null;linger=0;if(held){held=false;for(const a of running){try{a.play();}catch{}}}if(!natural)stopAll();return prior.apply(this,args);};}
}
if(typeof BattleFX!=='undefined'&&typeof BattleFX.decorate==='function'){const prior=BattleFX.decorate;BattleFX.decorate=function(p,...args){const out=prior.call(this,p,...args);try{decorateBoard(p);}catch(e){console.warn('skill fx',e);}return out;};}
// Presentation: Osial's round-end deluge logs a card id the card table does not have, so its name is given here (the
// playback said 「기본 공격」); a field's tick has its own sound.
if(window.CRPGPresentation?.actionFrames){
 const prior=window.CRPGPresentation.actionFrames;
 window.CRPGPresentation.actionFrames=function(events){
  const frames=prior(events);
  try{for(const f of frames){if(f.kind!=='action')continue;
   if((f.events||[]).some(e=>e.cardId==='OSIAL_DELUGE')&&(!f.cardName||f.cardName==='기본 공격')){let name='';try{name=game?.tables?.['12_ENEMY_CARD_DB']?.get('ECARD_OSIAL_DELUGE')?.[2]||'';}catch{}f.cardName=name||'마신의 대해일';for(const e of f.events)if(!e.cardName)e.cardName=f.cardName;}
   if(f.periodic&&['FIELD','OBJECT'].includes(f.sourceKind))for(const t of f.targets||[])for(const e of t.events||[])if(e.kind==='damage'&&CUE_EL[FRAME_EL[e.cue]])e.cue='tick_'+e.cue;
  }}catch{}
  return frames;
 };
}
window.CRPGSkillFX={ROSTER,FX,SPEC,ENEMY,FIELD_LOOK,STATUS_LOOK,TICK,SUMMON_TICK,FOLLOW,HAZARD_LOOK,SHIELDS,OWN_CUE,HIT,AREA,PARTS,cardIdsOf,cardOfFrame,castOf,newPlayback,enemyMoveOf,impactCue,talentPath,decorateBoard,
 specOf:id=>SPEC[id]||null,cueOf:id=>SPEC[id]?.cue||null};
})();
