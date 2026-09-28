'use strict';
const assert=require('node:assert/strict');
const {fs,path,root,fresh}=require('./helpers_v011.cjs');

function join(r,ids){
  const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');
  ids.forEach((id,i)=>{own[id]={state:'JOINED'};r.s.chars[id].hp=r.character(id).maxHp;r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};});
  r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);
}
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}

test('shield packets keep per-hit before/after values',()=>{
  const r=fresh('MAP_MOND_PLAINS');r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');
  const p=r.combatActor(),e=r.s.runtime.actors.find(a=>a.side==='ENEMY'),hp=p.hp;
  r.shield(p,100,'V0142_TEST',2);const start=r.s.runtime.log.length;
  r.applyDamage(e,p,60,{element:'물리'});
  const log=r.s.runtime.log.slice(start).find(x=>Object.hasOwn(x,'damage'));
  assert.equal(log.shieldBefore,100);assert.equal(log.shieldAfter,40);assert.equal(log.absorbed,60);assert.equal(p.hp,hp);
});

test('Baron Bunny has HP and probabilistic single-target interception',()=>{
  const r=fresh('MAP_MOND_PLAINS');join(r,['MOND_AMBER']);r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');
  const amber=r.combatActor('MOND_AMBER'),enemy=r.s.runtime.actors.find(a=>a.side==='ENEMY'),player=r.combatActor();
  const card=r.actorCards(amber).find(c=>c.id==='MOND_AMBER_E');r.executeCard(amber,card,enemy.id);
  const bunny=r.s.runtime.fields.find(f=>f.kind==='BUNNY');assert(bunny);assert.equal(bunny.tauntChance,30);assert(bunny.hp>0&&bunny.maxHp===bunny.hp);
  bunny.tauntChance=100;const hp=player.hp,bhp=bunny.hp;r.damage(enemy,player,.2,'PHYSICAL',{sureHit:true});
  assert.equal(player.hp,hp);assert(bunny.hp<bhp||bunny.done);assert(r.s.runtime.log.some(x=>x.taunted&&x.target==='토끼 백작'));
});

test('Oz attacks are presented from the summon and survive owner KO until their own duration ends',()=>{
  const r=fresh('MAP_MOND_PLAINS');join(r,['MOND_FISCHL']);r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');
  const f=r.combatActor('MOND_FISCHL'),enemy=r.s.runtime.actors.find(a=>a.side==='ENEMY');
  const card=r.actorCards(f).find(c=>c.id==='MOND_FISCHL_E');r.executeCard(f,card,enemy.id);
  const oz=r.s.runtime.fields.find(x=>x.kind==='OZ');assert(oz);f.hp=0;const start=r.s.runtime.log.length;r.tickFields('END');
  const packet=r.s.runtime.log.slice(start).find(x=>x.presentationActorId==='SUMMON:OZ:'+f.id);assert(packet);
});

test('summon UI, origin animation, BGM hold and asset shipping are connected',()=>{
  const exp=fs.readFileSync(path.join(root,'source/app_experience.js'),'utf8');
  const av=fs.readFileSync(path.join(root,'source/app_av.js'),'utf8');
  const pres=fs.readFileSync(path.join(root,'source/presentation.js'),'utf8');
  const liyue=fs.readFileSync(path.join(root,'source/runtime_liyue_cards.js'),'utf8');
  const build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
  for(const x of ['summon_baron_bunny.webp','summon_oz.webp','summon_guoba.webp','summon_yuegui.webp'])assert(exp.includes(x),x);
  assert(exp.includes('battleSummons('));assert(av.includes(".battle-summon[data-summon-id]"));assert(av.includes('shieldBefore')&&av.includes('shieldAfter'));
  assert(av.includes('combatHold')&&av.includes('GameAudio.sync()'));assert(pres.includes('presentationActorId'));
  assert(liyue.includes("presentationActorId:summonId")&&liyue.includes("GOU_BA:'누룽지'")&&liyue.includes("YUEGUI_THROWING:'월계'"));
  assert(build.includes("assets/summons"));
  for(const n of ['summon_baron_bunny.webp','summon_oz.webp','summon_guoba.webp','summon_yuegui.webp'])assert(fs.existsSync(path.join(root,'assets/summons',n)),n);
});
console.log(JSON.stringify({passed}));
