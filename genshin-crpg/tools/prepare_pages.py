#!/usr/bin/env python3
"""Preserve existing tracked site files, overlay only the verified game pack."""
from pathlib import Path
import argparse, shutil, subprocess

parser=argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
output=args.output.resolve()
if output.exists():
    raise SystemExit('Use an empty, new artifact directory.')
if output==root or root in output.parents:
    raise SystemExit('The artifact directory must be outside the repository.')
output.mkdir(parents=True)
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
for name in filter(None,files):
    path=Path(name)
    if path.parts[0] in ('.github','genshin-crpg') or path.name.startswith('.git'):
        continue
    source=root/path
    if source.is_symlink():
        raise SystemExit('Unexpected symlink: '+name)
    if not source.is_file():
        raise SystemExit('Missing existing site file (full checkout required): '+name)
    target=output/path
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)
shutil.copytree(root/'genshin-crpg/dist',output/'genshin-crpg/dist')
(output/'.nojekyll').touch()
print('Pages artifact staged:',output)
