#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "$0")" && pwd)
archive=${1:-"$here/xingchen-latest.tar.gz"}
test -f "$archive" || { echo "先执行 build-release.sh，或指定已有发布包。" >&2; exit 1; }
server=root@115.190.154.161
socket=$(mktemp -u /tmp/xingchen-ssh.XXXXXXXX)
trap 'ssh -S "$socket" -O exit "$server" >/dev/null 2>&1 || true' EXIT
ssh -M -S "$socket" -o ControlPersist=600 -o StrictHostKeyChecking=ask -fN "$server"
remote="/opt/xingchen-prototype/releases/upload-$(date -u +%Y%m%d-%H%M%S).tar.gz"
scp -o ControlPath="$socket" "$archive" "$server:$remote"
ssh -S "$socket" "$server" "bash -s -- '$remote'" < "$here/publish-on-server.sh"
curl -fsS http://115.190.154.161/xingchen/deployment-version.json
printf '\n演示地址：http://115.190.154.161/xingchen/\n'
