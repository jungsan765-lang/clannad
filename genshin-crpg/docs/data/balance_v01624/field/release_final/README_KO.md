# 0.16.24 최종 release 소스 · 필드162 재실행

최종 소스를 동결한 뒤 독립 `input_final_release`에 430개 파일을 복제했고, 복제 전후 원본 SHA가 같음을 확인했다. 앞선 필드 동결 162조건·후보 156조건·구수치 18조건은 보존하고 합산하지 않았다. 일일 보스의 정확한 입장 4종에 대한 변경까지 포함한 최종 코드에서 필드 9종을 162조건으로 다시 실행했다.

- C0 수동 27/27승, 반복 21/27승·6패. 전투불능 합계는 각각 8/33명.
- C6와 5성 C0는 각각 수동 27/27·반복 27/27승리, 전투불능 0명.
- 오류·입력 한도 도달 0건. 9종의 최종 레벨·HP·ATK·DEF, 신규 behavior5, 공식 운영자 빈 설정 revision0, 일반 제작장비 +3/+6·강화 상한10을 검사했다.
- 이전 필드 동결 162조건과 승패·라운드·실제 HP·전투불능·부활·머리 노출·반사·시작 적 스탯·대열을 비교한 차이는 0건. 일일 변경이 필드 결과에 미친 영향은 이 조건에서 없었다.

**준비된 4성 명함의 첫 재료 수급은 확인했지만, 모든 4성 풀돌·5성 명함이 필드에서 반드시 수동 공략을 해야 하는 목표는 미완료다.** 동료 AI가 원소·갑주·보호막 공략을 실제 수행하며, 일부 C6는 3–6R, 종려/진 5성 편성은 다수 HP100%로 끝난다. C0 수급 통로를 막는 과한 HP·공격력 후보는 폐기했다. [보스9종·같은 준비 전후·정확한 한계](../README_KO.md)를 함께 읽는다.

이 수급 진단은 보유 동료·이야기/지역 해금·육성자금·해당 레벨까지 이미 완료한 돌파를 가정한다. 보스 재료 장비·전용 장비·성유물·+12·음식은 없다. 캐릭터 돌파는 Lv40→50에서 일반 TRPG_BOSS_ESSENCE, Lv50 이후 원소별 필드 재료를 요구한다. 일반 보스의 첫 수급 통로와 자연 획득 전체는 별도로 검증해야 한다.

[요약](summary.json) · [중간 162조건과 비교](intermediate_to_release_comparison.json) · [430개 입력 파일 SHA](input_manifest.json) · [압축 원장 SHA](NATIVE_MANIFEST.json)

압축 3개 파일에는 모든 시작 배우·장비·특성·주인공 공개 행동·실제 전투 log·종료 HP가 있다. 압축을 풀면 원본과 SHA가 같다. raw QA DB는 254c9294…이며 운영용 authoredDB를 대체하지 않는다.

## 재현

게시된 최종 소스의 source/content/tools를 먼저 별도 임시 QA 폴더로 복제한다. 아래 DB 해제는 그 복제본에만 한다.

```bash
gzip -dc docs/data/balance_v01624/field/release_final/harness/qa_db.json.gz > /tmp/crpg-field-qa/content/db.json
node docs/data/balance_v01624/field/release_final/harness/run_product_replay.cjs /tmp/crpg-field-qa /tmp/crpg-field-result
```

최종 실행 입력 fingerprint: `840ef8955b08346d086de5b39ab87d918123ab4ce2dc0c292f080827fc4bafdc`.

최종 성장 소스 SHA: `611503d487c25bb9b9b5f0a7fdc809cdb3c0526d56f9914194c93aa9379e4d81`.
최종 admin 소스 SHA: `34fe63170c899dd5d8702efa286d7296f7035beafae5e8d2fb46b27829e9e811`.

저장 호환·서버/브라우저 세 엔진·원격 authoredDB·빌드/게시 검증은 별도 원장을 확인한다. 이 필드 162조건을 그 검증으로 부르지 않는다.
