#!/usr/bin/env bash
set -euo pipefail
archive=${1:?请提供发布包绝对路径}
[[ -f "$archive" ]] || { echo "发布包不存在" >&2; exit 1; }
root=/opt/xingchen-prototype
exec 9>"$root/.deploy.lock"
flock -n 9 || { echo "另一部署正在运行" >&2; exit 1; }
release="$root/releases/release-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$release/new"
tar -xzf "$archive" -C "$release/new"
(cd "$release/new" && sha256sum -c MANIFEST.sha256)
test -s "$release/new/index.html"
test -d "$root/app/assets"
cp -a "$root/app" "$release/previous"
cp -a "$root/default.conf" "$release/default.conf.before"
cp -a "$release/new/assets/." "$root/app/assets/"
cp "$release/new/deployment-version.json" "$root/app/deployment-version.json"
cp "$release/new/MANIFEST.sha256" "$root/app/MANIFEST.sha256"
cp "$release/new/index.html" "$root/app/.index.html.next"
chmod -R a+rX "$root/app"
mv -f "$root/app/.index.html.next" "$root/app/index.html"
if ! curl -fsS http://127.0.0.1/xingchen/ -o "$release/public-index.html" || ! cmp -s "$root/app/index.html" "$release/public-index.html"; then
    cp "$release/previous/index.html" "$root/app/.index.html.rollback"
    mv -f "$root/app/.index.html.rollback" "$root/app/index.html"
    echo "公开首页校验失败，已恢复旧首页；备份：$release/previous" >&2
    exit 1
fi
(cd "$root/app" && sha256sum -c MANIFEST.sha256)
printf '%s\n' "$release" > "$root/LAST_RELEASE.txt"
printf 'DEPLOYED_RELEASE=%s\n' "$release"
docker inspect xingchen-prototype --format '{{.State.Status}} {{.State.Health.Status}}'
