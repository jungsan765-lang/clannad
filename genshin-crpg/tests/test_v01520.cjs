'use strict';
// 0.15.20 (the user's notes of 2026-10-05): a menu's way back no longer offers a finished story; official Korean names
// (페보니우스 기사단, 캣테일, 설탕, 운한사, 남십자 함대, 결정; 타타우파 협곡 stays); places beyond one move are see-through on
// the map; the battle's 「차례」 tag no longer sits on the 「○ 부착」 badge and follows whoever acts; enemy cards lose
// 선택/선택됨; the nine field bosses wear the user's pictures; 「해당 단계 재도전」 works after a lost boss step.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {fresh,root,c,advance}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const fnBody=(text,name)=>{const at=text.indexOf('function '+name+'(');assert(at>=0,name);let depth=0,i=text.indexOf('{',at);for(let j=i;j<text.length;j++){if(text[j]==='{')depth++;else if(text[j]==='}'){depth--;if(!depth)return text.slice(at,j+1);}}throw new Error('unclosed '+name);};
const plain=x=>JSON.parse(JSON.stringify(x));

check('the way back from a menu: the battle, its preparation, a scene that holds the screen, otherwise the main screen',()=>{
 const exp=src('app_experience.js'),gear=src('app_gear.js'),ctx=vm.createContext({game:null});
 vm.runInContext(fnBody(exp,'journeyReturn'),ctx);const back=game=>{ctx.game=game;return plain(vm.runInContext('journeyReturn()',ctx));};
 const r=fresh();assert.deepEqual(back(r),{label:'메인 화면으로',screen:'LOCATION'},'nothing waiting (a finished story too)');
 r.s.global.STORY_MENU_POLICY='SAVE_LOAD_ONLY';assert.deepEqual(back(r),{label:'이야기로 돌아가기',screen:'STORY'},'a scene that holds the screen');
 assert.deepEqual(back({s:{runtime:{}},playPhase:()=>'COMBAT',actionReason:()=>''}),{label:'전투로 돌아가기',screen:'COMBAT'});
 assert.deepEqual(back({s:{},playPhase:()=>'PREPARATION',actionReason:()=>'x'}),{label:'전투 준비로 돌아가기',screen:'STORY'});
 assert(gear.includes("const back=typeof journeyReturn==='function'?journeyReturn():"),'the 캐릭터 screen asks the same question');
 // 0.16.4: a lost story fight answers with the retry (tests/test_v0164.cjs); every other answer is still a 'MENU' button.
 assert(fnBody(exp,'journeyReturn')&&exp.includes("const back=journeyReturn();p.append(back.retry?actionButton(back.label,'STORY_RETRY',{},true):actionButton(back.label,'MENU',{screen:back.screen},true));"),'and so does every other menu');
});

check('official Korean names in the data, the story and the code; 타타우파 협곡 stays',()=>{
 const db=fs.readFileSync(path.join(root,'content/db.json'),'utf8');
 // 「고양이 꼬리 사냥활」 is this game's own bow for Diona (a cat's tail, not the tavern), so it keeps its name.
 const code=fs.readdirSync(path.join(root,'source')).filter(f=>/\.(js|html|css)$/.test(f)).map(f=>[f,src(f).split('고양이 꼬리 사냥활').join('')]);
 const wrong=['서풍 기사단','서풍기사단','서풍 교회','고양이 꼬리','다다우파','수크로스','운한 극단','남십자 선대','결정화'];
 for(const w of wrong){assert(!db.includes(w),'content/db.json: '+w);for(const [f,t] of code)assert(!t.includes(w),f+': '+w);}
 const count=(t,w)=>t.split(w).length-1;
 assert(count(db,'페보니우스 기사단')>=70&&count(db,'캣테일')>=39);
 assert(src('world_content.js').includes('{"id":"MAP_CRPG_DADAUPA_GORGE","name":"타타우파 협곡"'),'the map keeps the official 타타우파 협곡');
 assert(!src('runtime_geography.js').includes('replaceAll('),'no run-time renaming is needed any more');
 assert(fs.readFileSync(path.join(root,'tools/editorial/personal_k/VOICE_BIBLE.md'),'utf8').includes('타타우파 협곡(다다우파 X)'),'the writing guide says so too');
 const p=src('runtime_puzzles_v0152.js');
 for(const s of ["['페보니우스','몬드의 질서를 지키는 기사단의 이름']","['설탕','알베도의 조수']","'운한사의 배우'","'캣테일의 바텐더'","'페보니우스 성당의 수녀'","'남십자 함대'","'일곱신상'","'결정'"])assert(p.includes(s),s);
 return {wrong};
});

check('the map: a place beyond one move is see-through',()=>{
 const nav=src('app_navigation.js'),css=src('shell.css');
 assert(nav.includes("near.has(id)?' open near':' far'")&&nav.includes("['far','한 번에는 못 가는 곳']"));
 assert(css.includes('.terrain-navigation .terrain-node.far{opacity:.45;box-shadow:none}')&&css.includes('.terrain-key-item.far::before{opacity:.45}'));
});

