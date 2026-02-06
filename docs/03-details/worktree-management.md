---
depends_on:
  - ../04-decisions/0004-agentmine-home-dir.md
  - ./data-model.md
  - ./scope-control.md
  - ./business-rules.md
  - ./definition-of-done.md
tags: [details, git, worktree, branches, lifecycle]
ai_summary: "Task単位のworktree/ブランチ運用（命名、作成・再利用・削除、dirty扱い、記録するGit事実）を定義"
---

# worktree管理

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、Task単位で作成するGit worktreeの運用ルールを定義する。
worktreeはrunの実行コンテキストであり、再現性と安全性の基盤である。

---

## 目的

- 同一リポジトリ上でタスクを並列に進められる状態を作る。
- runの実行ディレクトリを固定し、ログや事実の参照点を一貫させる。
- スコープ制御（exclude/read/write）を物理的に適用できる前提を作る。

---

## 基本方針（MVP）

| 項目     | 方針                                   |
| -------- | -------------------------------------- |
| 単位     | **1 Task = 1 worktree**                |
| 再利用   | 同一Taskのrunは同じworktreeを使う      |
| 並列     | 同一Taskの同時runは禁止（→業務ルール） |
| 自動削除 | しない（明示操作のみ）                 |

---

## 命名規則（MVP）

### worktreeパス

worktreeはAgentMine Home配下に配置する。

| 項目   | 形式                                                  |
| ------ | ----------------------------------------------------- |
| ルート | `~/.agentmine/worktrees/`                             |
| 位置   | `~/.agentmine/worktrees/{project_id}/task-{task_id}/` |

注:

- 複数プロジェクトを同一PCで扱うため、`project_id`で分ける。

### タスクブランチ名

タスク作業ブランチは以下の形式で作成する。

| 項目       | 形式                       |
| ---------- | -------------------------- |
| ブランチ名 | `agentmine/task-{task_id}` |

注:

- ブランチ名はworktreeの同一性と監査のための識別子である。
- 既存ブランチと衝突する場合の扱いは将来拡張とする（MVPでは衝突をエラーとする）。

---

## ライフサイクル

### 作成（初回run）

初回run開始時に、Daemonは以下を行う。

1. Projectの`repo_path`に対してworktreeを作成する。
2. baseブランチの先端からタスクブランチを作成する。
3. worktreeディレクトリにチェックアウトする。

注:

- baseブランチの更新（fetch/rebase等）はMVPでは自動化しない。

### 再利用（2回目以降のrun）

同一Taskでworktreeが存在する場合、Daemonはそれを再利用する。
worktreeが欠損している場合は再作成する。

### 削除（明示操作）

worktree削除は明示操作でのみ行う。
削除は「ディレクトリ削除」と「git worktree解除」を含む。

注:

- worktree削除は破壊的であるため、dirtyな場合はMVPでもUIで強い確認を要求する。

---

## dirty（未コミット変更）の扱い

MVPでは、dirtyなworktreeでrunを開始することを許容する。
ただし、dirtyは再現性を下げるため、観測可能な事実として記録し、UIで明示する。

| 局面      | 方針                                                          |
| --------- | ------------------------------------------------------------- |
| run開始時 | dirtyでも開始可能（continue/retryの実用性を優先）             |
| run終了時 | dirty 여부を記録する（→データモデル）                         |
| done判定  | dirtyなrunはdone判定の根拠に使用しない（→DoD/観測可能な事実） |

注:

- dirtyな状態でのDoD実行は許容するが、done根拠には使用しない。

---

## 記録するGit事実（MVP）

Daemonはrunの終了時点で以下のGit事実を記録する。

| 事実             | 記録先              | 用途                         |
| ---------------- | ------------------- | ---------------------------- |
| `head_sha`       | runs.head_sha       | DoDとマージ判定の参照点      |
| `worktree_dirty` | runs.worktree_dirty | done判定からの除外、介入理由 |

注:

- 変更ファイル一覧やdiffはログ（meta）として残すことを許容する（必要時のみ）。

---

## 関連ドキュメント

- [データモデル](./data-model.md) - worktree_path/branch_name/head_sha/worktree_dirty
- [スコープ制御](./scope-control.md) - worktree上への物理制約
- [業務ルール](./business-rules.md) - 同一Task同時run禁止
- [DoD（Definition of Done）](./definition-of-done.md) - dirty runをdone根拠にしない
- [ADR-0004](../04-decisions/0004-agentmine-home-dir.md) - `~/.agentmine`
