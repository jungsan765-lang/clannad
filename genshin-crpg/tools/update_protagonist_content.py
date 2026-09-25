#!/usr/bin/env python3
"""Idempotent local Stage-2 content patch. No network/sheet/save access."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'content/db.json'
db=json.loads(p.read_text())
def put(table,row,key=0):
    rows=db[table]
    for i,r in enumerate(rows[1:],1):
        if len(r)>key and r[key]==row[key]:
            rows[i]=row;return
    rows.append(row)
config={
 'version':1,'definition_kind':'CRPG_HOUSE_RULE','stage':2,
 'legacy_profile':{'BASE_HP':600,'BASE_ATK':75,'BASE_DEF':45,'BASE_SPD':60},
 'profiles':{'ROUTE_TRAVELER':{'BASE_HP':600,'BASE_ATK':75,'BASE_DEF':45,'BASE_SPD':60},
             'ROUTE_ISEKAI':{'BASE_HP':480,'BASE_ATK':40,'BASE_DEF':30,'BASE_SPD':55}},
 'traveler':{'flag':'FLAG_TRV_ANEMO_UNLOCKED','unlock_node':'TRV_M01_E002',
  'e':{'tap_cut':[0.20],'tap_burst':1.10,'tap_targets':1,'tap_cooldown':2,
       'hold_cut':[0.20,0.20,0.20],'hold_burst':1.40,'hold_targets':3,'hold_cooldown':3,'absorbed':0.25},
  'q':{'hits':3,'coefficient':0.80,'absorbed':0.24,'targets':3,'cooldown':4}},
 'isekai':{'e':{'hp_factor':0.06,'def_factor':0.60,'normal_cap':0.20,'elite_cap':0.10,'cooldown':3,
                'expires':'NEXT_CASTER_TURN','boss_immune':True},
            'q':{'base_bonus_pct':10,'atk_factor':0.10,'level_bonus_pct':1.5,'cap_pct':60,'cooldown':4}},
 'note':'계수·대상 수·턴·이세계인 능력은 CRPG 전용. 여행자 기본 공격은 물리. 운명의 자리와 후반 강화는 자동 부여하지 않음.'}
put('00_CORE',['CORE_CRPG_PROTAGONIST_0133','COMBAT','BOOT','PROTAGONIST_COMBAT_CONFIG_JSON',json.dumps(config,ensure_ascii=False,separators=(',',':')),'JSON','CRPG_LOCAL_STAGE2_20260925','루트별 기초 전투력과 고유 E/Q. 기존 저장의 장비·레벨·기초 수련 증가분을 보존한다.'])
put('23_FLAG_DB',['FLAG_TRV_ANEMO_UNLOCKED','여행자 바람 원소 공명 확인','FALSE','','몬드','','TRV_M01_E002 확인 시 해금. 이세계인에게 복제하지 않음.'])
status=['STATUS_ISEKAI_HP_WINDOW','일시 약화','최대 HP 일시 저하','다음 시전자 차례 시작까지 최대 HP가 감소한다. 만료 시 보류한 HP도 복원한다.',1,'N',1,'다음 시전자 차례/시전자 전투불능 후 라운드 종료','[비원소][이세계인]','보스 면역. 중첩 불가. 영구 피해/즉사로 사용하지 않음.','CUSTOM','MAX_HP','CAPPED_FLAT',0,'NEXT_CASTER_TURN','NO_STACK','COMBAT','runtime_protagonist.js']
put('13_STATUS_EFFECT_DB',status)
records=[
 ('PLAYER_TRAVELER_ANEMO_E','회오리 검','원소전투스킬','바람','TRAVELER_ANEMO_E',2,
  '짧게: 적 1명에게 바람 절단과 폭발. 길게: 대상과 인접 적 최대 3명에게 강화 공격. 물·불·얼음·번개 한 종류를 전환한다. 짧게 2턴/길게 3턴.', 'ANEMO'),
 ('PLAYER_TRAVELER_ANEMO_Q','격동의 바람','원소폭발','바람','TRAVELER_ANEMO_Q',4,
  '대상과 인접 적 최대 3명에게 바람 3연타. 물·불·얼음·번개 중 접촉한 한 종류의 추가 피해. 작은 적만 감아올린다. 턴제 환산 기술.', 'ANEMO'),
 ('PLAYER_ISEKAI_E','일시 약화','고유 보조','비원소','ISEKAI_HP_WINDOW',3,
  '자신의 최대 HP×6% + 방어력×60%만큼 적 1명의 최대 HP를 다음 자기 차례까지 낮춘다. 일반 20%/정예·강적 10% 상한, 보스 면역. 만료 시 임시 감소분 복원.', ''),
 ('PLAYER_ISEKAI_Q','함께하는 일격','합동 공격','비원소','ISEKAI_JOINT_ATTACK',4,
  '본인과 행동 가능한 전장 동료가 기본 공격을 1회씩 추가한다. 추가 배율은 10 + 자신의 공격력×0.1 + (레벨−1)×1.5%, 최대 60%. 각 동료의 통상 차례·기술 쿨다운은 소비하지 않는다.', '')]
for cid,name,kind,tags,script,cd,desc,element in records:
 r=['']*37;r[0:10]=[cid,'PLAYER','PLAYER_CUSTOM',name,kind,'['+tags+']','적',desc,'루트별 해금',cd]
 r[13]=element;r[16]=desc;r[17]='CRPG_HOUSE_RULE_20260925; 기술명·바람 원소전환은 한국어 게임 자료 교차 확인'
 r[18]=0;r[19]='전장' if cid.startswith('PLAYER_ISEKAI') or cid.endswith('_Q') else '중거리'
 r[20]=0;r[21]='MANUAL_ONLY';r[22]=1;r[23]='즉시';r[24]='N';r[25]=kind;r[26:30]=[0,0,0,'ATK']
 r[30:37]=['ACTIVE','ENEMY_1',script,0,'runtime_protagonist.js','READY',json.dumps({'handler':script,'rule_version':1},ensure_ascii=False)]
 put('08_SKILL_CARD_DB',r)
# Existing prologue begins AFTER the statue episode. Make that chronology explicit without moving any node.
for r in db['55_MAIN_STORY_DB'][1:]:
 if len(r)>4 and r[4]=='TRV_M01_E002':
  if '일곱신상' not in r[9]:r[9]+=' 숲에 들어오기 전, 호숫가의 일곱신상과 공명했을 때 손끝에 모였던 바람이 떠오른다. 그 힘은 지금도 여행자의 부름에 응한다.'
  effect='FLAG_TRV_ANEMO_UNLOCKED=TRUE'
  effects=[x.strip() for x in str(r[12] or '').split(';') if x.strip()]
  if effect not in effects:effects.append(effect)
  r[12]=';'.join(effects)
p.write_text(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n')
print('Stage 2: route configuration, four cards, one flag/status and one existing opening node updated.')
