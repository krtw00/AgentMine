---
depends_on:
  - ./ui-mvp.md
  - ./event-stream.md
  - ./observable-facts.md
  - ../02-architecture/role-model.md
tags: [details, ui, live-view, monitoring, autonomous]
ai_summary: "Task Live View（S006）の仕様。自律駆動AIの全Role監視、介入操作、リアルタイムストリーミングを定義"
---

# Task Live View（S006）

> Status: Draft
> 最終更新: 2026-02-02

1つのTask内で動作する全Roleの実行状況をリアルタイム監視する画面を定義する。

---

## 目的

| 項目   | 内容                                               |
| ------ | -------------------------------------------------- |
| 監視   | 自律駆動AIの各Roleの進行を一覧で確認する           |
| 介入   | 異常時にHumanが停止/指示/承認を行う                |
| 透明性 | Roleごとのログ出力をライブストリーミングで表示する |

---

## ルーティング

| route                              | 画面           |
| ---------------------------------- | -------------- |
| `/p/:projectId/tasks/:taskId/live` | Task Live View |

MonitorのRun一覧から「Live」ボタンで遷移する。

---

## 自律駆動モデル

AIが自律的にTaskを処理し、Humanは監視と介入のみ行う。

| Role         | 起動                 | 説明                   |
| ------------ | -------------------- | ---------------------- |
| Orchestrator | Task開始時に自動起動 | Taskの全体管理         |
| Planner      | Orchestratorが起動   | 計画・サブタスク分解   |
| Supervisor   | Plannerが起動        | Workerの進捗管理       |
| Worker       | Supervisorが起動     | 実作業（コード生成等） |
| Reviewer     | Workerが起動         | 成果物レビュー         |

注:

- 各Roleは前段Roleが起動する（起動連鎖）。
- Humanは基本的に介入しない。異常時のみ操作する。

---

## 画面構成

### ヘッダー

| 表示           | 内容                                  |
| -------------- | ------------------------------------- |
| Task情報       | title、description                    |
| 全体ステータス | running/needs_review/completed/failed |
| Autoバッジ     | 自律駆動中は「Auto」を表示する        |

### Role Flow Timeline

| 表示         | 内容                                                    |
| ------------ | ------------------------------------------------------- |
| フロー図     | Orchestrator → Planner → Supervisor → Worker → Reviewer |
| 各Roleの状態 | pending/running/completed/failed（色分け）              |
| 現在位置     | running中のRoleをハイライトする                         |

### Role Panes

5つのRoleを縦に並べたペイン構成。各ペインは折りたたみ可能。

| 表示       | 内容                                            |
| ---------- | ----------------------------------------------- |
| Role名     | Orchestrator/Planner/Supervisor/Worker/Reviewer |
| ステータス | pending/running/completed/failed                |
| 出力       | ライブストリーミング（stdout/stderr）           |
| 要約       | 完了時は結果サマリーを表示する                  |

注:

- running中のRoleは自動展開する。
- completed/failedは折りたたみ状態とする。
- 各ペインはtmux風の分割表示を意識する。

### Summary Section

| 表示       | 内容                                      |
| ---------- | ----------------------------------------- |
| DoD        | チェック結果一覧（passed/failed/pending） |
| Violations | scope violation一覧と承認状態             |
| Subtasks   | サブタスク進捗（Plannerが分解した場合）   |

### Alert Banner

| 条件            | 表示                                       |
| --------------- | ------------------------------------------ |
| needs_review    | 「Human介入が必要です」バナーを表示する    |
| failed          | 「Roleが失敗しました」バナーを表示する     |
| scope_violation | 「スコープ違反があります」バナーを表示する |

---

## 操作

| 操作     | 対象                  | 説明                   |
| -------- | --------------------- | ---------------------- |
| Stop     | running中のRole       | 実行中のRoleを停止する |
| Continue | failed/completed Role | 追加指示付きで再開する |
| Approve  | scope_violation       | 違反を承認する         |
| Reject   | scope_violation       | 違反を却下する         |
| Escalate | 任意のRole            | 上位Roleに差し戻す     |

---

## SSEイベント対応

| イベント                | 対応                                              |
| ----------------------- | ------------------------------------------------- |
| run.started             | 該当RoleのペインをrunningにしOutputストリーム開始 |
| run.output              | Outputに追記する                                  |
| run.finished            | 該当Roleのステータス更新、要約表示                |
| check.updated           | DoDセクション更新                                 |
| scope_violation.created | Violationsセクション追加、Alert表示               |

---

## Monitor画面との連携

Monitor（S001）に以下を追加する。

| 追加項目   | 内容                                       |
| ---------- | ------------------------------------------ |
| Liveボタン | Task Live Viewへの遷移ボタン               |
| Autoバッジ | 自律駆動中のTaskに「Auto」バッジを表示する |

---

## 関連ドキュメント

- [UI仕様（MVP）](./ui-mvp.md) - 全画面一覧
- [役割モデル](../02-architecture/role-model.md) - 5層Role定義
- [イベント配信](./event-stream.md) - SSEイベント
- [観測可能な事実](./observable-facts.md) - 状態導出
