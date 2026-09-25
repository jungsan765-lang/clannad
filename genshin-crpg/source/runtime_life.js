/* Place-specific resources, fishing, and local story contacts. */
(function(root){
 'use strict';
 const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x)),parse=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
 const fail=(c,m)=>{throw new api.RuleError(c,m);},old=Object.fromEntries(['newGame','validateSave','apply','actionReason','lifePool','startLife','lifeEntries','placeCatalog'].map(k=>[k,P[k]]));
 const kinds={GATHER:{label:'채집',column:25,limit:4},MINE:{label:'채광',column:26,limit:6},FISH:{label:'낚시',column:27,limit:4},HUNT:{label:'사냥',column:28,limit:4}};
 const BAIT='CRPG_FRUIT_BAIT',TAVERN='EVT_CRPG_ANGELS_SHARE',SARA='EVT_SCHEDULE_NPC_MOND_SARA';
 const sites=[
  ['MAP_CRPG_MOND_QUARRY','몬드 동쪽 광산','MAP_MOND_PLAINS','MINE',1],
  ['MAP_CRPG_CIDER_BANK','시드르 호수 낚시터','MAP_MOND_CITY','FISH',1],
  ['MAP_CRPG_WHISPER_HUNT','속삭임의 숲 사냥터','MAP_MOND_FOREST','HUNT',2],
  ['MAP_CRPG_DAWN_BANK','와이너리 강변 낚시터','MAP_MOND_DAWN_WINERY','FISH',2],
  ['MAP_CRPG_SPRING_POOL','샘물 연못 낚시터','MAP_MOND_SPRINGVALE','FISH',2],
  ['MAP_CRPG_LIYUE_BANK','리월항 방파제 낚시터','MAP_LIYUE_HARBOR','FISH',3]
 ].map(([id,name,parent,kind,level])=>({id,name,parent,kind,level}));
 const primary={MAP_MOND_PLAINS:'GATHER',MAP_MOND_FOREST:'GATHER',MAP_MOND_WINDRISE:'FISH',MAP_MOND_SPRINGVALE:'HUNT',MAP_MOND_WOLVENDOM:'HUNT',MAP_DRAGONSPINE:'MINE',MAP_STORMTERROR_LAIR:'MINE',MAP_MOND_DAWN_WINERY:'GATHER',MAP_LIYUE_PLAINS:'GATHER',MAP_LIYUE_MOUNTAINS:'HUNT',MAP_CHASM_SURFACE:'MINE',MAP_CHASM_DEEP:'MINE'};
 // All Mond contacts are explicitly assigned; the guild is not an alternative recruitment desk.
 const contactOwners={
  [SARA]:['MOND_AMBER','MOND_BENNETT','MOND_NOELLE','MOND_DIONA','MOND_FISCHL','MOND_BARBARA','MOND_DAHLIA','MOND_KLEE','MOND_MIKA','MOND_SUCROSE','MOND_RAZOR'],
  [TAVERN]:['MOND_DILUC','MOND_KAEYA','MOND_JEAN','MOND_EULA','MOND_ALBEDO','MOND_MONA','MOND_LISA','MOND_ROSARIA','MOND_VENTI']
 };
 const poolText=(r,kind)=>String(r?.[kinds[kind]?.column]||'NONE');
 const parsePool=text=>text.split(';').map(x=>/^([A-Z0-9_]+):(\d+)(?:-(\d+))?@(\d+)$/.exec(x.trim())).filter(Boolean).map(m=>({item:m[1],min:+m[2],max:+(m[3]||m[2]),weight:+m[4]}));
 P.installLifeContent=function(){
  if(this._lifeInstalled)return;this.installExplorationContent();this.db={...this.db};
  const table=(key,edit)=>{const rows=this.db[key].map(r=>r.slice());edit(rows);this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));};
  table('32_MAP_DB',rows=>{
   const by=id=>rows.find(r=>r[0]===id);
   for(const s of sites){if(by(s.id))continue;const r=by(s.parent).slice();Object.assign(r,{0:s.id,2:s.name,3:s.parent,4:'생활 구역',6:s.level,7:Math.max(s.level,4),8:s.kind==='HUNT'?'Y':'N',9:s.kind==='HUNT'?5:0,12:'N',13:'',18:'',19:0,20:'N',21:''});for(let i=25;i<=28;i++)r[i]='NONE';r[kinds[s.kind].column]=s.kind==='MINE'?'ORE_IRON:1@65;ORE_WHITE_IRON:1@30;ORE_CRYSTAL:1@5':s.kind==='FISH'?'ING_FISH:2-4@100':'ING_RAW_MEAT:3-5@60;ING_FOWL:3-5@40';rows.push(r);}
   for(const [id,kind]of Object.entries(primary)){const r=by(id);if(!r)continue;if(poolText(r,kind)==='NONE'){const source=by(kind==='GATHER'?'MAP_MOND_PLAINS':kind==='HUNT'?'MAP_MOND_FOREST':'MAP_MOND_PLAINS');r[kinds[kind].column]=poolText(source,kind);}}
  });
  table('47_MAP_EDGE_DB',rows=>{for(const s of sites)for(const reverse of [false,true]){const from=reverse?s.id:s.parent,to=reverse?s.parent:s.id,id='EDGE_CRPG_LIFE_'+s.id+(reverse?'_OUT':'_IN');if(!rows.some(r=>r[0]===id))rows.push([id,from,to,'WORLD_MOVE',1,10,'','','Y',reverse?'주변 구역으로 돌아간다':s.name+'(으)로 이동','EDGE_CRPG_LIFE_'+s.id+(reverse?'_IN':'_OUT'),'ACTIVE','CRPG_LOCAL_V010','전용 생활 구역']);}});
  table('34_MAP_ENCOUNTER_POOL',rows=>{
   // An undefined parent must not match a blank spreadsheet row.
   const hasPool=id=>!!id&&rows.some(r=>r[1]===id&&r[5]&&r[2]==='d100');
   for(const map of this.rows('32_MAP_DB')){
    const kind=this.lifeKindAt(map[0]);if(!['GATHER','HUNT'].includes(kind)||hasPool(map[0]))continue;
    const parent=sites.find(s=>s.id===map[0])?.parent||map[3];
    const source=hasPool(parent)?parent:map[1]==='몬드'?'MAP_MOND_PLAINS':map[1]==='리월'?'MAP_LIYUE_PLAINS':null;
    if(!hasPool(source))continue;
    for(const original of rows.filter(r=>r[1]===source&&r[5]&&r[2]==='d100')){
     const r=original.slice();r[0]='POOL_LIFE_'+map[0]+'_'+r[3];r[1]=map[0];rows.push(r);
    }
   }
  });
  table('14_ITEM_DB',rows=>{if(!rows.some(r=>r[0]===BAIT))rows.push([BAIT,'과일 미끼','낚시 도구','일반','','낚싯바늘에 달아 물고기를 유인하는 과일 반죽.','낚시터','낚시를 시작할 때 1개 사용','','','N','공용','','',2,8,999,'몬드 잡화 상인 · 공용 조리시설','Y','N','공용','CRPG_LOCAL_V010','']);});
  const rodStocks=this.rows('19_SHOP_STOCK_DB').filter(r=>r[3]==='TRPG_FISHING_ROD');
  table('19_SHOP_STOCK_DB',rows=>{for(const stock of rodStocks){const id=stock[1]==='MRC_MOND_GENERAL'?'STK_CRPG_FRUIT_BAIT':'STK_CRPG_FRUIT_BAIT_'+stock[1];if(rows.some(r=>r[0]===id))continue;const r=stock.slice();r[0]=id;r[3]=BAIT;r[4]='과일 미끼';r[5]=8;r[6]=40;r[7]='매일';r[8]='';rows.push(r);}});
  table('17_RECIPE_DB',rows=>{if(!rows.some(r=>r[0]==='REC_CRPG_FRUIT_BAIT'))rows.push(['REC_CRPG_FRUIT_BAIT','요리','ITEM',BAIT,10,'ING_SUNSETTIA',1,'ING_FLOUR',1,'',0,'',0,'',0,0,'조리시설','조리시설','기본 해금','5분',100,'과일 미끼 10개']);});
  table('48_RECIPE_INGREDIENT_DB',rows=>{for(const [i,item]of ['ING_SUNSETTIA','ING_FLOUR'].entries())if(!rows.some(r=>r[0]==='RI_CRPG_BAIT_'+i))rows.push(['RI_CRPG_BAIT_'+i,'REC_CRPG_FRUIT_BAIT',i+1,item,1,'','','CRPG_LOCAL_V010']);});
  table('51_EVENT_DB',rows=>{if(!rows.some(r=>r[0]===TAVERN)){const r=rows.find(r=>r[0]===SARA).slice(),d=parse(r[13]);Object.assign(d,{entity_id:'NPC_CRPG_CHARLES',merchant_id:null,label:'천사의 몫 · 찰스',facility:'천사의 몫',map_ids:['MAP_MOND_CITY'],from_minute:600,to_minute:1440});r[0]=TAVERN;r[13]=JSON.stringify(d);rows.push(r);}});
  this._placeCatalog=null;this._lifeInstalled=true;
 };
 P.lifeKindAt=function(map=this.s.global.CURRENT_MAP_ID){const r=this.tables['32_MAP_DB'].get(map);if(!r)return null;const explicit=sites.find(s=>s.id===map)?.kind||primary[map];if(explicit)return explicit;const possible=Object.keys(kinds).filter(k=>poolText(r,k)!=='NONE'&&parsePool(poolText(r,k)).length);if(/유적|산악|설원|화산|절벽|지하/.test(r[2])&&possible.includes('MINE'))return 'MINE';if(/수중|해안|파도/.test(r[2])&&possible.includes('FISH'))return 'FISH';return possible[0]||null;};
 P.lifePool=function(kind,map=this.s.global.CURRENT_MAP_ID){
  if(this.lifeKindAt(map)!==kind)return [];const r=this.tables['32_MAP_DB'].get(map);let pool=parsePool(poolText(r,kind)).filter(x=>this.tables['14_ITEM_DB'].has(x.item));
  if(kind==='MINE'&&r[1]==='몬드')pool=[{item:(map==='MAP_DRAGONSPINE'||root.CRPGWorldContent?.newMaps.some(m=>m.id===map&&m.theme.startsWith('DRAGONSPINE')))?'ORE_STARSILVER':'ORE_IRON',min:1,max:1,weight:65},{item:'ORE_WHITE_IRON',min:1,max:1,weight:30},{item:'ORE_CRYSTAL',min:1,max:1,weight:5}];
  if(kind==='GATHER'&&r[1]==='몬드'){pool=pool.filter(x=>x.item!=='ING_BIRD_EGG');pool.push({item:'ING_BIRD_EGG',min:3,max:5,weight:35});}
  if(['GATHER','HUNT'].includes(kind))pool=pool.map(x=>({...x,min:Math.max(3,x.min),max:Math.max(5,x.max)}));
  if(kind==='FISH')pool=pool.map(x=>({...x,min:Math.max(2,x.min),max:Math.max(4,x.max)}));return pool;
 };
 P.lifeJobDuration=function(kind){return kind==='FISH'?20000:10000;};
 P.lifeEntries=function(){return old.lifeEntries.call(this).map(e=>({...e,seconds:e.kind==='FISH'?20:10,interactive:e.kind==='FISH'}));};
 P.startLife=function(kind){const result=old.startLife.call(this,kind);if(kind==='FISH'){this.pay({items:{[BAIT]:1}});Object.assign(this.s.lifeJob,{duration:20000,fishing:{version:1,seed:Math.floor(this.random()*0x100000000),bait:BAIT}});}return copy(this.s.lifeJob);};
 P.finishLife=function(id,a={}){
  const reason=this.actionReason('LIFE_FINISH',{job:id});if(reason)fail('LIFE',reason);const job=this.s.lifeJob,elapsed=Date.now()-job.startedAt;let caught=true;
  if(job.kind==='FISH'){
   if(!Number.isFinite(a.elapsed)||a.elapsed<0||a.elapsed>job.duration||a.elapsed>elapsed+100||!Array.isArray(a.controls)||a.controls.length>400)fail('FISH_INPUT','낚시 진행 기록을 확인해 주세요.');
   let last=-1;for(const c of a.controls){if(!Number.isInteger(c.at)||c.at<0||c.at>Math.min(a.elapsed,job.duration)||c.at<last||typeof c.hold!=='boolean')fail('FISH_INPUT','낚시 조작 시간이 올바르지 않습니다.');last=c.at;}
   const result=root.CRPGFishing.simulate(job,a.controls,a.elapsed);caught=result.caught;if(!caught&&a.elapsed<job.duration)fail('FISH_WAIT','낚싯줄의 장력을 맞춰 물고기를 끌어올려 주세요.');
  }else if(elapsed<job.duration)fail('LIFE_WAIT','작업 게이지가 찰 때까지 기다려 주세요.');
  const items={};if(caught){const pool=this.lifePool(job.kind,job.map),draw=()=>{let n=this.random()*pool.reduce((sum,x)=>sum+x.weight,0);for(const d of pool){n-=d.weight;if(n<0)return d;}return pool[pool.length-1];};
   const d=draw();items[d.item]=d.min+Math.floor(this.random()*(d.max-d.min+1));
   if(job.kind==='GATHER'){const other=draw();items[other.item]=(items[other.item]||0)+other.min+Math.floor(this.random()*(other.max-other.min+1));}
   for(const [item,n]of Object.entries(items))this.giveItem(item,n);
  }
  this.s.lifeResources??={};const key=job.map+':'+job.kind,prior=this.s.lifeResources[key];this.s.lifeResources[key]={day:job.day,used:(prior?.day===job.day?prior.used:0)+1};
  delete this.s.lifeJob;this.advanceTime(10);this.s.global.SCREEN_MODE='LOCATION';let encounter=null;
  if(['GATHER','HUNT'].includes(job.kind)){const map=this.row('32_MAP_DB',job.map).slice();if(map[12]!=='Y'){map[8]='Y';map[9]=5;if(this.rows('34_MAP_ENCOUNTER_POOL').some(r=>r[1]===map[0]&&r[5]))encounter=this.rollEncounter(map);}}
  return {job:job.id,kind:job.kind,items,minutes:10,caught,encounter};
 };
 P.legendContactAllowed=function(d,place=this.currentPlace()){
  if(!d||d.kind!=='LEGEND'||!place?.valid)return false;
  const owner=this.tables['04_CHAR_DB'].get(d.PROFILE_ID)?.[1]||d.CHAR_ID||d.CHARACTER_ID;
  if(d.REGION==='몬드'||String(owner).startsWith('MOND_'))return !!contactOwners[place.place]?.includes(owner);
  return ['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(place.entity)&&place.mode==='TALK';
 };
 P.legendIntroductionPlaces=function(d){
  if(!d)return [];
  const places=this.placeCatalog().filter(p=>this.legendContactAllowed(d,{...p,place:p.id,valid:true,mode:p.modes.includes('TALK')?'TALK':p.modes[0]}));
  // Prefer the quest's own region without changing either guild's non-Mond permissions.
  return places.sort((a,b)=>Number(b.maps.includes(d.MAP_ID))-Number(a.maps.includes(d.MAP_ID)));
 };
 P.legendIntroductionLabel=function(d){return this.legendIntroductionPlaces(d).map(p=>p.name).join(' / ')||'이 임무의 소개 인물';};
 P.legendContactEntries=function(){
  // Keep assigned, locked offers visible. Introduction ignores the eventual quest map,
  // but the start action still requires that map and all individual prerequisites.
  return this.storyEntries().filter(e=>e.kind==='LEGEND'&&e.definition.STATUS==='ACTIVE'&&this.legendContactAllowed(e.definition)&&!this.storyDone(e.id));
 };
 P.actionReason=function(type,a={}){
  if(type==='LEGEND_REGISTER'&&!this.atGuild()){
   const d=this.storyDefinition(a.quest);if(this.playPhase()!=='FREE')return '현재 이야기와 진행 중인 행동을 먼저 마쳐 주세요.';
   if(!this.legendContactAllowed(d))return '이 개인 임무를 소개하는 인물을 찾아가 주세요.';
   if(d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID||d.STATUS!=='ACTIVE'||!this.storyCondition(d.START_CONDITION,d))return '개인 임무의 선행 이야기를 먼저 진행해 주세요.';
   if(this.storyDone(d.id)||this.legendRegistered(d.id))return '이미 소개받았거나 마친 개인 임무입니다.';return '';
  }
  const reason=old.actionReason.call(this,type,a);if(reason)return reason;
  if(type==='LIFE_START'&&a.kind==='FISH'){if(!this.itemCount('TRPG_FISHING_ROD'))return '기본 낚싯대가 필요합니다. 몬드 잡화 상인에게 구입할 수 있습니다.';if(!this.itemCount(BAIT))return '과일 미끼가 필요합니다. 잡화 상인에게 구입하거나 조리시설에서 만들 수 있습니다.';}
  return '';
 };
 P.apply=function(a){if(a.type==='LIFE_FINISH')return this.finishLife(a.job,a);return old.apply.call(this,a);};
 P.newGame=function(o){this.installLifeContent();old.newGame.call(this,o);this.s.lifeRevision=2;return copy(this.s);};
 P.validateSave=function(s){
  this.installLifeContent();
  if(s.lifeRevision===undefined){
   // Preserve depleted resources when the old all-purpose region is split.
   s.lifeResources??={};for(const site of sites){const prior=s.lifeResources[site.parent+':'+site.kind];if(prior&&!s.lifeResources[site.id+':'+site.kind])s.lifeResources[site.id+':'+site.kind]=copy(prior);}
   if(s.lifeJob&&(this.lifeKindAt(s.lifeJob.map)!==s.lifeJob.kind||s.lifeJob.kind==='FISH')){delete s.lifeJob;s.global.SCREEN_MODE='LOCATION';}
   s.lifeRevision=2;
  }
  old.validateSave.call(this,s);if(s.lifeRevision!==2)fail('LIFE_SAVE','생활 활동 버전을 확인해 주세요.');
  const j=s.lifeJob;if(j?.kind==='FISH'){if(j.fishing?.version!==1||!Number.isInteger(j.fishing.seed)||j.fishing.seed<0||j.fishing.seed>0xffffffff||j.fishing.bait!==BAIT||!s.inventory.some(i=>i.item==='TRPG_FISHING_ROD'&&i.quantity>0))fail('FISH_SAVE','진행 중인 낚시 정보를 확인해 주세요.');}
  return s;
 };
 api.lifeCatalog={sites,primary,kinds,bait:BAIT,tavern:TAVERN,sara:SARA};
})(globalThis);
/* Shared deterministic tension simulation. Outcome is re-computed by the runtime. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const target=(seed,ms)=>.5+.21*Math.sin(ms/1900+(seed%19))+.08*Math.sin(ms/730+(seed%7));
 function simulate(job,controls=[],elapsed=0){let cursor=.5,progress=12,hold=false,index=0,caught=false,caughtAt=null;const end=Math.min(job.duration,Math.max(0,elapsed));
  for(let t=0;t<end;t+=20){while(index<controls.length&&controls[index].at<=t){hold=controls[index++].hold;}if(t<2000)continue;const dt=Math.min(20,end-t)/1000;cursor=clamp(cursor+(hold?.42:-.32)*dt,0,1);const center=target(job.fishing.seed,t);progress=clamp(progress+(Math.abs(cursor-center)<=.16?16:-8)*dt,0,100);if(progress>=100){caught=true;caughtAt=t+20;break;}}
  return {cursor,progress,caught,caughtAt,target:target(job.fishing.seed,end),bite:end>=2000,remaining:Math.max(0,job.duration-end)};
 }
 root.CRPGFishing={simulate,target};
})(globalThis);
