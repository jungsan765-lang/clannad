/* 0.15.2 업적 (runtime_achievements_v0152.js; user: 「업적도 충~~~~분히 많이 만들어도 돼. 진짜 한 수백개는 만들어서 모으는 재미도
 * 붙이자.」). The handbook's 업적 tab: eighteen groups with their progress, every achievement with a bar, the 원석 it pays
 * and 받기, and 모두 받기 for everything finished. A note pops up when an achievement is finished, and Paimon's menu has
 * a tile that counts the rewards waiting. Load after app_handbook.js. */
(function(){'use strict';
const SHELL=window.CRPGShell;if(!SHELL||!window.CRPGRuntime?.achievementsV0152)return;
const A=window.CRPGAchievements={cat:null,show:'all',done:null,busy:false,msg:'',timer:0};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','ac-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.achievementView==='function';
const view=()=>{try{return game.achievementView();}catch(e){console.warn('achievements',e);return null;}};
const TIER={1:'일반',2:'희귀',3:'전설'};
async function claim(id){
 if(A.busy)return;A.busy=true;A.msg='';let r;
 try{r=await act('ACHIEVEMENT_CLAIM',{achievement:id});}catch(e){r={ok:false,error:e.message};}
 A.busy=false;
 if(!r){A.msg='다른 행동을 처리하는 중입니다. 잠시 뒤 다시 눌러 주세요.';window.CRPGHandbook?.refresh?.();return;}
 if(r.ok===false){A.msg=typeof r.error==='string'?r.error:r.error?.message||'받지 못했습니다.';SND('error');window.CRPGHandbook?.refresh?.();return;}
 const out=r.result||{};SND('chest_reward');SHELL.toast?.('업적 보상 · 원석 '+(out.primogem||0)+(out.claimed?.length>1?' ('+out.claimed.length+'개)':' · '+(out.names?.[0]||'')));
 window.CRPGHandbook?.refresh?.();
}
// ---------- the handbook page ----------
A.journal=function(box){
 if(!ready())return;const v=view();if(!v){box.append(mk('p','hb-note','업적을 불러오지 못했습니다.'));return;}
 const head=mk('section','ac-summary'),facts=mk('div','ac-facts');
 const fact=(label,value,cls='')=>{const f=mk('div','ac-fact '+cls);f.append(mk('small','',label),mk('strong','',value));return f;};
 facts.append(fact('달성',v.done+' / '+v.total),fact('받은 원석',v.primogem.gained+' / '+v.primogem.all),fact('받을 보상',v.claimable+'개',v.claimable?'ready':''));head.append(facts);
 const bar=mk('div','ac-bar');bar.style.setProperty('--p',(v.done/v.total*100).toFixed(1)+'%');head.append(bar);
 if(v.claimable){const all=btn('모두 받기 · 원석 '+v.list.filter(x=>x.done&&!x.claimed).reduce((n,x)=>n+x.reward,0),()=>claim('ALL'),'primary ac-all');if(game.s.runtime||A.busy){all.disabled=true;all.title=game.s.runtime?'전투가 끝난 뒤 받을 수 있습니다.':'';}head.append(all);}
 box.append(head);
 if(A.msg){const m=mk('p','ac-msg',A.msg);m.setAttribute('role','alert');box.append(m);}
 // groups
 if(!A.cat||!v.cats.some(c=>c.id===A.cat))A.cat=v.cats.find(c=>c.claimable)?.id||v.cats[0]?.id;
 const cats=mk('div','ac-cats');cats.setAttribute('role','tablist');
 for(const c of v.cats){const b=mk('button','ac-cat'+(c.id===A.cat?' on':'')+(c.claimable?' ready':'')+(c.done===c.total?' full':''));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(c.id===A.cat));
  b.append(mk('span','',c.name),mk('small','',c.done+'/'+c.total));if(c.claimable)b.append(mk('b','ac-dot',c.claimable));b.onclick=()=>{A.cat=c.id;SND('page');window.CRPGHandbook?.refresh?.();};cats.append(b);}
 box.append(cats);
 const filters=mk('div','ac-filters');for(const [id,label] of [['all','전체'],['open','진행 중'],['done','달성']]){const b=btn(label,()=>{A.show=id;window.CRPGHandbook?.refresh?.();},'ac-filter'+(A.show===id?' on':''));filters.append(b);}box.append(filters);
 // the achievements of the group: waiting rewards first, then the ones in progress (nearest first), then the taken ones
 const order=x=>x.done&&!x.claimed?0:!x.done?1:2;
 const items=v.list.filter(x=>x.cat===A.cat&&(A.show==='all'||(A.show==='done'?x.done:!x.done))).sort((a,b)=>order(a)-order(b)||(b.progress/b.target)-(a.progress/a.target));
 const list=mk('div','ac-list');
 for(const a of items){
  const row=mk('article','ac-item tier-'+a.tier+(a.done?' done':'')+(a.claimed?' claimed':'')+(a.hidden?' secret':''));
  const medal=mk('span','ac-medal');medal.append(SHELL.icon(a.hidden?'LOCK':'TROPHY','shell-icon'));row.append(medal);
  const copy=mk('div','ac-copy');copy.append(mk('strong','',a.hidden?'숨겨진 업적':a.name),mk('small','',a.hidden?'조건을 채우면 공개됩니다.':a.desc));
  if(!a.done&&!a.hidden&&a.target>1){const pb=mk('div','ac-progress');pb.style.setProperty('--p',(a.progress/a.target*100).toFixed(1)+'%');copy.append(pb,mk('small','ac-count',a.progress.toLocaleString('ko-KR')+' / '+a.target.toLocaleString('ko-KR')));}
  row.append(copy);
  const side=mk('div','ac-side');side.append(mk('span','ac-reward',TIER[a.tier]+' · 원석 '+a.reward));
  if(a.claimed)side.append(mk('em','ac-taken','받음'));
  else if(a.done){const b=btn('받기',()=>claim(a.id),'primary');if(game.s.runtime||A.busy){b.disabled=true;b.title=game.s.runtime?'전투가 끝난 뒤 받을 수 있습니다.':'';}side.append(b);}
  row.append(side);list.append(row);
 }
 if(!items.length)list.append(mk('p','hb-note',A.show==='done'?'아직 달성한 업적이 없습니다.':'이 묶음의 업적을 모두 달성했습니다.'));
 box.append(list);
};
// ---------- Paimon's menu ----------
SHELL.extraTiles.push({icon:'TROPHY',get label(){const v=ready()?view():null;return v?.claimable?'업적 ('+v.claimable+')':'업적';},show:()=>ready(),run:()=>window.CRPGHandbook?.open?.('achievements')});
// ---------- a note when something is finished ----------
function check(){
 A.timer=0;if(!ready()){A.done=null;return;}const v=view();if(!v)return;const now=new Set(v.list.filter(x=>x.done).map(x=>x.id));
 if(A.done&&game.s.global.SAVE_ID===A.save){const fresh=v.list.filter(x=>x.done&&!x.claimed&&!A.done.has(x.id));
  if(fresh.length){SND('commission_accept');SHELL.toast?.('업적 달성 · '+fresh[0].name+(fresh.length>1?' 외 '+(fresh.length-1)+'개':'')+' · 핸드북(F1)의 업적에서 원석을 받으세요');}}
 A.done=now;A.save=game.s.global.SAVE_ID;
}
if(typeof render==='function'){const prior=render;render=function(){prior();try{if(!A.timer)A.timer=setTimeout(check,600);}catch{}};}
})();
