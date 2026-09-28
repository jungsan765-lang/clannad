import {existsSync, mkdirSync, watch, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, '..');
const serverDir = path.join(root, 'server');
const distDir = path.join(root, 'dist');
const localState = path.join(root, '.local', 'wrangler');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const npx = isWin ? 'npx.cmd' : 'npx';
process.env.PYTHONUTF8 ??= '1';
process.env.PYTHONIOENCODING ??= 'utf-8';

function commandWorks(command, args = ['--version']) {
  const out = spawnSync(command, args, {cwd: root, stdio: 'ignore', shell: isWin});
  return !out.error && out.status === 0;
}

function findPython() {
  const candidates = isWin
    ? [
        {command: 'py', prefix: ['-3']},
        {command: 'python', prefix: []},
        {command: 'python3', prefix: []},
      ]
    : [
        {command: 'python3', prefix: []},
        {command: 'python', prefix: []},
      ];
  for (const candidate of candidates) {
    if (commandWorks(candidate.command, [...candidate.prefix, '--version'])) return candidate;
  }
  return null;
}

function run(command, args, {cwd = root, label = command} = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n[local] ${label}`);
    const child = spawn(command, args, {cwd, stdio: 'inherit', windowsHide: false, shell: isWin});
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${label} 실패 (exit ${code})`)));
  });
}

function runPython(python, script) {
  return run(python.command, [...python.prefix, script], {cwd: root, label: script});
}

function writeLocalOnlineConfig() {
  const target = path.join(distDir, 'online_config.js');
  writeFileSync(target, "/* Generated only for local development. */\\nwindow.CRPG_ONLINE_CONFIG={apiBase:'http://127.0.0.1:8787'};\\n");
}

async function waitFor(url, label, timeoutMs = 45000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const response = await fetch(url, {cache: 'no-store'});
      if (response.ok) return response;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`${label}가 ${Math.round(timeoutMs / 1000)}초 안에 시작되지 않았습니다.`);
}

function openBrowser(url) {
  try {
    if (isWin) {
      const child = spawn('cmd.exe', ['/c', 'start', '', url], {detached: true, stdio: 'ignore'});
      child.unref();
    } else if (process.platform === 'darwin') {
      const child = spawn('open', [url], {detached: true, stdio: 'ignore'});
      child.unref();
    } else {
      const child = spawn('xdg-open', [url], {detached: true, stdio: 'ignore'});
      child.unref();
    }
  } catch {}
}

const python = findPython();
if (!python) {
  console.error('\n[local] Python 3을 찾지 못했습니다. 이 프로젝트는 빌드에 Python 3이 필요합니다.');
  console.error('[local] Python 3을 설치한 뒤 dev-local.cmd를 다시 실행해 주세요.');
  process.exit(2);
}
if (!commandWorks('node')) {
  console.error('[local] Node.js를 찾지 못했습니다.');
  process.exit(2);
}
if (!commandWorks(npm)) {
  console.error('[local] npm을 찾지 못했습니다.');
  process.exit(2);
}

mkdirSync(localState, {recursive: true});

try {
  if (!existsSync(path.join(root, 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite'))) {
    await run(npm, ['ci'], {label: '첫 실행: npm 의존성 설치'});
  }

  await runPython(python, 'tools/build_server.py');
  await runPython(python, 'tools/build.py');
  writeLocalOnlineConfig();

  await run(
    npx,
    [
      'wrangler@4', 'd1', 'execute', 'genshin-crpg-local',
      '--local',
      '--config', 'wrangler.local.jsonc',
      '--file', 'schema.sql',
      '--persist-to', localState,
      '--yes',
    ],
    {cwd: serverDir, label: '로컬 D1 스키마 준비'}
  );
} catch (error) {
  console.error('\n[local] 시작 준비 실패:', error.message);
  process.exit(1);
}

const children = [];
let stopping = false;
function addChild(label, command, args, cwd) {
  const child = spawn(command, args, {cwd, stdio: 'inherit', windowsHide: false, shell: isWin});
  children.push(child);
  child.on('error', error => {
    if (!stopping) console.error(`\n[local] ${label} 실행 실패:`, error.message);
  });
  child.on('exit', code => {
    if (!stopping && code !== 0) {
      console.error(`\n[local] ${label}가 종료되었습니다. (exit ${code})`);
      shutdown(code || 1);
    }
  });
  return child;
}

function killTree(child) {
  if (!child || child.killed || !child.pid) return;
  try {
    if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {stdio: 'ignore'});
    else child.kill('SIGTERM');
  } catch {}
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) killTree(child);
  process.exitCode = code;
  setTimeout(() => process.exit(code), 100).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  stopping = true;
  for (const child of children) killTree(child);
});

