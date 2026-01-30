# CLI設計

## 目的

agentmine CLIの設計を定義する。本ドキュメントはCLI設計のSSoT（Single Source of Truth）である。

## 背景

AgentMineは3つのインターフェース（CLI、MCP、Web UI）を提供する。CLIは主にOrchestratorとスクリプト向けだが、人間も監視・介入に使用できる。

**なぜDBファーストか:**
- 従来のSHOGUN（tmux + テキスト）では状態管理の一貫性を保ちにくかった
- DBを源泉とすることで、CLI/Web UI/MCPが同じ状態を参照できる
- 履歴・親子関係の追跡が容易になる

**なぜ客観的完了判定か:**
- 自己申告で完了にすると、タスク記録漏れが発生する
- 第三者が判定することで品質を担保

## 設計原則

| 原則 | 説明 | 理由 |
|------|------|------|
| DBファースト | 状態管理の源泉はDB | 一貫した状態管理 |
| 人間もアクター | AIと人間を同列に扱う | 統一的なタスク管理 |
| 客観的完了判定 | 自己承認不可 | 品質担保、記録漏れ防止 |
| 介入可能 | pause/resume/approve/reject | 人間が制御を維持 |

## 出力モード

| モード | 用途 |
|--------|------|
| デフォルト | パイプ連携、タブ区切り |
| --json | Orchestrator AI向け |
| --quiet | IDのみ出力 |
| --pretty | 人間向け、カラー付き |

## コマンド構造

| コマンド | 説明 |
|---------|------|
| init | プロジェクト初期化 |
| task | タスク管理（作成・一覧・介入） |
| queue | タスクキュー管理 |
| worker | Worker環境管理 |
| session | セッション管理 |
| agent | エージェント定義管理 |
| memory | Memory Bank |
| settings | 設定管理 |
| ui | Web UI起動 |

## taskコマンド

タスクの作成・管理・介入。

### 基本操作

| サブコマンド | 説明 |
|-------------|------|
| task add {title} | タスク作成 |
| task list | タスク一覧 |
| task show {id} | タスク詳細 |
| task update {id} | タスク更新 |
| task delete {id} | タスク削除 |
| task tree {id} | 親子関係をツリー表示 |

### 介入操作

| サブコマンド | 説明 |
|-------------|------|
| task pause {id} | 一時停止 |
| task resume {id} | 再開 |
| task cancel {id} | キャンセル |
| task retry {id} | 再実行 |
| task approve {id} | 完了を承認 |
| task reject {id} | 却下 |

### task addの主要オプション

| オプション | 説明 |
|-----------|------|
| -d, --description | 説明 |
| -p, --priority | low / medium / high / critical |
| --parent {id} | 親タスクID |
| --assignee {name} | 担当者（Agent名 or @人間名） |

### task listの主要オプション

| オプション | 説明 |
|-----------|------|
| -s, --status | ステータスでフィルタ |
| --assignee {name} | 担当者でフィルタ |
| --needs-review | レビュー待ちのみ |

## queueコマンド

タスクキューの管理。

| サブコマンド | 説明 |
|-------------|------|
| queue list | キュー内タスク一覧 |
| queue add {task-id} | キューに投入 |
| queue assign {task-id} {actor} | 担当者アサイン |
| queue priority {task-id} {priority} | 優先度変更 |

## workerコマンド

Worker環境（worktree）の管理。

| サブコマンド | 説明 |
|-------------|------|
| worker run {task-id} | worktree作成 + 起動 |
| worker list | アクティブ一覧 |
| worker status {task-id} | 状態表示 |
| worker wait {ids...} | 完了待機 |
| worker stop {ids...} | 停止 |

### worker runの主要オプション

| オプション | 説明 |
|-----------|------|
| -a, --agent {name} | エージェント名 |
| --exec | AIプロセスを起動 |
| --detach | バックグラウンド実行 |

## sessionコマンド

セッション（実行単位）の管理。

| サブコマンド | 説明 |
|-------------|------|
| session list | セッション一覧 |
| session show {id} | セッション詳細 |
| session logs {id} | ログ表示 |

## 完了判定ルール

タスク実行者は自分で完了にできない。

| 実行者 | 承認者 |
|--------|--------|
| Agent (coder) | 別Agent (reviewer) or 人間 |
| Agent (reviewer) | 人間 or 別Agent |
| 人間 | Agent (validator) or 別人間 |

自己承認を試みると終了コード7（権限エラー）で失敗する。

## 使用パターン

### シーケンシャル実行

タスク作成 → Worker実行 → 別アクターが承認

### 並列実行

複数タスク作成 → 並列でWorker実行（--detach） → wait → 承認

### 介入フロー

実行中タスクをpause → 確認 → 問題なければresume / 問題あればreject

## グローバルオプション

| オプション | 説明 |
|-----------|------|
| --json | JSON出力 |
| --quiet | 最小出力 |
| --pretty | 人間向け |
| --verbose | 詳細出力 |

## 終了コード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | 一般エラー |
| 2 | 引数エラー |
| 5 | リソース不存在 |
| 6 | 状態エラー |
| 7 | 権限エラー（自己承認不可） |

## 環境変数

| 変数 | 説明 |
|------|------|
| AGENTMINE_DB_URL | データベースURL |
| AGENTMINE_USER | 現在のユーザー名 |
| AGENTMINE_LOG_LEVEL | ログレベル |

## 未確定事項

| 項目 | 現状 |
|------|------|
| バッチ承認 | 複数タスクの一括承認方法 |
| 通知連携 | Slack等への通知 |

## 関連ドキュメント

- MCP設計: @06-interfaces/mcp/overview.md
- Web UI設計: @06-interfaces/web/overview.md
- Worker実行フロー: @07-runtime/worker-lifecycle.md
- 用語集: @appendix/glossary.md
