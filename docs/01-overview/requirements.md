---
depends_on:
  - ./summary.md
  - ./scope.md
  - ../02-architecture/principles.md
tags: [overview, requirements]
ai_summary: "MVPの機能要件（Project/Task/Run/スコープ/DoD/可視化）を定義"
---

# 機能要件

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、MVPの機能要件を定義する。
要件はローカル一人運用を前提とする。

---

## Project管理

|      # | 要件             | 説明                                           | 優先度 |
| -----: | ---------------- | ---------------------------------------------- | :----: |
| FR-001 | Project登録      | ローカルGitリポジトリをProjectとして登録できる |  MUST  |
| FR-002 | Project切替      | Web UIでProjectを切り替えられる                |  MUST  |
| FR-003 | baseブランチ管理 | Projectごとにbaseブランチを設定できる          |  MUST  |

---

## Task管理

|      # | 要件            | 説明                                      | 優先度 |
| -----: | --------------- | ----------------------------------------- | :----: |
| FR-010 | Task作成        | title/descriptionを登録できる             |  MUST  |
| FR-011 | 親子Task        | 親子関係を表現できる                      | SHOULD |
| FR-012 | 依存関係        | Task間依存（blocked_by）を表現できる      |  MUST  |
| FR-013 | write_scope必須 | Taskのwrite_scopeが未設定なら実行できない |  MUST  |
| FR-014 | 派生状態        | Task状態を事実から導出して表示できる      |  MUST  |

---

## run管理（実行）

|      # | 要件      | 説明                               | 優先度 |
| -----: | --------- | ---------------------------------- | :----: |
| FR-020 | run開始   | agent profileを選びrunを開始できる |  MUST  |
| FR-021 | stop      | 実行中runを停止できる              |  MUST  |
| FR-022 | retry     | 同一Taskに新しいrunを追加できる    |  MUST  |
| FR-023 | continue  | 同一Taskに新しいrunを追加できる    |  MUST  |
| FR-024 | ログ表示  | runのstdout/stderrを閲覧できる     |  MUST  |
| FR-025 | マルチrun | 1つのTaskに複数runを保持できる     |  MUST  |

注:

- continue/retryは同一runへの追加入力ではない（→ADR）。

---

## worktree管理

|      # | 要件           | 説明                                    | 優先度 |
| -----: | -------------- | --------------------------------------- | :----: |
| FR-030 | worktree作成   | Taskごとにブランチ+worktreeを作成できる |  MUST  |
| FR-031 | worktree再利用 | 同一Taskのrunは同じworktreeを使う       |  MUST  |
| FR-032 | worktree位置   | worktreeはAgentMine Home配下に作る      |  MUST  |

---

## スコープ制御

|      # | 要件           | 説明                            | 優先度 |
| -----: | -------------- | ------------------------------- | :----: |
| FR-040 | exclude適用    | excludeをworktreeから除外できる |  MUST  |
| FR-041 | read-only適用  | write以外をread-only化できる    |  MUST  |
| FR-042 | 違反検出       | write外変更を検出し記録できる   |  MUST  |
| FR-043 | 承認/却下      | 違反を承認/却下できる           |  MUST  |
| FR-044 | scope_snapshot | runに有効スコープを保存できる   |  MUST  |

---

## DoD（検証）

|      # | 要件     | 説明                                 | 優先度 |
| -----: | -------- | ------------------------------------ | :----: |
| FR-050 | DoD実行  | run後にDoDを実行できる               |  MUST  |
| FR-051 | 結果記録 | checksとして結果を保存できる         |  MUST  |
| FR-052 | done判定 | merge + DoD passedでdoneを導出できる |  MUST  |

---

## 可視化とイベント

|      # | 要件         | 説明                                  | 優先度 |
| -----: | ------------ | ------------------------------------- | :----: |
| FR-060 | SSE          | runログと状態変化をイベント配信できる |  MUST  |
| FR-061 | Task Monitor | Taskとrunの状況を一覧できる           |  MUST  |
| FR-062 | 承認待ち表示 | needs_reviewの理由を表示できる        |  MUST  |

---

## 関連ドキュメント

- [プロジェクト概要](./summary.md) - 1ページ概要
- [スコープ・対象外](./scope.md) - フェーズと対象外
- [設計原則](../02-architecture/principles.md) - 判断しない/DB正
- [主要フロー](../03-details/flows.md) - run開始と介入
