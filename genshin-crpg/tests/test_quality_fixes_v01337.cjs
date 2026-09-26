'use strict';
const assert=require('node:assert/strict'),h=require('./helpers_v011.cjs'),fs=h.fs,path=h.path;
const src=fs.readFileSync(path.join(h.root,'source/app_liyue_areas.js'),'utf8');
assert(!src.includes("res.append(actionButton(entry.label+' 시작','LIFE_START'"),'세부 지역 안내가 생활 행동 버튼을 중복 생성하면 안 됩니다.');
assert(src.includes("if(!a.kind&&a.parent==='MAP_LIYUE_HARBOR')"),'비활동 리월항 세부 지역 안내 분기 유지 필요');
const adventure=fs.readFileSync(path.join(h.root,'source/app_adventure.js'),'utf8');
assert(adventure.includes("function lifePanel(parent)"),'공통 생활 행동 패널이 존재해야 합니다.');
assert(adventure.includes("'LIFE_START'"),'공통 생활 행동에서 실제 작업 시작 기능을 유지해야 합니다.');
console.log('PASS Liyue detailed areas render life action only once through the common life panel');
