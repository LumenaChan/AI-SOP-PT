#!/bin/zsh

set -u

PROJECT_DIR="/Users/chenxuguang/Documents/ChatGPT/AI SOP 实训评价/xingchen-prototype"
NODE_BIN="/Users/chenxuguang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
VITE_ENTRY="$PROJECT_DIR/node_modules/vite/bin/vite.js"
PORT="5173"

cd "$PROJECT_DIR" || exit 1

echo "正在检查 Vite 服务..."

if curl -fsS --max-time 2 "http://localhost:${PORT}/teacher/dashboard" >/dev/null 2>&1; then
  echo "Vite 已经在运行："
  echo "http://localhost:${PORT}/teacher/dashboard"
  echo
  read -r "REPLY?按回车关闭窗口..."
  exit 0
fi

STALE_PIDS="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
if [[ -n "$STALE_PIDS" ]]; then
  echo "正在清理占用端口 ${PORT} 的失效进程..."
  kill $STALE_PIDS 2>/dev/null || true
  sleep 1
fi

if [[ ! -x "$NODE_BIN" ]]; then
  echo "找不到 Node.js：$NODE_BIN"
  read -r "REPLY?按回车关闭窗口..."
  exit 1
fi

if [[ ! -f "$VITE_ENTRY" ]]; then
  echo "找不到 Vite：$VITE_ENTRY"
  read -r "REPLY?按回车关闭窗口..."
  exit 1
fi

echo "正在启动 Vite..."
echo "预览地址：http://localhost:${PORT}/teacher/dashboard"
echo

exec "$NODE_BIN" "$VITE_ENTRY" --host 0.0.0.0
