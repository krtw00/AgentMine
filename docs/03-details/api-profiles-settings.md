---
depends_on:
  - ./api.md
  - ./data-model.md
  - ./runner-adapter.md
tags: [details, api, runners, profiles, settings, monitor]
ai_summary: "Runner/Agent Profile/Settings/Monitor/Files/Events APIのリクエスト/レスポンス仕様を定義"
---

# API - Profiles / Settings / Others

> Status: Draft
> 最終更新: 2026-02-02

Runner/Agent Profile/Settings/Monitor/Files/EventsのAPI詳細仕様を定義する。共通仕様は[API設計](./api.md)を参照。

---

## Runners

### GET /api/runners

利用可能なrunner一覧とcapabilitiesを取得する。

| レスポンス                                  | 説明                 |
| ------------------------------------------- | -------------------- |
| name                                        | runner識別子         |
| display_name                                | 表示名               |
| capabilities.supports_model                 | モデル指定可否       |
| capabilities.supports_non_interactive       | 非対話実行可否       |
| capabilities.supports_prompt_file_inclusion | ファイル埋め込み可否 |
| capabilities.available_models               | 指定可能モデル一覧   |

---

## Agent Profiles

### GET /api/projects/:projectId/agent-profiles

| レスポンス                           | 説明               |
| ------------------------------------ | ------------------ |
| id, project_id, name, description    | 識別情報           |
| runner, model                        | 実行設定           |
| prompt_template                      | 役割指示           |
| default_exclude, default_write_scope | デフォルトスコープ |
| config                               | runner向け追加設定 |

### POST /api/projects/:projectId/agent-profiles

| リクエスト          | 必須 | 説明                                  |
| ------------------- | :--: | ------------------------------------- |
| name                |  ○   | 表示名（project内で一意）             |
| description         |  -   | 説明                                  |
| runner              |  ○   | runner名                              |
| model               |  -   | モデル名（supports_model=true時のみ） |
| prompt_template     |  -   | 役割指示                              |
| default_exclude     |  ○   | デフォルト除外（glob配列）            |
| default_write_scope |  -   | write_scope提案値                     |
| config              |  -   | runner向け追加設定                    |

| バリデーション                   | エラー           |
| -------------------------------- | ---------------- |
| runnerが存在する                 | VALIDATION_ERROR |
| model指定時、supports_model=true | VALIDATION_ERROR |
| nameがproject内で一意            | CONFLICT         |

### GET /api/agent-profiles/:id

レスポンスにrunner_capabilities（runnerのcapabilities）を含む。

### DELETE /api/agent-profiles/:id

| バリデーション                   | エラー   |
| -------------------------------- | -------- |
| running中のrunで使用されていない | CONFLICT |

---

## Settings

### GET /api/projects/:projectId/settings

| レスポンス           | 説明                           |
| -------------------- | ------------------------------ |
| scope.defaultExclude | Project共通exclude（glob配列） |
| dod.requiredChecks   | 必須チェック定義配列           |

dod.requiredChecksの各要素：

| フィールド  | 説明                 |
| ----------- | -------------------- |
| check_key   | チェック識別子       |
| label       | UI表示名             |
| command     | 実行コマンド         |
| timeout_sec | タイムアウト（任意） |
| required    | 必須フラグ           |

### PATCH /api/projects/:projectId/settings

指定したキーのみ更新する。変更は以降のrunに適用される。

| バリデーション                                      | エラー           |
| --------------------------------------------------- | ---------------- |
| dod.requiredChecksの各要素にcheck_key/label/command | VALIDATION_ERROR |
| check_keyがProject内で一意                          | VALIDATION_ERROR |

---

## Monitor

### GET /api/projects/:projectId/monitor

モニター画面用の集約データを取得する。

| クエリパラメータ | 説明                    |
| ---------------- | ----------------------- |
| status           | runのstatusでフィルタ   |
| task_id          | taskでフィルタ          |
| agent_profile_id | agent_profileでフィルタ |
| since            | 指定時刻以降のrunのみ   |

| レスポンス | 説明                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| summary    | 集計情報（total_tasks, running_runs, needs_review_tasks, failed_tasks） |
| tasks      | Task配列（children含む、各Taskにruns配列を含む）                        |
| overview   | 時間分布（time_range, activity配列）                                    |

---

## Files

### GET /api/projects/:projectId/files

ファイルツリーを取得する（write_scope選択UI用）。

| クエリパラメータ | デフォルト | 説明                         |
| ---------------- | ---------- | ---------------------------- |
| path             | .          | 起点ディレクトリ（相対パス） |
| depth            | 2          | 展開する深さ                 |

| レスポンス | 説明                                 |
| ---------- | ------------------------------------ |
| path       | ファイル/ディレクトリパス            |
| type       | file/directory                       |
| children   | 子要素配列（nullは未展開を意味する） |

---

## Events（SSE）

### GET /api/events

SSEでイベントを受信する。

| クエリパラメータ | 説明                          |
| ---------------- | ----------------------------- |
| project_id       | フィルタ（省略時は全project） |

イベント形式とイベント種別の詳細は[イベント配信](./event-stream.md)を参照。

---

## 関連ドキュメント

- [API設計](./api.md) - 共通仕様とエンドポイント一覧
- [データモデル](./data-model.md) - agent_profiles/settingsのエンティティ定義
- [RunnerAdapter](./runner-adapter.md) - capabilities定義
- [イベント配信](./event-stream.md) - SSEイベント種別
- [Agent Profiles](./agent-profiles.md) - プロファイルの概念と用途
- [Project設定](./settings.md) - 設定キーの詳細
