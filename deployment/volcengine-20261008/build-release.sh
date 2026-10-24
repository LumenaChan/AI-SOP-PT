#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "$0")" && pwd)
runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if ! command -v node >/dev/null 2>&1 && [[ -x "$runtime/node/bin/node" ]]; then
    export PATH="$runtime/node/bin:$PATH"
fi
if ! command -v pnpm >/dev/null 2>&1 && [[ -x "$runtime/bin/fallback/pnpm" ]]; then
    export PATH="$runtime/bin/fallback:$PATH"
fi
for tool in git node pnpm python3; do command -v "$tool" >/dev/null || { echo "缺少 $tool" >&2; exit 1; }; done
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
git clone --depth 1 --branch main https://github.com/LumenaChan/AI-SOP-PT.git "$scratch/repo"
commit=$(git -C "$scratch/repo" rev-parse HEAD)
project="$scratch/repo/xingchen-prototype"
python3 "$here/adapt-subpath.py" "$project"
cd "$project"
pnpm install --frozen-lockfile --ignore-scripts
node node_modules/esbuild/install.js
node node_modules/vite/bin/vite.js build --base=/xingchen/
node scripts/prepare-sites-build.mjs
node --test tests/*.test.mjs
python3 - "$project/dist/client" "$commit" "$here/xingchen-latest.tar.gz" <<'PY'
from pathlib import Path
import json, hashlib, sys, tarfile
from datetime import datetime, timezone
root = Path(sys.argv[1])
(root/'deployment-version.json').write_text(json.dumps({
    'repository': 'https://github.com/LumenaChan/AI-SOP-PT',
    'branch': 'main', 'commit': sys.argv[2], 'basePath': '/xingchen/',
    'builtAt': datetime.now(timezone.utc).isoformat(),
}, indent=2) + '\n')
(root/'MANIFEST.sha256').write_text(''.join(
    hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(root).as_posix() + '\n'
    for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'MANIFEST.sha256'
))
with tarfile.open(sys.argv[3], 'w:gz') as tar:
    for p in sorted(root.rglob('*')):
        if p.is_file(): tar.add(p, arcname=p.relative_to(root).as_posix())
print('发布包：' + sys.argv[3])
PY
