/* 0.15.2 공동 토벌전 화면 (runtime_raid_v0152.js, server/raid-v0152.mjs; user: 「공동 토벌전. 이거는 이벤트로, 레벨 10 이상이면
 * 누구나 무관하게 데미지 1씩 넣거나 이렇게 해서 턴 안에 데미지 어느정도 넣기 이런거 괜찮겠다. 다단히트성 캐릭터가 있으면 좋겠지?」).
 * Paimon's menu (공동 토벌전) and a card in the 할 일 tab open the week's raid: the boss, everyone's hits against the goal,
 * the stage rewards (25/50/75/100%) and one's own (100/300/600 hits), last week's rewards still waiting, the top ten and
 * 출격 (three a day, eight rounds, every hit counts 1). The battle shows the round and the hits; the reward screen says
 * how many landed. The account server keeps the shared total, so the raid opens only when logged in to it.
 * Load after app_chat.js and app_mail_v0151.js. */
(function(){'use strict';
const SHELL=window.CRPGShell,O=window.CRPGOnline,RAID=window.CRPGRuntime?.raidV0152;if(!SHELL||!RAID)return;
const R=window.CRPGRaid={node:null,status:null,enabled:null,loading:false,msg:'',busy:false,probe:0};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','rd-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.raidView==='function';
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const left=h=>h>48?Math.ceil(h/24)+'일':Math.max(1,h)+'시간';
const itemName=id=>{try{return game.tables['14_ITEM_DB'].get(id)?.[1]||id;}catch{return id;}};
function rewardText(w){const parts=[];if(w.primogem)parts.push('원석 '+w.primogem);if(w.mora)parts.push(fmt(w.mora)+' 모라');for(const [id,n] of Object.entries(w.items||{}))parts.push(itemName(id)+' '+n+'개');return parts.join(' · ');}
function bossArt(id,cls){try{const row=game.tables['09_MONSTER_DB'].get(id),src=row&&typeof assetPath==='function'?assetPath('enemy_'+row[15]+'.png'):null;if(src){const i=mk('img',cls);i.src=src;i.alt='';i.draggable=false;return i;}}catch{}return mk('span',cls+' fallback','✦');}
// ---------- the server ----------
async function load(){
 if(!O?.token||R.loading)return;R.loading=true;
 try{R.status=await O.request('/raid');R.enabled=true;R.msg='';}
 catch(e){if(e.status===404){R.enabled=false;R.status=null;}else R.msg=e.message;}
 finally{R.loading=false;}
 draw();
}
R.reload=load;
async function claim(event,reward){
 if(R.busy)return;R.busy=true;R.msg='';draw();
 try{const out=await O.request('/raid/claim',{event,reward});SND('chest_reward');SHELL.toast?.('공동 토벌전 보상 · '+rewardText(out.granted||{}));try{await O.sync();}catch{}}
 catch(e){R.msg=e.message;SND('error');}
 finally{R.busy=false;}
 await load();
}
async function sortie(){
 if(R.busy)return;const why=reason();if(why){R.msg=why;draw();SND('error');return;}
 R.busy=true;let r;try{r=await act('RAID_ENTER',{});}catch(e){r={ok:false,error:e.message};}R.busy=false;
 if(r?.ok===false){R.msg=typeof r.error==='string'?r.error:r.error?.message||'출격하지 못했습니다.';draw();SND('error');return;}
 if(r)close();
}
function reason(){
 if(!ready())return '게임을 불러오는 중입니다.';if(!O?.token)return '공동 토벌전은 온라인 계정으로 접속했을 때 열립니다.';if(R.enabled===false)return '이 서버에서는 공동 토벌전이 열리지 않았습니다.';
 return game.raidReason?.()||'';
}
// ---------- the window ----------
function close(){if(!R.node)return;const n=R.node;R.node=null;n.classList.remove('open');setTimeout(()=>n.remove(),180);SND('menu_close');}
R.close=close;
R.open=function(){
 if(!ready())return;R.msg='';if(R.node){draw();load();return;}
 const wrap=mk('div','rd-overlay');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','공동 토벌전');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 wrap.append(mk('div','rd-box'));document.body.append(wrap);R.node=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));SND('menu_open');draw();load();
};
function draw(){
 const wrap=R.node;if(!wrap||!ready())return;const box=wrap.querySelector('.rd-box'),v=game.raidView(),st=R.status?.current||null,ev=st||v;
 const head=mk('header','rd-head');head.append(SHELL.icon('RAID','shell-icon rd-head-icon'));const t=mk('div','rd-head-copy');t.append(mk('strong','','공동 토벌전'),mk('small','','이번 주 · 월요일 0시(한국 시간)까지 '+left(v.hoursLeft)));head.append(t);
 const x=mk('button','rd-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=close;head.append(x);
 const body=mk('div','rd-body');
 // the boss
 const hero=mk('section','rd-hero');hero.append(bossArt(ev.boss,'rd-boss-art'));const hc=mk('div','rd-hero-copy');hc.append(mk('h2','',ev.name),mk('p','',ev.text));
 hc.append(mk('p','rd-rule',RAID.rounds+'라운드 동안 보스를 맞힌 횟수만큼 힘을 보탭니다. 한 번 맞힐 때마다 공격의 세기와 관계없이 1입니다. 여러 번 때리는 동료(화살 연사, 소환물, 추가 공격)가 많이 맞힙니다.'));hero.append(hc);body.append(hero);
 // everyone's progress
 const total=st?.total??null,target=st?.target||RAID.target,ratio=total===null?0:Math.min(1,total/target);
 const prog=mk('section','rd-progress');const bar=mk('div','rd-bar');bar.style.setProperty('--p',(ratio*100).toFixed(1)+'%');
 for(const s of RAID.stages){const m=mk('span','rd-mark'+(ratio>=s.at?' on':''),Math.round(s.at*100)+'%');m.style.left=(s.at*100)+'%';bar.append(m);}
 prog.append(mk('h3','',total===null?(O?.token?'모두의 토벌 기록을 불러오는 중…':'온라인 계정으로 접속하면 모두의 토벌이 보입니다'):'모두 함께 '+fmt(total)+' / '+fmt(target)+' · 참여 '+(st.players||0)+'명'),bar);body.append(prog);
 // my record and the sortie
 const mine=mk('section','rd-mine'),facts=mk('div','rd-facts');
 const fact=(label,value)=>{const f=mk('div','rd-fact');f.append(mk('small','',label),mk('strong','',value));return f;};
 facts.append(fact('오늘 남은 출격',v.sortiesLeft+' / '+v.sorties),fact('이번 주 맞힌 횟수',fmt(st?.me?.hits??v.hits)),fact('한 번 최고',fmt(v.best)),fact('이번 주 출격',fmt(st?.me?.runs??v.runs)));mine.append(facts);
 const why=reason(),go=btn(R.busy?'출격 준비 중…':'출격',sortie,'primary rd-go');if(why||R.busy){go.disabled=true;go.title=why;}
 mine.append(go);if(why)mine.append(mk('p','rd-why',why));body.append(mine);
 // rewards
 const rewards=(e,title)=>{
  const sec=mk('section','rd-rewards');sec.append(mk('h3','',title));const list=mk('div','rd-reward-list');
  for(const s of e.stages){const row=mk('div','rd-reward'+(s.claimed?' claimed':s.reached?' reached':''));row.append(mk('strong','','모두 '+Math.round(s.at*100)+'% · '+fmt(s.need)),mk('span','',rewardText(s.reward)));
   if(s.claimed)row.append(mk('em','','받음'));else if(s.canClaim)row.append(btn('받기',()=>claim(e.id,s.key),'primary'));else row.append(mk('small','',s.reached?'한 번 이상 출격하면 받을 수 있습니다':'아직'));list.append(row);}
  for(const t of e.tiers){const row=mk('div','rd-reward mine'+(t.claimed?' claimed':t.reached?' reached':''));row.append(mk('strong','','내가 '+fmt(t.hits)+'번'),mk('span','',rewardText(t.reward)));
   if(t.claimed)row.append(mk('em','','받음'));else if(t.canClaim)row.append(btn('받기',()=>claim(e.id,t.key),'primary'));else row.append(mk('small','',fmt(e.me?.hits||0)+' / '+fmt(t.hits)));list.append(row);}
  sec.append(list);return sec;};
 if(st)body.append(rewards(st,'보상'));
 else{const sec=mk('section','rd-rewards');sec.append(mk('h3','','보상'));const list=mk('div','rd-reward-list');
  list.append(...RAID.stages.map(s=>{const r=mk('div','rd-reward');r.append(mk('strong','','모두 '+Math.round(s.at*100)+'%'),mk('span','',rewardText(s.reward)));return r;}),...RAID.tiers.map(t=>{const r=mk('div','rd-reward mine');r.append(mk('strong','','내가 '+fmt(t.hits)+'번'),mk('span','',rewardText(t.reward)));return r;}));
  sec.append(list);body.append(sec);}
 const prev=R.status?.previous;if(prev&&[...prev.stages,...prev.tiers].some(x=>x.canClaim))body.append(rewards(prev,'지난주 토벌 · '+prev.name+' · 받지 않은 보상'));
 // the top ten
 if(st?.top?.length){const sec=mk('section','rd-top');sec.append(mk('h3','','이번 주 많이 맞힌 모험가'));const ol=mk('ol','rd-top-list');for(const p of st.top){const li=mk('li',p.me?'me':'');li.append(mk('b','',p.rank),mk('span','',p.name),mk('strong','',fmt(p.hits)+'번'),mk('small','',p.runs+'회 출격'));ol.append(li);}sec.append(ol);body.append(sec);}
 const parts=[head,body];if(R.msg){const m=mk('p','rd-msg',R.msg);m.setAttribute('role','alert');parts.push(m);}
 box.replaceChildren(...parts);
}
// ---------- where it is opened ----------
SHELL.extraTiles.push({icon:'RAID',label:'공동 토벌전',show:()=>ready()&&!!O?.token&&R.enabled!==false,run:()=>R.open()});
if(typeof drawLocation==='function'){const prior=drawLocation;drawLocation=function(p,v){
 prior(p,v);
 try{
  if(!ready()||!O?.token||R.enabled===false||game.s.runtime||game.s.placeVisit)return;const rv=game.raidView();if(rv.level<rv.minLevel||!rv.sortiesLeft)return;
  const c=el('section','card raid-card');c.setAttribute('aria-label','공동 토벌전');const st=R.status?.current;
  const head=el('div','re-head');head.append(SHELL.icon('RAID','shell-icon re-icon'));const words=el('div','re-words');words.append(el('small','re-eyebrow','공동 토벌전 · 이번 주'),el('h2','',rv.name));head.append(words);c.append(head);
  c.append(el('p','muted',(st?'모두 함께 '+Math.round(Math.min(1,st.total/st.target)*100)+'% · ':'')+'오늘 출격 '+rv.sortiesLeft+'번 남음 · 맞힐 때마다 1'));
  c.append(button('공동 토벌전 열기',()=>R.open(),false,true));
  const anchor=[...p.querySelectorAll('.region-event')].pop()||p.querySelector('.main-objective,.pinned-objective,.next-chapter,.field-objective');if(anchor)anchor.after(c);else p.append(c);
 }catch{}
};}
// ---------- in battle and after ----------
if(typeof combat==='function'){const prior=combat;combat=function(p,...args){
 const out=prior(p,...args);
 try{const b=game.s.runtime,r=b?.raid;if(!r)return out;const box=el('section','raid-combat');box.setAttribute('aria-label','공동 토벌전');
  box.append(el('span','mut-badge raid','공동 토벌전'),el('strong','','라운드 '+Math.min(b.round,r.limit)+' / '+r.limit),el('span','raid-hits','맞힌 횟수 '+r.hits));
  const stage=p.querySelector('.compact-battle-stage');if(stage)stage.before(box);else p.append(box);}catch{}
 return out;
};}
if(typeof reward==='function'){const prior=reward;reward=function(p,...args){
 const out=prior(p,...args);
 try{const r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}').raid;if(!r)return out;
  const c=el('section','card raid-result');c.append(el('small','eyebrow','공동 토벌전'),el('h2','',r.name+' · '+r.hits+'번 맞힘'),el('p','',(r.finished?RAID.rounds+'라운드를 버텼습니다. ':'파티가 쓰러졌지만 맞힌 횟수는 모두 더해집니다. ')+'이번 주 나의 합계 '+fmt(r.eventHits)+'번.'));
  c.append(button('공동 토벌전 보기',()=>R.open(),false,true));p.append(c);R.status=null;}catch{}
 return out;
};}
// News from the server: someone's sortie moved the total.
window.CRPGChat?.on?.(ev=>{if(ev?.type!=='raid')return;if(R.node){clearTimeout(R.timer);R.timer=setTimeout(load,400);}});
// Find out once per login whether this server runs the raid; forget everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!O?.token){if(R.status||R.enabled!==null){R.status=null;R.enabled=null;close();}return;}
 if(R.enabled===null&&!R.loading&&Date.now()>=R.probe){R.probe=Date.now()+30000;load();}
}catch{}};}
})();
