# CLI設計

## 目的

agentmine CLIの設計を定義する。本ドキュメントはCLI設計のSSoT（Single Source of Truth）である。

## 設計思想

### コアコンセプト

| コンセプト | 説明 |
|-----------|------|
| **DBファースト** | 状態管理の源泉はDB。CLIはDBを参照・更新 |
| **人間もアクター** | AIだけでなく人間もタスク実行者として扱う |
| **客観的完了判定** | 自己申告で完了にできない。第三者が判定 |
| **介入可能** | いつでも一時停止・修正・承認できる |

### インターフェース役割分担

| ユーザー | インターフェース | 用途 |
|----------|------------------|------|
| Orchestrator AI | CLI / MCP | タスク管理、Worker起動、並列制御 |
| シェルスクリプト | CLI | 自動化、CI/CD連携 |
| 人間 | Web UI / CLI | 監視、介入、タスク確認 |

## 出力モード

| モード | 用途 | 例 |
|--------|------|-----|
| デフォルト | パイプ連携、スクリプト | タブ区切りテキスト |
| --json | Orchestrator AI（推奨） | 構造化データ |
| --quiet | 単一値の取得 | IDのみ |
| --pretty | デバッグ、手動確認 | カラー付きテーブル |

## コマンド構造

| コマンド | 説明 |
|---------|------|
| init | プロジェクト初期化 |
| task | タスク管理 |
| worker | Worker環境管理 |
| session | セッション管理 |
| queue | タスクキュー管理 |
| agent | エージェント定義管理 |
| memory | Memory Bank |
| settings | プロジェクト設定管理 |
| audit | 監査ログ |
| db | データベース管理 |
| mcp | MCPサーバー |
| ui | Web UI起動 |

---

## taskコマンド

タスクの作成・管理。

| サブコマンド | 説明 |
|-------------|------|
| task add {title} | タスク作成 |
| task list | タスク一覧 |
| task show {id} | タスク詳細 |
| task update {id} | タスク更新 |
| task delete {id} | タスク削除 |
| task tree {id} | タスクツリー表示（親子関係） |

### task addオプション

| オプション | 説明 |
|-----------|------|
| -d, --description | 説明 |
| -p, --priority | low / medium / high / critical |
| -t, --type | task / feature / bug / refactor |
| --parent {id} | 親タスクID |
| --assignee {name} | 担当者名（Agent名 or 人間名） |
| --labels {csv} | ラベル（カンマ区切り） |
| --json | JSON出力 |
| --quiet | IDのみ出力 |

### task listオプション

| オプション | 説明 |
|-----------|------|
| -s, --status | pending / queued / running / paused / needs_review / completed / failed / cancelled |
| -p, --priority | low / medium / high / critical |
| --assignee {name} | 担当者でフィルタ |
| --unassigned | 未割り当てのみ |
| --needs-review | レビュー待ちのみ |
| --limit {n} | 表示件数（デフォルト: 20） |
| --json | JSON出力 |

---

## queueコマンド

タスクキューの管理。

| サブコマンド | 説明 |
|-------------|------|
| queue list | キュー内タスク一覧 |
| queue add {task-id} | タスクをキューに投入 |
| queue remove {task-id} | キューから削除 |
| queue assign {task-id} {actor} | 担当者をアサイン |
| queue priority {task-id} {priority} | 優先度変更 |

### queue assignの使い方

```bash
# AIエージェントにアサイン
agentmine queue assign 42 coder

# 人間にアサイン
agentmine queue assign 42 @kurotowa

# 未割当に戻す
agentmine queue assign 42 --unassign
```

---

## workerコマンド

Worker環境の管理と実行。

| サブコマンド | 説明 |
|-------------|------|
| worker run {task-id} | worktree作成 + Worker起動 |
| worker list | アクティブworktree一覧 |
| worker status {task-id} | 実行状態表示 |
| worker wait {task-ids...} | 完了待機 |
| worker stop {task-ids...} | Worker停止 |
| worker cleanup {task-id} | worktree削除 |
| worker prompt {task-id} | プロンプト生成 |

### worker runオプション

| オプション | 説明 |
|-----------|------|
| -a, --agent {name} | エージェント名（デフォルト: coder） |
| --exec {client} | Worker AIを起動 |
| --detach | バックグラウンドで起動 |
| --no-worktree | worktree作成をスキップ |
| --json | JSON出力 |

---

## 介入コマンド

実行中タスクへの介入。**監視・介入中心**の設計思想を反映。

### task pause / resume

```bash
# 一時停止
agentmine task pause {task-id}

# 再開
agentmine task resume {task-id}
```

### task approve / reject

**客観的完了判定**のためのコマンド。タスク実行者本人は使えない。

```bash
# 完了を承認（needs_review → completed）
agentmine task approve {task-id}
agentmine task approve {task-id} --comment "LGTM"

# 却下（needs_review → failed、再実行指示）
agentmine task reject {task-id}
agentmine task reject {task-id} --reason "テストが足りない" --retry
```

### task cancel

```bash
# キャンセル
agentmine task cancel {task-id}
agentmine task cancel {task-id} --reason "方針変更"
```

