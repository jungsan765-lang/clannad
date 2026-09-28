/* Display-only language. Never rewrite IDs, rules, stored names or save data. */
(function(root){
'use strict';
const words={DEX:'민첩',STR:'힘',INT:'지능',WIS:'지혜',CON:'체력',CHA:'매력',LUK:'행운',ATK:'공격력',DEF:'방어력',SPD:'속도',CRIT:'치명타 확률',CRIT_DMG:'치명타 피해',HIT:'명중',EVA:'회피',MAX_HP:'최대 체력',HP:'체력',XP:'경험치',EM:'원소 마스터리',ER:'원소 충전 효율',STATUS_RESIST:'상태 저항',PLAYER_CUSTOM:'모험가',CHAR_ID:'캐릭터',NONE:'없음',TRUE:'가능',FALSE:'불가',
 ACTION_SCORE:'행동 속도',ACTION_ORDER:'행동 순서',BASIC_ATTACK:'일반 공격',REACTION_BASE:'반응 기본 피해',PRE_REACTION_DAMAGE:'반응 전 피해',ATK_CURRENT:'현재 공격력',DEF_CURRENT:'현재 방어력',HP_CURRENT:'현재 체력',BASE_HP:'기본 체력',
 LIFE_GATHER:'채집',LIFE_FORAGE:'채집',LIFE_FISHING:'낚시',LIFE_ALCHEMY:'연금',LIFE_SCOUT:'정찰',LIFE_HUNT:'사냥',LIFE_MINING:'채광',THUNDERCLOUD:'뇌운',MIRROR_MARK:'거울 표식'};
const ids={STATUS_RECENTLY_BANDAGED:'붕대 사용 대기',STATUS_COMBAT_POTION_LOCK:'물약 사용 대기',PHLOGISTON_FIELD_ACTIVE:'열소를 사용할 수 있는 지역'};
const TOKENS=Object.keys(words).sort((a,b)=>b.length-a.length).join('|');
const PARTICLE='(이라는|라는|으로|이야|이나|은|는|이|가|을|를|과|와|야|나|로)';
const JOSA={'은':['은','는'],'는':['은','는'],'이':['이','가'],'가':['이','가'],'을':['을','를'],'를':['을','를'],'과':['과','와'],'와':['과','와'],'이야':['이야','야'],'야':['이야','야'],'이나':['이나','나'],'나':['이나','나'],'이라는':['이라는','라는'],'라는':['이라는','라는'],'으로':['으로','로'],'로':['으로','로']};
// Final sound of the word a particle attaches to: Hangul batchim, a digit read in Korean, or a Latin letter.
function finalOf(word){
 const last=Array.from(String(word??'').replace(/[)\]」』"'”’]+$/,'')).pop()||'',code=last.charCodeAt(0);
 if(code>=0xac00&&code<=0xd7a3){const t=(code-0xac00)%28;return {consonant:t!==0,rieul:t===8};}
 if(/[0-9]/.test(last))return {consonant:/[013678]/.test(last),rieul:/[178]/.test(last)};
 if(/[a-z]/i.test(last))return {consonant:/[lmnrbkpt]/i.test(last),rieul:/[lr]/i.test(last)};
 return null;
}
function josa(word,p){
 const pair=JOSA[p],f=finalOf(word);if(!pair||!f)return p;
 if(p==='으로'||p==='로')return !f.consonant||f.rieul?'로':'으로';
 return pair[f.consonant?0:1];
}
function named(text,name){
 if(!name)return String(text??'').replace(/주인공/g,'모험가');
 const last=Array.from(name).pop()||'',code=last.charCodeAt(0),tail=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:null,consonant=tail!==null?tail!==0:/[013678lmn]$/i.test(last),rieul=tail===8||/[178l]$/i.test(last);
 const pairs={'은':['은','는'],'는':['은','는'],'이':['이','가'],'가':['이','가'],'을':['을','를'],'를':['을','를'],'과':['과','와'],'와':['과','와'],'이야':['이야','야'],'야':['이야','야'],'이나':['이나','나'],'나':['이나','나'],'이라는':['이라는','라는'],'라는':['이라는','라는'],'으로':['으로','로'],'로':['으로','로']};
 return String(text??'').replace(/(?:주인공|\{PLAYER_NAME\})(이라는|라는|으로|이야|이나|나|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>name+pairs[p][p==='으로'||p==='로'?(!consonant||rieul?1:0):consonant?0:1]).replace(/주인공|\{PLAYER_NAME\}/g,()=>name);
}
// "보스이(가)", "HP(으)로" style placeholders written by the engine: pick the particle that fits the word before it.
function fixParticles(text){
 const base={'이(가)':'이','가(이)':'이','을(를)':'을','를(을)':'을','은(는)':'은','는(은)':'은','과(와)':'과','와(과)':'과','(으)로':'으로','(이)라는':'이라는','(이)나':'이나'};
 return text.replace(/([^\s(]+?)(이\(가\)|가\(이\)|을\(를\)|를\(을\)|은\(는\)|는\(은\)|과\(와\)|와\(과\)|\(으\)로|\(이\)라는|\(이\)나)/g,(m,w,p)=>w+josa(w,base[p]));
}
function readable(value,{name='',resolve}={}){
 if(value===undefined||value===null)return '';
 // Protect a player's literal nickname (even "DEX" or "주인공") from translation.
 let text=String(value),marker='';if(name)text=text.split(name).join(marker);
 text=named(text,name?marker:'');
 // Apply the nickname's own final consonant, rather than the temporary marker's.
 if(name)text=text.replace(/(이라는|라는|으로|이야|이나|나|은|는|이|가|을|를|과|와|야|로)(?=$|[\s,.!?…'"”’」]|[가-힣])/g,(_,p)=>named('{PLAYER_NAME}'+p,name).replace(name,marker));
 text=text.replace(/ROUND\(MAX_HP[×*]([\d.]+)\)/g,(_,n)=>'최대 체력의 '+Math.round(Number(n)*100)+'%');
 text=text.replace(/\{[^{}]*\}/g,raw=>{try{const obj=JSON.parse(raw);if(!obj||Array.isArray(obj))return raw;return Object.entries(obj).map(([k,v])=>(words[k.toUpperCase()]||resolve?.(k)||'추가 효과')+' '+(typeof v==='number'&&v>0?'+':'')+String(v)).join(' · ');}catch{return raw;}});
 // Designer bookkeeping that should never reach a player.
 text=text.replace(/\s*\(TRPG 환산\)/g,'').replace(/\s*모든 수치는 TRPG 환산\.?/g,'').replace(/\s*\(시스템\)/g,'').replace(/\b0?\d_[A-Z]+_DB의 /g,'');
 const translated=(id,p)=>{const w=ids[id]||resolve?.(id)||'상태 효과';return p?w+josa(w,p):w;};
 text=text.replace(new RegExp('\\b(STATUS_[A-Z0-9_]+|PHLOGISTON_FIELD_ACTIVE)'+PARTICLE+'(?=$|[^가-힣])','g'),(_,id,p)=>translated(id,p));
 text=text.replace(/\b(?:STATUS_[A-Z0-9_]+|PHLOGISTON_FIELD_ACTIVE)\b/g,id=>translated(id));
 // Character IDs such as LIYUE_ZHONGLI: show the name when the caller can resolve it.
 text=text.replace(/\b(?:MOND|LIYUE|INAZUMA|SUMERU|FONTAINE|NATLAN|SNEZHNAYA|NODKRAI)_[A-Z]+\b/g,id=>resolve?.(id)||id);
 const word=(id,p)=>{const w=words[id.toUpperCase()]||id;return p?w+josa(w,p):w;};
 text=text.replace(new RegExp('\\b('+TOKENS+')'+PARTICLE+'(?=$|[^가-힣])','gi'),(_,id,p)=>word(id,p));
 text=text.replace(new RegExp('\\b(?:'+TOKENS+')\\b','gi'),id=>word(id));
 text=text.replace(/\b(\d+)R\b/g,'$1라운드').replace(/%p\b/g,'%포인트').replace(/치확/g,'치명타 확률').replace(/치피/g,'치명타 피해').replace(/쿨다운/g,'재사용 대기시간');
 text=name?text.split(marker).join(name):text;
 return fixParticles(text);
}
root.CRPGText={readable,named,josa};
if(typeof module!=='undefined'&&module.exports)module.exports=root.CRPGText;
})(globalThis);
