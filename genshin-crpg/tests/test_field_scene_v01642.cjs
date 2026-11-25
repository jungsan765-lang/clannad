'use strict';
// 0.16.42 (user: 「이 현장의뢰 이거 ㅅㅂ 이어져있지도 않고 글도 밀리고 전체적으로 다 찾아보라고 했는데」): a field commission's scene
// opens in a window from its short card, the choices' 💬 sits beside the words, a split card carries its title, and the
// screen check finds marks drawn over words and card parts without their title anywhere.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const css=src('screen_v01629.css'),fit=src('tests/test_screen_fit_v01629.mjs');

check('the scene opens in a window from one 「현장 살피기」 button; the record too',()=>{
 const f=src('app_field_scenes.js');
 for(const x of ["function stepBox(q,s){","b.classList.add('scene-open');b.append(el('span','','현장 살피기'),el('small','',s.step.title))","showModal(title,stepBox(q,s))","showModal(q.row[1]+' · 현장 기록',logBox(s))","if(e.target.closest?.('button.scene-option'))document.getElementById('modal')?.close?.();"])assert(f.includes(x),x);
 assert(!f.includes("el('details','scene-log')"),'the record no longer unfolds in the column');
});

check('the choices\' mark is a part of the button beside the words, never drawn over them',()=>{
 assert(src('app_field_scenes.js').includes("b.prepend(el('span','scene-option-mark',o.battle?'⚔':'💬'));"));
 assert(css.includes("body.teyvat :where(#modal,#root) .scene-options .scene-option::before{content:none!important;display:none!important}"));
});

check('a card split across pages carries its title; the check finds marks over words and parts without a title',()=>{
 assert(src('app_mainscreen_v0167.js').includes("k.matches(CARD)?kids3.find(c=>/^H[2-4]$/.test(c.tagName))||null:null"));
 for(const x of ["out.push('mark over words '","out.push('card part without its title '","view('field-scene'","view('field-scene-window'","view('field-scene-log'"])assert(fit.includes(x),x);
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
