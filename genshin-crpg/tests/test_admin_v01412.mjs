// 0.14.12 운영자 도구: console login, locks, every save tool, account tools, bulk gifts, notices and the audit log,
// against the Seoul server in memory.
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {passwordHash} from '../server/game-core.mjs';
import {consoleHash,consoleSecret,readEnv,writeEnv} from '../server/admin-console-setup.mjs';

const pepper='admin-console-test-pepper-'.padEnd(64,'p'),password='correct-horse-battery-staging',consolePassword='console-test-pass';
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++;};

// ---------- setup tool ----------
{
 const salt='ab'.repeat(32);ok(await consoleHash('919191',salt,pepper)===await passwordHash('919191',salt,pepper),'the setup tool hashes exactly like the server');
 const secret=await consoleSecret('919191',pepper);ok(/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(secret),'secret is hex.hex (no $ for shells or systemd)');ok(!secret.includes('919191'),'the password itself is not stored');
 const text='PASSWORD_PEPPER="'+pepper+'"\nADMIN_ACCOUNT_IDS=\nADMIN_CONSOLE_ID=OLD\nPORT=8789\n',env=readEnv(text);ok(env.PASSWORD_PEPPER===pepper&&env.PORT==='8789','env file is read, quotes removed');
 const next=writeEnv(text,{ADMIN_CONSOLE_ID:'CLANNAD',ADMIN_CONSOLE_HASH:secret}),again=readEnv(next);
 ok(again.ADMIN_CONSOLE_ID==='CLANNAD'&&again.ADMIN_CONSOLE_HASH===secret&&again.PORT==='8789'&&again.PASSWORD_PEPPER===pepper,'setup replaces its own lines and keeps the rest');
 ok(next.split('\n').filter(l=>l.startsWith('ADMIN_CONSOLE_ID=')).length===1,'no duplicate lines');
}

async function open(console={}){
 const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop',...console}),base='http://127.0.0.1:'+app.address.port;
 async function api(path,{method='GET',body,token,admin,ip='10.0.0.1'}={}){
  const headers={'x-forwarded-for':ip};if(token)headers.authorization='Bearer '+token;if(admin)headers.authorization='Admin '+admin;if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method:body===undefined?method:'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await response.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}
  return {status:response.status,json};
 }
 return {...app,api,base};
}

// ---------- not configured ----------
{
 const app=await open();
 const r=await app.api('/admin/login',{body:{id:'CLANNAD',password:'919191'}});ok(r.status===503&&r.json.code==='ADMIN_NOT_CONFIGURED','without the setup the console refuses every login');
 ok((await app.api('/admin/overview')).status===401,'no console token, no data');
 await app.close();
}

const app=await open({adminConsoleId:'CLANNAD',adminConsoleHash:await consoleSecret(consolePassword,pepper)}),api=app.api;

// ---------- login, throttle and lock ----------
{
 ok((await api('/admin/overview',{admin:'f'.repeat(64)})).status===401,'a made-up console token is refused');
 const wrong=await api('/admin/login',{body:{id:'CLANNAD',password:'nope'}});ok(wrong.status===401&&/4번 더/.test(wrong.json.error),'wrong password says how many tries are left');
 for(let i=0;i<4;i++)await api('/admin/login',{body:{id:'CLANNAD',password:'nope'}});
 const blocked=await api('/admin/login',{body:{id:'CLANNAD',password:consolePassword}});ok(blocked.status===429&&blocked.json.code==='ADMIN_THROTTLED','five misses block that address even for the right password');
 for(const ip of ['10.0.0.2','10.0.0.3','10.0.0.4','10.0.0.5'])ok((await api('/admin/login',{ip,body:{id:'WHO',password:'x'}})).status===401,'misses from other addresses count too');
 const tenth=await api('/admin/login',{ip:'10.0.0.6',body:{id:'CLANNAD',password:'still-wrong'}});ok(tenth.status===401,'tenth miss');
 const locked=await api('/admin/login',{ip:'10.0.0.9',body:{id:'CLANNAD',password:consolePassword}});ok(locked.status===423&&locked.json.code==='ADMIN_LOCKED','ten misses lock the whole console');
 app.adminConsole.lockedUntil=0;app.adminConsole.ipFails.clear(); // what a service restart does
}
const login=await api('/admin/login',{ip:'10.0.0.9',body:{id:'clannad',password:consolePassword}});ok(login.status===200&&/^[a-f0-9]{64}$/.test(login.json.token),'right ID (any case) and password log in');
const admin=login.json.token,A=(path,body)=>api(path,{admin,body,ip:'10.0.0.9'});
ok(login.json.idleMinutes===30&&login.json.maxHours===8,'console logins expire');
ok(!JSON.stringify(app.adminConsole.sessions).includes(admin),'the server keeps only a hash of the console token');

