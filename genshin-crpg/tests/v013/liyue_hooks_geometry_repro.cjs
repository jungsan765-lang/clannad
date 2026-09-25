const fs=require('fs');const {fresh,card,cast}=require('./audit_liyue_cards.cjs');const results={};
for(const [owner,buff,kind] of [['LIYUE_XIAO','LIYUE_XIAO_Q','xiao'],['LIYUE_TARTAGLIA','LIYUE_TARTAGLIA_E','tartaglia'],['LIYUE_XIANYUN','LIYUE_XIANYUN_E','xianyun']]){
 const f=fresh(owner,2);f.foes[0].position={x:3,y:0};f.foes[1].position={x:5,y:3};cast(f,buff,kind==='xianyun'?f.allies[1].id:undefined);f.b.actionSequence++;f.b.log=[];
 const actor=kind==='xianyun'?f.allies[1]:f.a;f.r.basicHit(actor,f.foes[0]);
 results[kind]={distance:f.r.combatDistance(f.foes[0],f.foes[1]),packets:f.b.log.filter(p=>p.damage),farTargetHit:f.b.log.some(p=>p.target===f.foes[1].name&&p.damage)};
}
{
 const f=fresh('LIYUE_YELAN',4);cast(f,'LIYUE_YELAN_E');f.b.actionSequence++;f.b.log=[];cast(f,'LIYUE_YELAN_E');
 results.yelan_followup_doubles_aoe={packets:f.b.log.filter(p=>p.damage),counts:Object.fromEntries(f.foes.map(t=>[t.id,f.b.log.filter(p=>p.damage&&p.target===t.name).length]))};
}
fs.writeFileSync('/tmp/liyue_hooks_geometry_results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
