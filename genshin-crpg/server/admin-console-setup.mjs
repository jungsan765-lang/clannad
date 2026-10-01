// 0.14.12 운영자 도구 setup. Run it on the server as root, never put the result in the repository (it is public):
//   node /opt/genshin-crpg-test-server/current/server/admin-console-setup.mjs /etc/genshin-crpg-live-staging.env
// It asks for the console ID and password and writes ADMIN_CONSOLE_ID and ADMIN_CONSOLE_HASH into the service's
// environment file. The hash is salted PBKDF2 mixed with that server's PASSWORD_PEPPER; the password itself is stored
// nowhere. Running it again replaces the old login. It loads no game engine, so it is light on the 1 GB server.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const enc=new TextEncoder(),hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join(''),bytes=x=>Uint8Array.from(x.match(/.{2}/g)||[],h=>parseInt(h,16));
const SERVICES={'/etc/genshin-crpg-live-staging.env':'genshin-crpg-fixed-region-live.service','/etc/genshin-crpg-production.env':'genshin-crpg-production.service'};
export const CONSOLE_ID=/^[A-Za-z0-9_.-]{3,32}$/;
// The same PBKDF2 settings as passwordHash in server/game-core.mjs (tests/test_admin_v01412.mjs checks that they agree).
export async function consoleHash(password,salt,pepper){const key=await crypto.subtle.importKey('raw',enc.encode(password+'\0'+pepper),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},key,256));}
// "<salt>.<hash>", hex and a dot only, so neither systemd nor a shell that reads the file changes it.
export async function consoleSecret(password,pepper){const salt=hex(crypto.getRandomValues(new Uint8Array(32)));return salt+'.'+await consoleHash(password,salt,pepper);}
export function readEnv(text){const out={};for(const line of String(text).split(/\r?\n/)){const m=/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);if(!m)continue;let v=m[2].trim();if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);out[m[1]]=v;}return out;}
export function writeEnv(text,values){
 const lines=String(text).split(/\r?\n/);if(lines.at(-1)==='')lines.pop();
 for(const [k,v] of Object.entries(values)){const at=lines.findIndex(l=>new RegExp('^\\s*(?:export\\s+)?'+k+'\\s*=').test(l));if(at>=0)lines[at]=k+'='+v;else lines.push(k+'='+v);}
 return lines.join('\n')+'\n';
}

// One line from the terminal; a hidden answer is not echoed at all (like passwd).
function ask(question,hidden=false){
 return new Promise((ok,bad)=>{
  const input=process.stdin,out=process.stdout;out.write(question);
  if(!input.isTTY){bad(new Error('터미널에서 직접 실행해 주세요.'));return;}
  let value='';input.setRawMode(true);input.resume();input.setEncoding('utf8');
  const finish=()=>{input.setRawMode(false);input.pause();input.off('data',onData);out.write('\n');};
  const onData=chunk=>{for(const ch of chunk){
   if(ch==='\r'||ch==='\n'){finish();ok(value);return;}
   if(ch==='\u0003'){finish();bad(new Error('취소했습니다. 아무것도 바뀌지 않았습니다.'));return;}
   if(ch==='\u007f'||ch==='\b'){if(value){value=[...value].slice(0,-1).join('');if(!hidden)out.write('\b \b');}continue;}
   if(ch<' ')continue;value+=ch;if(!hidden)out.write(ch);
  }};
  input.on('data',onData);
 });
}

async function main(){
 const file=process.argv[2];
 if(!file){console.error('사용법: node admin-console-setup.mjs /etc/genshin-crpg-live-staging.env');process.exit(2);}
 if(!existsSync(file)){console.error('환경 파일을 찾을 수 없습니다: '+file);process.exit(2);}
 const text=readFileSync(file,'utf8'),env=readEnv(text);
 if(!env.PASSWORD_PEPPER||env.PASSWORD_PEPPER.length<32){console.error('이 환경 파일에 PASSWORD_PEPPER가 없습니다. 게임 서버의 환경 파일이 맞는지 확인해 주세요.');process.exit(2);}
 console.log('운영자 도구 로그인을 정합니다. ('+file+')');
 const id=(await ask('운영자 아이디 [CLANNAD]: ')).trim()||'CLANNAD';
 if(!CONSOLE_ID.test(id)){console.error('아이디는 영문·숫자·_ . - 3~32자로 정해 주세요.');process.exit(1);}
 const password=await ask('운영자 비밀번호 (입력해도 화면에 보이지 않습니다): ',true);
 if(password.length<6||password.length>128){console.error('비밀번호는 6~128자로 정해 주세요.');process.exit(1);}
 if(await ask('비밀번호 한 번 더: ',true)!==password){console.error('두 번 입력한 비밀번호가 다릅니다. 아무것도 바뀌지 않았습니다.');process.exit(1);}
 if(password.length<10)console.log('알림: 짧은 비밀번호입니다. 여러 번 틀리면 잠기는 장치가 막아 주지만, 더 긴 비밀번호로 바꾸려면 이 명령을 다시 실행하면 됩니다.');
 writeFileSync(file,writeEnv(text,{ADMIN_CONSOLE_ID:id,ADMIN_CONSOLE_HASH:await consoleSecret(password,env.PASSWORD_PEPPER)}));
 console.log('저장했습니다. 비밀번호 자체는 어디에도 저장하지 않고, 확인용 해시만 저장합니다.');
 const service=SERVICES[resolve(file)];
 if(!service){console.log('게임 서버를 다시 시작하면 적용됩니다.');return;}
 const answer=(await ask(service+'를 지금 다시 시작해 적용할까요? [Y/n]: ')).trim().toLowerCase();
 if(answer&&answer!=='y'&&answer!=='yes'){console.log('적용하려면 나중에 실행하세요: systemctl restart '+service);return;}
 execFileSync('systemctl',['restart',service],{stdio:'inherit'});
 console.log('다시 시작했습니다. 이제 운영자 페이지(게임 주소 뒤에 admin.html)에서 로그인할 수 있습니다.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{try{process.stdin.setRawMode?.(false);}catch{}console.error(e.message||e);process.exit(1);});
