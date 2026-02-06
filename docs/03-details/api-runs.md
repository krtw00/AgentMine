---
depends_on:
  - ./api.md
  - ./data-model.md
  - ./observable-facts.md
tags: [details, api, runs, checks, violations]
ai_summary: "Run/Check/Scope Violation APIのリクエスト/レスポンス仕様を定義"
---

# API - Runs / Checks / Violations

> Status: Draft
> 最終更新: 2026-02-02

Run/Check/Scope ViolationのAPI詳細仕様を定義する。共通仕様は[API設計](./api.md)を参照。

---

## Runs

### GET /api/tasks/:taskId/runs

| クエリパラメータ | 説明                                           |
| ---------------- | ---------------------------------------------- |
| status           | フィルタ（running/completed/failed/cancelled） |

| レスポンス                                           | 説明           |
| ---------------------------------------------------- | -------------- |
| id, task_id, agent_profile_id                        | 識別情報       |
| status, exit_code                                    | 実行結果       |
| started_at, finished_at, cancelled_at                | タイムスタンプ |
| branch_name, worktree_path, head_sha, worktree_dirty | Git情報        |
| dod_status, scope_violation_count                    | 導出情報       |

### POST /api/tasks/:taskId/runs

Runを開始する。

| リクエスト       | 必須 | 説明                  |
| ---------------- | :--: | --------------------- |
| agent_profile_id |  ○   | 使用するAgent Profile |

| バリデーション                        | エラー              |
| ------------------------------------- | ------------------- |
| task.write_scopeが設定済み            | PRECONDITION_FAILED |
| 同一taskでrunning中のrunがない        | CONFLICT            |
| taskがdone/cancelledでない            | CONFLICT            |
| 依存タスクがすべてdone                | PRECONDITION_FAILED |
| runnerがsupports_non_interactive=true | PRECONDITION_FAILED |

### GET /api/runs/:id

| レスポンス       | 説明                                                          |
| ---------------- | ------------------------------------------------------------- |
| 基本情報         | id, task_id, task_title, agent_profile_id, agent_profile_name |
| 実行結果         | status, exit_code, started_at, finished_at, cancelled_at      |
| Git情報          | branch_name, worktree_path, head_sha, worktree_dirty          |
| スナップショット | scope_snapshot, dod_snapshot                                  |
| 関連データ       | checks配列, scope_violations配列                              |

### POST /api/runs/:id/stop

| バリデーション | エラー   |
| -------------- | -------- |
| runがrunning   | CONFLICT |

| レスポンス   | 説明      |
| ------------ | --------- |
| status       | cancelled |
| cancelled_at | 停止日時  |

### POST /api/runs/:id/retry

同じtask、同じagent_profileで新runを作成する。

| バリデーション                 | エラー   |
| ------------------------------ | -------- |
| 元のrunが終了済み              | CONFLICT |
| 同一taskでrunning中のrunがない | CONFLICT |

### POST /api/runs/:id/continue

追加入力付きで新runを作成する。

| リクエスト       | 必須 | 説明     |
| ---------------- | :--: | -------- |
| additional_input |  ○   | 追加指示 |

| バリデーション                 | エラー           |
| ------------------------------ | ---------------- |
| 元のrunが終了済み              | CONFLICT         |
| 同一taskでrunning中のrunがない | CONFLICT         |
| additional_inputが空でない     | VALIDATION_ERROR |

### GET /api/runs/:id/log

| クエリパラメータ | デフォルト | 説明                   |
| ---------------- | ---------- | ---------------------- |
| stream           | all        | stdout/stderr/meta/all |
| tail             | -          | 末尾N行のみ取得        |
| since_line       | -          | 指定行以降を取得       |

| レスポンス            | 説明                                               |
| --------------------- | -------------------------------------------------- |
| lines                 | ログ行配列（line_number, timestamp, stream, data） |
| total_lines, has_more | ページネーション情報                               |

---

## Checks

### GET /api/runs/:runId/checks

| レスポンス                   | 説明     |
| ---------------------------- | -------- |
| id, run_id, check_key, label | 識別情報 |
| kind, status, exit_code      | 実行結果 |
| output_ref                   | ログ参照 |

### POST /api/runs/:runId/checks/rerun

| リクエスト | 必須 | 説明                                  |
| ---------- | :--: | ------------------------------------- |
| check_keys |  -   | 再実行するcheck（省略時は全チェック） |

| バリデーション     | エラー              |
| ------------------ | ------------------- |
| runが終了済み      | CONFLICT            |
| worktreeが存在する | PRECONDITION_FAILED |

---

## Scope Violations

### GET /api/runs/:runId/scope-violations

| レスポンス       | 説明                        |
| ---------------- | --------------------------- |
| id, run_id, path | 識別情報                    |
| reason           | 違反理由（outside_write等） |
| approved_status  | pending/approved/rejected   |
| decided_at       | 決定日時                    |

### POST /api/scope-violations/:id/approve

| バリデーション           | エラー   |
| ------------------------ | -------- |
| approved_statusがpending | CONFLICT |

| レスポンス      | 説明     |
| --------------- | -------- |
| approved_status | approved |
| decided_at      | 承認日時 |

### POST /api/scope-violations/:id/reject

| バリデーション           | エラー   |
| ------------------------ | -------- |
| approved_statusがpending | CONFLICT |

| レスポンス      | 説明     |
| --------------- | -------- |
| approved_status | rejected |
| decided_at      | 却下日時 |

---

## 関連ドキュメント

- [API設計](./api.md) - 共通仕様とエンドポイント一覧
- [データモデル](./data-model.md) - runs/checks/scope_violationsのエンティティ定義
- [観測可能な事実](./observable-facts.md) - run.status/dod_statusの導出ルール
- [ログ保存](./log-storage.md) - log_ref/output_refの形式
