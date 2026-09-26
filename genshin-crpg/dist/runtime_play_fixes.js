/* v0.13.30 play fixes: personal-story exits, fallen protagonist after a win, defeat penalty, spread enemy targeting, item wording. */
(function(root){
'use strict';
const api=root.CRPGRuntime;if(!api?.Runtime)throw Error('CRPGRuntime must be loaded first');
const P=api.Runtime.prototype;if(P.playFixesVersion)return;
const readJSON=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const CONFIG={version:1,defeatMoraRate:.1,defeatLockMs:60000,reviveHpRate:.1,repeatTargetWeight:.45,woundedTargetBonus:.5};
api.playFixConfig=JSON.parse(JSON.stringify(CONFIG));
const old=Object.fromEntries(['prepareStory','finishBattle','aiTurn','actionReason','apply','validateSave','installMarketContent'].map(k=>[k,P[k]]));

// A personal story parked on a menu gate that leads to the main screen has ended: close it,
// so the player is not left on the main screen with every action still locked by the story.
// Gates that lead further into the story keep the player on the story screen.
function settlePersonalGate(r){
 const s=r.s,g=s.global;if(!s.storyContext||s.runtime||s.storyContext.kind==='COMBAT_INTERLUDE')return;
 const node=r.storyNode();if(node?.[5]!=='MENU_GATE')return;
 if(!String(node[13]||'').startsWith('SCREEN:')){g.SCREEN_MODE='STORY';return;}
 const receipts=readJSON(g.STORY_NODE_EFFECTS_JSON),key=g.STORY_ROUTE_ID+':'+node[4];
 if(!receipts[key]&&!receipts[node[4]]){r.storyApplyEffects(node[12],node);receipts[key]=true;g.STORY_NODE_EFFECTS_JSON=JSON.stringify(receipts);}
 g.PENDING_CHOICE_GROUP_ID='';g.PENDING_INPUT_JSON='{}';r.storyReturn();
}
P.prepareStory=function(){old.prepareStory.call(this);settlePersonalGate(this);};

P.defeatLockRemaining=function(now=Date.now()){const p=this.s.defeatPenalty;return p?Math.max(0,p.until-now):0;};
P.finishBattle=function(victory){
 const battle=this.s.runtime,origin=battle?.origin||'',result=old.finishBattle.call(this,victory),g=this.s.global;
 if(!battle)return result;
 const settled=readJSON(g.LAST_BATTLE_RESULT_JSON);
 if(victory){
  // Companions carried the fight: the protagonist gets back up instead of being treated as a wipe.
  if(g.PLAYER_HP_CURRENT<=0){g.PLAYER_HP_CURRENT=Math.max(1,Math.ceil(g.PLAYER_HP_MAX*CONFIG.reviveHpRate));this.s.playerStatuses=[];settled.protagonistRevived=g.PLAYER_HP_CURRENT;}
 }else{
  const mora=Math.floor(Math.max(0,Number(g.MORA)||0)*CONFIG.defeatMoraRate);g.MORA-=mora;
  this.s.defeatPenalty={version:1,battle:String(battle.id),mora,until:Date.now()+CONFIG.defeatLockMs,story:origin.startsWith('STORY:')};
  settled.defeatPenalty={mora,seconds:CONFIG.defeatLockMs/1000};
 }
 if(settled.protagonistRevived||settled.defeatPenalty){g.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);for(let i=this.s.log.length-1;i>=0;i--)if(this.s.log[i]?.id===settled.id){Object.assign(this.s.log[i],JSON.parse(JSON.stringify({protagonistRevived:settled.protagonistRevived,defeatPenalty:settled.defeatPenalty})));break;}}
 return result;
};
P.actionReason=function(type,a={}){
 const left=this.defeatLockRemaining();
 if(left>0&&type!=='MENU')return '전투에서 패배해 정신을 차리는 중입니다 · '+Math.ceil(left/1000)+'초 남음';
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 const penalty=this.s.defeatPenalty;
 if(a.type==='STORY_RETRY'&&penalty){
  // Retrying restores the pre-battle checkpoint; the Mora lost to the defeat stays lost.
  const result=old.apply.call(this,a);this.s.global.MORA=Math.max(0,this.s.global.MORA-penalty.mora);delete this.s.defeatPenalty;return {...result,defeatPenalty:{mora:penalty.mora}};
 }
 const result=old.apply.call(this,a);
 if(this.s.defeatPenalty&&['RECOVER','REST','PREP_LEAVE'].includes(a.type)&&!this.defeatLockRemaining())delete this.s.defeatPenalty;
 return result;
};

// Enemies used to hit the lowest-HP ally every time, locking onto whoever was hurt first.
// Now the first target is a weighted random pick: wounded allies are a little likelier,
// the one it just hit is less likely. Taunts, decoys and scripted bosses still run inside.
P.aiTurn=function(a,targets){
 const alive=Array.isArray(targets)?targets.filter(t=>t&&t.hp>0):[];
 if(a?.side!=='ENEMY'||alive.length<2||(a.statuses||[]).some(s=>/TAUNT/.test(s.id)))return old.aiTurn.call(this,a,targets);
 const weight=t=>(1+CONFIG.woundedTargetBonus*(1-Math.max(0,t.hp)/Math.max(1,t.maxHp)))*(t.id===a.lastTargetId?CONFIG.repeatTargetWeight:1);
 let roll=this.random()*alive.reduce((n,t)=>n+weight(t),0),pick=alive[alive.length-1];
 for(const t of alive){roll-=weight(t);if(roll<0){pick=t;break;}}
 a.lastTargetId=pick.id;
 return old.aiTurn.call(this,a,[pick,...targets.filter(t=>t!==pick)]);
};

// Player-facing wording for rows whose sheet text was written for designers, not players.
const TEXT={
 '16_EQUIP_DB':{
  EQ_SPECIAL_FIELD_PACK:{'기타 보조 스탯':'전투 도구 +1종','고유 효과':'파티원 중 한 명만 메고 있어도 전투 전에 준비할 수 있는 전투 도구가 2종에서 3종으로 늘어납니다. 음식과 일반 소모품은 여전히 전투 중에 쓸 수 없습니다.'},
  EQ_CRPG_PADDED_VEST:{'장비명':'누빔 두건','비고':'천을 여러 겹 누벼 만든 입문용 두건. 상위 방어구로 바꾸기 전까지 쓰기 좋습니다.'}
 },
 '19_SHOP_STOCK_DB':{STK_CRPG_V011_MOND_EQUIP_EQ_CRPG_PADDED_VEST:{4:'누빔 두건'}}
};
api.playFixText=JSON.parse(JSON.stringify(TEXT));
P.installMarketContent=function(...args){
 const out=old.installMarketContent.apply(this,args);if(this._playFixTextInstalled)return out;
 const db={...this.db};
 for(const [table,rows]of Object.entries(TEXT)){
  if(!db[table])continue;const copy=db[table].map(r=>Array.isArray(r)?r.slice():r),head=copy[0];
  for(const [id,changes]of Object.entries(rows)){const row=copy.find((r,i)=>i>0&&r?.[0]===id);if(!row)continue;for(const [column,value]of Object.entries(changes)){const i=/^\d+$/.test(column)?Number(column):head.indexOf(column);if(i>=0)row[i]=value;}}
  db[table]=copy;this.tables[table]=new Map(copy.slice(1).filter(r=>r?.[0]).map(r=>[r[0],r]));
 }
 this.db=db;this._playFixTextInstalled=true;return out;
};

P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s;
 const p=out.defeatPenalty;
 if(p!==undefined&&(p?.version!==1||typeof p.battle!=='string'||!Number.isSafeInteger(p.mora)||p.mora<0||!Number.isSafeInteger(p.until)||p.until<0||typeof p.story!=='boolean'))fail('DEFEAT_SAVE','전투 패배 기록을 확인할 수 없습니다.');
 // Saves made while stuck on a finished personal story's gate open normally now.
 if(out.storyContext&&!out.runtime&&out.storyContext.kind!=='COMBAT_INTERLUDE'){const facade=Object.create(this);facade.s=out;if(facade.storyNode()?.[5]==='MENU_GATE')settlePersonalGate(facade);}
 return out;
};
P.playFixesVersion=CONFIG.version;api.playFixesVersion=CONFIG.version;
})(globalThis);
