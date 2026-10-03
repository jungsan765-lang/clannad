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

/* Main story manuscript 002.01, v0.14.6. Display-text revision only.
 * Source: the K common farewell archive. It precedes the 001.01 trial chronologically.
 * No node, branch, condition, reward, event, travel or save contract is changed. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,previous=P.storyIndex;
const ROUTE='ROUTE_ISEKAI',QUEST='Q_ISK_LIYUE_01';
const SCENE=[{"id":"ISK_L01_K_002","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"잠깐만요. 가방끈이 뒤집혔군요. 그대로 걸으면 어깨가 쓸릴 겁니다. 내려 보시겠어요?"},{"id":"R39_PROSE_ISK_L01_K_003","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","type":"DIALOGUE","text":"출발도 전에 들켰네요. 부탁드릴게요."},{"id":"ISK_L01_K_004","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"이쪽을 잡아 주세요. 안에 든 천을 받치면 낫겠어요. 먼 길을 갈 때는 이런 불편부터 고쳐야 하니까요."},{"id":"ISK_L01_K_005","speaker":"이야기","profile":null,"type":"NARRATION","text":"진은 천을 접어 끈 아래에 받친 뒤, 다시 멘 가방이 기울지 않는지 살폈다."},{"id":"R39_PROSE_ISK_L01_K_006","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","type":"DIALOGUE","text":"훨씬 낫네요. 고맙습니다, 진 단장."},{"id":"ISK_L01_K_007","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"다행이네요. 가다가 다시 불편해지면 바로 고치세요. 리월에 도착하면 편지도 부탁드려요. 무사히 도착했는지 궁금할 테니까요."},{"id":"R39_PROSE_ISK_L01_K_008","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","type":"DIALOGUE","text":"맛있는 것만 먹었다고 써도 되죠?"},{"id":"ISK_L01_K_009","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"그런 소식이라면 기쁘게 읽겠습니다. 다만 음식 이야기 전에 잘 도착했다는 말부터 써 주세요. 기다리는 사람이 안심할 수 있게요."},{"id":"ISK_L01_K_010","speaker":"이야기","profile":null,"type":"NARRATION","text":"발길을 떼려다, 죽어 있던 드발린의 모습이 떠올라 멈칫했다."},{"id":"R39_PROSE_ISK_L01_K_011","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","type":"DIALOGUE","text":"진 단장, 드발린이 죽어 있었던 일도 기록에 남겨 주세요. 제가 잘못 본 게 아니니까요."},{"id":"ISK_L01_K_012","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"물론입니다. 저도 그 자리에 있었어요. 죽어 있었던 일과 다시 살아난 일, 둘 다 남기겠습니다. 이유를 모르겠다고 목격한 사실까지 지울 수는 없죠."},{"id":"R39_PROSE_ISK_L01_K_013","speaker":"{PLAYER_NAME}","profile":"PLAYER_ISEKAI","type":"DIALOGUE","text":"……그 말을 듣고 싶었어요. 그럼 다녀오겠습니다."},{"id":"ISK_L01_K_014","speaker":"진","profile":"PROFILE_MOND_JEAN","type":"DIALOGUE","text":"필요하면 제게 연락하세요. 몬드에서 함께 겪은 일은 제가 증언하겠습니다. 오늘은 도착해서 쉴 곳부터 찾으시고요. 편지 기다릴게요."},{"id":"ISK_L01_K_015","speaker":"이야기","profile":null,"type":"NARRATION","text":"진은 손을 들어 배웅한 뒤, 기다리던 기사의 보고를 받으며 성안으로 돌아갔다."}];
const installed=new WeakSet();
P.storyIndex=function(){
 const ix=previous.call(this);if(installed.has(ix))return ix;
 const changes=[];
 // Gather and validate the complete scope before mutating any display field.
 for(const spec of SCENE){
  const row=ix.nodes.get(ROUTE+':'+spec.id);
  if(!row||row[0]!==ROUTE||row[1]!==QUEST||row[4]!==spec.id||row[5]!==spec.type)
   throw Error('Main story 002.01 anchor mismatch: '+spec.id);
  changes.push({row,spec,legacy:false});
  if(spec.id.startsWith('R39_PROSE_')){
   const legacy=ix.nodes.get(ROUTE+':'+spec.id.slice(10));
   if(legacy){
    if(legacy[0]!==ROUTE||legacy[1]!==QUEST||legacy[5]!=='CHOICE')
     throw Error('Main story 002.01 legacy cursor mismatch: '+spec.id);
    changes.push({row:legacy,spec,legacy:true});
   }
  }
 }
 for(const {row,spec,legacy}of changes){
  if(legacy){row[10]=spec.text;if(row[9])row[9]=spec.text;}
  else {row[9]=spec.text;if(spec.type==='NARRATION')row[7]='이야기';}
 }
 installed.add(ix);return ix;
};
api.mainStoryEntryRevision='002.01-r2';
})(globalThis);

/* Main story manuscript 001.01, v0.14.6. Fictional adaptation, not official dialogue.
 * Text is isolated from node metadata. No rewards, flags, save layout or network rules change.
 * The original 001.02 exit and all older cursor IDs remain addressable. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,previous=P.storyIndex;
const ROUTE='ROUTE_ISEKAI',TABLE='55_MAIN_STORY_DB';
const SCENE=[{"id": "ISK_L03_K2_019", "speaker": "이야기", "profile": null, "text": "짐꾼도, 모락스의 거대한 몸도 보이지 않았다. 빈자리를 보자 숨이 턱 막혔다.", "type": "NARRATION"}, {"id": "R39_PROSE_ISK_L03_K2_020", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "...없어? 분명히 저기에 있었잖아. 누가 옮긴 거야?!", "type": "DIALOGUE"}, {"id": "ISK_L03_K2_021", "speaker": "현장 병사", "profile": null, "text": "옮기라는 명령도, 인계받은 곳도 찾지 못했습니다. 여기 남은 사람들도 본 적이 없다고 합니다.", "type": "DIALOGUE"}, {"id": "V146_M00101_001", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "남아 있는 사람들만 물어본 거야? 그날 일하고 돌아간 사람들도 찾아봐.", "type": "DIALOGUE"}, {"id": "V146_M00101_002", "speaker": "현장 병사", "profile": null, "text": "아직 확인 중입니다. 알아내는 대로 보고드리겠습니다.", "type": "DIALOGUE"}, {"id": "R39_PROSE_ISK_L03_K2_022", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "그 짐꾼도... 없어. 부두엔 짐만 남아 있고. 여기엔 있을 줄 알았는데...", "type": "DIALOGUE"}, {"id": "ISK_L03_K2_023", "speaker": "이야기", "profile": null, "text": "짐꾼을 끌어안았던 팔이 떨렸다. 각청이 병사에게 잠시 기다리라는 손짓을 했다.", "type": "NARRATION"}, {"id": "V146_M00101_003", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "내가... 그 사람을 여기 두고 갔어. 조금만 더 끌어 봤으면 됐을지도 모르는데...", "type": "DIALOGUE"}, {"id": "ISK_L03_K2_024", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "그건 아직 모르는 일이잖아. 어디까지 옮겼는지 보여 줘. 거기서부터 찾아보자.", "type": "DIALOGUE"}, {"id": "R39_PROSE_ISK_L03_K2_025", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "...여기. 돌아오면 같이 짐 확인하자고 했는데...", "type": "DIALOGUE"}, {"id": "V146_M00101_004", "speaker": "이야기", "profile": null, "text": "발치를 가리키자 각청이 몸을 낮춰 살폈다. 끌고 왔다는 방향까지 확인하고 병사를 불렀다.", "type": "NARRATION"}, {"id": "V146_M00101_005", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "부두의 검수 병사에게 사람을 보내. 맡겨 둔 짐으로 신원을 알아보고, 함께 일한 사람들도 찾아. 부상자를 옮긴 곳도 확인해 줘.", "type": "DIALOGUE"}, {"id": "V146_M00101_006", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "이름도... 못 들었어. 얼굴은 알아. 보면 알아볼 수 있어.", "type": "DIALOGUE"}, {"id": "V146_M00101_007", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "그럼 넌 얼굴을 확인해 줘. 이름은 검수 병사에게 물어보면 되잖아. 찾을 방법이 없는 건 아니야.", "type": "DIALOGUE"}, {"id": "V146_M00101_008", "speaker": "이야기", "profile": null, "text": "병사를 보낸 각청은 내 곁에 남아 다음 말을 기다렸다.", "type": "NARRATION"}, {"id": "V146_M00101_009", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "...도와주는 거야? 내 말이 맞는지도 모르면서...?", "type": "DIALOGUE"}, {"id": "V146_M00101_010", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "그러니까 확인하는 거야. 기억나지 않는다고 네가 틀렸다고 할 순 없지. 사람이 사라졌다는 말을 듣고 그냥 넘길 수도 없고.", "type": "DIALOGUE"}, {"id": "V146_M00101_011", "speaker": "{PLAYER_NAME}", "profile": "PLAYER_ISEKAI", "text": "찾으면... 꼭 알려 줘. 다쳤으면 내가 갈게. 부탁할게, 각청.", "type": "DIALOGUE"}, {"id": "V146_M00101_012", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "알았어. 소식이 오면 바로 알려 줄게. 그때까지는 내 옆에 있어. 지금 혼자 뛰어다닐 상태는 아니잖아.", "type": "DIALOGUE"}, {"id": "V146_M00101_013", "speaker": "이야기", "profile": null, "text": "각청은 보폭을 늦춰 걸음을 맞추고, 남은 병사에게 의례장 밖을 가리켰다.", "type": "NARRATION"}, {"id": "V146_M00101_014", "speaker": "각청", "profile": "PROFILE_LIYUE_KEQING", "text": "제군의 몸을 옮긴 흔적도 찾아봐. 큰 짐을 실은 수레가 나갈 만한 길부터. 그쪽은 네가 맡아 줘.", "type": "DIALOGUE"}, {"id": "ISK_L03_K2_026", "speaker": "이야기", "profile": null, "text": "각청이 짚은 길을 보다가, 내가 알던 이야기에서 제군의 몸을 옮겨 두었던 곳이 떠올랐다.", "type": "NARRATION"}];
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
api.mainStoryManuscriptRevision='001.01-r5';
})(globalThis);
