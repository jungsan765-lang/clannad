# 실제 재료 수급·조리법·한 끼 선택 검증

기준0.16.19의45회복/61버프/2금지레거시,총108조리법을전수확인했다. 기존45재료·수량·결과물·조리비·가공경로는그대로이고39회복원액만확정정책과같이변경됐다. 실제공급불가글루포프 호밀빵/베리 아이스크림2개를현재수급되는설국음식과구분했다. [확정이유와수치](APPROVED_RECIPE_VALUES_KO.md)를읽는다. 이름상부활음식이더라도현재부활미구현임을숨기지않았다.

## 준비52조건의before/after

기준실제드롭·사냥/채집/낚시입력·가공·조리를시드2개/지역해금별52조건으로실행했다. 이전자료를복원한포터블선별26조건재실행은원본과정확히일치했다. 이후전체52조건과짝비교하여식사전HP·원재료·구매영수증·가공·드롭·준비현금을전부같게확인했다. 준비전멸4건은유지된다. 레벨업0이며준비시간이전투HP회복으로뒤섞이지않게식사전/뒤/복귀뒤를분리했다.

36조건에서요청량과실제식사회복둘다증가했다. 합계실회복566180→827144는서로다른레벨의회귀집계이지목표균형율이아니다. 준비4인분과식사1회씩은숙박완전회복과같은종점을보장하지않는다. 전멸을무료경제이득으로세지않는다. 첫조리법/낚싯대가격과다음준비에드는반복모라를분리한다.

## 같은생선량의선택112개

`shared_fish_before_v01619.json.gz`/`shared_fish_after_v01620.json.gz`:7레벨×2루트×손실4단계×복합/기본선택2개,112실제CRAFT/MEAL선택과56짝이다. 양쪽4인재료생선8개는같지만추가재료는명시적으로다르다. 재료를주는소비fixture이므로재고0수급시간을같다고가정하지않았다.

이전:생선면170 대두종구이합계200. 이후:360 대240. 이후56짝전부복합요청량이높고,실회복은28짝높음/28짝동일이었다. 동등28짝은작은상처를양쪽모두완전히회복한HP상한이다. 이미회복될상처에더큰원액이추가HP를주는것은아니다. 복합식사1회/구이최대2회,기존같은음식연속거절을피하기위해구이종류를다르게쓴다.

## 재현

프로젝트루트에서예시:

```bash
python3 docs/data/food_balance_v01620/restore_baseline.py --out /tmp/food-before
node docs/data/food_balance_v01620/recipes/audit_native_preparation.cjs --source-root . --out-dir /tmp/food-preparation-after
node docs/data/food_balance_v01620/recipes/audit_shared_fish_meals.cjs --source-root . --out /tmp/shared-fish-after.json
python3 docs/data/food_balance_v01620/recipes/compare_preparation.py --before docs/data/food_balance_v01620/recipes/native_preparation_v01619.json.gz --after docs/data/food_balance_v01620/recipes/native_preparation_after_v01620.json.gz --out /tmp/preparation-pairs.json
```

원문보존은gzip과압축해제SHA를분리한다. 원래실행스크립트는`original_*.txt.gz`,포터블수정본은별도파일이며해시를동일하다고하지않는다. `recommended_ranges_v01620.json.gz`는후보이며최종원액정책은상위`approved_policy_v01620.json`이다. rawDB와제품은이자료정리로변경되지않았다.
