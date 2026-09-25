/* A small clue lives in the scrollable scene, with an equivalent keyboard path. */
const discoveryScenePanel=scenePanel;
scenePanel=function(v){
 const scene=discoveryScenePanel(v),point=game.oculusEntries?.().find(p=>p.method==='HIDDEN'&&!game.oculusProgress(p.id));
 if(!point||game.s.placeVisit||game.playPhase()!=='FREE'||game.s.global.SCREEN_MODE!=='LOCATION')return scene;
 const wrapper=el('section','discovery-scene'),panorama=el('div','scene-panorama');
 while(scene.firstChild)panorama.append(scene.firstChild);scene.append(panorama);scene.classList.add('scene-search');scene.setAttribute('aria-label','좌우로 살펴볼 수 있는 주변 풍경');scene.tabIndex=0;
 const clue=actionButton('✧','WORLD_WORK_START',{kind:'OCULUS',point:point.id});clue.classList.add('scene-clue');clue.setAttribute('aria-label',point.hotspot?.accessibleLabel||'반짝이는 풀숲 조사');clue.title=point.clue||'주변에 희미하게 반짝이는 것이 있다';panorama.append(clue);
 const hint=el('div','scene-search-hint');hint.append(el('small','','풍경을 좌우로 움직여 주변을 살펴볼 수 있습니다.'),button('주변 살펴보기',()=>{scene.scrollTo({left:scene.scrollWidth,behavior:settings.reducedMotion?'instant':'smooth'});clue.focus({preventScroll:true});}));wrapper.append(scene,hint);return wrapper;
};
