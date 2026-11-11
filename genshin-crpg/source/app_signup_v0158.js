/* 0.15.8 회원가입 안내. A tester could not sign up: their ID had 「!」 「@」 「♡」, and the rule only showed (mixed with the
 * password rule) after the server refused it. The sign-up window (app_online.js, not edited here) now shows the ID rule under
 * its ID box, and names the characters that cannot be used while they are typed; the server (fixed-region-live.mjs
 * signupReason) says the same when it refuses. The login window is left as it is. */
(function(){'use strict';
const OK=/^[a-z0-9가-힣_]$/u;
const RULE='아이디는 한글 · 영문 · 숫자 · 밑줄(_) 3~24자입니다. 띄어쓰기와 특수문자(! @ ♡ 등)는 쓸 수 없고, 비밀번호에는 써도 됩니다.';
function badChars(value){return [...new Set([...String(value||'').normalize('NFKC').trim().toLowerCase()].filter(ch=>!OK.test(ch)))];}
function hint(){
 const modal=document.getElementById('modal');if(!modal)return;
 const form=modal.querySelector('form.account-form');if(!form||form.querySelector('.account-id-hint'))return;
 const submit=[...form.querySelectorAll('button')].find(b=>b.type==='submit');if(!submit||!/계정 만들기/.test(submit.textContent||''))return;
 const id=form.querySelector('input[autocomplete="username"]');if(!id)return;
 const note=document.createElement('small');note.className='account-id-hint';note.textContent=RULE;
 const anchor=id.closest?.('label')||id;anchor.after(note);
 const update=()=>{const bad=badChars(id.value);note.classList.toggle('bad',bad.length>0);note.textContent=bad.length?'쓸 수 없는 글자: '+bad.slice(0,6).map(c=>/\s/u.test(c)?'띄어쓰기':c).join(' ')+' · '+RULE:RULE;};
 id.addEventListener('input',update);update();
}
window.CRPGSignupHint={hint,badChars,RULE};
try{hint();}catch{}
try{new MutationObserver(()=>{try{hint();}catch{}}).observe(document.body,{childList:true,subtree:true});}catch{}
})();
