"""v0.14.3 first meetings for the remaining recruitment stories, and a pass over the stiff Isekai Liyue
template scenes (Xiao, Tartaglia, Shenhe, Xinyan, Lanyan, plus two cost lines)."""

TRV, ISK = 'ROUTE_TRAVELER', 'ROUTE_ISEKAI'


def write_more(Chain, edit, STORY, DB):
    legends = {r[0]: r for r in DB['56_MOND_LEGEND_DB'][1:] if r and r[0]}

    def chain_for(route, legend, anchor):
        d = legends[legend]
        return Chain(route, d[5], legend, legend + '_V143', STORY[(route, anchor)][1][8] or d[22])

    def prelude(route, legend, after, first, again):
        """First meeting / reunion between the opening narration `after` and what followed it."""
        d = legends[legend]
        c = chain_for(route, legend, after)
        tail = STORY[(route, after)][1][13]
        group = legend + '_V143_MEET'
        c.build(legend + '_V143_FIRST', first, tail, 'MET(%s)=FALSE' % d[1], group)
        c.build(legend + '_V143_AGAIN', again, tail, 'MET(%s)=TRUE' % d[1], group)
        edit(route, after, next='CONDITION_GROUP:' + group)

    def reunion(route, legend, pred, first_row, resume, again):
        """`first_row` introduces the character by name; an acquaintance hears `again` instead and rejoins at `resume`."""
        d = legends[legend]
        c = chain_for(route, legend, first_row)
        group = legend + '_V143_MEET'
        c.build(legend + '_V143_AGAIN', again, resume, 'MET(%s)=TRUE' % d[1], group)
        edit(route, first_row, cond='MET(%s)=FALSE' % d[1], group=group)
        edit(route, pred, next='CONDITION_GROUP:' + group)

    def met_scene(route, legend, key, anchor, profile, first, again, shared, tail):
        """A second character joins mid-scene: introductions only if the player has not met them."""
        c = chain_for(route, legend, anchor)
        rest = c.build(legend + '_V143_' + key, shared, tail)
        group = legend + '_V143_' + key + '_MEET'
        c.build(legend + '_V143_' + key + '_FIRST', first, rest, 'MET(%s)=FALSE' % profile, group)
        c.build(legend + '_V143_' + key + '_AGAIN', again, rest, 'MET(%s)=TRUE' % profile, group)
        return 'CONDITION_GROUP:' + group

    # Traveler Razor: the trap scene happens in Wolvendom, not in the city.
    for n in range(9, 21):
        node = 'LEG_MOND_RAZOR_N%03d' % n
        if (TRV, node) in STORY:
            edit(TRV, node, map='MAP_MOND_WOLVENDOM')

    # ---- Traveler Mond ------------------------------------------------------------------------------------------
    prelude(TRV, 'LEG_MOND_RAZOR', 'LEG_MOND_RAZOR_N002',
            [('페이몬', '저기 봐, 여행자! 늑대들 사이에 사람이 있어… 아니, 사람 맞지?'),
             ('레이저', '…사람. 레이저. 늑대, 가족. 너희는… 냄새 처음이다.'),
             ('페이몬', '난 페이몬! 이쪽은 여행자야. 우리 나쁜 사람 아니야, 진짜로!'),
             ('레이저', '나쁜 냄새, 안 난다. 좋다. …그런데 지금, 다른 냄새 난다.')],
            [('N', '레이저가 여행자와 페이몬을 알아보고 짧게 고개를 끄덕인다. 그러고는 다시 바람 쪽으로 코를 든다.')])
    prelude(TRV, 'LEG_MOND_NOELLE', 'LEG_MOND_NOELLE_N002',
            [('노엘', '앗, 안녕하세요! 기사단에 볼일이 있으신가요? 저는 기사단의 메이드, 노엘이에요. 무엇이든 말씀만 하세요!'),
             ('페이몬', '메이드? 기사가 아니고?'),
             ('노엘', '아직 견습이에요. 언젠가 정식 기사가 되는 게 꿈이랍니다. 그러니 지금은… 메이드로서 최선을 다해야죠!'),
             ('페이몬', '난 페이몬, 이쪽은 여행자야. 그런데 노엘, 손에 든 그 장부… 엄청 두껍다?')],
            [('노엘', '여행자 님, 페이몬 님! 마침 잘 오셨어요. …아, 이 장부요? 오늘 할 일이에요. 조금… 많죠?')])
    prelude(TRV, 'LEG_MOND_SUCROSE', 'LEG_MOND_SUCROSE_N002',
            [('페이몬', '저기, 병을 들고 바람을 쫓는 저 사람은 누구야?'),
             ('설탕', '앗, 저, 저요? 설탕이라고 해요. 알베도 선생님 밑에서 연금술을 배우고 있어요. 이, 이상한 사람은 아니에요!'),
             ('페이몬', '난 페이몬! 여행자랑 같이 다녀. 설탕이라니, 이름부터 달달하다!'),
             ('설탕', '그, 그런 말 자주 들어요… 아, 지금은 그게 문제가 아니라요.')],
            [('설탕', '여, 여행자 씨! 페이몬 씨도… 와 주셔서 다행이에요. 혼자서는 판단이 잘 안 서서요.')])
    prelude(TRV, 'LEG_MOND_FISCHL', 'LEG_MOND_FISCHL_N002',
            [('피슬', '이방의 여행자여, 네 이름을 황녀에게 고하라! 이 몸은 단죄의 황녀, 피슬이니라!'),
             ('오즈', '아가씨의 말씀은 「처음 뵙겠습니다」라는 뜻입니다. 저는 오즈. 아가씨를 모시는 밤까마귀입니다.'),
             ('페이몬', '와, 새가 말했어! …아니 잠깐, 페이몬도 말하니까 놀랄 일은 아닌가?'),
             ('피슬', '흥, 작은 요정 따위와 오즈를 비교하지 마라. …그래도 그 말투, 싫지 않군.')],
            [('피슬', '오오, 운명의 실이 또다시 그대를 이끌었구나!'),
             ('오즈', '길드에서 불러 드렸습니다. 와 주셔서 감사합니다.')])
    prelude(TRV, 'LEG_MOND_KLEE', 'LEG_MOND_KLEE_N002',
            [('클레', '어? 처음 보는 사람이다! 안녕! 클레는 클레야! 서풍 기사단의 불꽃 기사!'),
             ('페이몬', '불꽃 기사? 그런 직책도 있어?'),
             ('진', '…클레가 스스로 붙인 이름이야. 여행자, 와 줘서 고마워. 오늘은 어른이 함께 걸어 줄 사람이 필요했거든.'),
             ('알베도', '나는 알베도. 클레의 보호자 중 하나라고 생각하면 돼. 오늘 길 확인을 같이 부탁할게.')],
            [('클레', '앗, 여행자랑 페이몬이다! 오늘도 클레랑 같이 가 줄 거지?')])
    prelude(TRV, 'LEG_MOND_JEAN', 'LEG_MOND_JEAN_N002',
            [('진', '여행자, 그리고 페이몬. 정식으로 인사하는 건 처음이군. 서풍 기사단 대리 단장, 진이야. 바쁜 와중에 와 줘서 고마워.'),
             ('페이몬', '대리 단장이 직접 장부를 보고 있는 거야? 역시 진은 일이 너무 많아!'),
             ('진', '…부정하진 않을게. 그래서 도움이 필요해.')],
            [('진', '와 줬구나, 여행자. 페이몬도. 바쁜 와중에 고마워.')])
    prelude(TRV, 'LEG_MOND_BENNETT', 'LEG_MOND_BENNETT_N002',
            [('베넷', '앗, 모험가지? 반가워! 나는 베넷, 베니 모험단의 단장이야! …단원은 아직 나 하나지만.'),
             ('페이몬', '혼자서 모험단이야? 그럼 회의는 금방 끝나겠네!'),
             ('베넷', '하하, 그 말 오늘만 두 번째 들어. …아, 지금 웃을 때가 아니지.')],
            [('베넷', '여행자! 페이몬! 잘 왔어. 이번엔 진짜 급한 일이야.')])
    prelude(TRV, 'LEG_MOND_MONA', 'LEG_MOND_MONA_N002',
            [('모나', '거기, 그 지도를 믿고 산에 오를 생각이라면 그만둬. …처음 보는 얼굴이네. 나는 모나. 위대한 점성술사, 모나 메기스투스야.'),
             ('페이몬', '위대한 점성술사? 그럼 우리 운세도 봐 줄 수 있어?'),
             ('모나', '지금은 안 돼. 운세보다 급한 게 있으니까. 그리고… 공짜로는 안 봐 줘.')],
            [('모나', '왔구나. 별이 네가 올 거라고 했어. …사실은 내가 길드에 부탁했지만.')])
    prelude(TRV, 'LEG_MOND_ALBEDO', 'LEG_MOND_ALBEDO_N002',
            [('알베도', '손님이군. 서풍 기사단 수석 연금술사, 알베도야. 자네가 요즘 소문난 여행자인가?'),
             ('페이몬', '소문? 좋은 소문이지? 우리 나쁜 짓은 안 했다고!'),
             ('알베도', '후후, 흥미로운 소문이야. 마침 자네 눈이 필요한 관찰이 있어.')],
            [('알베도', '왔군, 여행자. 마침 자네 눈이 필요한 관찰이 있어.')])
    prelude(TRV, 'LEG_MOND_DAHLIA', 'LEG_MOND_DAHLIA_N002',
            [('달리아', '안녕하세요! 처음 뵙는 분들이네요. 대성당 부제, 달리아예요. 기도하러 오셨어요, 아니면 저를 도우러 오셨어요?'),
             ('페이몬', '도우러 왔어! 난 페이몬, 이쪽은 여행자야. 그런데 부제님은 원래 이렇게 유쾌해?'),
             ('달리아', '하하, 대성당에 웃음 하나쯤은 있어야죠. 딱딱한 얼굴은 수녀님들이 충분히 맡아 주시거든요.')],
            [('달리아', '여행자 님, 페이몬! 또 와 주셨네요. 반가운 얼굴이 제일 큰 도움이에요.')])

    # ---- Traveler Liyue -----------------------------------------------------------------------------------------
    prelude(TRV, 'LEG_LIYUE_BEIDOU', 'LEG_LIYUE_BEIDOU_INTRO',
            [('북두', '처음 보는 얼굴이군. 남십자 함대의 선장, 북두다. 이 항구에서 내 이름을 모르면 간첩이라던데, 너희는 뭐지?'),
             ('페이몬', '간첩 아니야! 난 페이몬, 이쪽은 여행자야. 그냥… 지나가던 모험가!'),
             ('북두', '하하, 지나가던 모험가가 제일 무섭지. 좋아, 마침 손이 필요했어.')],
            [('북두', '오, 여행자! 좋은 때 왔어. 바다가 심상치 않아.')])
    prelude(TRV, 'LEG_LIYUE_GAMING', 'LEG_LIYUE_GAMING_L00',
            [('가명', '어, 손님이야? 검갑 호송국 사람을 찾는다면 나야. 가명이라고 해! 호송이랑 사자춤이 특기지.'),
             ('페이몬', '사자춤? 호송국에서 사자춤도 춰?'),
             ('가명', '하하, 그건 마음의 본업이지! 아무튼 지금은 호송 쪽 일이야.')],
            [('가명', '여행자! 페이몬! 딱 좋을 때 왔어. 이것 좀 같이 봐 줄래?')])
    prelude(TRV, 'LEG_LIYUE_XINYAN', 'LEG_LIYUE_XINYAN_INTRO01',
            [('신염', '어이, 거기 둘! 무대 보러 왔어? 난 신염이야. 리월항에서 제일 뜨거운 로큰롤 음악가지!'),
             ('페이몬', '로큰롤? 그게 뭐야? 맛있는 거야?'),
             ('신염', '하하, 먹는 건 아니지만 한 번 들으면 배가 부를걸? …아, 잠깐. 그 전에 할 일이 있어.')],
            [('신염', '오, 또 만났네! 이번 무대도 보러 온 거지? 그 전에 손 좀 빌려줘.')])
    reunion(TRV, 'LEG_LIYUE_ZIBAI', 'LEG_LIYUE_ZIBAI_N003', 'LEG_LIYUE_ZIBAI_N004', STORY[(TRV, 'LEG_LIYUE_ZIBAI_N004')][1][13],
            [('자백', '또 왔구나. 이 눈금이 쓰이던 시대의 길을 안다고 해서 오늘의 수레까지 다 아는 것은 아니지. 먼저 어떤 짐이 어디를 지나갈지 듣고 싶구나.')])
    reunion(TRV, 'LEG_LIYUE_YUNJIN', 'LEG_LIYUE_YUNJIN_N003', 'LEG_LIYUE_YUNJIN_N004', STORY[(TRV, 'LEG_LIYUE_YUNJIN_N004')][1][13],
            [('운근', '다시 뵙네요. 관객석에서 보는 길은 멀쩡해도 배우가 돌아 나오는 길에 장비가 놓였어요. 어느 쪽에 먼저 양보를 부탁해야 하는지부터 제대로 보고 싶어요.')])
    reunion(TRV, 'LEG_LIYUE_LANYAN', 'LEG_LIYUE_LANYAN_INTRO01', 'LEG_LIYUE_LANYAN_INTRO02', 'LEG_LIYUE_LANYAN_INTRO04',
            [('페이몬', '난 저게 길인 줄 알고 먼저 발을 올릴 뻔했어! 남연, 저 발판 괜찮은 거야?'),
             ('남연', '헤헤, 또 만났네. 오늘은 발판을 막아야 해. 장식은 멀쩡해 보여도 물 먹은 속줄이 버티지 못하면 다 같이 떨어져.')])

    # ---- Isekai Liyue: first meetings -----------------------------------------------------------------------------
    prelude(ISK, 'LEG_ISK_LIYUE_XIAO', 'LEG_ISK_LIYUE_XIAO_INTRO',
            [('소', '…낯선 기척이군. 넌 누구지?'),
             ('>', '{PLAYER_NAME}이야. 객잔 사람한테 등불 이야기를 듣고 왔어.'),
             ('소', '소다. 이 객잔에 머물고 있지. 이름을 기억할 필요는 없다. 오늘 일이 끝나면 각자의 길로 가면 되니까.'),
             ('>', '이름을 들었으니 기억할게. 그게 예의잖아.'),
             ('소', '…마음대로 해라.')],
            [('소', '…또 너군. 이 길엔 무슨 일로 왔지?')])
    prelude(ISK, 'LEG_ISK_LIYUE_SHENHE', 'LEG_ISK_LIYUE_SHENHE_INTRO',
            [('신학', '…넌 이 가게 사람인가? 아니라면, 잠시 도와줄 수 있나.'),
             ('>', '{PLAYER_NAME}이야. 가게 사람은 아니지만 도울 수는 있어.'),
             ('신학', '신학이다. 산에서 오래 수행하다 내려왔다. 사람들 사이의 일은 아직 서툴다. …그래서 네 눈이 필요하다.')],
            [('신학', '{PLAYER_NAME}. 마침 잘 왔다. 사람들 사이의 일은 아직도 서툴다.')])
    prelude(ISK, 'LEG_ISK_LIYUE_TARTAGLIA', 'LEG_ISK_LIYUE_TARTAGLIA_INTRO',
            [('타르탈리아', '오? 처음 보는 얼굴인데. 난 타르탈리아. 편하게 「공자」라고 불러도 돼. 우인단 집행관이라는 건… 뭐, 숨길 생각은 없어.'),
             ('>', '{PLAYER_NAME}이야. 집행관이 운송장을 들고 고민하는 모습은 좀 의외네.'),
             ('타르탈리아', '하하, 싸움만 하는 줄 알았어? 계산이 틀리면 나도 곤란하거든.')],
            [('타르탈리아', '이야, 또 만났네. 마침 재밌는 수수께끼가 생겼어.')])
    prelude(ISK, 'LEG_ISK_LIYUE_XIANYUN', 'LEG_ISK_LIYUE_XIANYUN_INTRO_01',
            [('한운', '음? 처음 보는 얼굴이로구나. 이 몸은 한운. 리월항에서 기관 장치를 만드는 장인이니라. 자네는?'),
             ('>', '{PLAYER_NAME}이야. 계단에서 사람들이 돌아서는 걸 보고 궁금해서.'),
             ('한운', '호오, 궁금증이 발을 움직였군. 좋은 자질이다.')],
            [('한운', '오, 자네로구나. 마침 좋은 때 왔느니라.')])
    prelude(ISK, 'LEG_ISK_LIYUE_ZIBAI', 'LEG_ISK_LIYUE_ZIBAI_N002',
            [('자백', '물을 뜨러 왔나? 나는 자백. 이 샘길의 표식을 살피러 왔다.'),
             ('>', '{PLAYER_NAME}이야. 표식이 셋이나 되니까 헷갈리던 참이었어.'),
             ('자백', '그렇다면 같이 보자. 셋 중 무엇이 오늘의 길인지.')],
            [('자백', '또 만났군. 이번엔 샘길이다.')])
    reunion(ISK, 'LEG_ISK_LIYUE_XINYAN', 'LEG_ISK_LIYUE_XINYAN_INTRO', 'LEG_ISK_LIYUE_XINYAN_GREET', 'LEG_ISK_LIYUE_XINYAN_JOB',
            [('신염', '어, 너구나! 여기 줄보다 안쪽은 지금 들어오면 안 돼. 소리가 커서가 아니라, 저 장치 선이 덜 고정됐거든.')])
    reunion(ISK, 'LEG_ISK_LIYUE_LANYAN', 'LEG_ISK_LIYUE_LANYAN_INTRO', 'LEG_ISK_LIYUE_LANYAN_GREET', 'LEG_ISK_LIYUE_LANYAN_JOB',
            [('남연', '어, 또 만났네! 바구니 구경은 얼마든지 해도 돼. 다만 저 흔들리는 손잡이는 만지기 전에 말해 줘.')])
    reunion(ISK, 'LEG_ISK_LIYUE_YANFEI', 'LEG_ISK_LIYUE_YANFEI_N003', 'LEG_ISK_LIYUE_YANFEI_N004', STORY[(ISK, 'LEG_ISK_LIYUE_YANFEI_N004')][1][13],
            [('연비', '하하, 종이의 성격까지 변론하려면 시간이 좀 걸리겠어. 이번에도 두 사람이 각자 서명한 부분부터 보여 줄게.')])
    reunion(ISK, 'LEG_ISK_LIYUE_XINGQIU', 'LEG_ISK_LIYUE_XINGQIU_INTRO_03', 'LEG_ISK_LIYUE_XINGQIU_INTRO_04', STORY[(ISK, 'LEG_ISK_LIYUE_XINGQIU_INTRO_04')][1][13],
            [('행추', '여전히 눈이 빠르군. 비운 상회 이름으로 대조용 종이를 빌리면 620모라가 든다. 작가 본인에게 묻기 전에는 읽는 범위부터 정해 두자.')])
    reunion(ISK, 'LEG_ISK_LIYUE_QIQI', 'LEG_ISK_LIYUE_QIQI_N004', 'LEG_ISK_LIYUE_QIQI_N005', STORY[(ISK, 'LEG_ISK_LIYUE_QIQI_N005')][1][13],
            [('치치', '바닥 선 안쪽. …당신, 노트에 있어요. 확인할게요.')])

    # ---- Isekai Liyue: plainer words and a second voice ------------------------------------------------------------
    L = 'LEG_ISK_LIYUE_'
    for node, text in {
        'XINGQIU_INTRO_04': '눈이 빠르군. 난 행추야. 비운 상회 이름으로 대조용 종이를 빌리면 620모라가 든다. 작가 본인에게 묻기 전에는 읽는 범위부터 정해 두자.',
        'XIANYUN_INTRO_04': '의견을 먼저 내는군. 좋다. 다만 장치를 바꾸기 전에 안전 중지를 걸어야 하지. 완충 추와 보조 손잡이 제작비로 720모라가 드느니라. 부품이 모이면 바로 손보겠다.',
        'XIAO_TWIST': '객잔 직원이 위쪽 등이 다시 켜졌다고 알린다. 모두 끝났다고 돌아가려는 순간, 반대쪽 좁은 길의 등불 하나가 아주 짧게 흔들린다. 소가 위험을 확인하러 몸을 돌린다. {PLAYER_NAME}은 따라갈지, 자리를 지킬지 정해야 한다.',
        'XIAO_OFFER': '이 길을 다시 지나면 위험한 곳부터 살펴라. …위험할 땐 내 이름을 불러. 네가 원한다면, 짧은 순찰부터 함께하지.',
        'XIAO_RECRUIT_YES_RESPONSE': '알았다. 다만 내가 늘 곁에 있을 거라 믿지는 마. 물러날 때는 네 판단으로 물러나라. 그걸 지킬 수 있다면, 같이 움직이지.',
        'XIAO_DECLINE_RESPONSE': '현명한 판단일 수 있다. 아래 사람들에게 세 번째 계단은 쓰지 말라고 전해 두겠다.',
        'XIAO_RECRUIT_NO_RESPONSE': '그것도 좋다. 오늘 사람들을 돌려보낸 건 네 몫이었다. 다음에 위험을 보면 객잔에 먼저 알리고, 네 몸부터 지켜.',
        'TARTAGLIA_INTRO': '리월항 외곽의 창고 앞. 봉인되지 않은 운송장 두 장의 물건 수량이 서로 맞지 않는다. 타르탈리아는 종이를 든 채, 창고 문을 드나드는 사람들을 흘끗거린다.',
        'SHENHE_JOB': '묘 사부가 손님들 음식 재료를 새로 사 오라고 했다. 향신료와 신선한 채소, 시장에서 만민당까지 손수레 운반비를 합쳐 520모라가 든다. 재료를 고를 눈이 하나 더 필요하다. …도와주겠나?',
        'SHENHE_COMMON': '손님은 다음 시간에 다시 오기로 하고, 신학은 그 시간을 장부에 적는다. 시장에서 산 재료는 주문대로 손질된다. 신학은 칼을 든 채 한참 재료를 바라보다가, 요리는 수행보다 어렵다고 중얼거린다.',
        'SHENHE_OFFER': '오늘 네가 내 말을 고쳐 준 때가 있었다. 불편하지 않았다. 모르던 걸 알게 됐으니까. 만민당 바깥 일에도… 네가 곁에 있으면 좋겠다.',
        'SHENHE_RECRUIT_YES_RESPONSE': '알았다. 동행하겠다. 모르는 게 있으면 앞으로도 묻겠다. 너도 그렇게 해 줘.',
        'XINYAN_JOB': '안전 덮개랑 새 고정핀을 사고, 장치를 수레로 옮기는 데까지 모두 680모라야. 관객한테 돈 받으려는 건 아니고… 같이 설치해 줄 사람이 있으면 좋겠어. 부담되면 규모를 줄여서라도 안전은 내가 지킬 거야.',
        'XINYAN_ACCEPT_RESPONSE': '좋아! 장부에 부품 값이랑 산 곳을 적어 둘게. 설치 전에 소리 한 번 들어 보고, 고칠 점 있으면 크게 말해 줘!',
        'XINYAN_PROBLEM': '안전 덮개를 끼운 뒤에도 관객이 빠져나갈 좁은 길 하나가 앰프 뒤에 가려진다. 신염은 허가받은 자리라는 이유로 그냥 넘어가지 않는다.',
        'XINYAN_TWIST': '시험 연주 도중 어린 관객 하나가 큰 소리에 움찔한다. 신염은 기타를 멈추고 아이 쪽을 돌아본다.',
        'LANYAN_INTRO': '임시 장터 지붕에 빗물이 고이자, 남연이 대나무 바구니를 하나씩 들어 올려 무게 중심을 확인한다. 바구니를 팔기 전에, 그걸 들고 갈 사람의 손부터 살피는 눈치다.',
        'LANYAN_JOB': '며칠째 비에 물건이 젖어서 곤란한 사람들이 쓸 통을 만드는 중이야. 그런데 상인들은 튼튼해야 한다고 하고, 짐을 들 사람들은 손목이 아프다고 해. 둘 다 맞는 말이지. 방수 대나무랑 끈을 사고 협곡에서 항구까지 옮기는 데 560모라가 들어. 같이 해 줄래?',
        'LANYAN_ACCEPT_RESPONSE': '고마워! 영수증엔 방수 대나무랑 접착재, 손잡이 끈, 협곡에서 온 운송료를 나눠 적을게. 어떤 바구니로 만들지는 같이 정하자.',
        'LANYAN_OFFER': '헤헤, 이제 이건 쓰는 사람 거야. 그래도 다음에 또 현장에 나가야 하면 네 눈이 필요하겠네. 네가 좋다면, 한동안 같이 다니자!',
    }.items():
        edit(ISK, L + node, text=text)

    # Xiao: the inn thanks him the one way he accepts.
    x = chain_for(ISK, L + 'XIAO', L + 'XIAO_COMMON')
    tea = x.build(L + 'XIAO_V143_TOFU', [
        ('객잔 요리사', '소 선인님! 등불을 다시 켜 주셨으니 오늘은 제가 대접하겠습니다. 행인두부 한 그릇 올려 드릴까요?'),
        ('소', '…필요 없다.'),
        ('>', '행인두부 좋아한다며? 객잔 사람들이 그러던데.'),
        ('소', '…누가 그런 말을. …한 그릇만 두고 가라.'),
        ('N', '소가 그릇을 받아 들고 난간 쪽으로 돌아선다. 숟가락이 움직이는 소리가 아주 작게 들린다.')], L + 'XIAO_OFFER')
    edit(ISK, L + 'XIAO_COMMON', next=tea)

    # Tartaglia: Zhongli reads the contract; Childe pays for the tea.
    zhongli = met_scene(ISK, L + 'TARTAGLIA', 'ZHONGLI', L + 'TARTAGLIA_METHOD_A_RESPONSE', 'PROFILE_LIYUE_ZHONGLI',
        [('종려', '처음 보는 얼굴이군. 왕생당의 객경, 종려라고 하네. 공자 각하와 함께라니, 흥미로운 조합이야.')],
        [('종려', '자네도 함께였군. 공자 각하와 함께라니, 흥미로운 조합이야.')],
        [('타르탈리아', '선생, 설명은 짧게 부탁해. 저번처럼 계약의 역사를 처음부터 풀면 해가 져.'),
         ('종려', '음, 그렇다면 요점만. 인도 확인서와 임시 적치 기록은 책임지는 사람이 다르다. 날짜보다 서명한 손을 먼저 보게.'),
         ('타르탈리아', '…덕분에 빨리 끝나겠네. 대신 오늘 찻값은 내가 낼게. 선생이 모라를 들고 다닐 리 없으니까.'),
         ('종려', '고맙군. 그럼 사양하지 않지.')],
        L + 'TARTAGLIA_TWIST')
    edit(ISK, L + 'TARTAGLIA_METHOD_A_RESPONSE', next=zhongli)
    edit(ISK, L + 'TARTAGLIA_METHOD_B_RESPONSE', next=zhongli)

    # Shenhe: Xiangling explains the order, and the heat.
    xiangling = met_scene(ISK, L + 'SHENHE', 'XIANGLING', L + 'SHENHE_METHOD_A_RESPONSE', 'PROFILE_LIYUE_XIANGLING',
        [('향릉', '앗, 신학 언니! 장 보고 왔어? …어, 새로운 얼굴이다! 난 향릉, 만민당 요리사야! 이쪽은 누룽지!')],
        [('향릉', '앗, 신학 언니! 장 보고 왔어? {PLAYER_NAME}도 같이 갔었구나!')],
        [('신학', '향릉. 손님 주문에 맞는 향신료를 골랐다. 맵기를 줄여 달라고 적혀 있었다.'),
         ('향릉', '아하, 그 손님! 매운 걸 못 드시면서 절운고추 요리를 시키셨거든. 그래서 맵기를 반으로 줄여 드리기로 했어!'),
         ('신학', '…그렇다면 내가 고른 게 맞았군. 네 요리는 늘 맵던데.'),
         ('향릉', '헤헤, 매운 게 맛있잖아! 누룽지도 그렇대!'),
         ('N', '누룽지가 뜨거운 숨을 한 번 내쉬고 꼬리를 흔든다.')],
        L + 'SHENHE_TWIST')
    edit(ISK, L + 'SHENHE_METHOD_A_RESPONSE', next=xiangling)
    edit(ISK, L + 'SHENHE_METHOD_B_RESPONSE', next=xiangling)

    # Xinyan: Yun Jin drops by after the show.
    yunjin = met_scene(ISK, L + 'XINYAN', 'YUNJIN', L + 'XINYAN_COMMON', 'PROFILE_LIYUE_YUNJIN',
        [('운근', '처음 뵙는 분이네요. 운한사의 운근이라고 해요. 신염 씨 무대가 오늘은 조금 달라 보여서 와 봤어요.')],
        [('운근', '{PLAYER_NAME} 씨도 계셨군요. 신염 씨 무대가 오늘은 조금 달라 보여서 와 봤어요.')],
        [('신염', '운근! 보러 온 거야? 오늘은 출구부터 새로 잡았어. 이 친구가 도와줬거든.'),
         ('운근', '좋은 무대는 관객이 편하게 드나들 수 있어야 하죠. 저도 배우고 갈게요. …그런데 소리가 조금만 더 작았으면 좋겠네요.'),
         ('신염', '하하, 그건 양보 못 해! 대신 뒷줄에 조용한 자리를 만들어 둘게.')],
        L + 'XINYAN_OFFER')
    edit(ISK, L + 'XINYAN_COMMON', next=yunjin)
