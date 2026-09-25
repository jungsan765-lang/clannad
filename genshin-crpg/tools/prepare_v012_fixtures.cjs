/* Disposable browser QA pages, removed by the final production build. */
const {fs,path,root,fresh}=require('../tests/helpers_v011.cjs');
function page(name,r){const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace(/<script src="app_av\.js[^"\n]*"><\/script>/,'<script src="qa-'+name+'-bootstrap.js"></script>$&');fs.writeFileSync(path.join(root,'dist/qa-'+name+'.html'),html);fs.writeFileSync(path.join(root,'dist/qa-'+name+'-bootstrap.js'),`boot=async function(){settings.uiTutorialVersion=1;settings.audioEnabled=false;settings.reducedMotion=false;settings.combatSpeed=.5;saveStore=null;activeSaveSlot=null;game=new Runtime(DB,${r.serialize()});render();};storeSave=async function(){};`);}
const battle=fresh('MAP_MOND_PLAINS');battle.unlockCharacter('MOND_AMBER');battle.action('PARTY',{char:'MOND_AMBER',slot:2});battle._encounterAction={type:'MOVE',map:'MAP_MOND_CITY'};battle.startBattle('EG_MOND_SLIME_SMALL','RANDOM');page('combat-v012',battle);
const field=fresh('MAP_MOND_PLAINS');field.s.global.SCREEN_MODE='LOCATION';page('discovery-v012',field);
const shop=fresh();shop.giveItem('ORE_IRON',8);shop.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_EQUIP'});page('shop-v012',shop);
fs.writeFileSync(path.join(root,'dist/qa-v012-mobile.html'),'<!doctype html><meta charset="utf-8"><title>전투 모바일 검사</title><iframe title="게임" src="qa-combat-v012.html" style="width:390px;height:844px;border:0"></iframe>');
console.log('Prepared combat, hidden scene, shop and mobile fixtures');
