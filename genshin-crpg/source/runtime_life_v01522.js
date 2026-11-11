/* 0.15.22's three short inputs, kept only so a job saved with its `minigame` (started before 0.16.2) still finishes by
 * those rules, replayed identically by the client and the authoritative runtime. New jobs are resource scenes
 * (runtime_life_v0162.js). */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,oldValidate=P.validateSave;
const fail=m=>{throw new api.RuleError('LIFE_INPUT',m);};
function target(seed,round){let n=(seed^Math.imul(round+1,2654435761))>>>0;n^=n>>>16;return (n>>>0)%4;}
function simulate(job,inputs,elapsed){
 if(!Array.isArray(inputs)||inputs.length>3||!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>job.duration)fail('생활 작업 입력을 확인해 주세요.');
 let prev=-1,hits=0;const seen=new Set();
 for(const c of inputs){if(!c||!Number.isInteger(c.round)||c.round<0||c.round>2||seen.has(c.round)||!Number.isInteger(c.at)||c.at<prev||c.at>elapsed||!Number.isInteger(c.choice)||c.choice<0||c.choice>3)fail('생활 작업 입력 순서가 올바르지 않습니다.');
  const t=c.at-(500+3000*c.round);if(t<0||t>=2800)fail('해당 차례의 입력 시간이 아닙니다.');
  seen.add(c.round);prev=c.at;if(job.kind==='GATHER'?c.choice===target(job.minigame.seed,c.round):t>=800&&t<=2000)hits++;
 }
 return {hits,caught:hits>=2};
}
P.validateSave=function(s){oldValidate.call(this,s);const m=s.lifeJob?.minigame;if(m&&(m.version!==1||!Number.isInteger(m.seed)||m.seed<0||m.seed>0xffffffff||!['GATHER','MINE','HUNT'].includes(s.lifeJob.kind)))fail('생활 작업 저장값을 확인해 주세요.');return s;};
api.lifeMinigame={target,simulate};
})(globalThis);
