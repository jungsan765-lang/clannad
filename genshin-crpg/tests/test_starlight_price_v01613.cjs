'use strict';
// 0.16.13: use the actual runtime and exchange view to check the new price,
// resource boundaries, duplicate request receipts and save restoration.
const assert=require('node:assert/strict');
const {fresh,R,db,c,fs,path,root,vm}=require('./helpers_v011.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
const offer='GLITTER_STELLA',hero='PLAYER_CUSTOM',five='MOND_DILUC',four='MOND_AMBER';
const intent=(r,char)=>({id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type:'PREMIUM_BUY',offer,char});
const recruit=(r,id)=>r.adminApply({op:'recruit',char:id});
const restore=r=>new R(db,JSON.parse(r.serialize()));
const checks=[];
function check(name,fn){checks.push({name,fn});}
function rejectsUnchanged(r,char,pattern){const before=r.serialize();assert.throws(()=>r.transact(intent(r,char)),pattern);assert.equal(r.serialize(),before);}

check('all five-star companions and the existing five-star protagonist rule cost 100',()=>{
 const r=fresh(),fiveStars=Object.keys(r.s.chars).filter(id=>r.premiumRarity(id)>=5);
 assert(fiveStars.includes(five)&&fiveStars.includes('LIYUE_ZHONGLI'));
 for(const id of fiveStars)assert.equal(r.premiumStellaPrice(id),100,id);
 assert.equal(r.premiumRarity(hero),5);assert.equal(r.premiumStellaPrice(hero),100);
 assert.equal(r.premiumStellaPrice(four),25);
 const o=c.CRPGRuntime.premiumV0148.offers.find(x=>x.id===offer);
 assert.equal(o.price,100);assert.equal(o.note,'5★ 동료와 주인공 100, 4★ 동료 25');
});

check('99 is rejected without changing a save; 100 grants one star and one receipt',()=>{
 const r=fresh();recruit(r,five);r.s.global.STARGLITTER=99;
 assert.equal(r.premiumOfferReason({offer,char:five}),'스타라이트가 부족합니다.');
 rejectsUnchanged(r,five,/스타라이트가 부족/);
 r.s.global.STARGLITTER=100;const a=intent(r,five),rev=r.s.global.SAVE_REVISION;
 assert.equal(r.premiumOfferReason(a),'');const receipt=r.transact(a);
 assert.equal(receipt.ok,true);assert.equal(receipt.revision,rev+1);
 assert.equal(r.s.global.STARGLITTER,0);assert.equal(r.itemCount('STELLA_'+five),1);
 const saved=r.serialize();assert.deepEqual(plain(r.transact(a)),plain(receipt));assert.equal(r.serialize(),saved);
 const next=restore(r),after=next.serialize();assert.deepEqual(plain(next.transact(a)),plain(receipt));assert.equal(next.serialize(),after);
 rejectsUnchanged(next,five,/스타라이트가 부족/);
});

check('four-star exchange still costs 25 and retries do not grant another star',()=>{
 const r=fresh();recruit(r,four);r.s.global.STARGLITTER=24;rejectsUnchanged(r,four,/스타라이트가 부족/);
 r.s.global.STARGLITTER=25;const a=intent(r,four),receipt=r.transact(a);
 assert.equal(r.s.global.STARGLITTER,0);assert.equal(r.itemCount('STELLA_'+four),1);
 const next=restore(r),saved=next.serialize();assert.deepEqual(plain(next.transact(a)),plain(receipt));assert.equal(next.serialize(),saved);
});

check('ownership, held stars and six unlocked constellations still block unnecessary exchanges',()=>{
 const r=fresh();r.s.global.STARGLITTER=1000;rejectsUnchanged(r,five,/동료를 골라/);
 recruit(r,five);r.giveItem('STELLA_'+five,6);rejectsUnchanged(r,five,/더 이상/);
 const next=restore(r);rejectsUnchanged(next,five,/더 이상/);
 next.s.inventory=next.s.inventory.filter(x=>x.item!=='STELLA_'+five);(next.s.constellations??={})[five]=6;
 rejectsUnchanged(next,five,/더 이상/);
 const mixed=fresh();recruit(mixed,five);mixed.s.global.STARGLITTER=1000;(mixed.s.constellations??={})[five]=4;mixed.giveItem('STELLA_'+five,2);
 rejectsUnchanged(mixed,five,/더 이상/);
});

check('already obtained stars and unlocked constellations survive restore at their old quantities',()=>{
 const r=fresh();recruit(r,five);(r.s.constellations??={})[five]=2;r.giveItem('STELLA_'+five,1);r.s.global.STARGLITTER=40;
 const next=restore(r);assert.equal(next.s.global.STARGLITTER,40);assert.equal(next.constellationLevel(five),2);assert.equal(next.itemCount('STELLA_'+five),1);
 next.action('CONSTELLATION_UNLOCK',{char:five});assert.equal(next.constellationLevel(five),3);assert.equal(next.itemCount('STELLA_'+five),0);assert.equal(next.s.global.STARGLITTER,40);
});

function view(r){
 // This small DOM only supplies the APIs used by the existing exchange view;
 // all offer data, availability rules and completed purchases use the runtime.
 class Node{
  constructor(tag){this.tagName=tag.toUpperCase();this.className='';this.children=[];this.dataset={};this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  get childElementCount(){return this.children.length;}
  setAttribute(name,value){this[name]=String(value);}
  querySelector(selector){const [tag,cls]=selector.split('.');return walk(this).find(n=>n!==this&&(!tag||n.tagName===tag.toUpperCase())&&(!cls||n.className.split(' ').includes(cls)))||null;}
 }
 function walk(n){return [n,...n.children.flatMap(walk)];}
 let modal=null;
 const context=vm.createContext({console,window:{CRPGRuntime:c.CRPGRuntime,CRPGShell:{extraTiles:[]},CRPG_MANIFEST:{}},document:{createElement:tag=>new Node(tag)},render(){},game:r,busy:false,
  choiceTiles(config){const n=new Node('div');n.className=config.className;n.value=config.value;n.options=config.options;n.change=id=>{n.value=id;config.onChange();};return n;},
  showModal(title,box){assert.equal(title,'교환');modal=box;},act:async(type,params)=>r.action(type,params)});
 vm.runInContext(fs.readFileSync(path.join(root,'source/app_premium_v0148.js'),'utf8'),context,{filename:'app_premium_v0148.js'});
 context.window.CRPGPremium.openShop('STARGLITTER');
 return {find:cls=>walk(modal).find(n=>n.className.split(' ').includes(cls)),all:()=>walk(modal)};
}

check('live exchange view shows 25~100, selected prices, 99 rejection and an actual 100 purchase',async()=>{
 const r=fresh();recruit(r,five);recruit(r,four);r.s.global.STARGLITTER=99;
 const ui=view(r),pick=ui.find('premium-pick'),price=()=>ui.find('premium-price').children[1].textContent,buy=()=>ui.find('premium-buy');
 assert.equal(price(),'25~100');assert.equal(buy().disabled,true);
 assert(pick.options.find(x=>x.value===five).title.includes('스타라이트 100'));
 assert(pick.options.find(x=>x.value===four).title.includes('스타라이트 25'));
 pick.change(five);assert.equal(price(),'100');assert.equal(buy().disabled,true);assert.equal(buy().title,'스타라이트가 부족합니다.');
 pick.change(four);assert.equal(price(),'25');assert.equal(buy().disabled,false);
 r.s.global.STARGLITTER=100;pick.change(five);assert.equal(price(),'100');assert.equal(buy().disabled,false);
 await buy().onclick();assert.equal(r.s.global.STARGLITTER,0);assert.equal(r.itemCount('STELLA_'+five),1);
 assert.match(ui.find('premium-done').textContent,/교환했습니다/);assert.equal(price(),'25~100');
});

(async()=>{
 let passed=0;for(const {name,fn}of checks){try{await fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
 console.log(JSON.stringify({total:checks.length,passed}));
})();
