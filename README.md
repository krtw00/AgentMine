# agentmine

**AI Agent Project Manager - Redmine for AI Agents**

> AIエージェントのためのプロジェクト管理プラットフォーム

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

[English](./README.en.md) | 日本語

---

## What is agentmine?

agentmineは**AIエージェント（Orchestrator）が使う**プロジェクト管理ツールです。

```
Human (ユーザー)
    ↓ 会話
AI as Orchestrator (Claude Code等)
    ↓ agentmineでタスク管理、Workerを起動
AI as Worker (サブエージェント)
    ↓ コード実装
Git (成果物)
```

**重要な設計方針:**
- **agentmineはBlackboard**（データ層のみ）- 判断・制御はしない
- **WorkerはagentmineにアクセスしないOrchestratorが状態管理**
- **ステータスはobservable facts**（exit code, merge状態）で判定

---

## Core Features

### 1. Task Management - タスク・セッション管理

```bash
# タスク作成
agentmine task add "ユーザー認証機能の実装" -p high -t feature

# タスク一覧（AI向けJSON出力）
agentmine task list --json

# セッション管理（Orchestratorが使用）
agentmine session start 1 --agent coder
agentmine session end 123 --exit-code 0 --dod-result merged
```

### 2. Agent Definitions - 役割別エージェント設定

```yaml
# .agentmine/agents/coder.yaml
name: coder
description: "コード実装担当"
client: claude-code
model: sonnet
scope:
  read: ["**/*"]
  write: ["src/**", "tests/**"]
  exclude: ["**/*.env", "**/secrets/**"]
config:
  temperature: 0.3
  maxTokens: 8192
  promptFile: "../prompts/coder.md"
```

### 3. Memory Bank - プロジェクト決定事項の永続化

```
.agentmine/memory/
├── architecture/
│   └── 001-database.md      # "PostgreSQL + SQLite"
├── tooling/
│   └── 001-test-framework.md # "Vitest"
└── convention/
    └── 001-commit-format.md  # "Conventional Commits"
```

Workerに渡すコンテキストとして自動注入されます。

### 4. Web UI - 人間向けダッシュボード

```bash
agentmine ui  # http://localhost:3333
```

- カンバンボード
- タスク一覧・詳細
- セッション履歴

### 5. MCP Integration - Claude Code等との連携

```json
// Claude Code設定
{
  "mcpServers": {
    "agentmine": {
      "command": "npx",
      "args": ["agentmine", "mcp", "serve"]
    }
  }
}
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              agentmine                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │   CLI       │  │  Web UI     │  │ MCP Server  │                     │
│  │             │  │  (Next.js)  │  │             │                     │
│  │  @cli       │  │  @web       │  │  @cli/mcp   │                     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│         │                │                │                             │
│         └────────────────┴────────────────┘                             │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────────┐                     │
│                    │           @core              │                     │
│                    │  Services / Models / DB      │                     │
│                    └──────────────────────────────┘                     │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────────┐                     │
│                    │     SQLite / PostgreSQL      │                     │
│                    └──────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| カテゴリ | 技術 |
|---------|------|
| パッケージマネージャ | pnpm |
| モノレポ管理 | Turborepo |
| 言語 | TypeScript |
| CLI | Commander.js |
| Web UI | Next.js + React + shadcn/ui + Tailwind |
| ORM | Drizzle ORM |
| DB | SQLite（ローカル）/ PostgreSQL（将来） |
| テスト | Vitest |
| 配布 | npm |

---

## Quick Start

```bash
# インストール
npm install -g agentmine

# プロジェクト初期化
agentmine init

# タスク作成
agentmine task add "ユーザー認証機能の実装" -p high -t feature

# Web UI起動
agentmine ui
```

---

## CLI Reference

### Task Management

```bash
agentmine task add <title> [options]     # タスク作成
agentmine task list [options]            # タスク一覧
agentmine task show <id>                 # タスク詳細
agentmine task update <id> [options]     # タスク更新
agentmine task delete <id>               # タスク削除
```

### Session Management

```bash
agentmine session start <task-id> --agent <name>   # セッション開始
agentmine session end <session-id> [options]       # セッション終了
agentmine session list                             # セッション一覧
agentmine session show <id>                        # セッション詳細
```

### Agent & Memory

```bash
agentmine agent list                     # エージェント一覧
agentmine agent show <name>              # エージェント詳細
agentmine memory list                    # Memory Bank一覧
agentmine memory add [options]           # 決定事項追加
agentmine memory preview                 # コンテキストプレビュー
```

### Worker Support

```bash
agentmine worker command <task-id>       # Worker起動コマンド生成
```

### Other

```bash
agentmine init                           # プロジェクト初期化
agentmine ui                             # Web UI起動
agentmine mcp serve                      # MCPサーバー起動
agentmine db migrate                     # DBマイグレーション
```

---

## Orchestrator / Worker Model

agentmineは**Blackboard設計**を採用しています。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Orchestrator / Worker モデル                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【Orchestrator（Claude Code等）の責務】                            │
│  - ユーザーとの会話                                                 │
│  - タスク分解・計画                                                 │
│  - agentmineでタスク・セッション管理                                │
│  - git worktree作成（直接gitコマンド使用）                          │
│  - Worker起動・監視                                                 │
│  - 成果物の検証・マージ判定                                         │
│                                                                     │
│  【Worker（サブエージェント）の責務】                               │
│  - 与えられたタスクの実装                                           │
│  - コード作成・テスト                                               │
│  - git commit                                                       │
│  ※ agentmineにはアクセスしない                                     │
│                                                                     │
│  【agentmineの責務】                                                 │
│  - データの永続化（タスク、セッション）                             │
│  - Memory Bankの管理                                                │
│  - CLI / MCP / Web UIの提供                                         │
│  ※ 判断・制御はしない（Blackboard）                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Development

```bash
# Clone
git clone https://github.com/krtw00/agentmine.git
cd agentmine

# Install dependencies
pnpm install

# Development
pnpm dev          # 全パッケージ同時起動
pnpm cli dev      # CLIのみ
pnpm web dev      # Web UIのみ

# Build
pnpm build

# Test
pnpm test

# CLI global install (dev)
cd packages/cli && pnpm link --global
```

---

## Documentation

詳細な設計ドキュメントは [docs/](./docs/) を参照してください。

- [Architecture](./docs/architecture.md) - システムアーキテクチャ
- [Data Model](./docs/data-model.md) - データモデル
- [CLI Design](./docs/cli-design.md) - CLIコマンド設計
- [Agent System](./docs/features/agent-system.md) - エージェント定義
- [MCP Integration](./docs/features/mcp-integration.md) - MCP連携

---

## Inspiration & Credits

agentmineは以下のプロジェクトから着想を得ています：

- [Redmine](https://www.redmine.org/) - 本格的なプロジェクト管理
- [Claude Code](https://claude.ai/code) - AIコーディングエージェント
- [TSK](https://github.com/dtormoen/tsk) - 並列実行アーキテクチャ

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <b>agentmine</b> - AI Agent Project Manager
</p>
