/* Shared growth rules. All costs, gates and rewards are authoritative runtime operations. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,PLAYER='PLAYER_CUSTOM',copy=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['newGame','validateSave','recalculate','character','combatStat','reactionBase','startBattle','finishBattle','roundEnd','apply','actionReason','useItem','mondRewardPlan','rollEncounter','claimQuest','tradeRule','adminApply','fbSummon','spawnLiyueWave'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);},CAPS=[10,20,30,40,50,55,60],TALENTS=[1,2,4,6,8,9,10];
const hpCurve=l=>1+.13*(l-1)+.002*(l-1)**2,adCurve=l=>1+.12*(l-1)+.003*(l-1)**2;
const xpNext=l=>l===60?0:Math.round((l<=10?160+60*l+10*l**3:8000+1800*(l-10)+35*(l-10)**2)/10)*10;
const phaseFor=l=>Math.max(0,CAPS.findIndex(n=>n>=l)),dayOf=n=>Math.floor((n+9*3600000)/86400000);
const GEMS={물리:['NEUTRAL','돌파 재료'],불:['PYRO','불 원소 돌파 재료'],물:['HYDRO','물 원소 돌파 재료'],바람:['ANEMO','바람 원소 돌파 재료'],번개:['ELECTRO','번개 원소 돌파 재료'],얼음:['CRYO','얼음 원소 돌파 재료'],바위:['GEO','바위 원소 돌파 재료'],풀:['DENDRO','풀 원소 돌파 재료']};
const BOOKS={MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000};
// 0.15.25 재료 합성 (docs/BALANCE_AUDIT_V01523_KO.md 「하위→상위 합성」: the higher masks, slime and the like came only from
// some field drops): at a forge or an alchemist, three of a monster material make one of the next tier, as in the original.
const SYNTH=[['MAT_SLIME_CONDENSATE','MAT_SLIME_SECRETIONS','MAT_SLIME_CONCENTRATE'],['MAT_DAMAGED_MASK','MAT_STAINED_MASK','MAT_OMINOUS_MASK'],['MAT_WHOPPER_NECTAR','MAT_SHIMMERING_NECTAR','MAT_ENERGY_NECTAR'],['MAT_FUNGAL_SPORE','MAT_LUMINESCENT_POLLEN','MAT_CRYSTALLINE_CYST_DUST'],['MAT_TREASURE_INSIGNIA','MAT_SILVER_INSIGNIA','MAT_GOLDEN_INSIGNIA'],['MAT_OLD_HANDGUARD','MAT_KAGEUCHI_HANDGUARD','MAT_FAMED_HANDGUARD'],['MAT_RECRUIT_INSIGNIA','MAT_SERGEANT_INSIGNIA','MAT_LIEUTENANT_INSIGNIA'],['MAT_MIST_GRASS_POLLEN','MAT_MIST_GRASS','MAT_MIST_GRASS_WICK'],['MAT_CHAOS_DEVICE','MAT_CHAOS_CIRCUIT','MAT_CHAOS_CORE'],['MAT_CONCEALED_CLAW','MAT_CONCEALED_UNGUIS','MAT_CONCEALED_TALON'],['MAT_TRANSOCEANIC_PEARL','MAT_TRANSOCEANIC_CHUNK','MAT_XENOCHROMATIC_CRYSTAL'],['MAT_FADED_RED_SATIN','MAT_TRIMMED_RED_SILK','MAT_RICH_RED_BROCADE'],['MAT_DEAD_LEY_LINE_BRANCH','MAT_DEAD_LEY_LINE_LEAVES','MAT_LEY_LINE_SPROUT']];
const SYNTH_MORA=[50,150],synthId=to=>'REC_SYN_'+to.replace(/^MAT_/,'');
// 0.15.25 (BALANCE_AUDIT_V01523_KO.md 「초반 뽑은 리월 캐릭터도 첫 돌파부터 리월 재료 요구」): Liyue opens after Mond, but a Liyue companion
// from a wish asks for Liyue specialties from the first ascension. The Mond general store keeps a few that Liyue traders brought.
const IMPORTS=['MAT_LIYUE_JUEYUN_CHILI','MAT_LIYUE_SILK_FLOWER','MAT_LIYUE_COR_LAPIS','MAT_LIYUE_NOCTILUCOUS_JADE','MAT_LIYUE_GLAZE_LILY','MAT_LIYUE_VIOLETGRASS','MAT_LIYUE_STARCONCH','MAT_LIYUE_QINGXIN'];
// 0.15.22–0.15.24 「성장 비경」: every kind at six hub maps. Kept only to finish a domain fight saved under those rules.
const DOMAIN_MAPS={MAP_MOND_CITY:'몬드',MAP_MOND_THOUSAND_WINDS:'몬드',MAP_MOND_EAGLES_GATE:'몬드',MAP_LIYUE_HARBOR:'리월',MAP_LIYUE_PLAINS:'리월',MAP_LIYUE_MOUNTAINS:'리월'};
const KINDS={EXP:'경험치',ASCENSION:'돌파',TALENT:'특성',GEAR:'장비'};
// 0.15.25 비경 (user: 「비경은 왜 맵마다 나눠져 있는게 아니라 그냥 맘대로 들어갈 수 있게 된거야?」, 「성장 비경이 영웅의 경험 두개면
// 지맥은 뭐하러 있는거냐」, 「비경 준비 이거 다 없애고 그냥 네가 만들어라」): each domain stands where the original has it (official
// names) and gives one kind of material — talent books, ascension gems by element, or gear ore. Experience books come from
// the ley lines (계시의 꽃) only. Four stages each; every stage has its own enemies.
const DOMAIN_LEVELS={몬드:[5,10,20,30],리월:[30,40,50,60]};
const S=(...m)=>m.map(([id,n])=>[id,n]);
const DOMAINS={
 FORSAKEN_RIFT:{name:'잊혀진 협곡',kind:'TALENT',region:'몬드',map:'MAP_MOND_SPRINGVALE',stages:[
  S(['MON_SLIME_HYDRO',2],['MON_SLIME_ANEMO',1]),S(['MON_HILI_FIGHTER',2],['MON_HILI_SHOOTER',1],['MON_SLIME_HYDRO',1]),
  S(['MON_MITACHURL_WOOD',1],['MON_HILI_GRENADIER',1],['MON_SAMACHURL_HYDRO',1],['MON_HILI_FIGHTER',1]),S(['MON_MITACHURL_AXE',1],['MON_SAMACHURL_ANEMO',1],['MON_SLIME_LARGE_HYDRO',1],['MON_HILI_SHOOTER',2])]},
 VALLEY_OF_REMEMBRANCE:{name:'각인의 골짜기',kind:'ASCENSION',region:'몬드',map:'MAP_MOND_DAWN_WINERY'},
 CECILIA_GARDEN:{name:'세실리아의 모밭',kind:'GEAR',region:'몬드',map:'MAP_MOND_WOLVENDOM',stages:[
  S(['MON_HILI_FIGHTER',2],['MON_HILI_PYRO_SHOOTER',1]),S(['MON_HILI_GRENADIER',1],['MON_HILI_FIGHTER',2],['MON_HILI_CRYO_SHOOTER',1]),
  S(['MON_MITACHURL_ICE',1],['MON_HILI_CRYO_SHOOTER',1],['MON_SAMACHURL_CRYO',1],['MON_HILI_FIGHTER',1]),S(['MON_MITACHURL_ICE',1],['MON_MITACHURL_AXE',1],['MON_SAMACHURL_ANEMO',1],['MON_HILI_ELECTRO_SHOOTER',2])]},
 TAISHAN_MANSION:{name:'태산부',kind:'TALENT',region:'리월',map:'MAP_LIYUE_JUEYUN',stages:[
  S(['MON_TH_SCOUT',2],['MON_TH_MARKSMAN',1]),S(['MON_TH_SCOUT',2],['MON_TH_POTION_PYRO',1],['MON_GEOVISHAP_HATCHLING',1]),
  S(['MON_MITACHURL_ROCK',1],['MON_GEOVISHAP_HATCHLING',2],['MON_TH_MARKSMAN',1]),S(['MON_FATUI_GEO',1],['MON_MITACHURL_ROCK',1],['MON_GEOVISHAP_HATCHLING',2])]},
 ZHOU_FORMULA:{name:'무망 인구 밀궁',kind:'ASCENSION',region:'리월',map:'MAP_LY_DETAIL_WANGSHU'},
 LIANSHAN_FORMULA:{name:'천둥 연산 밀궁',kind:'GEAR',region:'리월',map:'MAP_LY_DETAIL_MINGYUN',stages:[
  S(['MON_TH_SCOUT',2],['MON_TH_POTION_PYRO',1]),S(['MON_FATUI_PYRO',1],['MON_FATUI_HYDRO',1],['MON_TH_SCOUT',1]),
  S(['MON_RUIN_GUARD_VARIANT',1],['MON_FATUI_ELECTRO',1],['MON_TH_MARKSMAN',1]),S(['MON_RUIN_GUARD_VARIANT',1],['MON_CICIN_ELECTRO',1],['MON_FATUI_CRYO',1],['MON_FATUI_ANEMO',1])]}
};
// Ascension domains: the chosen element's slimes (and, deeper in, their big ones and casters); the hero's own gem is
// fought for against hilichurls in Mond and treasure hoarders in Liyue.
const GEM_FOES={
 몬드:{el:e=>[S(['MON_SLIME_'+e,2]),S(['MON_SLIME_'+e,3]),S(['MON_SLIME_LARGE_'+e,1],['MON_SLIME_'+e,2]),S(['MON_SLIME_LARGE_'+e,2],['MON_SLIME_'+e,2])],
  NEUTRAL:[S(['MON_HILI_FIGHTER',2]),S(['MON_HILI_FIGHTER',2],['MON_HILI_SHOOTER',1]),S(['MON_MITACHURL_WOOD',1],['MON_HILI_FIGHTER',2]),S(['MON_MITACHURL_AXE',1],['MON_MITACHURL_WOOD',1],['MON_HILI_SHOOTER',2])]},
 리월:{el:e=>[S(['MON_SLIME_'+e,3]),S(['MON_SLIME_LARGE_'+e,1],['MON_SLIME_'+e,2]),S(['MON_SLIME_LARGE_'+e,2],['MON_SLIME_'+e,1]),S(['MON_SLIME_LARGE_'+e,2],['MON_SLIME_'+e,2],[['PYRO','HYDRO','CRYO'].includes(e)?'MON_ABYSS_MAGE_'+e:'MON_SLIME_LARGE_'+e,1])],
  NEUTRAL:[S(['MON_TH_SCOUT',3]),S(['MON_TH_SCOUT',2],['MON_TH_MARKSMAN',1]),S(['MON_MITACHURL_ROCK',1],['MON_TH_SCOUT',1],['MON_TH_MARKSMAN',1]),S(['MON_RUIN_GUARD_VARIANT',1],['MON_TH_MARKSMAN',2])]}
};
const ROMAN=['I','II','III','IV'];
function gemFoes(region,element,stage){const g=GEM_FOES[region];if(element==='NEUTRAL')return g.NEUTRAL[stage-1];
 // A large slime of an element with no large slime (풀) is replaced by its small one.
 const out=new Map();for(const [id,n]of g.el(element)[stage-1]){const k=id==='MON_SLIME_LARGE_DENDRO'?'MON_SLIME_DENDRO':id;out.set(k,(out.get(k)||0)+n);}return [...out];}
function domainStageFoes(key,stage,element){const d=DOMAINS[key];return d.kind==='ASCENSION'?gemFoes(d.region,element,stage):d.stages[stage-1];}
const SPECIALTIES={MOND_AMBER:'ING_LAMP_GRASS',MOND_DILUC:'ING_LAMP_GRASS',MOND_FISCHL:'ING_LAMP_GRASS',MOND_LISA:'ING_LAMP_GRASS',MOND_BENNETT:'ING_LAMP_GRASS',LIYUE_BAIZHU:'MAT_LIYUE_VIOLETGRASS',LIYUE_QIQI:'MAT_LIYUE_VIOLETGRASS',LIYUE_XINYAN:'MAT_LIYUE_VIOLETGRASS',LIYUE_HUTAO:'MAT_LIYUE_SILK_FLOWER',LIYUE_XINGQIU:'MAT_LIYUE_SILK_FLOWER',LIYUE_XIANGLING:'MAT_LIYUE_JUEYUN_CHILI',LIYUE_YAOYAO:'MAT_LIYUE_JUEYUN_CHILI',LIYUE_ZHONGLI:'MAT_LIYUE_COR_LAPIS',LIYUE_KEQING:'MAT_LIYUE_COR_LAPIS',LIYUE_CHONGYUN:'MAT_LIYUE_COR_LAPIS',LIYUE_BEIDOU:'MAT_LIYUE_NOCTILUCOUS_JADE',LIYUE_YANFEI:'MAT_LIYUE_NOCTILUCOUS_JADE',LIYUE_NINGGUANG:'MAT_LIYUE_GLAZE_LILY',LIYUE_YUNJIN:'MAT_LIYUE_GLAZE_LILY',LIYUE_GAMING:'MAT_LIYUE_STARCONCH',LIYUE_YELAN:'MAT_LIYUE_STARCONCH',LIYUE_TARTAGLIA:'MAT_LIYUE_STARCONCH'};
const BOSS_MATERIAL={불:'MAT_FB_EVERFLAME_SEED',물:'MAT_FB_CLEANSING_HEART',바람:'MAT_FB_HURRICANE_SEED',번개:'MAT_FB_LIGHTNING_PRISM',얼음:'MAT_FB_HOARFROST_CORE',바위:'MAT_FB_BASALT_PILLAR',풀:'TRPG_BOSS_ESSENCE',물리:'TRPG_BOSS_ESSENCE'};
const ELITES={MAP_MOND_WOLVENDOM:'EG_MOND_HILI_ELITE',MAP_MOND_EAGLES_GATE:'EG_MOND_ABYSS_MAGE',MAP_DRAGONSPINE:'EG_MOND_HILI_ELITE',MAP_LIYUE_PLAINS:'EG_LIYUE_HILI_ROCK',MAP_LIYUE_MOUNTAINS:'EG_LIYUE_VISHAP',MAP_CHASM_DEEP:'EG_LIYUE_RUIN'};
function table(r,key,rows){r.db={...r.db,[key]:rows};r.tables[key]=new Map(rows.slice(1).filter(x=>x?.[0]!==undefined).map(x=>[x[0],x]));}
function now(r){return Number(r.actionStartedAt??Date.now());}
P.installGrowthContent=function(){
 if(this._growthInstalled)return;this.installMarketContent();this.installLocalRevision();this.installLifeContent();
 table(this,'26_LEVEL_RULES',[this.db['26_LEVEL_RULES'][0],...Array.from({length:60},(_,i)=>{const l=i+1;return [l,'돌파 '+phaseFor(l),xpNext(l),Math.min(10,2+Math.floor(i/4)),hpCurve(l),adCurve(l),Math.floor(i/5),'최대 60 · 돌파 10/20/30/40/50/55','CRPG 0.15.22'];})]);
 table(this,'00_CORE',this.db['00_CORE'].map(r=>r[3]==='LEVEL_MAX'?Object.assign(r.slice(),{4:60}):r));
 const materials=Object.values(GEMS).map(([id,name])=>['GROWTH_GEM_'+id,name]);materials.push(['GROWTH_TALENT_MOND','몬드 특성 수련서'],['GROWTH_TALENT_LIYUE','리월 특성 수련서']);
 const items=this.db['14_ITEM_DB'].map(r=>r.slice());for(const [id,name]of materials)if(!items.some(r=>r[0]===id))items.push([id,name,'성장 재료','고급','','캐릭터 돌파와 특성 훈련에 사용하는 재료.','비전투','성장 재료','','','N','공용','','',0,0,9999,'성장 비경','Y','N','몬드·리월','CRPG 0.15.22','']);
 table(this,'14_ITEM_DB',items);this.installSynthesis();this._growthInstalled=true;this.installRegionalLevels();
};
P.installSynthesis=function(){
 const recipes=this.db['17_RECIPE_DB'].map(r=>r.slice()),parts=this.db['48_RECIPE_INGREDIENT_DB'].map(r=>r.slice()),width=recipes[0].length,has=new Set(recipes.map(r=>r[0]));
 for(const tiers of SYNTH)for(let i=0;i<2;i++){const from=tiers[i],to=tiers[i+1],id=synthId(to);if(has.has(id)||!this.tables['14_ITEM_DB'].has(from)||!this.tables['14_ITEM_DB'].has(to))continue;
  const row=Array(width).fill('');Object.assign(row,{0:id,1:'재료 합성',2:'ITEM',3:to,4:1,5:from,6:3,7:'',8:0,9:'',10:0,11:'',12:0,13:'',14:0,15:SYNTH_MORA[i],16:'대장간/연금대',17:'대장간 또는 연금대',18:'기본 해금',19:'1분',20:100,21:'하위 재료 3개로 한 단계 위 재료 1개'});
  recipes.push(row);parts.push(['RI_'+id+'_1',id,1,from,3,'재료1','','CRPG_SYNTH_V1']);has.add(id);}
 table(this,'17_RECIPE_DB',recipes);table(this,'48_RECIPE_INGREDIENT_DB',parts);
 const stocks=this.db['19_SHOP_STOCK_DB'].map(r=>r.slice()),known=new Set(stocks.map(r=>r[0]));
 for(const id of IMPORTS){const sid='STK_MOND_IMPORT_'+id.replace(/^MAT_LIYUE_/,''),item=this.tables['14_ITEM_DB'].get(id);if(known.has(sid)||!item)continue;stocks.push([sid,'MRC_MOND_GENERAL','ITEM',id,item[1],240,4,'매일','없음','리월 상인이 들여온 특산물 · 리월이 열리기 전 돌파용']);}
 table(this,'19_SHOP_STOCK_DB',stocks);
};
P.installRegionalLevels=function(){const levels=api.growthRegionData.maps;table(this,'32_MAP_DB',this.db['32_MAP_DB'].map(r=>levels[r[0]]?Object.assign(r.slice(),{6:levels[r[0]],7:levels[r[0]]}):r));};
P.growthPhase=function(owner=PLAYER){return this.s?.ascensions?.[owner]??phaseFor(Number(owner===PLAYER?this.s?.global.PLAYER_LEVEL_STATE:this.s?.chars[owner]?.level)||1);};
P.growth=function(owner=PLAYER){const st=owner===PLAYER?{level:this.s.global.PLAYER_LEVEL_STATE,xp:this.s.global.PLAYER_XP_STATE}:this.s.chars[owner];if(!st)fail('OWNER','성장 대상을 확인해 주세요.');const phase=this.growthPhase(owner),cap=CAPS[phase],next=st.level>=cap?0:xpNext(st.level);return {owner,name:owner===PLAYER?this.s.global.PLAYER_NAME:this.row('07_CHAR_DB',owner)[1],level:st.level,xp:st.xp,next,remaining:Math.max(0,next-st.xp),cap,phase,talentCap:TALENTS[phase],max:st.level>=cap,final:st.level===60};};
P.recalculate=function(){this.installGrowthContent();old.recalculate.call(this);if(!this.s)return;const g=this.s.global,p=this.growthPhase();g.PLAYER_HP_MAX=Math.round(g.PLAYER_HP_MAX*(1+.16*p));g.PLAYER_ATK_CURRENT=Math.round(g.PLAYER_ATK_CURRENT*(1+.20*p));g.PLAYER_DEF_CURRENT=Math.round(g.PLAYER_DEF_CURRENT*(1+.20*p));g.PLAYER_XP_NEXT=g.PLAYER_LEVEL_STATE>=CAPS[p]?0:xpNext(g.PLAYER_LEVEL_STATE);};
P.character=function(id){const a=old.character.call(this,id),p=this.growthPhase(id),five=this.rarityOf?.(id)===5;a.maxHp=Math.round(a.maxHp*(1+(five?.24:.16)*p));a.atk*=1+(five?.28:.20)*p;a.def*=1+(five?.28:.20)*p;const weapon=this.s.inventory.find(x=>x.equipped&&x.owner===id&&x.category==='WEAPON');a.baseAttack=Math.round(Number(this.row('07_CHAR_DB',id)[8])*adCurve(a.level)*(1+(five?.28:.20)*p))+(weapon?this.enhancementStatsAt(weapon,weapon.enhance||0).ATK||0:0);return a;};
P.addXp=function(owner,xp){
 if(!Number.isSafeInteger(xp)||xp<0)fail('XP_VALUE','경험치는 0 이상의 정수여야 합니다.');const g=this.growth(owner);let level=g.level,cur=g.max?0:g.xp+xp;
 while(level<g.cap&&cur>=xpNext(level)){cur-=xpNext(level);level++;}if(level===g.cap)cur=0;
 if(owner===PLAYER){Object.assign(this.s.global,{PLAYER_LEVEL_STATE:level,PLAYER_XP_STATE:cur});this.recalculate();if(level>g.level)this.s.global.PLAYER_HP_CURRENT=this.s.global.PLAYER_HP_MAX;}
 else{Object.assign(this.s.chars[owner],{level,xp:cur});if(level>g.level)this.s.chars[owner].hp=this.character(owner).maxHp;}
 (this.s.lastGrowth??={})[owner]={gained:g.max?0:xp,fromLevel:g.level,toLevel:level,turn:this.s.global.TURN};return this.growth(owner);
};
P.experienceBookLimit=function(id,owner=PLAYER){if(!BOOKS[id]||!this.premiumOwns(owner))return 0;const g=this.growth(owner);let needed=-g.xp;for(let l=g.level;l<g.cap;l++)needed+=xpNext(l);return Math.min(this.itemCount(id),Math.max(0,Math.ceil(needed/BOOKS[id])));};
P.useItem=function(id,n=1,owner=PLAYER){if(!BOOKS[id])return old.useItem.call(this,id,n,owner);if(this.s.runtime)fail('COMBAT','전투를 마친 뒤 책을 사용해 주세요.');if(!Number.isSafeInteger(n)||n<1||n>this.experienceBookLimit(id,owner))fail('QUANTITY','소유 동료의 현재 돌파 상한에 필요한 수량만 사용할 수 있습니다.');this.pay({items:{[id]:n}});this.addXp(owner,BOOKS[id]*n);return {item:id,quantity:n,xp:BOOKS[id]*n,owner};};
P.growthElement=function(owner=PLAYER){return owner===PLAYER?'물리':String(this.row('07_CHAR_DB',owner)[3]).match(/\[(불|물|바람|번개|얼음|바위|풀)\]/)?.[1]||'물리';};
P.growthStoryGate=function(phase){
 const tr=this.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER',done=id=>this.s.quests[id]?.claimed===true||this.storyDone?.(id),flag=id=>[true,'TRUE'].includes(this.s.flags[id]);
 const gates=[tr?(done('Q_TRV_MOND_01')||flag('FLAG_TRV_MON_CH1_CLEAR')):(done('Q_ISK_MOND_01')||flag('FLAG_ISK_M03_CLEAR')),tr?(['진행중','진행 중'].includes(this.s.quests.Q_TRV_MOND_02?.state)||done('Q_TRV_MOND_02')||flag('FLAG_TRV_MON_CH2_CLEAR')):done('Q_ISK_MOND_02'),tr?flag('FLAG_TRV_MON_CH2_CLEAR'):flag('FLAG_ISK_M05_CLEAR'),...[1,2,3].map(n=>done('Q_'+(tr?'TRV':'ISK')+'_LIYUE_0'+n))];
 return {ready:!!gates[phase],label:['몬드 본편 1장',tr?'몬드 본편 2장 진입':'몬드 본편 2장','몬드 본편 완료','리월 본편 1장','리월 본편 2장','리월 본편 3장'][phase]||'모든 돌파 완료'};
};
P.ascensionInfo=function(owner=PLAYER){
 const g=this.growth(owner),p=g.phase,five=owner!==PLAYER&&this.rarityOf?.(owner)===5,mult=five?2:1,element=this.growthElement(owner),gate=this.growthStoryGate(p),cost={mora:p<6?Math.round([800,2400,6000,14000,28000,42000][p]*(five?1.8:1)):0,items:{}};
 if(p<6){cost.items['GROWTH_GEM_'+GEMS[element][0]]=[3,6,12,20,32,45][p]*mult;cost.items[SPECIALTIES[owner]||(owner.startsWith('LIYUE_')?'MAT_LIYUE_QINGXIN':'ING_CALLA_LILY')]=[2,4,6,8,10,12][p]*mult;cost.items[['MAT_DAMAGED_MASK','MAT_STAINED_MASK','MAT_OMINOUS_MASK'][Math.min(2,Math.floor(p/2))]]=[2,3,3,4,4,6][p]*mult;if(p>=3)cost.items[p===3?'TRPG_BOSS_ESSENCE':BOSS_MATERIAL[element]]=(p-2)*mult;}
 const reason=!this.premiumOwns(owner)?'소유한 동료를 골라 주세요.':p>=6?'마지막 돌파를 마쳤습니다.':g.level<g.cap?'Lv. '+g.cap+'에 도달하면 돌파할 수 있습니다.':!gate.ready?gate.label+'을 먼저 진행해 주세요.':this.s.global.MORA<cost.mora?'모라가 부족합니다.':Object.entries(cost.items).some(([id,n])=>this.itemCount(id)<n)?'돌파 재료가 부족합니다.':'';
 return {...g,cost,gate,nextCap:CAPS[Math.min(6,p+1)],reason};
};
P.talentUpgradeInfo=function(owner=PLAYER,kind='na'){const g=this.growth(owner),level=this.talentLevels(owner).base[kind],item=owner.startsWith('LIYUE_')?'GROWTH_TALENT_LIYUE':'GROWTH_TALENT_MOND',cost={mora:Math.round(250*level*level*(owner!==PLAYER&&this.rarityOf?.(owner)===5?1.5:1)),items:{[item]:2*level}};if(level>=2)cost.items[level<5?'MAT_SLIME_SECRETIONS':'MAT_SLIME_CONCENTRATE']=Math.ceil(level/2);const reason=!['na','e','q'].includes(kind)?'특성을 골라 주세요.':!this.premiumOwns(owner)?'소유한 동료를 골라 주세요.':level>=g.talentCap?'캐릭터 돌파 후 특성 상한이 올라갑니다.':this.s.global.MORA<cost.mora?'모라가 부족합니다.':Object.entries(cost.items).some(([id,n])=>this.itemCount(id)<n)?'특성 재료가 부족합니다.':'';return {owner,kind,level,cap:g.talentCap,cost,reason};};
P.fieldBattlePolicy=function(){return null;};
P.limitFieldBattle=function(){};
P.tuneGrowthEnemy=function(a,b,level){
 if(a.growthScaled)return;const grade=a.grade||'일반',i={일반:0,정예:1,강적:2,보스:3}[grade]??0,p=phaseFor(level),source=this.row('09_MONSTER_DB',a.source),original=Number(source[6])||1;
 const variant=(a.variant?.tier===5?1.6:1)*(a.variant?.affixes.includes('STURDY')?1.35:1);const prev=a.maxHp,hp=([105,340,900,3000][i])*(a.source==='BOSS_DVALIN'?.45:a.source==='BOSS_ANDRIUS'?.55:1)*hpCurve(level)*(1+.16*p)*variant;
 a.hp=a.maxHp=Math.round(hp);a.atk=Math.round([24,38,52,a.source==='BOSS_ANDRIUS'?55:65][i]*hpCurve(level)*(1+.18*p)*Math.sqrt(adCurve(level)));a.def=Math.round([20,28,35,42][i]*adCurve(level));a.level=level;a.spd=Number(source[19])+Math.floor(level/5)+(a.variant?.affixes.includes('SWIFT')?8:0);a.hit=Math.min(95,80+Math.floor(level/5));if(a.variant?.tier===5){a.atk=Math.round(a.atk*1.15);a.def=Math.round(a.def*1.1);}if(a.variant?.affixes.includes('FEROCIOUS'))a.atk=Math.round(a.atk*1.2);if(a.variant?.affixes.includes('ARMORED'))a.def=Math.round(a.def*1.35);
 for(const s of a.shields||[]){s.value=Math.round(s.value*hp/prev);if(s.initialValue)s.initialValue=Math.round(s.initialValue*hp/prev);}a.growthScaled=true;
};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 this.installGrowthContent();const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;if(!b||b===before||b.abyss||b.raid||String(origin).startsWith('RAID'))return out;
 const region=this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID),level=this._growthDomain?.level||b.leyLine?.level||Number(region[6])||1;
 for(const a of b.actors.filter(x=>x.side==='ENEMY'&&!x.fbSummon))this.tuneGrowthEnemy(a,b,api.growthRegionData.bosses[a.source]||level);
 for(const a of b.actors.filter(x=>x.fbSummon))this.tuneGrowthSummon(a,b);
 b.growthBalance={version:1,level,field:origin==='RANDOM'||origin.startsWith('QUEST:')||origin.startsWith('ELITE:'),roundLimit:30};
 if(this._growthDomain)b.growthDomain=copy(this._growthDomain);if(this._growthElite)b.growthElite=copy(this._growthElite);
 return out;
};
P.tuneGrowthSummon=function(a,b){const owner=b.actors.find(x=>x.id===a.fbSummon?.owner),spec=api.fieldBosses.summons[a.source];if(!owner?.growthScaled||!spec)return;const prev=a.maxHp,p=phaseFor(owner.level);a.hp=a.maxHp=Math.max(1,Math.round(spec.hp<=1?owner.maxHp*spec.hp:spec.hp/5*hpCurve(owner.level)*(1+.16*p)));a.atk=Math.round(owner.atk*(spec.atk||0));a.def=Math.round(spec.def*adCurve(owner.level));a.level=owner.level;for(const s of a.shields||[])s.value=Math.round(s.value*a.maxHp/prev);a.growthScaled=true;};
P.fbSummon=function(...args){const a=old.fbSummon.apply(this,args);this.tuneGrowthSummon(a,args[0]);return a;};
P.spawnLiyueWave=function(...args){const out=old.spawnLiyueWave.apply(this,args),b=this.s.runtime;if(!b)return out;const level=Number(this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID)[6]);for(const a of b.actors.filter(a=>a.siege&&!a.growthScaled)){this.tuneGrowthEnemy(a,b,level);a.hp=a.maxHp=Math.round(a.maxHp*(b.liyueObjective?.waveHp||1));}const o=b.liyueObjective;if(o&&!o.growthScaled){o.hp=o.maxHp=35000;o.def=220;o.growthScaled=true;}this.limitBattleEnemies?.(b);return out;};
P.combatStat=function(a,key){const n=old.combatStat.call(this,a,key);return key==='def'?n/Math.sqrt(adCurve(Math.max(1,Math.min(60,Number(a.level)||1)))):n;};
P.reactionBase=function(a){return old.reactionBase.call(this,a)*Math.max(1,hpCurve(a.level)/3);};

P.mondRewardPlan=function(b){if(!b?.growthBalance)return old.mondRewardPlan.call(this,b);const parts=b.actors.filter(a=>a.side==='ENEMY'&&!a.fbSummon).map(a=>{const n={일반:1,정예:2.5,강적:5,보스:10}[a.grade]||1;return {source:a.source,level:a.level,grade:a.grade,xp:Math.round((35+13*a.level+1.8*a.level*a.level)*n),mora:Math.round((8+2*a.level+.3*a.level*a.level)*n)};});return {xp:parts.reduce((n,x)=>n+x.xp,0),mora:parts.reduce((n,x)=>n+x.mora,0),parts};};
// The domains standing at a place: one entry per stage. A stage opens at protagonist Lv. (stage level − 5) and, past
// Lv. 10, once the story reaches that ascension.
P.growthDomainEntries=function(map=this.s.global.CURRENT_MAP_ID){
 return Object.entries(DOMAINS).filter(([,d])=>d.map===map).flatMap(([key,d])=>DOMAIN_LEVELS[d.region].map((level,i)=>{const gateIndex=level<=10?-1:phaseFor(level)-1,gate=gateIndex>=0?this.growthStoryGate(gateIndex):{ready:true};
  return {id:key+':'+(i+1),key,kind:d.kind,name:d.name,stageName:ROMAN[i],stage:i+1,region:d.region,level,map:d.map,reason:this.s.global.PLAYER_LEVEL_STATE<level-5?'주인공 Lv. '+(level-5)+'부터 입장할 수 있습니다.':!gate.ready?gate.label+'을 먼저 진행해 주세요.':''};}));
};
P.growthDomainSites=function(){return Object.entries(DOMAINS).map(([key,d])=>({key,name:d.name,kind:d.kind,region:d.region,map:d.map}));};
P.growthDomainFoes=function(d,element='NEUTRAL'){return d.key?domainStageFoes(d.key,d.stage,element).map(([id,n])=>({id,n,name:this.row('09_MONSTER_DB',id)?.[1]||id})):[];};
P.growthDomainRewards=function(d,element='NEUTRAL',day=dayOf(now(this))){const count=this.s.domainDaily?.day===day?this.s.domainDaily.wins:0,mult=count<3?2:1,base=Math.ceil(d.level/5),items={};if(d.kind==='EXP')items.MAT_CHAR_EXP_HERO=base*mult;else if(d.kind==='ASCENSION')items['GROWTH_GEM_'+element]=base*mult;else if(d.kind==='TALENT')items[d.region==='몬드'?'GROWTH_TALENT_MOND':'GROWTH_TALENT_LIYUE']=base*mult;else{items[d.level<20?'ORE_WHITE_IRON':'ORE_CRYSTAL']=base*mult;if(d.level>=40)items.TRPG_BOSS_ESSENCE=mult;}return {items,bonus:mult===2,remaining:Math.max(0,3-count),mora:Math.round((60+8*d.level+d.level*d.level*.5)*mult)};};
P.growthDomainGroup=function(d,element='NEUTRAL'){
 if(d.key){const id='EG_DOMAIN_'+d.key+'_'+d.stage+(d.kind==='ASCENSION'?'_'+element:'');if(this.tables['33_ENCOUNTER_GROUP_DB'].has(id))return id;
  const group=this.row('33_ENCOUNTER_GROUP_DB',d.region==='리월'?'EG_LIYUE_HILI_ROCK':'EG_MOND_HILI_PATROL').slice();group[0]=id;group[1]=d.name+' · '+ROMAN[d.stage-1];group[4]=group[5]=d.level;group[6]='FIXED';
  const members=domainStageFoes(d.key,d.stage,element).map(([monster,n],i)=>['EM_'+id+'_'+i,id,i+1,monster,n,n,'MON'+(i+1),'DOMAIN',d.name]);
  table(this,'33_ENCOUNTER_GROUP_DB',[...this.db['33_ENCOUNTER_GROUP_DB'],group]);table(this,'49_ENCOUNTER_MEMBER_DB',[...this.db['49_ENCOUNTER_MEMBER_DB'],...members]);return id;}
 const region=d.region==='리월'?'LIYUE':'MOND',id='EG_GROWTH_'+region+'_'+d.kind+'_'+element;
 if(this.tables['33_ENCOUNTER_GROUP_DB'].has(id))return id;
 const ko=Object.keys(GEMS).find(k=>GEMS[k][0]===element),elemental=this.rows('09_MONSTER_DB').filter(m=>/^MON_SLIME_/.test(m[0])&&m[3]==='일반'&&String(m[5]).includes('['+ko+']')).slice(0,2).map(m=>m[0]);
 const groupId=d.kind==='ASCENSION'?'EG_MOND_HILI_PATROL':({MOND:{EXP:'EG_MOND_SLIME_SMALL',TALENT:'EG_MOND_HILI_PATROL',GEAR:'EG_MOND_HILI_ELITE'},LIYUE:{EXP:'EG_LIYUE_HILI_ROCK',TALENT:'EG_LIYUE_VISHAP',GEAR:'EG_LIYUE_RUIN'}})[region][d.kind];
 const group=this.row('33_ENCOUNTER_GROUP_DB',groupId).slice();group[0]=id;group[1]=d.region+' '+KINDS[d.kind]+' 비경';group[4]=group[5]=d.level;group[6]='FIXED';
 let members=this.rows('49_ENCOUNTER_MEMBER_DB').filter(m=>m[1]===groupId).map((m,i)=>Object.assign(m.slice(),{0:'EM_'+id+'_'+i,1:id}));
 if(d.kind==='ASCENSION'&&elemental.length)members=elemental.map((m,i)=>['EM_'+id+'_'+i,id,i+1,m,2,2,'MON'+(i+1),'GROWTH','원소 시련']);
 table(this,'33_ENCOUNTER_GROUP_DB',[...this.db['33_ENCOUNTER_GROUP_DB'],group]);table(this,'49_ENCOUNTER_MEMBER_DB',[...this.db['49_ENCOUNTER_MEMBER_DB'],...members]);return id;
};
P.startGrowthDomain=function(a){const d=this.growthDomainEntries().find(x=>x.id===a.domain),element=d?.kind==='ASCENSION'?a.element||'NEUTRAL':'NEUTRAL';if(!d||d.reason)fail('DOMAIN',d?.reason||'이곳의 비경 입구를 이용해 주세요.');if(!Object.values(GEMS).some(x=>x[0]===element))fail('DOMAIN','원소 재료를 골라 주세요.');const {reason,...entry}=d;this._growthDomain={...entry,version:2,element,day:dayOf(now(this)),map:this.s.global.CURRENT_MAP_ID};try{return this.startBattle(this.growthDomainGroup(d,element),'DOMAIN:'+d.id);}finally{delete this._growthDomain;}};
P.growthEliteEntry=function(){const map=this.s.global.CURRENT_MAP_ID,group=ELITES[map];return group?{map,group,level:Number(this.row('32_MAP_DB',map)[6]),reason:this.s.eliteClaims?.[map]===dayOf(now(this))?'오늘의 토벌을 마쳤습니다. 한국 시간 자정에 다시 나타납니다.':''}:null;};
P.finishBattle=function(win){const b=this.s.runtime,active=new Set(b?.actors.filter(a=>a.side==='ALLY').map(a=>a.source)),out=old.finishBattle.call(this,win);if(!b||!out)return out;const recorded=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'{}');if((recorded.battleId||recorded.id)===b.id)Object.assign(out,recorded);
 if(b.growthDomain)this.s.lastGrowthDomain={domain:b.growthDomain.id,element:b.growthDomain.element,map:b.growthDomain.map};
 if(win&&!b.storyConfig?.noRewards){for(const owner of this.premiumFighters())if(!active.has(owner))this.addXp(owner,Math.floor((out.xp||0)*.25));if(b.growthElite)(this.s.eliteClaims??={})[b.growthElite.map]=dayOf(now(this));
 if(b.growthDomain){const d=b.growthDomain,reward=this.growthDomainRewards(d,d.element),day=dayOf(now(this));for(const [id,n]of Object.entries(reward.items)){this.giveItem(id,n);out.loot[id]=(out.loot[id]||0)+n;}this.s.global.MORA+=reward.mora;out.mora=(out.mora||0)+reward.mora;out.domain={id:d.id,level:d.level,bonus:reward.bonus,items:reward.items};this.s.domainDaily={day,wins:(this.s.domainDaily?.day===day?this.s.domainDaily.wins:0)+1};}}
 this.s.combatReceipts[b.id]=copy(out);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(out);const log=this.s.log.find(x=>x.id===b.id);if(log)Object.assign(log,copy(out));return out;
};
P.actionReason=function(type,a={}){const base=old.actionReason.call(this,type,a);if(base)return base;try{if(type==='CHAR_ASCEND')return this.ascensionInfo(a.owner||PLAYER).reason;if(type==='TALENT_UPGRADE')return this.talentUpgradeInfo(a.owner||PLAYER,a.kind).reason;if(type==='DOMAIN_START')return this.growthDomainEntries().find(x=>x.id===a.domain)?.reason??'현재 장소의 비경을 선택해 주세요.';if(type==='ELITE_START')return this.growthEliteEntry()?.reason??'이곳에는 정예 토벌이 없습니다.';}catch(e){return e.message;}return '';};
P.apply=function(a){
 if(['CHAR_ASCEND','TALENT_UPGRADE','DOMAIN_START','ELITE_START'].includes(a.type)){const why=this.actionReason(a.type,a);if(why)fail('GROWTH',why);}
 if(a.type==='CHAR_ASCEND'){const d=this.ascensionInfo(a.owner||PLAYER);this.pay(d.cost);(this.s.ascensions??={})[d.owner]=d.phase+1;this.recalculate();if(d.owner===PLAYER)this.s.global.PLAYER_HP_CURRENT=this.s.global.PLAYER_HP_MAX;else this.s.chars[d.owner].hp=this.character(d.owner).maxHp;return this.growth(d.owner);}
 if(a.type==='TALENT_UPGRADE'){const d=this.talentUpgradeInfo(a.owner||PLAYER,a.kind);this.pay(d.cost);((this.s.talents??={})[d.owner]??={})[d.kind]=d.level+1;return this.talentLevels(d.owner);}
 if(a.type==='DOMAIN_START')return this.startGrowthDomain(a);
 if(a.type==='ELITE_START'){const d=this.growthEliteEntry();this._growthElite={map:d.map};try{return this.startBattle(d.group,'ELITE:'+d.map);}finally{delete this._growthElite;}}
 const out=old.apply.call(this,a);if(a.type==='LIYUE_FIELD_BATTLE'&&this.s.runtime){const b=this.s.runtime,l=Number(this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID)[6]);for(const e of b.actors.filter(x=>x.side==='ENEMY')){delete e.growthScaled;this.tuneGrowthEnemy(e,b,l);if(e.fieldStructure){e.atk=0;e.def=0;}}b.growthBalance={version:1,level:l,field:true,roundLimit:30};}return out;
};
P.rollEncounter=function(map,...rest){if(this._encounterAction?.type==='WAIT'){map=map.slice();map[9]=Number(map[9])*.25;}return old.rollEncounter.call(this,map,...rest);};
P.claimQuest=function(...args){const level=this.s.global.PLAYER_LEVEL_STATE,out=old.claimQuest.apply(this,args),reward=out?.rewards;if(!reward)return out;const xp=Math.round((reward.xp||0)*(Math.max(1,level/5)-1)),mora=Math.round((reward.mora||0)*(Math.max(1,level/10)-1));if(xp)for(const id of out.xpRecipients||this.s.party.filter(p=>p.active).map(p=>p.source))this.addXp(id,xp);this.s.global.MORA+=mora;out.rewards={...reward,xp:(reward.xp||0)+xp,mora:(reward.mora||0)+mora};return out;};
P.tradeRule=function(entry){const inv=typeof entry==='string'?{item:entry}:entry||{};if(inv.equip&&((inv.enhancementCap||10)>10||(inv.enhance||0)>10||/^(EQ_BOSS_|EQ_ABYSS_)/.test(inv.equip)||this.rows('17_RECIPE_DB').some(r=>r[3]===inv.equip&&r.some(x=>/^TRPG_BOSS_|^MAT_FB_/.test(String(x))))))return {ok:false,reason:'보스·나선비경 장비와 돌파한 장비는 거래할 수 없습니다.'};return old.tradeRule.call(this,entry);};
function migrate(r,s){if(s.growthVersion===1)return;const g=s.global;s.ascensions={};for(const [id,l]of [[PLAYER,g.PLAYER_LEVEL_STATE],...Object.entries(s.chars||{}).map(([id,c])=>[id,c.level])]){s.ascensions[id]=phaseFor(l);const cap=CAPS[s.ascensions[id]],xp=id===PLAYER?g.PLAYER_XP_STATE:s.chars[id].xp,normalized=l>=cap?0:Math.min(xp,xpNext(l)-1);if(id===PLAYER)g.PLAYER_XP_STATE=normalized;else s.chars[id].xp=normalized;}s.growthVersion=1;}
P.newGame=function(o){this.installGrowthContent();old.newGame.call(this,o);migrate(this,this.s);this.installRegionalLevels();this.recalculate();this.s.global.PLAYER_HP_CURRENT=this.s.global.PLAYER_HP_MAX;return copy(this.s);};
P.validateSave=function(s){this.installGrowthContent();migrate(this,s);
 const d=s.runtime?.growthDomain;if(d){
  if(d.version===2){const spec=DOMAINS[d.key];if(!spec||d.id!==d.key+':'+d.stage||!Number.isInteger(d.stage)||d.stage<1||d.stage>4||d.level!==DOMAIN_LEVELS[spec.region][d.stage-1]||d.kind!==spec.kind||d.region!==spec.region||d.map!==spec.map||!Object.values(GEMS).some(x=>x[0]===d.element)||d.kind!=='ASCENSION'&&d.element!=='NEUTRAL'||!Number.isSafeInteger(d.day)||s.runtime.origin!=='DOMAIN:'+d.id)fail('GROWTH_SAVE','비경 저장값이 잘못되었습니다.');}
  // A fight begun under the 0.15.22–0.15.24 domains is checked by its own rules and may finish.
  else if(!['몬드','리월'].includes(d.region)||!Object.hasOwn(KINDS,d.kind)||!(d.region==='몬드'?[5,10,20,30]:[30,40,50,60]).includes(d.level)||d.id!==d.kind+':'+d.level||DOMAIN_MAPS[d.map]!==d.region||!Object.values(GEMS).some(x=>x[0]===d.element)||!Number.isSafeInteger(d.day)||s.runtime.origin!=='DOMAIN:'+d.id)fail('GROWTH_SAVE','비경 저장값이 잘못되었습니다.');
  if(this.growthDomainGroup(d,d.element)!==s.runtime.group)fail('GROWTH_SAVE','비경 편성이 일치하지 않습니다.');}
 old.validateSave.call(this,s);this.installRegionalLevels();if(s.growthVersion!==1||!s.ascensions||typeof s.ascensions!=='object'||Array.isArray(s.ascensions))fail('GROWTH_SAVE','성장 단계 저장값이 잘못되었습니다.');
 for(const [id,l]of [[PLAYER,s.global.PLAYER_LEVEL_STATE],...Object.entries(s.chars||{}).map(([id,c])=>[id,c.level])]){const p=s.ascensions[id]??0,xp=id===PLAYER?s.global.PLAYER_XP_STATE:s.chars[id].xp;if(!Number.isInteger(p)||p<0||p>6||p>0&&l<CAPS[p-1]||l>CAPS[p]||l>=CAPS[p]&&xp!==0)fail('GROWTH_SAVE','레벨과 돌파 상한이 일치하지 않습니다.');}
 s.global.PLAYER_XP_NEXT=s.global.PLAYER_LEVEL_STATE>=CAPS[s.ascensions.PLAYER_CUSTOM]?0:xpNext(s.global.PLAYER_LEVEL_STATE);
 if(s.domainDaily&&(!Number.isSafeInteger(s.domainDaily.day)||!Number.isSafeInteger(s.domainDaily.wins)||s.domainDaily.wins<0))fail('GROWTH_SAVE','비경 일일 기록을 확인해 주세요.');if(s.eliteClaims&&(Array.isArray(s.eliteClaims)||Object.entries(s.eliteClaims).some(([m,d])=>!ELITES[m]||!Number.isSafeInteger(d))))fail('GROWTH_SAVE','정예 토벌 기록을 확인해 주세요.');return s;
};
api.growthV01522={caps:CAPS,talentCaps:TALENTS,hpCurve,adCurve,xpNext,phaseFor,gems:GEMS,domainMaps:DOMAIN_MAPS,domains:copy(DOMAINS),domainLevels:copy(DOMAIN_LEVELS),specialties:SPECIALTIES,eliteSites:ELITES,dayOf,synthesis:copy(SYNTH),synthMora:SYNTH_MORA.slice(),imports:IMPORTS.slice()};
})(globalThis);
