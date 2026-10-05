/* Main story manuscript edition (K route and traveler route): authored scenes replace the port-entry prose
   while every effect, event, gate and route choice of the original rows stays in place. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,M=root.CRPGMainStoryK;
if(!M||!root.CRPGLocalStory){api.mainStoryEdition={version:0,chains:[]};return;}
const previous=P.storyIndex,TABLE='55_MAIN_STORY_DB',NOTE='CRPG_V0148_MAIN_STORY_K';
const TRANSPARENT=/^(V141_|R39_FIELD_)/;
// Chains are named after their route: TRV_* rows belong to the traveler route, everything else to the isekai route.
const routeOf=id=>/^TRV_/.test(id)?'ROUTE_TRAVELER':'ROUTE_ISEKAI';
const PLAYER_REF={ROUTE_ISEKAI:'PLAYER_ISEKAI',ROUTE_TRAVELER:'PLAYER_TRAVELER'};
P.storyIndex=function(){
 const ix=previous.call(this);if(ix.mainStoryK)return ix;
 const report={installed:[],failed:[]};
 const all=ix.byTable[TABLE],nodes=ix.nodes;
 const charRefs=new Map(this.rows('04_CHAR_DB').map(r=>[r[2],r[0]]));
 const contexts=new Map();
 const contextOf=ROUTE=>{
  if(contexts.has(ROUTE))return contexts.get(ROUTE);
  const get=id=>nodes.get(ROUTE+':'+id);
  const refs=new Map(charRefs);
  for(const r of all)if(r[0]===ROUTE&&r[7]&&r[6]&&r[7]!=='{PLAYER_NAME}')refs.set(r[7],r[6]);
  const groups=()=>{const g=new Map();for(const r of all)if(r[0]===ROUTE&&r[14]){if(!g.has(r[14]))g.set(r[14],[]);g.get(r[14]).push(r);}return g;};
  const condGroups=new Set();for(const r of all)if(r[0]===ROUTE&&String(r[13]||'').startsWith('CONDITION_GROUP:'))condGroups.add(r[13].slice(16));
  const isCondMember=r=>r[5]!=='CHOICE'&&r[14]&&condGroups.has(r[14]);
  const origNext=new Map();for(const r of all)if(r[0]===ROUTE)origNext.set(r[4],r[13]);
  const origGroups=groups();
  const ctx={ROUTE,get,refs,groups,isCondMember,origNext,origGroups};contexts.set(ROUTE,ctx);return ctx;
 };
 for(const chain of M.chains){
  const {ROUTE,get,refs,groups,isCondMember,origNext,origGroups}=contextOf(routeOf(chain.id));
  try{
   // reach(): rows of the original graph behind an entry. Frozen choice options (??=) are not
   // followed, and stopAt rows are counted but not expanded.
   const reach=(entry,frozen=new Set(),stopAt=new Set())=>{const seen=new Set(),stack=[].concat(entry);while(stack.length){const id=stack.pop();if(!id||id.startsWith('SCREEN:'))continue;if(id.startsWith('CHOICE_GROUP:')){for(const c of origGroups.get(id.slice(13))||[])if(!frozen.has(c[4]))stack.push(c[4]);continue;}if(id.startsWith('CONDITION_GROUP:')){for(const c of origGroups.get(id.slice(16))||[])stack.push(c[4]);continue;}if(seen.has(id)||!get(id))continue;seen.add(id);const row=get(id);if(!stopAt.has(id)&&row[5]!=='STORY_PAUSE'&&row[5]!=='CHAPTER_END')stack.push(origNext.get(id));}return seen;};
   // Rows reached through a FIELD_GATE anchor (ensemble chain and gate) stay as a unit.
   const tails=row=>{const set=new Set([row[4]]),out=[],stack=[row];while(stack.length){const r=stack.pop();const n=r[13];if(n&&n.startsWith('CHOICE_GROUP:')&&n.slice(13).startsWith('V141_')){for(const c of origGroups.get(n.slice(13))||[]){set.add(c[4]);stack.push(c);}continue;}const t=n&&get(n);if(t&&TRANSPARENT.test(n)&&!set.has(n)){set.add(n);stack.push(t);}else out.push(r);}return out;};
   const entry=get(chain.entry);if(!entry)throw Error('missing entry '+chain.entry);
   // Resolve every reference before mutating anything.
   const keeps=new Set(),frozen=new Set(),newIds=[],gotos=[];
   const freeze=items=>{for(const it of items)if(it.k==='choice')for(const o of it.options){if(o.freeze){const c=get(o.freeze);if(!c||c[5]!=='CHOICE')throw Error('missing frozen choice '+o.freeze);frozen.add(o.freeze);}else freeze(o.items);}};
   freeze(chain.items);
   const old=reach(chain.entry,frozen);
   for(const id of frozen)if(!old.has(id)&&!reach(chain.entry).has(id))throw Error('frozen choice not in this chain: '+id);
   const check=items=>{for(const it of items){
    if(it.k==='keep'){if(!get(it.id))throw Error('missing node '+it.id);if(get(it.id)[5]==='CHOICE')throw Error('use ??@ for choice '+it.id);if(it.as&&get(it.id)[5]!=='INPUT_TEXT')throw Error('only an INPUT_TEXT row can be kept as 이야기: '+it.id);if(keeps.has(it.id))throw Error('node kept twice '+it.id);keeps.add(it.id);}
    else if(it.k==='line'){if(get(it.id))throw Error('duplicate node '+it.id);if(it.speaker&&it.speaker!=='나'&&it.alt&&!refs.get(it.speaker))throw Error('no profile for '+it.speaker);newIds.push(it.id);if(it.alt)newIds.push(it.alt.id);}
    else if(it.k==='choice'){if(!it.options.length)throw Error('empty choice');const gids=new Set(it.options.filter(o=>o.keep||o.freeze).map(o=>get(o.keep||o.freeze)?.[14]));if(gids.size>1)throw Error('one ?? block mixes choice groups: '+[...gids].join(','));const cond=it.options.some(o=>o.keep&&get(o.keep)&&isCondMember(get(o.keep)));for(const o of it.options){if(o.freeze){if(cond)throw Error('a condition branch cannot freeze '+o.freeze);continue;}if(o.keep){const c=get(o.keep);if(!c||(c[5]!=='CHOICE'&&!isCondMember(c)))throw Error('missing choice '+o.keep);if(cond!==isCondMember(c))throw Error('one ?? block mixes a choice group and a condition group: '+o.keep);if(keeps.has(o.keep))throw Error('node kept twice '+o.keep);keeps.add(o.keep);}else{if(cond)throw Error('a condition branch takes only ??@ members');newIds.push(o.id);}check(o.items);}if(cond){const g=get(it.options[0].keep)[14],members=(origGroups.get(g)||[]).map(r=>r[4]);for(const m of members)if(!it.options.some(o=>o.keep===m))throw Error('condition branch '+g+' must list '+m);}}
    else if(it.k==='thru'){if(!keeps.has(it.id))throw Error('@thru before @keep '+it.id);}
    else if(it.k==='goto'){if(!get(it.id))throw Error('missing node '+it.id);gotos.push(it.id);}
    else if(it.k==='combat'){if(get(it.id))throw Error('duplicate node '+it.id);if(!this.tables['33_ENCOUNTER_GROUP_DB']?.get(it.group))throw Error('unknown encounter group '+it.group);newIds.push(it.id);}
    else throw Error('unknown item '+it.k);}};
   check(chain.items);
   for(const id of gotos)if(!keeps.has(id))throw Error('@goto target must be kept in this chain: '+id);
   for(const e of chain.edits)if(!get(e.id))throw Error('missing edit target '+e.id);
   for(const id of old){const r=get(id);if(r[12]&&!keeps.has(id)&&!TRANSPARENT.test(id))throw Error('row with effects not kept: '+id);}
   // A frozen branch that flows back into this chain's rows must do so through a kept row.
   if(frozen.size){const shared=reach([...frozen].map(id=>origNext.get(id)),new Set(),keeps);for(const id of shared)if(old.has(id)&&!keeps.has(id)&&!TRANSPARENT.test(id))throw Error('row shared with a frozen branch must be kept: '+id);}
   // Choice rows that a later event checks as a receipt (treatment consent, reward acceptance) must stay too.
   for(const e of this.storyEventDefinitions()){let p;try{p=JSON.parse(e.EXEC_PAYLOAD_JSON||'{}');}catch(_){continue;}for(const id of [p.consent_node,...(p.consent_choice_candidates||[]),...(p.reward_acceptance_choice_candidates||[])])if(id&&old.has(id)&&!keeps.has(id))throw Error('receipt choice not kept: '+id);}
   // Base attributes for new rows: the most common precondition of the old prose rows.
   const count=new Map();for(const id of old){const r=get(id);if(['NARRATION','DIALOGUE'].includes(r[5])&&r[11])count.set(r[11],(count.get(r[11])||0)+1);}
   const pre=chain.pre!==undefined?chain.pre:([...count.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||entry[11]);
   let order=Number(entry[17])||0;
   const make=(id,type,speaker,text,label,group,map,scene,cond)=>{
    const row=entry.slice();const player=speaker==='나';
    Object.assign(row,{3:'PRO_'+scene,4:id,5:type,6:player?PLAYER_REF[ROUTE]:speaker?refs.get(speaker)||'':null,7:player?'{PLAYER_NAME}':speaker||null,8:map,9:type==='CHOICE'?null:text,10:type==='CHOICE'?label:null,11:cond?(pre?pre+' AND '+cond:cond):pre,12:'',13:'',14:group||null,15:null,17:order+=0.001,19:NOTE});
    Object.defineProperties(row,{table:{value:TABLE},sourceRow:{value:0}});
    nodes.set(ROUTE+':'+id,row);all.push(row);return row;
   };
   // Edits first, so transparent chains are followed in their edited shape.
   for(const e of chain.edits){const r=get(e.id);if(e.k==='text')r[9]=e.text;else if(e.k==='drop'){for(const x of all)if(x[0]===ROUTE&&x[13]===e.id)x[13]=r[13];}}
   let map=entry[8];
   // wire(): returns {entry, setters} where setters assign the NEXT of every open tail.
   const wire=(items,scene)=>{
    let first=null,open=[];
    const link=id=>{for(const f of open)f(id);open=[];if(first===null)first=id;};
    for(const it of items){
     if(it.k==='keep'){
      const r=get(it.id);if(it.as)r[5]=it.as;if(it.text!=null&&r[5]!=='CHOICE')r[9]=it.text;if(r[8])map=r[8];
      link(it.id);
      if(r[5]==='STORY_PAUSE'||r[5]==='CHAPTER_END'||r[13]==='SCREEN:CRPG_MAIN'){open=[];continue;}
      if(it.hold){open=[id=>{r[13]=id;}];continue;}
      open=tails(r).map(t=>id=>{t[13]=id;});
     }else if(it.k==='goto'){link(it.id);open=[];
     }else if(it.k==='thru'){
      const n=origNext.get(it.id);if(!n||!TRANSPARENT.test(n))throw Error('@thru needs an ensemble row after '+it.id);
      link(n);open=tails(get(n)).map(t=>id=>{t[13]=id;});
     }else if(it.k==='line'){
      const m=it.map||map,type=it.speaker?'DIALOGUE':'NARRATION';
      const extra=it.cond?' AND '+it.cond:'';
      if(it.alt){const profile=refs.get(it.speaker);const a=make(it.alt.id,type,it.speaker,it.alt.text,null,null,m,scene,'BOND('+profile+')>=60'+extra),b=make(it.id,type,it.speaker,it.text,null,null,m,scene,'BOND('+profile+')<60'+extra);a[13]=b[4];link(a[4]);open=[id=>{b[13]=id;}];}
      else{const r=make(it.id,type,it.speaker,it.text,null,null,m,scene,it.cond);link(r[4]);open=[id=>{r[13]=id;}];}
     }else if(it.k==='combat'){
      const r=make(it.id,'COMBAT_GATE','',it.text,null,null,it.map||map,scene,it.cond);r[12]='START_FIXED_COMBAT:'+it.group+';ON_DEFEAT:RETRY_SAME_NODE';link(r[4]);open=[id=>{r[13]=id;}];
     }else if(it.k==='choice'){
      let group=it.group;const kept=it.options.find(o=>o.keep||o.freeze);if(kept)group=get(kept.keep||kept.freeze)[14];
      const cond=!!(kept&&kept.keep&&isCondMember(get(kept.keep)));
      link((cond?'CONDITION_GROUP:':'CHOICE_GROUP:')+group);const next=[];
      for(const o of it.options){
       if(o.freeze)continue;
       let c;if(o.keep){c=get(o.keep);if(o.label){if(c[5]==='CHOICE')c[10]=o.label;else c[9]=o.label;}}else c=make(o.id,'CHOICE','나',null,o.label,group,map,scene);
       const sub=wire(o.items,scene);
       if(sub.first)c[13]=sub.first;else sub.open.push(id=>{c[13]=id;});
       next.push(...sub.open);
      }
      open=next;
     }
    }
    return {first,open};
   };
   const result=wire(chain.items,chain.id.replace(/^ISK_/,''));
   if(result.open.length)throw Error('chain '+chain.id+' does not end at a story pause');
   // Old rows that were bypassed still load as save cursors and continue at the next kept node.
   const current=groups();
   const forward=id=>{const seen=new Set();while(id&&!seen.has(id)){seen.add(id);if(id.startsWith('SCREEN:'))return id;if(id.startsWith('CHOICE_GROUP:')){const opts=origGroups.get(id.slice(13))||[];if(opts.some(c=>keeps.has(c[4])))return id;id=opts[0]?.[13];continue;}if(id.startsWith('CONDITION_GROUP:')){const opts=origGroups.get(id.slice(16))||[];if(opts.some(c=>keeps.has(c[4])))return id;id=opts[0]?.[4];continue;}if(keeps.has(id))return id;id=origNext.get(id);}return null;};
   for(const id of old){if(keeps.has(id)||TRANSPARENT.test(id))continue;const r=get(id);const target=forward(origNext.get(id));if(target)r[13]=target;}
   report.installed.push({chain:chain.id,kept:keeps.size,added:newIds.length,frozen:frozen.size});
  }catch(e){report.failed.push({chain:chain.id,error:e.message});console.error('[main story K] '+chain.id+': '+e.message);}
 }
 Object.defineProperty(ix,'mainStoryK',{value:report});return ix;
};
api.mainStoryEdition={version:M.version,chains:M.chains.map(c=>c.id)};
})(globalThis);
