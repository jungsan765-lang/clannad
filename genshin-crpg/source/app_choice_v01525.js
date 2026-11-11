/* 0.15.25 드롭다운 없애기 (user: 「찾아서 누르는 형식의 저거 v 눌러서 고르는거 그거 아예 쓰지 말라고」, AGENTS.md): no list that
 * opens from a ▾ anywhere in the game. Screens build choiceTiles() — every choice a button to press, a picture when
 * there is one. A <select> that still appears (the new-journey form and settings in files this team does not edit)
 * shows as the same buttons; the hidden select keeps the value, so the code that reads it works as before.
 * Load after every screen script. */
// options: [{value,label,icon?:Element|path,title?,disabled?}]. The returned row has .value like a select.
function choiceTiles({label='',options=[],value,onChange,className=''}={}){
 const make=(tag,cls)=>{const n=typeof document!=='undefined'&&document.createElement?document.createElement(tag):el(tag);if(cls)n.className=cls;return n;};
 const box=make('div','choice-tiles'+(className?' '+className:'')+(options.length>8?' many':''));box.setAttribute('role','radiogroup');if(label)box.setAttribute('aria-label',label);
 // value null: nothing picked yet (the screen waits for a press); otherwise the first open choice.
 let current=options.some(o=>String(o.value)===String(value))?value:value===null?null:options.find(o=>!o.disabled)?.value;
 const sync=()=>{for(const b of box.children){const on=b.dataset.value===String(current);b.classList.toggle('selected',on);b.setAttribute('aria-checked',String(on));}};
 for(const o of options){const b=make('button','choice-tile'+(o.icon?' pictured':''));b.type='button';b.dataset.value=String(o.value);b.setAttribute('role','radio');b.disabled=!!o.disabled;if(o.title)b.title=o.title;
  if(o.icon){let pic=o.icon;if(typeof pic==='string'){pic=make('img','');pic.src=o.icon;pic.alt='';pic.draggable=false;}pic.classList?.add('choice-tile-icon');b.append(pic);}
  const text=make('span','choice-tile-label');text.textContent=o.label??String(o.value);b.append(text);
  b.onclick=()=>{if(String(o.value)===String(current))return;current=o.value;sync();onChange?.(current);};box.append(b);}
 Object.defineProperty(box,'value',{configurable:true,get:()=>current,set:v=>{current=v;sync();}});sync();return box;
}
if(typeof window!=='undefined')window.choiceTiles=choiceTiles;
(function(){'use strict';
if(typeof document==='undefined'||typeof MutationObserver==='undefined'||typeof HTMLSelectElement==='undefined')return;
const SKIP='[data-keep-select]';
function sync(sel,box){for(const b of box.children){const on=b.dataset.value===sel.value;b.classList.toggle('selected',on);b.setAttribute('aria-checked',String(on));}}
function build(sel,box){
 box.replaceChildren();box.classList.toggle('many',sel.options.length>8);
 for(const o of sel.options){const b=document.createElement('button');b.type='button';b.className='choice-tile';b.dataset.value=o.value;b.textContent=o.textContent;b.setAttribute('role','radio');b.disabled=o.disabled||sel.disabled;
  b.addEventListener('click',()=>{if(sel.value===o.value)return;setValue.call(sel,o.value);sync(sel,box);sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));});box.append(b);}
 sync(sel,box);
}
const proto=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value'),setValue=proto.set,getValue=proto.get;
function upgrade(sel){
 if(sel.choiceTiles||sel.closest(SKIP))return;
 const box=document.createElement('div');box.className='choice-tiles';box.setAttribute('role','radiogroup');
 const label=sel.getAttribute('aria-label')||sel.closest('label')?.textContent?.trim()||'';if(label)box.setAttribute('aria-label',label);
 sel.choiceTiles=box;sel.hidden=true;sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');sel.after(box);build(sel,box);
 // A value set by the screen's own code afterwards shows on the buttons too.
 try{Object.defineProperty(sel,'value',{configurable:true,get(){return getValue.call(this);},set(v){setValue.call(this,v);sync(this,box);}});}catch{}
 new MutationObserver(()=>build(sel,box)).observe(sel,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}
function scan(root){if(root.matches?.('select'))upgrade(root);for(const s of root.querySelectorAll?.('select')||[])upgrade(s);}
scan(document);
new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)if(n.nodeType===1)scan(n);}).observe(document.documentElement,{childList:true,subtree:true});
window.CRPGChoiceTiles={upgrade,scan};
})();
