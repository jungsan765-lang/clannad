# 복구 소스와 인수인계

[전체보고서](../../../PATCH_0.16.21_KO.md)와[인수인계](../../../AI_HANDOFF.md)를읽는다. source_manifest.json의7파일은마지막로컬검증소스와hash가같고source_changes.patch는게시0.16.20기준에서같은7파일을적용하는전체파일유니파이드패치다. 최종통합검증/QA게시가미완료인후보이며운영설치용검증배포본이아니다.

원격DB/assets/기준트리를보존했다. 기준canonicalQA복사본baseline_v01620.tar.gz와baseline_manifest.json은한단계위에있다. 이canonicalDB로게시원문DB를교체하지않는다. 나머지원시자료는아직로컬작업경로에있으며복구브랜치에전체업로드하지못했다.
