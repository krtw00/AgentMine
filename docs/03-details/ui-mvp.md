---
depends_on:
  - ./api.md
  - ./daemon.md
  - ./event-stream.md
  - ./observable-facts.md
  - ./agent-profiles.md
  - ./settings.md
  - ./definition-of-done.md
  - ./scope-control.md
  - ./worktree-management.md
tags: [details, ui, mvp, navigation, interaction]
ai_summary: "MVPのWeb UI仕様（情報設計、画面、主要操作、SSE反映、空状態/エラー表示）を定義"
---

# UI仕様（MVP）

> Status: Draft
> 最終更新: 2026-02-02

本ドキュメントは、MVPのWeb UIを実装するための最小仕様を定義する。
UIは「監視と介入」を担い、状態の正はDBにある。

---

## UIの原則

| 原則 | 内容 |
|------|------|
| 監視優先 | 実行状況と“詰まり”が一目でわかる |
| 介入可能 | stop/retry/continue/approve等が迷わず実行できる |
| 事実ベース | 自己申告を表示しない。事実（logs/checks/violations/git）を表示する |
| 再取得可能 | SSE断でもAPI再取得で復元できる |

---

## 情報設計（ナビゲーション）

MVPはProject単位で画面を切り替える。
Project選択後は常にサイドナビを表示する。

| 項目 | 内容 |
|------|------|
| Project Switcher | 最上部に表示しProjectを切り替える |
| サイドナビ | Monitor / Runs / Agent Profiles / Settings |
| 接続表示 | SSE接続状態（connected/disconnected）を常時表示する |

---

## ルーティング（概念）

| route | 画面 | 目的 |
|------|------|------|
| `/` | Project Switcher | Project選択/登録 |
| `/p/:projectId/monitor` | Task Monitor | 監視と主要操作 |
| `/p/:projectId/runs` | Runs | run一覧とフィルタ |
| `/p/:projectId/runs/:runId` | Run Detail | ログ/チェック/事実の閲覧 |
| `/p/:projectId/agents` | Agent Profiles | 実行プロファイル管理 |
| `/p/:projectId/settings` | Settings | `scope.defaultExclude` / `dod.requiredChecks` 管理 |
| `/p/:projectId/tasks/:taskId/live` | Task Live View | Task内の全Role監視 |

注:
- ルーティング実装（Next.js app router等）は実装に委ねる。

---

## UI提供方式（ハイブリッド）

本番（運用）では、DaemonがUIを配信する（単一プロセス）。
開発時はUIを別ポートのdev serverで起動し、`/api/*` と `/api/events` をDaemonへプロキシする。

| 観点 | 本番 | 開発 |
|------|------|------|
| UIの配信 | Daemonが配信する | dev serverが配信する |
| API/SSE | 同一originで提供する | dev serverがDaemonへプロキシする |
| UIの参照パス | 相対パス（`/api/...`）である | 相対パス（`/api/...`）である |

注:
- UIは「Daemonのホスト/ポート」を設定として持たない。

---

## データ更新（SSE + 再取得）

| 事項 | 方針 |
|------|------|
| SSE購読 | Project選択中は`/api/events`を購読する |
| 再接続 | 自動再接続する |
| 再取得 | 再接続時は必要なリソースをAPIで再取得する |

対象イベントは[イベント配信](./event-stream.md)に従う。

---

## 画面仕様（MVP）

### Project Switcher（S000）

| 表示 | 内容 |
|------|------|
| Project一覧 | name/repo_path/base_branch |
| 空状態 | Project未登録の場合は登録導線を表示する |

| 操作 | バリデーション |
|------|----------------|
| Project登録 | repo_pathがGit repoである、base_branchが必須 |

### Task Monitor（S001）

Chrome DevToolsのNetwork風に「Overview + Run一覧テーブル + ウォーターフォール」を常時表示する。
詳細パネルはrun選択時に開き、既定は閉じる（折りたたみ可能）とする。
Monitorは「今起きていること」と「次に人間が介入すべきこと」を最短で判断できる画面である。

| 領域 | 表示 |
|------|------|
| Overview | 実行の時間分布（NetworkのOverview風）。status別のアクティビティを視覚化する。現在の選択/フィルタ後の一覧に追従する |
| テーブル | Run一覧（status/task/reasons/agent_profile/started/duration/dod/violations/head_sha/worktree_dirty） |
| ウォーターフォール | runの開始/終了/実行時間（右端で視覚化） |
| 詳細パネル | 選択runのfacts（logs/checks/violations/git/worktree）。未選択時は閉じる |

