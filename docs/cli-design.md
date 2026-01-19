# CLI Design

## Overview

agentmine CLIは2つのユーザーを想定：

1. **人間**: プロジェクト管理、設定、モニタリング
2. **AIエージェント**: タスク取得、ステータス更新、コンテキスト操作

## Design Principles

### 1. AI-Friendly Output

```bash
# デフォルト: 人間向け（カラー、テーブル）
agentmine task list

# --json: AI向け（構造化データ）
agentmine task list --json

# --quiet: 最小出力（パイプ用）
agentmine task add "タスク" --quiet  # → "1" (IDのみ)
```

### 2. Composable Commands

```bash
# パイプで連携
agentmine task list --status open --json | jq '.[0].id' | xargs agentmine task start

# サブコマンドの一貫性
agentmine <resource> <action> [args] [options]
```

### 3. Progressive Disclosure

```bash
# 基本（必須のみ）
agentmine task add "タイトル"

# 詳細（オプション追加）
agentmine task add "タイトル" -p high -t feature --assignee coder
```

## Command Structure

```
agentmine
├── init                    # プロジェクト初期化
├── task                    # タスク管理
│   ├── add
│   ├── list
│   ├── get
│   ├── show
│   ├── update
│   └── delete
├── agent                   # エージェント定義管理
│   ├── list
│   └── show
├── worker                  # Worker起動支援（Orchestrator向け）
│   └── command
├── session                 # セッション管理
│   ├── list
│   ├── show
│   ├── start
│   ├── end
│   └── cleanup
├── memory                  # Memory Bank（プロジェクト決定事項）
│   ├── list
│   ├── add
│   ├── edit
│   ├── remove
│   └── preview
├── db                      # データベース管理
│   ├── migrate
│   └── reset
├── mcp                     # MCPサーバー（CLIラッパー）
│   └── serve
└── ui                      # Web UI起動
```

**Note:**
- `skill` コマンドは削除。スキル管理は agentmine の範囲外。
- `agent run` コマンドは削除。Worker起動はOrchestrator（AIクライアント）の責務。
- `task run` コマンドは削除。Orchestratorが直接Workerを起動する。
- `worktree` コマンドは削除。Orchestratorがgitを直接使用。
- `task start/done/assign` コマンドは削除。ステータス更新はobservable factsに基づく。
- `errors` コマンドは削除。sessionsテーブルで管理。

## Command Details

### init

```bash
agentmine init [options]

Options:
  --name <name>       プロジェクト名
  --template <name>   テンプレート (default, minimal, full)
  --force             既存設定を上書き

Examples:
  agentmine init
  agentmine init --name "My Project" --template full
```

**動作:**
1. `.agentmine/` ディレクトリ作成
2. `config.yaml` 生成（インタラクティブ or テンプレート）
3. `data.db` 初期化
4. `agents/`, `prompts/`, `memory/` ディレクトリ作成
5. `baseBranch` 存在チェック（警告のみ、エラーにはしない）

**baseBranch警告例:**
```
$ agentmine init
⚠ Warning: Branch 'develop' does not exist.
  Orchestrator will fail when creating worktrees.
  Create it with: git branch develop main

✓ Initialized agentmine in .agentmine/
```

### task add

```bash
agentmine task add <title> [options]

Arguments:
  title               タスクタイトル

Options:
  -d, --description <text>  説明
  -p, --priority <level>    low | medium | high | critical (default: medium)
  -t, --type <type>         task | feature | bug | refactor (default: task)
  --parent <id>             親タスクID
  --assignee <name>         担当者名
  --ai                      AI担当として割り当て
  --human                   人間担当として割り当て
  --json                    JSON出力
  --quiet                   IDのみ出力

Examples:
  agentmine task add "認証機能実装"
  agentmine task add "バグ修正" -p critical -t bug
  agentmine task add "APIリファクタ" --assignee coder --ai
```

**出力例:**

```
# 通常
Created task #1: 認証機能実装
  Priority: medium
  Type: task
  Status: open

# --json
{"id":1,"title":"認証機能実装","priority":"medium","type":"task","status":"open"}

# --quiet
1
```

### task list

```bash
agentmine task list [options]

Options:
  -s, --status <status>     open | in_progress | done | failed | cancelled
  -p, --priority <level>    low | medium | high | critical
  -t, --type <type>         task | feature | bug | refactor
  --assignee <name>         担当者でフィルタ
  --ai                      AI担当のみ
  --human                   人間担当のみ
  --unassigned              未割り当てのみ
  --parent <id>             親タスクでフィルタ
  --limit <n>               表示件数 (default: 20)
  --json                    JSON出力

Examples:
  agentmine task list
  agentmine task list --status open --ai
  agentmine task list --priority high --json
```

**出力例:**

