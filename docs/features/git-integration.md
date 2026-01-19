# Git Integration

Git操作とPR連携の設計。

## 概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                      責務分担                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Worker:  コード作成、コミット（作業記録）                          │
│  Orchestrator:     ブランチ管理、push、PR作成、タスク状態管理                │
│                                                                     │
│  Workerは成果物の作成に集中                                         │
│  Git操作のインフラ部分は Orchestrator が担当                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** agentmineはworktreeコマンドを提供しない。Orchestratorがgitを直接使用してworktree作成・削除・Git操作（push, PR作成等）を実行する。

## ブランチ戦略

### 構成

```
main ──────────────────── 本番（人間のみマージ）
  │
develop ───────────────── 統合ブランチ（エージェントのPR先）
  │
  └─┬──┬──┬───────────── task-{id} ブランチ
    │  │  │
  task-1 task-2 task-3
```

### ルール

| ブランチ | 誰がマージ | PR先 |
|----------|-----------|------|
| main | 人間のみ | - |
| develop | 人間（PRレビュー後） | main |
| task-{id} | Orchestrator（検証後） | develop |

### 安全性

```
Workerが誤って main に push しても:
  → develop が緩衝帯となり本番に直接影響しない
  → develop → main は人間が判断

agentmine はWorkerのツールを制御できないため、
ブランチ構成で安全性を担保する
```

## タスク実行フロー

```
┌──────────────┐
│      Orchestrator      │
└──────┬───────┘
       │ 1. develop から task-{id} ブランチ作成
       │ 2. git worktree add でworktree作成
       │ 3. Worker起動（Task tool等）
       ▼
┌──────────────┐
│    Worker    │
│              │ 4. コード作成
│              │ 5. git add
│              │ 6. git commit（自由形式）
└──────┬───────┘
       │
       ▼
┌──────────────┐
│      Orchestrator      │
│              │ 7. 完了検知（exit code + merge状態）
│              │ 8. コミットメッセージ整形（Memory Bank 規約）
│              │ 9. git push origin task-{id}
│              │ 10. gh pr create --base develop
│              │ 11. PRマージ → タスク done
└──────────────┘
```

## コミット規約

### Workerのコミット

Workerは自由形式でコミット。規約を知る必要はない。

```bash
# Workerのコミット例
git commit -m "ログイン機能を追加した"
git commit -m "fixed bug"
```

### Orchestrator による整形

Orchestrator が Memory Bank から規約を取得し、コミットメッセージを整形。

```bash
# Memory Bank の規約
{
  category: 'convention',
  title: 'コミット規約',
  decision: 'Conventional Commits形式',
}

# 整形後
git commit --amend -m "feat(auth): ログイン機能を追加"
```

### 設定例

```yaml
# .agentmine/config.yaml
git:
  commitConvention:
    enabled: true
    format: conventional  # conventional | simple | custom
    # Memory Bank からも取得可能
```

## PR連携

### PR作成

Orchestrator が `gh pr create` を実行。

```bash
gh pr create \
  --base develop \
  --title "Task #{id}: {title}" \
  --body "..." \
  --label "{type}"
```

### テンプレート

PRテンプレートは agentmine で管理しない。

```
GitHub の機能を使用:
  .github/PULL_REQUEST_TEMPLATE.md

プロジェクトごとに異なるため、
各リポジトリで設定する
```

### ラベル自動付与

タスクの type に応じてラベルを付与。

| タスク type | PRラベル |
|-------------|----------|
| feature | enhancement |
| bug | bug |
| refactor | refactor |
| task | - |

### タスク状態連携

| イベント | タスク状態 |
|----------|-----------|
| Worker実行中 | in_progress |
| PRマージ | → done |
| PRクローズ | → open に戻す |
| Worker異常終了 | → failed |

**Note:** `review`, `blocked` ステータスは存在しない。ステータスはobservable facts（exit code, merge状態）で判定。

## コンフリクト対応

### 方針

```
コンフリクト検知 → セッションをfailed終了 → 人間に通知
自動解消はしない
```

### 理由

- 自動リベース/マージは意図しない変更のリスク
- コンフリクト解消は文脈理解が必要
- 人間の判断に委ねる方が安全

### フロー

```
Orchestrator: git push
    ↓
コンフリクト発生
    ↓
Orchestrator:
  1. agentmine session end --exit-code 1 --error '{"type":"conflict",...}'
  2. 人間に通知
    ↓
人間:
  1. 手動でコンフリクト解消
  2. Orchestratorが新セッションで再実行
```

## Worktree対応

### 方針

| 実行モード | Worktree |
|------------|----------|
| 並列実行 | **強制** |
| 単一実行 | 任意 |

### 理由

```
並列実行:
  同時に複数ブランチで作業する必要あり
  → Worktree なしでは物理的に不可能

単一実行:
  1つのブランチのみ
  → 通常のチェックアウトで十分
```

### ディレクトリ構成

```
project/
├── .git/                    # 共有
├── (メイン作業ディレクトリ)
│
└── .worktrees/              # 並列実行時
    ├── task-1/
    │   └── (task-1 ブランチの内容)
    ├── task-2/
    │   └── (task-2 ブランチの内容)
    └── task-3/
        └── (task-3 ブランチの内容)
```

### 設定

```yaml
# .agentmine/config.yaml
execution:
  parallel:
    enabled: true
    maxWorkers: 3
    worktree:
      path: .worktrees/  # Worktree の配置場所
      cleanup: true      # 完了後に自動削除
```

## Orchestratorの操作

agentmineはworktreeコマンドを提供しない。Orchestratorがgitを直接使用する。

```bash
# worktree作成（Orchestratorがgitを直接使用）
git branch task-42 develop
git worktree add --sparse .worktrees/task-42 task-42
git -C .worktrees/task-42 sparse-checkout set src/ tests/

# worktree削除
git worktree remove .worktrees/task-42

# セッション管理（agentmine経由）
agentmine session start 42 --agent coder
agentmine session end 123 --exit-code 0 --dod-result merged

# タスクステータスはobservable factsで自動判定
# 明示的なステータス更新は不要
```

**Note:** agentmineはデータ層のみ。Git操作（worktree, push, PR作成）はすべてOrchestratorが直接実行。

## References

- [Agent Execution](./agent-execution.md)
- [Memory Bank](./memory-bank.md)
- [Parallel Execution](./parallel-execution.md)
