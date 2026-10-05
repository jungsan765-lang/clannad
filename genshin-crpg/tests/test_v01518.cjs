'use strict';
// 0.15.18 battle screen (the user's 2026-10-05 list: 「전투할때 누구 차례인지 잘 모르겠으니까 그것도 좀 잘 보이게 해주고」, an
// enemy chosen by pressing it, the battle log covering a phone, summons buried at the bottom): a 「…의 차례」 banner over the
// commands and a 「차례」 tag on the fighter's card, the whole enemy card chooses the target, summons stand at the top of
// the battlefield, and the phone playback window leaves the fight in view.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const exp=src('app_experience.js'),shell=src('app_shell.js'),css=src('shell.css');
const fnBody=(text,name)=>{const at=text.indexOf('function '+name+'(');assert(at>=0,name);let depth=0,i=text.indexOf('{',at);for(let j=i;j<text.length;j++){if(text[j]==='{')depth++;else if(text[j]==='}'){depth--;if(!depth)return text.slice(at,j+1);}}throw new Error('unclosed '+name);};

check('whose turn: a banner with the fighter\'s face over the commands, and a tag on the card',()=>{
 const banner=fnBody(exp,'battleTurnBanner');
 assert(banner.includes('const x=b.order?.[b.cursor],a=x&&b.actors.find(t=>t.id===x.id);if(!a||a.hp<=0)return null;'),'the fighter at the cursor');
 assert(banner.includes("el('strong','',combatDisplayName(b,a)+'의 차례')"),'「…의 차례」');
 assert(banner.includes("'행동을 고르고 적을 눌러 대상을 정한 뒤 실행하세요.'")&&banner.includes("'적이 행동합니다.'"));
 assert(exp.includes("if(!opening){const turn=battleTurnBanner(b);if(turn)controls.append(turn);}"),'shown once the fight has begun, first in the commands');
 // 0.15.21: the whole card glows instead of wearing a 「차례」 tag (user: 「차례인 인원은 아예 그 캐릭터 프로필 전체가 빛나는걸로」).
 assert(shell.includes("row.classList.add('shell-acting');}")&&shell.includes("if(row)turnBadge(row,p);")&&!shell.includes("mk('span','shell-turn-badge','차례')"),'the acting card glows, one per battle screen');
 assert(/body\.teyvat \.battle-command \.battle-turn-banner\{[^}]*animation:shellGlow/.test(css)&&/\.combatant-row\.shell-acting\{[^}]*animation:fxActingGlow/.test(css));
 return {};
});

check('targets: a press anywhere on a card that can be targeted chooses it',()=>{
 const row=fnBody(exp,'battleActorRow');
 assert(row.includes("c.classList.add('targetable');c.addEventListener('click',e=>{if(e.target.closest('button,a,select,input,summary,details')||selectedTarget===a.id)return;selectedTarget=a.id;render();});"),'the card itself, its own buttons keep their jobs');
 assert(!row.includes("'선택됨'"),'0.15.20: the card is the only way, its small 선택/선택됨 button is gone');
 assert(/\.combatant-row\.targetable\{cursor:pointer\}/.test(css)&&/@media \(hover:hover\)\{[^}]*targetable/.test(css),'a pointer, and a ring only where the pointer hovers');
 return {};
});

check('summons: at the top of the battlefield, a lane only for a side that has one',()=>{
 const s=fnBody(exp,'battleSummons');
 assert(s.includes("el('div','battle-summons top')")&&s.includes('if(!list.length)continue;')&&s.includes('p.prepend(wrap);'));
 assert(!s.includes("'없음'"),'no empty lane');
 assert(s.includes("card.dataset.summonId=m.id(f)"),'the playback still finds a summon by its id');
 assert(/\.battle-summons\.top\{display:flex/.test(css));
 return {};
});

check('phone playback: a short window (speed and pause on one line) that leaves the fight in view',()=>{
 const phone=css.slice(css.indexOf('/* 0.15.18 battle screen'));
 assert(/@media \(max-width:760px\)\{[\s\S]*body\.teyvat \.combat-playback\{max-height:min\(30dvh,250px\);[^}]*display:grid/.test(phone));
 assert(phone.includes('body.teyvat .combat-playback .combat-speed{grid-column:1}')&&phone.includes('body.teyvat .combat-playback .playback-buttons{grid-column:2;flex-wrap:nowrap}'));
 return {};
});

const out=path.join(root,'reports','test_v01518.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
