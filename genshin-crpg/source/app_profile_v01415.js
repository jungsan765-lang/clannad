/* 0.14.15 모험가 정보 (user: 「채팅하면 상대방의 정보를 좀 볼 수 있게. 캐릭터 보유나 운명의 자리나 장비 뭐 끼고 있나 등등」).
 * Pressing a name in the chat opens that adventurer's public card from the account server: the protagonist, every
 * companion with level and 운명의 자리, the party and the gear each member wears, this season's Spiral Abyss floor and
 * the 나선 문장 of past seasons. From the card: a live trade (when they are online), a letter, or a look at their shop.
 * Load after app_chat.js. */
(function(){
'use strict';
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
/* 나선 문장 (user picked the name; 「훈장 너무 못생겼어」): one per season whose best floor reached 10. The art is the Spiral
   Abyss crest in silver (10), violet (11) or gold (12), with the floor or a short label beside it. Defined before the
   online check so the Abyss screen can show it offline too. */
const crest=(floor,text,kind='')=>{
 const f=Math.max(10,Math.min(12,Number(floor)||10)),has=text!==''&&text!==null&&text!==undefined;
 const m=mk('span','pf-medal floor-'+f+(has?'':' bare')+(kind?' '+kind:'')),img=mk('img','pf-crest');
 img.src='assets/icons/abyss/crest_'+f+'.webp';img.alt='';img.decoding='async';img.draggable=false;m.append(img);
 if(has)m.append(mk('b','',text));m.setAttribute('aria-hidden','true');return m;
};
window.CRPGProfile={medal:crest};
const O=window.CRPGOnline,SHELL=window.CRPGShell;if(!O||!SHELL)return;
const btn=(label,fn,cls='')=>{const b=mk('button','pf-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const P=Object.assign(window.CRPGProfile,{node:null,pid:null,data:null,busy:false});
const ELEMENT={불:'pyro',물:'hydro',얼음:'cryo',번개:'electro',바람:'anemo',바위:'geo',풀:'dendro'};
// The element is the last bracket of the base tags, e.g. 엠버 「[광계][불]」.
const elementOf=id=>{try{const tags=String(game.tables['07_CHAR_DB'].get(id)?.[3]||'');for(const [ko,en]of Object.entries(ELEMENT))if(tags.includes('['+ko+']'))return en;}catch{}return '';};
const glyph=d=>{try{if(typeof itemGlyph==='function')return itemGlyph(d);}catch{}return mk('span','item-glyph','◆');};
const gearDetail=g=>{try{return itemPresenter.itemDetail({equip:g.equip,quantity:1,enhance:g.enhance});}catch{return {name:g.name,tier:{rank:3}};}};
function portrait(id,cls){try{if(typeof actorPortrait==='function'){const p=actorPortrait(id,cls);if(p)return p;}}catch{}return mk('span',cls+' pf-noart','✦');}
function close(){if(!P.node)return;const n=P.node;P.node=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}
P.close=close;
P.open=async function(pid,name=''){
 if(!pid)return;P.pid=pid;close();
 const wrap=mk('div','pf-overlay');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','모험가 정보');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const card=mk('div','pf-card');card.append(mk('p','pf-loading',(name?name+' · ':'')+'모험가 정보를 불러오는 중…'));wrap.append(card);document.body.append(wrap);P.node=wrap;
 requestAnimationFrame(()=>wrap.classList.add('open'));window.CRPGSound?.play('menu_open');
 try{const out=await O.request('/profile?pid='+encodeURIComponent(pid));if(P.node!==wrap)return;P.data=out;draw(card,out);}
 catch(e){if(P.node!==wrap||e.code==='SESSION_CHANGED')return;card.replaceChildren(mk('p','pf-error',e.status===404&&!e.message?'모험가 정보를 볼 수 없는 서버입니다.':e.message),btn('닫기',close));}
};
function head(v){
 const h=mk('header','pf-head'),title=mk('div','pf-title');
 title.append(mk('strong','pf-name',v.name));if(v.staff)title.append(mk('span','pf-staff','운영'));
 title.append(mk('span','pf-online '+(v.online?'on':'off'),v.online?'접속 중':'접속 안 함'));
 const x=mk('button','pf-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=close;
 h.append(title,x);
 const hon=v.honours||{};
 if(hon.count){const row=mk('div','pf-medals');for(const m of hon.medals){const b=P.medal(m.floor,m.floor);b.removeAttribute('aria-hidden');b.title='나선 문장 · '+m.label+' '+m.floor+'층 정복';row.append(b);}row.append(mk('small','','나선 문장 '+hon.count+'개'));h.append(row);}
 return h;
}
function section(title,extra){const s=mk('section','pf-section');const h=mk('h3','',title);if(extra)h.append(mk('small','',extra));s.append(h);return s;}
function draw(card,v){
 card.replaceChildren(head(v));
 if(!v.journey){card.append(mk('p','pf-empty','아직 여정을 시작하지 않은 모험가입니다.'));actions(card,v);return;}
 const me=mk('section','pf-section pf-me');
 me.append(portrait('PLAYER_CUSTOM','pf-face'));const info=mk('div','pf-me-copy');
 info.append(mk('strong','',v.player.name||'주인공'),mk('span','','Lv. '+v.player.level+' · '+v.player.route+(v.player.constellation?' · 운명의 자리 '+v.player.constellation:'')));
 const ab=v.abyss,hon=v.honours||{};info.append(mk('span','pf-abyss','나선비경 · '+(ab?.label||'이번 시즌')+' '+(ab?.best?ab.best+'층':'기록 없음')+(hon.last?' · 지난 시즌 '+hon.last+'층':'')));
 me.append(info);card.append(me);
 const party=section('지금 파티');const grid=mk('div','pf-party');
 for(const m of v.party){
  const c=mk('article','pf-member rarity-'+m.rarity+(elementOf(m.id)?' el-'+elementOf(m.id):''));c.append(portrait(m.id,'pf-face'));
  const t=mk('div','pf-member-copy');t.append(mk('strong','',m.name),mk('span','','Lv. '+m.level+(m.constellation?' · 운명의 자리 '+m.constellation:'')));c.append(t);
  const gear=mk('div','pf-gear');if(!m.gear.length)gear.append(mk('small','pf-empty','장비 없음'));
  for(const g of m.gear){const d=gearDetail(g),row=mk('div','pf-gear-item tier-'+(d.tier?.rank||1));row.append(glyph(d),mk('span','',(d.name||g.name)+(g.enhance?' +'+g.enhance:'')));row.title=(d.name||g.name)+(g.enhance?' +'+g.enhance:'');gear.append(row);}
  c.append(gear);grid.append(c);
 }
 party.append(grid);card.append(party);
 const comp=section('동료',v.companions.length+' / '+v.companionTotal);const list=mk('div','pf-companions');
 if(!v.companions.length)list.append(mk('p','pf-empty','아직 동료가 없습니다.'));
 for(const m of v.companions){const c=mk('div','pf-mate rarity-'+m.rarity);c.title=m.name+' · '+m.rarity+'★ · Lv. '+m.level+(m.constellation?' · 운명의 자리 '+m.constellation:'');c.append(portrait(m.id,'pf-mate-face'));if(m.constellation)c.append(mk('span','pf-cons','C'+m.constellation));c.append(mk('span','pf-mate-name',m.name),mk('span','pf-mate-lv','Lv. '+m.level));list.append(c);}
 comp.append(list);card.append(comp);
 actions(card,v);
}
function actions(card,v){
 const row=mk('div','pf-actions');
 if(!v.you){
  const trade=btn('직접 거래 신청',async()=>{if(P.busy)return;const node=P.node;P.busy=true;try{await window.CRPGTrade?.invite?.(v.pid,v.name);if(P.node===node)close();}finally{P.busy=false;}},'primary');
  if(!v.online){trade.disabled=true;trade.title=v.name+' 님은 지금 접속해 있지 않습니다.';}else{const lv=game?.tradeLevelReason?.();if(lv){trade.disabled=true;trade.title=lv;}}row.append(trade);
  // 0.15.1: a letter reaches them online or not (app_mail_v0151.js).
  if(v.journey&&window.CRPGMail?.canWrite?.())row.append(btn('편지 보내기',()=>{close();window.CRPGMail.compose({to:{pid:v.pid,name:v.name}});}));
  // 0.15.3: 「같이 하기」 — join their 다인 모드 room, or invite them into mine (app_coop_v0153.js).
  if(v.journey){const coop=window.CRPGCoop?.profileButton?.(v,close);if(coop)row.append(coop);}
 }
 if(v.listings){row.append(btn('상점 보기 · '+v.listings+'개',()=>{close();window.CRPGTrade?.open?.('market',{seller:v.pid,sellerName:v.name});}));}
 if(!v.you&&window.CRPGChat?.muted){const muted=window.CRPGChat.muted.has(v.pid);row.append(btn(muted?'메시지 다시 보기':'메시지 숨기기',()=>{if(muted)window.CRPGChat.muted.delete(v.pid);else window.CRPGChat.muted.add(v.pid);try{localStorage.setItem('crpg-chat-muted',JSON.stringify([...window.CRPGChat.muted]));}catch{}window.CRPGChat.redraw?.();close();}));}
 card.append(row);
}
/* The ranking window (app_online.js) lists the running season without naming it. Name the season and when it ends, and
   add last season's top 20, where the 나선 문장 come from. */
const SEASON=()=>window.CRPGRuntime?.abyssSeason;
const until=at=>{const ms=at-Date.now();if(!(ms>0))return '곧 끝남';const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000);return d?d+'일 '+h+'시간 남음':h?h+'시간 남음':'1시간 안에 끝남';};
async function seasonRanking(body,table){
 table.dataset.season='1';
 let out;try{out=await O.request('/ranking');}catch{return;}
 if(!table.isConnected||!out?.season)return;
 const S=SEASON(),head=mk('div','rk-season');
 head.append(mk('strong','',out.label||S?.label?.(out.season)||out.season));
 if(out.endsAt)head.append(mk('span','rk-left',until(out.endsAt)));
 head.append(mk('small','','매달 1일 0시(한국 시간)에 새 시즌이 열립니다. 한 시즌에 10층 이상을 정복하면 나선 문장(10층 은빛 · 11층 보랏빛 · 12층 금빛)을 받고, 지난 시즌 10층 이상이면 채팅에 테두리가 붙습니다.'));
 table.parentElement.prepend(head);
 const prev=out.previous;if(!prev)return;
 const box=mk('section','rk-previous');box.append(mk('h2','','지난 시즌 · '+(prev.label||prev.season)));
 if(!prev.entries?.length){box.append(mk('p','muted','지난 시즌 정복 기록이 없습니다.'));body.append(box);return;}
 const t=mk('table','ranking-table rk-previous-table'),tr=mk('tr');for(const x of ['순위','모험가','층','라운드','입장'])tr.append(mk('th','',x));t.append(tr);
 for(const x of prev.entries.slice(0,20)){const r=mk('tr'),who=mk('td');who.append(mk('span','',x.name));if(x.floor>=10){const m=P.medal(x.floor,'');m.removeAttribute('aria-hidden');m.title='나선 문장 · '+x.floor+'층 정복';who.append(m);}r.append(mk('td','',x.rank),who);for(const v of [x.floor,x.rounds,x.attempts])r.append(mk('td','',v));t.append(r);}
 box.append(t);body.append(box);
}
const modalBody=document.getElementById('modal-body');
if(modalBody)new MutationObserver(()=>{const table=modalBody.querySelector(':scope>div>.ranking-table:not([data-season])');if(table)seasonRanking(modalBody,table);}).observe(modalBody,{childList:true,subtree:true});
})();