addChild(
  '로컬 Worker',
  npx,
  [
    'wrangler@4', 'dev',
    '--local',
    '--config', 'wrangler.local.jsonc',
    '--persist-to', localState,
    '--ip', '127.0.0.1',
    '--port', '8787',
  ],
  serverDir
);

addChild(
  '로컬 게임',
  npm,
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
  root
);

try {
  const health = await waitFor('http://127.0.0.1:8787/health', '로컬 Worker');
  const info = await health.json().catch(() => ({}));
  if (info.configured !== true) throw new Error('로컬 Worker 비밀번호 설정이 준비되지 않았습니다.');
  await waitFor('http://127.0.0.1:5173/', '로컬 게임');
} catch (error) {
  console.error('\n[local] 서버 시작 실패:', error.message);
  shutdown(1);
}

console.log('\n============================================================');
console.log(' 원신 CRPG 로컬 테스트 환경이 준비되었습니다.');
console.log(' 게임   : http://127.0.0.1:5173/');
console.log(' Worker : http://127.0.0.1:8787/');
console.log(' D1     : genshin-crpg-local (PC 안의 격리된 로컬 DB)');
console.log(' 운영 Worker/D1에는 연결하지 않습니다.');
console.log(' 창을 닫거나 Ctrl+C를 누르면 로컬 서버가 종료됩니다.');
console.log('============================================================\n');
openBrowser('http://127.0.0.1:5173/');

let rebuilding = false;
let queued = false;
let debounce = null;

async function rebuild() {
  if (rebuilding) {
    queued = true;
    return;
  }
  rebuilding = true;
  try {
    do {
      queued = false;
      console.log('\n[local] 변경 감지: 로컬 빌드를 갱신합니다...');
      await runPython(python, 'tools/build_server.py');
      await runPython(python, 'tools/build.py');
      writeLocalOnlineConfig();
      console.log('[local] 갱신 완료. 브라우저에서 새로고침하면 반영됩니다.');
    } while (queued);
  } catch (error) {
    console.error('[local] 자동 재빌드 실패:', error.message);
  } finally {
    rebuilding = false;
  }
}

function queueRebuild() {
  clearTimeout(debounce);
  debounce = setTimeout(rebuild, 300);
}

for (const dir of ['source', 'content']) {
  const target = path.join(root, dir);
  if (!existsSync(target)) continue;
  try {
    watch(target, {recursive: true}, (_event, filename) => {
      if (!filename) return;
      queueRebuild();
    });
  } catch (error) {
    console.warn(`[local] ${dir} 자동 감시를 시작하지 못했습니다:`, error.message);
  }
}

for (const file of ['worker.mjs', 'schema.sql']) {
  const target = path.join(serverDir, file);
  if (!existsSync(target)) continue;
  try {
    watch(target, () => {
      if (file === 'schema.sql') {
        console.log('\n[local] schema.sql 변경 감지: DB 스키마 변경은 dev-local.cmd 재실행 후 적용됩니다.');
      } else {
        queueRebuild();
      }
    });
  } catch {}
}

await new Promise(() => {});
