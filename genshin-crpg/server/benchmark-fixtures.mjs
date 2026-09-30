// Synthetic saves made with the actual rules. Never load a production account for benchmarks.
import {R,DB} from './generated/engine.mjs';
const encoder=new TextEncoder(),cache=new Map();
export function fixture(kind='move',large=true){
 const key=kind+':'+large;if(cache.has(key))return structuredClone(cache.get(key));
 const r=new R(DB);r.newGame({name:'성능시험용',seed:7317,saveId:'SYNTHETIC-PERFORMANCE-'+key});r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_CITY'});
 if(large){while(encoder.encode(JSON.stringify(r.s)).length<378000)r.giveEquipment('EQ_SWORD_HARBINGER');}
 let action={type:'MOVE',params:{edge:'EDGE_MOND_CITY_TO_PLAINS'}};
 if(kind.startsWith('combat')){r.startBattle('EG_MOND_HILI_PATROL','RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});action={type:'COMBAT',params:{card:'PLAYER_BASIC_GUARD'}};}
 if(kind==='combat-log'){while(encoder.encode(JSON.stringify(r.s)).length<378000)r.s.runtime.log.push({benchmarkHistory:true,text:'synthetic previous combat history '.repeat(20)});}
 const result={state:r.s,action};cache.set(key,result);return structuredClone(result);
}
