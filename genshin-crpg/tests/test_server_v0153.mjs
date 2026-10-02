// 0.15.3 on the Seoul account server: other adventurers see the journey's name, never the login id (user: 「채팅은 플레이어
// 아이디 말고 이름으로 나오게 해줘」). Chat, profiles, the online list and the letter search follow the protagonist's name;
// rows written before the change are rewritten once at start. New journeys start with the starter kit (runtime test
// tests/test_v0153.cjs covers the rules).
import assert from 'node:assert/strict';
import {startLiveRegionStaging,migrateHeroNames} from '../server/fixed-region-live.mjs';

const pepper='server-v0153-test-pepper-'.padEnd(64,'s'),password='correct-horse-battery-v0153';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{body,token}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json,text};
}
const checks=[];const check=(name,fn)=>{app.store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
const register=async(username,displayName)=>{const reg=await api('/register',{body:{username,password,...(displayName?{displayName}:{})}});assert.equal(reg.status,200,JSON.stringify(reg.json));return reg.json.token;};

try{
await check('chat, profiles, the online list and the letter search show the journey name; the login id never leaves the server',async()=>{
 const token=await register('login_secret_77');
 const early=await api('/chat/send',{token,body:{text:'안녕하세요'}});assert.equal(early.status,200);assert.equal(early.json.message.author,'새 모험가','no journey yet: no public name');
 assert.equal((await api('/game/new',{token,body:{name:'바람의 길손',route:'ROUTE_TRAVELER'}})).status,200);
 const me=await api('/me',{token});assert.equal(me.json.account.displayName,'바람의 길손');assert.equal(me.json.account.username,'login_secret_77','the owner still sees their login id');
 app.store.rates.clear();const sent=await api('/chat/send',{token,body:{text:'이름으로 나와요'}});assert.equal(sent.status,200,JSON.stringify(sent.json));assert.equal(sent.json.message.author,'바람의 길손');
 const other=await register('another_login_88','친구');assert.equal((await api('/game/new',{token:other,body:{name:'별빛 여행자',route:'ROUTE_ISEKAI'}})).status,200);
 const recent=await api('/chat/recent',{token:other});assert.equal(recent.status,200);assert(!recent.text.includes('login_secret_77'),'chat never carries the login id');
 const pid=sent.json.message.pid,profile=await api('/profile?pid='+pid,{token:other});assert.equal(profile.status,200);assert.equal(profile.json.name,'바람의 길손');assert(!profile.text.includes('login_secret_77'));
 const found=await api('/mail/find?q='+encodeURIComponent('바람'),{token:other});assert.equal(found.status,200);assert(found.json.players.some(p=>p.name==='바람의 길손'&&p.pid===pid),'letters find the journey name');assert(!found.text.includes('login_secret_77'));
 assert.equal((await api('/mail/find?q=login_secret',{token:other})).json.players.length,0,'the login id is not searchable');
 const online=await api('/online',{token:other});assert(!online.text.includes('login_secret_77'));
});

await check('rows written with the login id before 0.15.3 are rewritten once with the journey name; other rows stay',async()=>{
 const db=app.store.db,row=db.prepare('SELECT id FROM accounts WHERE username=?').get('login_secret_77');
 db.prepare('UPDATE accounts SET display_name=? WHERE id=?').run('login_secret_77',row.id);
 db.prepare('UPDATE chat SET author=? WHERE account_id=?').run('login_secret_77',row.id);
 db.prepare('INSERT INTO raid_hits VALUES(?,?,?,?,?,?)').run('old-battle','old-event',row.id,'login_secret_77',3,Date.now());
 migrateHeroNames(db);
 assert.equal(db.prepare('SELECT display_name FROM accounts WHERE id=?').get(row.id).display_name,'바람의 길손');
 assert(db.prepare('SELECT author FROM chat WHERE account_id=?').all(row.id).every(x=>x.author==='바람의 길손'));
 assert.equal(db.prepare('SELECT name FROM raid_hits WHERE battle_id=?').get('old-battle').name,'바람의 길손');
 const before=db.prepare('SELECT COUNT(*) AS n FROM chat').get().n;migrateHeroNames(db);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat').get().n,before,'running again changes nothing');
});

await check('a new journey on the server starts with the starter kit in the bag',async()=>{
 const token=await register('kit_check_99');const made=await api('/game/new',{token,body:{name:'첫걸음',route:'ROUTE_ISEKAI'}});assert.equal(made.status,200);
 const r=app.store.runtimeOf(app.store.account('kit_check_99').id);
 assert.deepEqual(r.s.inventory.filter(i=>i.equip).map(i=>i.equip).sort(),['EQ_ARMOR_TRAVEL_COAT','EQ_SWORD_TRAVELER']);
 assert.equal(r.itemCount('FOOD_SWEET_MADAME'),2);assert.equal(r.itemCount('FOOD_HASH_BROWN'),2);assert.equal(r.s.starterKit.player,true);
});
console.log(JSON.stringify({ok:true,checks}));
}finally{await app.close?.();}
