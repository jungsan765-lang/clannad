'use strict';
// 0.16.47 고유명사 사전 (user: 「앞으로 고유명사 나오면 그 명사를 쓸 수 있게 어디 저장을 해두던가 해서 단어들은 그걸 이용하게 하는게
// 좋아보이는데」). The names live in tools/editorial/glossary_ko.json (official Korean from the game's own text). Old code and
// rules still carry a few spellings that are not the official ones — 「나선비경」 is also a rule tag there — so the screen
// corrects them as text is drawn: every text node, title and label under <body> and the window title. New text is written
// with the official name from the start (tests/test_glossary_v01647.cjs). The map below is written by
// tools/editorial/build_glossary.cjs; do not edit it by hand.
(function(){
const FIX=/*GLOSSARY_DISPLAY*/{"나선비경":"나선 비경","대리 단장":"단장 대행","대리단장":"단장 대행","도금여단":"도금 여단","보물사냥단":"보물 사냥단","사풍 수호":"바람 사신수","사풍수호":"바람 사신수","사풍의 수호신":"바람 사신수","정찰기사":"정찰 기사"}/*END*/;
const keys=Object.keys(FIX);if(!keys.length||typeof MutationObserver!=='function')return;
const re=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'),has=new RegExp(re.source);
const fix=s=>s.replace(re,m=>FIX[m]);
const ATTRS=['title','aria-label','placeholder','alt','data-reason'];
function text(n){if(n.nodeValue&&has.test(n.nodeValue))n.nodeValue=fix(n.nodeValue);}
function attrs(e){for(const a of ATTRS){const v=e.getAttribute?.(a);if(v&&has.test(v))e.setAttribute(a,fix(v));}}
function walk(root){
 if(root.nodeType===3){text(root);return;}if(root.nodeType!==1)return;if(root.tagName==='SCRIPT'||root.tagName==='STYLE')return;
 attrs(root);const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);for(let n=w.nextNode();n;n=w.nextNode()){if(n.nodeType===3)text(n);else attrs(n);}
}
function start(){
 walk(document.body);if(has.test(document.title))document.title=fix(document.title);
 new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')text(m.target);else if(m.type==='attributes')attrs(m.target);else for(const n of m.addedNodes)walk(n);}if(has.test(document.title))document.title=fix(document.title);})
  .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
window.CRPGGlossary={display:FIX,fix};
})();
