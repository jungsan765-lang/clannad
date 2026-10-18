/* 0.16.67 정기 축제 화면 (runtime_reading.js 0.16.67, server/festivals-v01667.mjs; user: 「정기 이벤트 만드는것도 나쁘지 않긴 하겠네.
 * 크리스마스라던가 추석 설날 이럴때」, 「설날 추석은 아예 한국식으로다가 축제를 바꿔도 되잖아? 스토리도 조금 추가하고」). While a festival is
 * open the menu has its tile and the location screen's 할 일 tab its card; both open the festival window: the festival's name, the days,
 * the points with the rewards they reach, and six tabs — 이야기 (설날·추석), 매일 도전, the minigame, the travel task, 점수 보상 (the
 * 4★ pick at the end) and 교환소 (축제 교환, app_opevents_v01666.js). Everything is chosen by pressing; nothing scrolls. A story part
 * plays in its own window like the story screen (the words: app_feststory_v01667.js, from the story workbench). A travel task can also
 * be done from the location screen where it happens. The minigames themselves are app_festgames_v01667.js. */
(function(){'use strict';
const K=window.CRPGRuntime?.festivalV01667;if(!K||typeof drawLocation!=='function')return;
const F=window.CRPGFestival={tab:null,node:null,pick:null,msg:'',busy:false,reader:null};
const STORY=()=>window.CRPGFestivalStory?.chains||{};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','fe-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const SND=n=>{try{window.CRPGSound?.play?.(n);}catch{}};
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.festivalView==='function';
const view=()=>{try{return ready()?game.festivalView():null;}catch(e){console.error('[festival]',e);return null;}};
const charName=id=>{try{return game.tables['07_CHAR_DB'].get(id)?.[1]||id;}catch{return id;}};
const itemName=id=>{try{return game.tables['14_ITEM_DB'].get(id)?.[1]||id;}catch{return id;}};
const mapName=id=>{try{return String(game.tables['32_MAP_DB'].get(id)?.[2]||id);}catch{return id;}};
const img=(src,cls)=>{if(!src)return null;const i=mk('img',cls);i.src=src;i.alt='';i.draggable=false;i.loading='lazy';return i;};
const itemIcon=(id,cls='fe-ic')=>img(MAN().itemIcons?.icons?.[id]?.path,cls)||mk('span',cls+' fe-ic-none');
const cur=(key,cls='fe-ic')=>window.currencyIcon?.(key,cls)||mk('span',cls+' fe-ic-none');
const face=(id,cls='fe-face')=>{let src=null;try{src=id==='ENTITY_PAIMON'?portraitFor?.('ENTITY_PAIMON'):typeof combatPortraitSrc==='function'?combatPortraitSrc({side:'ALLY',source:id}):null;}catch{}return img(src,cls)||mk('span',cls+' fe-face-none');};
const foeFace=(id,cls='fe-foe')=>{let src=null;try{src=typeof combatPortraitSrc==='function'?combatPortraitSrc({side:'ENEMY',source:id}):null;}catch{}return img(src,cls)||mk('span',cls+' fe-face-none');};
const mapPic=id=>{try{let m=MAN().maps?.[id];if(!m){const parent=game.tables['32_MAP_DB'].get(id)?.[3];m=parent&&MAN().maps?.[parent];}return m?.url||(m?.file_name&&typeof assetPath==='function'?assetPath(m.file_name):null)||null;}catch{return null;}};
const withJ=(w,p)=>w+(window.CRPGText?.josa?.(w,p)||p);
const left=ms=>{const h=Math.ceil(ms/3600000);return h>48?Math.ceil(h/24)+'일 남음':Math.max(1,h)+'시간 남음';};
const until=t=>{try{return new Date(t).toLocaleDateString('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'});}catch{return '';}};
const TASK_VERB={GIFT:'선물 전하기',SEBAE:'세배하기',CHARYE:'차례상에 올리기'};
const PLACE_PIC={XMAS:'MAP_MOND_CITY',SEOLLAL:'MAP_LIYUE_HARBOR',CHUSEOK:'MAP_LIYUE_HARBOR'};
async function run(type,params){
 if(F.busy||typeof act!=='function')return null;F.busy=true;F.msg='';
 try{const out=await act(type,params);if(out&&out.ok===false){F.msg=out.error||'';return null;}return out?.result??out??null;}
 catch(e){F.msg=e?.message||'';return null;}finally{F.busy=false;}
}
// the rewards points reached (paid at once): shown together
function rewardChips(m,cls='fe-chip'){
 const out=[];if(m.primogem){const c=mk('span',cls);c.append(cur('PRIMOGEM'),mk('b','','원석 '+fmt(m.primogem)));out.push(c);}
 if(m.mora){const c=mk('span',cls);c.append(cur('MORA'),mk('b','','모라 '+fmt(m.mora)));out.push(c);}
 for(const [id,n] of Object.entries(m.items||{})){const c=mk('span',cls);c.append(itemIcon(id),mk('b','',itemName(id)+' ×'+n));out.push(c);}
 if(m.pick){const c=mk('span',cls+' pick');c.append(mk('b','','4성 동료 고르기'));out.push(c);}
 return out;
}
function gained(res){
 if(!res)return;const paid=res.milestones||[];const parts=[];
 if(res.points)parts.push('축제 점수 +'+res.points);if(res.primogem)parts.push('원석 +'+res.primogem);if(res.mora)parts.push('모라 +'+fmt(res.mora));
 F.msg=(res.text?res.text+' ':'')+parts.join(' · ');
 if(paid.length&&typeof showModal==='function'){const box=mk('div','fe-paid');box.append(mk('p','fe-paid-lead','축제 점수 '+fmt(res.total)+'점! 보상을 받았습니다.'));const row=mk('div','fe-paid-row');for(const m of paid){const cell=mk('div','fe-paid-cell');cell.append(mk('small','',fmt(m.at)+'점'),...rewardChips(m));row.append(cell);}box.append(row);showModal('축제 점수 보상',box);SND('reward');}
}
// ---------- the window ----------
function open(tab){
 const v=view();if(!v)return;if(tab)F.tab=tab;if(!F.tab)F.tab=v.story.length?'story':'fight';
 if(F.node){draw();return;}
 const wrap=mk('div','fe-overlay fe-'+v.key.toLowerCase());wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',v.name);
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'&&!F.reader){e.preventDefault();e.stopPropagation();close();}});
 wrap.append(mk('div','fe-box'));document.body.append(wrap);F.node=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));SND('menu_open');draw();
}
function close(){F.node?.remove();F.node=null;F.pick=null;F.msg='';try{if(typeof render==='function')render();}catch{}}
F.open=open;F.close=close;
function tabsOf(v){return [...(v.story.length?[['story','이야기']]:[]),['fight','매일 도전'],['game',v.gameName],['task',v.taskName],['points','점수 보상'],['shop','교환소']];}
function draw(){
 const wrap=F.node;if(!wrap)return;const v=view();if(!v){close();return;}
 const box=wrap.querySelector('.fe-box');wrap.className='fe-overlay open fe-'+v.key.toLowerCase();
 // banner: the name, the days and the points
 const head=mk('header','fe-head'),pic=mapPic(PLACE_PIC[v.key]);if(pic)head.style.setProperty('--fe-pic','url("'+pic+'")');
 const title=mk('div','fe-title');title.append(mk('small','fe-kicker','정기 축제'+(v.test?' · 시험':'')),mk('strong','fe-name',v.name),mk('span','fe-sub',v.sub));
 const when=mk('div','fe-when');when.append(mk('b','',v.open?(v.day>=7?'모든 날 열림':v.day+'일째'):'축제 끝'),mk('small','',v.open?until(v.startsAt)+' ~ '+until(v.endsAt-1)+' · '+left(v.endsAt-Date.now()):'점수 보상의 동료 고르기만 '+left(v.endsAt+7*86400000-Date.now())));
 const last=v.milestones.at(-1).at,meter=mk('div','fe-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label','축제 점수 '+v.points+' / '+last);
 const bar=mk('div','fe-bar');bar.style.setProperty('--p',Math.min(100,v.points/last*100).toFixed(1)+'%');for(const m of v.milestones){const t=mk('i','fe-tick'+(m.got?' on':''));t.style.left=(m.at/last*100)+'%';bar.append(t);}
 meter.append(mk('small','','축제 점수'),mk('b','',fmt(v.points)+' / '+fmt(last)),bar);
 const x=mk('button','fe-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(window.CRPGShell?.icon?.('CLOSE','shell-icon')||mk('span','','✕'));x.onclick=close;
 head.append(title,when,meter,x);
 const tabs=mk('nav','fe-tabs');tabs.setAttribute('role','tablist');
 for(const [key,label] of tabsOf(v)){const b=btn(label,()=>{F.tab=key;F.msg='';F.pick=null;draw();},'fe-tab'+(F.tab===key?' on':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(F.tab===key));const dot=attention(v,key);if(dot)b.append(mk('i','fe-dot'));tabs.append(b);}
 if(!tabsOf(v).some(([k])=>k===F.tab))F.tab='fight';
 const body=mk('div','fe-body fe-tab-'+F.tab);
 ({story:storyTab,fight:fightTab,game:gameTab,task:taskTab,points:pointsTab,shop:shopTab})[F.tab](body,v);
 const parts=[head,tabs,body];if(F.msg){const m=mk('p','fe-msg',F.msg);m.setAttribute('role','status');parts.push(m);}
 box.replaceChildren(...parts);
}
// a dot on a tab with something to do now
function attention(v,key){
 if(!v.open)return key==='points'&&v.pickable;
 if(key==='story')return v.story.some(s=>s.open&&!s.done&&(s.part===1||v.story[s.part-2].done));
 if(key==='fight')return v.days.some(d=>d.open&&!d.fight.got[0]);
 if(key==='game')return v.days.some(d=>d.open&&!d.game.tier);
 if(key==='task')return v.days.some(d=>d.open&&d.tasks.some(t=>t.here&&!t.done));
 if(key==='points')return v.pickable;
 return false;
}
const locked=(d)=>{const c=mk('div','fe-locked');c.append(mk('b','',d+'일째'),mk('small','','그날 열립니다'));return c;};
// ---------- 이야기 ----------
function storyTab(body,v){
 const grid=mk('div','fe-stories');
 for(const s of v.story){
  const c=STORY()[s.chain],card=mk('article','fe-story'+(s.done?' done':'')+(s.open?'':' shut')),pic=mapPic(c?.map);if(pic)card.style.setProperty('--fe-pic','url("'+pic+'")');
  card.append(mk('small','fe-story-no',s.part+'편'),mk('strong','fe-story-title',c?.title||'이야기'));
  const cast=mk('div','fe-cast');for(const id of castOf(c).slice(0,4))cast.append(face(id,'fe-cast-face'));card.append(cast);
  const foot=mk('div','fe-story-foot');
  if(!s.open)foot.append(mk('span','fe-wait',s.day+'일째에 열림'));
  else{const why=s.done?'':game.actionReason('FESTIVAL_STORY',{festival:v.id,part:s.part});
   if(!s.done)foot.append(...rewardChips({primogem:v.storyReward.primogem}),mk('span','fe-chip','점수 '+v.storyReward.points));else foot.append(mk('span','fe-chip got','봄'));
   const go=btn(s.done?'다시 보기':'보기',()=>read(v,s),'primary fe-go');if(why&&!s.done&&/앞 이야기/.test(why)){go.disabled=true;go.title=why;}if(!c){go.disabled=true;go.title='이야기를 불러오지 못했습니다.';}foot.append(go);}
  card.append(foot);grid.append(card);
 }
 body.append(grid);
}
// who appears in a part (their faces on its card)
const NAME_IDS=()=>{if(F._names)return F._names;const m={'페이몬':'ENTITY_PAIMON'};try{for(const r of game.tables['07_CHAR_DB'].values())if(r[1]&&!m[r[1]])m[r[1]]=r[0];}catch{}return F._names=m;};
function castOf(c){const seen=[];const walk=l=>{for(const it of l||[]){const id=it.who&&NAME_IDS()[it.who];if(id&&!seen.includes(id))seen.push(id);for(const o of it.opts||[])walk(o.items);}};walk(c?.items);return seen;}
// ---------- the story window ----------
function read(v,s){
 const c=STORY()[s.chain];if(!c)return;const name=String(game.s.global.PLAYER_NAME||'');
 const words=t=>{try{return window.CRPGText?CRPGText.readable(t,{name}):String(t).replaceAll('{PLAYER_NAME}',name);}catch{return String(t);}};
 const R=F.reader={v,s,c,stack:[],list:c.items,i:0,map:c.map,done:false,auto:false};
 const wrap=mk('div','fe-reader');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',c.title);
 const bg=mk('div','fe-reader-bg'),fig=mk('div','fe-reader-fig'),boxEl=mk('div','fe-reader-box'),who=mk('strong','fe-reader-who'),text=mk('p','fe-reader-text'),choices=mk('div','fe-reader-choices'),place=mk('div','fe-reader-place');
 const top=mk('div','fe-reader-top');top.append(mk('span','fe-reader-title',v.name+' '+s.part+'편 · '+c.title));
 const skip=btn('건너뛰기',()=>{skipTo();},'fe-reader-skip');const quit=btn('나가기',()=>end(false),'fe-reader-quit');top.append(skip,quit);
 const next=mk('span','fe-reader-next','▼');boxEl.append(who,text,next);
 wrap.append(bg,fig,place,top,choices,boxEl);(F.node||document.body).append(wrap);
 const setMap=id=>{R.map=id;const p=mapPic(id);bg.style.backgroundImage=p?'url("'+p+'")':'';place.replaceChildren(mk('strong','',mapName(id)));place.classList.remove('show');void place.offsetWidth;place.classList.add('show');};
 setMap(c.map);
 let waiting=null;// a choice on screen
 const show=(speaker,line,kind)=>{
  who.textContent=speaker;who.hidden=!speaker;text.textContent=words(line);boxEl.className='fe-reader-box '+kind;
  fig.replaceChildren();const id=speaker&&NAME_IDS()[speaker];if(id&&kind==='line'){const f=face(id,'fe-reader-face');fig.append(f);}
 };
 function step(){
  if(R.done)return;if(waiting)return;
  for(let guard=0;guard<400;guard++){
   if(R.i>=R.list.length){const back=R.stack.pop();if(!back){finish();return;}R.list=back.list;R.i=back.i;continue;}
   const it=R.list[R.i++];
   if(it.t==='scene'){wrap.classList.remove('dip');void wrap.offsetWidth;wrap.classList.add('dip');continue;}
   if(it.t==='move'){setMap(it.toId);continue;}
   if(it.t==='narr'){show('',it.text,'narr');return;}
   if(it.t==='line'){show(it.who,it.text,'line');return;}
   if(it.t==='say'){show(name||'나',it.text,'say');return;}
   if(it.t==='choice'){waiting=it;choices.replaceChildren();it.opts.forEach((o,i)=>{const b=btn(words(o.label),()=>pick(o),'fe-reader-choice');b.dataset.key=String(i+1);choices.append(b);});boxEl.classList.add('asking');return;}
  }
 }
 function pick(o){waiting=null;choices.replaceChildren();R.stack.push({list:R.list,i:R.i});R.list=o.items;R.i=0;show(name||'나',o.label,'say');}
 function skipTo(){// to the next choice or the end
  for(let guard=0;guard<2000&&!waiting&&!R.done;guard++){const before=R.i,list=R.list;step();if(R.done||waiting)break;if(R.list===list&&R.i===before)break;}
 }
 async function finish(){
  R.done=true;boxEl.className='fe-reader-box end';who.hidden=true;fig.replaceChildren();text.textContent='「'+c.title+'」 끝';next.hidden=true;
  const foot=mk('div','fe-reader-end');
  if(!s.done){const res=await run('FESTIVAL_STORY',{festival:v.id,part:s.part});if(res){foot.append(...rewardChips({primogem:res.primogem}),mk('span','fe-chip','점수 +'+res.points));gained(res);}else if(F.msg)foot.append(mk('span','fe-chip warn',F.msg));}
  foot.append(btn('닫기',()=>end(true),'primary'));boxEl.append(foot);
 }
 function end(){wrap.remove();F.reader=null;document.removeEventListener('keydown',keys,true);draw();}
 const keys=e=>{if(!F.reader)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end();return;}
  if(waiting&&/^[1-9]$/.test(e.key)){const o=waiting.opts[Number(e.key)-1];if(o){e.preventDefault();pick(o);}return;}
  if(!waiting&&!R.done&&(e.key===' '||e.key==='Enter')){e.preventDefault();step();}};
 document.addEventListener('keydown',keys,true);
 wrap.addEventListener('click',e=>{if(e.target.closest('button'))return;if(!waiting&&!R.done)step();});
 SND('menu_open');step();
}
// ---------- 매일 도전 ----------
const membersOf=group=>{try{return [...new Set(game.rows('49_ENCOUNTER_MEMBER_DB').filter(m=>m[1]===group).map(m=>m[3]))];}catch{return [];}};
function fightTab(body,v){
 const grid=mk('div','fe-fights');
 for(const d of v.days){
  const f=d.fight,card=mk('article','fe-fight'+(d.open?'':' shut')+(f.got.every(Boolean)?' full':''));
  const top=mk('div','fe-fight-top');top.append(mk('small','fe-day',d.day+'일째'),mk('strong','',f.name));card.append(top);
  if(!d.open){card.append(locked(d.day));grid.append(card);continue;}
  const foes=mk('div','fe-foes');for(const id of membersOf(f.group).slice(0,3))foes.append(foeFace(id));foes.append(mk('span','fe-lv','Lv.'+f.level));card.append(foes);
  const rule=mk('div','fe-rules');for(const r of f.rule.length?f.rule:['특별 규칙 없음'])rule.append(mk('span','fe-rule',r));card.append(rule);
  const stars=mk('ul','fe-stars');f.stars.forEach((t,i)=>{const li=mk('li',f.got[i]?'on':'');li.append(mk('i','fe-star',f.got[i]?'★':'☆'),mk('span','',t));stars.append(li);});card.append(stars);
  const args={festival:v.id,day:d.day},why=game.actionReason('FESTIVAL_FIGHT',args);
  const go=btn(f.got.every(Boolean)?'별 셋 완료':'도전',async()=>{const res=await run('FESTIVAL_FIGHT',args);if(res&&game.s.runtime){close();}else draw();},'primary fe-go');if(why){go.disabled=true;go.title=why;}
  card.append(go);grid.append(card);
 }
 const all=v.days.reduce((n,d)=>n+d.fight.got.filter(Boolean).length,0),sum=mk('article','fe-fight fe-fight-sum');
 sum.append(mk('small','fe-day','받은 별'),mk('strong','fe-sum-stars',all+' / 21'),mk('span','fe-rule','별 하나 = 축제 점수 '+v.points_.star+' · 원석 '+v.primo.star),mk('span','fe-rule','적은 주인공 레벨에 맞춰짐'),mk('span','fe-rule','받은 별은 다시 도전해도 남음'));grid.append(sum);
 body.append(grid);
}
// ---------- the minigame ----------
// who is drawn beside the minigame: the 윷놀이 friend of the day, the snowball friends, 향릉 at the songpyeon
const GAME_ART={YUT:d=>[d.game.foe].filter(Boolean),SNOWBALL:()=>['MOND_AMBER','MOND_BENNETT','MOND_KAEYA'],SONGPYEON:()=>['LIYUE_XIANGLING']};
const GAME_HOW={
 SNOWBALL:['눈 벽에서 일어나 있으면 던질 수 있음','튀어나온 사람을 눌러 눈덩이 던지기','머리 위에 「!」가 뜨면 숨기','45초 · 연속으로 맞히면 점수가 더 큼'],
 YUT:['윷 던지기 → 갈 말 누르기','도 1 · 개 2 · 걸 3 · 윷 4 · 모 5 · 빽도 뒤로 1','윷·모가 나오거나 상대 말을 잡으면 한 번 더','모서리·가운데에 멈추면 지름길'],
 SONGPYEON:['송편 하나에 세 번: 떼기 · 소 넣기 · 빚기','움직이는 표시가 금빛 칸에 올 때 누르기','가운데일수록 「완벽」','송편 여덟 개']
};
function gameTab(body,v){
 const sel=Math.min(v.day,Math.max(1,F.gameDay||v.days.find(d=>d.open&&!d.game.tier)?.day||v.day));F.gameDay=sel;
 const stages=mk('div','fe-stages');
 for(const d of v.days){const b=btn('',()=>{F.gameDay=d.day;draw();},'fe-stage'+(d.day===sel?' on':'')+(d.open?'':' shut'));b.disabled=!d.open;
  b.append(mk('small','',d.day+'일째'));if(d.open){const st=mk('span','fe-tier');for(let i=1;i<=3;i++)st.append(mk('i',i<=d.game.tier?'on':'',i<=d.game.tier?'★':'☆'));b.append(st,mk('small','fe-best',d.game.best?'최고 '+fmt(d.game.best):'아직'));}else b.append(mk('small','','잠김'));
  if(v.game==='YUT'&&d.open&&d.game.foe)b.prepend(face(d.game.foe,'fe-stage-face'));stages.append(b);}
 const d=v.days[sel-1],panel=mk('section','fe-game'),copy=mk('div','fe-game-copy'),art=mk('div','fe-game-art');
 const title=mk('div','fe-game-title');title.append(mk('strong','',v.gameName+' · '+sel+'일째'));if(v.game==='YUT'&&d.game.foe){const foe=mk('span','fe-game-foe');foe.append(mk('b','',withJ(charName(d.game.foe),'과')+' 한판'));title.append(foe);}copy.append(title);
 for(const id of (GAME_ART[v.game]?.(d)||[]))art.append(face(id,'fe-game-pic'));
 const how=mk('div','fe-how');for(const t of GAME_HOW[v.game]||[])how.append(mk('span','fe-rule',t));copy.append(how);
 const tiers=mk('div','fe-tiers');[1,2,3].forEach(i=>{const c=mk('span','fe-chip'+(i<=d.game.tier?' got':''));c.append(mk('b','','★'.repeat(i)),mk('span','','점수 '+v.points_.tier[i]+' · '),cur('PRIMOGEM'),mk('span','',String(v.primo.tier*i)));tiers.append(c);});
 tiers.append(mk('small','fe-tier-note',v.game==='YUT'?'★ 끝까지 · ★★ 말 하나 이상 나기 · ★★★ 이기기':'점수에 따라 ★ 하나에서 셋'));copy.append(tiers);
 const args={festival:v.id,day:sel},why=game.actionReason('FESTIVAL_GAME_START',args);
 const go=btn(d.game.tier?'다시 하기':'시작',()=>startGame(v,sel),'primary fe-go big');if(why||!window.CRPGFestGames){go.disabled=true;go.title=why||'미니게임을 불러오지 못했습니다.';}copy.append(go);
 panel.append(copy,art);body.append(stages,panel);
}
async function startGame(v,day){
 const res=await run('FESTIVAL_GAME_START',{festival:v.id,day});const job=res?.job||game.s.festivalGame;if(!job){draw();return;}
 window.CRPGFestGames.play(job,{name:v.gameName,foe:res?.foe||null,parent:F.node,
  finish:async input=>{const out=await run('FESTIVAL_GAME_FINISH',{festival:v.id,job:job.id,input});if(out)gained(out);draw();return out;},
  quit:()=>draw()});
}
// ---------- 이동 과제 ----------
function taskCell(v,d,t,n,compact){
 const c=mk('div','fe-task'+(t.done?' done':'')+(t.here?' here':'')),pic=compact?null:mapPic(t.map);if(pic)c.style.setProperty('--fe-pic','url("'+pic+'")');
 const who=mk('div','fe-task-who');const id=NAME_IDS()[t.who];if(id)who.append(face(id,'fe-task-face'));who.append(mk('b','',t.what?t.what:t.who));c.append(who);
 c.append(mk('small','fe-task-place',t.place));
 if(t.has){const need=mk('div','fe-need');for(const x of t.has){const s=mk('span','fe-need-item'+(x.have>=x.n?' ok':''));s.append(itemIcon(x.id),mk('b','',x.have+'/'+x.n));s.title=itemName(x.id);need.append(s);}c.append(need);}
 if(t.done)c.append(mk('span','fe-chip got','완료'));
 else if(t.here){const args={festival:v.id,day:d.day,n},why=game.actionReason('FESTIVAL_TASK',args);const b=btn(TASK_VERB[v.task],async()=>{const res=await run('FESTIVAL_TASK',args);if(res)gained(res);if(F.node)draw();else if(typeof render==='function')render();},'primary fe-go');if(why){b.disabled=true;b.title=why;}c.append(b);}
 else if(!compact){const chip=mk('span','fe-chip');chip.append(mk('span','','가서 하기 · '),cur('PRIMOGEM'),mk('span','',String(v.primo.task)+(t.mora?' · 모라 '+fmt(t.mora):'')));c.append(chip);}
 return c;
}
function taskTab(body,v){
 const grid=mk('div','fe-tasks');
 for(const d of v.days){const col=mk('section','fe-task-day'+(d.open?'':' shut'));col.append(mk('small','fe-day',d.day+'일째'));
  if(!d.open){col.append(locked(d.day));grid.append(col);continue;}
  d.tasks.forEach((t,n)=>col.append(taskCell(v,d,t,n)));grid.append(col);}
 body.append(grid,mk('p','fe-hint',v.task==='CHARYE'?'모아 온 것을 왕생당(리월항 · 북쪽 진입로)에서 차례상에 올립니다. 그곳의 메인 화면에도 버튼이 생깁니다.':'그 장소에 가면 메인 화면에도 버튼이 생깁니다.'));
}
// ---------- 점수 보상 ----------
function pointsTab(body,v){
 const row=mk('div','fe-miles');
 for(const m of v.milestones){const c=mk('div','fe-mile'+(m.got?' got':v.points>=m.at?' ready':'')+(m.pick?' last':''));c.append(mk('small','fe-mile-at',fmt(m.at)+'점'));
  if(m.pick){const pic=mk('div','fe-mile-pick');pic.append(mk('b','','4성'),mk('small','','한 명 고르기'));c.append(pic);}else c.append(...rewardChips(m,'fe-mile-chip'));
  c.append(mk('span','fe-mile-state',m.got?(m.pick?'받음':'받음'):v.points>=m.at?(m.pick?'고를 수 있음':'받음'):'아직'));row.append(c);}
 body.append(row);
 const four=mk('section','fe-four'+(v.pickable?' open':''));
 if(v.picked){four.append(mk('h3','',withJ(charName(v.picked),'을')+' 골랐습니다'),face(v.picked,'fe-four-big'));body.append(four);return;}
 four.append(mk('h3','',v.pickable?'함께할 4성 동료를 고르세요':'축제 점수 '+fmt(v.milestones.at(-1).at)+'점에 고를 수 있는 동료'),mk('small','fe-four-note','이미 함께하는 동료를 고르면 운명의 자리가 하나 열립니다'));
 const grid=mk('div','fe-four-grid');grid.style.setProperty('--n',String(Math.ceil(v.four.length/2)));
 for(const x of v.four){const b=btn('',()=>{F.pick=x.id;draw();},'fe-four-pick'+(F.pick===x.id?' on':''));b.setAttribute('aria-pressed',String(F.pick===x.id));b.append(face(x.id,'fe-four-face'),mk('b','',charName(x.id)),mk('small','',x.owned?'운명의 자리':'새 동료'));if(!v.pickable)b.disabled=true;grid.append(b);}
 four.append(grid);
 if(v.pickable){const args={festival:v.id,char:F.pick},why=F.pick?game.actionReason('FESTIVAL_PICK',args):'동료를 골라 주세요.';
  const go=btn(F.pick?charName(F.pick)+' 받기':'고를 동료를 누르세요',async()=>{const res=await run('FESTIVAL_PICK',args);if(res){F.msg=charName(res.char)+(res.joined?' 합류!':' · 운명의 자리 하나');SND('reward');}F.pick=null;draw();},'primary fe-go');if(why){go.disabled=true;go.title=why;}four.append(go);}
 body.append(four);
}
// ---------- 교환소 ----------
function shopTab(body,v){
 const shop=window.CRPGOpEvents?.shopBox?.(()=>draw());
 if(shop){const w=mk('div','oe-window');w.append(shop);body.append(w);const note=mk('div','oe-item fe-shop-note');note.append(mk('b','oe-item-name','축제가 끝나면'),mk('small','oe-cost','남은 증표는 사라집니다'));shop.querySelector('.oe-grid')?.append(note);}
 else body.append(mk('p','fe-hint','교환소를 불러오는 중입니다.'));
}
// ---------- where it opens ----------
const tile={icon:'STARS',get label(){return view()?.name||'축제';},show:()=>!!view(),run:()=>open()};
if(window.CRPGShell?.extraTiles)window.CRPGShell.extraTiles.push(tile);else if(typeof SHELL!=='undefined'&&SHELL.extraTiles)SHELL.extraTiles.push(tile);
// the location screen: the festival's card, and a travel task that is here
{const prior=drawLocation;drawLocation=function(p,v){prior(p,v);try{
 if(game.needsRecovery?.())return;const f=view();if(!f)return;
 const c=mk('section','card fe-card fe-'+f.key.toLowerCase()),pic=mapPic(PLACE_PIC[f.key]);if(pic)c.style.setProperty('--fe-pic','url("'+pic+'")');
 const head=mk('div','fe-card-head');head.append(mk('small','','정기 축제'),mk('strong','',f.name),mk('span','',f.open?(f.day>=7?'모든 날 열림':f.day+'일째')+' · '+left(f.endsAt-Date.now()):'끝남'));
 const go=btn('축제 열기',()=>open(),'primary fe-card-go');if(attention(f,'story')||attention(f,'fight')||attention(f,'game')||attention(f,'points'))go.append(mk('i','fe-dot'));head.append(go);c.append(head);
 const here=[];if(f.open)for(const d of f.days)if(d.open)d.tasks.forEach((t,n)=>{if(t.here&&!t.done)here.push([d,t,n]);});
 if(here.length){const row=mk('div','fe-card-tasks');for(const [d,t,n] of here.slice(0,2))row.append(taskCell(f,d,t,n,true));c.append(row);}
 // first in the list: a festival is the thing of these days
 const at=p.querySelector(':scope>.task-mini')||p.querySelector(':scope>.op-events-card');if(at)at.before(c);else{const m=p.querySelector(':scope>.main-objective');if(m)m.after(c);else p.prepend(c);}
}catch(e){console.error('[festival]',e);}};}
// the reward screen: a festival fight's stars
if(typeof reward==='function'){const prior=reward;reward=function(p,...args){const out=prior(p,...args);try{
 const r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}'),f=r.festival;if(!f||!f.stars)return out;
 const c=mk('section','card fe-result');c.append(mk('small','eyebrow','축제 도전 · '+f.day+'일째'));const st=mk('div','fe-result-stars');f.got.forEach((g,i)=>st.append(mk('i',g?(f.stars[i]?'on':'old'):'',g?'★':'☆')));c.append(st);
 c.append(mk('p','',f.points?'축제 점수 +'+f.points+(f.primogem?' · 원석 +'+f.primogem:'')+' · 모두 '+fmt(f.total)+'점':'새로 받은 별은 없습니다'));const again=btn('축제 열기',()=>open('fight'));c.append(again);p.append(c);
 if(f.milestones?.length)setTimeout(()=>gained({milestones:f.milestones,total:f.total}),400);}catch{}return out;};}
// a story window or the festival window closes when the account changes
window.addEventListener('crpg-session-change',()=>{if(F.node)close();});
})();
