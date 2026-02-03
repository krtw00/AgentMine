#!/bin/sh
set -e

# Claude CLI: 最新バージョンへのシンボリックリンク作成（root権限で）
CLAUDE_VERSIONS="/home/node/.local/share/claude/versions"
if [ -d "$CLAUDE_VERSIONS" ]; then
  LATEST=$(ls "$CLAUDE_VERSIONS" | sort -V | tail -1)
  if [ -n "$LATEST" ]; then
    ln -sf "$CLAUDE_VERSIONS/$LATEST" /usr/local/bin/claude
  fi
fi

# /data, /tmp/agentmine の書き込み権限
chown -R node:node /data 2>/dev/null || true
chown -R node:node /tmp/agentmine 2>/dev/null || true

# git safe.directory設定（nodeユーザーとして）
gosu node git config --global --add safe.directory '*'

# nodeユーザーで実行
exec gosu node "$@"
