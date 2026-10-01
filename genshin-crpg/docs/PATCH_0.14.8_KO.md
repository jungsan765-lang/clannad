# 0.14.8 메인스토리 K 루트 재집필판

기준: 0.14.5에서 이어지는 0.14 테스트 라인. 0.14.6(스토리 원고 PR #16)·0.14.7(서울 스테이징 PR #18)과는 별도 분기이며 본문 외 코드는 건드리지 않았다.

## 바뀐 내용
- 이세계 주인공 루트 리월 메인스토리 1장~4장(K1·K2)의 본문을 짧은 이야기·대사 중심으로 다시 썼다. 큰 흐름은 유지했고, 그 사이의 장면·대사·선택지를 새로 지었다.
- 짐꾼이 1장(망서 객잔 승강기 구조)부터 4장(이름 「장록」, 화물 인계, 작별)까지 이어지는 인물이 됐다.
- 선택지는 모두 두 갈래 이상이고 고른 쪽에 맞는 대답이 온다. 호감도 60 이상인 동료는 몇몇 장면에서 더 친근하게 반응한다.
- 전투(`COMBAT_GATE`)·사건(`EVENT:`)·현장 행동(R39 게이트)·보상·일시정지 행은 그대로 유지했다. 예전 저장은 가장 가까운 새 장면에서 이어진다.

## 구현
- 원고: `tools/editorial/main_story_k/*.md` (문법은 그 폴더의 README).
- 컴파일: `tools/editorial/compile_main_story_k.cjs` → `source/runtime_main_story_k_content.js`.
- 설치: `source/runtime_main_story_k.js`가 `storyIndex`를 감싸 앙상블 설치 뒤에 K 체인을 덮어쓴다. `source/index.html`·`tools/build.py`에 두 파일을 추가했다.
- 교정 도구: `tools/editorial/dump_main_story_k.cjs`.

## 검증
- `tests/test_main_story_k_v0148.cjs` (npm test에 등록): 원고와 컴파일 결과 일치, 모든 기존 행의 효과·조건 불변, 7개 체인의 사건 순서 불변, 끊긴 노드·빈 선택지·순환 없음, 예전 행이 체인으로 복귀.
- `tests/test_liyue_rework_flow.cjs` K1·K2 실제 플레이 QA 통과.

## 배포 경계
- 로컬 테스트 후보. 승인 전 main 병합·운영 배포 없음.
