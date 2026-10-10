# 0.16.25 최종2 빌드·세 엔진 검사

최종 제품6SHA와 실제 source120개를 검사한 뒤 브라우저/서버를 빌드했다. 소스·실제 브라우저 runtime·실제 generated 서버 engine을 메모리가 분리된 순차 worker로 실행했다. 엔진마다 캐릭터48·귀속18·기존 일일압력21·공중 기본공격5 =92검사, 총276/276 통과다. 엔진 fingerprint 일치 및 원문/객체 QA DB 불변을 검사했다.

[최종 전체 결과](three_engines_release_final2/summary.json) · [소스](three_engines_release_final2/source-summary.json) · [브라우저](three_engines_release_final2/browser-summary.json) · [서버](three_engines_release_final2/server-summary.json)

최종 실행 fingerprint `engine3-cd865c08c6376fb436b7103bc55d170218962cced05dbf641902a7b24996a307`는 기록한 QA DB 기준이다. 원격 authored DB를 보존하는 실제 릴리스의 fingerprint를 이 QA 값으로 강제하지 않는다. source120과 빌드/서버 도구 및 installer가 게시 기준0.16.24와 동일한지 Git blob SHA로 비교했고 허용한6source 외 차이0이었다.

재현(별도 QA 체크아웃):

```bash
npm run build
npm run build:server
node tools/audit_balance_engines_v01625.cjs dist reports/v01625-engines-fresh
```

이전 `three_engines_final`은 백출 추가 전 중간본이다. 그때 서버 기존 관계 모듈 설치 부트스트랩과 old/current 소스 테스트의 설치 차이 때문에 전체 상태 비교가 실패했던 로그를 보존했다. 제품 문제로 숨기거나 assert를 제거하지 않았다. 최종 runner와 계약 테스트는 실제 생산 부트스트랩을 old/current 양쪽 동일 적용하고 전체 상태/RNG 비교를 유지한다.
