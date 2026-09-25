# 리월 회귀 검사

저장 호환 검사는 실제 배포된 v0.12 Git 커밋의 코드로 만든 시험용 저장을 가져옵니다. 따라서 프로젝트의 Git 이력이 필요합니다. 개인 저장은 읽거나 수정하지 않습니다.

```sh
python tools/build.py
python tools/test_all.py
python tools/test_v013.py
```

전체 본편·획득·일반 호감 장면을 다시 진행하려면 `python tools/test_v013.py --full`을 실행합니다. 전구간 검사는 수분 이상 걸릴 수 있습니다. 개별 Node 스크립트도 프로젝트 루트에서 실행할 수 있습니다.

- `audit_geo_oculi.cjs`: 실제 이동·구매·의뢰·타이머·저장 복원으로16개 수집. 전투2개는 수집 연결을 위한 승리 판정 사용.
- `test_geo_offerings_zibai.cjs`: 앞선 실제 수집으로 만든 `tests/fixtures/geo-collected-v013.json`에서 공양·지역 분리·귀환 검증. 다른 입력은 `--fixture`로 지정.
- `test_liyue_flow.cjs`: 본편10개 갈래. 몬드 완료 경계는 합성 fixture이며 실제 전투 행동을 사용합니다. 높은 능력치로 연결을 검사하므로 난도 검증이 아닙니다. `QA_LEAVES=TRV_A,TRV_B`처럼 범위 지정 가능.
- `test_recruitment.cjs`: 개인 임무85개. 본편 완료·준비물은 합성하고 임무·수락·거절·이동·재회는 실제 행동을 사용합니다.
- `test_relationships.cjs`: 새 일반 호감 장면305개. 이전 이야기·호감 점수는 합성하며 장면·이동·일상 교류·저장 복원은 실제 행동을 사용합니다.
- 카드 검사는 고정 능력치·주사위를 사용해 계수·중복·거리·상태·진영·저장 처리를 확인합니다.
- UI 검사는 실제 앱을 DOM 모형으로 실행합니다. 실제 브라우저의 화면 배치·음향·애니메이션·IndexedDB·오프라인 재시작은 검사하지 않습니다.

개별 실행 결과는 `/tmp`에, 묶음 결과는 `reports/suite-v013-results.json`에 기록합니다. 본편 결과 폴더는 `CRPG_QA_DIR`로 지정할 수 있습니다.
