# agentmine Overview

**Safe Parallel AI Development Environment** - 複数AIを同時に、安全に、管理可能に

## What is agentmine?

agentmineは**並列AI開発の実行環境**です。複数のAIエージェントを同時に安全に動かし、チーム全体で協業できる基盤を提供します。

```
┌─────────────────────────────────────────────────────────────┐
│  人間とAIの協業                                              │
│                                                             │
│  Human ──────┬─────→ Web UI ──┐                             │
│              │                 │                             │
│  Orchestrator ───→ CLI/MCP ───┼──→ DB (マスター) ──→ Worker │
│  (AI PM)                      │                             │
└───────────────────────────────┴─────────────────────────────┘
```

## Core Value

### 1. 並列AI管理

複数のAIを**同時に、互いに干渉せず**に動かします。

```bash
# 3つのタスクを並列実行
agentmine worker run 1 --exec --detach  # 認証機能
agentmine worker run 2 --exec --detach  # 決済機能
agentmine worker run 3 --exec --detach  # 管理画面

# 各Workerは独立したworktreeで隔離
.agentmine/worktrees/
├── task-1/  # 認証機能専用
├── task-2/  # 決済機能専用
└── task-3/  # 管理画面専用
```

### 2. スコープ制御

物理的なアクセス制限により、**安全に自動承認モード**で実行できます。

```yaml
# Agent定義
scope:
  exclude:                # 除外（物理的に存在しない）
    - "**/*.env"
    - "**/secrets/**"
  write:                  # 編集可能
    - "src/auth/**"       # 認証機能のみ
```

- 機密ファイルは**物理的に除外**（sparse-checkout）
- 編集範囲外は**読み取り専用**（chmod）
- AIが誤って変更できない

### 3. 人間とAIの協業

人間とAIが**同じDBを見て**協業します（Redmine的運用）。

- **人間**: Web UIでタスク管理・Agent定義・Worker監視
- **Orchestrator（AI PM）**: CLI/MCPで自動化（Claude Code等）
- **Worker（AI）**: 隔離されたworktreeでコード実装
- **agentmine**: すべてのデータをDB管理（単一真実源）

## Who uses agentmine?

### 個人開発者

```bash
# シンプルな並列開発
agentmine task add "ログイン機能"
agentmine worker run 1 --exec
```

### チーム開発

```
チーム全員が共有PostgreSQLに接続
→ リアルタイムで進捗共有
→ Web UIで可視化
```

### Orchestrator（AI PM）

```typescript
// Claude CodeがMCP経由で操作
await agentmine.task.create({ title: "API実装" });
await agentmine.worker.run(taskId, { exec: true });
await agentmine.worker.status(taskId);
```

## Why agentmine?

### 既存ツールとの比較

| 課題 | 従来 | agentmine |
|------|------|-----------|
| **並列実行** | 手動worktree管理 | 自動worktree＆隔離 |
| **安全性** | 人間が逐一承認 | スコープ制御で自動承認 |
| **協業** | ファイル共有・Slack | 共有DB＆Web UI |
| **状態管理** | 手動メモ | DB＆Memory Bank |

### DevHiveとの関係

agentmineは[DevHive](https://github.com/krtw00/devhive)の後継です。

- DevHive: シンプルな並列AI実行（個人向け）
- agentmine: セキュリティ＋チーム協業＋Memory Bank

**Migration**: @./devhive-migration.md 参照

## How it works?

### 1. タスク登録

```bash
agentmine task add "認証機能実装"
```

### 2. Worker起動

```bash
agentmine worker run 1 --exec --detach
```

**内部動作**:
1. Git worktree作成（`.agentmine/worktrees/task-1/`）
2. スコープ適用（exclude: sparse-checkout, write: chmod）
3. Memory Bank注入（プロジェクト知識）
4. Worker AI起動（自動承認モード）

### 3. 監視

```bash
agentmine worker status 1
# Status: running
# Progress: 3 commits, 250 lines changed
```

### 4. 完了

```bash
agentmine worker done 1
# マージ・クリーンアップ
```

## Key Concepts

### Single Source of Truth（DBマスター）

すべてのデータ（タスク、Agent、Memory、設定）はDBで管理。

```
DB (PostgreSQL/SQLite)
├── tasks         # タスク
├── sessions      # セッション記録
├── agents        # Agent定義
├── memories      # Memory Bank
└── settings      # 設定
```

### Observable & Deterministic

ステータスはAIの報告ではなく、**客観的事実**で判定。

```typescript
// ❌ AIに頼る（不確実）
worker.report("50%完了しました");

// ✅ 客観事実を観測（確実）
const progress = {
  commits: git.log().length,
  exitCode: session.exitCode,
  merged: git.isMerged(branch)
};
```

### Fail Fast

エラーは即座に失敗。リカバリーは上位層（Orchestrator）の責務。

## Next Steps

- **初めての方**: @../02-architecture/architecture.md でアーキテクチャを理解
- **利用者**: @../07-runtime/worker-lifecycle.md でWorker実行フローを理解
- **開発者**: @../09-development/implementation-plan.md で開発を開始
- **DevHiveユーザー**: @./devhive-migration.md で移行方法を確認

## Related Documents

- @../00-INDEX.md - ドキュメント全体ナビゲーション
- @../02-architecture/architecture.md - システムアーキテクチャ詳細
- @./roadmap.md - ロードマップ
