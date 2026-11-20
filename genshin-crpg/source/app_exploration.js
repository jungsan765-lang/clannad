/* Load after app_adventure.js. */
const explorationDrawLocation=drawLocation;
drawLocation=function(p,v){
 explorationDrawLocation(p,v);if(game.needsRecovery())return;
 const points=game.oculusEntries();if(points.length&&!CRPGRuntime.worldVersion){const section=el('section','exploration-points');section.append(el('h2','','바람의 흔적'));for(const point of points){const card=el('section','card');card.append(el('h3','',point.title),el('p','',point.clue),actionButton('주변을 살펴본다 · 10분','OCULUS_COLLECT',{point:point.id}));section.append(card);}p.append(section);}
 const ritual=game.oculusExchangeEntry();if(ritual){/* 0.16.35: the title with the count on one row, the reward and the button on another (a phone cut it into six pages of one line) */const card=el('section','card oculus-offer'),head=el('div','oo-head'),foot=el('div','oo-foot');head.append(el('h2','',ritual.title),el('b','oo-count','바람 신의 눈동자 '+game.itemCount(CRPGRuntime.explorationCatalog.item)+' / '+ritual.cost));card.append(head,el('p','oo-text',ritual.text));rewardPreview(card,ritual.reward);if(ritual.reason)foot.append(el('small','choice-note',ritual.reason));foot.append(actionButton('눈동자 '+ritual.cost+'개 공양','OCULUS_OFFER',{tier:ritual.id},true));card.append(foot);p.append(card);}
};
const explorationCommissionCard=commissionCard;
commissionCard=function(parent,q,guild=false){explorationCommissionCard(parent,q,guild);const card=parent.lastElementChild;if(card)card.prepend(el('small','quest-level','수락 Lv. '+(q.definition.conditions?.min_level||1)));};
const explorationQuests=quests;
quests=function(p,v){explorationQuests(p,v);const summary=game.oculusSummary();if(summary.collected){const note=el('section','card');note.append(el('h2','','몬드의 바람'),el('p','','발견한 눈동자 '+summary.collected+' / '+summary.total+' · 보유 '+summary.balance),el('p','muted','거목 아래에서 모아 온 바람을 돌려보낼 수 있습니다.'));p.append(note);}};