// ---------- players ----------
const reg=await api('/register',{body:{username:'player_01',password,displayName:'첫모험가'}}),token=reg.json.token;
await api('/register',{body:{username:'player_02',password,displayName:'둘째'}});
const created=await api('/game/new',{token,body:{name:'루미',route:'ROUTE_TRAVELER'}});ok(created.status===200,'journey started');
const player=app.store.account('player_01'),R=()=>app.store.runtimeOf(player.id),rev=()=>app.store.meta(player.id).revision;

// ---------- catalog, list, detail ----------
const catalog=(await A('/admin/catalog')).json;
ok(catalog.items.length>100&&!catalog.items.some(x=>x.id.startsWith('CUR_')||/_SAMPLE$/.test(x.id)),'catalog lists items without currencies or sample rows');
ok(catalog.equipment.some(x=>x.id==='EQ_SWORD_HARBINGER')&&catalog.maps.some(x=>x.id==='MAP_MOND_CITY')&&catalog.characters[0].id==='PLAYER_CUSTOM'&&catalog.characters.length>20,'catalog lists gear, places and characters');
ok(Object.keys(catalog.currencies).length===6,'six currencies');
const list=(await A('/admin/accounts')).json.accounts;ok(list.length===2&&list.some(a=>a.username==='player_01'&&a.journey&&a.name==='루미'),'accounts list shows journeys');
ok((await A('/admin/accounts?q=둘째')).json.accounts.map(a=>a.username).join()==='player_02','search by display name');
const detail=(await A('/admin/account?id='+player.id)).json;ok(detail.summary&&detail.summary.name==='루미'&&detail.summary.currencies.PRIMOGEM===0&&detail.journey.ranked,'detail reads the save');
ok((await A('/admin/account?id=nope')).status===404,'unknown account');

