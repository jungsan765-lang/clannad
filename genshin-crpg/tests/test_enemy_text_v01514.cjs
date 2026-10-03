'use strict';
// Render the real enemy detail from a real battle. Text changes must not change combat or saves.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {fresh,fs,path,root}=require('./helpers_v011.cjs');
const text=require('../source/readable_text.js');
class Element{
 constructor(tag,cls='',value=''){this.tag=tag;this.className=cls;this.text=text.readable(value);this.children=[];this.dataset={};}
 append(...nodes){this.children.push(...nodes);}
 insertBefore(node,before){const at=this.children.indexOf(before);if(at<0)this.children.push(node);else this.children.splice(at,0,node);}
 get textContent(){return this.text+this.children.map(n=>n.textContent).join(' ');}
}
const g=fresh();g.startBattle('EG_BOSS_DVALIN','QA');
const actor=g.s.runtime.actors.find(a=>a.source==='BOSS_DVALIN');assert(actor);
const originalRow=JSON.stringify(g.tables['12_ENEMY_CARD_DB'].get('ECARD_DVALIN_TERRAIN_CLOCK'));
assert.match(originalRow,/SET:DVALIN_TERRAIN_REMAIN=4/,'original rule definition is preserved');
const source=fs.readFileSync(path.join(root,'source/app_enemy_intel.js'),'utf8');
const context=vm.createContext({el:(...a)=>new Element(...a),game:g});
vm.runInContext(source.slice(0,source.indexOf('const intelActorRow=')),context);
function inspect(max){
 const before=g.serialize(),info=g.enemyIntel(actor.id),card=info.cards.find(c=>c.id==='ECARD_DVALIN_TERRAIN_CLOCK');assert(card);
 assert.match(card.description,new RegExp('전투 시작 시 지형은 '+max+'개'));
 assert.equal(card.summary,(max*2)+'라운드 종료 전에 드발린을 쓰러뜨려야 합니다.');
 assert(!/DVALIN_|TERRAIN_|SET:/.test(JSON.stringify([card.description,card.summary,card.coefficient])));
 context.info=info;const rendered=vm.runInContext('EnemyIntel.detail(info).textContent',context);
 assert(rendered.includes('전투 시작 시 지형은 '+max+'개'));
 assert(!rendered.includes('DVALIN_TERRAIN_REMAIN'));
 assert.equal(g.serialize(),before,'inspection must not mutate battle, account or progress');
 assert.equal(JSON.stringify(g.tables['12_ENEMY_CARD_DB'].get(card.id)),originalRow,'inspection must not rewrite rules');
}
assert.equal(g.s.runtime.terrainMax,4);inspect(4);
g.s.runtime.terrain=2;inspect(4); // Starting total must not shrink with remaining platforms.
delete g.s.runtime.mondBossBalance;
g.s.runtime.balanceProfile={version:3,kind:'STORY_DVALIN',party:1,recommendedLevel:4};
g.s.runtime.terrainMax=6;g.s.runtime.terrain=5;inspect(6);
delete g.s.runtime.terrainMax;inspect(4); // Older saves without the optional total use the original rule.
console.log('PASS enemy detail hides internal terrain variable, preserves battle/rules, and describes current and legacy platform totals');
