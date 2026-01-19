# agentmine

AIエージェントのためのプロジェクト管理ツール（Redmine for AI Agents）

## プロジェクト概要

agentmineは**AIが使う**プロジェクト管理ツール。Blackboard設計でデータ層のみ提供し、判断・制御はしない。

```
Human → Orchestrator(Claude Code等) → Worker(サブエージェント) → Git
                ↓
          agentmine (データ層)
```

## 技術スタック

- **モノレポ**: pnpm + Turborepo
- **言語**: TypeScript (strict mode)
- **パッケージ構成**: @agentmine/cli, @agentmine/web, @agentmine/core
- **CLI**: Commander.js
- **DB**: SQLite (ローカル) / PostgreSQL (本番), Drizzle ORM
- **Web UI**: Next.js 14+ (App Router) + shadcn/ui + Tailwind CSS
- **テスト**: Vitest

## パッケージ構造

```
packages/
├── cli/      # CLIアプリケーション、MCPサーバー
├── web/      # Next.js Web UI
└── core/     # 共有ロジック（Services, Models, DB）
```

## コマンド

```bash
pnpm dev          # 全パッケージ同時起動
pnpm build        # ビルド
pnpm test         # テスト
pnpm lint         # リント
```

## コード規約

- 2スペースインデント
- シングルクォート使用
- ESLint + Prettier設定に従う
- 関数は単一責任
- エラーハンドリングを適切に行う

## 重要な設計原則

1. **Blackboard設計**: agentmineはデータ永続化のみ、判断・制御しない
2. **Observable Facts**: ステータスはexit code, merge状態等の客観事実で判定
3. **Worker隔離**: Workerはagentmineにアクセスしない、隔離されたworktreeで作業
4. **スコープ制御**: sparse-checkoutで物理的にファイルアクセスを制限
5. **非対話Worker**: Workerは自動承認モードで動作（--dangerously-skip-permissions等）

## Worker実行フロー

```bash
# 単一Worker起動
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
2. スコープ適用（exclude: sparse-checkout, write: chmod）
3. セッション開始
4. Worker AI起動（--detachでバックグラウンド）

## 詳細ドキュメント

- @docs/architecture.md - システムアーキテクチャ
- @docs/data-model.md - データモデル
- @docs/cli-design.md - CLIコマンド設計
- @docs/features/agent-system.md - エージェント定義
- @docs/features/agent-execution.md - 実行フロー
- @docs/features/mcp-integration.md - MCP連携
