// 0.16.67 정기 축제 on the Seoul server (server/festivals-v01667.mjs): the festivals open by the Korean calendar, the operator moves a
// year's days, switches one off or opens one now for a test, and the engine gets the open one with each action (env.OP_EVENTS).
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {consoleSecret} from '../server/admin-console-setup.mjs';
import {ENGINE_VERSION} from '../server/generated/engine.mjs';
import {defaultWindow,LUNAR_DAYS} from '../server/festivals-v01667.mjs';

const pepper='festival-test-pepper-'.padEnd(64,'p'),password='correct-horse-battery-festival',consolePassword='console-test-pass';
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++;};
const KST=9*3600000,DAY=86400000,day=s=>Date.parse(s+'T00:00:00+09:00');
// the calendar: KST midnights, 설날·추석 a week each side, Christmas 12/18 – 1/1
ok(defaultWindow('XMAS',2026).startsAt===day('2026-12-18')&&defaultWindow('XMAS',2026).endsAt===day('2027-01-02'),'눈꽃 축제 2026: 12/18 – 1/1');
ok(defaultWindow('SEOLLAL',2027).startsAt===day('2027-01-31')&&defaultWindow('SEOLLAL',2027).endsAt===day('2027-02-15'),'설날 2027 (2/7): 1/31 – 2/14');
ok(defaultWindow('CHUSEOK',2028).startsAt===day('2028-09-26')&&defaultWindow('CHUSEOK',2028).endsAt===day('2028-10-11'),'추석 2028 (10/3): 9/26 – 10/10');
ok(defaultWindow('SEOLLAL',2031)===null,'a year not written opens nothing by itself');
ok(Object.values(LUNAR_DAYS).every(m=>Object.keys(m).length>=5),'five years written');
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,adminConsoleId:'CLANNAD',adminConsoleHash:await consoleSecret(consolePassword,pepper),features:['chat','trade','coop']}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{body,token,admin}={}){
 const headers={'x-forwarded-for':'10.2.0.'+(1+Math.floor(Math.random()*200))};if(token)headers.authorization='Bearer '+token;if(admin)headers.authorization='Admin '+admin;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
try{
 const store=app.store;
 // inside a window by the calendar: the festival and its exchange are in the list
 const xmas=store.festivalEvents(day('2026-12-20')+3600000);ok(xmas.some(e=>e.kind==='SEASON'&&e.id==='FES_XMAS_2026')&&xmas.some(e=>e.kind==='FESTIVAL'&&e.id==='EVT_FES_XMAS_2026'),'12/20: 눈꽃 축제 and its 축제 교환');
 ok(store.festivalEvents(day('2027-01-05')).some(e=>e.id==='FES_XMAS_2026')&&!store.festivalEvents(day('2027-01-05')).some(e=>e.kind==='FESTIVAL'),'a few days after: the festival for its pick, no exchange');
 ok(!store.festivalEvents(day('2027-01-12')).length,'a week after: gone');
 ok(store.festivalEvents(day('2027-02-07')).some(e=>e.id==='FES_SEOLLAL_2027'),'설날 2027');
 ok(store.festivalNextAt(day('2026-12-17')+3600000)===day('2026-12-18'),'the next opening is told a day before');
 const admin=(await api('/admin/login',{body:{id:'CLANNAD',password:consolePassword}})).json.token,A=(path,body)=>api(path,{admin,body});
 const list=(await A('/admin/festivals')).json;ok(list.festivals.map(f=>f.key).join()==='XMAS,SEOLLAL,CHUSEOK'&&list.festivals[0].years.length===2,'the operator sees each festival, this year and the next');
 // move a year's days, switch one off, back to the calendar
 let r=await A('/admin/festivals',{op:'set',festival:'SEOLLAL',year:2027,first:'2027-02-01',last:'2027-02-10'});ok(r.status===200&&r.json.window.startsAt===day('2027-02-01')&&r.json.window.endsAt===day('2027-02-11'),'moved');
 ok(!store.festivalEvents(day('2027-01-31')+3600000).some(e=>e.id==='FES_SEOLLAL_2027')&&store.festivalEvents(day('2027-02-01')+3600000).some(e=>e.id==='FES_SEOLLAL_2027'),'opens on the new day');
 ok((await A('/admin/festivals',{op:'set',festival:'SEOLLAL',year:2027,first:'2027-02-30',last:'2027-03-01'})).status===400,'a date that does not exist');
 ok((await A('/admin/festivals',{op:'set',festival:'SEOLLAL',year:2027,first:'2027-02-10',last:'2027-02-01'})).status===400,'backwards');
 await A('/admin/festivals',{op:'off',festival:'SEOLLAL',year:2027,off:true});ok(!store.festivalEvents(day('2027-02-05')).some(e=>e.festival==='SEOLLAL'),'switched off');
 await A('/admin/festivals',{op:'reset',festival:'SEOLLAL',year:2027});ok(store.festivalEvents(day('2027-02-05')).some(e=>e.id==='FES_SEOLLAL_2027')&&store.festivalWindow('SEOLLAL',2027).startsAt===day('2027-01-31'),'back to the calendar');
 // a test opening now: every day open, players and the engine see it
 const reg=await api('/register',{body:{username:'fest_one',password,displayName:'하나'}});const token=reg.json.token;
 const started=await api('/game/new',{token,body:{name:'하나',route:'ROUTE_ISEKAI'}});const rev=Number(started.json.revision??started.json.journey?.revision??1);
 r=await A('/admin/festivals',{op:'test',festival:'SEOLLAL',days:3});ok(r.status===200&&/^FES_SEOLLAL_T\d+$/.test(r.json.test.id),'a test opening');
 ok((await A('/admin/festivals',{op:'test',festival:'XMAS',days:3})).status===409,'one test at a time');
 const seen=(await api('/events',{token})).json;const fest=seen.events.find(e=>e.kind==='SEASON');ok(fest&&fest.allDays===true&&seen.events.some(e=>e.kind==='FESTIVAL'&&e.id==='EVT_'+fest.id),'players see the festival (every day open) and its exchange');
 ok((await A('/admin/events',{op:'open',kind:'FESTIVAL',days:3})).status===409,'no second 축제 교환 while a festival runs');
 const act=await api('/game/action',{token,body:{type:'FESTIVAL_STORY',params:{festival:fest.id,part:2},requestId:'festival-story-0001-abcd',revision:rev,version:ENGINE_VERSION}});
 ok(act.status===400&&/앞 이야기를 먼저/.test(act.json.error),'the engine gets the festival with an action: '+act.json.error);
 const one=await api('/game/action',{token,body:{type:'FESTIVAL_STORY',params:{festival:fest.id,part:1},requestId:'festival-story-0002-abcd',revision:rev,version:ENGINE_VERSION}});
 ok(one.status===200&&one.json.result?.result?.primogem===160,'part 1 seen: 원석 160');
 const audit=JSON.stringify((await A('/admin/audit')).json);ok(audit.includes('festival-test')&&audit.includes('festival-set'),'the operator log records it');
 const num=(await A('/admin/festivals')).json.tests[0].num;ok((await A('/admin/festivals',{op:'test-close',num})).status===200,'closed');
 ok(!(await api('/events',{token})).json.events.some(e=>e.kind==='SEASON'),'gone for players');
}finally{await app.close();}
console.log(JSON.stringify({ok:true,checks}));
