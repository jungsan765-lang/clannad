// This account exhausted its 2026-09-30 DO quota. Do not contact Cloudflare before reset.
export const QUOTA_RESET_AT='2026-10-01T00:00:00.000Z';
export function checkBenchmarkWindow(now=Date.now()){
 if(now<Date.parse(QUOTA_RESET_AT))throw Error('오늘 Cloudflare 쓰기 한도를 이미 사용했습니다. 한국 시간 10월 1일 오전 9시 이후에 실행해 주세요. 지금은 아무 작업도 하지 않았습니다.');
 return new Date(now).toISOString().slice(0,10);
}
