/* Liyue card execution. Signatures pin the authored definitions; persistent hooks live in battle state. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,S=root.CRPGLiyueCardSignatures;
const old=Object.fromEntries(['cardSupport','cardReason','cardTargets','combatCards','executeCard','basicHit','damage','applyDamage','combatDamageMultiplier','tickFields','onCombatTurnStart','aiTurn','craft','finishLife','validateSave','applyCombatAura','reactionFor','combatActionLocked','displaceCombatActor','newRound'].map(k=>[k,P[k]]));
const st=(a,id)=>(a?.statuses||[]).find(s=>s.id===id&&(!Number.isFinite(s.rounds)||s.rounds>0)),el=x=>({PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'}[x]||x),fail=(c,m)=>{throw new api.RuleError(c,m);};
const field=(b,k,side)=>b.fields.find(f=>f.kind===k&&!f.done&&(side===undefined||f.side===side));
const stamp=(b,a)=>b.round+':'+a.id+':'+b.actionSequence;
const once=(f,key)=>{f.used||={};if(f.used[key])return false;f.used[key]=true;return true;};
const active=(b,side)=>b.actors.filter(a=>a.hp>0&&a.side===side),lowest=a=>a.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
P.cardSupport=function(c){if(Object.hasOwn(S,c.id))return c.ready&&S[c.id]===c.script?'':'리월 카드의 실행 정의가 원고와 일치하지 않습니다.';return old.cardSupport.call(this,c);};
P.cardReason=function(a,c){
 if(Object.hasOwn(S,c.id)){
  if(c.kind==='패시브')return '편성 중 조건에 따라 자동 적용됩니다.';
  if(c.id==='LIYUE_ZIBAI_E'&&st(a,'AGE_GAP'))return '시간의 틈이 이미 유지 중입니다.';
  if(c.id==='LIYUE_HUTAO_E'&&a.hp/a.maxHp<=.15)return '현재 HP가 최대 HP의 15%보다 높아야 합니다.';
  if(c.id==='LIYUE_ZIBAI_E_CHARGE'){const s=st(a,'AGE_GAP');if(!s||s.light<70||s.uses>=4)return '시간의 빛 70과 남은 강화 횟수가 필요합니다.';}
 }
 return old.cardReason.call(this,a,c);
};
P.cardTargets=function(a,c){if(['LIYUE_XIANYUN_E','LIYUE_LANYAN_E','LIYUE_XINYAN_E'].includes(c.id))return active(this.s.runtime,a.side);return old.cardTargets.call(this,a,c);};
P.combatCards=function(owner){return old.combatCards.call(this,owner).map(c=>c.id==='LIYUE_KEQING_E'?{...c,branches:['PURSUIT','EXPLOSION']}:c);};
P.liyueHit=function(a,t,k,element,c,more={}){return this.damage(a,t,k,element,{range:c?.range||'전장',hitBonus:c?.hit||0,card:c?.id||c,...more});};
P.executeCard=function(a,c,target,branch){
 if(!Object.hasOwn(S,c.id))return old.executeCard.call(this,a,c,target,branch);
 if(this.cardSupport(c))fail('CARD_IMPLEMENTATION',this.cardSupport(c));if(c.kind==='패시브')fail('CARD_PASSIVE','패시브는 자동 적용됩니다.');
 const b=this.s.runtime,enemies=active(b,a.side==='ALLY'?'ENEMY':'ALLY').filter(t=>this.hasAirAccess(a,t,c.range)),picked=enemies.find(t=>t.id===target),ts=picked?[picked,...enemies.filter(t=>t!==picked)]:enemies,allies=active(b,a.side),friend=allies.find(t=>t.id===target)||lowest(allies)||a;
 const used=new Set(),hit=(t,k,e,more={})=>{const landed=this.liyueHit(a,t,k,e,c,{noAura:used.has(t.id),...more});if(landed)used.add(t.id);return landed;},many=(k,e,n=4,more={})=>ts.slice(0,n).filter(t=>hit(t,k,e,more)),heal=(t,n)=>this.heal(t,n,a.name),stat=k=>this.combatStat(a,k),hp=a.maxHp;
 const add=(kind,rounds=2,extra={})=>this.addField(kind,a,rounds,{sourceCardId:c.id,liyue:true,...extra}),buff=(t,id,rounds=2,extra={})=>this.addCombatStatus(t,id,rounds,{actor:a.id,...extra});
 const prior=this._liyueExecuting;this._liyueExecuting={card:c.id,actor:a.id};
 try{switch(c.id.replace('LIYUE_','')){
 case'BAIZHU_E':for(let i=0;i<(ts.length===1?2:ts.length?3:0);i++)hit(ts[i%ts.length],.4,'DENDRO');allies.forEach(t=>heal(t,hp*.08));break;
 case'BAIZHU_Q':add('BAIZHU_SEAMLESS_SHIELD');break;
 case'BEIDOU_E':case'YUNJIN_E':buff(a,'LIYUE_COUNTER',null,{resolveTurn:(a.turns||0)+1,card:c.id,triggered:false});break;
 case'BEIDOU_Q':add('STORMBREAKER');break;
 case'QIQI_E':add('HERALD_OF_FROST');break;
 case'QIQI_Q':for(const t of many(.8,'CRYO'))buff(t,'FORTUNE_TALISMAN');break;
 case'NINGGUANG_E':many(.8,'GEO',3);add('JADE_SCREEN');break;
 case'NINGGUANG_Q':{const f=field(b,'JADE_SCREEN',a.side),n=f?8:6;if(f)f.done=true;for(let i=0;i<n&&ts.some(t=>t.hp>0);i++){const live=ts.filter(t=>t.hp>0);hit(live[0],.28,'GEO');}break;}
 case'KEQING_E':if(ts[0]&&hit(ts[0],.35,'ELECTRO')){const mode=a.control==='AI'?'PURSUIT':branch;if(!['PURSUIT','EXPLOSION'].includes(mode))fail('CARD_BRANCH','추격 또는 폭발을 선택하세요.');if(mode==='PURSUIT')hit(ts[0],1.2,'ELECTRO',{ignoreIntercept:true});else many(.6,'ELECTRO',2);}break;
 case'KEQING_Q':for(let i=0;i<4&&ts.some(t=>t.hp>0);i++)hit(ts.find(t=>t.hp>0),.25,'ELECTRO');many(.8,'ELECTRO');break;
 case'GAMING_E':{const low=a.hp/hp<=.5;if(!low)a.hp=Math.max(1,a.hp-Math.floor(a.hp*.08));many(1.6*(low?1.15:1),'PYRO',3);break;}
 case'GAMING_Q':many(1,'PYRO',3);heal(a,hp*.12);add('MAN_CHAI');break;
 case'GANYU_E':add('ICE_LOTUS',1,{expires:b.round+1,position:{...(ts[0]?.position||a.position)}});break;
 case'GANYU_Q':add('CELESTIAL_SHOWER');break;
 case'XINGQIU_E':if(ts[0])hit(ts[0],.9,'HYDRO');add('RAIN_SWORDS',999,{stacks:2});break;
 case'XINGQIU_Q':add('RAINCUTTER');break;
 case'HUTAO_E':if(a.hp/hp<=.15)fail('HP_COST','HP가 부족합니다.');a.hp=Math.max(1,a.hp-Math.floor(a.hp*.15));buff(a,'PARAMITA_PAPILIO');break;
 case'HUTAO_Q':{const low=a.hp/hp<=.5,hits=many(1.4*(low?1.25:1),'PYRO');heal(a,hp*.06*Math.min(3,hits.length)*(low?1.5:1));break;}
 case'XIANGLING_E':add('GOU_BA',2,{expires:b.round+2});break;
 case'XIANGLING_Q':add('PYRONADO');break;
 case'XIANYUN_E':buff(friend,'SKY_LADDER',null,{untilTurn:(friend.turns||0)+2});break;
 case'XIANYUN_Q':allies.forEach(t=>heal(t,stat('atk')*.8));add('BAMBOO_STAR');break;
 case'LANYAN_E':{const matched=ts[0]&&this.auraList(ts[0]).map(v=>v.element).find(e=>['불','물','얼음','번개'].includes(e));this.shield(friend,stat('atk')*1.3,c.id,2,{converted:matched,actor:a.id});if(ts[0]){hit(ts[0],.8,'ANEMO');if(matched)this.applyCombatAura(a,ts[0],matched,{});}a.lanyanConverted=matched||null;break;}
 case'LANYAN_Q':for(const t of ts.slice(0,4))this.applyCombatControl(a,t,'PULL',{element:'바람'});many(1.1,'ANEMO');if(a.lanyanConverted){const t=ts.filter(t=>t.hp>0).sort((a,b)=>b.hp-a.hp)[0];if(t)this.applyCombatAura(a,t,a.lanyanConverted,{});}break;
 case'XIAO_E':many(1.15,'ANEMO',3,{ignoreIntercept:true});break;
 case'XIAO_Q':buff(a,'BANE_OF_ALL_EVIL');break;
 case'SHENHE_E':many(.7,'CRYO',3);add('ICY_QUILL',999,{stacks:4});break;
 case'SHENHE_Q':add('DIVINE_MAIDEN');break;
 case'XINYAN_E':{const n=many(.7,'PYRO',3).length,value=stat('def')*(1.2+.3*n);this.shield(a,value,c.id,2);if(friend!==a)this.shield(friend,value,c.id,2);if(n===3)add('XINYAN_SHIELD_FLAME',2,{due:b.round+1});break;}
 case'XINYAN_Q':{const hits=many(1.4,'PHYSICAL');for(const t of hits)if(this.isWeakCombatTarget?.(t))this.applyCombatControl(a,t,'PUSH',{element:'물리'});add('FIRE_STAGE',2,{due:b.round+1,targets:hits.map(t=>t.id)});break;}
 case'TARTAGLIA_E':many(.5,'HYDRO',2);buff(a,'MELEE_FORM');break;
 case'TARTAGLIA_Q':{const melee=st(a,'MELEE_FORM');for(const t of many(melee?1.5:1.2,'HYDRO')){if(melee){if(st(t,'RIPTIDE')){hit(t,.35,'HYDRO');t.statuses=t.statuses.filter(s=>s.id!=='RIPTIDE');}}else buff(t,'RIPTIDE');}if(melee)a.statuses=a.statuses.filter(s=>s.id!=='MELEE_FORM');break;}
 case'YANFEI_E':many(1,'PYRO',3);buff(a,'SCARLET_SEAL',2,{stacks:3,gainedAction:stamp(b,a),consumeAction:null});break;
 case'YANFEI_Q':many(1.1,'PYRO');buff(a,'SCARLET_SEAL',2,{stacks:3,gainedAction:stamp(b,a),consumeAction:null});buff(a,'BRILLIANCE');break;
 case'YELAN_E':{const count=ts.slice(0,3).length;many(.18,'HYDRO',3,{stat:'maxHp'});if(count===3)buff(a,'BREAKTHROUGH',null,{gainedAction:stamp(b,a),consumeAction:null});break;}
 case'YELAN_Q':add('EXQUISITE_THROW');break;
 case'YUNJIN_Q':add('FLYING_CLOUD_FLAG');break;
 case'YAOYAO_E':add('YUEGUI_THROWING');break;
 case'YAOYAO_Q':{many(.8,'DENDRO');allies.forEach(t=>heal(t,hp*.1));const f=field(b,'YUEGUI_THROWING',a.side);add('YUEGUI_THROWING',2,{sage:!!f});break;}
 case'ZHONGLI_E':allies.forEach(t=>this.shield(t,hp*.2,c.id,2,{ignoreForcedMove:true}));add('STONE_STELE');break;
 case'ZHONGLI_Q':for(const t of many(.8,'GEO',4,{rawAdd:hp*.25})){if(t.grade==='보스')(buff(t,'LIYUE_BOSS_PETRIFY',null,{nextDamage:true,resolveTurn:(t.turns||0)+1}),this.liyueSlowNextAction(t,.7));else buff(t,'LIYUE_PETRIFY',1);}break;
 case'CHONGYUN_E':many(.8,'CRYO',3);add('CHONGYUN_FROST');break;
 case'CHONGYUN_Q':for(let i=0;i<3&&ts.some(t=>t.hp>0);i++){const live=ts.filter(t=>t.hp>0),t=live[i%live.length],boost=i===2&&(this.auraList(t).some(v=>v.element==='불')||/EVIL_SPIRIT|ABYSS|심연|악령/.test((t.tags||[]).join(' ')+t.source));hit(t,.55*(boost?1.5:1),'CRYO');const removable=t.statuses.find(s=>s.removable===true&&s.mods);if(removable)t.statuses=t.statuses.filter(s=>s!==removable);}break;
 case'ZIBAI_E':if(st(a,'AGE_GAP'))fail('AGE_GAP_ACTIVE','시간의 틈이 이미 유지 중입니다.');buff(a,'AGE_GAP',3,{light:0,uses:0,justCastRound:b.round,lastGainTurn:null});break;
 case'ZIBAI_E_CHARGE':{const s=st(a,'AGE_GAP');if(!s||s.light<70||s.uses>=4)fail('RESOURCE','시간의 빛 또는 강화 횟수가 부족합니다.');s.light-=70;s.uses++;if(ts[0]){hit(ts[0],1.4,'GEO',{stat:'def'});this.liyueLunarDamage(a,ts[0],stat('def')*(1.15+((s.justCastRound===b.round||b.lunarRounds?.[a.side]===b.round)?.45:0)));}break;}
 case'ZIBAI_Q':{for(const t of many(1,'GEO',3,{stat:'def'}))this.liyueLunarDamage(a,t,stat('def')*1.4);const s=st(a,'AGE_GAP');if(s)s.rounds=Math.min(3,s.rounds+1);break;}
 default:fail('CARD_IMPLEMENTATION','리월 카드 실행기가 없습니다: '+c.id);
 }}finally{this._liyueExecuting=prior;}
 a.cooldowns[c.id]=c.cooldown;
 if(c.id==='LIYUE_GAMING_E'){const f=field(b,'MAN_CHAI',a.side);if(f&&used.size&&once(f,'E:'+b.round))a.cooldowns[c.id]=Math.max(0,a.cooldowns[c.id]-1);}
 b.log.push({actor:a.name,card:c.id,cardName:c.name});
};
P.liyueSlowNextAction=function(a,factor){const b=this.s.runtime,index=b.order.findIndex((x,i)=>i>=b.cursor&&x.id===a.id);if(index>=0){b.order[index].score*=factor;b.order=[...b.order.slice(0,b.cursor),...b.order.slice(b.cursor).sort((x,y)=>y.score-x.score||x.id.localeCompare(y.id))];}else a.liyueNextScoreFactor=factor;};
P.newRound=function(){if(this.s.runtime?.opening?.state==='PENDING')return;const out=old.newRound.call(this),b=this.s.runtime;let changed=false;if(b)for(const a of b.actors)if(a.liyueNextScoreFactor){const q=b.order.find(x=>x.id===a.id);if(q){q.score*=a.liyueNextScoreFactor;changed=true;}delete a.liyueNextScoreFactor;}if(changed)b.order.sort((x,y)=>Number(y.first)-Number(x.first)||y.score-x.score||x.id.localeCompare(y.id));return out;};
P.displaceCombatActor=function(a,t,...rest){if(t.shields?.some(s=>s.value>0&&s.ignoreForcedMove))return false;return old.displaceCombatActor.call(this,a,t,...rest);};
P.combatActionLocked=function(a){return !!st(a,'LIYUE_PETRIFY')||old.combatActionLocked.call(this,a);};
P.liyueMoonLevel=function(side){const b=this.s.runtime,team=active(b,side),count=team.filter(a=>(a.tags||[]).includes('[달빛 징조]')).length;return Math.min(2,count+(team.some(a=>a.source==='LIYUE_ZIBAI')?1:0));};
P.liyueLunarDamage=function(a,t,raw){if(t.hp<=0)return;
 const b=this.s.runtime;b.lunarRounds||={};b.lunarRounds[a.side]=b.round;
 if(this.liyueMoonLevel(a.side)>=2||b.moonsignState==='FULL')for(const z of active(b,a.side).filter(z=>z.source==='LIYUE_ZIBAI')){const age=st(z,'AGE_GAP');if(age&&once(age,'MOON:'+b.round))age.light=Math.min(100,age.light+35);}
this.applyDamage(a,t,raw*100/(100+this.combatStat(t,'def'))*1.1,{element:'바위',reaction:'RX_LUNAR_CRYSTALLIZE',sourceKind:'REACTION'});this.s.runtime.lunarRound=this.s.runtime.round;};
P.basicHit=function(a,t,k){
 const b=this.s.runtime,prior=this._liyueNormal;this._liyueNormal=a.id;
 try{const age=st(a,'AGE_GAP'),infusion=age?'GEO':st(a,'PARAMITA_PAPILIO')?'PYRO':st(a,'MELEE_FORM')?'HYDRO':null;
 if(infusion){const hit=this.damage(a,t,age?.9:(k||.65),infusion,{range:a.range,stat:age?'def':'atk',card:'PLAYER_BASIC_ATTACK'});if(hit&&age)age.light=Math.min(100,age.light+15);return hit;}return old.basicHit.call(this,a,t,k);
 }finally{this._liyueNormal=prior;}
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o),b=this.s.runtime;if(!b)return n;e=el(e);
 if(/LIYUE_(GANYU|XIANYUN|XIAO|YANFEI|ZHONGLI)$/.test(a.source)&&/HUMANOID|인간|인간형|도금 여단|보물 사냥단|우인단/.test(String(this.tables['09_MONSTER_DB'].get(t.source)?.[2])+' '+(t.tags||[]).join(' ')+t.source.replace(/MON_FATUI|MON_TREASURE/g,'HUMANOID')))n*=1.05;
 if(st(a,'PARAMITA_PAPILIO'))n*=1.25;if(st(a,'BANE_OF_ALL_EVIL'))n*=1.35;if(st(a,'MELEE_FORM')&&(this._liyueNormal===a.id||o.range==='근접'))n*=1.2;
 if(field(b,'DIVINE_MAIDEN',a.side)&&['얼음','물리'].includes(e))n*=1.15;
 const y=field(b,'EXQUISITE_THROW',a.side);if(y)n*=b.round<=y.createdRound?1.1:1.2;
 if(st(a,'SKY_LADDER')&&!o.sourceKind)n*=1.2;
 if(st(a,'BREAKTHROUGH')&&st(a,'BREAKTHROUGH').gainedAction!==stamp(b,a)&&!o.sourceKind)n*=1.2;
 const seal=st(a,'SCARLET_SEAL');if(seal&&seal.gainedAction!==stamp(b,a)&&!o.sourceKind){seal.consumeAction=stamp(b,a);n*=1+.1*seal.stacks;}
 if((o.ignoreIntercept||st(a,'SKY_LADDER')||field(b,'BAMBOO_STAR',a.side)&&!field(b,'BAMBOO_STAR',a.side).used?.[b.round])&&t.slotDamageMultiplier>0&&t.slotDamageMultiplier<1)n/=t.slotDamageMultiplier;
 if(st(a,'BRILLIANCE')&&st(a,'SCARLET_SEAL')?.stacks>0&&(o.range||a.range)==='원거리'&&t.slotDamageMultiplier>0&&t.slotDamageMultiplier<1)n*=Math.min(1,t.slotDamageMultiplier+.1)/t.slotDamageMultiplier;
 if(st(a,'CHILI_BUFF'))n*=1.15;
 if(a.source==='LIYUE_CHONGYUN'&&field(b,'CHONGYUN_FROST',a.side)&&/EVIL_SPIRIT|ABYSS|심연|악령/.test((t.tags||[]).join(' ')+t.source))n*=1.15;
 const petrify=st(a,'LIYUE_BOSS_PETRIFY');if(petrify?.nextDamage){n*=.9;petrify.consumeAction=stamp(b,a);}
 return n;
};
P.damage=function(a,t,k,e='PHYSICAL',o={}){
 const b=this.s.runtime;if(!b)return old.damage.call(this,a,t,k,e,o);e=el(e);
 if(this._liyueNormal===a.id&&e==='물리'&&a.range==='근접'&&field(b,'CHONGYUN_FROST',a.side))e='얼음';
 const direct=!o.sourceKind,normal=this._liyueNormal===a.id,key=stamp(b,a),q=field(b,'ICY_QUILL',a.side),yun=field(b,'FLYING_CLOUD_FLAG',a.side);let extra=0,qSpent=false,ySpent=false;
 if(q&&q.stacks>0&&e==='얼음'&&!String(o.sourceKind||'').startsWith('REACTION')&&once(q,key+':'+(o.sourceKind||'DIRECT')+':'+(o.card||''))){const source=b.actors.find(x=>x.id===q.actor);q.stacks--;qSpent=true;extra+=this.combatStat(source,'atk')*.25;}
 const per=b.round+':'+a.id;
 if(yun&&normal&&direct){yun.counts||={};if((yun.counts[per]||0)<2&&once(yun,key)){yun.counts[per]=(yun.counts[per]||0)+1;ySpent=true;extra+=this.combatStat(b.actors.find(x=>x.id===yun.actor),'def')*.35;}}
 const scope=this._liyueDamage;this._liyueDamage={actor:a,options:o};let result;
 try{result=old.damage.call(this,a,t,k,e,{...o,rawAdd:(o.rawAdd||0)+extra});}finally{this._liyueDamage=scope;}
 if(!result){if(qSpent){q.stacks++;delete q.used[key+':'+(o.sourceKind||'DIRECT')+':'+(o.card||'')];}if(ySpent){yun.counts[per]--;delete yun.used[key];}}

 return result;
};
P.applyDamage=function(a,t,amount,d={}){
 const b=this.s.runtime;if(!b)return old.applyDamage.call(this,a,t,amount,d);let n=amount;const external=a.id!==t.id&&a.side!==t.side;
 const before=(t.shields||[]).map(s=>({...s})),counter=st(t,'LIYUE_COUNTER'),jade=field(b,'JADE_SCREEN',t.side),rain=field(b,'RAIN_SWORDS',t.side);
 if(external&&n>0){
  if(t.source==='LIYUE_ZHONGLI')n*=[0,0,.5,.7,.9][Math.min(5,b.round)]??1;
  if(counter&&!counter.triggered){counter.triggered=true;counter.attacker=a.id;n*=counter.card==='LIYUE_BEIDOU_E'?.5:.4;}
  if(field(b,'STORMBREAKER',t.side))n*=.9;
  if(jade&&!d.sourceKind&&['원거리','전장','대공'].includes(this._liyueDamage?.options?.range||a.range)){jade.firstAttacks||={};jade.firstAttacks[b.round]??=stamp(b,a);if(jade.firstAttacks[b.round]===stamp(b,a))n*=.6;}
  if(before.some(s=>s.converted===d.element))n*=.5;
  if(rain?.stacks>0){n*=.8;const floor=field(b,'RAINCUTTER',t.side)?1:0;rain.stacks=Math.max(floor,rain.stacks-1);if(!rain.stacks){rain.done=true;const source=b.actors.find(x=>x.id===rain.actor),ally=lowest(active(b,t.side));if(source&&ally)this.heal(ally,source.maxHp*.06,source.name);}}
 }
 const start=b.log.length,result=old.applyDamage.call(this,a,t,n,d),dealt=b.log.slice(start).some(v=>v.target===t.name&&((v.damage||0)>0||(v.absorbed||0)>0));
 for(const shield of before.filter(s=>s.source==='LIYUE_BAIZHU_Q'&&!t.shields.some(v=>v.source===s.source))){const f=field(b,'BAIZHU_SEAMLESS_SHIELD',t.side),source=b.actors.find(v=>v.id===shield.actor);if(f&&source&&once(f,'BREAK:'+b.round)){this.heal(t,source.maxHp*.06,source.name);if(a.hp>0)this.damage(source,a,.5,'DENDRO',{range:'전장',sourceKind:'SHIELD_BREAK',card:'LIYUE_BAIZHU_Q'});}}
 if(!dealt||d.sourceKind||a.side===t.side)return result;
 const key=b.round+':'+a.id,action=stamp(b,a),normal=this._liyueNormal===a.id;
 a.liyueDirectRound=b.round;if(a.range==='근접'){b.liyueMelee||={};if(!b.liyueMelee[action])b.liyueMelee[action]=true;}
 const follow=(source,target,k,e,more={})=>{if(source?.hp>0&&target?.hp>0)this.damage(source,target,k,e,{range:'전장',sourceKind:'FOLLOWUP',...more});};
 const storm=field(b,'STORMBREAKER',a.side);if(storm&&once(storm,key)){const source=b.actors.find(v=>v.id===storm.actor);follow(source,t,.45,'ELECTRO');follow(source,active(b,t.side).find(v=>v.id!==t.id),.45,'ELECTRO');}
 const swords=field(b,'RAINCUTTER',a.side);if(swords&&normal&&once(swords,key))follow(b.actors.find(v=>v.id===swords.actor),t,.45,'HYDRO');
 const talisman=st(t,'FORTUNE_TALISMAN');if(talisman&&once(b,'TALISMAN:'+talisman.actor+':'+key)){const source=b.actors.find(v=>v.id===talisman.actor);if(source)this.heal(a,this.combatStat(source,'atk')*.45,source.name);}
 const star=field(b,'BAMBOO_STAR',a.side);if(star&&once(star,''+b.round)){const source=b.actors.find(v=>v.id===star.actor);follow(source,t,.45,'ANEMO');active(b,a.side).forEach(v=>this.heal(v,this.combatStat(source,'atk')*.25,source.name));}
 const dice=field(b,'EXQUISITE_THROW',a.side);if(dice&&once(dice,''+b.round))follow(b.actors.find(v=>v.id===dice.actor),t,.08,'HYDRO',{stat:'maxHp'});
 const sky=st(a,'SKY_LADDER');if(sky&&once(sky,action)){sky.consumeAction=action;const source=b.actors.find(v=>v.id===sky.actor);for(const target of this.nearbyTargets(t,t.side,3))follow(source,target,1,'ANEMO',{aoe:true});}
 const bane=st(a,'BANE_OF_ALL_EVIL');if(bane&&once(bane,action)){const adjacent=this.nearbyTargets(t,t.side,4).find(v=>v!==t);if(adjacent)this.applyDamage(a,adjacent,result*.35,{element:'바람',sourceKind:'FOLLOWUP'});}
 const papilio=st(a,'PARAMITA_PAPILIO');if(papilio&&(d.critical||(n>=this.combatStat(a,'atk')))&&once(papilio,''+b.round))this.addCombatStatus(t,'BLOOD_BLOSSOM',2,{actor:a.id,due:b.round+1});
 const melee=st(a,'MELEE_FORM');if(melee){if(once(melee,''+b.round))this.addCombatStatus(t,'RIPTIDE',2,{actor:a.id});if(st(t,'RIPTIDE')&&once(melee,action))for(const v of this.nearbyTargets(t,t.side,2))follow(a,v,.3,'HYDRO',{aoe:true});}
 const breakthrough=st(a,'BREAKTHROUGH');if(breakthrough&&breakthrough.gainedAction!==action){breakthrough.consumeAction=action;}
 return result;
};
P.liyueExplodeLotus=function(f){if(f.done)return;f.done=true;const b=this.s.runtime,a=b.actors.find(v=>v.id===f.actor);if(a?.hp>0)for(const t of active(b,a.side==='ALLY'?'ENEMY':'ALLY').slice(0,3))this.damage(a,t,1,'CRYO',{range:'전장',card:'LIYUE_GANYU_E',sourceKind:'OBJECT'});};
P.onCombatTurnStart=function(a){old.onCombatTurnStart?.call(this,a);const age=st(a,'AGE_GAP');if(age&&age.lastGainTurn!==a.turns){age.lastGainTurn=a.turns;age.light=Math.min(100,age.light+25);}};
P.aiTurn=function(a,ts){
 const b=this.s.runtime,counter=st(a,'LIYUE_COUNTER');
 if(counter&&(a.turns||0)>=counter.resolveTurn){a.statuses=a.statuses.filter(s=>s!==counter);const picked=ts.find(v=>v.id===counter.attacker)||ts[0],targets=picked?[picked,...ts.filter(v=>v!==picked)]:ts;for(const t of targets.slice(0,counter.card==='LIYUE_BEIDOU_E'?1:2))this.damage(a,t,counter.card==='LIYUE_BEIDOU_E'?(counter.triggered?1.8:.7):(counter.triggered?1.5:.8),counter.card==='LIYUE_BEIDOU_E'?'ELECTRO':'GEO',{range:'전장',stat:counter.card==='LIYUE_BEIDOU_E'?'atk':'def',card:counter.card});b.log.push({actor:a.name,card:counter.card,counterResolved:true});return;}
 const lotus=b.fields.find(f=>f.kind==='ICE_LOTUS'&&!f.done&&f.side!==a.side);if(lotus&&a.grade!=='보스'){b.log.push({actor:a.name,target:'얼음 연꽃',taunted:true});this.liyueExplodeLotus(lotus);return;}
 const chili=field(b,'CHILI',a.side);if(chili){chili.done=true;this.addCombatStatus(a,'CHILI_BUFF',1,{createdRound:b.round-1});}
 const before=stamp(b,a);const result=old.aiTurn.call(this,a,ts);a.statuses=a.statuses.filter(s=>s.consumeAction!==before&&!(s.id==='LIYUE_BOSS_PETRIFY'&&s.resolveTurn<=a.turns));return result;
};
P.tickFields=function(timing){
 const b=this.s.runtime;if(!b)return;old.tickFields.call(this,timing);
 for(const f of b.fields.slice().filter(f=>f.liyue&&!f.done)){
  const a=b.actors.find(x=>x.id===f.actor&&x.hp>0);if(!a)continue;const foes=active(b,a.side==='ALLY'?'ENEMY':'ALLY'),allies=active(b,a.side),low=lowest(allies),atk=this.combatStat(a,'atk');
  const hit=(k,e,n=4)=>foes.slice(0,n).forEach(t=>this.damage(a,t,k,e,{range:'전장',card:f.sourceCardId,sourceKind:'FIELD'})),heal=(t,n)=>this.heal(t,n,a.name);
  if(timing==='START'&&f.kind==='BAIZHU_SEAMLESS_SHIELD'&&once(f,'START:'+b.round)&&low)this.shield(low,a.maxHp*.1,'LIYUE_BAIZHU_Q',1,{actor:a.id});
  if(timing!=='END'||!once(f,'END:'+b.round))continue;
  switch(f.kind){
   case'HERALD_OF_FROST':hit(.45,'CRYO',1);if(low)heal(low,atk*.55*(a.liyueDirectRound===b.round?1.25:1));break;
   case'CELESTIAL_SHOWER':for(const t of foes.slice(0,foes.length>=3?3:2))this.damage(a,t,.4,'CRYO',{range:'전장',sourceKind:'FIELD',card:f.sourceCardId});if(foes.length===1)this.damage(a,foes[0],.4,'CRYO',{range:'전장',sourceKind:'FIELD',noAura:true,card:f.sourceCardId});break;
   case'GOU_BA':hit(.45,'PYRO',2);if(b.round>=f.expires){f.done=true;this.addField('CHILI',a,1,{liyue:true});}break;
   case'PYRONADO':hit(.55*(Object.keys(b.liyueMelee||{}).filter(k=>k.startsWith(b.round+':')).length>=2?1.2:1),'PYRO');break;
   case'DIVINE_MAIDEN':hit(.45,'CRYO');break;
   case'STONE_STELE':hit(.35,'GEO',3);break;
   case'YUEGUI_THROWING':if(low?.hp/low?.maxHp<=.7||f.sage){heal(low,a.maxHp*.05);hit(.35,'DENDRO',f.sage?2:1);}else hit(.35,'DENDRO',2);break;
   case'ICE_LOTUS':if(b.round>=f.expires)this.liyueExplodeLotus(f);break;
   case'XINYAN_SHIELD_FLAME':if(b.round>=f.due){hit(.35,'PYRO',3);f.done=true;}break;
   case'FIRE_STAGE':if(b.round>=f.due){for(const t of foes.filter(t=>f.targets.includes(t.id)))this.damage(a,t,.45,'PYRO',{range:'전장',sourceKind:'FIELD',card:f.sourceCardId});f.done=true;}break;
  }
 }
 if(timing==='END')for(const a of b.actors){const bane=st(a,'BANE_OF_ALL_EVIL');if(bane&&a.hp>0&&once(bane,''+b.round))a.hp=Math.max(1,a.hp-Math.floor(a.maxHp*.08));for(const s of (a.statuses||[]).filter(s=>s.id==='BLOOD_BLOSSOM'&&s.due<=b.round)){a.statuses=a.statuses.filter(v=>v!==s);const source=b.actors.find(v=>v.id===s.actor);if(source?.hp>0)this.damage(source,a,.35,'PYRO',{range:'전장',sourceKind:'FIELD',card:'LIYUE_HUTAO_E'});}}
 if(timing==='START')for(const a of b.actors){const brilliance=st(a,'BRILLIANCE');if(brilliance){const seal=st(a,'SCARLET_SEAL');if(seal)seal.stacks=Math.min(3,seal.stacks+1);else this.addCombatStatus(a,'SCARLET_SEAL',2,{stacks:1});}}
 b.fields=b.fields.filter(f=>!f.done);
};
P.liyuePartyPassive=function(owner){return this.s.party.some(p=>p.active&&p.source===owner)&&this.s.chars[owner]?.hp>0;};
P.craft=function(id,quantity=1){const r=this.recipeDefinition(id),out=old.craft.call(this,id,quantity);if(this.liyuePartyPassive('LIYUE_XIANGLING')&&this.passiveRecipeKind(r)==='COOK'&&/ATK|공격력/.test(JSON.stringify(this.foodSpec(out.result)))){this.giveItem(out.result,1);out.quantity++;out.liyuePassive='LIYUE_XIANGLING_PASSIVE_COOK';}return out;};
P.finishLife=function(id,a={}){const job=this.s.lifeJob?JSON.parse(JSON.stringify(this.s.lifeJob)):null,out=old.finishLife.call(this,id,a);if(job&&this.row('32_MAP_DB',job.map)[1]==='리월')for(const item of Object.keys(out.items||{})){const ore=job.kind==='MINE'&&this.liyuePartyPassive('LIYUE_NINGGUANG')&&['ORE_IRON','ORE_WHITE_IRON'].includes(item),herb=['GATHER','FORAGE'].includes(job.kind)&&this.liyuePartyPassive('LIYUE_QIQI')&&['MAT_LIYUE_QINGXIN','MAT_LIYUE_VIOLETGRASS'].includes(item);if(ore||herb){this.giveItem(item,1);out.items[item]++;out.liyuePassive=ore?'LIYUE_NINGGUANG_PASSIVE_ORE':'LIYUE_QIQI_PASSIVE_HERB';}}return out;};
P.reactionFor=function(t,e,o={}){const rx=old.reactionFor.call(this,t,e,o),a=this._liyueDamage?.actor;if(rx?.[0]==='RX_CRYSTALLIZE'&&rx.previousAura==='물'&&a&&active(this.s.runtime,a.side).some(x=>x.source==='LIYUE_ZIBAI')){const lunar=Object.assign([...rx],{previousAura:rx.previousAura});lunar[0]='RX_LUNAR_CRYSTALLIZE';lunar[1]='달 결정';lunar[17]='TRANSFORM';return lunar;}return rx;};
P.applyCombatAura=function(a,t,e,o={}){const rx=o.reaction===undefined?this.reactionFor(t,e,o):o.reaction;if(rx?.[0]==='RX_LUNAR_CRYSTALLIZE'||rx?.[0]==='RX_CRYSTALLIZE'&&rx.previousAura==='물'&&active(this.s.runtime,a.side).some(x=>x.source==='LIYUE_ZIBAI')){t.auras=this.auraList(t).filter(x=>x.element!=='물');this.syncAura(t);this.liyueLunarDamage(a,t,this.reactionBase(a));this.s.runtime.log.push({actor:a.name,target:t.name,reaction:'RX_LUNAR_CRYSTALLIZE',reactionName:'달 결정',text:'달 결정 반응'});return rx;}return old.applyCombatAura.call(this,a,t,e,o);};

P.validateSave=function(s){if(s.runtime)for(const a of s.runtime.actors||[]){const age=st(a,'AGE_GAP');if(age&&(!Number.isInteger(age.light)||age.light<0||age.light>100||!Number.isInteger(age.uses)||age.uses<0||age.uses>4))fail('LIYUE_CARD_SAVE','자백의 전투 자원 기록을 확인하세요.');}return old.validateSave.call(this,s);};
const actionExecute=P.executeCard,actionBasic=P.basicHit;
P.executeCard=function(a,c,...rest){const b=this.s.runtime,key=stamp(b,a),consumables=(a.statuses||[]).filter(s=>['SKY_LADDER','BREAKTHROUGH','SCARLET_SEAL','LIYUE_BOSS_PETRIFY'].includes(s.id)).map(s=>({s,gained:s.gainedAction}));const result=actionExecute.call(this,a,c,...rest);for(const {s,gained} of consumables)if(s.consumeAction===key&&s.gainedAction===gained)a.statuses=a.statuses.filter(x=>x!==s);return result;};
P.basicHit=function(a,t,k){const b=this.s.runtime,breakthrough=st(a,'BREAKTHROUGH'),targets=breakthrough?[t,...active(b,t.side).filter(x=>x!==t)].slice(0,3):[t];let result=false;for(const target of targets)result=actionBasic.call(this,a,target,k)||result;const key=stamp(b,a);a.statuses=a.statuses.filter(s=>s.consumeAction!==key);return result;};
api.liyueCardCapabilities=Object.keys(S);
})(globalThis);