```
# 通常（テーブル）
ID   Status       Priority  Type     Assignee      Title
#1   open         high      feature  -             認証機能実装
#2   in_progress  medium    task     🤖 coder      API設計
#3   review       low       refactor 👤 tanaka     コード整理

# --json
[
  {"id":1,"title":"認証機能実装","status":"open",...},
  {"id":2,"title":"API設計","status":"in_progress",...}
]
```

### task show

```bash
agentmine task show <id> [options]

Arguments:
  id                  タスクID

Options:
  --json              JSON出力
  --with-sessions     セッション履歴を含める
  --with-subtasks     サブタスクを含める

Examples:
  agentmine task show 1
  agentmine task show 1 --with-sessions
```

### agent list

```bash
agentmine agent list [options]

Options:
  --json              JSON出力

Examples:
  agentmine agent list
```

**出力例:**

```
Name       Client        Model    Scope
───────────────────────────────────────────────────────────────
planner    claude-code   opus     **/* (read-only)
coder      claude-code   sonnet   src/**, tests/** (write)
reviewer   claude-code   haiku    **/* (read-only)
writer     claude-code   sonnet   docs/**, *.md (write)
```

### agent show

```bash
agentmine agent show <name> [options]

Arguments:
  name                エージェント名

Options:
  --format <type>     出力形式 (default | yaml | json)

Examples:
  agentmine agent show coder
  agentmine agent show coder --format yaml
```

**出力例:**

```
Agent: coder

Description: コード実装担当
Client: claude-code
Model: sonnet

Scope:
  Read: **/*
  Write: src/**, tests/**, package.json
  Exclude: **/*.env, **/secrets/**

Config:
  temperature: 0.3
  maxTokens: 8192
  promptFile: ../prompts/coder.md
```

### worker command

```bash
agentmine worker command <task-id> [options]

Arguments:
  task-id             タスクID

Options:
  --agent <name>      エージェント名 (default: coder)
  --client <name>     AIクライアント (claude-code | codex | gemini-cli)
  --auto              自動承認フラグを付与
  --shell             シェル実行可能形式で出力

Examples:
  agentmine worker command 1 --agent coder
  agentmine worker command 1 --client codex --auto
  agentmine worker command 1 --shell
```

**動作:**
1. タスク情報取得
2. エージェント定義取得
3. AIクライアント別の起動コマンド生成

**出力例:**

```
# Claude Code
cd /project/.worktrees/task-1 && claude --print "$(cat <<'PROMPT'
# Worker: coder
You are a coder worker...

## Task
ID: #1
Title: 認証機能実装
...
PROMPT
)"

# Codex
codex exec -C /project/.worktrees/task-1 --full-auto "..."

# Gemini CLI
cd /project/.worktrees/task-1 && gemini -y "..."
```

**Note:** コマンドを生成するのみ。実行はOrchestratorが行う。

### memory list

```bash
agentmine memory list [options]

Options:
  --category <cat>    architecture | tooling | convention | rule
  --json              JSON出力

Examples:
  agentmine memory list
  agentmine memory list --category architecture
```

### memory add

```bash
agentmine memory add [options]

Options:
  --category <cat>    カテゴリ (required)
  --title <text>      タイトル (required)
  --decision <text>   決定事項 (required)
  --reason <text>     理由 (optional)

Examples:
  agentmine memory add \
    --category tooling \
    --title "テストフレームワーク" \
    --decision "Vitest" \
    --reason "高速、Vite互換"
```

### memory preview

```bash
agentmine memory preview

# AIに渡されるコンテキストをプレビュー
```

### session list

```bash
agentmine session list [options]

Options:
  --task <id>         タスクでフィルタ
  --status <status>   running | completed | failed | cancelled
  --json              JSON出力

Examples:
  agentmine session list
  agentmine session list --task 42 --status failed
```

### session show

```bash
agentmine session show <id>

Examples:
  agentmine session show 123
```

### session start

```bash
agentmine session start <task-id> [options]

Arguments:
  task-id             タスクID

Options:
  --agent <name>      エージェント名

Examples:
  agentmine session start 1 --agent coder
```

**動作:**
1. 新規セッションレコード作成
2. ステータスを `running` に設定
3. セッションIDを返す

**Note:** OrchestratorがWorker起動前に呼び出す。実際のWorker起動はOrchestratorの責務。

### session end

```bash
agentmine session end <session-id> [options]

Arguments:
  session-id          セッションID

Options:
  --exit-code <code>  Workerプロセスの終了コード
  --signal <signal>   終了シグナル（SIGTERM等、あれば）
  --dod-result <res>  DoD結果: pending | merged | timeout | error
  --artifacts <json>  成果物（JSON配列、worktree相対パス）
  --error <json>      エラー情報（失敗時）

Examples:
  # 正常終了・マージ済み
  agentmine session end 123 \
    --exit-code 0 \
    --dod-result merged \
    --artifacts '["src/auth.ts", "tests/auth.test.ts"]'

  # タイムアウト
  agentmine session end 123 \
    --exit-code 124 \
    --dod-result timeout \
    --error '{"type":"timeout","message":"Worker exceeded 5 minute limit"}'

  # Worker異常終了
  agentmine session end 123 \
    --exit-code 1 \
    --error '{"type":"crash","message":"Process exited with code 1"}'

  # シグナルで終了
  agentmine session end 123 \
    --exit-code 137 \
    --signal SIGKILL \
    --error '{"type":"signal","message":"Process killed"}'
```

