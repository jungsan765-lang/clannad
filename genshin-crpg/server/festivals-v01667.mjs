// 0.16.67 정기 축제 (user, 2026-10-18: 「정기 이벤트 만드는것도 나쁘지 않긴 하겠네. 크리스마스라던가 추석 설날 이럴때」, 열리는 날은
// 「날짜에 저절로」). Three festivals open by themselves on the Korean calendar (KST midnights):
//  - 눈꽃 축제 (XMAS): 12월 18일 ~ 1월 1일.
//  - 설날 (SEOLLAL) and 추석 (CHUSEOK): seven days before the day to seven days after.
// The lunar days are written out (checked against the published Korean calendar, 2026-10-18); a year not written opens nothing until the
// operator sets its days. The operator can move a year's days, switch a year off, or open one now for a test (with every day open at once,
// so the seven days can be tried in one sitting). The open festival goes to the engine with each action and to players from /events, in
// the same list as the operator's events ({kind:'SEASON'}), with the 축제 교환 that runs alongside it ({kind:'FESTIVAL'}). A festival
// stays in the list seven days after it ends, so the 4★ pick at the end of its points can still be taken (runtime_reading.js 0.16.67).
const DAY=86400000,KST=9*3600000,CLAIM_DAYS=7;
const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const K=()=>globalThis.CRPGRuntime?.festivalV01667;
// the day itself of 설날 and 추석 (음력 1월 1일, 8월 15일)
export const LUNAR_DAYS={
 SEOLLAL:{2026:'02-17',2027:'02-07',2028:'01-27',2029:'02-13',2030:'02-03'},
 CHUSEOK:{2026:'09-25',2027:'09-15',2028:'10-03',2029:'09-22',2030:'09-12'}
};
export const FESTIVAL_KEYS=['XMAS','SEOLLAL','CHUSEOK'];
const NAMES={XMAS:'눈꽃 축제',SEOLLAL:'설날',CHUSEOK:'추석'};
const midnight=(y,m,d)=>Date.UTC(y,m-1,d)-KST;
const ymd=t=>{const d=new Date(t+KST);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');};
const parseDay=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));if(!m)return null;const t=midnight(+m[1],+m[2],+m[3]);return ymd(t)===s?t:null;};
// a year's own days (end = the midnight after the last day)
export function defaultWindow(key,year){
 if(key==='XMAS')return {startsAt:midnight(year,12,18),endsAt:midnight(year+1,1,2)};
 const day=LUNAR_DAYS[key]?.[year];if(!day)return null;const [m,d]=day.split('-').map(Number),base=midnight(year,m,d);
 return {startsAt:base-7*DAY,endsAt:base+8*DAY};
}
export function installFestivalSchema(db){
 db.exec('CREATE TABLE IF NOT EXISTS festival_years(festival TEXT NOT NULL,year INTEGER NOT NULL,starts_at INTEGER,ends_at INTEGER,off INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT \'\',updated_at INTEGER NOT NULL,PRIMARY KEY(festival,year)) STRICT;'
  +'CREATE TABLE IF NOT EXISTS festival_tests(id INTEGER PRIMARY KEY AUTOINCREMENT,festival TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,all_days INTEGER NOT NULL DEFAULT 1,opened_by TEXT NOT NULL DEFAULT \'\',closed_at INTEGER) STRICT;');
}
const yearsAround=t=>{const y=new Date(t+KST).getUTCFullYear();return [y-1,y,y+1];};
export const festivalMethods={
 // a year's days as they stand: the operator's change, else the calendar's
 // the operator's rows, read once and again after each change (an action reads the festivals every time)
 festivalRows(){
  if(!this._festivalRows){const years=new Map();for(const r of this.db.prepare('SELECT * FROM festival_years').all())years.set(r.festival+':'+r.year,r);
   this._festivalRows={years,tests:this.db.prepare('SELECT * FROM festival_tests WHERE closed_at IS NULL ORDER BY id DESC').all()};}
  return this._festivalRows;
 },
 festivalWindow(key,year){
  const row=this.festivalRows().years.get(key+':'+year),base=defaultWindow(key,year);
  const startsAt=row?.starts_at??base?.startsAt??null,endsAt=row?.ends_at??base?.endsAt??null;
  return {key,year,name:NAMES[key],startsAt,endsAt,off:!!row?.off,moved:row?.starts_at!=null,calendar:base};
 },
 // the festivals in the list right now (open, or ended at most seven days ago); tests first
 festivalEvents(t=now()){
  if(!K())return [];const out=[];
  for(const row of this.festivalRows().tests)
   if(row.starts_at<=t&&t<row.ends_at+CLAIM_DAYS*DAY&&FESTIVAL_KEYS.includes(row.festival))out.push({id:'FES_'+row.festival+'_T'+row.id,kind:'SEASON',festival:row.festival,name:NAMES[row.festival],startsAt:row.starts_at,endsAt:row.ends_at,test:true,allDays:!!row.all_days});
  for(const key of FESTIVAL_KEYS)for(const year of yearsAround(t)){
   const w=this.festivalWindow(key,year);if(w.off||w.startsAt===null||w.endsAt===null)continue;
   if(w.startsAt<=t&&t<w.endsAt+CLAIM_DAYS*DAY)out.push({id:'FES_'+key+'_'+year,kind:'SEASON',festival:key,name:w.name,startsAt:w.startsAt,endsAt:w.endsAt});
  }
  // 축제 교환 runs with an open festival (the first one)
  const open=out.find(e=>e.startsAt<=t&&t<e.endsAt);
  if(open){const k=globalThis.CRPGRuntime?.opEventsV01666?.kinds?.FESTIVAL;if(k)out.push({id:'EVT_'+open.id,kind:'FESTIVAL',name:k.name,text:k.text,daily:0,startsAt:open.startsAt,endsAt:open.endsAt,festival:open.id});}
  return out;
 },
 // the next festival to open (within two days), so open screens can look again at that moment
 festivalNextAt(t=now()){
  let next=null;for(const key of FESTIVAL_KEYS)for(const year of yearsAround(t)){const w=this.festivalWindow(key,year);if(!w.off&&w.startsAt!==null&&w.startsAt>t&&w.startsAt-t<=2*DAY&&(next===null||w.startsAt<next))next=w.startsAt;}
  return next;
 },
 // the operator's list: this and next year's days of each, and the tests
 festivalAdminList(){
  if(!K())throw err(404,'지원하지 않는 요청입니다.');const t=now(),y=new Date(t+KST).getUTCFullYear();
  const state=w=>w.off?'OFF':w.startsAt===null?'UNSET':t<w.startsAt?'SCHEDULED':t<w.endsAt?'OPEN':'ENDED';
  const festivals=FESTIVAL_KEYS.map(key=>({key,name:NAMES[key],years:[y,y+1].map(year=>{const w=this.festivalWindow(key,year);return {...w,state:state(w),first:w.startsAt===null?null:ymd(w.startsAt),last:w.endsAt===null?null:ymd(w.endsAt-DAY)};})}));
  const tests=this.db.prepare('SELECT * FROM festival_tests ORDER BY id DESC LIMIT 10').all().map(r=>({num:r.id,id:'FES_'+r.festival+'_T'+r.id,festival:r.festival,name:NAMES[r.festival],startsAt:r.starts_at,endsAt:r.ends_at,allDays:!!r.all_days,openedBy:r.opened_by,state:r.closed_at!==null?'CLOSED':t<r.ends_at?'OPEN':'ENDED'}));
  return {now:t,festivals,tests,active:this.festivalEvents(t).filter(e=>e.kind==='SEASON')};
 },
 festivalAdmin(b,actor){
  if(!K())throw err(404,'지원하지 않는 요청입니다.');const op=String(b?.op||''),key=String(b?.festival||'');
  const changed=out=>{this._festivalRows=null;this.invalidateAll?.();this.broadcast?.({type:'op-event',festival:true},()=>true);return out;};
  if(op==='test-close'){const n=Number(b?.num),row=Number.isSafeInteger(n)?this.db.prepare('SELECT * FROM festival_tests WHERE id=?').get(n):null;if(!row)throw err(404,'닫을 시험 축제를 찾을 수 없습니다.');if(row.closed_at!==null)throw err(409,'이미 닫힌 시험 축제입니다.');
   this.db.prepare('UPDATE festival_tests SET closed_at=? WHERE id=?').run(now(),n);this._festivalRows=null;return changed({closed:n});}
  if(!FESTIVAL_KEYS.includes(key))throw err(400,'축제를 골라 주세요.');
  if(op==='test'){const days=Number(b?.days);if(!Number.isInteger(days)||days<1||days>30)throw err(400,'기간은 1~30일로 정해 주세요.');
   if(this.db.prepare('SELECT 1 FROM festival_tests WHERE closed_at IS NULL AND ends_at>?').get(now()))throw err(409,'열려 있는 시험 축제를 먼저 닫아 주세요.');
   const t=now(),id=Number(this.db.prepare('INSERT INTO festival_tests(festival,starts_at,ends_at,all_days,opened_by) VALUES(?,?,?,?,?)').run(key,t,t+days*DAY,b?.allDays===false?0:1,String(actor||'')).lastInsertRowid);this._festivalRows=null;
   return changed({test:{num:id,id:'FES_'+key+'_T'+id,festival:key,startsAt:t,endsAt:t+days*DAY}});}
  const year=Number(b?.year);if(!Number.isInteger(year)||year<2026||year>2100)throw err(400,'해를 확인해 주세요.');
  const row=this.db.prepare('SELECT * FROM festival_years WHERE festival=? AND year=?').get(key,year),t=now();
  const put=(starts,ends,off)=>{this._festivalRows=null;return this.db.prepare('INSERT INTO festival_years(festival,year,starts_at,ends_at,off,updated_by,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(festival,year) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at,off=excluded.off,updated_by=excluded.updated_by,updated_at=excluded.updated_at').run(key,year,starts,ends,off?1:0,String(actor||''),t);};
  if(op==='off'){put(row?.starts_at??null,row?.ends_at??null,b?.off!==false);return changed({window:this.festivalWindow(key,year)});}
  if(op==='reset'){this.db.prepare('DELETE FROM festival_years WHERE festival=? AND year=?').run(key,year);this._festivalRows=null;return changed({window:this.festivalWindow(key,year)});}
  if(op==='set'){const s=parseDay(b?.first),e=parseDay(b?.last);if(s===null||e===null)throw err(400,'날짜는 2027-02-01처럼 적어 주세요.');const end=e+DAY;
   if(end<=s)throw err(400,'끝나는 날이 시작하는 날보다 앞입니다.');if(end-s>30*DAY)throw err(400,'축제는 30일까지 열 수 있습니다.');
   put(s,end,!!row?.off);return changed({window:this.festivalWindow(key,year)});}
  throw err(400,'축제 작업을 골라 주세요.');
 }
};