### task retry

```bash
# 失敗タスクを再実行
agentmine task retry {task-id}
```

---

## sessionコマンド

セッション（タスク実行の単位）の管理。

| サブコマンド | 説明 |
|-------------|------|
| session list | セッション一覧 |
| session show {id} | セッション詳細 |
| session logs {id} | セッションログ表示 |
| session cleanup | 古いセッション削除 |

### session listオプション

| オプション | 説明 |
|-----------|------|
| -s, --status | running / completed / failed / cancelled |
| --task {id} | タスクIDでフィルタ |
| --limit {n} | 表示件数 |
| --json | JSON出力 |

---

## agentコマンド

エージェント定義の管理。

| サブコマンド | 説明 |
|-------------|------|
| agent list | エージェント一覧 |
| agent show {name} | エージェント詳細 |
| agent create | エージェント作成 |
| agent update {name} | エージェント更新 |
| agent delete {name} | エージェント削除 |
| agent history {name} | 履歴表示 |
| agent rollback {name} --version {n} | 過去バージョンに戻す |

---

## memoryコマンド

Memory Bank（プロジェクト知識）の管理。

| サブコマンド | 説明 |
|-------------|------|
| memory list | 決定事項一覧 |
| memory add | 決定事項追加 |
| memory edit {id} | 決定事項編集 |
| memory remove {id} | 決定事項削除 |
| memory preview | コンテキストプレビュー |

---

## settingsコマンド

| サブコマンド | 説明 |
|-------------|------|
| settings list | 設定一覧 |
| settings get {key} | 設定値取得 |
| settings set {key} {value} | 設定値変更 |

---

## auditコマンド

監査ログ。

| サブコマンド | 説明 |
|-------------|------|
| audit list | 監査ログ一覧 |
| audit show {id} | 監査ログ詳細 |

---

## グローバルオプション

| オプション | 説明 |
|-----------|------|
| -C, --cwd {path} | 作業ディレクトリ |
| --config {path} | 設定ファイルのパス |
| --json | JSON出力 |
| --quiet | 最小出力 |
| --pretty | 人間向けフォーマット |
| --verbose | 詳細出力 |
| --version | バージョン表示 |
| --help | ヘルプ表示 |

---

## 終了コード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | 一般エラー |
| 2 | 引数エラー |
| 3 | 設定エラー |
| 4 | データベースエラー |
| 5 | リソース不存在 |
| 6 | 状態エラー |
| 7 | 権限エラー（自己承認不可など） |

---

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| AGENTMINE_CONFIG | 設定ファイルのパス | .agentmine/config.yaml |
| AGENTMINE_DB_URL | データベースURL | file:.agentmine/data.db |
| AGENTMINE_LOG_LEVEL | ログレベル | info |
| AGENTMINE_USER | 現在のユーザー名 | - |

---

## 使用パターン

### シーケンシャル実行

```bash
# タスク作成 → 実行 → 完了待ち
TASK_ID=$(agentmine task add "認証機能実装" --quiet)
agentmine worker run $TASK_ID --exec
# Worker完了後、別のアクターが承認
agentmine task approve $TASK_ID
```

### 並列実行

```bash
# 複数タスク作成
TASK1=$(agentmine task add "ログイン実装" --quiet)
TASK2=$(agentmine task add "ログアウト実装" --quiet)

# 並列実行
agentmine worker run $TASK1 --exec --detach
agentmine worker run $TASK2 --exec --detach

# 完了待ち
agentmine worker wait $TASK1 $TASK2

# 別のアクターが承認
agentmine task approve $TASK1 $TASK2
```

### 人間タスクの場合

```bash
# 人間にアサイン
TASK_ID=$(agentmine task add "デザインレビュー" --quiet)
agentmine queue assign $TASK_ID @kurotowa

# 人間が作業完了後、AIが検証して承認
agentmine task approve $TASK_ID --by reviewer
```

### 介入フロー

```bash
# 実行中タスクを一時停止
agentmine task pause 42

# 内容を確認
agentmine task show 42

# 問題なければ再開
agentmine task resume 42

# 問題あれば却下して再実行指示
agentmine task reject 42 --reason "方針変更" --retry
```

---

## 完了判定ルール

**重要:** タスク実行者は自分で完了にできない。

| 実行者 | 承認者 | 例 |
|--------|--------|-----|
| Agent (coder) | 別Agent (reviewer) or 人間 | コード実装 → レビュー |
| Agent (reviewer) | 人間 or 別Agent | レビュー → 最終確認 |
| 人間 | Agent (validator) or 別人間 | デザイン → AIがチェック |

```bash
# 自己承認は拒否される
$ AGENTMINE_USER=coder agentmine task approve 42
Error: Cannot approve own task (exit code 7)

# 別アクターなら承認可能
$ AGENTMINE_USER=reviewer agentmine task approve 42
Task 42 approved
```

---

## 関連ドキュメント

- [MCP設計](../mcp/overview.md)
- [Web UI設計](../web/overview.md)
- [Worker実行フロー](../../07-runtime/worker-lifecycle.md)
