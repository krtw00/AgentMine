# Parallel Execution

Orchestrator/Workerモデルによる並列タスク実行。

## 概要

Orchestrator（メインAI）が複数のWorker（サブエージェント）を起動し、並列でタスクを実行。
agentmineはWorktree管理とスコープ制御を提供するが、**Worker起動・監視はOrchestratorの責務**。

## Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI as Orchestrator                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  agentmineは並列実行を「制御」しない。                            │
│  Orchestratorが「計画・実行」し、agentmineはデータ層のみ提供。    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Orchestrator（AIクライアント）の責務:                            │
│  - 並列実行の計画（何を並列にするか）                             │
│  - Worktree作成・削除（git worktree直接使用）                     │
│  - スコープ適用（git sparse-checkout直接使用）                    │
│  - Worker起動（サブプロセスとしてexec mode起動）                  │
│  - 進捗監視（exit code/signal/タイムアウト判定）                  │
│  - 結果マージ（コンフリクト解決、マージ実行）                     │
│  - PR作成                                                        │
├─────────────────────────────────────────────────────────────────┤
│  agentmineの責務:                                                 │
│  - タスク状態管理                                                 │
│  - セッション記録（exit code, artifacts等）                       │
│  - Workerコマンド生成（プロンプト出力）                           │
│  - Memory Bank提供                                                │
│                                                                  │
│  ※ Workerはagentmineにアクセスしない                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Human (ユーザー)                                                    │
│    │ 「3つのタスクを並列で実行して」                                 │
│    ▼                                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Orchestrator (Claude Code等)                 │ │
│  │                                                                  │ │
│  │  1. タスク分析・計画                                             │ │
│  │  2. git worktree add（直接gitを使用）                           │ │
│  │  3. git sparse-checkout（スコープ適用）                         │ │
│  │  4. Worker起動（サブプロセス、exec mode）                       │ │
│  │  5. 完了待ち（exit code/signal監視）                            │ │
│  │  6. マージ判断・実行（Orchestratorが決定）                       │ │
│  │  7. PR作成                                                       │ │
│  └──────────────────────┬─────────────────────────────────────────┘ │
│                         │                                            │
│          ┌──────────────┼──────────────┐                            │
│          ▼              ▼              ▼                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│  │   Worker    │ │   Worker    │ │   Worker    │                   │
│  │  (Task #3)  │ │  (Task #4)  │ │  (Task #5)  │                   │
│  │             │ │             │ │             │                   │
│  │ worktree-3/ │ │ worktree-4/ │ │ worktree-5/ │                   │
│  │ scope適用済 │ │ scope適用済 │ │ scope適用済 │                   │
│  │             │ │             │ │             │                   │
│  │ ※agentmine │ │ ※agentmine │ │ ※agentmine │                   │
│  │   非使用    │ │   非使用    │ │   非使用    │                   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                   │
│         │              │              │                             │
│         └──────────────┴──────────────┘                             │
│                        │ (exit code / signal)                       │
│                        ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   agentmine (Blackboard)                        │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐                  │ │
│  │  │  Tasks   │  │ Sessions │  │ Memory Bank  │                  │ │
│  │  │  状態    │  │  履歴    │  │  決定事項    │                  │ │
│  │  └──────────┘  └──────────┘  └──────────────┘                  │ │
│  │                                                                  │ │
│  │  Orchestratorのみがアクセス（Workerは非使用）                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 実行フロー

### Orchestratorによる並列実行

```
Orchestrator                      agentmine                Git / Workers
 │                                  │                           │
 │  1. タスク取得                   │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine task list --json      │                           │
 │  (task #3, #4, #5 を取得)        │                           │
 │                                   │                           │
 │  2. worktree作成（git直接使用）  │                           │
 │ ────────────────────────────────────────────────────────────>│
 │  git worktree add .worktrees/task-3 -b task-3               │
 │  git worktree add .worktrees/task-4 -b task-4               │
 │  git worktree add .worktrees/task-5 -b task-5               │
 │                                   │                           │
 │  3. スコープ適用（sparse-checkout）                          │
 │ ────────────────────────────────────────────────────────────>│
 │  git -C .worktrees/task-3 sparse-checkout set ...           │
 │  git -C .worktrees/task-4 sparse-checkout set ...           │
 │  git -C .worktrees/task-5 sparse-checkout set ...           │
 │                                   │                           │
 │  4. セッション開始                │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine session start 3 --agent coder                    │
 │  agentmine session start 4 --agent coder                    │
 │  agentmine session start 5 --agent coder                    │
 │                                   │                           │
 │  5. Worker起動（サブプロセス、並列）                         │
 │ ────────────────────────────────────────────────────────────>│
 │  timeout 300 claude-code exec "$(agentmine worker command 3)"│
 │  timeout 300 claude-code exec "$(agentmine worker command 4)"│
 │  timeout 300 claude-code exec "$(agentmine worker command 5)"│
 │                                   │                           │
 │                                   │  ※ Workerはagentmineに   │
 │                                   │    アクセスしない         │
 │                                   │                     (作業)│
 │                                   │                           │
 │  6. Worker終了検知（exit code）   │                       exit│
 │<────────────────────────────────────────────────────────────  │
 │                                   │                           │
 │  7. セッション終了記録            │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine session end --exit-code ... --artifacts ...      │
 │                                   │                           │
 │  8. マージ判断・実行（Orchestrator判断）                     │
 │ ────────────────────────────────────────────────────────────>│
 │  git merge task-3 (成功時)        │                           │
 │  (コンフリクト解決はOrchestratorが実行)                      │
 │                                   │                           │
 │  9. タスクステータス更新          │                           │
 │ ─────────────────────────────────>│                           │
 │  (マージ済み → done)              │                           │
 │                                   │                           │
 │  10. worktree削除（git直接使用）  │                           │
 │ ────────────────────────────────────────────────────────────>│
 │  git worktree remove .worktrees/task-3                      │
 │                                   │                           │
```

## Worktree + スコープ制御

### sparse-checkoutによるスコープ適用

Orchestratorが直接gitコマンドでworktreeを作成・スコープを適用する：

```bash
# Orchestratorが直接実行

# 1. worktree作成
git worktree add .worktrees/task-3 -b task-3

# 2. sparse-checkout有効化
cd .worktrees/task-3
git sparse-checkout init --cone

# 3. スコープ適用（エージェント定義に基づく）
# exclude→read→write の優先順位で評価
git sparse-checkout set src/ tests/ docs/ package.json
# excludeパターン（.env, secrets/等）は自動的に除外

# 4. AIクライアント設定を配置
cp -r ~/.agentmine/client-configs/claude-code/ .worktrees/task-3/.claude/
# promptFile内容を CLAUDE.md に変換
```

### スコープ定義

```yaml
# .agentmine/agents/coder.yaml
name: coder
scope:
  # 優先順位: exclude → read → write
  exclude:                 # 最優先: sparse-checkoutで除外
    - "**/*.env"
    - "**/secrets/**"
  read:                    # 次に評価: 参照可能
    - "**/*"
  write:                   # 明示的に指定: 編集可能
    - "src/**"
    - "tests/**"
    - "package.json"
    # writeに明示的にマッチしないファイルはread-only
```

### スコープ優先順位

```
exclude → read → write

【exclude】最優先。マッチしたファイルはsparse-checkoutで除外
【read】  次に評価。マッチしたファイルは参照可能
【write】 明示的に指定されたファイルのみ編集可能

※ タスク分割時に編集対象を明確にするため、writeは明示的指定が必要
```

### Worktree構造

```
.worktrees/
├── task-3/                     # タスク#3用（Worker 1）
│   ├── .claude/                # Claude Code設定
│   │   ├── settings.json
│   │   └── CLAUDE.md           # promptFileから生成
│   ├── src/                    # write可能（スコープで指定）
│   ├── tests/                  # write可能（スコープで指定）
│   ├── docs/                   # read-only（writeに未指定）
│   └── package.json            # write可能（スコープで指定）
│   # .env, secrets/ は sparse-checkout で除外済み
│
├── task-4/                     # タスク#4用（Worker 2）
│   └── ...
│
└── task-5/                     # タスク#5用（Worker 3）
    └── ...
```

## ブランチ戦略

```
main ─────────────────────────── 本番（人間のみマージ）
  │
baseBranch (例: develop) ────── 統合ブランチ（config.yamlで必須指定）
  │
  ├── task-3-auth                # Worker 1
  │     └── (並列実行中)
  │
  ├── task-4-api                 # Worker 2
  │     └── (並列実行中)
  │
  └── task-5-dashboard           # Worker 3
        └── (並列実行中)
```

### マージ戦略

```
┌─────────────────────────────────────────────────────────────────────┐
│                    マージはOrchestratorが判断                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【agentmineの役割】                                                 │
│  マージしない。マージ判断はOrchestratorの責務。                     │
│  agentmineはマージ結果（done/in_progress）を記録するのみ。          │
│                                                                     │
│  【Orchestratorの責務】                                              │
│  1. Worker正常終了後、DoD検証（lint/test/build）を実行              │
│  2. DoD合格 → baseBranchにマージ                                    │
│  3. コンフリクト発生 → Orchestratorが解決                           │
│  4. マージ成功 → agentmine task update --status done                │
│  5. マージ失敗/DoD不合格 → 再試行 or failed                         │
│                                                                     │
│  【done判定】                                                        │
│  git log --oneline baseBranch..task-branch が空                    │
│  = ブランチがbaseBranchにマージされた                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** `baseBranch` は config.yaml で必須指定。

## 隔離レベル

### Level 1: Git Worktree（デフォルト）

軽量な隔離。同一マシン上で複数ディレクトリ。

```
/project/
├── .git/                    # 共有Git
├── main/                    # Orchestratorの作業ディレクトリ
├── .worktrees/
│   ├── task-3/             # Worker 1（スコープ適用済）
│   ├── task-4/             # Worker 2（スコープ適用済）
│   └── task-5/             # Worker 3（スコープ適用済）
```

**メリット:**
- セットアップが速い
- ディスク効率が良い
- スコープの物理的制御が可能

**デメリット:**
- 環境変数・プロセスは共有

### Level 2: Docker Container（将来）

完全な隔離。各WorkerをDockerコンテナで実行。

```yaml
# .agentmine/config.yaml
execution:
  parallel:
    isolation: docker
    docker:
      image: node:20
      memory: 4g
      cpu: 2
```

```
┌──────────────────────────────────────────────────────────────┐
│  Host                                                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Container      │  │   Container      │                 │
│  │   Task #3        │  │   Task #4        │                 │
│  │   ┌──────────┐   │  │   ┌──────────┐   │                 │
│  │   │ Worker   │   │  │   │ Worker   │   │                 │
│  │   └──────────┘   │  │   └──────────┘   │                 │
│  │   /workspace     │  │   /workspace     │                 │
│  │   (scope適用済)  │  │   (scope適用済)  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  Orchestrator (Host上で実行)                                           │
│    - コンテナ起動・監視                                       │
│    - 結果収集・マージ                                         │
└──────────────────────────────────────────────────────────────┘
```

## CLI（agentmine側）

### セッション管理（Orchestrator向け）

```bash
# セッション開始（Worker起動前）
agentmine session start <task-id> --agent <name>

# セッション終了（Worker終了後）
agentmine session end <session-id> \
  --exit-code 0 \
  --dod-result merged \
  --artifacts '["src/auth.ts", "tests/auth.test.ts"]'
```

### Workerコマンド生成（Orchestrator向け）

```bash
# Worker起動用のプロンプトを生成
agentmine worker command <task-id> --agent coder
```

### Worktree管理

```
agentmine にはworktreeコマンドがない。
Orchestratorが git worktree / git sparse-checkout を直接使用。

# 作成
git worktree add .worktrees/task-3 -b task-3
git -C .worktrees/task-3 sparse-checkout init --cone
git -C .worktrees/task-3 sparse-checkout set src/ tests/ docs/

# 削除
git worktree remove .worktrees/task-3
```

**Note:** Worker向けコマンドは存在しない（Workerはagentmineにアクセスしない）。

## 設定

```yaml
# .agentmine/config.yaml
execution:
  parallel:
    enabled: true
    maxWorkers: 4              # 同時実行数上限
    worktree:
      path: ".worktrees/"      # worktree配置先
      cleanup: true            # 完了後に自動削除
    isolation: worktree        # worktree | docker

    # Docker設定（isolation: docker時）
    docker:
      image: node:20
      memory: 4g
      cpu: 2
      networkMode: bridge
```

## Orchestratorの実装例（参考）

OrchestratorがClaude Codeの場合の並列実行イメージ:

```
Orchestrator (Claude Code) の思考:

1. ユーザーから「task #3, #4, #5を並列で」と依頼
2. agentmine task list --json でタスク情報取得
3. 各タスクについてworktree作成（git直接使用）:
   - git worktree add .worktrees/task-3 -b task-3
   - git -C .worktrees/task-3 sparse-checkout set src/ tests/
4. 各タスクについてセッション開始:
   - agentmine session start 3 --agent coder
5. サブプロセスで3つのWorkerを並列起動:
   - timeout 300 claude-code exec "$(agentmine worker command 3)"
   - timeout 300 claude-code exec "$(agentmine worker command 4)"
   - timeout 300 claude-code exec "$(agentmine worker command 5)"
6. 全Worker終了を待つ（exit code/signal監視）
7. 各worktreeでDoD検証（lint, test, build）
8. DoD合格 → baseBranchにマージ
   - git merge task-3
9. マージ成功 → agentmine task update 3 --status done
10. セッション終了記録:
    - agentmine session end <id> --exit-code 0 --dod-result merged
11. worktree削除:
    - git worktree remove .worktrees/task-3
```

**Note:** 上記はOrchestratorの実装方針であり、agentmineが制御するものではない。

## References

- [Architecture](../architecture.md)
- [Agent Execution](./agent-execution.md)
- [Agent System](./agent-system.md)
