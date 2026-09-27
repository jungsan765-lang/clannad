/* Display-only language. Never rewrite IDs, rules, stored names or save data. */
(function(root){
'use strict';
const words={DEX:'민첩',STR:'힘',INT:'지능',WIS:'지혜',CON:'체력',CHA:'매력',LUK:'행운',ATK:'공격력',DEF:'방어력',SPD:'속도',CRIT:'치명타 확률',CRIT_DMG:'치명타 피해',HIT:'명중',EVA:'회피',MAX_HP:'최대 체력',HP:'체력',XP:'경험치',EM:'원소 숙련',ER:'원소 충전',STATUS_RESIST:'상태 저항',PLAYER_CUSTOM:'모험가',CHAR_ID:'캐릭터',NONE:'없음',TRUE:'가능',FALSE:'불가'};
const ids={STATUS_RECENTLY_BANDAGED:'붕대 사용 대기',STATUS_COMBAT_POTION_LOCK:'물약 사용 대기',PHLOGISTON_FIELD_ACTIVE:'열소를 사용할 수 있는 지역'};
function named(text,name){
 if(!name)return String(text??'').replace(/주인공/g,'모험가');
 const last=Array.from(name).pop()||'',code=last.charCodeAt(0),tail=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:null,consonant=tail!==null?tail!==0:/[013678lmn]$/i.test(last),rieul=tail===8||/[178l]$/i.test(last);
 const pairs={'은':['은','는'],'는':['은','는'],'이':['이','가'],'가':['이','가'],'을':['을','를'],'를':['을','를'],'과':['과','와'],'와':['과','와'],'이야':['이야','야'],'야':['이야','야'],'이나':['이나','나'],'나':['이나','나'],'이라는':['이라는','라는'],'라는':['이라는','라는'],'으로':['으로','로'],'로':['으로','로']};
 return String(text??'').replace(/(?:주인공|\{PLAYER_NAME\})(이라는|라는|으로|이야|이나|나|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>name+pairs[p][p==='으로'||p==='로'?(!consonant||rieul?1:0):consonant?0:1]).replace(/주인공|\{PLAYER_NAME\}/g,()=>name);
}
function readable(value,{name='',resolve}={}){
 if(value===undefined||value===null)return '';
 // Protect a player's literal nickname (even "DEX" or "주인공") from translation.
 let text=String(value),marker='\uE001';if(name)text=text.split(name).join(marker);
 text=named(text,name?marker:'');
 // Apply the nickname's own final consonant, rather than the temporary marker's.
 if(name)text=text.replace(/\uE001(이라는|라는|으로|이야|이나|나|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>named('{PLAYER_NAME}'+p,name).replace(name,marker));
 text=text.replace(/ROUND\(MAX_HP[×*]([\d.]+)\)/g,(_,n)=>'최대 체력의 '+Math.round(Number(n)*100)+'%');
 text=text.replace(/\{[^{}]*\}/g,raw=>{try{const obj=JSON.parse(raw);if(!obj||Array.isArray(obj))return raw;return Object.entries(obj).map(([k,v])=>(words[k.toUpperCase()]||resolve?.(k)||'추가 효과')+' '+(typeof v==='number'&&v>0?'+':'')+String(v)).join(' · ');}catch{return raw;}});
 text=text.replace(/\b(?:STATUS_[A-Z0-9_]+|PHLOGISTON_FIELD_ACTIVE)\b/g,id=>ids[id]||resolve?.(id)||'상태 효과');
 text=text.replace(/\b(?:CRIT_DMG|STATUS_RESIST|MAX_HP|PLAYER_CUSTOM|CHAR_ID|DEX|STR|INT|WIS|CON|CHA|LUK|ATK|DEF|SPD|CRIT|HIT|EVA|HP|XP|EM|ER|NONE|TRUE|FALSE)\b/gi,id=>words[id.toUpperCase()]||id);
 text=text.replace(/\b(\d+)R\b/g,'$1라운드').replace(/%p\b/g,'%포인트').replace(/치확/g,'치명타 확률').replace(/치피/g,'치명타 피해').replace(/쿨다운/g,'재사용 대기시간');
 return name?text.split(marker).join(name):text;
}
root.CRPGText={readable,named};
if(typeof module!=='undefined'&&module.exports)module.exports=root.CRPGText;
})(globalThis);
