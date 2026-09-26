/* Liyue artifact farming and +5 enhancement presentation. */
(function(){
'use strict';
if(!globalThis.CRPGRuntime?.liyueArtifactConfig)return;
const cfg=CRPGRuntime.liyueArtifactConfig,names={ATK:'공격력',DEF:'방어력',MAX_HP:'최대 HP',SPD:'속도',CRIT:'치명타 확률',CRIT_DMG:'치명타 피해',HIT:'명중',EVA:'회피',STATUS_RESIST:'상태 저항'};
const fmt=n=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:1});
const pct=bp=>Number(bp/100).toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';
function statText(stats){return Object.entries(stats||{}).filter(([,v])=>v).map(([k,v])=>(names[k]||k)+' +'+fmt(v)+(k==='CRIT'||k==='CRIT_DMG'?'%':'')).join(' · ');}
function farmCard(kind){
 const f=cfg.farm[kind],card=el('section','card liyue-artifact-farm'),reason=game.liyueArtifactFarmReason(kind),cooldown=game.s.liyueArtifactFarm?.cooldowns?.[kind];
 card.dataset.liyueArtifactFarm=kind;
 card.append(el('small','eyebrow','리월 반복 성장 콘텐츠'),el('h2','',f.name+' · '+(kind==='TARTAGLIA'?'성유물 파밍':'성유물 강화 재료')),
  el('p','',kind==='TARTAGLIA'?'승리할 때마다 종류와 능력치가 크게 다른 성유물 1개를 획득합니다. 성유물은 특수 장비 칸에 장착하며 같은 종류라도 품질과 옵션이 전혀 다를 수 있습니다.':'승리 시 야타용왕의 지맥 결정 2~4개를 획득합니다. 이 재료는 성유물을 +5까지 확률 강화할 때 사용합니다.'),
  el('p','muted','파밍 입장은 보스별 게임 내 48시간에 1회입니다. 입장 순간 기록되므로 패배·이탈해도 대기시간이 유지됩니다. 기존 스토리·보스 루트의 클리어 상태는 되돌리지 않습니다.'));
 if(cooldown)card.append(el('small','muted','이 보스의 다음 파밍 입장 시간이 저장되어 있습니다.'));
 card.append(actionButton(kind==='TARTAGLIA'?'타르탈리아 파밍 도전':'야타용왕 재료 도전','LIYUE_ARTIFACT_CHALLENGE',{kind},true));
 if(reason)card.append(el('p','choice-note',reason));return card;
}
const oldLocation=drawLocation;drawLocation=function(p,v){oldLocation(p,v);if(!game)return;if(game.s.global.CURRENT_MAP_ID==='MAP_LIYUE_GOLDEN_HOUSE')p.append(farmCard('TARTAGLIA'));if(game.s.global.CURRENT_MAP_ID==='MAP_AZHDAHA_DOMAIN')p.append(farmCard('AZHDAHA'));};
function costLine(box,q){const line=el('p','enhance-cost');line.append(document.createTextNode('필요 비용 · '+q.cost.mora.toLocaleString()+' 모라 · '+safeName('14_ITEM_DB',cfg.material)+' ×'+q.cost.items[cfg.material]+' (보유 '+game.itemCount(cfg.material)+')'));box.append(line);}
function openArtifactConfirm(slot){
 const inv=game.artifactInstance(slot),q=game.artifactEnhancementQuote(slot);if(!inv||q.maxed)return;const a=inv.artifact,args={slot:q.slot,expectedLevel:q.level,instanceRevision:q.instanceRevision},box=el('div','enhance-confirm artifact-confirm');
 box.append(el('h2','',game.row('16_EQUIP_DB',inv.equip)[1]+' · '+a.grade+' +'+q.level+' → +'+q.target),el('p','','성공률 '+pct(q.successBp)+'. 실패해도 성유물은 파괴되거나 강화도가 내려가지 않지만 재료와 모라는 소비됩니다.'),el('p','muted','현재 · '+statText(game.artifactStats(inv,q.level))),el('p','muted','성공 후 · '+statText(game.artifactStats(inv,q.target))));costLine(box,q);
 const reason=game.actionReason('ARTIFACT_ENHANCE',args);if(reason)box.append(el('p','choice-note',reason));const row=el('div','row');row.append(button('취소',()=>document.getElementById('modal').close()),button('재료를 사용해 1회 강화',async()=>{if(busy)return;document.getElementById('modal').close();const receipt=await act('ARTIFACT_ENHANCE',args);if(receipt?.ok)showArtifactResult(receipt.result);},busy||!!reason,true));box.append(row);showModal('성유물 강화 확인',box);
}
function showArtifactResult(r){const inv=game.artifactInstance(r.slot),box=el('div','enhance-result '+(r.success?'success':'hold'));box.append(el('small','','성유물 강화 결과'),el('h2','',r.success?'강화 성공':'강화 실패 · 단계 유지'),el('strong','enhance-level',game.row('16_EQUIP_DB',inv.equip)[1]+' +'+inv.artifact.level),el('p','',r.success?'성유물 능력치 배율이 상승했습니다.':'성유물은 그대로 보존됩니다. 사용한 재료와 모라는 소모되었습니다.'),el('p','muted','판정 '+r.roll+' / '+r.successBp));box.append(button('확인',()=>document.getElementById('modal').close(),false,true));showModal(r.success?'성유물 강화 성공':'성유물 강화 실패',box);}
// The forge list (app_enhancement.js) shows artifacts under their own tab and opens this confirm window.
globalThis.CRPGArtifactForge={open:openArtifactConfirm,rules:'타르탈리아에게서 얻은 성유물은 일반 장비 강화와 따로, 야타용왕의 지맥 결정으로 +5까지 강화합니다. 성공률 +1 90% · +2 75% · +3 55% · +4 35% · +5 20% · 실패해도 단계 유지, 파괴 없음.'};
const oldInventory=inventory;inventory=function(p){oldInventory(p);const artifacts=game.s.inventory.filter(i=>i.artifact);if(!artifacts.length)return;const section=el('section','artifact-inventory');section.append(el('h2','','성유물 보유 현황'),el('p','muted','성유물은 특수 장비 칸에 장착합니다. 품질·옵션은 드랍된 개체마다 따로 저장됩니다.'));const grid=el('div','grid');for(const inv of artifacts){const a=inv.artifact,c=el('div','card');c.append(el('h3','',game.row('16_EQUIP_DB',inv.equip)[1]+' · '+a.grade+' +'+a.level),el('small','', '품질 '+a.quality+' / 1000 · '+(inv.equipped?ownerName(inv.owner)+' 장착 중':'미장착')),el('p','equipment-base-stats',statText(game.artifactStats(inv))));grid.append(c);}section.append(grid);p.append(section);};
const oldReward=reward;reward=function(p){oldReward(p);const b=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}'),farm=b.liyueFarm;if(!farm)return;if(farm.artifact){const a=farm.artifact,card=el('section','card artifact-drop');card.append(el('small','eyebrow','타르탈리아 성유물 획득'),el('h2','',a.name+' · '+a.grade),el('p','','품질 '+a.quality+' / 1000 · +0'),el('p','equipment-base-stats',statText(a.stats)),el('p','muted','특수 장비 칸에 장착할 수 있습니다. 같은 종류라도 다음 드랍의 품질과 옵션은 별도로 굴립니다.'));p.append(card);}else if(farm.items?.[cfg.material])p.append(el('section','card artifact-drop','야타용왕의 지맥 결정 ×'+farm.items[cfg.material]+' 획득 · 대장간에서 성유물 강화에 사용할 수 있습니다.'));};
})();
