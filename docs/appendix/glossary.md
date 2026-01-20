# 用語集

agentmineプロジェクトで使用する用語の正式な定義。

## 原則

- **用語の統一**: 同じ概念には常に同じ用語を使用
- **略語の制限**: 略語は初出時に定義
- **大文字小文字**: コマンド・ファイル名以外は統一

---

## 中核概念

### agentmine
プロジェクト名。並列AI開発の実行環境。小文字表記を推奨。

### Orchestrator（オーケストレーター）
並列実行を計画・監視するAIクライアント（Claude Code, Codex等）またはその役割を担う人間。

**類語**: ❌ Master, Manager, Controller
**英語表記**: Orchestrator（大文字O）
**日本語表記**: Orchestrator、オーケストレーター

### Worker（ワーカー）
隔離されたworktree内でコードを書くAIエージェント。

**類語**: ❌ Agent Runner, Sub-agent
**英語表記**: Worker（大文字W）
**日本語表記**: Worker、ワーカー

### worktree
Git worktreeの略。Workerが作業する隔離されたディレクトリ。

**正式表記**: `worktree`（小文字、1単語）
**❌ 誤表記**: work tree, workTree, ワークツリー

### Session（セッション）
1回のWorker実行記録。開始から終了までのライフサイクル。

**原則**: 1 task = N sessions（1タスクに対して複数セッション可能）

---

## データ・状態管理

### DBマスター
すべてのデータ（タスク、Agent、Memory、設定）はDBで管理する設計原則。

**英語**: DB Master, Database-as-Master
**ファイル**: スナップショット/エクスポート用のみ

### Single Source of Truth（SSOT）
単一の真実源。DBがマスターとなり、情報の重複を排除する原則。

### Observable Facts（観測可能な事実）
exit code、merge状態等、客観的に観測可能な事実に基づいてステータスを判定する原則。

**例**: タスクのステータスは人間が設定せず、Git判定で自動決定

---

## エージェント・実行

### Agent（エージェント）
Worker実行時に使用するAI定義。client、model、scope、promptContentを含む。

**正式表記**: Agent（大文字A）
**❌ 誤表記**: agent（小文字は変数名・ファイル名のみ）

### Agent Definition（Agent定義）
Agentの設定情報。DBの`agents`テーブルで管理。

**構成要素**: name, client, model, scope, config, promptContent

### scope（スコープ）
Workerがアクセスできるファイルの範囲を制御する設定。

**フィールド**:
- `exclude`: アクセス不可（sparse-checkoutで物理的に除外）
- `read`: 参照可能
- `write`: 編集可能（明示的に指定が必要）

**優先順位**: `exclude` > `read` > `write`

### promptContent（プロンプト内容）
Agent定義の一部。Worker起動時にAIクライアントに渡す指示。

**保存先**: DB（`agents.prompt_content`）
**出力先**: worktree内のクライアント固有ファイル（例: `.claude/CLAUDE.md`）

---

## AIクライアント

### Claude Code
正式名称。Anthropic社のCLIツール。

**実行バイナリ**: `claude-code`
**❌ 誤表記**: claude, ClaudeCode
**enum値**: `claude-code`

### Codex
正式名称。OpenAI社のCLIツール。

**実行バイナリ**: `codex`
**enum値**: `codex`

### Gemini CLI
正式名称。Google社のCLIツール。

**実行バイナリ**: `gemini`
**❌ 誤表記**: gemini-cli
**enum値**: `gemini-cli`

### Aider
正式名称。

**実行バイナリ**: `aider`
**enum値**: `aider`

---

## タスク管理

### Task（タスク）
開発作業の単位。

**ステータス**: `open`, `in_progress`, `done`, `failed`, `cancelled`
**判定**: Observable Factsに基づく（Git merge状態等）

### Task Status（タスクステータス）
タスクの状態。

**判定ロジック**:
- `open`: セッションなし
- `in_progress`: running セッションが1つ以上
- `done`: dod_result=merged のセッションが存在
- `failed`: runningなし、mergedなし、失敗/取消のみ
- `cancelled`: 手動キャンセル

### labels（ラベル）
タスクの柔軟な分類。ステータスとは別管理。

**例**: `blocked`, `needs_review`, `urgent`

---

## Memory Bank

### Memory Bank（メモリーバンク）
プロジェクト決定事項を永続化し、AIに知識として渡す機能。

**保存先**: DB（`memories`テーブル）
**出力先**: worktree（`.agentmine/memory/`）

### Memory Category（カテゴリ）
Memoryの分類。

