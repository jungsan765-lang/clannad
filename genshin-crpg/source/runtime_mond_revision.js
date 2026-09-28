/* Mond editorial pass. Stable IDs/effects keep every existing save cursor valid. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,previous=P.storyIndex;
P.storyIndex=function(){
 const ix=previous.call(this);if(ix.mondEditorial44)return ix;
 const edit=(id,values)=>{const row=ix.nodes.get('ROUTE_ISEKAI:'+id);if(!row)throw new api.RuleError('MOND_CONTENT','몬드 이야기 연결을 확인해 주세요.');for(const [col,value]of Object.entries(values))row[Number(col)]=value;if(Object.hasOwn(values,'9'))row[19]=String(row[19]||'').replace(/GREETING_VARIANT_JSON=(\{.*\})/,(_,raw)=>{const data=JSON.parse(raw);data.first_text=values[9];data.reunion_text=values[9];return 'GREETING_VARIANT_JSON='+JSON.stringify(data);});return row;};
 edit('ISK_M05_AA_125',{9:'기사단 문을 나서자 엠버가 남쪽 길이 표시된 지도를 건넸다. 갈 곳과 챙길 물건은 정해졌다. 다만 구슬에 관해 적은 기록을 공방에 맡길지 잠시 망설였다. 알베도는 출발을 늦출 필요는 없다고 전해 왔다. 남은 인사는 돌아온 뒤에도 할 수 있었다.'});
 const choice=edit('ISK_M05_AA_126',{10:'출발 전에 알베도한테 구슬 기록부터 맡기고 가자.',13:'ISK_M05_AA_145'});
 const skip=choice.slice();skip[4]='ISK_M05_AA_DEPART_DIRECT';skip[10]='기록은 돌아와서 전하자. 오늘은 바로 성문으로 가야겠어.';skip[13]='ISK_M05_AA_204';skip[17]=Number(choice[17])+.1;skip[19]='v0.13.44 선택 가능한 출발 준비. 기존 분기·보상에는 영향 없음.';
 Object.defineProperties(skip,{table:{value:'55_MAIN_STORY_DB'},sourceRow:{value:0}});ix.nodes.set('ROUTE_ISEKAI:'+skip[4],skip);ix.byTable['55_MAIN_STORY_DB'].push(skip);
 edit('ISK_M05_AA_127',{9:'알겠어. 길은 다 확인했으니까 더 서두르지는 말자. 공방에 기록만 맡기고 성문으로 가면 되겠네.',13:'ISK_M05_AA_145'});
 edit('ISK_M05_AA_145',{9:'공방 안에서는 알베도가 기사단에서 받은 보고서를 읽고 있었다. 그는 내가 꺼낸 기록을 탁자 위에 펼치고, 실제로 본 부분에만 표시를 부탁했다. 구슬은 가방 속에 그대로 두었다.'});
 edit('ISK_M05_AA_146',{9:'이 기록이면 네가 없는 동안에도 살펴볼 수 있겠어. 구슬을 두고 갈 필요는 없어. 네가 직접 본 일과 다른 사람에게 들은 일만 구분해 주겠니?'});
 edit('ISK_M05_AA_149',{9:'나는 빛을 본 순간과 유해를 발견한 순간을 따로 적었다. 알베도는 종이를 넘기다 두 군데에 작은 물음표를 남겼다. 당장 답을 내리거나 구슬을 열어 보자고 하지는 않았다.',13:'ISK_M05_AA_153'});
 edit('ISK_M05_AA_153',{9:'리월에서 다른 설명을 듣게 되면 알려 줘. 내 생각과 맞지 않아도 괜찮아. 그 차이가 단서일 수 있으니까. 이 사본은 내가 보관할게.',13:'ISK_M05_AA_159'});
 edit('ISK_M05_AA_159',{9:'기록의 사본을 맡기고 공방을 나왔다. 질문은 여전히 남아 있었지만, 떠나기 전에 해야 할 일은 하나 줄었다. 엠버가 성문 쪽으로 손을 들어 보였다.',13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_173',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_177',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_192',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_204',{9:'성문으로 향하는 길에서 다이루크를 만났다. 와이너리로 돌아가는 수레 옆에서 짐을 확인하던 그는 내 가방을 보고 고개를 들었다.'});
 edit('ISK_M05_AA_205',{9:'이제 떠나는 건가.'});
 edit('ISK_M05_AA_210',{9:'다이루크가 먼저 길을 비켰다. 수레는 와이너리 쪽으로, 나는 엠버와 성문 쪽으로 향했다. 처음 사당에 갔을 때와 달리, 이번에는 내가 어디로 가려는지 알고 있었다.',13:'ISK_M05_AA_217'});
 edit('ISK_M05_AA_217',{9:'성문 밖으로 몇 걸음 나왔을 때 벤티가 다리 난간에서 몸을 일으켰다. 평소처럼 뛰어내리려다가 멈추고, 발 디딜 곳을 골라 천천히 내려왔다.'});
 for(const leaf of ['K','AA','AB'])edit('ISK_M05_'+leaf+'_END',{9:'몬드에서의 큰 고비를 넘겼다. 남은 의뢰를 마치거나 동료들과 시간을 보낼 수 있다. 준비가 되면 메인 임무에서 리월로 향하자.'});
 edit('ISK_M05_B_END',{9:'몬드에서의 일이 일단락되었다. 떠날 때와 남을 때는 내가 정할 수 있다. 남은 의뢰와 동료들의 이야기를 살피고, 준비가 되면 메인 임무에서 다음 여정을 시작하자.'});
 // The people present have work of their own; farewells do not become a roll call.
 edit('ISK_M05_K_142',{9:'케이아가 확인서를 접어 건넸다. 알베도는 책상 반대편에서 도면을 말고 있었다. 남쪽 길의 지도는 그 둘 사이에 펼쳐져 있었다. 나는 빈자리에 가방을 올렸다. 이번엔 조사를 받으러 온 게 아니라, 떠날 짐을 챙기러 온 거였다.'});
 edit('ISK_M05_K_143',{9:'리월에 도착하면 소식부터 보내 줘. 길은 알베도가 표시했으니, 빼곡한 메모가 전부 숙제는 아니라고 미리 말해 둘게.'});
 edit('ISK_M05_K_145',{9:'좋아. 엠버한테도 그렇게 전하지. 다만 신발이 멀쩡하다는 말만 쓰면 자네 얼굴은 왜 안 그렸냐고 할지도 몰라.'});
 edit('ISK_M05_K_146',{9:'알베도가 도면에서 눈을 들었다. 케이아가 내 편지를 검열하는 동안, 그는 내가 걸을 길에 남아 있는 눈을 표시하고 있었다.'});
 edit('ISK_M05_K_147',{9:'케이아, 위험한 구간을 표시한 거야. 숙제라면 너한테도 줄 수 있어. 그리고 넌, 내가 틀리게 표시한 길이 있으면 알려 줘. 지우고 다시 그리면 되니까.'});
 edit('ISK_M05_K_149',{9:'그럼 몬드에 한 권 두고 가. 케이아도 읽으면 지도가 숙제는 아니라는 걸 알겠지.'});
 edit('ISK_M05_AB_079',{9:'진, 사본은 오늘 안에 넘길게. 각청, 구슬을 전달받은 과정도 넣어 둘게. 이 사람에게 같은 설명을 처음부터 다시 시키지 않아도 될 거야.'});
 edit('ISK_M05_AB_081',{9:'그 점도 적었어. 모르는 사용법을 설명하느라 리월까지 걸어갈 필요는 없겠지. 각청, 현장에서 다른 결과가 나오면 내게도 알려 줘.'});
 edit('ISK_M05_AB_082',{9:'알겠어요. 새로 확인한 부분부터 전할게요. 그리고 너는 모르는 사람 이름이 나오면 바로 물어봐. 나도 리월 사람을 다 알지는 못하니까.'});
 edit('ISK_M05_B_051',{9:'돌아오셨군요. 엠버, 이분까지 일을 맡겼어? 아니, 먼저 손부터 보여 주세요. 산에서 내려온 분에게 물동이부터 들게 할 수는 없죠.'});
 edit('ISK_M05_B_053',{9:'도와주신 건 고맙습니다. 이제 이쪽에 앉아 계세요. 엠버도 잠깐 물 마시고. 둘 다 괜찮다는 대답부터 하지 말고요.'});
 edit('ISK_M05_B_057',{9:'드발린이 공격하지 않을 거라고 전했어. 그런데 진은 축하할 시간이 없더라. 돌아오는 사람들 이름을 먼저 찾고 있었거든. 나도 명단을 같이 봤어.'});
 edit('ISK_M05_B_061',{9:'벤티 씨가 이송로를 확인해 주셨습니다. 서로 맡을 일이 있으니 지금은 나눠서 하죠. 당신도 산에서 본 일을 들려주시면 됩니다. 토벌대의 일까지 대신 설명하실 필요는 없어요.'});
 // Editorial/internals belong in metadata, never in the story window.
 for(const row of ix.byTable['57_MOND_STORY_SCENE_DB'])if(String(row[1]).includes('MOND')&&row[5]!=='META')row[9]=String(row[9]||'').replace(/\s*기존 성인 루트 허용 여부를 변경하지 않는다\./g,'');
 Object.defineProperty(ix,'mondEditorial44',{value:true});return ix;
};
api.mondEditorialVersion=44;
})(globalThis);