// ---------- save tools ----------
const companion=catalog.characters.find(c=>c.id!=='PLAYER_CUSTOM').id;
let r0=rev();
// 0.15.1: what the console gives waits in the player's mailbox as one gift; the player takes it with MAIL_CLAIM.
let claims=0;const claim=mail=>api('/game/action',{token,body:{version:created.json.version,engineVersion:created.json.engineVersion,type:'MAIL_CLAIM',params:{mail},revision:rev(),requestId:'claim-gift-'+String(++claims).padStart(6,'0'),responseMode:'state-parts-v1'}});
let s=await A('/admin/save',{id:player.id,ops:[{op:'currency',key:'PRIMOGEM',mode:'add',value:1600},{op:'currency',key:'MORA',mode:'set',value:50000},{op:'item',id:'ING_APPLE',count:5}]});
ok(s.status===200&&s.json.changes.length===3&&rev()===r0+1,'several changes land as one save');
const box=R().s.mail.list,gift=box.find(x=>x.kind==='GIFT'),notice=box.find(x=>x.kind==='NOTICE');
ok(!Number(R().s.global.PRIMOGEM)&&R().s.global.MORA===50000&&R().itemCount('ING_APPLE')===0,'grants wait in the mailbox; a value that is set applies at once');
ok(gift&&gift.gifts.currency.PRIMOGEM===1600&&gift.gifts.items.ING_APPLE===5&&!gift.claimed&&s.json.mail.length===2,'one gift mail holds the grants');
ok(notice&&notice.body.includes('모라')&&!notice.read,'a notice mail says what else the operator changed');
ok((await A('/admin/account?id='+player.id)).json.summary.mail.unclaimed===1,'the console shows the gift still waiting');
ok((await claim(gift.id)).status===200&&R().s.global.PRIMOGEM===1600&&R().itemCount('ING_APPLE')===5&&R().s.mail.list.find(x=>x.id===gift.id).claimed,'the player takes it: currencies and items changed');
ok((await claim(gift.id)).status!==200,'a gift is taken once');
const r1=rev(),take=await A('/admin/save',{id:player.id,ops:[{op:'item',id:'ING_APPLE',count:-2},{op:'currency',key:'PRIMOGEM',mode:'add',value:-99999}]});
ok(take.status===400&&rev()===r1&&R().itemCount('ING_APPLE')===5,'a failing change leaves the whole request unapplied');
ok((await A('/admin/save',{id:player.id,ops:[{op:'item',id:'ING_APPLE',count:-2}]})).status===200&&R().itemCount('ING_APPLE')===3,'items are taken back at once');
s=await A('/admin/save',{id:player.id,ops:[{op:'equipment_give',id:'EQ_SWORD_HARBINGER',enhance:5,count:2}]});ok(s.status===200&&(await claim('ALL')).status===200,'gear arrives by mail and is taken');
const gear=R().s.inventory.filter(x=>x.equip==='EQ_SWORD_HARBINGER');
ok(gear.length===2&&gear.every(x=>x.enhance===5),'gear given with its enhancement');
ok((await A('/admin/save',{id:player.id,ops:[{op:'equipment_remove',slot:gear[0].slot}]})).status===200&&R().s.inventory.filter(x=>x.equip==='EQ_SWORD_HARBINGER').length===1,'gear taken back');
s=await A('/admin/save',{id:player.id,ops:[{op:'recruit',char:companion},{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'level',target:companion,value:15},{op:'constellation',char:companion,value:6},{op:'talent',char:companion,kind:'q',value:9}]});
ok(s.status===200,'character tools: '+JSON.stringify(s.json));const rr=R();
ok(rr.adminJoined(companion)&&rr.s.global.PLAYER_LEVEL_STATE===10&&rr.s.chars[companion].level===15&&rr.constellationLevel(companion)===6&&rr.s.talents[companion].q===9,'join, level, constellation and talent changed');
s=await A('/admin/save',{id:player.id,ops:[{op:'teleport',map:'MAP_MOND_CITY'},{op:'heal'},{op:'wish_pity',banner:'EVENT',pity5:70,pity4:3,guarantee5:true},{op:'name',value:'운영테스트'},{op:'abyss_unlock',value:3},{op:'field_boss_reset'},{op:'weekly_reset'}]});
ok(s.status===200,'world tools: '+JSON.stringify(s.json));const rw=R();
ok(rw.s.global.CURRENT_MAP_ID==='MAP_MOND_CITY'&&rw.playPhase()==='FREE'&&rw.s.global.PLAYER_NAME==='운영테스트','teleport frees the journey, name changed');
ok(rw.wishState().EVENT.pity5===70&&rw.wishState().EVENT.guarantee5===true&&rw.s.abyss.clears[2]&&!rw.s.abyss.clears[3],'wish pity and abyss floors');
ok(!rw.s.operatorModified&&app.store.meta(player.id).ranked===1,'console changes do not unrank the journey by themselves');
const flag=catalog.flags.find(f=>f.id.startsWith('FLAG_')).id;ok((await A('/admin/save',{id:player.id,ops:[{op:'flag',key:flag,value:true}]})).status===200&&R().s.flags[flag]===true,'story flag set');
ok((await A('/admin/save',{id:player.id,ops:[{op:'teleport',map:'MAP_NOWHERE'}]})).status===400,'unknown place refused');
ok((await A('/admin/save',{id:player.id,ops:[{op:'drop_table'}]})).status===400,'unknown tool refused');
const receipts=app.store.db.prepare("SELECT COUNT(*) AS n FROM receipts WHERE account_id=? AND request_id LIKE 'admin-%'").get(player.id).n;ok(receipts>=7,'every console change leaves a receipt');
const stale=await api('/game/action',{token,body:{version:created.json.version,engineVersion:created.json.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:r0,requestId:'stale-after-admin-01',responseMode:'state-parts-v1'}});
ok(stale.status===409&&stale.json.code==='REVISION_CONFLICT','the open game is told to load the changed save');
const me=await api('/me',{token});ok(me.json.state.global.PLAYER_NAME==='운영테스트'&&me.json.revision===rev(),'the player sees the change');

// ---------- live notice to the open game ----------
{
 const stream=await fetch(app.base+'/chat/stream',{headers:{authorization:'Bearer '+token}}),reader=stream.body.getReader(),dec=new TextDecoder();let got='';
 await A('/admin/save',{id:player.id,ops:[{op:'currency',key:'STARGLITTER',mode:'add',value:5}]});
 for(let i=0;i<10&&!got.includes('"type":"admin"');i++){const {value}=await reader.read();got+=dec.decode(value||new Uint8Array());}
 ok(got.includes('"type":"admin"')&&got.includes('"sync":true'),'the open game hears about the change at once');await reader.cancel();
}

