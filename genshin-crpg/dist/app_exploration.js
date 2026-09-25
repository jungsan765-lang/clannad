/* Load after app_adventure.js. */
const explorationDrawLocation=drawLocation;
drawLocation=function(p,v){
 explorationDrawLocation(p,v);if(game.needsRecovery())return;
 const points=game.oculusEntries();if(points.length&&!CRPGRuntime.worldVersion){const section=el('section','exploration-points');section.append(el('h2','','바람의 흔적'));for(const point of points){const card=el('section','card');card.append(el('h3','',point.title),el('p','',point.clue),actionButton('주변을 살펴본다 · 10분','OCULUS_COLLECT',{point:point.id}));section.append(card);}p.append(section);}
 const ritual=game.oculusExchangeEntry();if(ritual){const card=el('section','card');card.append(el('h2','',ritual.title),el('p','',ritual.text),el('p','','바람 신의 눈동자 '+game.itemCount(CRPGRuntime.explorationCatalog.item)+' / '+ritual.cost));if(ritual.reward.character)card.append(el('p','','동행 약속 · 벤티'));else rewardPreview(card,ritual.reward);if(ritual.reason)card.append(el('small','choice-note',ritual.reason));card.append(actionButton(ritual.reward.character?'바람에 답하고 동행을 약속한다':'눈동자 '+ritual.cost+'개 공양','OCULUS_OFFER',{tier:ritual.id},true));p.append(card);}
};
const explorationCommissionCard=commissionCard;
commissionCard=function(parent,q,guild=false){explorationCommissionCard(parent,q,guild);const card=parent.lastElementChild;if(card)card.prepend(el('small','quest-level','수락 Lv. '+(q.definition.conditions?.min_level||1)));};
const explorationQuests=quests;
quests=function(p,v){explorationQuests(p,v);const summary=game.oculusSummary();if(summary.collected){const note=el('section','card');note.append(el('h2','','몬드의 바람'),el('p','','발견한 눈동자 '+summary.collected+' / '+summary.total+' · 보유 '+summary.balance),el('p','muted','거목 아래에서 모아 온 바람을 돌려보낼 수 있습니다.'));p.append(note);}};
