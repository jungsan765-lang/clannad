# 0.16.21 성장 점검 — 최종 표, 검증 중단 상태

최종 표·XP 구간·비용·기존 재고 영향은 [전체 보고서](PATCH_0.16.21_KO.md)에 정리했다. 성장 파일 SHA256은 `84a4b734e58ae05f4f61b495a0eefd622bdf532911b79f0f57c1f072708e891a`다. 초기 후보 `ef07b08757a96a540f508b29da854a271f5ff3b3db4fc990bc0ee4f8320bde6c`와의 차이는 공통 돌파 수량 리터럴1곳이다.

8속성 요구는3/6/16/175/1440/37,500,총39,140개다.5성은2배78,280개다. 모라93,200/167,760,특산물42/84,가면5·7·10/10·14·20,주요 보스재료와 이미 마친 육성 기록을 함께 계산했다.3특성 완성 수련서는 몬드2,016/리월5,040이다.

리월 최고 특성 보상80과9단계 요구5/10/30/80/150/240/315/400/450을 함께 쓴다. 몬드 보상·요구를 유지한다. 최초 일일3재료승2배와 경험치 비경 별도 지급 규칙을 보존한다. 최종 신입장 돌파 보상 버전3/특성 버전2이며 진행 중 옛 버전0/1/2의 보상 약속은 저장 marker로 유지한다.

최종표 이전의255조건 실제 시간·HP와 마지막 표만 바꾼 계산을 구분했다. 최종255조건의 네이티브 재검은30조건 후 OOM 종료, 나머지225 재개 결과 미확인이다. 숫자 계산을 전체 네이티브 실행 완료로 표현하지 않는다.

최종 최고 단계 장기55전투54승/1패와 실제625승 저단계 표본을 보존했다. 4,688승 저단계 전체 수집 시간은 표본 외삽이다. 최종 비용 원장4개/HP10검사/옛 진행 중 전투3조건은 완료했다.

로컬 원문 경로는 `/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg/docs/data/full_balance_v01621/growth/`다. 확인할 파일은 `source_change_impact_assertion.json`,`common_stage_reward_proposals.json`,`full_final_gem_readable_high/`,`growth_accounting_final_readable.json`,`growth_compat_final_readable.json`,`growth_hp_final_readable.log`,`resource_interruption_report.json`이다. 이 복구 브랜치에는 원문 전체를 업로드하지 못했다.

정확한 남은 실행 위치와 합칠 방법은 [인수인계](AI_HANDOFF.md)를 따른다. 최종 성장 manifest와 최종 책 조달 quote 재검은 미완료다.
