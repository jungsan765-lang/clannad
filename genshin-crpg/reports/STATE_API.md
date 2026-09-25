# 관계·저장 모듈 통합 계약

두 파일은 런타임 스키마 2를 보존한다. 원본 DB·공유 시트·기존 소스 파일은 변경하지 않았다.

## 로딩

`runtime.js → runtime_extensions.js → runtime_story.js → runtime_nodes.js → runtime_relationships.js → 전투 확장 → save_adapter.js` 순서 후 아래를 한 번 실행한다. relationships는 자동 설치하지 않는다.

```js
CRPGRelationships.install(CRPGRuntime, {
  events: CRPGRelationships.catalogFromDB(DB),
  // 51의 명시적 +20/30분 규칙과 56/58의 실제 활동·선행조건 24개.
  activities: CRPGRelationships.activitiesFromDB(DB),
  preferences: {adultModeEnabled: false},
  eligibility: {profiles: {}, protagonists: {}, allowedRoutes: {}},
  onExposureChanged(runtime, detail) {
    // OFF/장면 중단 시 UI의 이미지·예약 재생·다운로드 요청을 함께 제거/취소한다.
  }
});
const storage = new CRPGSave.SaveAdapter({
  contentVersion: CONTENT_MANIFEST.contentVersion,
  compatibleContentVersions: [], // 명시적으로 검증한 이전 콘텐츠 버전만 추가
  validate: state => runtime.validateSave(state),
  migrate: CRPGRelationships.migrateState,
});
const preferences = await storage.getPreferences();
runtime.setAdultMode(preferences.adultModeEnabled);
```

`setAdultMode`는 현재 런타임 표시 정책만 변경한다. UI는 `storage.setPreferences(preferences)`도 호출한다. 불러오기/가져오기는 현재 설정을 덮어쓰지 않는다. 새 Runtime 인스턴스에도 현재 사용자 설정을 다시 적용한다.

## 관계

- `relation(profileId)` → 현재 SAVE_ID·ROUTE_ID·PROFILE_ID로 식별한 레코드. 원본 점수는 `BOND_SCORE`이며 `heart`·`HEART_STATE`는 최대 5의 파생 값이다.
- `changeBond(profileId, scoreDelta, {source})` → 점수 단위 변경. `ADD_HEART:1`의 변환은 명령 해석기에서 `20`으로 한 번만 한다.
- `relationshipHeart(profileId)` → 표시/호환 하트.
- `completeAffection(eventId, {profileId,stage,category})` → 완료 이력과 `eventCompletedAt[eventId]={day,turn}`. `stage`는 H01~H05의 정확한 단계만 넣는다. 중간 사건은 자동 완료되지 않는다. MATURE_ROMANCE 완료는 이 API에서 거절한다.
- `relationshipEventComplete(eventId)` → 현재 저장의 사건 완료 여부.
- `relationshipStageOffers(profileId)` → 가장 이른 미완료 일반 단계의 준비/선행조건/누락 상태. 실제 장면 없는 H02/H04를 만들지 않는다.
- `dailyRelationshipActivity(profileId,{bondDelta,sourceId,minutes:30})` → 거래 안에서 호출한다. 일상 활동의 일반 점수·성인 점수·시간을 하나의 인물/루트/게임 날짜 영수증으로 기록한다. 중복은 기존 영수증과 `duplicate:true`를 반환한다. 명령 해석기에서 별도 시간/보상을 또 적용하지 않는다.
- `lastRelationshipActivity(profileId)` → 마지막 일상 영수증의 day/turn 등. 직전 사건 이후 별도 교류 판정에 사용한다.
- 등록된 활동은 `runtime.action('RELATION_ACTIVITY',{activityId})`로 호출할 수 있다. 실행기 내부에서 직접 호출하는 모든 상태 변경은 기존 `runtime.transact` 안에서 수행해야 한다.
- `relationshipActivityEntries()`는 현재 루트에서 만난 인물의 활동 이름·실제 대사·잠금 이유를 반환한다. 활동 클릭 후 반환된 `result.dialogue`를 표시한다. 51의 실제 규칙에 따라 H02 완료 40→60, H04 완료 80→100, H05 완료 100→120을 각각 30분에 수행한다. 일반 120에서 적격 ON의 별도 성인 점수가 남으면 일반 점수 변화 없이 같은 활동을 이어갈 수 있다.

현재 58 탭에는 H02/H04 각 24개가 있다. `catalogFromDB`는 열 이름으로 읽고 `RELATION_KIND`를 사용한다. PERSONAL_BOND/PERSONAL_BOND_NON_SEXUAL은 GENERAL이다. B110/B120이라는 ID나 이미지 번호는 분류 근거로 사용하지 않는다. 현재 B110 행의 실제 `BOND_SCORE_MIN=120` 등 집필 데이터는 보존하며, HEART_MIN=6은 표시 상한 5와 점수 조건을 함께 사용한다. 세부 조건식의 레거시 하트 변환은 공통 노드 실행기 소유다.

## 관계 확장 정책

기본 정책에는 검증된 성인 적격자가 없다. 프로젝트의 연령 태그·이미지 파일만으로 적격을 추정하지 않는다. 따라서 ON 토글이 작동해도 현재 전용 사건은 잠긴다. 일반 관계의 110/120은 OFF 상태에서도 유지한다.

별도 검토된 적격 정책은 양 당사자마다 `{verifiedAdult:true,appearanceVerifiedAdult:true,evidence:'검증 근거'}`와 프로필별 허용 루트 배열을 제공해야 한다. 테스트 파일의 적격 정책은 가상 시험 조건이며 배포에 포함하면 안 된다.

