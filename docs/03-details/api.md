---
depends_on:
  - ../02-architecture/structure.md
  - ./data-model.md
  - ./event-stream.md
tags: [details, api, endpoints, rest]
ai_summary: "API概要・共通仕様・エンドポイント一覧を定義"
---

# API設計

> Status: Draft
> 最終更新: 2026-02-02

Web UIとDaemon間のAPI仕様を定義する。

---

## API概要

| 項目           | 内容                          |
| -------------- | ----------------------------- |
| 目的           | Web UIとDaemon間の統一層      |
| ベースURL      | `http://127.0.0.1:{port}`     |
| 認証方式       | なし（MVP: ローカル一人運用） |
| リクエスト形式 | JSON                          |
| レスポンス形式 | JSON                          |

注: Web UIはAPIを相対パス（`/api/...`）で参照する。

---

## HTTPメソッド

| メソッド | 用途                           |
| -------- | ------------------------------ |
| GET      | リソースの取得                 |
| POST     | リソースの作成、アクション実行 |
| PATCH    | リソースの部分更新             |
| DELETE   | リソースの削除                 |

---

## レスポンス形式

### 成功時

| パターン     | 形式                                     |
| ------------ | ---------------------------------------- |
| 単一リソース | `{ "data": {...} }`                      |
| 一覧         | `{ "data": [...], "pagination": {...} }` |
| アクション   | `{ "data": {...}, "message": "..." }`    |

### エラー時

| フィールド    | 内容             |
| ------------- | ---------------- |
| error.code    | エラーコード     |
| error.message | エラーメッセージ |
| error.details | 詳細情報（任意） |

---

## エラーコード

| code                | HTTP | 説明                     |
| ------------------- | ---- | ------------------------ |
| VALIDATION_ERROR    | 400  | 入力バリデーションエラー |
| NOT_FOUND           | 404  | リソースが存在しない     |
| CONFLICT            | 409  | 状態の競合               |
| PRECONDITION_FAILED | 412  | 前提条件を満たさない     |
| INTERNAL_ERROR      | 500  | サーバー内部エラー       |

---

## ページネーション

一覧APIで使用する。

| パラメータ | デフォルト | 説明                |
| ---------- | ---------- | ------------------- |
| limit      | 20         | 取得件数（最大100） |
| offset     | 0          | スキップ件数        |

レスポンスの`pagination`オブジェクトに`total`、`has_more`を含む。

---

## エンドポイント一覧

### Projects / Tasks

| エンドポイント                   | メソッド         | 説明           |
| -------------------------------- | ---------------- | -------------- |
| `/api/projects`                  | GET              | Project一覧    |
| `/api/projects`                  | POST             | Project登録    |
| `/api/projects/:id`              | GET/PATCH/DELETE | Project操作    |
| `/api/projects/:projectId/tasks` | GET/POST         | Task一覧/作成  |
| `/api/tasks/:id`                 | GET/PATCH        | Task詳細/更新  |
| `/api/tasks/:id/cancel`          | POST             | Taskキャンセル |
| `/api/tasks/:id/dependencies`    | POST/DELETE      | 依存操作       |

詳細は[API - Projects/Tasks](./api-projects-tasks.md)を参照。

### Runs / Checks / Violations

| エンドポイント                      | メソッド | 説明         |
| ----------------------------------- | -------- | ------------ |
| `/api/tasks/:taskId/runs`           | GET/POST | Run一覧/開始 |
| `/api/runs/:id`                     | GET      | Run詳細      |
| `/api/runs/:id/stop`                | POST     | Run停止      |
| `/api/runs/:id/retry`               | POST     | Retry        |
| `/api/runs/:id/continue`            | POST     | Continue     |
| `/api/runs/:id/log`                 | GET      | Runログ      |
| `/api/runs/:runId/checks`           | GET      | Check一覧    |
| `/api/runs/:runId/checks/rerun`     | POST     | Check再実行  |
| `/api/scope-violations/:id/approve` | POST     | 違反承認     |
| `/api/scope-violations/:id/reject`  | POST     | 違反却下     |

詳細は[API - Runs](./api-runs.md)を参照。

### Profiles / Settings / Others

| エンドポイント                            | メソッド         | 説明             |
| ----------------------------------------- | ---------------- | ---------------- |
| `/api/runners`                            | GET              | Runner一覧       |
| `/api/projects/:projectId/agent-profiles` | GET/POST         | Profile一覧/作成 |
| `/api/agent-profiles/:id`                 | GET/PATCH/DELETE | Profile操作      |
| `/api/projects/:projectId/settings`       | GET/PATCH        | 設定             |
| `/api/projects/:projectId/monitor`        | GET              | モニター集約     |
| `/api/projects/:projectId/files`          | GET              | ファイルツリー   |
| `/api/events`                             | GET              | SSEストリーム    |

詳細は[API - Profiles/Settings](./api-profiles-settings.md)を参照。

---

## 関連ドキュメント

- [API - Projects/Tasks](./api-projects-tasks.md) - Project/Task操作の詳細
- [API - Runs](./api-runs.md) - Run/Check/Violation操作の詳細
- [API - Profiles/Settings](./api-profiles-settings.md) - Profile/Settings/Monitor操作の詳細
- [データモデル](./data-model.md) - エンティティ定義
- [イベント配信](./event-stream.md) - SSEイベント種別
