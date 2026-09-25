const {fs,path,root,fresh,c}=require('../tests/helpers_v011.cjs');
const r=fresh();r.giveItem('ORE_IRON',8);r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_EQUIP'});
const state=r.serialize(),html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace(/<script src="app_av\.js[^"\n]*"><\/script>/,'<script src="qa-v011-bootstrap.js"></script>$&');
fs.writeFileSync(path.join(root,'dist/qa-v011.html'),html);
fs.writeFileSync(path.join(root,'dist/qa-v011-bootstrap.js'),`boot=async function(){settings.uiTutorialVersion=1;settings.musicEnabled=false;settings.sfxEnabled=false;saveStore=null;activeSaveSlot=null;game=new Runtime(DB,${state});render();};storeSave=async function(){};`);
fs.writeFileSync(path.join(root,'dist/qa-v011-mobile.html'),'<!doctype html><meta charset="utf-8"><title>상점 모바일 검사</title><iframe title="게임" src="qa-v011.html" style="width:390px;height:844px;border:0"></iframe>');
console.log('Prepared disposable shop preview');
