'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
for(const f of ['app_adventure.js','app_navigation.js','app_recruitment.js','runtime_liyue_combat.js','runtime_places.js'])new Function(read(f));
const css=read('style.css'),app=read('app_adventure.js'),nav=read('app_navigation.js'),rec=read('app_recruitment.js'),liyue=read('runtime_liyue_combat.js'),places=read('runtime_places.js');
assert(css.includes('grid-template-columns:repeat(auto-fit,minmax(310px,1fr))'));assert(css.includes('word-break:keep-all'));assert(css.includes('@media(min-width:1200px){.location-places{grid-template-columns:repeat(3'));
assert(app.includes('UI_Icon_Intee_Blacksmith.png')&&app.includes('UI_Icon_Intee_Restaurant.png')&&app.includes('UI_Icon_Intee_Cooking.png')&&app.includes('UI_Icon_Intee_Comfort.png'));
assert(nav.includes("cityHub=['MAP_MOND_CITY','MAP_LIYUE_HARBOR']")&&nav.includes('facilities.after(map)'));
assert(!rec.includes("const geoJournalQuests=quests")&&!rec.includes("el('h2','','리월의 바위 눈동자')"));
assert(liyue.includes("BOSS_AZHDAHA")&&liyue.includes("neutralUsedRound")&&liyue.includes("ECARD_AZHDAHA_PHASE_SHIFT"));assert(places.includes("'BOSS_AZHDAHA'"));
const icons=JSON.parse(fs.readFileSync(path.join(root,'content/item-icons.json'),'utf8'));for(const id of ['EQ_CRPG_WORN_SWORD','EQ_CRPG_TRAINING_CLAYMORE','EQ_CRPG_TRAINING_SPEAR','EQ_CRPG_TRAINING_BOW','EQ_CRPG_TRAINING_CATALYST']){assert(icons.icons[id]);assert(icons.icons[id].path.startsWith('assets/icons/official/'));}
console.log(JSON.stringify({total:10,passed:10}));
