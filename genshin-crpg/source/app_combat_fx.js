/* Geometric light, trails and rings describe combat actions; no game state writes. */
const CombatFX={
 animations:new Set(),
 // 0.15.21 (user: 「차례가 나온 뒤 0.몇초정도 뜸을 주고 공격」): the fighter's card lights up first (app_battle_fx_v01521.js),
 // waits windupLead, then steps in and strikes in the rest of windupDuration.
 windupDuration:460,
 windupLead:300,
 clear(){for(const a of this.animations)a.cancel();this.animations.clear();},
 pause(paused){for(const a of this.animations)paused?a.pause():a.play();},
 animate(node,frames,options){if(!node?.animate)return;const a=node.animate(frames,{...options,duration:options.duration/(settings.combatSpeed||1)});this.animations.add(a);a.finished.then(()=>this.animations.delete(a),()=>this.animations.delete(a));return a;},
 point(node){const r=node?.getBoundingClientRect();return r&&r.bottom>90&&r.top<innerHeight-200?{x:r.left+r.width/2,y:r.top+r.height/2}:null;},
 mote(layer,cls,p){const n=el('span','combat-light '+cls);n.style.left=p.x+'px';n.style.top=p.y+'px';layer.append(n);return n;},
 anticipate(frame,effects){
  this.clear();const actor=effects.actorNode(frame.actorId);actor?.classList.add('acting');
  if(settings.reducedMotion)return;
  // Hold a living preparation pose; launch the attack only once its result is acknowledged.
  this.animate(actor,[{filter:'brightness(1)',transform:'translateX(0)'},{filter:'brightness(1.35)',transform:'translateX(3px)'},{filter:'brightness(1)',transform:'translateX(0)'}],{duration:900,iterations:Infinity,easing:'ease-in-out'});
 },
 windup(frame,effects){
  effects.layerNode().replaceChildren();this.clear();if(frame.kind!=='action')return;
  const auxiliary=frame.periodic||frame.events.every(e=>(e.sourceKind&&e.sourceKind!=='JOINT_ATTACK')||e.kind==='reaction'),summonSource=String(frame.actorId||'').startsWith('SUMMON:');
  if(effects.dock){effects.dock.querySelector('.playback-message').textContent=[frame.actor,frame.cardName||'행동',auxiliary?'효과 발동':'준비'].filter(Boolean).join(' · ');effects.dock.querySelector('.playback-outcomes').replaceChildren();}
  if(settings.reducedMotion)return;
  const actor=effects.actorNode(frame.actorId),from=this.point(actor),layer=effects.layerNode();
  const strike=Math.max(60,this.windupDuration-(this.windupLead||0)),wait=(this.windupLead||0)/(settings.combatSpeed||1);
  if(actor&&(!auxiliary||summonSource)){const direction=actor.dataset.side==='ENEMY'?-1:1;this.animate(actor,[{transform:'translateX(0)'},{transform:'translateX('+direction*9+'px)',filter:'brightness(1.5)'}],{duration:strike,delay:wait,fill:'forwards',easing:'ease-in'});}
  // 0.15.21 (user: 「뿅뿅 날아가는 것만 말고 장비마다 공격 모션」): only an arrow or a spell flies ahead now; a melee blow is
  // drawn on the target when it lands (app_battle_fx_v01521.js).
  if(typeof BattleFX!=='undefined'&&BattleFX.windupShot){BattleFX.windupShot(frame,effects,from,auxiliary,summonSource,{delay:wait,duration:strike});return;}
  for(const t of frame.targets){const target=this.point(effects.actorNode(t.targetId));if(!target||!from||t.targetId===frame.actorId||(auxiliary&&!summonSource))continue;const e=t.events.find(e=>e.kind==='damage')||t.events[0],element=e?.element||'hit',p=this.mote(layer,'cast-trail effect-'+element,from),dx=target.x-from.x,dy=target.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
   this.animate(p,[{transform:'translate(-50%,-50%) rotate('+angle+'deg) scaleX(.3)',opacity:0},{offset:.2,opacity:1},{transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate('+angle+'deg) scaleX(1)',opacity:1}],{duration:strike,delay:wait,fill:'both',easing:'ease-in'});
  }
 },
 // Reaction names ride on their target's damage number, as in the original, instead of a separate banner.
 reactionTags(frame,effects){
  const layer=effects.layerNode(),shown=new Set();
  const name=id=>{try{return game?.tables?.['37_ELEMENTAL_REACTION_DB']?.get(id)?.[1]||'';}catch{return '';}};
  for(const t of frame.targets){
   const list=[];for(const e of t.events){const label=e.kind==='reaction'?e.label:e.reactionId?name(e.reactionId):'';if(label&&!list.includes(label))list.push(label);}
   const p=list.length?this.point(effects.actorNode(t.targetId)):null;if(!p)continue;
   const kind=(t.events.find(e=>e.kind==='reaction')?.element)||reactionKind(t.events.find(e=>e.reactionId)?.reactionId);
   const tag=this.mote(layer,'reaction-tag effect-'+(kind||'hit'),{x:p.x,y:p.y-44});tag.textContent=list.join(' · ');for(const l of list)shown.add(l);
   if(!settings.reducedMotion)this.animate(tag,[{opacity:0,transform:'translate(-50%,-30%) scale(.7)'},{offset:.15,opacity:1,transform:'translate(-50%,-60%) scale(1.12)'},{offset:.3,transform:'translate(-50%,-62%) scale(1)'},{offset:.8,opacity:1,transform:'translate(-50%,-110%) scale(1)'},{opacity:0,transform:'translate(-50%,-130%) scale(.96)'}],{duration:1100,easing:'ease-out',fill:'forwards'});
  }
  // A reaction without a known target (a field, a summon) still gets one line in the middle.
  const rest=frame.reactions.filter(r=>!shown.has(r));
  if(rest.length){const badge=el('div','reaction-burst',rest.join(' · '));layer.append(badge);if(!settings.reducedMotion)this.animate(badge,[{opacity:0,transform:'translate(-50%,12px) scale(.9)'},{opacity:1,transform:'translate(-50%,0) scale(1)'}],{duration:350,fill:'forwards'});}
 },
 // 0.14.11: an element that stays on the target after the hit is named under it (「불 부착」), so it is clear the
 // element took; a hit that set off a reaction shows the reaction instead. Wind and rock never stay on a target.
 auraTags(frame,effects){
  const layer=effects.layerNode(),NAME={fire:'불',water:'물',ice:'얼음',lightning:'번개',dendro:'풀'};
  for(const t of frame.targets){
   if(t.events.some(e=>e.kind==='reaction'||e.reactionId))continue;
   const hit=t.events.find(e=>e.kind==='damage'&&NAME[e.element]);if(!hit)continue;
   const p=this.point(effects.actorNode(t.targetId));if(!p)continue;
   // 0.15.21: the element's symbol (app_icons_v01521.js) instead of its name.
   const tag=this.mote(layer,'aura-tag effect-'+hit.element,{x:p.x,y:p.y+34}),pic=typeof CRPGIcons!=='undefined'?CRPGIcons.element(hit.element):null;if(pic)tag.append(pic,'부착');else tag.textContent=NAME[hit.element]+' 부착';
   if(!settings.reducedMotion)this.animate(tag,[{opacity:0,transform:'translate(-50%,-20%) scale(.8)'},{offset:.18,opacity:1,transform:'translate(-50%,-50%) scale(1.06)'},{offset:.3,transform:'translate(-50%,-50%) scale(1)'},{offset:.82,opacity:1},{opacity:0,transform:'translate(-50%,-70%)'}],{duration:1150,easing:'ease-out',fill:'forwards'});
  }
 },
 impact(frame,effects){
  if(frame.kind==='action'){this.reactionTags(frame,effects);this.auraTags(frame,effects);}
  if(settings.reducedMotion||frame.kind!=='action')return;const layer=effects.layerNode();
  for(const t of frame.targets){const target=effects.actorNode(t.targetId),p=this.point(target);if(!p)continue;
   const e=t.events.find(e=>e.kind==='damage')||t.events.find(e=>e.kind==='heal')||t.events[0],element=e?.element||'hit';
   const guarded=t.absorbed||t.events.some(e=>e.kind==='guard'),shape=t.heal?'healing-ring':guarded&&!t.damage?'shield-ring':['water','wind'].includes(element)?'ripple-ring':element==='ice'?'frost-ring':element==='rock'?'geo-ring':'impact-ring';
   if(t.damage||t.heal||guarded){const ring=this.mote(layer,shape+' effect-'+element,p);this.animate(ring,[{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale(1.7)',opacity:0}],{duration:600,easing:'ease-out',fill:'forwards'});}
   if(t.damage){for(let i=0;i<(t.critical?10:6);i++){const angle=i*Math.PI*2/(t.critical?10:6),spark=this.mote(layer,'impact-spark effect-'+element,p),length=35+(i%3)*14;this.animate(spark,[{transform:'translate(-50%,-50%)',opacity:1},{transform:'translate(calc(-50% + '+Math.cos(angle)*length+'px),calc(-50% + '+Math.sin(angle)*length+'px)) rotate('+angle+'rad) scale(.1)',opacity:0}],{duration:420+i*24,easing:'ease-out',fill:'forwards'});}
    this.animate(target,[{transform:'translateX(0)',filter:'brightness(1.7)'},{transform:'translateX(-5px)'},{transform:'translateX(4px)'},{transform:'translateX(0)',filter:'brightness(1)'}],{duration:330});
   }
   if(t.damage&&t.hpAfter<=0){const badge=this.mote(layer,'defeated-marker',p);badge.textContent='격파';this.animate(badge,[{opacity:0,transform:'translate(-50%,20px)'},{opacity:1,transform:'translate(-50%,8px)'}],{duration:400,fill:'forwards'});}
  }
 }
};
// Which colour a reaction tag takes.
function reactionKind(id){id=String(id||'');return /MELT|VAPORIZE|OVERLOADED|BURN/.test(id)?'fire':/FROZEN|SUPERCONDUCT/.test(id)?'ice':/ELECTRO|AGGRAVATE|HYPERBLOOM/.test(id)?'lightning':/SWIRL/.test(id)?'wind':/CRYSTALLIZE|SHATTER/.test(id)?'rock':/BLOOM|SPREAD|BURGEON|QUICKEN/.test(id)?'dendro':'hit';}
// Damage numbers read like the original's: the number alone in the element's colour with a thick dark rim, and a
// critical hit is bigger with a 「치명타!」 badge on top (0.14.11: the badge is back; without it a crit was easy to
// miss). The numbers are drawn by the battle playback (app_av.js); this only rewrites their text as they appear.
(function(){
 const relabel=item=>{
  if(!item?.classList?.contains('impact')||item.dataset.shellNumber||!/kind-(action|damage)/.test(item.className))return;item.dataset.shellNumber='1';
  const label=item.querySelector('.impact-label');if(!label)return;const text=label.textContent.trim();
  // The label passes through the readable-text helper, which turns 「HP」 into 「체력」: accept both.
  const hp=text.match(/(?:HP|체력) -(\d[\d,]*)/),guard=text.match(/보호막 -(\d[\d,]*)/);
  if(hp){label.textContent=hp[1];if(guard){const note=document.createElement('small');note.className='impact-target impact-shield';note.textContent='보호막 '+guard[1];label.after(note);}}
  else if(guard&&!hp){label.textContent=guard[1];item.classList.add('shielded');}
  else if(/^\d[\d,]*$/.test(text)){}
  else if(/^\+\d/.test(text))item.classList.add('healing');
  else item.classList.add('worded');
  let crit=item.classList.contains('critical');
  for(const small of item.querySelectorAll('.impact-target'))if(small.textContent.trim()==='치명타'){crit=true;small.remove();}
  if(crit&&!item.classList.contains('worded')){item.classList.add('critical');const badge=document.createElement('span');badge.className='impact-crit';badge.textContent='치명타!';label.before(badge);}
 };
 try{new MutationObserver(list=>{for(const r of list)for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.classList.contains('impact'))relabel(n);else if(n.querySelector)n.querySelectorAll('.impact').forEach(relabel);}}).observe(document.documentElement,{childList:true,subtree:true});}catch{}
})();
