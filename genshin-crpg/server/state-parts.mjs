// Lossless structural shards. Arrays and second-level values remain atomic.
// Keys use JSON paths; no untrusted object key is assigned through a prototype setter.
const own=(o,k,v)=>Object.defineProperty(o,k,{value:v,writable:true,configurable:true,enumerable:true});
export function splitState(state){
 const parts=new Map();
 for(const [key,value] of Object.entries(state)){
  if(value===undefined)continue;
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
   parts.set(JSON.stringify([key]),'{}');
   for(const [child,v] of Object.entries(value))if(v!==undefined)parts.set(JSON.stringify([key,child]),JSON.stringify(v));
  }else parts.set(JSON.stringify([key]),JSON.stringify(value));
 }
 return parts;
}
export function joinState(parts){
 const state={};
 for(const [path,value] of parts){const keys=JSON.parse(path);if(keys.length===1)own(state,keys[0],JSON.parse(value));}
 for(const [path,value] of parts){const keys=JSON.parse(path);if(keys.length===2)own(state[keys[0]],keys[1],JSON.parse(value));}
 return state;
}
export function diffParts(before,after){
 const set=[],remove=[],undoSet=[],undoRemove=[];let bytes=0;
 for(const [path,value] of after)if(before.get(path)!==value){set.push([path,value]);bytes+=new TextEncoder().encode(value).length;if(before.has(path))undoSet.push([path,before.get(path)]);else undoRemove.push(path);}
 for(const [path,value] of before)if(!after.has(path)){remove.push(path);undoSet.push([path,value]);}
 return {set,remove,undo:{set:undoSet,remove:undoRemove},bytes};
}
export function applyParts(parts,patch){const next=new Map(parts);for(const path of patch.remove)next.delete(path);for(const [path,value] of patch.set)next.set(path,value);for(const op of patch.splices||[]){const value=JSON.parse(next.get(op.path));next.set(op.path,JSON.stringify(value.slice(0,op.index).concat(op.items,value.slice(op.index+op.deleteCount))));}return next;}
export function publicParts(parts){const result=new Map(parts);result.set('["global","PRNG_STATE"]','1');for(const path of result.keys())if(JSON.parse(path)[0]==='processed')result.delete(path);result.set('["processed"]','{}');return result;}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export function intent(b){return canonical({type:b.type,params:b.params??{},revision:b.revision,uiScreen:b.uiScreen??'',uiActions:b.uiActions??[],reading:b.reading??[]});}
export async function compress(value){return new Uint8Array(await new Response(new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());}
export async function decompress(bytes){return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}

// Append-only combat history must not resend its entire growing array on every hit.
export function wirePatch(before,after){
 const d=diffParts(before,after),set=[],splices=[];
 for(const [path,value] of d.set){
  const old=before.get(path);if(old?.startsWith('[')&&value.startsWith('[')){
   const a=JSON.parse(old),b=JSON.parse(value),as=a.map(x=>JSON.stringify(x)),bs=b.map(x=>JSON.stringify(x));let prefix=0,suffix=0;
   while(prefix<Math.min(a.length,b.length)&&as[prefix]===bs[prefix])prefix++;
   while(suffix<Math.min(a.length,b.length)-prefix&&as[a.length-1-suffix]===bs[b.length-1-suffix])suffix++;
   const op={path,index:prefix,deleteCount:a.length-prefix-suffix,items:b.slice(prefix,b.length-suffix)};
   if(JSON.stringify(op).length<value.length){splices.push(op);continue;}
  }
  set.push([path,value]);
 }
 return {set,remove:d.remove,splices};
}
