// 0.16.70: dist/ is no longer kept in the repository. The browser checks serve source files and take the game data
// (data.js, assets.js) and pictures from a local build, so a fresh checkout (CI) builds one first.
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
export function ensureDist(root){
  if(existsSync(resolve(root,'dist','data.js'))&&existsSync(resolve(root,'dist','assets.js')))return;
  const r=spawnSync(process.execPath,[resolve(root,'tools','python.mjs'),resolve(root,'tools','build.py')],{cwd:root,stdio:'inherit'});
  if(r.status!==0)throw new Error('build for the browser check failed');
}