// ---------- rollback ----------
{
 ok((await claim('ALL')).status===200,'the Starglitter gift is taken');
 const glitter=()=>Number(R().s.global.STARGLITTER||0),before=glitter(),r1=rev();
 const back=await A('/admin/rollback',{id:player.id,steps:1});ok(back.status===200&&glitter()===before-5&&rev()===r1+1,'one step back undoes the last change as a new save');
 ok(R().s.mail.list.some(x=>x.kind==='GIFT'&&!x.claimed&&x.gifts.currency.STARGLITTER===5)&&R().s.mail.list.some(x=>x.kind==='NOTICE'&&x.title.includes('되돌렸')),'the gift waits again and a notice says the journey was put back');
 ok((await A('/admin/rollback',{id:player.id,steps:1})).status===200&&glitter()===before,'rolling back the rollback restores it');
 ok((await A('/admin/rollback',{id:player.id,steps:9})).status===400,'only the kept steps');
}

// ---------- accounts ----------
{
 const pw=await A('/admin/password',{id:player.id});ok(pw.status===200&&pw.json.password.length===12&&pw.json.loggedOut>=1,'a temporary password is made once and old logins end');
 ok((await api('/me',{token})).status===401,'the old login no longer works');
 ok((await api('/login',{body:{username:'player_01',password}})).status===401,'the old password no longer works');
 ok((await api('/login',{body:{username:'player_01',password:pw.json.password}})).status===200,'the temporary password works');
 ok((await A('/admin/password',{id:player.id,password:'short'})).status===400,'short passwords refused');
 ok((await A('/admin/password',{id:player.id,password:'chosen-password-1'})).json.password===null,'a chosen password is not echoed back');
 const t2=(await api('/login',{body:{username:'player_01',password:'chosen-password-1'}})).json.token;ok(!!t2,'chosen password works');
 const ban=await A('/admin/ban',{id:player.id,banned:true,reason:'테스트 제한',hours:24});ok(ban.status===200&&ban.json.until>Date.now(),'ban with a duration');
 ok((await api('/me',{token:t2})).status===401,'a ban ends current logins');
 const denied=await api('/login',{body:{username:'player_01',password:'chosen-password-1'}});ok(denied.status===403&&denied.json.code==='ACCOUNT_BANNED'&&denied.json.error.includes('테스트 제한'),'a banned player sees why');
 ok((await A('/admin/ban',{id:player.id,banned:false})).status===200&&(await api('/login',{body:{username:'player_01',password:'chosen-password-1'}})).status===200,'unban lets them back');
 const out=await A('/admin/logout-account',{id:player.id});ok(out.status===200&&out.json.loggedOut>=1,'force logout');
 ok((await A('/admin/profile',{id:player.id,displayName:'바뀐이름'})).status===200&&app.store.account('player_01').display_name==='바뀐이름','display name changed');
 ok((await A('/admin/profile',{id:player.id,username:'player_02'})).status===409,'login ID must stay unique');
 ok((await A('/admin/profile',{id:player.id,username:'Player_Renamed'})).status===200&&app.store.account('player_renamed'),'login ID changed (lower case)');
 ok((await A('/admin/ranked',{id:player.id,ranked:false})).status===200&&app.store.meta(player.id).ranked===0,'unrank');
 ok((await A('/admin/ranked',{id:player.id,ranked:true})).status===200&&app.store.meta(player.id).ranked===1,'rank again');
}

