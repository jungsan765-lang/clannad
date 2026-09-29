/* Ensemble edition: dialogue uses the normal batched reading pipeline. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGLiyueRework,E=root.CRPGLocalStory.episodes;
const previous=P.storyIndex;
C.revisionPlacements={};
const gateId=anchor=>(C.placements.some(p=>p.anchor===anchor)?'R39_FIELD_':'V141_FIELD_')+anchor;
for(const [anchor,episode]of Object.entries(E)){
 const id='v141_'+anchor;
 C.missions[id]={title:episode.title,intro:'',steps:episode.steps,locked:/^ISK_L04_.*_001$/.test(anchor)||/^ISK_L02_/.test(anchor)&&!anchor.endsWith('_001')};
 C.revisionPlacements[gateId(anchor)]={anchor,mission:id};
}
P.storyIndex=function(){
 const ix=previous.call(this);if(ix.ensemble141)return ix;
 const all=ix.byTable['55_MAIN_STORY_DB'],original=all.slice(),profiles=new Map(this.rows('04_CHAR_DB').map(r=>[r[2],r]));
 const add=(base,id,speaker,text,next,kind='DIALOGUE',group='')=>{
  const row=base.slice(),profile=profiles.get(speaker);
  Object.assign(row,{3:'V141_'+base[3],4:id,5:kind==='CHOICE'?'CHOICE':speaker?'DIALOGUE':'NARRATION',6:speaker==='나'?'PLAYER_CUSTOM':profile?.[0]||'',7:speaker==='나'?'{PLAYER_NAME}':speaker,9:kind==='CHOICE'?'':text,10:kind==='CHOICE'?text:'',11:'',12:'',13:next,14:group,15:profile?'ASSET_'+profile[4].toUpperCase()+'_'+profile[5].toUpperCase()+'_1':'NONE',17:Number(base[17])+.001,19:'CRPG_V0141_ENSEMBLE'});
  Object.defineProperties(row,{table:{value:'55_MAIN_STORY_DB'},sourceRow:{value:0}});
  if(ix.nodes.has(row[0]+':'+id))throw Error('Duplicate ensemble node '+id);
  ix.nodes.set(row[0]+':'+id,row);all.push(row);return row;
 };
 const chain=(base,prefix,lines,next)=>{
  for(let i=lines.length-1;i>=0;i--){const id=prefix+'_'+i;add(base,id,lines[i][0],lines[i][1],next);next=id;}return next;
 };
 // Replace the long port-entry scenes with authored beats. Keep every effect,
 // route choice and travel/combat gate, plus replies to actual branch choices.
 // Bypassed IDs remain valid load cursors; no save row is deleted.
 const skip=new Set(),groups=new Map();
 for(const row of original)if(row[14]){const key=row[0]+':'+row[14];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const setText=(row,text)=>{row[9]=text;row[19]=String(row[19]||'').replace(/GREETING_VARIANT_JSON=(\{.*\})/,(_,raw)=>{const d=JSON.parse(raw);d.first_text=d.reunion_text=text;return 'GREETING_VARIANT_JSON='+JSON.stringify(d);});};
 for(const edit of root.CRPGLocalStory.sceneEdits){
  const rows=original.filter(r=>r[0]==='ROUTE_ISEKAI'&&r[1]===edit.quest&&r[3]===edit.scene);
  const narr=rows.filter(r=>r[5]==='NARRATION'),first=narr[0],last=narr[narr.length-1],spoken=rows.find(r=>r[5]==='DIALOGUE'&&r[7]===edit.speaker);
  if(!first||!last)throw Error('Missing edited scene '+edit.scene);
  setText(first,edit.opening);if(last!==first)setText(last,edit.closing);if(spoken&&edit.beat)setText(spoken,edit.beat);
  const keep=new Set([first[4],last[4],spoken?.[4]]);
  for(const row of rows)if(row[5]==='CHOICE'&&(groups.get(row[0]+':'+row[14])?.length>1||row[12])){keep.add(row[4]);const reply=ix.nodes.get(row[0]+':'+row[13]);if(reply?.[5]==='DIALOGUE')keep.add(reply[4]);}
  for(const row of rows)if(['NARRATION','DIALOGUE','CHOICE'].includes(row[5])&&!keep.has(row[4])&&!row[12]&&(!row[11]||row[11]===first[11]))skip.add(row[0]+':'+row[4]);
 }
 const resolve=(route,id,seen=new Set())=>{
  const key=route+':'+id;if(seen.has(key))throw Error('Editorial loop '+id);seen.add(key);
  if(id.startsWith('CHOICE_GROUP:')){const choices=groups.get(route+':'+id.slice(13));if(choices?.length===1&&skip.has(route+':'+choices[0][4]))return resolve(route,choices[0][13],seen);return id;}
  const r=ix.nodes.get(key);return r&&skip.has(key)?resolve(route,r[13],seen):id;
 };
 for(const row of original)if(row[13])row[13]=resolve(row[0],row[13]);
 for(const [anchor,e]of Object.entries(E)){
  const id=gateId(anchor),existing=ix.nodes.get('ROUTE_ISEKAI:'+id),base=ix.nodes.get('ROUTE_ISEKAI:'+anchor);
  if(!base)throw Error('Missing story anchor '+anchor);
  const g=existing||add(base,id,'','',anchor);if(!existing)g[5]='FIELD_GATE';
  const after=chain(g,'V141_AFTER_'+anchor,e.after,g[13]);
  // An already running v1 mission still returns through the same stable gate.
  g[13]=after;
  // Dialogue-only returns do not open an empty mission or require a map detour.
  const destination=e.steps.length?id:after;let before=destination;
  if(e.choices.length){const group='V141_REPLY_'+anchor;
   e.choices.forEach(([label,reply],i)=>{const pair=reply.split('|');const response=chain(g,'V141_REPLY_'+anchor+'_'+i,[pair],destination);add(g,group+'_'+i,'나',label,response,'CHOICE',group);});
   before='CHOICE_GROUP:'+group;
  }
  before=chain(g,'V141_BEFORE_'+anchor,e.before,before);
  for(const row of original)if(row!==g&&row[0]===g[0]&&row[13]===(existing?id:anchor))row[13]=before;
 }
 // Remove editorial explanations from spoken narration; keep facts and all effects.
 // An anchor line is read before its ensemble scene, so anchors set the scene up rather than end it (0.14.3).
 const corrections={
  ISK_L01_K_016:'망서 객잔 아래, 짐을 올리던 승강기가 한쪽으로 기울어 있었다. 줄 끝에는 짐꾼이 매달려 있었고, 두 사람이 그 아래로 달려왔다.',
  ISK_L01_AA_004:'리월로 넘어가는 길목에서 수레 하나가 기울어 있었다. 바람에 휩쓸린 가림천이 수레꾼을 덮쳤고, 부서진 덧판 사이에 옷자락이 끼어 있었다. 모자를 쓴 소녀가 천 끝을 붙잡고 소리쳤다.',
  ISK_L01_AB_019:'다리를 건너 비탈길로 접어들자 아래쪽에서 다급한 목소리가 들렸다. 약초꾼 한 사람이 무너진 흙턱에 매달려 있었고, 그 위에서 누군가 줄을 풀고 있었다.',
  ISK_L03_AB1_021:'병사는 경책 산장 쪽 임시 휴식소로 옮겨졌다고 했다. 각청과 함께 그를 찾아갔다. 공연단도 같은 마당을 쓰고 있었지만, 지금 내가 찾는 것은 무대가 아니라 살아 있다는 그 사람의 얼굴이었다.',
  ISK_L04_AB1_007:'공연 전에 함께 표시한 계단과 지렛대 위치를 기억하시죠? 신염 씨가 바깥 통로를 지킨 시각과 맞춰 봤어요. 연비 씨가 그 순서대로 다시 찾아보자고 해서 무대 아래를 열었더니, 이 조각이 나왔어요. 어디에 붙어 있던 것인지는 목수분이 확인해 주셨어요.',
  ISK_L04_AB1_011:'사람들이 말한 창 공격으로는 남은 상처를 설명할 수 없어. 공연 전에 남긴 계단의 표시와 무너진 판자의 위치도 대조했어. 사람들이 널 보았다는 무대 위 자리는, 네가 구조를 시작했을 때 이미 무너져 있었어. 연비가 정리한 목격 시각도 그 순서와 맞고.',
  ISK_L03_AA2_077:'명온 마을 바깥 물가에 도착했다. 알베도는 곧장 다가가지 않고 주변부터 천천히 둘러보았다.',
  ISK_L02_AA1_062:'각청의 손이 차가워졌다. 호두는 바깥에 있었다. 아직 부를 수 있는 사람의 이름을 떠올리자 겨우 일어설 수 있었다.',
  ISK_L02_AA2_074:'천에 감긴 구슬을 쥐었다. 풀어 볼 용기도, 이것이 무언가를 바꿔 줄 거라는 믿음도 나지 않았다. 호두가 기다리는 곳으로 가야 했다.',
  ISK_L02_AB1_083:'아무 일도 일어나지 않았다. 구슬을 다시 감싸 넣는 동안 손이 자꾸 미끄러졌다. 가방을 닫자 방금까지 참았던 소리가 목에서 터졌다.',
  ISK_L03_AB2_075:'창고는 층암거연의 광석 적재장 안쪽에 있었다. 창마다 널빤지가 대어졌지만 작은 통풍구는 열려 있었다. 다이루크는 젖은 바퀴 자국을 살피며 문에서 한 발 비켰다.',
  ISK_L03_AB1_127:'신염 씨, 문 안쪽 좀 비춰 주시겠어요? 연비 씨가 돌아오면 세 사람이 본 걸 따로 전해 드려요. 오늘 있었던 일을 노래로 옮기는 건… 아직 생각하고 싶지 않네요.',
  ISK_L04_AB1_121:'도시로 들어가는 길이 열렸다는 소식이 돌았다. 운근은 바로 떠나지 않고 무너진 무대 옆에 남았다.',
  ISK_L04_AB2_115:'봉쇄선이 걷혔다. 각청은 새로 열린 길을 확인하러 갔고, 나는 다이루크와 부두의 약속 장소로 향했다.'
 };
 for(const [id,text]of Object.entries(corrections)){const r=ix.nodes.get('ROUTE_ISEKAI:'+id);if(!r)throw Error('Missing editorial node '+id);r[9]=text;}
 // Old archive-only rows remain addressable for old saves; no IDs or effects removed.
 Object.defineProperty(ix,'ensemble141',{value:true});return ix;
};
api.ensembleEdition={version:1,episodes:Object.keys(E).length};
})(globalThis);
