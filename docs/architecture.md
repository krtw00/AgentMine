# Architecture

## Design Philosophy

**agentmineはAIが使うツール**であり、AIを制御するシステムではない。

```
Human (ユーザー)
    ↓ 会話
AI as Orchestrator (Claude Code等のメインエージェント)
    ↓ タスク割り振り・worktree作成
AI as Worker (サブエージェント)
    ↓ agentmine を使う
agentmine (データ層・状態管理)
```

- **Orchestrator**: ユーザーと会話し、タスクを分解・割り振るAI
- **Worker**: 実際にコードを書くAI（Orchestratorが起動するサブエージェント）
- **agentmine**: タスク・セッション・Memory Bankを管理するデータ層

## System Overview

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
│                    │                              │                     │
│                    │  ┌────────┐  ┌────────────┐ │                     │
│                    │  │Services│  │   Models   │ │                     │
│                    │  └────────┘  └────────────┘ │                     │
│                    │  ┌────────┐  ┌────────────┐ │                     │
│                    │  │   DB   │  │   Config   │ │                     │
│                    │  │Drizzle │  │   Parser   │ │                     │
│                    │  └────────┘  └────────────┘ │                     │
│                    └──────────────┬──────────────┘                     │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────────┐                     │
│                    │     SQLite / PostgreSQL      │                     │
│                    └──────────────────────────────┘                     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        File System                               │   │
│  │  .agentmine/                                                     │   │
│  │  ├── config.yaml      # プロジェクト設定                          │   │
│  │  ├── data.db          # SQLiteデータベース                        │   │
│  │  ├── agents/          # エージェント定義（YAML）                  │   │
│  │  ├── prompts/         # Workerへの詳細指示（Markdown）           │   │
│  │  └── memory/          # Memory Bank（プロジェクト決定事項）       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Note:** Executor/Workerの起動・管理はagentmineの責務ではない。Orchestrator（AIクライアント）が行う。

## Package Structure

```
agentmine/
├── packages/
│   ├── cli/                    # CLIアプリケーション
│   │   ├── src/
│   │   │   ├── index.ts        # エントリーポイント
│   │   │   ├── commands/       # コマンド定義
│   │   │   │   ├── init.ts
│   │   │   │   ├── task.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── memory.ts
│   │   │   │   └── ui.ts
│   │   │   ├── mcp/            # MCPサーバー
│   │   │   │   ├── server.ts
│   │   │   │   ├── tools.ts
│   │   │   │   └── resources.ts
│   │   │   └── utils/          # ユーティリティ
│   │   │       └── output.ts   # 出力フォーマット
│   │   └── package.json
│   │
│   ├── web/                    # Web UI
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx    # Dashboard
│   │   │   │   ├── tasks/      # タスク管理
│   │   │   │   ├── agents/     # エージェント定義閲覧
│   │   │   │   └── api/        # API Routes
│   │   │   └── components/     # UIコンポーネント
│   │   │       ├── kanban/
│   │   │       ├── task-card/
│   │   │       └── sidebar/
│   │   └── package.json
│   │
│   └── core/                   # 共有ロジック
│       ├── src/
│       │   ├── index.ts        # Public API
│       │   ├── db/             # データベース
│       │   │   ├── schema.ts   # Drizzle スキーマ
│       │   │   ├── client.ts   # DB接続
│       │   │   └── migrate.ts  # マイグレーション
│       │   ├── models/         # ドメインモデル
│       │   │   ├── task.ts
│       │   │   └── session.ts
│       │   ├── services/       # ビジネスロジック
│       │   │   ├── task-service.ts
│       │   │   ├── agent-service.ts   # YAML読み込み、定義提供
│       │   │   └── memory-service.ts
│       │   ├── config/         # 設定管理
│       │   │   ├── parser.ts   # YAML解析
│       │   │   └── schema.ts   # 設定スキーマ
│       │   └── types/          # 型定義
│       │       └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Note:** `executor/` は削除。Worker起動・実行はOrchestrator（AIクライアント）の責務。

## Data Flow

### 1. CLI → Core → DB

```
User Input
    │
    ▼
┌─────────────────┐
│  CLI Command    │  agentmine task add "..."
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TaskService    │  @core/services/task-service.ts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drizzle ORM    │  @core/db/client.ts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite/PG      │  .agentmine/data.db
└─────────────────┘
```

### 2. Web UI → API → Core → DB

```
Browser
    │
    ▼
┌─────────────────┐
│  Next.js Page   │  /tasks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Route      │  /api/tasks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TaskService    │  @core (shared)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
└─────────────────┘
```

### 3. MCP Client → MCP Server → Core

```
Cursor/Windsurf
    │
    ▼
┌─────────────────┐
│  MCP Protocol   │  JSON-RPC over stdio
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Server     │  agentmine mcp serve
│  (Tools/Res)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Core Services  │
└─────────────────┘
```

## Key Design Decisions

### 1. Monorepo with pnpm + Turborepo

**理由:**
- CLI/Web/Coreで型定義を共有
- 一貫したビルド・テスト環境
- Turborepoのキャッシュで高速ビルド

### 2. SQLite + PostgreSQL 二枚体制

**戦略:**

| 環境 | DB | 用途 |
|------|-----|------|
| ローカル開発 | SQLite | ゼロ設定、ポータブル |
| 本番環境 | PostgreSQL | AI機能（pgvector）、スケーラビリティ |

**理由:**
- SQLite: `agentmine init`だけで即使用可能
- PostgreSQL: pgvectorによるベクトル検索でAI機能を強化
  - Memory Bankのセマンティック検索
  - タスク類似検索
- Drizzle ORMで両方をサポート（クエリAPIは共通）

**参考:** [ADR-002: Database Strategy](./adr/002-sqlite-default.md)

### 3. File-based Memory Bank

**理由:**
- Markdownで人間も読める
- Gitで履歴管理可能
- AIエージェントが直接読み書き可能

### 4. YAML Configuration

**理由:**
- 人間が読みやすい
- コメント記述可能
- 既存ツール（Claude Code等）との親和性

## Security Considerations

### 1. Sandbox Execution（将来）

並列実行時はDockerコンテナで隔離：

```
┌──────────────────────────────────────┐
│  Host                                │
│  ┌────────────┐  ┌────────────┐     │
│  │ Container  │  │ Container  │     │
│  │  Task #1   │  │  Task #2   │     │
│  │  (isolated)│  │  (isolated)│     │
│  └────────────┘  └────────────┘     │
└──────────────────────────────────────┘
```

### 2. API Key Management

- 環境変数で管理（`.env`）
- 設定ファイルには含めない
- MCP経由でのキー露出を防ぐ

## Extensibility

### 1. Plugin System（将来）

```typescript
// プラグインインターフェース
interface AgentminePlugin {
  name: string;
  hooks: {
    onTaskCreate?: (task: Task) => void;
    onTaskComplete?: (task: Task) => void;
    onWorktreeCreate?: (worktree: Worktree) => void;
  };
  commands?: Command[];
  mcpTools?: MCPTool[];
}
```

### 2. Custom Agents

エージェント定義は `.agentmine/agents/` ディレクトリにYAMLファイルとして配置。

```yaml
# .agentmine/agents/custom-agent.yaml
name: custom-agent
description: "カスタムエージェント"
client: claude-code
model: sonnet
scope:
  read: ["**/*"]
  write: ["src/**"]
  exclude: ["**/*.env"]
config:
  temperature: 0.7
  maxTokens: 4096
  promptFile: "../prompts/custom-agent.md"
```

詳細は [Agent System](./features/agent-system.md) を参照。
