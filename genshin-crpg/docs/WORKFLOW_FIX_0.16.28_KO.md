# 워크플로 #312 복구 · 0.16.28

실패한 소스는 `182e5b06e630700bb4a9269b7932bb35a6b44ee8`입니다. [실패 실행](https://github.com/jungsan765-lang/clannad/actions/runs/38141473501)은 전체 회귀 검사197개 중189개 통과·8개 실패, source UI 검사는 통과했습니다. 배포 패키지 단계는 선행 실패로 실행되지 않았습니다.

## 원인과 수정

서버 최적화에서 `source/runtime.js`를 바꾼 뒤, 과거 버전 검증용 복사본을 함께 보관하지 않은 것이 원인입니다. 과거 엔진은 변경했던 파일만 검사 폴더에서 읽고 나머지는 현재 소스에서 읽는 구조였습니다. 그래서 과거 엔진에 새 런타임이 섞였고 원래 소스 해시 검사가 이를 거부했습니다.

새 런타임 SHA256은 `723e3935ce63023f1dd5d1fe83b1d2cc5fcd42bb5cff98f8b5a956a70f9a59d2`, 원래 파일은 `da3479d514fbcc6edf5c3be64d8cbb5ff9e6533b84a045711e27b3d0325c3ec7`입니다. 원본의 Git blob은 `550200e4582fe620966c8f76ebb96b53288193ed`로 과거 게시 소스 원장과 일치합니다.

다음 세 검사 폴더에 **실제 과거 원본 파일**을 추가했습니다.

- `docs/data/balance_v01624/source_before/source/runtime.js`
- `docs/data/balance_v01625/source_before/source/runtime.js`
- `docs/data/balance_v01627/before/source/runtime.js`

원래 원장·기대 해시·과거 엔진 전체 지문·전투 승리 조건은 변경하지 않았습니다. 원문 DB·게임 수치·최적화 제품 소스·화면도 그대로입니다. 서버/엔진 빌드는 앞선0.16.28과 같습니다.

`tools/check_server_capacity_v01628.py`에도 실패한 기존 검사8개를 넣었습니다. 앞으로 서버 최적화의 집중 점검은34프로그램이며, 전체 릴리스 등록197개와 워크플로 구성은 유지합니다.

## 재검증과 적용

**실패했던8개와 최적화2개를 재검사해 총10프로그램 모두통과했습니다.** 최종 결과는 [복구 검증 원장](data/workflow_fix_v01628/README_KO.md)과 같은 폴더의 `validation.json`, `after/`에 기록합니다. 원래 실패 로그8개와 전체CI197개 결과도 보존합니다. 로컬 재실행과 새 GitHub 전체 실행의 성공은 구분합니다.

이번 수정은 검사 자료/점검 범위 복구이며 버전은0.16.28입니다. 전달한 **새 전체40자리 커밋**으로 설치합니다. 앞서 실패한 SHA의 배포본을 사용하지 않습니다. 새 커밋의 워크플로가 배포본을 만들면 아래 기존 설치 절차를 실행합니다.

```bash
RELEASE_SHA='새_전달문의_0.16.28_복구_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

테스트에 실제 설치하고 확인한 뒤 같은 SHA를 본서버에 적용합니다.

```bash
RELEASE_SHA='테스트한_0.16.28_복구_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

실제VPS 설치·본서버 승격·main 병합·워크플로 완료 대기는 이번에 실행하지 않습니다. [기존 최적화 결과](PATCH_0.16.28_KO.md)와 [인수인계](AI_HANDOFF.md)를 함께 읽습니다.