注:
- Taskは専用ツリー画面を必須にしない。MVPでは「Group by task（親子階層）」をデフォルトONとする。
- 親子階層は `tasks.parent_id` により表現される。UIは親タスクを折りたたみ/展開できる。
- フラットなRun一覧に切り替えるトグルを提供する（任意）。

#### フィルタ（MVP）

| 種別 | 例 |
|------|---|
| status | running / failed / completed |
| reason codes | needs_review理由、dod_failed 等 |
| task | task_id、title検索 |
| agent_profile | name |

| 操作 | 条件/挙動 |
|------|-----------|
| Task作成 | title/write_scopeが必須。依存は任意。作成後にstart runできる |
| start run | write_scope未設定は不可（設定導線を出す）。Agent Profileを選択する |
| stop | runningなrunに対してのみ表示する |
| retry | 対象Taskに新runを追加する（追加入力なし） |
| continue | 追加入力を要求し、新runを追加する |
| approve/reject | scope violationを承認/却下する（Humanのみ） |
| Live | Task Live View（S006）へ遷移する。自律駆動中は「Auto」バッジを表示する |

注:
- start runの追加自由入力は置かない。指示変更はtask.descriptionの更新かcontinueで行う。
- write_scopeはファイルツリー（ディレクトリ/ファイル）から選択して入力できる。入力値の実体はglob配列である。
- 個人情報等をAIから隠す場合はwrite_scopeではなくexcludeを使用する。excludeはSettings（`scope.defaultExclude`）で管理する。
- Task作成/編集の近傍に、exclude設定（Settings）への導線を置く。

### Runs（S003）

| 表示 | 内容 |
|------|------|
| run一覧 | status/started_at/finished_at/task/agent_profile/head_sha/worktree_dirty |
| フィルタ | status、task、agent_profile |

| 操作 | 条件/挙動 |
|------|-----------|
| Run Detailへ遷移 | runを選択する |

### Run Detail（S003内）

Runの事実をタブで表示する。

| タブ | 内容 |
|------|------|
| Output | runログ（stdout/stderr） |
| Meta | prompt、環境、digest等（meta） |
| Checks | DoDチェック結果とログ参照 |
| Violations | scope_violationsの一覧と承認状態 |
| Git/Worktree | branch/worktree_path/head_sha/worktree_dirty |

### Agent Profiles（S004）

| 表示 | 内容 |
|------|------|
| 一覧 | name/runner/model（任意）/default_exclude |
| 詳細 | prompt_template、default_write_scope（任意）、config（任意） |
| capability表示 | supports_model等を表示し、入力の可否を明示する |

### Settings（S005）

| 設定 | 内容 |
|------|------|
| `scope.defaultExclude` | Project共通exclude（glob配列） |
| `dod.requiredChecks` | 必須チェック定義（label/command等） |

注:
- settings変更は以降のrunに適用する。過去runはsnapshotで解釈する（→Project設定）。
- `scope.defaultExclude` はファイルツリー選択（B） + glob追記（C）のハイブリッド入力を想定する。

---

## 空状態とエラー表示（MVP）

| 状態 | 表示 |
|------|------|
| Projectなし | Project登録導線 |
| Agent Profileなし | 作成導線（start run不可） |
| DoD未定義 | DoDは`pending`として表示し、Settings導線を出す |
| SSE切断 | disconnected表示 + 再取得ボタン |
| run開始不可 | 理由（例: write_scope未設定）を明示する |

---

## 関連ドキュメント

- [Task Live View（S006）](./ui-task-live-view.md) - Task内全Role監視
- [UI設計（概要）](./ui.md) - 画面一覧と方向性
- [API設計](./api.md) - UI/Daemon間API
- [イベント配信](./event-stream.md) - SSEイベント
- [観測可能な事実](./observable-facts.md) - 状態導出と理由コード
- [Agent Profiles](./agent-profiles.md) - 実行プロファイル
- [Project設定](./settings.md) - `scope.defaultExclude` / `dod.requiredChecks`
- [DoD（Definition of Done）](./definition-of-done.md) - チェック結果
- [スコープ制御](./scope-control.md) - 介入理由（違反）
- [worktree管理](./worktree-management.md) - worktree事実
