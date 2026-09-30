// Cross-platform Python 3 launcher. Arguments are passed directly, never through a shell.
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),candidates=process.platform==='win32'?[['py','-3'],['python'],['python3']]:[['python3'],['python']];
let selected;
for(const [command,...prefix] of candidates){const r=spawnSync(command,[...prefix,'-c','import sys; assert sys.version_info >= (3, 10)'],{stdio:'ignore'});if(!r.error&&r.status===0){selected=[command,...prefix];break;}}
if(!selected){console.error('Python 3.10 이상을 설치한 후 다시 실행해 주세요.');process.exit(1);}
const [command,...prefix]=selected,result=spawnSync(command,[...prefix,...args],{stdio:'inherit',env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}});
if(result.error)console.error(result.error.message);process.exit(result.status??1);
