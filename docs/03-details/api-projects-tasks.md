---
depends_on:
  - ./api.md
  - ./data-model.md
tags: [details, api, projects, tasks]
ai_summary: "Project/Task/Dependencies APIのリクエスト/レスポンス仕様を定義"
---

# API - Projects / Tasks

> Status: Draft
> 最終更新: 2026-02-02

Project/Task/DependenciesのAPI詳細仕様を定義する。共通仕様は[API設計](./api.md)を参照。

---

## Projects

### POST /api/projects

Projectを登録する。

| リクエスト  | 必須 | 型     | 説明                    |
| ----------- | :--: | ------ | ----------------------- |
| name        |  ○   | string | 表示名                  |
| repo_path   |  ○   | string | Gitリポジトリの絶対パス |
| base_branch |  ○   | string | 基準ブランチ            |

| バリデーション                 | エラー           |
| ------------------------------ | ---------------- |
| repo_pathがGitリポジトリである | VALIDATION_ERROR |
| base_branchが存在する          | VALIDATION_ERROR |

| レスポンス                   | 説明                 |
| ---------------------------- | -------------------- |
| id                           | 作成されたProject ID |
| name, repo_path, base_branch | 登録内容             |

### GET /api/projects/:id

| レスポンス                       | 説明        |
| -------------------------------- | ----------- |
| id, name, repo_path, base_branch | Project情報 |

### PATCH /api/projects/:id

指定フィールドのみ更新する。

| リクエスト  | 必須 | 説明         |
| ----------- | :--: | ------------ |
| name        |  -   | 表示名       |
| base_branch |  -   | 基準ブランチ |

### DELETE /api/projects/:id

Projectを削除する。関連Task/Run/worktreeは削除されない。

---

## Tasks

### GET /api/projects/:projectId/tasks

| クエリパラメータ | 説明                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| status           | フィルタ（open/blocked/ready/running/needs_review/done/failed/cancelled） |
| parent_id        | 親タスクでフィルタ（nullで最上位のみ）                                    |
| include_children | 子タスクを含める（デフォルト: true）                                      |

| レスポンス                      | 説明                                    |
| ------------------------------- | --------------------------------------- |
| id, project_id, parent_id       | Task識別情報                            |
| title, description, write_scope | Task内容                                |
| status, reasons                 | 観測事実から導出された状態              |
| children                        | 子タスク配列（include_children=true時） |

### POST /api/projects/:projectId/tasks

| リクエスト  | 必須 | 型        | 説明                     |
| ----------- | :--: | --------- | ------------------------ |
| title       |  ○   | string    | タスク名                 |
| description |  -   | string    | 詳細                     |
| write_scope |  ○   | string[]  | 編集可能範囲（glob配列） |
| parent_id   |  -   | integer   | 親タスクID               |
| depends_on  |  -   | integer[] | 依存タスクID配列         |

| バリデーション            | エラー           |
| ------------------------- | ---------------- |
| write_scopeが1つ以上      | VALIDATION_ERROR |
| parent_idが同一project内  | VALIDATION_ERROR |
| depends_onが同一project内 | VALIDATION_ERROR |
| 循環依存がない            | VALIDATION_ERROR |

### GET /api/tasks/:id

| レスポンス | 説明                                                       |
| ---------- | ---------------------------------------------------------- |
| 基本情報   | id, project_id, parent_id, title, description, write_scope |
| 状態       | status, reasons, cancelled_at                              |
| 依存       | dependencies配列（task_id, title, status）                 |
| 最新run    | latest_run（id, status, started_at, finished_at）          |

### PATCH /api/tasks/:id

| リクエスト  | 必須 | 説明         |
| ----------- | :--: | ------------ |
| title       |  -   | タスク名     |
| description |  -   | 詳細         |
| write_scope |  -   | 編集可能範囲 |

注: running中のタスクのwrite_scope変更は次回run開始時に反映される。

### POST /api/tasks/:id/cancel

Taskをキャンセルする。running中のrunがあれば同時に停止する。

| バリデーション           | エラー   |
| ------------------------ | -------- |
| 既にdone/cancelledでない | CONFLICT |

| レスポンス   | 説明           |
| ------------ | -------------- |
| status       | cancelled      |
| cancelled_at | キャンセル日時 |

---

## Task Dependencies

### POST /api/tasks/:id/dependencies

| リクエスト         | 必須 | 説明           |
| ------------------ | :--: | -------------- |
| depends_on_task_id |  ○   | 依存先タスクID |

| バリデーション        | エラー           |
| --------------------- | ---------------- |
| 同一project内のタスク | VALIDATION_ERROR |
| 循環依存がない        | VALIDATION_ERROR |
| 重複していない        | CONFLICT         |

### DELETE /api/tasks/:id/dependencies/:dependsOnId

依存を削除する。レスポンスは204 No Content。

---

## 関連ドキュメント

- [API設計](./api.md) - 共通仕様とエンドポイント一覧
- [データモデル](./data-model.md) - projects/tasks/task_dependenciesのエンティティ定義
- [観測可能な事実](./observable-facts.md) - task.statusの導出ルール