**動作:**
1. セッションステータス更新（exit-codeに基づく）
2. 終了時刻・duration記録
3. 成果物/エラー情報保存
4. タスクステータス更新（必要に応じて）

**Note:** OrchestratorがWorker終了後に呼び出す。

### mcp serve

```bash
agentmine mcp serve [options]

Options:
  --stdio             stdio通信（デフォルト）
  --port <port>       HTTP通信

Examples:
  agentmine mcp serve
```

### ui

```bash
agentmine ui [options]

Options:
  --port <port>       ポート (default: 3333)
  --no-open           ブラウザを開かない

Examples:
  agentmine ui
  agentmine ui --port 8080
```

## Global Options

```bash
agentmine [command] [options]

Global Options:
  -C, --cwd <path>    作業ディレクトリ
  --config <path>     設定ファイルパス
  --json              JSON出力（対応コマンドのみ）
  --quiet             最小出力
  --verbose           詳細出力
  --version           バージョン表示
  --help              ヘルプ表示
```

## Exit Codes

| Code | Meaning | 例 |
|------|---------|-----|
| 0 | 成功 | 正常終了 |
| 1 | 一般エラー | 予期しないエラー |
| 2 | 引数エラー | 必須引数不足、不正な値 |
| 3 | 設定エラー | config.yaml不正、baseBranch未設定 |
| 4 | データベースエラー | DB接続失敗、マイグレーション失敗 |
| 5 | リソース不存在 | TaskNotFound, AgentNotFound, SessionNotFound |
| 6 | 状態エラー | InvalidStatus, SessionAlreadyRunning |

**Note:**
- MCPはCLIのラッパーとして動作し、同じexit codeを使用
- Worker（AIクライアント）のexit codeは別管理（sessions.exit_codeに記録）

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENTMINE_CONFIG` | 設定ファイルパス | `.agentmine/config.yaml` |
| `AGENTMINE_DB_URL` | データベースURL | `file:.agentmine/data.db` |
| `AGENTMINE_LOG_LEVEL` | ログレベル | `info` |
| `ANTHROPIC_API_KEY` | Anthropic APIキー | - |
| `OPENAI_API_KEY` | OpenAI APIキー | - |

## Implementation Notes

### Commander.js Structure

```typescript
// packages/cli/src/index.ts
import { Command } from 'commander';
import { taskCommand } from './commands/task';
import { agentCommand } from './commands/agent';
import { workerCommand } from './commands/worker';
import { sessionCommand } from './commands/session';
import { memoryCommand } from './commands/memory';
import { mcpCommand } from './commands/mcp';
import { uiCommand } from './commands/ui';
import { dbCommand } from './commands/db';

const program = new Command();

program
  .name('agentmine')
  .description('AI Project Manager - Redmine for AI Agents')
  .version('0.1.0');

// Global options
program
  .option('-C, --cwd <path>', 'Working directory')
  .option('--config <path>', 'Config file path')
  .option('--json', 'JSON output')
  .option('--quiet', 'Minimal output')
  .option('--verbose', 'Verbose output');

// Subcommands
program.addCommand(taskCommand);
program.addCommand(agentCommand);
program.addCommand(workerCommand);
program.addCommand(sessionCommand);
program.addCommand(memoryCommand);
program.addCommand(mcpCommand);
program.addCommand(dbCommand);
program.addCommand(uiCommand);

program.parse();
```

### Output Formatting

```typescript
// packages/cli/src/utils/output.ts
import chalk from 'chalk';
import { table } from 'table';

export function formatTask(task: Task, options: OutputOptions) {
  if (options.json) {
    return JSON.stringify(task);
  }
  
  if (options.quiet) {
    return String(task.id);
  }
  
  return `
${chalk.bold(`Task #${task.id}`)}: ${task.title}
  Status: ${colorStatus(task.status)}
  Priority: ${colorPriority(task.priority)}
  Assignee: ${formatAssignee(task)}
  `.trim();
}

export function formatTaskList(tasks: Task[], options: OutputOptions) {
  if (options.json) {
    return JSON.stringify(tasks);
  }
  
  const data = [
    ['ID', 'Status', 'Priority', 'Type', 'Assignee', 'Title'],
    ...tasks.map(t => [
      `#${t.id}`,
      colorStatus(t.status),
      colorPriority(t.priority),
      t.type,
      formatAssignee(t),
      truncate(t.title, 40),
    ]),
  ];
  
  return table(data);
}
```