// ---------- bulk gifts ----------
{
 const second=app.store.account('player_02'),t=(await api('/login',{body:{username:'player_02',password}})).json.token;await api('/game/new',{token:t,body:{name:'둘',route:'ROUTE_ISEKAI'}});
 ok((await A('/admin/bulk',{ops:[{op:'currency',key:'PRIMOGEM',mode:'add',value:160}]})).status===400,'bulk needs the confirmation words');
 ok((await A('/admin/bulk',{ops:[{op:'currency',key:'PRIMOGEM',mode:'set',value:0}],confirm:'전체 지급'})).status===400,'bulk cannot set or take');
 ok((await A('/admin/bulk',{ops:[{op:'equipment_give',id:'EQ_SWORD_HARBINGER'}],confirm:'전체 지급'})).status===400,'bulk gives only currencies and items');
 const bulk=await A('/admin/bulk',{ops:[{op:'currency',key:'PRIMOGEM',mode:'add',value:160},{op:'item',id:'ING_APPLE',count:1}],confirm:'전체 지급',mailTitle:'점검 보상',mailBody:'기다려 주셔서 고맙습니다.'});
 ok(bulk.status===200&&bulk.json.targets===2&&bulk.json.done===2,'bulk reached both journeys');
 const waits=r=>r.s.mail.list.some(x=>x.kind==='GIFT'&&!x.claimed&&x.title==='점검 보상'&&x.body==='기다려 주셔서 고맙습니다.'&&x.gifts.currency.PRIMOGEM===160&&x.gifts.items.ING_APPLE===1);
 ok(waits(R())&&waits(app.store.runtimeOf(second.id)),'both got the gift in their mailbox, with the title and words given');
}

// ---------- notices and chat ----------
{
 const n=await A('/admin/notice',{text:'  점검 안내\n오늘 밤 '});ok(n.status===200&&n.json.message.staff===true&&n.json.message.text==='점검 안내 오늘 밤','notice posted as staff');
 const t=(await api('/login',{body:{username:'player_02',password}})).json.token,recent=await api('/chat/recent',{token:t});
 ok(recent.json.messages.some(m=>m.author==='운영자 공지'&&m.staff),'players see the notice');
 ok((await api('/login',{body:{username:'#system',password:'anything-long'}})).status===401,'the notice account can never log in');
 ok(!(await A('/admin/accounts')).json.accounts.some(a=>a.username==='#system'),'the notice account is not listed');
 const said=await api('/chat/send',{token:t,body:{text:'안녕하세요'}}),del=await A('/admin/chat-delete',{id:said.json.message.id});
 ok(del.status===200&&(await A('/admin/chat')).json.messages.find(m=>m.id===said.json.message.id).deleted,'console hides chat lines');
}

// ---------- audit ----------
{
 const audit=(await A('/admin/audit')).json.entries,ops=new Set(audit.map(x=>x.op));
 for(const op of ['login','login-fail','save','rollback','password','ban','unban','logout','profile','rank-off','bulk','notice','chat-delete'])ok(ops.has(op),'audit has '+op);
 const all=JSON.stringify(app.store.db.prepare('SELECT * FROM admin_audit').all());
 ok(!all.includes('chosen-password-1')&&!all.includes(consolePassword),'no password ever reaches the audit log');
 ok((await A('/admin/account?id='+player.id)).json.audit.length>5,'each account shows its own record');
 const o=(await A('/admin/overview')).json;ok(o.accounts===2&&o.journeys===2&&o.dbBytes>0&&o.server.version,'overview');
}

// ---------- reset and delete ----------
{
 ok((await A('/admin/reset-journey',{id:player.id,confirm:'wrong'})).status===400,'reset needs the login ID');
 ok((await A('/admin/reset-journey',{id:player.id,confirm:'player_renamed'})).status===200&&app.store.meta(player.id)===undefined,'journey reset');
 const t=(await api('/login',{body:{username:'player_renamed',password:'chosen-password-1'}})).json.token;ok((await api('/me',{token:t})).json.state===null,'the player starts over');
 ok((await A('/admin/save',{id:player.id,ops:[{op:'heal'}]})).status===409,'no journey, no save tools');
 ok((await A('/admin/delete-account',{id:player.id,confirm:'player_renamed'})).status===200&&!app.store.account('player_renamed'),'account deleted');
 ok((await api('/me',{token:t})).status===401,'its logins are gone');
}

// ---------- console session ----------
{
 ok((await A('/admin/nothing',{})).status===404,'unknown console request');
 for(const s of app.adminConsole.sessions.values())s.seen-=31*60000;
 ok((await A('/admin/overview')).status===401,'30 idle minutes end the console login');
 const again=(await api('/admin/login',{ip:'10.0.0.9',body:{id:'CLANNAD',password:consolePassword}})).json.token;
 ok((await api('/admin/logout',{admin:again,body:{}})).status===200&&(await api('/admin/overview',{admin:again})).status===401,'console logout');
}
await app.close();
console.log(JSON.stringify({ok:true,checks}));
