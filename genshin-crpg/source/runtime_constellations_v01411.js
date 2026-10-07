/* 0.14.11 운명의 자리 and 특성 names. Every fighter now has their own six constellations under the official Korean
 * names (자리 이름, the six names, 일반 공격 / 원소전투 스킬 / 원소폭발 names; genshin-db, Korean), with effects that
 * follow the original constellation but are CRPG rules built for this turn system:
 *  - C1, C2 and C6 are the big steps (C6 usually changes how the whole party fights), C4 sits between them, and C3 / C5
 *    raise one talent by three levels exactly as in the original (which talent comes from the original text).
 *  - The protagonist uses 나그네자리 (Traveler; the set follows the element the Traveler fights with) or 표류자리
 *    (이세계인; names and effects are CRPG originals).
 * Effects are data (EFFECTS) read by one small interpreter wrapped around the combat functions; they act only in battle
 * and only for unlocked levels, so a party without 운명의 자리 fights exactly as before.
 * Numbers and rules are CRPG house rules, not official game values. Load after runtime_premium_v0148.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.premiumV0148||P.constellationsV01411)return;
const copy=x=>JSON.parse(JSON.stringify(x)),round=Math.round,PLAYER='PLAYER_CUSTOM';
// ---- names: [자리 이름, rarity, 일반 공격, 원소전투 스킬, 원소폭발, talents raised by C3 and C5, [C1..C6]] ----
const NAMES={
 LIYUE_BAIZHU:["호리병자리",5,"금궤 침술","태소 진단","치유 전형론","qe",["고통 감지","환자 진단","기운 안정","죽음 고찰","숨은 병","병과 건강"]],
 LIYUE_BEIDOU:["남천해산자리",4,"파도 정복","파도잡이","작뢰","eq",["사방으로 잠긴 어룡","솟아오르는 천둥번개","조류발전","별을 따라 찾은 고향의 땅","파도를 비추는 노을빛","북두의 귀신 퇴치"]],
 LIYUE_CHONGYUN:["건곤봉자리",4,"악멸의 사식","영도·중첩의 서리","영도·떨어지는 별","qe",["얼음의 노래","주천 운기","구름이 걷히고 빛이 든다","구름이 떠다니는 서리 하늘","참된 도리와 이치","성인을 받드는 네 개의 령"]],
 LIYUE_GAMING:["사자춤자리",4,"별의 발톱","도약하는 영물","찬란한 금예춤","eq",["통명의 가호","매화 밟기","무대 울리기","높은 공중제비","퇴마의 포효","조련의 달인"]],
 LIYUE_GANYU:["선린자리",5,"유천 사격술","산과 강의 기린 흔적","쏟아지는 천화","qe",["이슬 먹는 신수","획린(獲麟)","구름 여행","서수(西狩)","잡초 근절","살생의 발걸음"]],
 LIYUE_HUTAO:["나비자리",5,"왕생 비법 창술","나비의 서","평안의 서","eq",["진홍의 꽃다발","비처럼 내리는 불안","적색 피의 의식","영원한 안식의 정원","꽃잎 향초의 기도","나비 잔향"]],
 LIYUE_KEQING:["금자정수자리",5,"운래 검법","성신 회귀","천가 순유","qe",["계뢰","가연","등루","조율","이등","염정"]],
 LIYUE_LANYAN:["현조자리",4,"물길을 수놓은 제비","현조의 날갯짓","달을 밟는 제비","eq",["「구름 사이에 그대가 보이네」","「옥빛 무지개를 그리며 춤추고」","「흰 봉황에 올라타 안개를 가르며」","「용매를 모아 혈주를 만드니」","「그대를 만난 이 기쁨을」","「은빛 제비처럼 바람 따라 노래하리라」"]],
 LIYUE_NINGGUANG:["기형의자리",4,"천금투","선기 병풍","천권 붕옥","qe",["부서지는 파편","곤륜을 억누르는 선기","천권 강림","공수전환","천개의 선기 병풍","칠성의 아름답고 찬란한 빛"]],
 LIYUE_QIQI:["삼청령자리",5,"운래의 고대 검법","선법·한병의 귀차","선법·구고도액","qe",["한고의 회향","뼛속까지 스며드는 한기","승천 보고(寶誥)","중생을 압도하는 천위","피어난 홍련","기사회해"]],
 LIYUE_SHENHE:["고독한 깃장식자리",5,"별의 포획자","위령 소환 구사술","신녀 강령 비결","eq",["심재","정몽","잠허","통관","화신","망현"]],
 LIYUE_TARTAGLIA:["경천자리",5,"단우","마왕 무장·광란","극악기·진멸섬","eq",["마왕 무장·파도 억제","마왕 무장·암류","심연의 재앙·분쟁의 근원","심연의 재앙·차오르는 물","극악기·빗물 베기","극악기·천사멸진"]],
 LIYUE_XIANGLING:["국자자리",4,"밀가루 음식 솜씨","누룽지 출격","화륜","qe",["겉은 바삭, 속은 촉촉","큰불에 기름 붓기","센 불로 조리하기","약불로 천천히 삶기","흉폭한 누룽지","토네이도 화륜"]],
 LIYUE_XIANYUN:["한학자리",5,"청풍의 산화 공양가","아침 학구름","밤을 수놓는 대나무별","qe",["속세의 인연을 씻는 차풍","외딴곳에서 우는 학","별과 달의 조화","오묘한 기장쌀 요리","꽃구름 누비기","류운 선인!"]],
 LIYUE_XIAO:["황금날개천붕왕자리",5,"권적미진","풍륜양립","나자의 춤","eq",["괴겁·삼계 파멸","공겁·피어난 공허의 꽃","항마·분노의 형상","신통·사라진 고통","성겁·늘어나는 번뇌","항마·호법야차"]],
 LIYUE_XINGQIU:["금직자리",4,"고화 검법","고화검·화우농산","고화검·재우유홍","qe",["장막의 잔향","맑은 하늘의 무지개","시로 짠 비단","교룡 베기","우심폐문","만문 집결"]],
 LIYUE_XINYAN:["홍단사현자리",4,"염무","정열의 연주","반항의 피치카토","eq",["절명의 가속","오프닝 즉흥연주","더블 스탑","리듬의 전염","앵콜의 함성","지옥의 연주"]],
 LIYUE_YANFEI:["법수자리",4,"봉랍 인장","단홍의 계약","계약 성립","eq",["법의 심판자","최종 해석권","진리의 화염 인장","단서금철권","준법 서약서","추가 조항"]],
 LIYUE_YAOYAO:["계화자리",4,"돌격 연환창","하늘에서 무가 내려와","달빛 아래 떨어지는 옥구슬","eq",["선인의 가르침","바르고 착한 마음","올곧은 길","귀염둥이","동정심","자애롭고 어진 마음"]],
 LIYUE_YELAN:["유객(幽客)자리",5,"빛을 감춘 활","뒤얽힌 생명줄","심오하고 영롱한 주사위","qe",["승부에 뛰어든 공모자","올가미에 걸린 적","노름꾼의 주사위","이화접목의 현혹술","눈보다 빠른 손","승자의 독식"]],
 LIYUE_YUNJIN:["무지개장자리",4,"구름을 스치는 격투","선운개상","절벽을 깎는 깃발","qe",["노련한 승마술","다양한 소품","장군의 몸동작","승당의 경지","걸출한 명배우","장엄하고 익살스러운 노랫소리"]],
 LIYUE_ZHONGLI:["암왕제군자리",5,"바위 비","지핵","천성","eq",["암석·천지의 기반","돌·옥으로 인해 빛나는 세상","옥그릇·저물어도 사라지지 않는 광채","옥홀·부서져도 건재한 견고함","푸른 규벽·천지의 이치","금옥·천하에 주는 선물"]],
 LIYUE_ZIBAI:["백마자리",5,"금빛 가지치기","천지일체","천상 삼원의 법칙","eq",["홀연한 탄생과 고요한 끝","생사의 섭리","무소유","혼을 따르는 육신","침묵으로 깨달은 도리","천지를 스쳐가는 여정"]],
 MOND_ALBEDO:["백악의 아이 자리",5,"페보니우스 검술·백","창생법·모조 태양꽃","탄생식·대지의 파동","eq",["에덴의 꽃","현생의 누대","태양의 꽃","신성의 추락","명왕누대의 파동","무구의 흙"]],
 MOND_AMBER:["토끼자리",4,"명사수","폭탄 인형","화살비","qe",["일석이츄츄!","일촉즉발","타오르기 시작했어!","보통 봉제 인형일 리가 없잖아","토끼 백작이야!","맹렬한 불길"]],
 MOND_BARBARA:["황금잔자리",4,"물의 노래","공연, 시작♪","빛나는 기적♪","qe",["무지개의 노래","원기 분출","내일의 스타","노력이 곧 마법","순수한 유대","이 세상의 아름다움을 당신에게"]],
 MOND_BENNETT:["험로자리",4,"행운의 검","열정 과부하","아름다운 여정","eq",["모험 동경","궁지 돌파","타오르는 열정","사그러들지 않는 열정","넓어진 마음","열화와 용기"]],
 MOND_DAHLIA:["찬송가자리",4,"페보니우스 검술·제례","신성한 침례식","물빛 기도","qe",["무결한 인도","자애로운 화답","바람 꽃 봉헌","본기도에 담긴 염원","무르익은 잔꾀","모든 기쁨이 함께하길"]],
 MOND_DILUC:["밤올빼미자리",5,"단련의 검","역날의 화염","여명","eq",["죄악 징벌","뜨거운 잿더미","강철의 불꽃","유화의 화상","여명을 알리는 불새","어둠을 가르는 화염의 검"]],
 MOND_DIONA:["고양이자리",4,"사냥꾼의 사격술","꽁꽁젤리","특제 칵테일","qe",["칵테일의 여운","꽁꽁젤리 쉐이큰","한, 한 잔 더?","주류업 킬러","투 샷, 더블 아이스","캣테일 마감시간"]],
 MOND_EULA:["물보라자리",5,"페보니우스 검술·왕실","얼음 파도의 와류","파도를 얼리는 광검","qe",["빛의 환상","물보라 소녀","로렌스의 혈통","열등감 속 고집","기사의 소양","고귀한 자의 의무"]],
 MOND_FISCHL:["환상까마귀자리",4,"죄멸의 화살","밤을 순찰하는 그림자 날개","암야의 환상","eq",["그윽한 까마귀 눈","신성한 판결의 그림자 깃털","심연색의 검은 날개","황녀의 환상 이야기","암야 묵시록","영야의 금수"]],
 MOND_JEAN:["새끼사자자리",5,"페보니우스 검술","풍압검","민들레 바람","qe",["검척에 흐르는 폭풍","모든 이를 수호하는 방패","서풍이 스칠 무렵","민들레의 국토","삽시간의 열풍","만민을 보살피는 사자의 이빨"]],
 MOND_KAEYA:["공작깃털자리",4,"의전 검술","서리 엄습","살을 에는 윤무","eq",["걸출한 혈통","끝없는 서리춤","살을 에는 얼음놀이","차가운 키스","차가운 포옹","회전하는 얼음"]],
 MOND_KLEE:["네잎클로버자리",5,"펑펑","통통 폭탄","쾅쾅 불꽃","eq",["연쇄 폭발","퍄퍄 포탄 파편","클레 특제","일촉즉발","포격 천재","화력 전개"]],
 MOND_LISA:["모래시계자리",4,"손끝의 뇌폭","창뢰","장미의 뇌광","qe",["무한의 전기회로","공간 전위 결계","공명의 뇌광","비처럼 내리는 플라즈마","플라즈마 낙뢰","펄스의 마녀"]],
 MOND_MIKA:["숲비둘기자리",4,"페보니우스 창술·화살촉","별서리 소용돌이","푸른 깃털의 기도","qe",["마주친 인연","여행길 동반","유격 노하우","맑은 서리 축복","신호 화살","동반 도우미"]],
 MOND_MONA:["영천자리",5,"인과 간파","수중 환원","별의 운명","qe",["침몰한 예언","성월의 연주","멈추지 않는 천상","절멸의 예언","운명의 우롱","악운의 수식"]],
 MOND_NOELLE:["심호자리",4,"페보니우스 검술·메이드","호심경","대청소","eq",["지원은 저한테 맡기세요","선풍의 메이드","메이드는 다치지 않아요","나중에 청소할게요","기사단 청소 전문가","티끌 하나도 용서할 수 없어"]],
 MOND_RAZOR:["이리자리",4,"강철 마루","날카로운 발톱과 창뢰","뇌아","qe",["늑대의 본성","진압","야수의 혼","물어뜯기","날카로운 발톱","천랑"]],
 MOND_ROSARIA:["형관자리",4,"성당 창술","죄를 삼키는 고해","죽음의 성례","eq",["죄의 속삭임","축복이 끊긴 땅","고해의 의식","고통의 은혜","종부성사","재판의 대행인"]],
 MOND_SUCROSE:["플라스크자리",4,"약식 풍령 작성","풍령 작성·육삼공팔","금기·풍령 작성·칠오 동구 이형","eq",["쌓아 올린 진공 영역","불속박형 베트","실수하지 않는 소녀","연금의 편집증","진지한 보통병","혼돈의 엔트로피"]],
 MOND_VENTI:["가선자리",5,"신성한 사격술","높은 하늘의 노래","바람신의 시","qe",["쏘아 올린 창풍","그리운 찬 바람","천풍의 시","자유의 찬 바람","높은 하늘의 협주","투쟁의 폭풍"]],
 TRAVELER_ANEMO:["나그네자리",5,"이방의 강철바람","회오리 검","격동의 바람","qe",["회전하는 분노의 바람","혁신의 회오리바람","천지의 세찬 바람","따사로운 산들바람","뭇별의 소용돌이","뒤엉킨 계절풍"]],
 TRAVELER_GEO:["나그네자리",5,"이방의 암봉","성운검","첩첩산중","qe",["웅대한 청암","불안정한 용암","팔방의 바위","험준한 바위","하늘에서 떨어지는 바위","영세의 반석"]],
 // 이세계인: a CRPG original class, so its constellation is a CRPG original too.
 ISEKAI:["표류자리",5,"건너온 자의 무기술","약점 간파","함께하는 일격","eq",["낯선 하늘의 별","건너온 이의 각오","두 세계의 기억","함께 걷는 길","이름 없는 영웅","세계를 잇는 일격"]]
};
// ---- effects: C1, C2, C4 and C6 as [text, ...effects]; C3 and C5 are the talent levels above ----
const dmg=(pct,o={})=>({t:'dmg',pct,...o}),stat=(key,v,o={})=>({t:'stat',key,...v,...o}),team=o=>({t:'team',...o});
const cast=(kind,o)=>({t:'onCast',kind,...o}),hit=o=>({t:'onHit',...o}),cd=(kind,n=1)=>({t:'cd',kind,n}),charge=kind=>({t:'charge',kind});
const ELEMENTAL=['바람','불','물','얼음','번개'];
const EFFECTS={
 MOND_AMBER:{
  1:['일반 공격이 명중하면 같은 적에게 두 번째 화살이 날아가 공격력 40%의 불 원소 피해를 준다.',hit({kind:'na',hit:{k:.4,el:'불'}})],
  2:['토끼 백작이 폭발하며 주는 피해가 200% 증가한다.',dmg(200,{src:'OBJECT'})],
  4:['폭탄 인형을 재사용 대기 없이 한 번 더 사용할 수 있다(두 번 쓴 뒤 재사용 대기).',charge('e')],
  6:['화살비 발동 후 2라운드 동안 파티 전체의 공격력이 25%, 속도가 8 증가한다.',cast('q',{buff:{who:'all',id:'CONS_AMBER_6',rounds:2,mods:{atk:{pct:25},spd:{flat:8}}}})]},
 MOND_KAEYA:{
  1:['얼음 원소의 영향을 받은 적을 공격할 때 치명타 확률이 25% 증가한다.',stat('crit',{flat:25},{if:{tAura:'얼음'}})],
  2:['살을 에는 윤무가 1라운드 더 오래 남고, 얼음 칼날의 피해가 50% 증가한다.',cast('q',{field:{kind:'ICE',rounds:1}}),dmg(50,{src:'FIELD'})],
  4:['HP가 30% 아래로 떨어지면 최대 HP 30%의 보호막을 얻는다(2라운드, 얼음 원소 피해 흡수 250%, 전투마다 1회).',{t:'lowHp',below:30,shield:{stat:'maxHp',k:.3,who:'self',rounds:2,absorb:{얼음:.4}}}],
  6:['살을 에는 윤무의 재사용 대기가 1턴 줄고, 얼음 칼날의 피해가 추가로 60% 증가한다.',cd('q'),dmg(60,{src:'FIELD'})]},
 MOND_LISA:{
  1:['창뢰가 적에게 명중하면 장미의 뇌광 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'e',once:'turn',cd:{kind:'q',n:1}})],
  2:['창뢰를 쓰면 2라운드 동안 방어력이 40% 증가하고 받는 피해가 20% 줄어든다.',cast('e',{buff:{who:'self',id:'CONS_LISA_2',rounds:2,mods:{def:{pct:40}},consTaken:-20}})],
  4:['장미의 뇌광 영역이 내리치는 번개가 늘어나 영역 피해가 100% 증가한다.',dmg(100,{src:'FIELD'})],
  6:['전투가 시작되면 모든 적에게 전기 전도 3스택을 쌓는다. 방어력 감소 상태인 적에게 주는 피해가 40% 증가한다.',{t:'start',conduction:3},dmg(40,{if:{tStatus:'STATUS_DEF_DOWN'}})]},
 MOND_BARBARA:{
  1:['빛나는 기적♪의 재사용 대기가 1턴 줄어든다.',cd('q')],
  2:['공연, 시작♪이 이어지는 동안 파티 전체가 주는 피해가 15% 증가하고, 바바라의 치유량이 50% 늘어난다.',team({dmg:{pct:15},while:{status:'STATUS_BARBARA_MELODY_LOOP'}}),{t:'heal',pct:50,if:{status:'STATUS_BARBARA_MELODY_LOOP'}}],
  4:['일반 공격이 적에게 명중하면 빛나는 기적♪의 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'na',once:'turn',cd:{kind:'q',n:1}})],
  6:['전투마다 한 번, 파티원이 쓰러질 피해를 받으면 쓰러지지 않고 HP를 모두 회복한다.',{t:'revive',pct:100}]},
 MOND_DILUC:{
  1:['HP가 50%보다 많은 적에게 주는 피해가 30% 증가한다.',dmg(30,{if:{tHpAbove:50}})],
  2:['피격될 때마다 2라운드 동안 공격력이 15% 증가한다(최대 3중첩).',{t:'onHurt',stack:{id:'CONS_DILUC_2',max:3,rounds:2,mods:{atk:{pct:15}}}}],
  4:['역날의 화염의 마지막 일격 뒤 같은 적에게 불꽃이 한 번 더 터져 공격력 80%의 불 원소 피해를 준다.',cast('e',{hit:{k:.8,el:'불'}})],
  6:['역날의 화염의 재사용 대기가 1턴 줄고, 쓴 뒤 2라운드 동안 일반 공격 피해가 60% 증가한다.',cd('e'),cast('e',{buff:{who:'self',id:'CONS_DILUC_6',rounds:2,consDmg:{pct:60,kind:'na'}}})]},
 MOND_JEAN:{
  1:['풍압검의 피해가 40% 증가한다.',dmg(40,{kind:'e'})],
  2:['풍압검을 쓰면 2라운드 동안 파티 전체의 공격력이 15%, 속도가 10 증가한다.',cast('e',{buff:{who:'all',id:'CONS_JEAN_2',rounds:2,mods:{atk:{pct:15},spd:{flat:10}}}})],
  4:['민들레 바람 영역이 있는 동안 적이 받는 바람 원소 피해가 40% 증가한다.',team({dmg:{pct:40,el:'바람'},while:{field:'DANDELION'}})],
  6:['민들레 바람 영역이 1라운드 더 오래 남고, 영역이 있는 동안 파티가 받는 피해가 35% 줄어든다.',cast('q',{field:{kind:'DANDELION',rounds:1}}),team({taken:-35,while:{field:'DANDELION'}})]},
 MOND_ALBEDO:{
  1:['창생법·모조 태양꽃을 쓰면 탄생식·대지의 파동 재사용 대기가 1턴 줄어든다.',cast('e',{cd:{kind:'q',n:1}})],
  2:['창생법을 쓸 때마다 생멸 카운트를 1스택 얻는다(최대 4). 탄생식·대지의 파동은 스택을 모두 써서 1스택당 피해가 30% 증가한다.',cast('e',{stack:{id:'CONS_ALBEDO_2',max:4}}),dmg(0,{kind:'q',perStack:30,stackId:'CONS_ALBEDO_2'}),cast('q',{clear:'CONS_ALBEDO_2'})],
  4:['알베도가 함께 있으면 파티 전체의 일반 공격 피해가 30% 증가한다.',team({dmg:{pct:30,kind:'na'}})],
  6:['보호막의 보호를 받는 파티원이 주는 피해가 35% 증가한다.',team({dmg:{pct:35},if:{shielded:true}})]},
 MOND_DIONA:{
  1:['특제 칵테일의 재사용 대기가 1턴 줄어든다.',cd('q')],
  2:['꽁꽁젤리의 피해와 보호막 흡수량이 30% 증가하고, 다른 파티원 모두에게도 디오나 최대 HP 9%의 보호막을 씌운다(2라운드).',dmg(30,{kind:'e'}),{t:'shieldPow',pct:30},cast('e',{shield:{stat:'maxHp',k:.09,who:'others',rounds:2}})],
  4:['특제 칵테일 영역이 있는 동안 디오나가 주는 피해가 40% 증가한다.',dmg(40,{if:{field:'FROST_MIST'}})],
  6:['특제 칵테일 영역이 있는 동안 HP 50% 이하인 파티원은 받는 치유가 40% 늘고, HP 50%를 넘는 파티원은 주는 피해가 30% 늘어난다.',team({healIn:40,while:{field:'FROST_MIST'},if:{hpBelow:51}}),team({dmg:{pct:30},while:{field:'FROST_MIST'},if:{hpAbove:50}})]},
 MOND_VENTI:{
  1:['일반 공격이 명중하면 갈라진 화살 2발이 더 날아가 각각 공격력 33%의 바람 원소 피해를 준다.',hit({kind:'na',hit:{k:.33,el:'바람',times:2}})],
  2:['높은 하늘의 노래에 맞은 적은 2라운드 동안 받는 바람·물리 피해가 25% 증가한다.',cast('e',{debuff:{who:'target',id:'CONS_VENTI_2',rounds:2,vuln:{pct:25,el:['바람','물리']}}})],
  4:['벤티가 주는 바람 원소 피해가 25% 증가한다.',dmg(25,{el:'바람'})],
  6:['바람신의 시에 맞은 적은 3라운드 동안 받는 바람·불·물·얼음·번개 피해가 40% 증가한다.',cast('q',{debuff:{who:'all',id:'CONS_VENTI_6',rounds:3,vuln:{pct:40,el:ELEMENTAL}}})]},
 MOND_NOELLE:{
  1:['대청소 중 일반 공격이 명중하면 호심경의 치유가 반드시 일어나 파티 전체를 노엘 방어력 25%만큼 회복시킨다(라운드마다 1회).',hit({kind:'na',once:'round',if:{status:'NOELLE_SWEEP'},heal:{stat:'def',k:.25,who:'all'}})],
  2:['일반 공격 피해가 35% 증가한다.',dmg(35,{kind:'na'})],
  4:['호심경 보호막이 깨지면 적 최대 3명에게 노엘 방어력 200%의 바위 원소 피해를 준다.',{t:'shieldBreak',source:'MOND_NOELLE_E',hit:{k:2,el:'바위',max:3,stat:'def',pick:'all'}}],
  6:['대청소가 1라운드 더 오래 이어지고, 대청소 중 공격력이 방어력의 80%만큼 증가한다.',cast('q',{status:{id:'NOELLE_SWEEP',rounds:1}}),stat('atk',{from:'def',k:.8},{if:{status:'NOELLE_SWEEP'}})]},
 MOND_FISCHL:{
  1:['오즈가 없을 때 일반 공격하면 오즈가 까마귀 눈으로 함께 공격해 공격력 50%의 번개 원소 피해를 준다.',hit({kind:'na',if:{noField:'OZ'},hit:{k:.5,el:'번개'}})],
  2:['밤을 순찰하는 그림자 날개 발동 시 적 최대 3명에게 공격력 200%의 번개 원소 피해를 더 준다.',cast('e',{hit:{k:2,el:'번개',max:3,pick:'all'}})],
  4:['암야의 환상 발동 시 모든 적에게 공격력 222%의 번개 원소 피해를 주고, HP를 20% 회복한다.',cast('q',{hit:{k:2.22,el:'번개',max:99,pick:'all'},heal:{stat:'maxHp',k:.2,who:'self'}})],
  6:['오즈가 1라운드 더 머무르고, 오즈가 있는 동안 파티원의 일반 공격마다 오즈가 함께 공격해 피슬 공격력 30%의 번개 원소 피해를 준다.',cast(['e','q'],{field:{kind:'OZ',add:{summonTurns:1}}}),{t:'teamHit',self:true,kind:'na',while:{field:'OZ'},hit:{k:.3,el:'번개'}}]},
 MOND_RAZOR:{
  1:['레이저가 주는 모든 피해가 20% 증가한다.',dmg(20)],
  2:['HP가 50% 미만인 적을 공격할 때 치명타 확률이 30% 증가한다.',stat('crit',{flat:30},{if:{tHpBelow:50}})],
  4:['날카로운 발톱과 창뢰에 맞은 적은 2라운드 동안 방어력이 20% 감소한다.',cast('e',{debuff:{who:'target',id:'STATUS_DEF_DOWN',rounds:2,value:20}})],
  6:['일반 공격이 명중하면 낙뢰가 떨어져 공격력 100%의 번개 원소 피해를 주고 번개의 인장을 1개 얻는다(턴마다 1회).',hit({kind:'na',once:'turn',hit:{k:1,el:'번개'},prop:{key:'razorSigils',add:1,max:3}})]},
 MOND_BENNETT:{
  1:['아름다운 여정의 공격력 증가가 모든 파티원에게 적용되고 20%p 더 커진다(2라운드).',cast('q',{buff:{who:'all',id:'CONS_BENNETT_1',rounds:2,mods:{atk:{pct:20}}}})],
  2:['HP가 70% 미만일 때 아름다운 여정을 쓰면 재사용 대기가 1턴 줄어든다.',cast('q',{if:{hpBelow:70},cd:{kind:'q',n:1}})],
  4:['열정 과부하가 같은 적을 한 번 더 베어 공격력 70%의 불 원소 피해를 준다.',cast('e',{hit:{k:.7,el:'불'}})],
  6:['아름다운 여정 발동 후 2라운드 동안 한손검·양손검·장병기를 쓰는 파티원의 일반 공격이 불 원소로 바뀌고 불 원소 피해가 20% 증가한다.',cast('q',{buff:{who:'melee',id:'DILUC_INFUSION',rounds:2}})]},
 MOND_DAHLIA:{
  1:['물빛 기도의 재사용 대기가 1턴 줄어든다.',cd('q')],
  2:['달리아의 보호막 흡수량이 40% 증가하고, 보호막의 보호를 받는 파티원이 주는 피해가 15% 증가한다.',{t:'shieldPow',pct:40},team({dmg:{pct:15},if:{shielded:true}})],
  4:['물빛 기도의 보호막이 1라운드 더 오래 남는다.',cast('q',{shieldExtend:{source:'MOND_DAHLIA_Q',rounds:1}})],
  6:['전투마다 한 번, 파티원이 쓰러질 피해를 받으면 쓰러지지 않고 HP를 모두 회복한다. 보호막의 보호를 받는 파티원의 속도가 10 증가한다.',{t:'revive',pct:100},team({stat:{key:'spd',flat:10},if:{shielded:true}})]},
 MOND_KLEE:{
  1:['공격하거나 스킬을 쓸 때 50% 확률로 불꽃이 떨어져 적 1명에게 공격력 120%의 불 원소 피해를 준다.',cast('any',{chance:50,hit:{k:1.2,el:'불'}})],
  2:['통통 폭탄에 맞은 적은 2라운드 동안 방어력이 23% 감소한다.',cast('e',{debuff:{who:'all',max:3,id:'STATUS_DEF_DOWN',rounds:2,value:23}})],
  4:['쾅쾅 불꽃이 끝날 때 마지막 폭발이 일어나 모든 적에게 공격력 300%의 불 원소 피해를 준다.',{t:'fieldEnd',kind:'BOMBARD',hit:{k:3,el:'불',max:99,pick:'all'}}],
  6:['쾅쾅 불꽃 발동 시 다른 파티원의 원소폭발 재사용 대기가 1턴 줄고, 3라운드 동안 파티 전체의 불 원소 피해가 25% 증가한다.',cast('q',{cdTeam:{kind:'q',n:1},buff:{who:'all',id:'CONS_KLEE_6',rounds:3,consDmg:{pct:25,el:'불'}}})]},
 MOND_MONA:{
  1:['성이 상태의 적에게 파티 전체가 주는 피해가 25% 증가한다.',team({dmg:{pct:25},if:{tStatus:'OMEN'}})],
  2:['일반 공격이 명중하면 50% 확률로 공격력 80%의 물 원소 추가 공격을 한다.',hit({kind:'na',chance:50,hit:{k:.8,el:'물'}})],
  4:['성이 상태의 적을 공격하는 파티원의 치명타 확률이 20% 증가한다.',team({stat:{key:'crit',flat:20},if:{tStatus:'OMEN'}})],
  6:['별의 운명 발동 후 모나의 다음 공격 피해가 180% 증가한다.',cast('q',{buff:{who:'self',id:'CONS_MONA_6',rounds:3,consDmg:{pct:180,once:true}}})]},
 MOND_MIKA:{
  1:['별서리 소용돌이를 쓰면 2라운드 동안 파티 전체의 속도가 8 더, 공격력이 10% 증가한다.',cast('e',{buff:{who:'all',id:'CONS_MIKA_1',rounds:2,mods:{spd:{flat:8},atk:{pct:10}}}})],
  2:['별서리 소용돌이에 맞은 적은 2라운드 동안 받는 피해가 20% 증가한다.',cast('e',{debuff:{who:'target',id:'CONS_MIKA_2',rounds:2,vuln:{pct:20}}})],
  4:['푸른 깃털의 기도의 재사용 대기가 1턴 줄어든다.',cd('q')],
  6:['별서리 소용돌이의 속도 증가를 받은 파티원의 치명타 확률이 10%, 치명타 피해가 60% 증가한다.',team({stat:{key:'crit',flat:10},if:{status:'MIKA_SPEED'}}),team({stat:{key:'critDmg',flat:60},if:{status:'MIKA_SPEED'}})]},
 MOND_ROSARIA:{
  1:['치명타를 내면 2라운드 동안 속도가 6, 일반 공격 피해가 25% 증가한다.',hit({if:{crit:true},buff:{who:'self',id:'CONS_ROSARIA_1',rounds:2,mods:{spd:{flat:6}},consDmg:{pct:25,kind:'na'}}})],
  2:['죽음의 성례의 얼음 창이 1라운드 더 오래 남고, 얼음 창의 피해가 50% 증가한다.',cast('q',{field:{kind:'ICE_LANCE',rounds:1}}),dmg(50,{src:'FIELD'})],
  4:['죄를 삼키는 고해로 치명타를 내면 죽음의 성례 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'e',once:'turn',if:{crit:true},cd:{kind:'q',n:1}})],
  6:['죽음의 성례에 맞은 적은 2라운드 동안 받는 물리·얼음 피해가 25% 증가한다.',cast('q',{debuff:{who:'all',max:4,id:'CONS_ROSARIA_6',rounds:2,vuln:{pct:25,el:['물리','얼음']}}})]},
 MOND_SUCROSE:{
  1:['풍령 작성·육삼공팔을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['금기·풍령 작성이 1라운드 더 오래 이어진다.',cast('q',{field:{kind:'WIND_SPIRIT',rounds:1}})],
  4:['일반 공격이 명중하면 풍령 작성·육삼공팔의 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'na',once:'turn',cd:{kind:'e',n:1}})],
  6:['금기·풍령 작성 발동 후 2라운드 동안 파티 전체가 주는 원소 피해가 25% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_SUCROSE_6',rounds:2,consDmg:{pct:25,el:'elem'}}})]},
 MOND_EULA:{
  1:['냉혹한 마음을 써서(길게) 얼음 파도의 와류를 쓰면 2라운드 동안 물리 피해가 40% 증가한다.',cast('e',{if:{wasStatus:'EULA_GRIMHEART',noStatus:'EULA_GRIMHEART'},buff:{who:'self',id:'CONS_EULA_1',rounds:2,consDmg:{pct:40,el:'물리'}}})],
  2:['냉혹한 마음을 써서 얼음 파도의 와류를 쓰면 재사용 대기가 1턴 줄어든다.',cast('e',{if:{wasStatus:'EULA_GRIMHEART',noStatus:'EULA_GRIMHEART'},cd:{kind:'e',n:1}})],
  4:['HP가 50% 미만인 적에게 파도를 얼리는 광검이 주는 피해가 50% 증가한다.',dmg(50,{kind:'q',if:{tHpBelow:50}})],
  6:['빛의 검이 에너지 5스택을 지닌 채 나타나고, 파도를 얼리는 광검의 모든 피해가 30% 증가한다.',cast('q',{field:{kind:'LIGHTFALL_SWORD',set:{stacks:5}}}),dmg(30,{kind:'q'})]},
 LIYUE_BAIZHU:{
  1:['태소 진단을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['파티원의 공격이 적에게 명중하면 사역령·절이 뒤따라 백출 공격력 250%의 풀 원소 피해를 주고, 그 파티원을 백출 최대 HP 4%만큼 회복시킨다(라운드마다 1회).',{t:'teamHit',self:true,once:'round',hit:{k:2.5,el:'풀'},heal:{stat:'maxHp',k:.04,who:'attacker'}}],
  4:['치유 전형론 발동 후 2라운드 동안 파티 전체의 원소 반응 피해가 30% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_BAIZHU_4',rounds:2,consDmg:{pct:30,kind:'reaction'}}})],
  6:['태소 진단의 사역령이 적을 맞히면 백출 최대 HP 8%의 풀 원소 피해를 더 주고, HP 비율이 가장 낮은 파티원에게 최대 HP 10%의 보호막을 씌운다(스킬마다 1회).',hit({kind:'e',once:'cast',hit:{k:.08,stat:'maxHp',el:'풀'},shield:{stat:'maxHp',k:.1,who:'lowest',rounds:2}})]},
 LIYUE_BEIDOU:{
  1:['작뢰 발동 시 파티 전체에게 북두 최대 HP 16%의 보호막을 씌운다(2라운드, 번개 원소 피해 흡수 250%).',cast('q',{shield:{stat:'maxHp',k:.16,who:'all',rounds:2,absorb:{번개:.4}}})],
  2:['작뢰의 연쇄 번개가 더 많은 적에게 튀어 작뢰의 피해가 100% 증가한다.',dmg(100,{kind:'q'})],
  4:['피격되면 2라운드 동안 일반 공격이 공격력 40%의 번개 원소 피해를 더 준다.',{t:'onHurt',buff:{who:'self',id:'CONS_BEIDOU_4',rounds:2}},hit({kind:'na',if:{status:'CONS_BEIDOU_4'},hit:{k:.4,el:'번개'}})],
  6:['작뢰가 이어지는 동안 적이 받는 번개 원소 피해가 30% 증가하고, 파도잡이의 피해가 60% 증가한다.',team({dmg:{pct:30,el:'번개'},while:{field:'STORMBREAKER'}}),dmg(60,{kind:'e'})]},
 LIYUE_QIQI:{
  1:['한병의 귀차가 도액 부적 표식이 있는 적을 공격하면 선법·구고도액 재사용 대기가 1턴 줄어든다(라운드마다 1회).',hit({kind:'e',once:'round',if:{tStatus:'FORTUNE_TALISMAN'},cd:{kind:'q',n:1}})],
  2:['얼음 원소의 영향을 받은 적에게 일반 공격 피해가 50% 증가한다.',dmg(50,{kind:'na',if:{tAura:'얼음'}})],
  4:['도액 부적 표식이 있는 적의 공격력이 25% 감소한다.',{t:'enemyStat',key:'atk',pct:-25,if:{tStatus:'FORTUNE_TALISMAN'}}],
  6:['선법·구고도액 발동 시 쓰러진 파티원을 모두 일으켜 HP를 50%까지 회복시킨다(전투마다 1회).',cast('q',{reviveAll:{pct:50}})]},
 LIYUE_NINGGUANG:{
  1:['일반 공격이 적에게 명중하면 다른 적 최대 2명에게도 공격력 35%의 바위 원소 피해를 준다.',hit({kind:'na',hit:{k:.35,el:'바위',max:2,pick:'others'}})],
  2:['천권 붕옥 발동 시 선기 병풍의 재사용 대기가 바로 끝난다.',cast('q',{cdSet:{kind:'e',to:0}})],
  4:['선기 병풍이 있는 동안 파티가 받는 피해가 15% 줄어든다.',team({taken:-15,while:{field:'JADE_SCREEN'}})],
  6:['천권 붕옥 발동 시 별 7개가 더 떨어져 각각 공격력 28%의 바위 원소 피해를 준다.',cast('q',{hit:{k:.28,el:'바위',pick:'living',times:7}})]},
 LIYUE_KEQING:{
  1:['성신 회귀를 쓰면 적 최대 3명에게 공격력 50%의 번개 원소 범위 피해를 준다.',cast('e',{hit:{k:.5,el:'번개',max:3,pick:'all'}})],
  2:['번개 원소의 영향을 받은 적을 일반 공격하면 천가 순유 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'na',once:'turn',if:{tAura:'번개'},cd:{kind:'q',n:1}})],
  4:['번개 원소 반응을 일으키면 2라운드 동안 공격력이 25% 증가한다.',hit({if:{reaction:true,el:'번개'},buff:{who:'self',id:'CONS_KEQING_4',rounds:2,mods:{atk:{pct:25}}}})],
  6:['치명타 확률이 15% 증가한다. 일반 공격·원소전투 스킬·원소폭발을 쓸 때마다 2라운드 동안 번개 원소 피해가 각각 15% 증가한다(최대 45%).',stat('crit',{flat:15}),cast('na',{buff:{who:'self',id:'CONS_KEQING_6_NA',rounds:2,consDmg:{pct:15,el:'번개'}}}),cast('e',{buff:{who:'self',id:'CONS_KEQING_6_E',rounds:2,consDmg:{pct:15,el:'번개'}}}),cast('q',{buff:{who:'self',id:'CONS_KEQING_6_Q',rounds:2,consDmg:{pct:15,el:'번개'}}})]},
 LIYUE_GAMING:{
  1:['찬란한 금예춤 발동 시 HP를 25% 회복하고, 2라운드 동안 받는 피해가 20% 줄어든다.',cast('q',{heal:{stat:'maxHp',k:.25,who:'self'},buff:{who:'self',id:'CONS_GAMING_1',rounds:2,consTaken:-20}})],
  2:['치유를 받아 HP가 가득 차면 2라운드 동안 공격력이 30% 증가한다.',{t:'onHealed',overflow:true,buff:{who:'self',id:'CONS_GAMING_2',rounds:2,mods:{atk:{pct:30}}}}],
  4:['도약하는 영물이 적을 맞히면 찬란한 금예춤 재사용 대기가 1턴 줄어든다(턴마다 1회).',hit({kind:'e',once:'turn',cd:{kind:'q',n:1}})],
  6:['도약하는 영물의 치명타 확률이 30%, 치명타 피해가 60% 증가한다.',stat('crit',{flat:30},{kind:'e'}),stat('critDmg',{flat:60},{kind:'e'})]},
 LIYUE_GANYU:{
  1:['감우의 공격에 맞은 적은 2라운드 동안 받는 얼음 원소 피해가 15% 증가한다. 공격이 명중하면 쏟아지는 천화 재사용 대기가 1턴 줄어든다(라운드마다 1회).',hit({debuff:{who:'target',id:'CONS_GANYU_1',rounds:2,vuln:{pct:15,el:'얼음'}}}),hit({once:'round',cd:{kind:'q',n:1}})],
  2:['산과 강의 기린 흔적을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  4:['쏟아지는 천화 영역이 있는 동안 적이 받는 피해가 20% 증가한다.',team({dmg:{pct:20},while:{field:'CELESTIAL_SHOWER'}})],
  6:['산과 강의 기린 흔적을 쓴 뒤 다음 일반 공격이 서리꽃 화살이 되어 적 최대 3명에게 공격력 250%의 얼음 원소 피해를 더 준다.',cast('e',{buff:{who:'self',id:'CONS_GANYU_6',rounds:3}}),hit({kind:'na',if:{status:'CONS_GANYU_6'},consume:'CONS_GANYU_6',hit:{k:2.5,el:'얼음',max:3,pick:'all'}})]},
 LIYUE_XINGQIU:{
  1:['우렴검이 1개 더 생긴다.',cast('e',{field:{kind:'RAIN_SWORDS',add:{stacks:1}}})],
  2:['고화검·재우유홍이 1라운드 더 오래 이어지고, 검의 비에 맞은 적은 2라운드 동안 받는 물 원소 피해가 15% 증가한다.',cast('q',{field:{kind:'RAINCUTTER',rounds:1}}),hit({kind:'q',debuff:{who:'target',id:'CONS_XINGQIU_2',rounds:2,vuln:{pct:15,el:'물'}}})],
  4:['고화검·재우유홍이 있는 동안 고화검·화우농산의 피해가 50% 증가한다.',dmg(50,{kind:'e',if:{field:'RAINCUTTER'}})],
  6:['검의 비 피해가 60% 증가하고, 검의 비가 적에게 명중하면 고화검·재우유홍 재사용 대기가 1턴 줄어든다(라운드마다 1회).',dmg(60,{kind:'q'}),hit({kind:'q',once:'round',cd:{kind:'q',n:1}})]},
 LIYUE_HUTAO:{
  1:['피안접무 상태에서 일반 공격 피해가 30% 증가한다.',dmg(30,{kind:'na',if:{status:'PARAMITA_PAPILIO'}})],
  2:['피안접무 상태의 일반 공격과 평안의 서가 적에게 혈매향을 남긴다: 2라운드 동안 라운드가 끝날 때마다 호두 최대 HP 10%의 불 원소 피해.',hit({kind:'na',if:{status:'PARAMITA_PAPILIO'},debuff:{who:'target',id:'CONS_HUTAO_BLOSSOM',rounds:2,tick:{stat:'maxHp',k:.1,el:'PYRO'}}}),hit({kind:'q',debuff:{who:'target',id:'CONS_HUTAO_BLOSSOM',rounds:2,tick:{stat:'maxHp',k:.1,el:'PYRO'}}})],
  4:['혈매향이 남은 적을 공격하는 파티원의 치명타 확률이 15% 증가한다.',team({stat:{key:'crit',flat:15},if:{tStatus:'CONS_HUTAO_BLOSSOM'}})],
  6:['HP가 25% 이하로 떨어지거나 쓰러질 피해를 받으면 쓰러지지 않고, 2라운드 동안 받는 피해가 60% 줄고 치명타 확률이 100% 증가한다(전투마다 1회).',{t:'lowHp',below:25,lethal:true,buff:{who:'self',id:'CONS_HUTAO_6',rounds:2,consTaken:-60,mods:{crit:{flat:100}}}}]},
 LIYUE_XIANGLING:{
  1:['누룽지에게 맞은 적은 2라운드 동안 받는 불 원소 피해가 20% 증가한다.',hit({kind:'e',debuff:{who:'target',id:'CONS_XIANGLING_1',rounds:2,vuln:{pct:20,el:'불'}}})],
  2:['일반 공격이 적에게 내폭 효과를 남겨, 라운드가 끝날 때 공격력 75%의 불 원소 피해로 터진다.',hit({kind:'na',debuff:{who:'target',id:'CONS_XIANGLING_2',rounds:1,tick:{stat:'atk',k:.75,el:'PYRO'}}})],
  4:['화륜이 1라운드 더 오래 이어진다.',cast('q',{field:{kind:'PYRONADO',rounds:1}})],
  6:['화륜이 이어지는 동안 파티 전체의 불 원소 피해가 25% 증가하고, 화륜의 피해가 50% 증가한다.',team({dmg:{pct:25,el:'불'},while:{field:'PYRONADO'}}),dmg(50,{kind:'q'})]},
 LIYUE_XIANYUN:{
  1:['아침 학구름을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['하늘다리를 받은 파티원이 주는 피해가 40% 증가하고, 아침 학구름을 쓰면 2라운드 동안 한운의 공격력이 20% 증가한다.',team({dmg:{pct:40},if:{status:'SKY_LADDER'}}),cast('e',{buff:{who:'self',id:'CONS_XIANYUN_2',rounds:2,mods:{atk:{pct:20}}}})],
  4:['아침 학구름을 쓰면 파티 전체를 한운 공격력 50%만큼 회복시킨다.',cast('e',{heal:{stat:'atk',k:.5,who:'all'}})],
  6:['밤을 수놓는 대나무별 발동 후 2라운드 동안 아침 학구름에 재사용 대기가 생기지 않고, 하늘다리를 받은 파티원의 치명타 피해가 70% 증가한다.',cast('q',{buff:{who:'self',id:'CONS_XIANYUN_6',rounds:2}}),cast('e',{if:{status:'CONS_XIANYUN_6'},cdSet:{kind:'e',to:0}}),team({stat:{key:'critDmg',flat:70},if:{status:'SKY_LADDER'}})]},
 LIYUE_LANYAN:{
  1:['현조의 날갯짓이 같은 적에게 제비 고리를 하나 더 던져 공격력 80%의 바람 원소 피해를 준다.',cast('e',{hit:{k:.8,el:'바람'}})],
  2:['현조 보호막을 가진 파티원이 일반 공격을 하면 보호막이 처음 크기의 40%만큼 회복된다(파티원마다 라운드에 1회).',{t:'teamHit',self:true,kind:'na',once:'attackerRound',shieldRefresh:{source:'LIYUE_LANYAN_E',pct:40}}],
  4:['달을 밟는 제비 발동 후 2라운드 동안 파티 전체의 원소 반응 피해가 30% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_LANYAN_4',rounds:2,consDmg:{pct:30,kind:'reaction'}}})],
  6:['현조의 날갯짓을 재사용 대기 없이 한 번 더 사용할 수 있고, 보호막 흡수량이 50% 증가한다.',charge('e'),{t:'shieldPow',pct:50}]},
 LIYUE_XIAO:{
  1:['풍륜양립을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['나자의 춤의 재사용 대기가 1턴 줄어든다.',cd('q')],
  4:['HP가 50% 미만일 때 방어력이 100% 증가한다.',stat('def',{pct:100},{if:{hpBelow:50}})],
  6:['나자의 춤 상태에서는 풍륜양립에 재사용 대기가 생기지 않고, 주는 모든 피해가 30% 증가한다.',cast('e',{if:{status:'BANE_OF_ALL_EVIL'},cdSet:{kind:'e',to:0}}),dmg(30,{if:{status:'BANE_OF_ALL_EVIL'}})]},
 LIYUE_SHENHE:{
  1:['위령 소환 구사술을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['신녀 강령 비결이 1라운드 더 오래 이어지고, 영역이 있는 동안 파티원이 주는 얼음 원소 피해의 치명타 피해가 30% 증가한다.',cast('q',{field:{kind:'DIVINE_MAIDEN',rounds:1}}),team({stat:{key:'critDmg',flat:30,el:'얼음'},while:{field:'DIVINE_MAIDEN'}})],
  4:['얼음의 깃이 남아 있는 동안 파티원이 얼음 원소 피해를 줄 때마다 서리의 주문을 1스택 얻는다(최대 20). 위령 소환 구사술은 스택을 모두 써서 1스택당 피해가 5% 증가한다.',{t:'teamHit',self:true,el:'얼음',while:{field:'ICY_QUILL'},stack:{id:'CONS_SHENHE_4',max:20}},dmg(0,{kind:'e',perStack:5,stackId:'CONS_SHENHE_4'}),cast('e',{clear:'CONS_SHENHE_4'})],
  6:['얼음의 깃이 2개 더 생기고, 얼음의 깃이 남아 있는 동안 파티 전체의 얼음 원소 피해가 40% 증가한다.',cast('e',{field:{kind:'ICY_QUILL',add:{stacks:2}}}),team({dmg:{pct:40,el:'얼음'},while:{field:'ICY_QUILL'}})]},
 LIYUE_XINYAN:{
  1:['치명타를 내면 2라운드 동안 속도가 12, 일반 공격 피해가 20% 증가한다.',hit({if:{crit:true},buff:{who:'self',id:'CONS_XINYAN_1',rounds:2,mods:{spd:{flat:12}},consDmg:{pct:20,kind:'na'}}})],
  2:['반항의 피치카토의 물리 피해 치명타 확률이 100% 증가하고, 발동 시 신염 방어력 210%의 보호막을 얻는다(2라운드).',stat('crit',{flat:100},{kind:'q',el:'물리'}),cast('q',{shield:{stat:'def',k:2.1,who:'self',rounds:2}})],
  4:['정열의 연주에 맞은 적은 3라운드 동안 받는 물리 피해가 25% 증가한다.',hit({kind:'e',debuff:{who:'target',id:'CONS_XINYAN_4',rounds:3,vuln:{pct:25,el:'물리'}}})],
  6:['공격력이 방어력의 50%만큼 증가하고, 일반 공격 피해가 30% 증가한다.',stat('atk',{from:'def',k:.5}),dmg(30,{kind:'na'})]},
 LIYUE_TARTAGLIA:{
  1:['마왕 무장·광란의 재사용 대기가 1턴 줄어든다.',cd('e')],
  2:['단류 상태의 적을 쓰러뜨리면 극악기·진멸섬 재사용 대기가 1턴 줄어든다.',{t:'onKill',if:{tStatus:'RIPTIDE'},cd:{kind:'q',n:1}}],
  4:['근접 상태일 때 라운드가 끝날 때마다 단류 상태의 모든 적에게 공격력 60%의 물 원소 피해를 준다.',{t:'roundEnd',if:{status:'MELEE_FORM'},hit:{k:.6,el:'물',max:99,pick:'status:RIPTIDE'}}],
  6:['근접 상태에서 극악기·진멸섬을 쓰면 마왕 무장·광란의 재사용 대기가 바로 끝난다. 극악기·진멸섬의 피해가 50% 증가한다.',cast('q',{if:{wasStatus:'MELEE_FORM'},cdSet:{kind:'e',to:0}}),dmg(50,{kind:'q'})]},
 LIYUE_YANFEI:{
  1:['단화인을 지닌 채 주는 피해가 30% 증가한다.',dmg(30,{if:{status:'SCARLET_SEAL'}})],
  2:['HP가 50% 미만인 적을 공격할 때 치명타 확률이 30% 증가한다.',stat('crit',{flat:30},{if:{tHpBelow:50}})],
  4:['계약 성립 발동 시 최대 HP 45%의 보호막을 얻는다(2라운드, 불 원소 피해 흡수 250%).',cast('q',{shield:{stat:'maxHp',k:.45,who:'self',rounds:2,absorb:{불:.4}}})],
  6:['단화인을 1개 더 지닐 수 있고, 단화인을 지닌 채 주는 피해가 추가로 60% 증가한다.',cast(['e','q'],{status:{id:'SCARLET_SEAL',add:{stacks:1}}}),dmg(60,{if:{status:'SCARLET_SEAL'}})]},
 LIYUE_YELAN:{
  1:['뒤얽힌 생명줄을 재사용 대기 없이 한 번 더 사용할 수 있다.',charge('e')],
  2:['던져진 영롱이 함께 공격할 때 화살 한 발이 더 날아가 야란 최대 HP 14%의 물 원소 피해를 준다(라운드마다 1회).',hit({kind:'q',once:'round',hit:{k:.14,stat:'maxHp',el:'물'}})],
  4:['뒤얽힌 생명줄을 쓰면 표식이 터진 적 1명마다 파티 전체의 최대 HP가 10% 늘어난다(전투가 끝날 때까지, 최대 40%).',cast('e',{teamMaxHp:{pct:10,max:40}})],
  6:['심오하고 영롱한 주사위 발동 후 2라운드 동안 일반 공격이 타파의 화살이 되어, 대상과 다른 적 1명에게 야란 최대 HP 20%의 물 원소 피해를 더 준다.',cast('q',{buff:{who:'self',id:'CONS_YELAN_6',rounds:2}}),hit({kind:'na',if:{status:'CONS_YELAN_6'},hit:{k:.2,stat:'maxHp',el:'물'}}),hit({kind:'na',if:{status:'CONS_YELAN_6'},hit:{k:.2,stat:'maxHp',el:'물',max:1,pick:'others'}})]},
 LIYUE_YUNJIN:{
  1:['선운개상의 재사용 대기가 1턴 줄어든다.',cd('e')],
  2:['절벽을 깎는 깃발 발동 후 2라운드 동안 파티 전체의 일반 공격 피해가 25% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_YUNJIN_2',rounds:2,consDmg:{pct:25,kind:'na'}}})],
  4:['보호막의 보호를 받는 동안 방어력이 25% 증가한다.',stat('def',{pct:25},{if:{shielded:true}})],
  6:['절벽을 깎는 깃발이 이어지는 동안 파티원의 속도가 12, 일반 공격 피해가 30% 증가한다.',team({stat:{key:'spd',flat:12},while:{field:'FLYING_CLOUD_FLAG'}}),team({dmg:{pct:30,kind:'na'},while:{field:'FLYING_CLOUD_FLAG'}})]},
 LIYUE_YAOYAO:{
  1:['월계의 하얀 무가 터지면 2라운드 동안 파티 전체의 풀 원소 피해가 15% 증가한다.',hit({kind:'e',buff:{who:'all',id:'CONS_YAOYAO_1',rounds:2,consDmg:{pct:15,el:'풀'}}})],
  2:['월계의 하얀 무가 적에게 맞으면 달빛 아래 떨어지는 옥구슬 재사용 대기가 1턴 줄어든다(라운드마다 1회).',hit({kind:'e',once:'round',cd:{kind:'q',n:1}})],
  4:['원소전투 스킬이나 원소폭발을 쓰면 2라운드 동안 원소 반응 피해가 40% 증가한다.',cast(['e','q'],{buff:{who:'self',id:'CONS_YAOYAO_4',rounds:2,consDmg:{pct:40,kind:'reaction'}}})],
  6:['월계가 있는 동안 라운드가 끝날 때마다 초특대·짱짱무가 떨어져 모든 적에게 공격력 75%의 풀 원소 피해를 주고, 파티 전체를 요요 최대 HP 7.5%만큼 회복시킨다.',{t:'roundEnd',while:{field:'YUEGUI_THROWING'},hit:{k:.75,el:'풀',max:99,pick:'all'},heal:{stat:'maxHp',k:.075,who:'all'}}]},
 LIYUE_ZHONGLI:{
  1:['지핵의 석주가 둘이 되어 석주의 피해가 100% 증가한다.',dmg(100,{src:'FIELD'})],
  2:['천성이 떨어질 때 파티 전체에게 옥홀 방패(종려 최대 HP 20%, 2라운드)를 씌운다.',cast('q',{shield:{stat:'maxHp',k:.2,who:'all',rounds:2,source:'LIYUE_ZHONGLI_E',extra:{ignoreForcedMove:true}}})],
  4:['천성의 석화가 한 차례 더 이어진다.',cast('q',{statusExtend:{id:'LIYUE_PETRIFY',rounds:1}})],
  6:['옥홀 방패가 피해를 받으면 받은 피해의 40%만큼 그 파티원의 HP를 회복시킨다(한 번에 최대 HP의 8%까지).',{t:'shieldHeal',source:'LIYUE_ZHONGLI_E',pct:40,cap:8}]},
 LIYUE_CHONGYUN:{
  1:['일반 공격이 명중하면 얼음 칼날 3개가 날아가 적 최대 3명에게 각각 공격력 50%의 얼음 원소 피해를 준다(턴마다 1회).',hit({kind:'na',once:'turn',hit:{k:.5,el:'얼음',max:3,pick:'all'}})],
  2:['영도·중첩의 서리 영역이 있는 동안 파티원이 원소전투 스킬이나 원소폭발을 쓰면 그 재사용 대기가 1턴 줄어든다.',{t:'teamCast',kind:['e','q'],while:{field:'CHONGYUN_FROST'},n:1}],
  4:['얼음 원소의 영향을 받은 적을 공격하면 영도·떨어지는 별 재사용 대기가 1턴 줄어든다(라운드마다 1회).',hit({once:'round',if:{tAura:'얼음'},cd:{kind:'q',n:1}})],
  6:['영도·떨어지는 별의 피해가 50% 증가하고, 영검이 하나 더 떨어져 공격력 55%의 얼음 원소 피해를 준다.',dmg(50,{kind:'q'}),cast('q',{hit:{k:.55,el:'얼음',pick:'living'}})]},
 LIYUE_ZIBAI:{
  1:['천지일체를 쓰면 시간의 빛이 즉시 100이 된다. 세월의 틈새 동안 원소 반응 피해가 60% 증가한다.',cast('e',{card:'LIYUE_ZIBAI_E',status:{id:'AGE_GAP',set:{light:100}}}),dmg(60,{kind:'reaction',if:{status:'AGE_GAP'}})],
  2:['세월의 틈새 동안 파티 전체의 원소 반응 피해가 30% 증가하고, 백마 돌격의 피해가 60% 증가한다.',team({dmg:{pct:30,kind:'reaction'},while:{status:'AGE_GAP'}}),dmg(60,{card:'LIYUE_ZIBAI_E_CHARGE'})],
  4:['백마 돌격이 명중하면 다음 일반 공격이 자백 방어력 150%의 바위 원소 피해를 한 번 더 준다.',hit({card:'LIYUE_ZIBAI_E_CHARGE',buff:{who:'self',id:'CONS_ZIBAI_4',rounds:3}}),hit({kind:'na',if:{status:'CONS_ZIBAI_4'},consume:'CONS_ZIBAI_4',hit:{k:1.5,stat:'def',el:'바위'}})],
  6:['세월의 틈새 동안 원소 반응 피해가 추가로 80% 증가하고, 백마 돌격을 쓸 때마다 시간의 빛을 30 돌려받는다.',dmg(80,{kind:'reaction',if:{status:'AGE_GAP'}}),cast('e',{card:'LIYUE_ZIBAI_E_CHARGE',status:{id:'AGE_GAP',add:{light:30},max:{light:100}}})]},
 TRAVELER_ANEMO:{
  1:['회오리 검이 주변 적을 끌어당겨, 적 최대 3명에게 공격력 60%의 바람 원소 피해를 더 준다.',cast('e',{hit:{k:.6,el:'바람',max:3,pick:'all'}})],
  2:['격동의 바람의 재사용 대기가 1턴 줄고, 회오리 검의 피해가 30% 증가한다.',cd('q'),dmg(30,{kind:'e'})],
  4:['회오리 검을 쓰면 2라운드 동안 받는 피해가 25% 줄어든다.',cast('e',{buff:{who:'self',id:'CONS_TRAVELER_A4',rounds:2,consTaken:-25}})],
  6:['격동의 바람에 맞은 적은 3라운드 동안 받는 바람·불·물·얼음·번개 피해가 40% 증가한다.',cast('q',{debuff:{who:'all',max:4,id:'CONS_TRAVELER_A6',rounds:3,vuln:{pct:40,el:ELEMENTAL}}})]},
 TRAVELER_GEO:{
  1:['첩첩산중 발동 후 3라운드 동안 파티 전체의 치명타 확률이 15% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_TRAVELER_G1',rounds:3,mods:{crit:{flat:15}}}})],
  2:['성운검이 한 번 더 폭발해 적 최대 3명에게 공격력 100%의 바위 원소 피해를 준다.',cast('e',{hit:{k:1,el:'바위',max:3,pick:'all'}})],
  4:['첩첩산중의 재사용 대기가 1턴 줄어든다.',cd('q')],
  6:['원소전투 스킬과 원소폭발의 피해가 40% 증가하고, 첩첩산중 발동 후 3라운드 동안 파티가 받는 피해가 20% 줄어든다.',dmg(40,{kind:['e','q']}),cast('q',{buff:{who:'all',id:'CONS_TRAVELER_G6',rounds:3,consTaken:-20}})]},
 ISEKAI:{
  1:['약점 간파를 받은 적에게 파티 전체가 주는 피해가 25% 더 증가한다.',team({dmg:{pct:25},if:{tStatus:'STATUS_ISEKAI_EXPOSED'}})],
  2:['함께하는 일격의 재사용 대기가 1턴 줄고, 쓸 때마다 주인공의 HP를 15% 회복한다.',cd('q'),cast('q',{heal:{stat:'maxHp',k:.15,who:'self'}})],
  4:['전투가 시작되면 파티 전체가 주인공 방어력 100%의 보호막을 얻는다(2라운드).',{t:'start',shield:{stat:'def',k:1,who:'all',rounds:2}}],
  6:['함께하는 일격 후 2라운드 동안 파티 전체의 공격력이 30%, 치명타 확률이 15% 증가한다.',cast('q',{buff:{who:'all',id:'CONS_ISEKAI_6',rounds:2,mods:{atk:{pct:30},crit:{flat:15}}}})]}
};
// ---- reads ----
const nodeText=(key,n)=>{const N=NAMES[key];if(n===3||n===5){const kind=N[5][n===3?0:1],name=kind==='q'?N[4]:N[3];return name+'의 특성 레벨 +3 (최대 Lv.13)';}return EFFECTS[key]?.[n]?.[0]||'';};
const fxCache=new Map(),NONE=Object.freeze([]);
function fxList(key,level){
 const id=key+':'+level;let v=fxCache.get(id);if(v)return v;v=[];
 // ck = whose constellation this is (fx.key is the stat an effect changes).
 // n = the node (1/2/4/6). 0.15.6: an effect's own amount `n` (cd(), teamCast: turns cut) is kept as `cut`; it used to be
 // overwritten by the node, so 이세계인 C2 cut its burst by 2 turns (3 → 1, back every turn) and 케이아 C6 by 6.
 for(const n of [1,2,4,6])if(n<=level)(EFFECTS[key]?.[n]||[]).slice(1).forEach((fx,i)=>v.push(Object.freeze({...fx,...(fx.n!==undefined?{cut:fx.n}:{}),n,ck:key,uid:key+':'+n+':'+i})));
 fxCache.set(id,v);return v;
}
api.constellationsV01411={names:copy(NAMES),effects:Object.fromEntries(Object.entries(EFFECTS).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([n,x])=>[n,{text:x[0],fx:copy(x.slice(1))}]))])),nodeText};
P.constellationKey=function(id){
 if(id!==PLAYER)return NAMES[id]?id:null;
 const g=this.s.global;if(g.STORY_ROUTE_ID==='ROUTE_ISEKAI')return 'ISEKAI';
 return /PLAYER_TRAVELER_GEO_/.test(String(g.PLAYER_SKILL_CARD_IDS||''))?'TRAVELER_GEO':'TRAVELER_ANEMO';
};
P.constellationTalentKinds=function(id){const N=NAMES[this.constellationKey(id)];return N?{c3:N[5][0],c5:N[5][1]}:{c3:'e',c5:'q'};};
P.constellationInfo=function(id){
 const key=this.constellationKey(id),N=NAMES[key];if(!N)return null;
 return {key,group:N[0],rarity:N[1],talentNames:{na:N[2],e:N[3],q:N[4]},nodes:N[6].map((name,i)=>({n:i+1,name,text:nodeText(key,i+1)}))};
};
// A fighter (or a character id). 0.15.3: a fighter brought from another adventurer's journey (다인 모드) carries its own
// constellation (consSnapshot {key, level}); every other fighter reads this journey's.
P.consFx=function(x){const actor=x&&typeof x==='object'?x:null,id=actor?actor.source:x;if(!id||!this.s.runtime)return NONE;
 const own=actor?.consSnapshot;if(own){const lv=Math.max(0,Math.min(6,Number(own.level)||0));return lv&&NAMES[own.key]?fxList(own.key,lv):NONE;}
 const key=this.constellationKey(id),lv=key?this.constellationLevel(id):0;return lv?fxList(key,lv):NONE;};
// ---- interpreter ----
const EL={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'};
const elName=e=>EL[e]||e||'물리',ELEMS=['불','물','얼음','번개','바람','바위','풀'];
const SUMMON=/^(FIELD|OBJECT|ASSIST|FOLLOWUP|BUBBLE|MINE|LIGHTFALL_EXPLOSION|SHIELD_BREAK|COUNTER)$/;
const live=s=>!!s&&(s.rounds===null||s.rounds===undefined||!Number.isFinite(s.rounds)||s.rounds>0);
const st=(a,id)=>(a?.statuses||[]).find(s=>s.id===id&&live(s));
const elMatch=(spec,el)=>spec===undefined||spec===null?true:spec==='elem'?ELEMS.includes(el):Array.isArray(spec)?spec.includes(el):spec===el;
const kindsOf=k=>[].concat(k);
function matchHit(f,ctx){
 if(!f)return true;
 if(f.kind){const kinds=kindsOf(f.kind);if(kinds.includes('reaction')){if(!/^REACTION/.test(ctx?.o?.sourceKind||''))return false;}else if(!kinds.includes(ctx?.kind))return false;}
 if(f.src&&!(f.src==='summon'?SUMMON.test(ctx?.o?.sourceKind||''):ctx?.o?.sourceKind===f.src))return false;
 if(f.el!==undefined&&!elMatch(f.el,ctx?.el))return false;
 if(f.card&&ctx?.o?.card!==f.card)return false;
 return true;
}
const needsHit=f=>!!(f&&(f.kind||f.src||f.el!==undefined||f.card));
const cardKind=id=>!id?null:id==='PLAYER_BASIC_ATTACK'?'na':/_E(_CHARGE)?$/.test(id)?'e':/_Q$/.test(id)?'q':null;
const old=Object.fromEntries(['combatDamageMultiplier','combatStat','damage','applyDamage','executeCard','basicHit','heal','shield','newRound','roundEnd','addCombatStatus'].map(k=>[k,P[k]]));
P.consAllies=function(side='ALLY'){return (this.s.runtime?.actors||[]).filter(x=>x.side===side&&x.hp>0&&x.source);};
P.consCardOwner=function(id){return /^PLAYER_/.test(String(id))?PLAYER:this.tables['08_SKILL_CARD_DB']?.get(id)?.[2]||null;};
P.consCond=function(c,ctx,subject,owner){
 if(!c)return true;const b=this.s.runtime,t=ctx?.t;
 for(const [k,v]of Object.entries(c)){
  if(k==='tAura'){if(!t)return false;const list=this.auraList?this.auraList(t).map(x=>x.element):[t.aura];if(v==='any'?!list.some(Boolean):!list.includes(v))return false;}
  else if(k==='tHpBelow'){if(!t||t.hp/t.maxHp*100>=v)return false;}
  else if(k==='tHpAbove'){if(!t||t.hp/t.maxHp*100<=v)return false;}
  else if(k==='hpBelow'){if(!subject||subject.hp/subject.maxHp*100>=v)return false;}
  else if(k==='hpAbove'){if(!subject||subject.hp/subject.maxHp*100<=v)return false;}
  else if(k==='tStatus'){if(!st(t,v))return false;}
  else if(k==='status'){if(!st(subject,v))return false;}
  else if(k==='noStatus'){if(st(subject,v))return false;}
  else if(k==='wasStatus'){if(!ctx?.pre?.has(v))return false;}
  else if(k==='field'){if(!b?.fields?.some(f=>f.kind===v&&f.actor===owner?.id&&!f.done))return false;}
  else if(k==='noField'){if(b?.fields?.some(f=>f.kind===v&&f.actor===owner?.id&&!f.done))return false;}
  else if(k==='shielded'){if(((subject?.shields||[]).some(s=>s.value>0))!==v)return false;}
  else if(k==='crit'){if(!!ctx?.crit!==v)return false;}
  else if(k==='reaction'){if(!!ctx?.reaction!==v)return false;}
  else if(k==='el'){if(!ctx||!elMatch(v,ctx.el))return false;}
  else return false;
 }
 return true;
};
P.consTop=function(a){const s=this._consStack;const top=s?.[s.length-1];return top&&top.a===a?top:null;};
// Damage: the attacker's own bonuses, bonuses the party gets from someone's constellation, debuffs on the target and
// damage the target's side takes less of.
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);const b=this.s.runtime;if(!b||!a||!t)return n;
 const ctx=/^REACTION/.test(o.sourceKind||'')?{a,t,el:elName(e),o,kind:null,reaction:true}:this.consTop(a)||{a,t,el:elName(e),o,kind:this.premiumHitKind(a,o)};
 if(a.side==='ALLY'&&a.source){
  let add=0;
  for(const fx of this.consFx(a))if(fx.t==='dmg'&&matchHit(fx,ctx)&&this.consCond(fx.if,ctx,a,a))add+=fx.perStack?fx.perStack*(Number(st(a,fx.stackId)?.stacks)||0):fx.pct;
  for(const owner of this.consAllies(a.side))for(const fx of this.consFx(owner))if(fx.t==='team'&&fx.dmg&&matchHit(fx.dmg,ctx)&&this.consCond(fx.while,ctx,owner,owner)&&this.consCond(fx.if,ctx,a,owner))add+=fx.dmg.pct;
  for(const s of a.statuses||[])if(s.consDmg&&live(s)&&!s.consSpent&&matchHit(s.consDmg,ctx)){add+=s.consDmg.pct;if(s.consDmg.once&&this._consStack?.length)s.consSpent=true;}
  if(add)n*=1+add/100;
 }
 if(a.side!==t.side){let vuln=0;for(const s of t.statuses||[])if(s.vuln&&live(s)&&elMatch(s.vuln.el,ctx.el))vuln+=s.vuln.pct;if(vuln)n*=1+vuln/100;}
 if(t.side==='ALLY'&&a.side!==t.side&&t.source){
  let taken=0;
  for(const fx of this.consFx(t))if(fx.t==='taken'&&this.consCond(fx.if,ctx,t,t))taken+=fx.pct;
  for(const owner of this.consAllies(t.side))for(const fx of this.consFx(owner))if(fx.t==='team'&&typeof fx.taken==='number'&&this.consCond(fx.while,ctx,owner,owner)&&this.consCond(fx.if,ctx,t,owner))taken+=fx.taken;
  for(const s of t.statuses||[])if(typeof s.consTaken==='number'&&live(s))taken+=s.consTaken;
  if(taken)n*=Math.max(.05,1+taken/100);
 }
 return n;
};
P.combatStat=function(a,key){
 let n=old.combatStat.call(this,a,key);const b=this.s.runtime;if(!b||!a)return n;
 if(a.side==='ALLY'&&a.source){
  const ctx=this.consTop(a);let pct=0,flat=0;
  for(const fx of this.consFx(a))if(fx.t==='stat'&&fx.key===key&&(!needsHit(fx)||ctx&&matchHit(fx,ctx))&&this.consCond(fx.if,ctx,a,a)){pct+=fx.pct||0;flat+=fx.flat||0;if(fx.from)flat+=this.combatStat(a,fx.from)*fx.k;}
  for(const owner of this.consAllies(a.side))for(const fx of this.consFx(owner))if(fx.t==='team'&&fx.stat?.key===key&&(!needsHit(fx.stat)||ctx&&matchHit(fx.stat,ctx))&&this.consCond(fx.while,ctx,owner,owner)&&this.consCond(fx.if,ctx,a,owner)){pct+=fx.stat.pct||0;flat+=fx.stat.flat||0;}
  if(pct||flat)n=n*(1+pct/100)+flat;
 }else if(a.side==='ENEMY'){
  let pct=0;for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner))if(fx.t==='enemyStat'&&fx.key===key&&this.consCond(fx.if,{t:a},owner,owner))pct+=fx.pct;
  if(pct)n*=Math.max(.1,1+pct/100);
 }
 return n;
};
P.consOnce=function(fx,owner,ctx){
 if(!fx.once)return true;const b=this.s.runtime,used=b.consOnce||(b.consOnce={});
 const key=fx.uid+'|'+(fx.once==='turn'?owner.id+':'+b.round+':'+(owner.turns||0):fx.once==='round'?b.round:fx.once==='cast'?'c'+(this._consCastSeq||0):fx.once==='attackerRound'?(ctx?.a?.id||'')+':'+b.round:'x');
 if(used[key])return false;used[key]=true;return true;
};
P.consChance=function(fx){return !fx.chance||this.die()<=fx.chance;};
P.consStatValue=function(owner,spec){return this.combatStat(owner,spec.stat||'atk')*Number(spec.k||0);};
P.consWeaponType=function(a){
 if(a?.weaponType)return a.weaponType;
 // A guest's equipment belongs to its own save, never the host's protagonist.
 if(a?.coop)return a.source===PLAYER?null:this.equipmentProficiencies?.(a.source)?.[0]||null;
 const weapon=this.s.inventory.find(i=>i.equip&&i.equipped&&i.owner===a?.source&&i.category==='WEAPON');
 return (weapon&&this.tables['16_EQUIP_DB']?.get(weapon.equip)?.[2])||(a?.source===PLAYER?'한손검':this.equipmentProficiencies?.(a?.source)?.[0])||null;
};
P.consWho=function(owner,who,env={}){
 const allies=this.consAllies(owner.side);
 if(who==='self')return owner.hp>0?[owner]:[];
 if(who==='others')return allies.filter(x=>x!==owner);
 if(who==='lowest')return allies.slice().sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp).slice(0,1);
 if(who==='attacker')return env.attacker&&env.attacker.hp>0?[env.attacker]:[];
 if(who==='melee')return allies.filter(x=>['한손검','양손검','장병기'].includes(this.consWeaponType(x)));
 return allies;
};
P.consLog=function(owner,fx,extra={}){const b=this.s.runtime,N=NAMES[fx.ck];if(!b||!N)return;b.log.push({actor:owner.name,actorId:owner.id,constellation:true,consLevel:fx.n,text:'운명의 자리 · '+N[6][fx.n-1],...extra});};
P.consHit=function(owner,t,h,fx){
 if(!t||t.hp<=0)return false;
 const card=h.card||(cardKind(fx.cardFor)?fx.cardFor:null);
 return this.damage(owner,t,Number(h.k)||0,h.el||'물리',{range:'전장',sureHit:true,sourceKind:'CONSTELLATION',stat:h.stat||'atk',card:card||undefined,consLevel:fx.n});
};
P.consRun=function(fx,owner,env={}){
 const b=this.s.runtime;if(!b||!owner)return;
 const enemies=()=>b.actors.filter(x=>x.side!==owner.side&&x.hp>0);
 const visible=fx.t!=='onHit'&&fx.t!=='teamHit'&&fx.t!=='onHurt'&&fx.t!=='onHealed'&&(fx.hit||fx.heal||fx.shield||fx.reviveAll||fx.buff||fx.debuff||fx.teamMaxHp||fx.cdTeam||fx.conduction);
 if(visible)this.consLog(owner,fx);
 const target=env.target&&env.target.hp>0?env.target:null;
 if(fx.hit){
  const h=fx.hit,pick=h.pick||'target',times=h.times||1;
  for(let i=0;i<times;i++){
   let list;
   if(pick==='target')list=target&&target.hp>0?[target]:[];
   else if(pick==='living')list=enemies().slice(0,1);
   else if(pick==='others')list=enemies().filter(x=>x!==env.target).slice(0,h.max||1);
   else if(pick.startsWith('status:'))list=enemies().filter(x=>st(x,pick.slice(7))).slice(0,h.max||99);
   else list=enemies().slice(0,h.max||99);
   for(const x of list)this.consHit(owner,x,h,{...fx,cardFor:env.card});
  }
 }
 if(fx.heal){const amount=this.consStatValue(owner,fx.heal);for(const x of this.consWho(owner,fx.heal.who,env))this.heal(x,amount,owner.name);}
 if(fx.shield){const s=fx.shield,value=this.consStatValue(owner,s);for(const x of this.consWho(owner,s.who,env))this.shield(x,value,s.source||'CONS:'+owner.source+':'+fx.n,s.rounds,{...(s.absorb?{damageMultipliers:{...s.absorb}}:{}),...(s.extra||{}),consOwner:owner.id});}
 if(fx.buff){const s=fx.buff;for(const x of this.consWho(owner,s.who,env)){const extra={actor:owner.id,cons:true};if(s.mods)extra.mods=copy(s.mods);if(s.consDmg)extra.consDmg={...s.consDmg};if(typeof s.consTaken==='number')extra.consTaken=s.consTaken;const prev=st(x,s.id);if(prev&&s.id==='DILUC_INFUSION'&&Number.isFinite(prev.rounds)&&prev.rounds>=s.rounds)continue;if(prev&&prev.consSpent)delete prev.consSpent;this.addCombatStatus(x,s.id,s.rounds??null,extra);}}
 if(fx.stack){const s=fx.stack,prev=st(owner,s.id),stacks=Math.min(s.max||99,(Number(prev?.stacks)||0)+1),mods=s.mods?Object.fromEntries(Object.entries(s.mods).map(([k,v])=>[k,{pct:(v.pct||0)*stacks,flat:(v.flat||0)*stacks}])):undefined;this.addCombatStatus(owner,s.id,s.rounds??null,{stacks,actor:owner.id,cons:true,...(mods?{mods}:{})});}
 if(fx.clear)owner.statuses=(owner.statuses||[]).filter(s=>s.id!==fx.clear);
 if(fx.consume)owner.statuses=(owner.statuses||[]).filter(s=>s.id!==fx.consume);
 if(fx.debuff){const s=fx.debuff,list=s.who==='target'?(target?[target]:enemies().slice(0,1)):enemies().slice(0,s.max||99);
  for(const x of list){const extra={actor:owner.id,cons:true};if(s.vuln)extra.vuln={...s.vuln};if(s.mods)extra.mods=copy(s.mods);if(s.value!==undefined)extra.value=s.value;
   if(s.tick){extra.tickDamage=round(this.consStatValue(owner,s.tick));extra.element=s.tick.el||'PHYSICAL';}
   const added=this.addCombatStatus(x,s.id,s.rounds,extra);
   // A damage-over-time mark goes off exactly `rounds` times, starting at the end of this round.
   if(s.tick)added.createdRound=b.round-1;}}
 if(fx.cd){const n=fx.cd.n||1;for(const id of Object.keys(owner.cooldowns||{}))if(cardKind(id)===fx.cd.kind&&this.consCardOwner(id)===owner.source)owner.cooldowns[id]=Math.max(0,owner.cooldowns[id]-n);}
 if(fx.cdSet){for(const id of Object.keys(owner.cooldowns||{}))if(cardKind(id)===fx.cdSet.kind&&this.consCardOwner(id)===owner.source)owner.cooldowns[id]=fx.cdSet.to;}
 if(fx.cdTeam){for(const x of this.consAllies(owner.side))if(x!==owner)for(const id of Object.keys(x.cooldowns||{}))if(cardKind(id)===fx.cdTeam.kind)x.cooldowns[id]=Math.max(0,x.cooldowns[id]-(fx.cdTeam.n||1));}
 if(fx.field){const f=b.fields.find(f=>f.kind===fx.field.kind&&f.actor===owner.id&&!f.done);if(f){if(fx.field.rounds&&Number.isFinite(f.rounds))f.rounds+=fx.field.rounds;for(const [k,v]of Object.entries(fx.field.add||{}))f[k]=(Number(f[k])||0)+v;Object.assign(f,fx.field.set||{});}}
 if(fx.status){const s=st(owner,fx.status.id);if(s){if(fx.status.rounds&&Number.isFinite(s.rounds))s.rounds+=fx.status.rounds;for(const [k,v]of Object.entries(fx.status.add||{}))s[k]=(Number(s[k])||0)+v;for(const [k,v]of Object.entries(fx.status.max||{}))s[k]=Math.min(v,Number(s[k])||0);Object.assign(s,fx.status.set||{});}}
 // 0.16.4: a turn-taking status (runtime_status_v01522.js) ends by turns, so the extension adds turns, and the two free turns
 // after it move back with it.
 if(fx.statusExtend){for(const x of enemies())for(const s of x.statuses||[])if(s.id===fx.statusExtend.id&&env.appliedStatuses?.some(v=>v.actor===x&&v.status===s)&&live(s)&&Number.isFinite(s.rounds)){s.rounds+=fx.statusExtend.rounds;if(s.untilTurn){s.untilTurn+=fx.statusExtend.rounds;if(Number.isFinite(x.controlGuard))x.controlGuard+=fx.statusExtend.rounds;}}}
 if(fx.shieldExtend){for(const x of this.consAllies(owner.side))for(const sh of x.shields||[])if(sh.source===fx.shieldExtend.source&&Number.isFinite(sh.rounds))sh.rounds+=fx.shieldExtend.rounds;}
 if(fx.shieldRefresh){const x=env.attacker,sh=(x?.shields||[]).find(s=>s.source===fx.shieldRefresh.source&&s.value>0);if(sh){const cap=Number(sh.initialValue||sh.value);sh.value=Math.min(cap,round(sh.value+cap*fx.shieldRefresh.pct/100));}}
 if(fx.reviveAll){const used=b.consUsed||(b.consUsed={}),key='reviveAll:'+fx.uid;if(!used[key]){const down=b.actors.filter(x=>x.side===owner.side&&x.hp<=0&&x.maxHp>0);if(down.length){used[key]=true;for(const x of down){x.hp=Math.max(1,round(x.maxHp*fx.reviveAll.pct/100));b.log.push({actor:owner.name,actorId:owner.id,target:x.name,targetId:x.id,heal:x.hp,revived:true});}}}}
 if(fx.conduction)for(const x of enemies())x.conduction=Math.max(Number(x.conduction)||0,fx.conduction);
 if(fx.prop)owner[fx.prop.key]=Math.min(fx.prop.max??Infinity,(Number(owner[fx.prop.key])||0)+fx.prop.add);
 if(fx.teamMaxHp){const s=fx.teamMaxHp,count=Math.min(3,enemies().length);for(const x of this.consAllies(owner.side)){const base=x.consBaseMaxHp||(x.consBaseMaxHp=x.maxHp),have=Math.round((x.maxHp/base-1)*100),gain=Math.max(0,Math.min(s.max,have+s.pct*count)-have);if(!gain)continue;const add=round(base*gain/100);x.maxHp+=add;x.hp+=add;}}
};
// ---- hooks ----
P.damage=function(a,t,k,el,o={}){
 const b=this.s.runtime;if(!b||!a||!t)return old.damage.call(this,a,t,k,el,o);
 const ctx={a,t,el:elName(el),o,kind:this.premiumHitKind(a,o)};
 const attach=ELEMS.includes(ctx.el)&&!o.noAura;try{ctx.reaction=attach&&t.hp>0?!!this.reactionFor(t,ctx.el):false;}catch{ctx.reaction=false;}
 const stack=this._consStack||(this._consStack=[]),start=b.log.length,hp=t.hp;stack.push(ctx);
 let landed;try{landed=old.damage.call(this,a,t,k,el,o);}finally{stack.pop();}
 if(this.s.runtime!==b)return landed;
 if(a.statuses?.some(s=>s.consSpent))a.statuses=a.statuses.filter(s=>!s.consSpent);
 if(!landed||a.side!=='ALLY'||!a.source||o.sourceKind==='CONSTELLATION'||this._consBusy)return landed;
 const mine=b.log.slice(start).filter(e=>e.target===t.name&&Object.hasOwn(e,'damage'));
 ctx.crit=mine.some(e=>e.critical);ctx.reaction=ctx.reaction||mine.some(e=>e.reaction);ctx.killed=hp>0&&t.hp<=0;
 this._consBusy=true;try{this.consAfterHit(ctx);}finally{this._consBusy=false;}
 return landed;
};
P.consAfterHit=function(ctx){
 const {a,t}=ctx;
 for(const fx of this.consFx(a))if(fx.t==='onHit'&&matchHit(fx,ctx)&&this.consCond(fx.if,ctx,a,a)&&this.consOnce(fx,a,ctx)&&this.consChance(fx))this.consRun(fx,a,{target:t,attacker:a,card:ctx.o?.card});
 if(ctx.killed)for(const fx of this.consFx(a))if(fx.t==='onKill'&&this.consCond(fx.if,ctx,a,a))this.consRun(fx,a,{target:t,attacker:a});
 for(const owner of this.consAllies(a.side))for(const fx of this.consFx(owner))
  if(fx.t==='teamHit'&&(fx.self||owner!==a)&&matchHit(fx,ctx)&&this.consCond(fx.while,ctx,owner,owner)&&this.consCond(fx.if,ctx,a,owner)&&this.consOnce(fx,owner,ctx)&&this.consChance(fx))this.consRun(fx,owner,{target:t,attacker:a});
};
P.applyDamage=function(a,t,amount,details={}){
 const b=this.s.runtime;if(!b||!t)return old.applyDamage.call(this,a,t,amount,details);
 const hp=t.hp,shields=(t.shields||[]).map(s=>({source:s.source,value:Number(s.value)||0}));
 const out=old.applyDamage.call(this,a,t,amount,details);
 if(this.s.runtime!==b||t.side!=='ALLY')return out;
 // Shields: a broken one may set something off, a Jade Shield heals the one it protects.
 const after=(t.shields||[]);
 for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner)){
  if(fx.t==='shieldBreak'&&shields.some(s=>s.source===fx.source&&s.value>0)&&!after.some(s=>s.source===fx.source&&s.value>0))this.consRun(fx,owner,{target:a?.side==='ENEMY'&&a.hp>0?a:null});
  if(fx.t==='shieldHeal'&&t.hp>0){const before=shields.filter(s=>s.source===fx.source).reduce((n,s)=>n+s.value,0),now=after.filter(s=>s.source===fx.source).reduce((n,s)=>n+(Number(s.value)||0),0),taken=before-now;if(taken>0)this.heal(t,Math.min(taken*fx.pct/100,t.maxHp*fx.cap/100),owner.name);}
 }
 if(!(a?.side==='ENEMY')||t.hp>=hp&&!(hp>0&&t.hp<=0))return out;
 const used=b.consUsed||(b.consUsed={});
 // Falling: a lethal blow may be survived (the fighter's own constellation first, then a party revival).
 if(hp>0&&t.hp<=0){
  for(const fx of this.consFx(t))if(fx.t==='lowHp'&&fx.lethal&&!used[fx.uid+':'+t.id]){used[fx.uid+':'+t.id]=true;t.hp=1;this.consRun(fx,t,{target:a,attacker:t});return out;}
  for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner))if(fx.t==='revive'&&!used[fx.uid]){used[fx.uid]=true;t.hp=Math.max(1,round(t.maxHp*fx.pct/100));this.consLog(owner,fx);b.log.push({actor:owner.name,actorId:owner.id,target:t.name,targetId:t.id,heal:t.hp,revived:true});return out;}
  return out;
 }
 if(t.hp>0&&t.hp<hp){
  for(const fx of this.consFx(t)){
   if(fx.t==='onHurt')this.consRun(fx,t,{target:a,attacker:t});
   if(fx.t==='lowHp'&&!used[fx.uid+':'+t.id]&&t.hp/t.maxHp*100<fx.below&&hp/t.maxHp*100>=fx.below){used[fx.uid+':'+t.id]=true;this.consRun(fx,t,{target:a,attacker:t});}
  }
 }
 return out;
};
P.heal=function(a,amount,source='',...rest){
 const b=this.s.runtime;if(!b||!a||a.hp<=0)return old.heal.call(this,a,amount,source,...rest);
 let n=Number(amount)||0;
 const healer=rest[0]?b.actors.find(x=>x.id===rest[0]):this._consCast?.a?.name===source?this._consCast.a:b.actors.find(x=>x.side==='ALLY'&&x.name===source);
 if(healer?.source&&healer.side===a.side){
  let add=0;for(const fx of this.consFx(healer))if(fx.t==='heal'&&this.consCond(fx.if,null,healer,healer))add+=fx.pct;
  if(this._consCast?.a===healer&&this._consCast.kind&&this._consCast.kind!=='na')n*=this.premiumTalentMultiplier?.(healer,this._consCast.kind)||1;
  if(add)n*=1+add/100;
 }
 if(a.side==='ALLY'){let inc=0;for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner))if(fx.t==='team'&&fx.healIn&&this.consCond(fx.while,null,owner,owner)&&this.consCond(fx.if,null,a,owner))inc+=fx.healIn;if(inc)n*=1+inc/100;}
 const want=Math.max(0,round(n)),missing=a.maxHp-a.hp,applied=old.heal.call(this,a,n,source,...rest);
 if(a.side==='ALLY'&&a.source&&want>missing&&missing>=0)for(const fx of this.consFx(a))if(fx.t==='onHealed'&&fx.overflow)this.consRun(fx,a,{attacker:a});
 return applied;
};
P.shield=function(a,value,source,rounds,extra={}){
 const b=this.s.runtime;let v=Number(value)||0;
 // Shields made by a reaction or by a constellation keep their own size.
 if(b&&a&&!/^(CONS:|RX_)/.test(String(source))){
  const owner=this._consCast?.a||b.actors.find(x=>x.side==='ALLY'&&x.source&&x.source===this.consCardOwner(source));
  if(owner?.source&&owner.side==='ALLY'){
   let add=0;for(const fx of this.consFx(owner))if(fx.t==='shieldPow')add+=fx.pct;
   if(this._consCast?.a===owner&&this._consCast.kind&&this._consCast.kind!=='na')v*=this.premiumTalentMultiplier?.(owner,this._consCast.kind)||1;
   if(add)v*=1+add/100;
  }
 }
 return old.shield.call(this,a,v,source,rounds,extra);
};
P.consAfterCast=function(a,card,kind,env={}){
 const b=this.s.runtime;if(!b||a.side!=='ALLY'||!a.source)return;
 const ctx={a,t:env.targetActor||null,pre:env.pre||new Set(),kind};
 const fxs=this.consFx(a);
 if(card&&kind!=='na'){
  // 0.15.6: a cut never brings an element burst back on the caster's very next turn (a cooldown of 1 left after the
  // cast is gone at that turn's start), and never raises a cooldown that is already shorter.
  const cut=fx=>{const cur=Number(a.cooldowns[card]),floor=Math.min(cur,kind==='q'?2:1);a.cooldowns[card]=Math.max(floor,cur-(fx.cut||1));};
  for(const fx of fxs)if(fx.t==='cd'&&fx.kind===kind&&Number(a.cooldowns[card])>0)cut(fx);
  for(const fx of fxs)if(fx.t==='charge'&&fx.kind===kind){a.consCharge=a.consCharge||{};if(!a.consCharge[card]){a.consCharge[card]=true;a.cooldowns[card]=0;}else a.consCharge[card]=false;}
  for(const owner of this.consAllies(a.side))for(const fx of this.consFx(owner))if(fx.t==='teamCast'&&kindsOf(fx.kind).includes(kind)&&this.consCond(fx.while,ctx,owner,owner)&&Number(a.cooldowns[card])>0)cut(fx);
 }
 const target=env.targetActor&&env.targetActor.hp>0?env.targetActor:b.actors.find(x=>x.side!==a.side&&x.hp>0)||null;
 for(const fx of fxs)if(fx.t==='onCast'&&(fx.kind==='any'||kindsOf(fx.kind).includes(kind))&&(!fx.card||fx.card===card)&&this.consCond(fx.if,{...ctx,t:target},a,a)&&this.consChance(fx))this.consRun(fx,a,{target,attacker:a,card,appliedStatuses:env.appliedStatuses});
};
P.addCombatStatus=function(a,id,rounds,extra={}){
 const added=old.addCombatStatus.call(this,a,id,rounds,extra);
 if(added&&this._consCast?.appliedStatuses)this._consCast.appliedStatuses.push({actor:a,status:st(a,id)||added});
 return added;
};
P.executeCard=function(a,c,target,branch){
 const b=this.s.runtime;if(!b||!a||a.side!=='ALLY')return old.executeCard.call(this,a,c,target,branch);
 const kind=cardKind(c?.id),pre=new Set((a.statuses||[]).filter(live).map(s=>s.id)),prior=this._consCast;
 this._consCastSeq=(this._consCastSeq||0)+1;const cast=this._consCast={a,kind,card:c?.id,appliedStatuses:[]};
 let out;try{out=old.executeCard.call(this,a,c,target,branch);}finally{this._consCast=prior;}
 if(this.s.runtime===b&&kind&&kind!=='na'){const t=b.actors.find(x=>x.id===target)||null;this.consAfterCast(a,c.id,kind,{targetActor:t&&t.side!==a.side?t:null,pre,appliedStatuses:cast.appliedStatuses});}
 return out;
};
P.basicHit=function(a,t,k){
 const b=this.s.runtime,out=old.basicHit.call(this,a,t,k);
 if(b&&this.s.runtime===b&&a?.side==='ALLY'&&a.source&&!this._consBusy)this.consAfterCast(a,null,'na',{targetActor:t});
 return out;
};
// "When the battle starts": once, as the first round is ordered and before anyone acts.
P.newRound=function(...args){
 const out=old.newRound.apply(this,args),b=this.s.runtime;
 if(b&&!b.consStarted){b.consStarted=true;for(const a of this.consAllies('ALLY'))for(const fx of this.consFx(a))if(fx.t==='start')this.consRun(fx,a,{attacker:a});}
 return out;
};
P.roundEnd=function(){
 const b=this.s.runtime;if(!b)return old.roundEnd.call(this);
 for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner))if(fx.t==='roundEnd'&&this.consCond(fx.while,null,owner,owner)&&this.consCond(fx.if,null,owner,owner))this.consRun(fx,owner,{attacker:owner});
 const watched=[];for(const owner of this.consAllies('ALLY'))for(const fx of this.consFx(owner))if(fx.t==='fieldEnd'&&b.fields.some(f=>f.kind===fx.kind&&f.actor===owner.id&&!f.done))watched.push([owner,fx]);
 const out=old.roundEnd.call(this);
 if(this.s.runtime===b)for(const [owner,fx]of watched)if(owner.hp>0&&!b.fields.some(f=>f.kind===fx.kind&&f.actor===owner.id&&!f.done))this.consRun(fx,owner,{attacker:owner});
 return out;
};
P.constellationsV01411=true;
})(typeof window!=='undefined'?window:globalThis);