**標準カテゴリ**:
- `architecture`: アーキテクチャ
- `tooling`: ツール選定
- `convention`: 規約
- `rule`: ルール

**拡張**: プロジェクト設定で追加可能

### Memory Status
Memoryの状態。

**値**:
- `draft`: 下書き（注入OFF）
- `active`: 有効（注入ON）
- `archived`: アーカイブ

---

## Git・ブランチ

### baseBranch（ベースブランチ）
Workerブランチの起点となるブランチ。

**設定**: `settings`テーブル（key: `git.baseBranch`）
**デフォルト**: `main`
**❌ 誤表記**: base-branch, base_branch

### Branch Naming（ブランチ命名）
Workerブランチの命名規則。

**形式**: `task-<taskId>-s<sessionId>`
**例**: `task-5-s123`

---

## CLI・コマンド

### CLI Command
agentmineのコマンドラインインターフェース。

**形式**: `agentmine <command> [subcommand] [options]`

### Command（コマンド）
CLIの第1階層。

**例**: `task`, `agent`, `worker`, `memory`, `session`

### Subcommand（サブコマンド）
CLIの第2階層。

**例**: `list`, `show`, `add`, `update`, `delete`

**統一**: `show`を使用（`get`は非推奨）

---

## MCP

### MCP（Model Context Protocol）
AIクライアントとの連携プロトコル。

**実装**: agentmine CLIのラッパーとして動作

### MCP Tool
MCPで提供するツール。

**命名**: `<category>_<action>` 形式
**例**: `task_list`, `worker_run`

---

## データベース

### PostgreSQL
メインDB。チーム開発・本番環境で使用。

**用途**: Redmine的運用、リアルタイム協業

### SQLite
サブDB。個人開発・ローカル環境で使用。

**用途**: お試し、オフライン環境

### Migration（マイグレーション）
DBスキーマの変更管理。

**ツール**: Drizzle Kit

---

## 実行・配置

### Exit Code
プロセスの終了コード。

**範囲**: 0-6
**0**: 成功
**1-6**: 各種エラー

### artifacts（成果物）
Workerが変更したファイルの一覧。

**形式**: worktreeルートからの相対パス配列
**例**: `["src/auth.ts", "tests/auth.test.ts"]`
**収集**: agentmineが`git diff`から自動収集

### DoD（Definition of Done）
タスク完了の定義。

**判定値**:
- `pending`: 未判定
- `merged`: マージ完了（完了）
- `timeout`: タイムアウト
- `error`: エラー

---

## 設定

### config.yaml
設定スナップショット。DBインポート用。

**場所**: `.agentmine/config.yaml`
**用途**: バックアップ、移行

### settings（設定）
プロジェクト設定。DBで管理。

**テーブル**: `settings`
**形式**: key-value

---

## ディレクトリ・ファイル

### .agentmine/
agentmineのデータディレクトリ。

**構成**:
```
.agentmine/
├── config.yaml          # 設定スナップショット
├── data.db              # SQLiteデータベース
├── agents/              # Agent定義スナップショット
├── memory/              # Memory Bankスナップショット
└── worktrees/           # Worker用worktree
    └── task-<id>/       # タスク毎のworktree
```

**Gitignore**: デフォルトで除外

### worktree構造
Worker実行時のディレクトリ構造。

```
.agentmine/worktrees/task-5/
├── .agentmine/
│   └── memory/          # Memory Bank（read-only）
├── .claude/             # Claude Code設定
│   └── CLAUDE.md        # promptContent出力先
├── src/                 # write可能
└── tests/               # write可能
```

---

## その他

### Redmine的運用
複数人が共有DBを参照し、リアルタイムで協業する運用モデル。

**元ネタ**: Redmine（プロジェクト管理ツール）

### Fail Fast
エラーは即座に失敗させ、リカバリーは上位層（Orchestrator）の責務とする原則。

### DRY（Don't Repeat Yourself）
情報の重複を避ける原則。ドキュメントも1箇所にのみ記載。

---

## 非推奨用語

| ❌ 非推奨 | ✅ 推奨 | 理由 |
|---------|--------|------|
| `claude` | `claude-code` | 実行バイナリ名と一致 |
| `gemini` | `gemini-cli` | enum値として明確 |
| `task get` | `task show` | CLIコマンド統一 |
| `work tree` | `worktree` | Git公式用語 |
| `ワークツリー` | `worktree` | 英語表記統一 |
| `Agent定義ファイル` | `Agent定義（DB）` | DBマスター原則 |

---

**ドキュメント更新時**: 新しい用語は必ずこの用語集に追加してください。
