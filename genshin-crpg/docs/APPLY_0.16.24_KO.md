# 0.16.24 적용 소스

최종 전달문의 **전체40자리 SHA**를 그대로 사용한다. 테스트한 커밋과 본서버에 적용하는 커밋을 같게 고정한다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.24_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

배포본 준비는 서버 적용 절차에서 기다린다. 소스 게시 작업은 워크플로 완료를 기다리지 않는다.

## 본서버 적용

```bash
RELEASE_SHA='테스트한_0.16.24_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 서버 DB를 유지한다. 이 코드를 게시했다고 실제 VPS에 설치한 것은 아니다. main 병합·서버 설치·운영 승격은 이번 작업에서 실행하지 않았다.

## 적용 뒤 확인

운영자 설정이 비어 있을 때 새 반복 도전은 [패치 표](PATCH_0.16.24_KO.md)의 기본값을 사용한다. 이미 운영자가 입력한 정확 HP·공격력·방어력은 기본값보다 우선한다. 테스트 서버의 운영자 설정은 본서버로 자동 복사되지 않는다. 밸런스 탭의 기본값·실제 활성 설정을 함께 확인한다.

기존 진행 전투를 그대로 끝낸 뒤 새 보스를 시작해 비교한다. 필드는 행동판5, 일일은 공격 정책1이며 기존 저장 전투는 옛 규칙을 유지한다. 게임 화면 배치·요리·숙박·비경 보상·성장 요구량을 이 릴리스에서 바꾸지 않았다.

[변경과 한계](PATCH_0.16.24_KO.md) · [검증 원장](data/balance_v01624/README_KO.md)
