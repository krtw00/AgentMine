---
depends_on:
  - ./data-model.md
  - ./flows.md
  - ./observable-facts.md
  - ./scope-control.md
tags: [details, business-rules, invariants, concurrency]
ai_summary: "Project/Task/Run/Worktreeの業務ルール（不変条件・同時実行制約・再実行の意味）を定義"
---

# 業務ルール（Business Rules）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、AgentMineの中核エンティティに対する業務ルール（不変条件）を定義する。
ここでのルールは、実装が変わっても保持すべき「約束事」である。

---

## 基本方針

- DBが状態のSSoTである。UI表示は事実から導出する。
- runは履歴であり、既存runの書き換えではなく「追加」を基本とする。
- 「判断」はHuman Userが担い、Runnerは実行主体に徹する。

---

## 不変条件（Invariants）

### Project

| ルール                 | 意味                               |
| ---------------------- | ---------------------------------- |
| 1 Project = 1 Git repo | `repo_path`をProjectの同一性とする |
| baseブランチ必須       | done判定の基準を必ず持つ           |

### Task

| ルール                      | 意味                                    |
| --------------------------- | --------------------------------------- |
| Taskは必ずProjectに属する   | `project_id`が必須である                |
| 依存は閉路を作らない        | task_dependenciesは循環参照を許容しない |
| write_scope未設定は実行不可 | 実行前に作業範囲の合意が必要である      |

### Run

| ルール                    | 意味                                |
| ------------------------- | ----------------------------------- |
| runはTaskに属する         | `task_id`が必須である               |
| runは追記で増える         | retry/continueは「新run」を追加する |
| runは必ずworktreeを持つ   | 実行コンテキストの同一性を固定する  |
| runはscope snapshotを持つ | 実行時点の有効範囲を再現可能にする  |

---

## 同時実行制約（MVP）

| 制約              | 方針     | 理由                             |
| ----------------- | -------- | -------------------------------- |
| 同一Taskの同時run | 禁止する | 同一worktreeを共有し衝突するため |
| 複数Taskの同時run | 許容する | タスク間の独立性を活かすため     |

注:

- 同一Taskでrun開始要求が重なった場合、Daemonは開始要求を拒否する（stopを先に要求させる）。

---

## retry / continue の意味（MVP）

retry/continueはどちらも「新runを追加する」操作である。
差は「新runに付与する入力の意図」である。

| 操作     | 意図             | 期待する入力                       |
| -------- | ---------------- | ---------------------------------- |
| retry    | 同条件での再試行 | 直前runの失敗要因や未解決点の要約  |
| continue | 追加指示で継続   | retryの入力 + Human Userの追加入力 |

注:

- 入力の実体（runnerに渡すprompt）はRunnerAdapterの責務であり、runログ等に追跡可能な形で残す。

---

## 状態の扱い（派生状態）

Task/Runの状態は、事実から導出する。
状態導出の規則は[観測可能な事実](./observable-facts.md)（派生状態ルール）に従う。

---

## 関連ドキュメント

- [データモデル](./data-model.md) - エンティティと関係
- [主要フロー](./flows.md) - 典型操作（開始/停止/retry/continue）
- [観測可能な事実](./observable-facts.md) - 状態導出ルール
- [スコープ制御](./scope-control.md) - write_scopeと違反の扱い
