/* 0.14.11 시설 화면: the places you talk in (모험가 길드, 천사의 몫, 리월의 상회·관청, 일곱 신상…).
 * The host stands on the left (portrait, or the place's picture) with a greeting and the place's buttons; what the
 * place offers sits on the right as tabs: commissions per region, the companion missions it introduces, and the rest.
 * Nothing is drawn above the page any more (the scenery banner pushed Katheryne down) and only the list scrolls.
 * Nodes are moved, never rebuilt, so every button keeps its handler. Load after app_shell.js. */
(function(){
'use strict';
const S=window.CRPGShell;if(!S||!S.tabset||!S.pageHead)return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
// What the host says first. Katheryne greets every adventurer with the guild's motto, in Mondstadt and in Liyue.
const GUILD='별과 심연을 향해! 모험가 길드에 온 걸 환영해.';
const GREETING={EVT_SCHEDULE_NPC_MOND_KATHERYNE:GUILD,EVT_CRPG_LIYUE_GUILD:GUILD};
S.placeGreeting=GREETING;
S.placeLayout=function(content,p){
 content.classList.add('shell-plain','shell-place-content');
 const scene=$(':scope > .scene img.scene-back',content)?.getAttribute('src')||null;
 for(const s of $$(':scope > .scene',content))s.classList.add('shell-offscreen');
 const place=game.s.placeVisit?.place||'',kids=[...p.children];
 const crumb=kids.find(n=>n.matches('.place-breadcrumb')),leave=crumb?.querySelector('button'),where=crumb?.querySelector('p');
 let h1=kids.find(n=>n.tagName==='H1');if(!h1){h1=mk('h1','',game.currentPlace?.()?.entry?.name||'');p.prepend(h1);}
 const label=kids.find(n=>n.matches('p.muted')&&n!==where);
 const art=kids.find(n=>n.matches('img.art'));
 const quick=kids.filter(n=>n.tagName==='BUTTON');
 const link=kids.find(n=>n.matches('.contact-entry-link'));
 const regions=kids.filter(n=>n.matches('details.guild-region'));
 const stories=kids.filter(n=>n.matches('section.contact-stories'));
 const used=new Set([crumb,h1,label,art,link,...quick,...regions,...stories]);
 const others=kids.filter(n=>!used.has(n)&&!(n.tagName==='H2'&&/의뢰 접수/.test(n.textContent)));
 const {head,tools}=S.pageHead('PLACE',p,{iconName:'PIN'});
 if(where){where.className='shell-page-intro';head.querySelector('.shell-page-words')?.append(where);}
 if(leave){leave.classList.add('shell-leave');tools.prepend(leave);}
 // The host: who (or where) you are talking to, what they say first, and the place's own buttons.
 const host=mk('aside','shell-place-host'),fig=mk('figure','shell-place-figure');
 if(art){fig.classList.add('portrait');fig.append(art);}
 else if(scene){const img=mk('img','shell-place-scene');img.src=scene;img.alt='';fig.append(img);}
 else fig.classList.add('empty');
 const plate=mk('div','shell-place-plate');plate.append(mk('strong','',h1.textContent.trim()));if(label){label.className='shell-place-kind';plate.append(label);}fig.append(plate);
 host.append(fig);
 const line=GREETING[place];let greet=null;
 if(line){greet=mk('blockquote','shell-place-greet',line);}
 else{const story=stories.map(s=>s.querySelector(':scope > p.story')).find(Boolean);if(story){greet=story;greet.className='shell-place-greet';}}
 if(greet)host.append(greet);
 if(quick.length){const acts=mk('div','shell-place-actions');acts.append(...quick);host.append(acts);}
 // What the place offers, one tab each; the shortcut that only scrolled to the list is replaced by its tab.
 const defs=[];
 for(const d of regions){const sum=d.querySelector(':scope > summary'),cards=[...d.children].filter(n=>n!==sum),grid=mk('div','shell-place-grid');grid.append(...cards);
  const [name,count]=(sum?.textContent||'의뢰').split('·').map(x=>x.trim());defs.push({id:'region:'+name,label:name,badge:count||String(cards.length),icon:'QUEST',nodes:[grid]});}
 for(const s of stories){const cards=[...s.children].filter(n=>n.matches('section.card')),notes=[...s.children].filter(n=>!cards.includes(n)),top=mk('div','shell-place-notes'),grid=mk('div','shell-place-grid');top.append(...notes);grid.append(...cards);
  defs.push({id:'stories',label:'동료 영입 임무',badge:String(cards.length),icon:'PARTY',nodes:[top,grid]});}
 if(others.length){const named=others.map(n=>n.querySelector?.(':scope > h2,:scope > h3')).find(Boolean);defs.push({id:'here',label:named?.textContent.trim()||'이곳에서',icon:'STAR',nodes:others});}
 if(link)link.remove();
 const main=mk('section','shell-place-main');const tabs=S.tabset('PLACE:'+place,defs,'shell-place-tabs');
 if(tabs)main.append(tabs);else main.append(mk('p','muted shell-place-empty','지금 이곳에서 할 수 있는 일이 없습니다.'));
 const body=mk('div','shell-place-body');body.append(host,main);
 p.replaceChildren(head,body);p.classList.add('shell-page','shell-place');
};
})();
