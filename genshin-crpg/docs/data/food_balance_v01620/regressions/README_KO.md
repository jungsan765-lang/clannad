# 0.16.20 이번수정에영향받는기존프로그램검사

21개선별프로그램을실제실행하여20통과/1실패다. `results.json`에정확한명령·작업경로·시각·소요시간·종료코드·원문로그SHA가있다. 전체174프로그램재검증이아니다. 새음식14검사는별도native자료에있으며이21에합산하지않는다.

## 막힌옛검사도보존

`tests/test_economy.cjs`는옛5개스크립트만로드하고,이미다른모듈로옮겨진`adminApply`를호출해첫성공검사뒤TypeError로막힌다. 정확한0.16.19복원에서도같은줄/오류를재현했다. 현재174release목록에도없는옛직접검사다. 제품과기대값을바꿔통과시키지않았다. 진단은`legacy_failure_diagnosis.json`,before/after원문로그도둘다있다. 이것은여전히실패한테스트이며통과로세지않는다.

통과20개는회복45종조리비·조리/재고·생활수급·음식대상레벨·특제/생명의계약·숙박대상별HP/요금·시장매각/부족분·저장·실제권위서버·계정/공개상태·계정별완료영수증/협동중복요청을다룬다. 선별이유는`selection.json`을따른다. 새로운현재엔진검사14개에는위옛multi-person영역과같은공개MEAL_BATCH/거절atomic경계도있다.

## 실행과해시

저장한고정제품과기존test/workflow/입력을보존한별도체크아웃에서4worker로실행했다. 선정시각의전체입력SHA는`selection.json`,원문로그gzip와압축해제SHA는`MANIFEST.json`이다. 각로그원문SHA는`results.json`과맞아야한다.

```bash
python3 docs/data/food_balance_v01620/regressions/run_selected.py --source-root /path/to/isolated/genshin-crpg --out-dir /tmp/food-targeted-results --workers 4
```

beforearchive는효과재현용235파일만있으며기존tests/tools/workflows/서버를통째로대체하는체크아웃이아니다. 원문이없는과거두검사 `test_save_v01344.cjs`/`test_release_isolation_v01513.py`는이번선별에없고통과로세지않는다. 실제서버설치·실사용계정/시장가격검사가아닌로컬HTTP·합성fixture다.
