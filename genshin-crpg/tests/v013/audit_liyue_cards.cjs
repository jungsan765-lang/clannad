const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=process.env.CRPG_PROJECT_ROOT||require('node:path').resolve(__dirname,'../..'),ctx=vm.createContext({console,Date,Math,JSON,structuredClone,setTimeout,clearTimeout,URL});
const loaded=[];for(const m of fs.readFileSync(root+'/source/index.html','utf8').matchAll(/<script src="([^"]+)"/g)){const n=m[1];if(n==='world_content.js'||n==='liyue_card_content.js'||n.startsWith('runtime')){vm.runInContext(fs.readFileSync(root+'/source/'+n,'utf8'),ctx,{filename:n});loaded.push(n);}}
const db=JSON.parse(fs.readFileSync(root+'/content/db.json'));
let baseline;
function fresh(owner='LIYUE_BAIZHU',num=4){
 if(!baseline){baseline=new ctx.CRPGRuntime.Runtime(db);baseline.newGame({name:'읽기전용 감사',route:'ROUTE_ISEKAI',seed:123456,saveId:'READONLY'});}
 const r=Object.assign(Object.create(Object.getPrototypeOf(baseline)),baseline);r.s=JSON.parse(JSON.stringify(baseline.s));
 const a=r.character(owner);Object.assign(a,{id:owner,source:owner,side:'ALLY',control:'AI',hp:800,maxHp:1000,atk:100,def:100,crit:0,critDmg:50,hit:100,eva:0,level:20,spd:60,range:r.row('07_CHAR_DB',owner)[21],statuses:[],shields:[],cooldowns:{},turns:1,position:{x:1,y:1},slot:2});
 const allies=[a];for(let i=1;i<3;i++)allies.push({...a,id:'ALLY_'+i,source:'MOND_AMBER',name:'ALLY_'+i,hp:400+i*100,range:i===1?'근접':'원거리',statuses:[],shields:[],cooldowns:{},position:{x:1,y:i}});
 const foes=Array.from({length:num},(_,i)=>({...a,id:'E'+i,source:'MON_TREASURE_PUGILIST',name:'적'+i,side:'ENEMY',control:'AI',hp:10000,maxHp:10000,atk:100,def:0,range:'근접',grade:'일반',tags:['[인간형]'],statuses:[],shields:[],cooldowns:{},auras:[],aura:null,position:{x:3,y:i%4}}));
 r.s.runtime={id:'AUDIT',actors:[...allies,...foes],fields:[],log:[],round:1,actionSequence:1,phase:'WAIT_PLAYER',order:[],turnIndex:0,cursor:0,combatVersion:1,origin:'READONLY_AUDIT',terrain:null,toolCharges:{},storyConfig:null};r.s.global.SCREEN_MODE='COMBAT';r.s.global.CURRENT_MAP_ID='MAP_LIYUE_PLAINS';
 r.random=()=>.5;r.die=()=>50;
 return{r,a,allies,foes,b:r.s.runtime};
}
function card(r,id){return r.cardDefinition(r.row('08_SKILL_CARD_DB',id));}
const tests=[];function test(name,fn){try{const details=fn();tests.push({name,ok:true,details});}catch(e){tests.push({name,ok:false,error:e.stack});}}
function cast(f,id,target){return f.r.executeCard(f.a,card(f.r,id),target||f.foes[0]?.id,'PURSUIT');}
if(require.main===module){
 const rows=db['08_SKILL_CARD_DB'].filter(r=>r?.[2]?.startsWith('LIYUE_'));
 for(const row of rows.filter(r=>r[4]!=='패시브'))test('execute '+row[0],()=>{const f=fresh(row[2]);if(row[0]==='LIYUE_ZIBAI_E_CHARGE')f.r.addCombatStatus(f.a,'AGE_GAP',3,{light:100,uses:0,justCastRound:1});const c=card(f.r,row[0]),reason=f.r.cardReason(f.a,c);cast(f,row[0],c.target==='SELF'?f.a.id:undefined);f.r.tickFields('START');f.r.tickFields('END');f.r.basicHit(f.a,f.foes[0]);f.r.applyDamage(f.foes[0],f.a,100,{element:'물리'});const invalid=f.b.actors.filter(a=>!Number.isFinite(a.hp)||!Number.isFinite(a.maxHp));if(invalid.length)throw Error('Nonfinite actors '+invalid.map(a=>a.id));return{reason,logPackets:f.b.log.length,fields:f.b.fields.map(f=>f.kind),statuses:f.a.statuses.map(s=>s.id),enemyHp:f.foes.map(e=>e.hp)};});
 const result={sourceHash:crypto.createHash('sha256').update(fs.readFileSync(root+'/source/runtime_liyue_cards.js')).digest('hex'),loaded,counts:{cards:rows.length,active:rows.filter(r=>r[4]!=='패시브').length,supported:rows.filter(row=>!fresh(row[2]).r.cardSupport(card(fresh(row[2]).r,row[0]))).length},tests};fs.writeFileSync('/tmp/audit_liyue_cards_results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({counts:result.counts,passed:tests.filter(t=>t.ok).length,failed:tests.filter(t=>!t.ok)},null,2));
}
module.exports={fresh,card,cast,test,tests,ctx,root,db};

if(tests.some(t=>!t.ok))process.exitCode=1;
