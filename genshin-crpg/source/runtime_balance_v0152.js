/* 0.15.2 적 밸런스 점검 (user: 「타르탈리아 존나 약한데 이건 또 뭐냐 전체적으로 밸런스 안맞는 적들 다 체크해. 이번에 돌파가
 * 생겼으니 그것도 생각정도는 해놓고」). Every fight met in Mond and Liyue was opened with all its balance layers and
 * compared with the enemies of the same grade and level, and the bosses were fought by reference parties: story levels
 * with story gear, and Lv.20 with +10 gear or broken-through +12 gear, 4★ and 5★ teams (tests/test_balance_v0152.cjs).
 *  - 타르탈리아 (Liyue act 3, a Lv.12 boss) hit like a Lv.4 monster: now the numbers of a Lv.12 boss.
 *  - 타르탈리아 of the 이세계 route (a Lv.6 subdue fight) fell in one round: now a real fight of eight or nine rounds.
 *  - 야타용왕 (Lv.15) had less health than a Lv.10 field boss.
 *  - Their repeat challenges (artifacts, crystals) reused those story numbers, so a Lv.20 party won in two to four
 *    rounds: now endgame fights, Tartaglia Lv.19 (from protagonist Lv.17) and Azhdaha Lv.20 (from Lv.18). A party with
 *    +12 gear and fitting companions wins with room to spare, a +10 party has to work for it, and a 5★ team clearly
 *    does better than a 4★ one.
 *  - 새끼 바위 용 도마뱀 (a normal monster with 3.5 times the health of its peers) and 암흑의 빈 갑주·궁수 (an elite with a
 *    third of its peers' health) are brought into line.
 * The two-day rematches (Andrius, Dvalin) are retuned in runtime_boss_rematch.js. Fights already saved keep their numbers.
 * Load after runtime_boss_rematch.js and runtime_liyue_artifacts.js, before runtime_mutations_v0152.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.balanceV0152)return;P.balanceV0152=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
// The monster's own numbers (every fight that uses it): health, attack, defence multipliers.
const BASE={BOSS_TARTAGLIA:[1.5,2.9,1.15],BOSS_ISK_L03_GOLDEN:[10,6.5,1.8],BOSS_AZHDAHA:[1.8,1.45,1.1],MON_GEOVISHAP_HATCHLING:[.55,1,1],MON_HUSK_BOW:[1.7,1,1]};
// The repeat challenges, on top of the story numbers: level, protagonist level to enter, health/attack/defence.
const FARM={
 LIYUE_TARTAGLIA_FARM:{kind:'TARTAGLIA',boss:'BOSS_TARTAGLIA',level:19,minLevel:17,mult:[1.6,1.52,1.3]},
 LIYUE_AZHDAHA_FARM:{kind:'AZHDAHA',boss:'BOSS_AZHDAHA',level:20,minLevel:18,mult:[2,1.66,1.18]}
};
api.balanceV0152={base:copy(BASE),farm:copy(FARM)};
const old=Object.fromEntries(['startBattle','liyueArtifactFarmReason','validateSave'].map(k=>[k,P[k]]));
const scale=(t,[hp,atk,def])=>{t.maxHp=Math.max(1,Math.round(t.maxHp*hp));t.hp=t.maxHp;t.atk=Math.round(t.atk*atk);t.def=Math.round(t.def*def);for(const s of t.shields||[])if(Number.isFinite(s.value)){s.value=Math.round(s.value*hp);if(Number.isFinite(s.initialValue))s.initialValue=Math.round(s.initialValue*hp);}};
// Applied once when a fight starts (the monster table stays as it is, so nothing can scale twice).
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime,o=String(origin);
 if(!b||b===before||b.balanceV0152)return out;
 const tuned=b.actors.filter(a=>a.side==='ENEMY'&&BASE[a.source]),f=o.startsWith('MATERIAL_CHALLENGE:')?FARM[o.slice('MATERIAL_CHALLENGE:'.length)]:null,boss=f&&b.actors.find(a=>a.side==='ENEMY'&&a.source===f.boss);
 if(!tuned.length&&!boss)return out;
 for(const a of tuned)scale(a,BASE[a.source]);
 if(boss){scale(boss,f.mult);boss.level=f.level;}
 b.balanceV0152={version:1,kind:boss?'FARM':'BASE',boss:boss?f.boss:null,level:boss?f.level:null};
 return out;
};
// A repeat challenge is an endgame fight now; entering spends the day's admission, so it opens near its level.
P.liyueArtifactFarmReason=function(kind){
 const base=old.liyueArtifactFarmReason.call(this,kind);if(base)return base;
 const f=Object.values(FARM).find(x=>x.kind===kind);
 if(f&&(Number(this.s.global.PLAYER_LEVEL_STATE)||1)<f.minLevel)return '반복 도전은 권장 Lv. '+f.level+' 전투입니다. 주인공 Lv. '+f.minLevel+'부터 도전할 수 있습니다.';
 return '';
};
P.farmLevelV0152=function(kind){const f=Object.values(FARM).find(x=>x.kind===kind);return f?{level:f.level,minLevel:f.minLevel}:null;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,m=out.runtime?.balanceV0152;
 if(m!==undefined&&(!m||m.version!==1||!(m.kind==='BASE'&&m.boss===null||m.kind==='FARM'&&Object.values(FARM).some(f=>f.boss===m.boss&&f.level===m.level))))fail('BALANCE_SAVE','전투 밸런스 기록이 올바르지 않습니다.');
 return out;
};
})(globalThis);
