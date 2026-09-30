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
  setText(first,edit.opening);if(last!==first)setText(last,edit.beat||edit.closing);if(last!==first)setText(last,edit.closing);if(spoken&&edit.beat)setText(spoken,edit.beat);
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

/* Main story manuscript 001.01, v0.14.6. Fictional adaptation, not official dialogue.
 * Text is isolated from node metadata. No rewards, flags, save layout or network rules change.
 * The original 001.02 exit and all older cursor IDs remain addressable. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,previous=P.storyIndex;
const ROUTE='ROUTE_ISEKAI',TABLE='55_MAIN_STORY_DB';
const SCENE=[{"id":"ISK_L03_K2_019","speaker":"이야기","profile":null,"text":"의례장 입구를 지나자 각청이 걸음을 늦췄다. 짐꾼을 두고 갔던 자리 앞에서 멈춰 서자, 재촉하는 대신 옆으로 다가와 같은 곳을 살폈다. 사람들 사이로 드러난 돌바닥에는 아무도 쓰러져 있지 않았다.\n안쪽을 가리키자 그녀의 시선도 따라 움직였다. 모락스의 거대한 몸이 놓여 있어야 할 자리마저 비어 있었다. 각청은 그곳과 내 얼굴을 번갈아 보더니, 가까이 있던 병사를 손짓으로 불렀다.","type":"NARRATION"},{"id":"R39_PROSE_ISK_L03_K2_020","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"여기도 없어…… 저 안에 쓰러져 있었거든. 저만한 걸 옮겼으면 누가 봤을 거 아냐. 응광이 다른 데로 옮기라고 했어?","type":"DIALOGUE"},{"id":"ISK_L03_K2_021","speaker":"현장 병사","profile":null,"text":"응광 님의 지시로 확인했습니다만, 옮기라는 명령도 인계받았다는 곳도 찾지 못했습니다. 여기 남아 있는 사람들도 본 적이 없다고 합니다.","type":"DIALOGUE"},{"id":"V146_M00101_001","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"지금 남아 있는 사람들한테만 물었어? 자리를 비운 사람들은?","type":"DIALOGUE"},{"id":"V146_M00101_002","speaker":"현장 병사","profile":null,"text":"아직 전부 확인하지는 못했습니다. 당시 이곳에서 일한 사람들을 찾고 있습니다.","type":"DIALOGUE"},{"id":"R39_PROSE_ISK_L03_K2_022","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"그럼 그분도 그렇게 찾고 있는 거야? 짐은 그대로 있고, 사람만 없어. 부두에서도 못 찾고, 여기까지 왔는데…… 대체 어디로 간 건데.","type":"DIALOGUE"},{"id":"ISK_L03_K2_023","speaker":"이야기","profile":null,"text":"병사가 대답을 머뭇거리자 각청은 손을 들어 그를 멈춰 세웠다. 곧바로 말을 보태지는 않았다. 자꾸 팔을 문지르는 손끝을 잠깐 내려다보더니, 시선을 맞출 수 있도록 옆으로 한 걸음 다가왔다.","type":"NARRATION"},{"id":"V146_M00101_003","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"내가 여기 두고 갔어. 조금만 더 끌었으면 됐을지도 모르는데, 결국 혼자 나왔어. 그러고 돌아와서는 어디 갔냐고 묻고 있네. 참 잘하는 짓이다, 진짜.","type":"DIALOGUE"},{"id":"ISK_L03_K2_024","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"잠깐. 난 네가 왜 혼자 돌아왔는지 따지려는 게 아니야. 마지막으로 그 사람을 본 곳을 확인하려는 거지. 네가 지금 서 있는 자리, 여기 맞아?","type":"DIALOGUE"},{"id":"R39_PROSE_ISK_L03_K2_025","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"……응. 여기. 사람들 사이에 쓰러져 있었고, 내가 이쪽으로 끌었어. 그다음에 어떻게 됐는지는 몰라. 돌아오면 같이 짐 확인하기로 했는데.","type":"DIALOGUE"},{"id":"V146_M00101_004","speaker":"이야기","profile":null,"text":"발치의 빈자리를 가리키자, 각청은 내가 짚은 곳을 집중해서 살펴보았다. 한쪽 무릎을 굽혀 바닥을 가까이 들여다보고, 몸을 끌었다는 방향으로 손을 뻗어 위치를 다시 확인했다. 그러고는 따라온 병사도 볼 수 있게 옆으로 비켜섰다.","type":"NARRATION"},{"id":"V146_M00101_005","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"부두의 검수 병사에게 사람을 보내. 남겨 둔 짐과 수레를 확인해서 주인이 누구인지 알아보고, 함께 일하던 사람들도 찾아봐. 다친 사람이 옮겨진 곳이 있는지도 확인해 줘.","type":"DIALOGUE"},{"id":"V146_M00101_006","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"이름도 제대로 못 들었어. 얼굴은 알아볼 수 있는데. 이름도 모르는 사람 찾아 달라고 이러고 있는 게……","type":"DIALOGUE"},{"id":"V146_M00101_007","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"그걸 알아내려고 검수 병사에게 묻는 거잖아. 짐을 맡아 뒀다니 일하던 곳은 알 수도 있겠지. 너는 얼굴을 본 사람이고. 서로 아는 걸 모으면 돼.","type":"DIALOGUE"},{"id":"V146_M00101_008","speaker":"이야기","profile":null,"text":"부두로 향하는 병사의 발소리가 계단 아래로 멀어졌다. 각청은 남은 병사에게 말을 건네려다 내 쪽으로 몸을 돌렸다. 무슨 말을 할지 기다리는 듯 고개를 조금 기울였지만, 대답을 재촉하지는 않았다.","type":"NARRATION"},{"id":"V146_M00101_009","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"내 말을 믿는 거야? 아까는 모락스가 떨어졌다는 얘기도 처음 듣는다고 했잖아.","type":"DIALOGUE"},{"id":"V146_M00101_010","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"그건 지금도 그래. 네가 본 일을 내가 기억해 낼 수는 없어. 하지만 일하던 사람이 보이지 않고 짐만 남아 있다잖아. 확인도 안 해 보고 네가 틀렸다고 할 이유는 없지.","type":"DIALOGUE"},{"id":"V146_M00101_011","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","text":"……찾으면 소식 좀 줘. 다쳤으면 어디로 옮겼는지도. 내가 가 볼 수 있게.","type":"DIALOGUE"},{"id":"V146_M00101_012","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"알았어. 소식이 오면 내가 알려 줄게. 아직 확인하지 못한 게 많으니까, 혼자 뛰어다니지 말고 당분간 내 옆에 있어.","type":"DIALOGUE"},{"id":"V146_M00101_013","speaker":"이야기","profile":null,"text":"각청이 먼저 의례장 안쪽으로 향했다. 조금 전 병사를 부를 때처럼 성큼 걷다가도, 뒤따르는 발소리가 늦어지자 어깨 너머로 돌아보았다. 걸음을 맞추고 나서야 현장에 남은 병사에게 다시 말을 이었다.","type":"NARRATION"},{"id":"V146_M00101_014","speaker":"각청","profile":"PROFILE_LIYUE_KEQING","text":"제군의 몸을 봤다는 사람도 계속 찾아. 저 안에서 큰 짐을 실어 낼 만한 길이 어디인지 살펴보고, 옮긴 흔적이 있으면 먼저 알려 줘.","type":"DIALOGUE"},{"id":"ISK_L03_K2_026","speaker":"이야기","profile":null,"text":"각청의 손끝이 빈자리에서 바깥으로 이어지는 길을 짚었다. 그 손끝을 따라가다, 제군의 몸이 옮겨졌던 장소가 떠올랐다. 내가 알던 이야기 속의 장소였다.\n이번에도 같은 곳에 있다는 보장은 없었다. 다만 각청이 수색을 시작한 지금, 그곳을 확인해 달라고 부탁할 수는 있었다.","type":"NARRATION"}];
const ALIASES={ISK_L03_K2_020:'R39_PROSE_ISK_L03_K2_020',ISK_L03_K2_022:'R39_PROSE_ISK_L03_K2_022',ISK_L03_K2_025:'R39_PROSE_ISK_L03_K2_025'};
const installed=new WeakSet();
P.storyIndex=function(){
 const ix=previous.call(this);if(installed.has(ix))return ix;
 const get=id=>ix.nodes.get(ROUTE+':'+id);
 const existing=SCENE.filter(s=>!s.id.startsWith('V146_'));
 // Validate all anchors before making any changes; stale source must not be silently accepted.
 for(const spec of existing){
  const row=get(spec.id);
  if(!row||row[1]!=='Q_ISK_LIYUE_03'||row[3]!=='K2_VANISHED'||row[5]!==spec.type||row[12])throw Error('Main story 001.01 anchor mismatch: '+spec.id);
 }
 for(const [id,target]of Object.entries(ALIASES)){
  const row=get(id),canonical=get(target);
  if(!row||row[1]!==canonical[1]||row[3]!==canonical[3]||row[5]!=='CHOICE'||row[12])throw Error('Main story 001.01 legacy cursor mismatch: '+id);
 }
 const end=get('ISK_L03_K2_026'),exit=end[13],all=ix.byTable[TABLE];
 if(!exit||exit.startsWith('V146_')||!Array.isArray(all))throw Error('Main story 001.01 exit mismatch');
 const templates={NARRATION:get('ISK_L03_K2_019'),PLAYER:get('R39_PROSE_ISK_L03_K2_020'),KEQING:get('ISK_L03_K2_024'),SOLDIER:get('ISK_L03_K2_021')};
 const additions=SCENE.filter(s=>s.id.startsWith('V146_')).map((s,i)=>{
  if(get(s.id))throw Error('Main story 001.01 duplicate: '+s.id);
  const key=s.type==='NARRATION'?'NARRATION':s.profile==='PLAYER_ISEKAI'?'PLAYER':s.profile==='PROFILE_LIYUE_KEQING'?'KEQING':'SOLDIER';
  const row=templates[key].slice();
  Object.assign(row,{4:s.id,5:s.type,9:s.text,10:'',12:'',14:'',17:Number(templates.NARRATION[17])+0.0001*(i+1),19:'CRPG_MAIN_STORY_001_01'});
  Object.defineProperties(row,{table:{value:TABLE},sourceRow:{value:0}});
  return row;
 });
 for(const row of additions){ix.nodes.set(ROUTE+':'+row[4],row);all.push(row);}
 for(let i=0;i<SCENE.length;i++){
  const s=SCENE[i],row=get(s.id);
  row[9]=s.text;row[10]='';row[13]=SCENE[i+1]?.id||exit;
 }
 // Single-option archives are not shown on the normal path, but old saves can resume here.
 for(const [id,target]of Object.entries(ALIASES)){
  const row=get(id),canonical=get(target);row[9]='';row[10]=canonical[9];row[13]=canonical[13];
 }
 // Narration has its own display name, including dialogue history. Spoken names stay intact.
 for(const row of ix.nodes.values())if(row[5]==='NARRATION')row[7]='이야기';
 installed.add(ix);return ix;
};
api.mainStoryManuscriptRevision='001.01-r2';
})(globalThis);
