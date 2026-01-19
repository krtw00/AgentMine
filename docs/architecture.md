# Architecture

## Design Philosophy

**agentmineはBlackboard設計**を採用。データ層のみを提供し、判断・制御は行わない。

```
Human (ユーザー)
    ↓ 会話
AI as Orchestrator (Claude Code等のメインエージェント)
    ↓ agentmineでタスク管理、Worker起動
AI as Worker (サブエージェント)
    ↓ 隔離されたworktreeで作業（agentmineにはアクセスしない）
Git (成果物)
```

- **Orchestrator**: ユーザーと会話し、タスク分解・Worker起動・監視を行うAI
- **Worker**: 隔離されたworktreeでコードを書くAI（agentmineにアクセスしない）
- **agentmine**: タスク・セッション・Memory Bankを管理するデータ層（Blackboard）

### 重要な設計原則

1. **Blackboard設計**: agentmineはデータ永続化のみ、判断・制御しない
2. **Observable Facts**: ステータスはexit code, merge状態等の客観事実で判定
3. **Worker隔離**: Workerはagentmineにアクセスしない、隔離されたworktreeで作業
4. **スコープ制御**: sparse-checkoutで物理的にファイルアクセスを制限
5. **非対話Worker**: Workerは自動承認モードで動作

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
│  │  ├── memory/          # Memory Bank（プロジェクト決定事項）       │   │
│  │  └── worktrees/       # Worker用隔離作業領域                     │   │
│  │       └── task-<id>/  # タスク毎のgit worktree                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Worker Execution Flow

Orchestratorは`agentmine worker`コマンドでWorkerを起動・管理する。

```bash
# 単一Worker起動（フォアグラウンド）
agentmine worker run <taskId> --exec

# 並列実行（バックグラウンド）
agentmine worker run 1 --exec --detach
agentmine worker run 2 --exec --detach
agentmine worker wait 1 2    # 完了待機

# Worker管理
agentmine worker status      # 状態確認
agentmine worker stop 1      # 停止
agentmine worker done 1      # 完了・クリーンアップ
```

**worker runの動作:**
1. Git worktree作成（`.agentmine/worktrees/task-<id>/`）
2. ブランチ作成（`task-<id>`）
3. スコープ適用
   - `exclude`: sparse-checkoutで物理的に除外
   - `write`: 対象外ファイルをchmodで読み取り専用に
4. セッション開始（DBに記録）
5. Worker AI起動
   - `--exec`: フォアグラウンドで起動、完了を待機
   - `--exec --detach`: バックグラウンドで起動、PIDを記録して即座に戻る

**対応AIクライアント:**
- claude-code: `--dangerously-skip-permissions`
- codex: `--full-auto`
- aider: `--yes`
- gemini: `-y`

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

## Technology Stack

### 確定スタック

| カテゴリ | 技術 | 理由 |
|---------|------|------|
| パッケージマネージャ | **pnpm** | モノレポ最適、高速、ディスク効率 |
| モノレポ管理 | **Turborepo** | キャッシュ、並列ビルド |
| 言語 | **TypeScript** | 型安全、IDE支援 |
| CLI | **Commander.js** | 標準的、ドキュメント充実 |
| ORM | **Drizzle ORM** | 型安全、軽量、SQLite/PG両対応 |
| マイグレーション | **Drizzle Kit** | スキーマから自動生成 |
| Web UI | **Next.js 14+** (App Router) | React最新、SSR/SSG対応 |
| UIコンポーネント | **shadcn/ui + Tailwind CSS** | カスタマイズ性、モダン |
| テスト | **Vitest** | 高速、TypeScript対応、Jest互換 |
| 配布 | **npm公開** | 標準的、`npx`対応 |

### インストール方法（ユーザー向け）

```bash
# グローバルインストール
npm install -g agentmine

# または npx で直接実行
npx agentmine init
```

### MCP設定例（Claude Code）

```json
{
  "mcpServers": {
    "agentmine": {
      "command": "npx",
      "args": ["agentmine", "mcp", "serve"]
    }
  }
}
```

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
