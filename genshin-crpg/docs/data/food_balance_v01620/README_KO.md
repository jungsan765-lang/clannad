# 0.16.20 음식 검증 원자료와 재현

먼저 [변경 설명](../../PATCH_0.16.20_KO.md)을 읽는다. 기준은 게시0.16.19 `da29f36312af19ca11dd2c0ac29b54d6b31ee8f4`, tree `e2cddb62b4b0eb1fbec3bed12d925a050258e1e2`다. 마지막 게시SHA는 최종 전달문과 고정SHA 적용 절차를 사용한다.

## 자료별로 무엇을 확인했나

| 자료 | 범위 | 읽을 파일 |
|---|---|---|
| native/ | 회복45종·7레벨·4대상·맨몸/합법장비, 저손실상한과 실제 영수증 | [native README](native/README_KO.md) |
| recipes/ | 전체108조리법·실제수급·재고0 준비52조건·복합생선과구이 비교 | [recipes README](recipes/README_KO.md) |
| economy/ | 재료/조리비/매각/거래/숙박·NPC완성품실결제·384수급표본 | [경제 변경 후 보고서](economy/ECONOMY_AFTER_KO.md) |
| regressions/ | 이번수정에영향받는기존프로그램21개(20통과·옛loader실패1) 및원문로그 | [회귀 README](regressions/README_KO.md) |
| build/ | 브라우저/서버빌드·엔진동일성·원본/복제DB·제품범위해시 | [빌드 README](build/README_KO.md) |
| ascension_review/ | 추가질문의원소별보상/주인공견적,읽기전용 | [돌파 읽기 README](ascension_review/README_KO.md) |

새 `tests/test_food_balance_v01620.cjs`는14개검사를통과했다. 경제213개검사도통과했고, BUY8회/SELL8회를실제실행했다. 엔진동일성204/204·제품범위12/12도통과했다. 기존관련프로그램은20통과/옛loader실패1이며정확한before에서같은실패를재현했다. 각프로그램·조건·개별assert의분모가다르므로합쳐‘전투수천회전체균형완료’라고말하지않는다. 전체174배포프로그램을재실행한기록이아니며,0.19전체171통과/과거원문결손2는당시자료다.

재고0 준비before/after52조건은식사전HP·원재료·구매영수증·가공·드롭·준비현금이모두같았다. 준비전멸4건도유지됐다. 네이티브자료는식사한끼의요청/실회복과남은HP를보존한다. 준비중KO나후기남은HP를빼고숙박과같은완전회복종점이라고주장하지않는다. 합계회복증가율은서로다른레벨의회귀집계이며균형목표가아니다.

## 정확한 before 복원

`baseline_product_snapshot.json.gz`에는기준소스232파일·로컬정리DB·package2개,총235개의정확한바이트가있다. 원격 authored `content/db.json` 원문을대체하는배포자료가아니다. 원자료235개·gzip·압축해제내용각각의해시는`baseline_product_manifest.json`을따른다. 복원도구는빈새폴더만허용하고파일마다바이트수·SHA256·Gitblob해시를검증한다. 전체235파일복원검증을실행했다.

프로젝트루트에서:

```bash
python3 docs/data/food_balance_v01620/restore_baseline.py --out /tmp/food-v01619-before
node docs/data/food_balance_v01620/native/audit_native_food_v01620.cjs --source-root /tmp/food-v01619-before --out /tmp/food-effects-before
node docs/data/food_balance_v01620/native/audit_native_food_v01620.cjs --source-root . --out /tmp/food-effects-after
node docs/data/food_balance_v01620/economy/audit_catalog.cjs --baseline /tmp/food-v01619-before --out /tmp/food-economy-before.json
node docs/data/food_balance_v01620/economy/verify_after_economy.cjs --source-root . --out-dir /tmp/food-economy-after
node tests/test_food_balance_v01620.cjs
```

각도구의상세조건/인자는하위README를따른다. 일반효과검사에주는정확한음식1개는소비계측fixture이며무료식재료공급증거가아니다. 원재료수급은다른자료의실제채집·사냥·낚시·가공·조리로검증했다.

각하위MANIFEST는보존원문파일과gzip파일,압축해제원문의SHA를구분한다. `/tmp`는원래실행작업경로이며재현에필요한데이터·스크립트·source지문은이디렉터리에복사했다. 오래된실행스크립트는원문증거로별도압축하고포터블스크립트와같은해시라고주장하지않는다.

## 범위와 남은설계

확정39종회복원액/45종정책표는`approved_policy_v01620.json`이다. 입력DB·assets·화면배치·전투·성장보상/요구량·숙박·원재료/조리비·사용자시장수수료는그대로다. 음식완성품구매가를올렸지만기존effective NPC매각상한을보존하여판매가인상이매각이득을늘리지않는다. 저레벨전부구매음식이나실제플레이어시장가격까지모두숙박보다좋다고보장하지않는다.

같은Lv25불21/번개6과불Lv25→30의21→18은별도[원소별돌파설계검토](../../ASCENSION_ELEMENT_REVIEW_V01620_KO.md)다. 질문에읽기로답했으며이번음식변경에돌파재료수치를몰래끼워넣지않았다.
