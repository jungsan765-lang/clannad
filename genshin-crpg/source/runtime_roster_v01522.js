/* Story acquaintances and owned playable companions are distinct. Existing ownership survives migration. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['unlockCharacter','wishGrant','newGame','validateSave','storyCompleteLegend','apply','personal','adminApply','storySetCompanion','recruitmentEntries'].map(k=>[k,P[k]]));
P.unlockCharacter=function(id){
 this.row('07_CHAR_DB',id);if(this.premiumOwns(id)||this._wishJoining||this._adminJoining||this.serverAdmin===true)return old.unlockCharacter.call(this,id);
 (this.s.narrativeCompanions??={})[id]=true;const owned=JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}');owned[id]={...owned[id],state:'ELIGIBLE',event:this.s.global.CURRENT_STORY_NODE_ID};this.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);return {acquaintance:id};
};
P.storySetCompanion=function(id,state){if(state==='JOINED'&&!this.premiumOwns(id)&&!this._wishJoining&&!this._adminJoining&&this.serverAdmin!==true){(this.s.narrativeCompanions??={})[id]=true;state='ELIGIBLE';}return old.storySetCompanion.call(this,id,state);};
P.recruitmentEntries=function(){return old.recruitmentEntries.call(this).map(e=>this.recruitEventOnly?.(e.character)?e:({...e,method:'캐릭터 소유: 기원 · 개인 임무 첫 완료: 영웅의 경험 5개, 만남의 인연 2개, 호감도 10',requirements:e.definition?this.legendRequirements(e.definition):e.requirements}));};
P.wishGrant=function(r){if(r.kind!=='char'||this.premiumOwns(r.id))return old.wishGrant.call(this,r);this._wishJoining=true;try{this.unlockCharacter(r.id);}finally{delete this._wishJoining;}const level=Math.max(1,this.s.global.PLAYER_LEVEL_STATE-5);Object.assign(this.s.chars[r.id],{level,xp:0});(this.s.ascensions??={})[r.id]=api.growthV01522.phaseFor(level);this.s.chars[r.id].hp=this.character(r.id).maxHp;(this.s.wishOwned??={})[r.id]=true;return {...r,joined:true,stella:false,level};};
P.adminApply=function(op){this._adminJoining=true;try{return old.adminApply.call(this,op);}finally{delete this._adminJoining;}};
P.storyCompleteLegend=function(id){const before=this.storyDone(id),out=old.storyCompleteLegend.call(this,id);if(!before&&this.storyDone(id)&&!this.s.legendGrowthRewards?.[id]){(this.s.legendGrowthRewards??={})[id]=true;this.giveItem('MAT_CHAR_EXP_HERO',5);this.s.global.ACQUAINT_FATE=(this.s.global.ACQUAINT_FATE||0)+2;}return out;};
function preserve(r,owned,mayJoin=false){const e=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');if(!mayJoin)for(const [id,v]of Object.entries(e))if(v.state==='JOINED'&&!owned.includes(id)){v.state='ELIGIBLE';const p=r.rows('04_CHAR_DB').find(p=>p[1]===id)?.[0];if(p&&r.s.relations[p])r.s.relations[p].companion='ELIGIBLE';(r.s.narrativeCompanions??={})[id]=true;}for(const id of owned)if(id!=='PLAYER_CUSTOM'){e[id]={...e[id],state:'JOINED'};const profile=r.rows('04_CHAR_DB').find(p=>p[1]===id)?.[0];if(profile&&r.s.relations[profile])r.s.relations[profile].companion='JOINED';}r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(e);}
P.apply=function(a){const owned=this.premiumFighters(),out=old.apply.call(this,a);preserve(this,owned,a.type==='WISH'||a.type==='OPERATOR_DEBUG');return out;};
P.personal=function(...a){const owned=this.premiumFighters(),out=old.personal.apply(this,a);preserve(this,owned);return out;};
P.newGame=function(o){old.newGame.call(this,o);this.s.rosterVersion=1;this.s.global.ACQUAINT_FATE=(this.s.global.ACQUAINT_FATE||0)+20;return copy(this.s);};
P.validateSave=function(s){if(s.rosterVersion===undefined)s.rosterVersion=1;if(s.rosterVersion!==1)throw new api.RuleError('ROSTER_SAVE','동료 소유 기록을 확인해 주세요.');return old.validateSave.call(this,s);};
api.rosterV01522=true;
})(globalThis);
