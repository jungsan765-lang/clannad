/* 0.14.13 왜 안 되는지 보이기 (user: 「레벨 모자라서 못 들어간다는 경고 표시가 있어야… 아이템을 못 낀다던가 등등」).
 * A greyed-out button explains itself when pressed: the reason it carries (actionButton's data-reason, or its title), else
 * the note printed beside it. A disabled button receives no clicks, so such buttons let presses fall through (shell.css)
 * and a press inside one's box shows the reason in a small bubble beside it. The bubble sits in the top layer
 * (popover), so it also shows over open windows; without popover support the notice line is used. */
(function(){'use strict';
const NOTE='.choice-note,.lack,.wish-warn,.phase-note';
function reasonOf(b){
 const own=b.getAttribute('data-reason')||b.getAttribute('aria-description');if(own)return own;
 const title=(b.title||'').trim();if(title&&title!==b.textContent.trim()&&title!==b.getAttribute('aria-label'))return title;
 for(const n of [b.nextElementSibling,b.previousElementSibling])if(n?.matches?.(NOTE)&&n.textContent.trim())return n.textContent.trim();
 const near=b.parentElement?.querySelector(NOTE);return near?.textContent.trim()||'';
}
let tip=null,timer=0,anchor=null;
function hide(){clearTimeout(timer);anchor=null;try{tip?.hidePopover?.();}catch{}}
// Beside the button, above it when there is room; it follows the button while the page scrolls.
function place(){
 if(!anchor||!tip)return;const r=anchor.getBoundingClientRect();if(!anchor.isConnected||r.bottom<0||r.top>innerHeight){hide();return;}
 const w=tip.offsetWidth,h=tip.offsetHeight,top=r.top-h-8;
 tip.style.left=Math.round(Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8))+'px';
 tip.style.top=Math.round(top<8?Math.min(r.bottom+8,innerHeight-h-8):top)+'px';
}
function explain(b,text){
 if(!tip){tip=document.createElement('div');tip.className='locked-reason-tip';tip.setAttribute('role','status');if('popover' in tip)tip.popover='manual';document.body.append(tip);}
 if(!tip.showPopover){if(typeof say==='function')say(text);return;}
 hide();tip.textContent=text;try{tip.showPopover();}catch{return;}
 anchor=b;place();timer=setTimeout(hide,4000);
}
document.addEventListener('click',e=>{
 if(e.target.closest?.('button:not(:disabled),a[href],input,select,textarea,summary,label'))return;
 // The press lands on what holds the button (it lets presses through), never on a window drawn over it.
 const x=e.clientX,y=e.clientY;if(!e.target?.querySelectorAll)return;
 for(const b of e.target.querySelectorAll('button:disabled')){
  const r=b.getBoundingClientRect();if(!r.width||x<r.left||x>r.right||y<r.top||y>r.bottom)continue;
  // The press stays with the button, as before: nothing underneath it reacts.
  e.stopPropagation();e.preventDefault();const text=reasonOf(b);if(text)explain(b,text);return;
 }
},true);
addEventListener('scroll',place,true);addEventListener('resize',hide);
globalThis.lockedReasonOf=reasonOf;
})();
