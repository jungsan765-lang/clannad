/* Geometric light, trails and rings describe combat actions; no game state writes. */
const CombatFX={
 animations:new Set(),
 clear(){for(const a of this.animations)a.cancel();this.animations.clear();},
 pause(paused){for(const a of this.animations)paused?a.pause():a.play();},
 animate(node,frames,options){if(!node?.animate)return;const a=node.animate(frames,{...options,duration:options.duration/(settings.combatSpeed||1)});this.animations.add(a);a.finished.then(()=>this.animations.delete(a),()=>this.animations.delete(a));return a;},
 point(node){const r=node?.getBoundingClientRect();return r&&r.bottom>90&&r.top<innerHeight-200?{x:r.left+r.width/2,y:r.top+r.height/2}:null;},
 mote(layer,cls,p){const n=el('span','combat-light '+cls);n.style.left=p.x+'px';n.style.top=p.y+'px';layer.append(n);return n;},
 windup(frame,effects){
  effects.layerNode().replaceChildren();this.clear();if(frame.kind!=='action')return;
  const auxiliary=frame.periodic||frame.events.every(e=>(e.sourceKind&&e.sourceKind!=='JOINT_ATTACK')||e.kind==='reaction');
  if(effects.dock){effects.dock.querySelector('.playback-message').textContent=[frame.actor,frame.cardName||'행동',auxiliary?'효과 발동':'준비'].filter(Boolean).join(' · ');effects.dock.querySelector('.playback-outcomes').replaceChildren();}
  if(settings.reducedMotion)return;
  const actor=effects.actorNode(frame.actorId),from=this.point(actor),layer=effects.layerNode();
  if(actor&&!auxiliary){const direction=actor.dataset.side==='ENEMY'?-1:1;this.animate(actor,[{transform:'translateX(0)'},{transform:'translateX('+direction*9+'px)',filter:'brightness(1.5)'}],{duration:260,fill:'forwards',easing:'ease-in'});}
  for(const t of frame.targets){const target=this.point(effects.actorNode(t.targetId));if(!target||!from||t.targetId===frame.actorId||auxiliary)continue;const e=t.events.find(e=>e.kind==='damage')||t.events[0],element=e?.element||'hit',p=this.mote(layer,'cast-trail effect-'+element,from),dx=target.x-from.x,dy=target.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
   this.animate(p,[{transform:'translate(-50%,-50%) rotate('+angle+'deg) scaleX(.3)',opacity:0},{offset:.2,opacity:1},{transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate('+angle+'deg) scaleX(1)',opacity:1}],{duration:260,fill:'forwards',easing:'ease-in'});
  }
 },
 impact(frame,effects){
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
  if(frame.reactions.length){const badge=el('div','reaction-burst',frame.reactions.join(' · '));layer.append(badge);this.animate(badge,[{opacity:0,transform:'translate(-50%,12px) scale(.9)'},{opacity:1,transform:'translate(-50%,0) scale(1)'}],{duration:350,fill:'forwards'});}
 }
};
