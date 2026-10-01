/* 0.14.11 기원 화면 and its presentation (rules in runtime_wish_v01411.js).
 * - 원석 in the top bar and 기원 in the Paimon menu open the wish screen: the two banners (this week's featured
 *   companions on the original element background, the time left and next week's), the fates held, 1회 / 10회 기원,
 *   the rates and the record.
 * - A wish plays out like the original: a falling star coloured by the best result (blue 3★, purple 4★, gold 5★) with
 *   the original wish recordings, then every 4★ and 5★ shown on its own over the original reveal background, then all
 *   results side by side. 건너뛰기 skips to the results.
 * - Fates can be exchanged for 원석 right where they are needed. The operator can grant 원석 for testing.
 * Load after app_premium_v0148.js. */
(function(){
'use strict';
if(typeof render!=='function'||typeof act!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const SND=name=>window.CRPGSound?.play?.(name),STOP=name=>window.CRPGSound?.stop?.(name);
const MAN=()=>window.CRPG_MANIFEST||{};
const CUR={PRIMOGEM:['원석','CUR_PRIMOGEM'],STARGLITTER:['스타라이트','CUR_STARGLITTER'],STARDUST:['스타더스트','CUR_STARDUST'],INTERTWINED_FATE:['뒤얽힌 인연','CUR_INTERTWINED_FATE'],ACQUAINT_FATE:['만남의 인연','CUR_ACQUAINT_FATE']};
const EL={'불':'fire','물':'water','얼음':'ice','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro'};
const FATE_OFFER={INTERTWINED_FATE:'FATE_INTERTWINED',ACQUAINT_FATE:'FATE_ACQUAINT'};
const UI={root:null,banner:'EVENT',panel:null,busy:false,stage:null};
function curIcon(key,cls='wish-cur'){const p=MAN().itemIcons?.icons?.[CUR[key]?.[1]]?.path;if(!p)return mk('span',cls+' fallback','◆');const i=mk('img',cls);i.src=p;i.alt='';i.draggable=false;return i;}
function wishBg(key){return MAN().uiAssets?.wish?.[key]?.path||'';}
function profileOf(id){return game.rows('04_CHAR_DB').find(r=>r[1]===id)?.[0]||null;}
function artOf(id){try{const p=profileOf(id);return p&&typeof portraitFor==='function'?portraitFor(p):null;}catch{return null;}}
function elementOf(id){const tag=String(game.tables['07_CHAR_DB']?.get(id)?.[3]||'');return Object.keys(EL).find(k=>tag.includes('['+k+']'))||null;}
function nameOf(r){return r.kind==='char'?game.premiumCharName(r.id):(game.tables['16_EQUIP_DB']?.get(r.id)?.[1]||r.id);}
function weaponIcon(id){return MAN().itemIcons?.icons?.[id]?.path||'';}
function stars(n){return '★'.repeat(n);}
function admin(){return window.CRPGOnline?.account?.admin===true||game?.serverAdmin===true;}
// Wishes and fate exchanges happen in free play only (not during a dialogue or a battle). The game's own notice line
// sits behind this screen, so the reason, and any refusal, is shown here instead.
function lockReason(){try{const a={banner:UI.banner,count:1},all=game.actionReason('WISH',a)||'',own=game.wishReason?.(a)||'';return all&&all!==own?all:(game.s.runtime?own:'');}catch{return '';}}
async function attempt(type,params){const out=await act(type,params);if(out?.ok===false){UI.note=out.error||'지금은 할 수 없습니다.';SND('error');}else UI.note='';return out;}
function balance(){return game.premiumBalance?.()||{};}
function fateOf(banner){return game.wishView().banners[banner].fate;}
// ---- the screen ----
function open(banner){
 if(!game?.wishView)return;if(banner)UI.banner=banner;
 if(!UI.root){UI.root=mk('div','wish-screen');UI.root.setAttribute('role','dialog');UI.root.setAttribute('aria-label','기원');document.body.append(UI.root);document.addEventListener('keydown',onKey);SND('wish_open');warmVideos();}
 draw();
}
function close(){if(!UI.root||UI.stage)return;SND('wish_close');document.removeEventListener('keydown',onKey);UI.root.remove();UI.root=null;UI.panel=null;try{render();}catch{}}
function onKey(e){
 if(UI.stage&&(e.key===' '||e.key==='Enter')){e.preventDefault();UI.stage.advance?.();return;}
 if(e.key!=='Escape')return;if(UI.stage){UI.stage.skip?.();return;}if(UI.panel){UI.panel=null;draw();return;}close();
}
function wallet(){
 const w=mk('div','wish-wallet'),b=balance();
 for(const key of ['PRIMOGEM','INTERTWINED_FATE','ACQUAINT_FATE']){
  const chip=mk('span','wish-chip '+key.toLowerCase());chip.title=CUR[key][0];chip.append(curIcon(key),mk('b','',fmt(b[key])));
  if(key!=='PRIMOGEM'){const plus=mk('button','wish-plus','+');plus.type='button';plus.title=CUR[key][0]+' 교환';plus.setAttribute('aria-label',CUR[key][0]+' 교환');plus.onclick=()=>{UI.panel={kind:'buy',fate:key,count:1};draw();};chip.append(plus);}
  w.append(chip);
 }
 return w;
}
function draw(){
 const root=UI.root;if(!root)return;const v=game.wishView(),bal=balance();
 root.replaceChildren();root.dataset.banner=UI.banner;
 const sky=mk('div','wish-sky');root.append(sky);
 // top
 const top=mk('header','wish-top'),title=mk('h1','wish-title');title.append(mk('span','wish-title-star','✦'),mk('span','','기원'));
 const tabs=mk('nav','wish-tabs');
 for(const id of ['EVENT','STANDARD']){
  const t=mk('button','wish-tab'+(UI.banner===id?' active':''));t.type='button';t.setAttribute('aria-pressed',String(UI.banner===id));
  const face=id==='EVENT'?v.featured.five:v.standard5[0],img=artOf(face);if(img){const i=mk('img','wish-tab-face');i.src=img;i.alt='';t.append(i);}
  t.append(mk('span','wish-tab-name',v.banners[id].name));t.onclick=()=>{if(UI.banner===id)return;UI.banner=id;UI.panel=null;SND('tab');draw();};tabs.append(t);
 }
 const shut=mk('button','wish-close','×');shut.type='button';shut.title='닫기';shut.setAttribute('aria-label','기원 닫기');shut.onclick=close;
 top.append(title,tabs,wallet(),shut);root.append(top);
 // banner
 root.append(UI.banner==='EVENT'?eventBanner(v):standardBanner(v));
 // bottom
 const foot=mk('footer','wish-foot'),left=mk('div','wish-foot-left');
 const btn=(label,fn)=>{const b=mk('button','wish-ghost',label);b.type='button';b.onclick=fn;return b;};
 left.append(btn('교환',()=>window.CRPGPremium?.openShop?.()),btn('상세 정보',()=>{UI.panel={kind:'details'};draw();}),btn('기록',()=>{UI.panel={kind:'history'};draw();}));
 if(admin())left.append(btn('운영자 · 원석 지급',()=>{UI.panel={kind:'grant'};draw();}));
 const s=v.state[UI.banner],pity=mk('p','wish-pity');
 pity.append(mk('span','','5★까지 최대 '+(90-s.pity5)+'회'),mk('span','','4★ 이상까지 최대 '+(10-s.pity4)+'회'));
 if(UI.banner==='EVENT'&&s.guarantee5)pity.append(mk('span','wish-guarantee','다음 5★는 확률 UP 동료 확정'));
 const pulls=mk('div','wish-pulls'),fate=v.banners[UI.banner].fate,lock=lockReason();
 for(const n of [1,10]){const b=mk('button','wish-pull'+(n===10?' ten':''));b.type='button';const cost=mk('span','wish-cost');cost.append(curIcon(fate,'wish-cur small'),mk('span','','× '+n));b.append(mk('strong','',n===1?'기원 1회':'기원 10회'),cost);b.disabled=UI.busy||!!lock;if(lock)b.title=lock;b.onclick=()=>pull(n);pulls.append(b);}
 foot.append(left,pity,pulls);
 const note=lock||UI.note;if(note){const p=mk('p','wish-lock',note);p.setAttribute('role','status');foot.append(p);}
 root.append(foot);
 if(UI.panel)root.append(panel(UI.panel,v,bal));
}
function eventBanner(v){
 const f=v.featured,el=elementOf(f.five),box=mk('section','wish-banner event el-'+(EL[el]||'default'));
 const bg=wishBg(EL[el]||'default');if(bg)box.style.setProperty('--wish-bg','url("'+bg+'")');
 const art=artOf(f.five);if(art){const frame=mk('div','wish-banner-art'),i=mk('img','');i.src=art;i.alt=game.premiumCharName(f.five);frame.append(i);box.append(frame);}
 const info=mk('div','wish-banner-info');
 info.append(mk('span','wish-kind','캐릭터 이벤트 기원'),mk('span','wish-up','확률 UP!'),mk('h2','wish-banner-name',game.premiumCharName(f.five)));
 const meta=mk('p','wish-banner-meta');meta.append(mk('span','wish-stars','★★★★★'),mk('span','wish-el',(el||'')+(el?' 원소':'')));info.append(meta);
 const fours=mk('div','wish-fours');for(const id of f.four){const c=mk('div','wish-four');const a=artOf(id);if(a){const i=mk('img','');i.src=a;i.alt='';c.append(i);}c.append(mk('span','',game.premiumCharName(id)),mk('small','wish-stars','★★★★'));fours.append(c);}
 info.append(mk('small','wish-sub','4★ 확률 UP'),fours);
 const days=Math.floor(v.hoursLeft/24),hours=v.hoursLeft%24;
 info.append(mk('p','wish-time','남은 기간 · '+(days?days+'일 ':'')+hours+'시간 (매주 월요일 0시 교대)'),mk('p','wish-next','다음 주 확률 UP · '+game.premiumCharName(v.nextFeatured.five)));
 info.append(mk('p','wish-note','동료는 운명의 별로 나옵니다. 동료는 각자의 이야기로 합류하고, 운명의 별은 그때까지 가방에서 기다립니다.'));
 box.append(info);return box;
}
function standardBanner(v){
 const box=mk('section','wish-banner standard el-default'),bg=wishBg('default');if(bg)box.style.setProperty('--wish-bg','url("'+bg+'")');
 const row=mk('div','wish-standard-faces');for(const id of v.standard5){const a=artOf(id);if(!a)continue;const strip=mk('div','wish-strip'),i=mk('img','');i.src=a;i.alt=game.premiumCharName(id);strip.append(i,mk('span','',game.premiumCharName(id)));row.append(strip);}box.append(row);
 const info=mk('div','wish-banner-info');info.append(mk('span','wish-kind','상시 기원'),mk('h2','wish-banner-name','세상 유람'));
 info.append(mk('p','wish-banner-meta','5★ · '+v.standard5.map(id=>game.premiumCharName(id)).join(' · ')),mk('p','wish-banner-meta','4★ 동료 전원과 4★ 무기, 3★ 무기'),mk('p','wish-note','만남의 인연을 씁니다. 10회 기원에는 동료가 반드시 한 명 이상 있습니다.'));
 box.append(info);return box;
}
// ---- side panels: exchange, details, record, operator ----
function panel(p,v,bal){
 const wrap=mk('div','wish-panel-wrap'),box=mk('section','wish-panel');wrap.onclick=e=>{if(e.target===wrap){UI.panel=null;draw();}};
 const head=mk('div','wish-panel-head');const x=mk('button','wish-close small','×');x.type='button';x.setAttribute('aria-label','닫기');x.onclick=()=>{UI.panel=null;draw();};
 if(p.kind==='buy'){
  const fate=p.fate,name=CUR[fate][0],need=p.need||0,count=Math.max(1,Math.min(10,p.count||need||1)),cost=count*160;head.append(mk('h3','',name+' 교환'),x);box.append(head);
  if(need)box.append(mk('p','wish-warn',name+'이(가) '+need+'개 부족합니다.'));
  const row=mk('div','wish-buy');row.append(curIcon('PRIMOGEM'),mk('b','',fmt(cost)),mk('span','','→'),curIcon(fate),mk('b','','× '+count));box.append(row);
  const step=mk('div','wish-steps');for(const n of [1,5,10]){const b=mk('button','wish-ghost'+(count===n?' active':''),n+'개');b.type='button';b.onclick=()=>{UI.panel={...p,count:n};draw();};step.append(b);}box.append(step);
  const why=lockReason()||game.premiumOfferReason({offer:FATE_OFFER[fate],count});
  const go=mk('button','wish-primary',p.then?'교환하고 기원':'교환');go.type='button';go.disabled=!!why||UI.busy;if(why)box.append(mk('p','wish-warn',why));
  go.onclick=async()=>{UI.busy=true;let out;try{out=await attempt('PREMIUM_BUY',{offer:FATE_OFFER[fate],count});}finally{UI.busy=false;}if(out?.ok===false){draw();return;}const then=p.then;UI.panel=null;draw();if(then)pull(then);};box.append(go);
  box.append(mk('small','muted','원석 160개로 인연 1개를 교환합니다. 지금은 원석을 얻을 방법이 없습니다.'));
 }else if(p.kind==='details'){
  head.append(mk('h3','','기원 상세 정보'),x);box.append(head);
  const list=[['5★','기본 0.6% · 74회부터 크게 오르고 90회에 확정 (5★가 나오면 다시 셉니다)'],['4★ 이상','기본 5.1% · 9회째 56.1% · 10회 안에 반드시 1번'],['10회 기원','동료가 반드시 한 명 이상'],['캐릭터 이벤트 기원','5★는 절반 확률로 확률 UP 동료, 놓치면 다음 5★는 확정. 4★도 절반 확률로 확률 UP 동료 3명 중 1명, 놓치면 다음 4★는 확정'],['동료','운명의 별 + 스타라이트 (4★ 2, 5★ 10 · 운명의 자리를 모두 채운 동료는 4★ 5, 5★ 25)'],['4★ 무기','무기 + 스타라이트 2'],['3★ 무기','무기 + 스타더스트 15 (같은 무기를 3개 갖고 있으면 무기 대신 스타더스트 30)'],['횟수 기록','두 기원은 따로 셉니다. 횟수는 주가 바뀌어도 이어집니다']];
  const dl=mk('dl','wish-rates');for(const [k,t]of list)dl.append(mk('dt','',k),mk('dd','',t));box.append(dl);
  const pools=mk('div','wish-pools');const P=window.CRPGRuntime?.wishV01411?.pools||{};
  const line=(label,ids,f)=>{const d=mk('p','');d.append(mk('b','',label+' · '),mk('span','',ids.map(f).join(', ')));pools.append(d);};
  line('상시 5★',P.STANDARD5||[],id=>game.premiumCharName(id));line('주간 교대 5★',P.LIMITED5||[],id=>game.premiumCharName(id));line('4★ 동료',P.FOUR||[],id=>game.premiumCharName(id));line('4★ 무기',P.WEAPON4||[],id=>game.tables['16_EQUIP_DB']?.get(id)?.[1]||id);line('3★ 무기',P.WEAPON3||[],id=>game.tables['16_EQUIP_DB']?.get(id)?.[1]||id);
  box.append(pools,mk('small','muted','확률과 규칙은 원작을 따른 이 게임의 규칙입니다. 비영리 팬 게임이므로 현금으로 사는 일은 없습니다.'));
 }else if(p.kind==='history'){
  head.append(mk('h3','','기원 기록'),x);box.append(head);
  const rows=(v.state.history||[]).slice().reverse();if(!rows.length)box.append(mk('p','muted','아직 기원하지 않았습니다.'));
  const table=mk('ol','wish-history');for(const h of rows){const li=mk('li','rarity-'+h.rarity);const d=new Date(h.at);li.append(mk('time','',(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')),mk('span','wish-history-banner',v.banners[h.banner]?.name||h.banner),mk('span','wish-stars',stars(h.rarity)),mk('strong','',nameOf(h)+(h.featured?' · UP':'')));table.append(li);}box.append(table);
 }else if(p.kind==='grant'){
  head.append(mk('h3','','운영자 · 재화 지급'),x);box.append(head);box.append(mk('p','muted','시험 기원용입니다. 도구를 쓴 여정은 랭킹에서 제외됩니다.'));
  const sel=mk('select','');for(const key of ['PRIMOGEM','INTERTWINED_FATE','ACQUAINT_FATE','STARGLITTER','STARDUST'])sel.append(new Option(CUR[key][0],key));
  const num=mk('input','');num.type='number';num.min='0';num.max='1000000';num.value='16000';
  const go=mk('button','wish-primary','지급');go.type='button';go.onclick=async()=>{const value=Math.floor(Number(num.value)||0);UI.busy=true;try{await act('OPERATOR_DEBUG',{op:'premium',currency:sel.value,value});}finally{UI.busy=false;}UI.panel=null;draw();};
  box.append(sel,num,go);
 }
 wrap.append(box);return wrap;
}
// ---- a wish ----
async function pull(count){
 if(UI.busy||UI.stage)return;const banner=UI.banner,fate=fateOf(banner),have=balance()[fate]||0;
 if(have<count){UI.panel={kind:'buy',fate,need:count-have,count:count-have,then:count};SND('error');draw();return;}
 const lock=lockReason();if(lock){UI.note=lock;SND('error');draw();return;}
 const before=game.wishState().seq;UI.busy=true;SND('wish_click');
 let out;try{out=await attempt('WISH',{banner,count});}finally{UI.busy=false;}
 if(out?.ok===false||!game.s.wish){draw();return;}
 const results=(game.s.wish.history||[]).filter(h=>h.seq>before).sort((a,b)=>a.seq-b.seq);
 if(!results.length){draw();return;}
 play(results);
}
// 0.14.12: the falling star is the original wish video (assets/video/wish, with its own sound). Like the original, a
// 10-wish always plays the purple or gold version and a single wish the blue, purple or gold one. After it, every result
// appears on its own in the order it was drawn (3★ weapons too) and moves on with a click, Space or Enter;
// 건너뛰기 or Esc jumps to the list. The video's sound follows the effect volume and the music dips under it.
const VIDEOS={'3star-single':1,'4star-single':1,'5star-single':1,'4star-multi':1,'5star-multi':1};
const videoUrl=name=>'assets/video/wish/'+name+'.mp4';
function videoFor(results){const best=Math.max(...results.map(r=>r.rarity));return results.length>1?(best>=5?'5star-multi':'4star-multi'):(best>=5?'5star-single':best===4?'4star-single':'3star-single');}
// The two most common videos start loading when the wish screen opens; the gold ones load when they are drawn.
function warmVideos(){if(UI.warm)return;UI.warm=['3star-single','4star-multi'].map(n=>{const v=document.createElement('video');v.preload='auto';v.muted=true;v.src=videoUrl(n);return v;});}
function play(results){
 const order=results.slice().sort((a,b)=>a.seq-b.seq),best=Math.max(...order.map(r=>r.rarity));
 const stage=mk('div','wish-stage best-'+best),video=mk('video','wish-video'),skip=mk('button','wish-skip','건너뛰기 ›');skip.type='button';
 const name=videoFor(order);video.src=videoUrl(VIDEOS[name]?name:'4star-multi');video.preload='auto';video.playsInline=true;video.setAttribute('playsinline','');video.disablePictureInPicture=true;
 const volume=window.CRPGSound?.effectVolume?.()??.6;video.volume=Math.min(1,volume);video.muted=volume<=0;
 stage.append(video,skip);UI.root.append(stage);
 let phase='video',index=-1,current=null;
 const dropVideo=()=>{clearTimeout(guard);try{video.pause();}catch{}video.removeAttribute('src');try{video.load();}catch{}video.remove();window.CRPGSound?.unduck?.();};
 const toList=()=>{if(phase==='list')return;phase='list';dropVideo();current?.stopSound();summary(stage,results);};
 const next=()=>{if(phase!=='reveal')return;current?.stopSound();index++;if(index>=order.length){toList();return;}current=reveal(stage,order[index],next);};
 const afterVideo=()=>{if(phase!=='video')return;phase='reveal';dropVideo();stage.classList.add('whiteout');next();};
 // A download that stalls must not hold the wish: the results come after 14 s at the latest.
 const guard=setTimeout(afterVideo,14000);
 video.addEventListener('ended',afterVideo);video.addEventListener('error',afterVideo);
 UI.stage={skip:toList,advance:()=>{if(phase==='video')return;current?.advance();}};
 skip.onclick=e=>{e.stopPropagation();toList();};
 window.CRPGSound?.duck?.(7);
 const started=video.play();
 // Some browsers refuse a video with sound after the server's reply; play it silently then, or skip to the results.
 if(started?.catch)started.catch(()=>{video.muted=true;video.play().catch(afterVideo);});
}
// One result on the original reveal background. The first click finishes its entrance; the next one moves on.
function reveal(stage,r,next){
 const card=mk('div','wish-reveal rarity-'+r.rarity+' kind-'+r.kind),el=r.kind==='char'?elementOf(r.id):null;
 const bg=wishBg(r.kind==='char'?(EL[el]||'default'):'weapon');if(bg)card.style.setProperty('--wish-bg','url("'+bg+'")');
 card.append(mk('div','wish-reveal-burst'),mk('div','wish-reveal-rays'));
 if(r.kind==='char'){const a=artOf(r.id);if(a){const frame=mk('div','wish-reveal-art'),i=mk('img','');i.src=a;i.alt='';frame.append(i,mk('span','wish-reveal-sheen'));card.append(frame);}}
 else{const p=weaponIcon(r.id);if(p){const frame=mk('div','wish-reveal-weapon'),i=mk('img','');i.src=p;i.alt='';frame.append(i);card.append(frame);}}
 const info=mk('div','wish-reveal-info');
 const name=mk('h2','wish-reveal-name',nameOf(r)),starRow=mk('div','wish-reveal-stars');
 for(let s=0;s<r.rarity;s++){const star=mk('span','','★');star.style.setProperty('--s',String(s));starRow.append(star);}
 info.append(name,starRow);
 const sub=r.kind==='char'?((el?el+' 원소 · ':'')+(r.stella?'운명의 별 · '+game.premiumCharName(r.id):'운명의 자리를 모두 채웠습니다')):(game.tables['16_EQUIP_DB']?.get(r.id)?.[2]||'무기');
 info.append(mk('p','wish-reveal-sub',sub));
 const gain=rewardLine(r);if(gain)info.append(mk('p','wish-reveal-gain',gain));
 if(r.featured)info.append(mk('span','wish-reveal-up','확률 UP'));
 card.append(info,mk('p','wish-reveal-hint','눌러서 계속'));
 stage.querySelector('.wish-reveal')?.remove();stage.append(card);
 const sound='wish_reveal'+r.rarity;SND(sound);
 let settled=false,left=false;const settle=()=>{settled=true;card.classList.add('settled');};
 const timer=setTimeout(settle,r.rarity>=5?1700:r.rarity===4?1200:800);
 const advance=()=>{if(left)return;if(!settled){clearTimeout(timer);settle();return;}left=true;card.classList.add('leaving');setTimeout(()=>{card.remove();next();},160);};
 card.onclick=advance;
 return {advance,stopSound:()=>{clearTimeout(timer);STOP(sound);}};
}
function rewardLine(r){const parts=[];if(r.kind==='char'&&r.stella)parts.push('운명의 별 ×1');if(r.glitter)parts.push('스타라이트 +'+r.glitter);if(r.dust)parts.push('스타더스트 +'+r.dust+(r.converted?' (같은 무기 3개 보유)':''));return parts.join(' · ');}
function summary(stage,results){
 stage.querySelector('.wish-reveal')?.remove();stage.classList.remove('whiteout');stage.classList.add('summary');SND('wish_result');
 const bg=wishBg('summary');if(bg)stage.style.setProperty('--wish-summary','url("'+bg+'")');
 const box=mk('div','wish-summary'),cards=mk('div','wish-cards'+(results.length===1?' one':''));
 const sorted=results.slice().sort((a,b)=>b.rarity-a.rarity||(a.kind===b.kind?0:a.kind==='char'?-1:1)||a.seq-b.seq);
 sorted.forEach((r,i)=>{
  const c=mk('div','wish-card rarity-'+r.rarity+' kind-'+r.kind);c.style.setProperty('--i',String(i));
  if(r.kind==='char'){const a=artOf(r.id);if(a){const img=mk('img','wish-card-art');img.src=a;img.alt='';c.append(img);}}
  else{const p=weaponIcon(r.id);if(p){const img=mk('img','wish-card-weapon');img.src=p;img.alt='';c.append(img);}}
  const q=MAN().uiAssets?.wish?.['quality'+Math.max(4,r.rarity)]?.path;
  const foot=mk('div','wish-card-foot');foot.append(mk('span','wish-card-stars',stars(r.rarity)),mk('strong','',nameOf(r)));
  const gain=rewardLine(r);if(gain)foot.append(mk('small','',gain));c.append(foot);
  if(r.rarity>=4&&q){const b=mk('img','wish-card-badge');b.src=q;b.alt='';c.append(b);}
  if(r.featured)c.append(mk('span','wish-card-up','UP'));
  cards.append(c);
 });
 const ok=mk('button','wish-primary','확인');ok.type='button';
 const total=results.reduce((a,r)=>({glitter:a.glitter+(r.glitter||0),dust:a.dust+(r.dust||0)}),{glitter:0,dust:0});
 const sums=mk('p','wish-summary-gain');if(total.glitter){sums.append(curIcon('STARGLITTER','wish-cur small'),mk('span','','+'+total.glitter));}if(total.dust){sums.append(curIcon('STARDUST','wish-cur small'),mk('span','','+'+total.dust));}
 box.append(cards,sums,ok);stage.append(box);
 const leave=()=>{SND('wish_return');stage.remove();UI.stage=null;draw();};
 ok.onclick=leave;UI.stage={skip:leave};
 stage.querySelector('.wish-skip')?.remove();
}
window.CRPGWish={open,close};
if(window.CRPGShell?.extraTiles)window.CRPGShell.extraTiles.push({icon:'STARS',label:'기원',run:()=>open()});
})();