check('battle: the 「차례」 tag and the 「○ 부착」 badge never share a corner, and the tag follows the fighter in the playback',()=>{
 const css=src('shell.css'),shell=src('app_shell.js');
 // 0.15.21: no tag at all any more — the acting card glows as a whole, so nothing can sit on the 「○ 부착」 badge.
 assert(!css.includes('.shell-turn-badge{position:absolute'),'no 「차례」 tag');
 assert(/\.shell-aura-badge\{position:absolute;top:6px;left:8px;/.test(css),'the element badge keeps the top left');
 assert(shell.includes("function turnBadge(row,scope=row.closest('.combat-panel')||document)"),'one tag per battle screen');
 assert(shell.includes("GameEffects.showAction=function(frame,...args){const out=priorShow.call(this,frame,...args);")&&shell.includes("if(row)turnBadge(row);orderNow();return out;"),'the playback moves it');
 assert(fnBody(shell,'orderNow').includes("now.append(mk('small','','현재'))"),'the order\'s 「현재」 goes along');
});

check('enemy cards: pressing the card chooses the target; 선택/선택됨 is gone and 「정보」 remains',()=>{
 const row=fnBody(src('app_experience.js'),'battleActorRow'),css=src('shell.css');
 assert(!row.includes("'선택됨'")&&!row.includes("'선택'"));
 assert(row.includes("c.classList.add('targetable');c.addEventListener('click',e=>{if(e.target.closest('button,a,select,input,summary,details')||selectedTarget===a.id)return;selectedTarget=a.id;render();});"));
 assert(src('app_enemy_intel.js').includes("const info=button('정보',()=>EnemyIntel.open(a.id));"));
 assert(!css.includes('.combatant-row.selected>button:not(.enemy-info-button)'),'no style left for the removed button');
});

check('the nine field bosses wear the pictures the user supplied',()=>{
 const FB=c.CRPGRuntime.fieldBosses,manifest=JSON.parse(fs.readFileSync(path.join(root,'content/asset-manifest.json'),'utf8')),r=fresh();
 const ids=Object.keys(FB.bosses);assert.equal(ids.length,9);
 for(const id of ids){const key=id.toLowerCase(),a=manifest.assets['ASSET_ENEMY_'+id];
  assert.equal(r.row('09_MONSTER_DB',id)[15],key,id);
  assert(a&&a.file_name==='enemy_'+key+'.png'&&a.content_rating==='GENERAL'&&a.category==='ENEMY',id);
  assert.equal(manifest.monsters[id]?.asset_id,'ASSET_ENEMY_'+id);assert.deepEqual(manifest.owners['enemy_'+key],['ASSET_ENEMY_'+id]);
  const file=path.join(root,'assets','enemy_'+key+'.webp');assert(fs.existsSync(file),file);assert.equal(fs.readFileSync(file).subarray(8,12).toString(),'WEBP');}
 assert.equal(manifest.summary.enemies,Object.values(manifest.assets).filter(a=>a.category==='ENEMY').length);
 assert.equal(r.row('09_MONSTER_DB','FB_MIMIC_BOAR')[15],'NONE','the summoned water forms have no picture yet');
});

check('「해당 단계 재도전」 after a lost boss step: the button steps back through the entrance on this map',()=>{
 const exp=src('app_experience.js');assert(exp.includes("const go=async()=>{if(reenter&&!game.s.placeVisit){await act('PLACE_ENTER',{place,mode:'BOSS'});if(!game.s.placeVisit)return;}await act('BOSS_CONTINUE');};"));
 const FB=c.CRPGRuntime.fieldBosses,boss='FB_ANEMO_HYPOSTASIS',route=FB.route(boss),place='BOSS:'+route;
 const r=fresh(FB.bosses[boss].map);Object.assign(r.s.global,{SCREEN_MODE:'LOCATION',PLAYER_LEVEL_STATE:20});r.s.ascensions.PLAYER_CUSTOM=1;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 r.action('PLACE_ENTER',{place,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});assert(r.s.runtime);
 r.action('COMBAT_FORFEIT',{reason:'SESSION_RESUME'});
 assert.equal(r.s.bossRouteProgress.phase,'RETRY');assert.equal(r.s.placeVisit,null,'the defeat ended the visit');
 advance(61000);
 assert.equal(r.actionReason('BOSS_CONTINUE'),'장소 화면에서 먼저 들어가기를 선택해 주세요.','the old dead end, alone');
 assert.equal(r.actionReason('PLACE_ENTER',{place,mode:'BOSS'}),'','the entrance is right here');
 r.action('PLACE_ENTER',{place,mode:'BOSS'});r.action('BOSS_CONTINUE');assert(r.s.runtime,'the step is fought again');
 return {route};
});

const out=path.join(root,'reports','test_v01520.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