- `adultModeEnabled()` / `setAdultMode(boolean)`
- `matureEligibility(profileId)` → 적격·허용 경로·일반 100·H05 완료·잠금 상태.
- `effectiveMatureBond(profileId)` → ON 적격이면 보존 점수, OFF이면 100. 저장된 115는 지우지 않는다.
- `canExposeRelationshipContent({category,verifiedClassification},profileId)` → 로그·회상·갤러리·미리보기·자산 등 모든 UI 경로에서 공통 사용. 미분류는 비노출, GENERAL은 정상 노출.
- `beginMatureRelationshipEvent(eventId,{replay:false})` → 검증된 사건 정의·현재 상황·선행 이력 검사 후 일시 장면 생성.
- `confirmRelationshipConsent(eventId,true)` → 그 장면의 명시 동의. false는 무벌점 중단.
- `commitMatureRelationshipEvent(eventId,commitId)` → SAVE_ID로 시작하는 거래 식별자로 단 한 번 커밋. 반복 요청·회상은 횟수를 추가하지 않는다.
- `invalidateRelationshipConsent(reason)` → **새 장면·저장 재개·중단 때 반드시 호출**. 동의는 WeakMap에만 있어 직렬화되지 않으며 새 Runtime에는 승계되지 않는다.

모드 OFF는 즉시 동의를 폐기하고 안전한 복귀 노드 또는 시스템 화면으로 보낸다. 커밋 전 중단에는 기록이 없고, 커밋 후 중단은 확정 이력을 보존한다. DOM 이미지 제거·예약 취소·네트워크 AbortController 처리에는 `onExposureChanged`를 연결한다. 이미지 8~11은 아직 내용 검토 및 사건별 매핑이 완료되지 않았으므로 배포의 일반 이미지 경로에 넣지 않는다.

## IndexedDB 저장

```js
const saved = await storage.save(slotId, runtime.s, {
  expectedSlotRevision: knownSlotRevision, name: '내 저장'
});
knownSlotRevision = saved.slotRevision;
const {state,slotRevision} = await storage.load(slotId);
runtime = new CRPGRuntime.Runtime(DB,state);
runtime.setAdultMode(preferences.adultModeEnabled);
```

최초 슬롯 expectedSlotRevision은 0. 슬롯 revision은 게임 `SAVE_REVISION`과 별도이다. IndexedDB의 단일 readwrite 트랜잭션에서 현재 슬롯 읽기·CAS·쓰기까지 처리한다. 두 탭이 같은 revision을 쓰면 하나만 성공한다. `SAVE_CONFLICT`일 때 화면을 재저장 성공으로 취급하지 말고 최신 슬롯 로드 또는 새 슬롯에 보관하는 동작을 제공한다. 기존 동작을 롤백할지 현재 메모리 진행을 파일로 보관할지는 UI가 선택하되, 이전 정상 저장은 남는다.

- `list()` → 이름·플레이어·루트·장소·게임 시간·slotRevision. 성인 장면 텍스트/이미지는 포함하지 않는다.
- `exportState(state)` → 저장소 실패 중에도 JSON 파일 내보내기 가능.
- `exportSlot(slotId)` / `importJSON(slotId,text,{expectedSlotRevision,name})`
- `importLegacyLocalStorage(slotId,{key,storage:localStorage})` → 정확한 기존 키를 지정한다. 원래 localStorage 데이터는 삭제하지 않는다.
- `getPreferences()` / `setPreferences({adultModeEnabled,fontSize})`
- `subscribe(listener)` → saved, loaded, save-error, external-save 등. external-save는 변경 알림이며 원자성 자체는 IndexedDB가 보장한다.
- `lastError` → 명시적 `clearError()` 전까지 유지. 다른 화면 메시지와 별도의 오류 영역으로 렌더링한다.
- `remove(slotId,{expectedSlotRevision})` → CAS와 백업 후 삭제.
- `close()` → 저장소/탭 알림 채널 정리.

버전 envelope는 `envelopeSchema:1`, `runtimeSchema:2`, contentVersion, slotRevision, saveId, summary, state를 포함한다. 전체 runtime 상태를 보존하므로 개인 장면/전투/커서/난수/행동 영수증/인벤토리 인스턴스가 누락되지 않는다. 전투는 WAIT_PLAYER 경계만 저장한다. import 원문은 backups에 저장한다. 관계 이행은 원래 관계 기록과 변환 내역도 남기며 이미 BOND_SCORE가 있으면 재환산하지 않는다. 현재 콘텐츠 버전과 다른 저장은 명시적 compatibleContentVersions 없이 적용하지 않는다.

## 검증

```
node tests/test_state.js
node tests/test_save_browser.js
```

첫 스크립트는 원본 실제 Runtime과 관계 모듈의 19개 시험 묶음을 통과했다. 두 번째는 실제 Chromium의 IndexedDB에서 14개 항목을 통과했다. 두 탭 CAS 경합, 오래된 저장 거절, 오류 지속, 손상 import의 원본 보존, 가져오기 후 설정 OFF 유지, localStorage 원본/가져오기 백업, 저장 불가 환경의 내보내기를 포함한다. `CRPG_CHROMIUM_PATH`로 시험 브라우저 경로를 지정할 수 있다. 배포 소스에는 가상 적격 정책과 test-save-fixture.json을 일반 콘텐츠로 로드하지 않는다.
