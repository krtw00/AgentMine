# Parallel Execution

Orchestrator/Workerモデルによる並列タスク実行。

## 概要

Orchestrator（メインAI）が複数のWorker（サブエージェント）を並列で実行する。
並列実験は `session_group_id` でグルーピングして比較可能にする。
agentmineは `worker run` でworktree作成・スコープ適用・Worker起動を担当し、
Orchestratorは並列計画・監視・マージ判断を担当する。

## Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI as Orchestrator                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  agentmineは並列実行を「計画」しない。                            │
│  Orchestratorが「計画」し、agentmineは実行基盤を提供する。        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Orchestrator（AIクライアント）の責務:                            │
│  - 並列実行の計画（何を並列にするか）                             │
│  - `agentmine worker run --exec --detach` の実行                  │
│  - 進捗監視（worker status / wait）                              │
│  - 結果マージ（コンフリクト解決、マージ実行）                     │
│  - PR作成                                                        │
├─────────────────────────────────────────────────────────────────┤
│  agentmineの責務:                                                 │
│  - worktree作成/削除（git worktreeを内部実行）                     │
│  - スコープ適用（sparse-checkout + chmod）                        │
│  - Worker起動/プロンプト生成（worker run/prompt）                 │
│  - セッション記録（exit code, artifacts等）                       │
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
│  │  2. agentmine worker run --exec --detach                       │ │
│  │     (worktree作成 + scope適用 + session開始)                    │ │
│  │  3. 完了待ち（worker wait / status）                            │ │
│  │  4. マージ判断・実行（Orchestratorが決定）                       │ │
│  │  5. PR作成                                                       │ │
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
 │  2. Worker起動（並列）            │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker run 3 --exec --detach                      │
 │  agentmine worker run 4 --exec --detach                      │
 │  agentmine worker run 5 --exec --detach                      │
 │  (worktree作成 + scope適用 + session開始)                    │
 │                                   │  git worktree add ...     │
 │                                   │  git sparse-checkout ...  │
 │                                   │                     (作業)│
 │                                   │                           │
 │  3. Worker完了待ち                │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker wait 3 4 5      │                           │
 │                                   │                           │
 │  4. 完了処理                       │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker done 3          │                           │
 │  agentmine worker done 4          │                           │
 │  agentmine worker done 5          │                           │
 │                                   │                           │
 │  5. マージ判断・実行（Orchestrator判断）                     │
 │ ────────────────────────────────────────────────────────────>│
│  git merge task-3-s101 (成功時)     │                           │
 │                                   │                           │
```

## Worktree + スコープ制御

### sparse-checkoutによるスコープ適用

`agentmine worker run` が内部でgitを使ってworktree作成・スコープ適用を行う（実装例）：

```bash
# agentmine が内部で実行

# 1. worktree作成
git worktree add .agentmine/worktrees/task-3 -b task-3-s123

# 2. sparse-checkout有効化
cd .agentmine/worktrees/task-3
git sparse-checkout init --cone

# 3. スコープ適用（エージェント定義に基づく）
# exclude→read→write の優先順位で評価
git sparse-checkout set src/ tests/ docs/ package.json
# excludeパターン（.env, secrets/等）は自動的に除外

# 4. AIクライアント設定を配置
cp -r ~/.agentmine/client-configs/claude-code/ .agentmine/worktrees/task-3/.claude/
# promptContentを CLAUDE.md に変換
```

### スコープ定義

```yaml
# coder.yaml (agent snapshot)
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
.agentmine/worktrees/
├── task-3/                     # タスク#3用（Worker 1）
│   ├── .claude/                # Claude Code設定
│   │   ├── settings.json
│   │   └── CLAUDE.md           # promptContentから生成
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
baseBranch (例: develop) ────── 統合ブランチ（settingsで必須指定）
  │
  ├── task-3-s101                # Worker 1
  │     └── (並列実行中)
  │
  ├── task-4-s102                # Worker 2
  │     └── (並列実行中)
  │
  └── task-5-s103                # Worker 3
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
│  タスク状態は観測可能な事実（セッション状態・マージ状態）で自動判定。│
│                                                                     │
│  【Orchestratorの責務】                                              │
│  1. Worker正常終了後、DoD検証（lint/test/build）を実行              │
│  2. DoD合格 → baseBranchにマージ                                    │
│  3. コンフリクト発生 → Orchestratorが解決                           │
│  4. マージ成功 → タスクは自動的に done 判定                          │
│  5. マージ失敗/DoD不合格 → 再試行 or failed                         │
│                                                                     │
│  【done判定】                                                        │
│  git log --oneline baseBranch..task-branch が空                    │
│  = ブランチがbaseBranchにマージされた                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** `baseBranch` は settings で必須指定。

## 隔離レベル

### Level 1: Git Worktree（デフォルト）

軽量な隔離。同一マシン上で複数ディレクトリ。

```
/project/
├── .git/                    # 共有Git
├── main/                    # Orchestratorの作業ディレクトリ
├── .agentmine/worktrees/
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
# settings snapshot (import/export)
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
# セッション開始（手動運用時のみ）
agentmine session start <task-id> --agent <name> --group exp-202501

# セッション終了（Worker終了後）
agentmine session end <session-id> \
  --exit-code 0 \
  --dod-result merged \
  --artifacts '["src/auth.ts", "tests/auth.test.ts"]'
```

### Workerプロンプト生成（Orchestrator向け）

```bash
# Worker起動用のプロンプトを生成
agentmine worker prompt <task-id> --agent coder
```

### Worktree管理

```
worktreeは `agentmine worker run` が作成し、`worker done` / `worker cleanup` が削除する。

# 例: 並列起動
agentmine worker run 3 --exec --detach
agentmine worker run 4 --exec --detach
agentmine worker run 5 --exec --detach

# 例: クリーンアップ
agentmine worker cleanup 3
```

**Note:** Worker向けコマンドは存在しない（Workerはagentmineにアクセスしない）。

## 設定

```yaml
# settings snapshot (import/export)
execution:
  parallel:
    enabled: true
    maxWorkers: 4              # 同時実行数上限
    worktree:
      path: ".agentmine/worktrees/"      # worktree配置先
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
3. 各タスクを並列起動（worktree作成 + session開始）:
   - agentmine worker run 3 --exec --detach
   - agentmine worker run 4 --exec --detach
   - agentmine worker run 5 --exec --detach
4. 全Worker終了を待つ（worker wait / status）
5. 各worktreeでDoD検証（lint, test, build）
6. DoD合格 → baseBranchにマージ
   - git merge task-3-s101
7. マージ成功 → worker done
   - agentmine worker done 3
   - agentmine worker done 4
   - agentmine worker done 5
```

**Note:** 上記はOrchestratorの実装方針であり、agentmineが制御するものではない。

## References

- [Architecture](../architecture.md)
- [Agent Execution](./agent-execution.md)
- [Agent System](./agent-system.md)
