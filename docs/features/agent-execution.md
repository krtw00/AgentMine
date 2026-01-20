# Agent Execution Flow

Orchestrator/Workerモデルによるタスク実行フロー。

## Design Philosophy

**AIがオーケストレーター**であり、agentmineはデータ層（Blackboard）として機能する。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Orchestrator/Worker Execution Model              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【設計方針】                                                        │
│  - AI as Orchestrator: Orchestrator（メインAI）がタスク分解・Worker管理│
│  - agentmine as Blackboard: データ層・状態管理のみ                  │
│  - Workerはagentmineにアクセスしない: タスク情報はプロンプトで渡す  │
│  - 客観判定: 観測可能な事実（exit code, マージ状態）で判定          │
│  - sparse-checkoutでスコープ制御: 物理削除ではなくgit機能を使用     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture

### Orchestrator/Worker モデル

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Human (ユーザー)                                                    │
│    │                                                                │
│    ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AI as Orchestrator (Claude Code, Codex等)                             │   │
│  │                                                               │   │
│  │  責務:                                                        │   │
│  │  - ユーザーとの会話                                           │   │
│  │  - タスク分解・計画                                           │   │
│  │  - Worker起動・監視                                           │   │
│  │  - 結果確認・マージ                                           │   │
│  │  - PR作成                                                     │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│          ┌──────────────────┼──────────────────┐                   │
│          ▼                  ▼                  ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   Worker    │    │   Worker    │    │   Worker    │            │
│  │  (Task #1)  │    │  (Task #2)  │    │  (Task #3)  │            │
│  │  worktree-1 │    │  worktree-2 │    │  worktree-3 │            │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│         │                  │                  │                    │
│         └──────────────────┴──────────────────┘                    │
│                            │                                        │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   agentmine (Blackboard)                      │   │
│  │                                                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │   │
│  │  │  Tasks   │  │ Sessions │  │ Agents   │  │  Memory Bank │ │   │
│  │  │  状態    │  │  履歴    │  │  定義    │  │  決定事項    │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### agentmineの責務

| 責務 | 内容 |
|------|------|
| タスク管理 | CRUD、ステータス遷移、親子関係 |
| エージェント定義 | DB読み込み、定義提供（YAMLは編集/インポート用） |
| セッション記録 | 実行履歴、成果物記録 |
| Memory Bank | プロジェクト決定事項の永続化 |
| Worker環境準備 | worktree作成・スコープ適用（`worker run`） |
| プロンプト生成 | `worker run` / `worker prompt` |

### Orchestratorの責務（agentmine外）

| 責務 | 内容 |
|------|------|
| タスク分解 | PRDやユーザー指示からタスク生成 |
| Worker起動 | `agentmine worker run --exec` を実行 |
| 進捗監視 | Worker状態の確認（exit code, signal） |
| 結果マージ | ブランチのマージ、コンフリクト解決 |
| PR作成 | 完了タスクのPR作成 |

## Execution Flow

### 1. タスク作成〜Worker起動

```
Orchestrator                    agentmine                      Git
 │                                  │                           │
 │  1. タスク作成                    │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine task add "..."         │                           │
 │                                   │                           │
 │  2. Worker環境準備/起動            │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker run 1 [--exec]  │                           │
 │  (worktree作成 + scope適用 + session開始 + prompt生成)         │
 │                                   │  git worktree add ...     │
 │                                   │  git sparse-checkout ...  │
 │                                   │                           │
 │  3. --execなしの場合               │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker prompt 1        │                           │
 │  （プロンプト取得→手動起動）        │                           │
 │                                   │                           │
```

### 2. Worker作業〜完了

```
Orchestrator                    agentmine                    Worker
 │                                  │                           │
 │                                  │  ※ Workerはagentmineに    │
 │                                  │    アクセスしない          │
 │                                  │                           │
 │  (Workerプロセスを監視)                                       │
 │                                  │                     (作業)│
 │                                  │                     commit│
 │                                  │                     push  │
 │                                  │                           │
 │  4. Worker終了検知                │                       exit│
 │<─────────────────────────────────────────────────────────────│
 │  exit code / signal を取得       │                           │
 │                                   │                           │
 │  5. 完了処理                       │                           │
 │ ─────────────────────────────────>│                           │
 │  agentmine worker done 1          │                           │
 │  （詳細記録が必要なら session end）│                           │
 │                                   │                           │
```

## Workerプロンプト生成

### buildPromptFromTask()

`worker run`コマンド実行時、以下の情報を統合してWorkerプロンプトを生成する。

```typescript
interface BuildPromptOptions {
  task: Task;
  agent: AgentDefinition;
  memoryService: MemoryService;
  agentService: AgentService;
}

async function buildPromptFromTask(options: BuildPromptOptions): Promise<string> {
  const { task, agent, memoryService, agentService } = options;
  const parts: string[] = [];

  // 1. タスク基本情報
  parts.push(`# Task #${task.id}: ${task.title}`);
  parts.push(`Type: ${task.type} | Priority: ${task.priority}`);

  // 2. 説明
  if (task.description) {
    parts.push('## Description');
    parts.push(task.description);
  }

  // 3. エージェント専用プロンプト（DB内promptContent）
  const promptContent = agent.promptContent;
  if (promptContent) {
    parts.push('## Agent Instructions');
    parts.push(promptContent);
  }

  // 4. スコープ情報
  parts.push('## Scope');
  parts.push(`- Read: ${agent.scope.read.join(', ')}`);
  parts.push(`- Write: ${agent.scope.write.join(', ')}`);
  parts.push(`- Exclude: ${agent.scope.exclude.join(', ')}`);

  // 5. Memory Bank（要約 + 参照一覧）
  const memorySummary = memoryService.buildSummary({
    status: 'active',
    maxItems: 5,
  });
  if (memorySummary.length > 0) {
    parts.push('## Memory Bank Summary');
    parts.push(...memorySummary);
  }

  const memoryFiles = memoryService.listFiles({ status: 'active' });
  if (memoryFiles.length > 0) {
    parts.push('## Project Context (Memory Bank)');
    parts.push('The following project context files are available:');
    for (const file of memoryFiles) {
      parts.push(`- ${file.path} - ${file.title}`);
    }
    parts.push('');
    parts.push('Read these files in .agentmine/memory/ for details.');
  }

  // 6. 基本指示
  parts.push('## Instructions');
  parts.push('1. 既存の実装パターンを確認してから作業開始');
  parts.push('2. モックデータは作成しない - 必ず既存サービスを使用');
  parts.push('3. テストが全てパスすることを確認');
  parts.push('4. 完了したらコミット');

  return parts.join('\n\n');
}
```

### プロンプト構成要素

| セクション | 内容 | 出典 | 展開方式 |
|-----------|------|------|----------|
| Task Header | タスクID、タイトル、タイプ、優先度 | tasks テーブル | 全文 |
| Description | タスクの詳細説明 | tasks.description | 全文 |
| Agent Instructions | エージェント固有の詳細指示 | agents.promptContent (DB) | 全文 |
| Scope | ファイルアクセス範囲 | agents.scope (DB) | 全文 |
| Project Context | プロジェクト決定事項 | Memory Bank（DB → .agentmine/memory） | **要約 + 参照一覧** |
| Instructions | 共通の作業指示 | ハードコード | 全文 |

**Note:** Memory BankはDBがマスター。`worker run` 実行時に `.agentmine/memory/` をスナップショット生成し、`status=active` のみ短い要約と参照一覧を注入する。詳細はファイルを参照する。

### コンテキスト不足による問題と対策

**問題:** Workerが十分なコンテキストを受け取らないと、モックデータを作成してしまう。

| 問題 | 原因 | 対策 |
|------|------|------|
| モックデータ作成 | 既存サービスの存在を知らない | promptContentに利用可能サービスを明記 |
| 不適切な実装 | プロジェクト規約を知らない | Memory Bankファイルの参照を促す |
| 汎用的すぎる指示 | エージェント固有指示がない | promptContent必須化 |

**ベストプラクティス:**
1. タスク作成時に`--description`で具体的な要件を記述
2. エージェントごとに詳細なpromptContentを用意（禁止事項、サービス利用例を含む）
3. Memory Bankにプロジェクト決定事項を充実させる（Workerが参照できる）

## Worktree + スコープ制御

### sparse-checkoutによるスコープ適用

`agentmine worker run` が内部で git worktree / sparse-checkout を実行してスコープを適用する（実装例）。

```bash
# agentmine が内部で実行

# 1. worktree作成
git worktree add .agentmine/worktrees/task-1 -b task-1-s123

# 2. sparse-checkout有効化
cd .agentmine/worktrees/task-1
git sparse-checkout init --cone

# 3. スコープ適用（exclude→read→writeの優先順位）
#    エージェント定義のscopeに基づいて設定
git sparse-checkout set src/ tests/ docs/ package.json
# excludeパターン（.env, secrets/等）は自動的に除外される

# 4. AIクライアント設定を配置（必要な場合）
cp -r ~/.agentmine/client-configs/claude-code/ .agentmine/worktrees/task-1/.claude/
# promptContentをクライアント固有のコンテキストファイルに出力（例: .claude/CLAUDE.md）
```

### スコープ優先順位

```
exclude → read → write

【exclude】最優先。マッチしたファイルはsparse-checkoutで除外
【read】  次に評価。マッチしたファイルは参照可能
【write】 明示的に指定されたファイルのみ編集可能

※ writeに明示的にマッチしないファイルはread-only扱い
  （タスク分割時に編集対象を明確にするため）
```

### Worktree構造

```
.agentmine/worktrees/
├── task-1/                     # タスク#1用
│   ├── .claude/                # Claude Code設定
│   │   ├── settings.json
│   │   └── CLAUDE.md           # promptContentから生成
│   ├── src/                    # write可能（スコープで指定時）
│   ├── tests/                  # write可能（スコープで指定時）
│   ├── docs/                   # read専用（sparse-checkoutに含まれるが編集不可）
│   └── package.json            # read専用
│   # .env, secrets/ は sparse-checkout で除外済み
│
├── task-2/                     # タスク#2用
│   └── ...
```

## 完了判定（Definition of Done）

### 基本原則

```
┌─────────────────────────────────────────────────────────────────────┐
│                     観測可能な事実のみで判定                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【判定に使わないもの】                                              │
│  ✗ Workerの発言 "完了しました" → 無視                               │
│  ✗ Orchestratorの判断 "これでOK" → 無視                             │
│                                                                     │
│  【判定に使うもの（観測可能な事実）】                                │
│  ✓ プロセスのexit code                                              │
│  ✓ プロセスが受信したsignal                                         │
│  ✓ ブランチのマージ状態                                             │
│  ✓ タイムアウト                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ステータス判定ロジック

```typescript
// Orchestratorがこのロジックを実行
// agentmineはステータスの永続化のみ担当

type TaskStatus = 'open' | 'in_progress' | 'done' | 'failed' | 'cancelled';

function determineTaskStatus(
  sessions: Session[],
  gitState: GitState,
  selectedSessionId?: number
): TaskStatus {
  if (sessions.length === 0) {
    return 'open';
  }

  // runningがあれば進行中
  if (sessions.some(s => s.status === 'running')) {
    return 'in_progress';
  }

  // マージ済みのセッションがあれば完了
  const merged = sessions.find(s =>
    s.dodResult === 'merged' ||
    (s.branchName && gitState.branchMergedTo(s.branchName, config.baseBranch))
  );
  if (merged) {
    return 'done';
  }

  // 採用セッションが指定されている場合はそれを優先判定
  if (selectedSessionId) {
    const selected = sessions.find(s => s.id === selectedSessionId);
    if (selected && selected.branchName &&
        gitState.branchMergedTo(selected.branchName, config.baseBranch)) {
      return 'done';
    }
  }

  // それ以外は失敗扱い（全て失敗/取消）
  const allFailed = sessions.every(s =>
    s.status === 'failed' || s.status === 'cancelled'
  );
  return allFailed ? 'failed' : 'in_progress';
}
```

### DoD検証（Orchestratorが実行）

```yaml
# settings snapshot (import/export)

# Definition of Done (プロジェクト全体)
# Orchestratorがマージ前に検証
dod:
  timeout: 300  # 5分（秒）
  checks:
    - type: lint_passes
      command: npm run lint
    - type: build_succeeds
      command: npm run build
    - type: tests_pass
      command: npm test

# タスクタイプ別ルール
task_types:
  bug:
    goals:
      - type: test_added
        pattern: "**/*.test.*"
  feature:
    goals:
      - type: files_changed
        pattern: "src/**/*"
```

### DoD実行タイミング

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DoD検証タイミング                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Worker終了後、マージ前にOrchestratorが実行                         │
│                                                                     │
│  1. Worker終了（exit code 0）                                       │
│  2. Orchestratorがworktreeでlint/build/testを実行                   │
│  3. 全てパス → マージ実行                                           │
│  4. マージ成功 → task status = done                                 │
│                                                                     │
│  ※ DoD失敗時はOrchestratorが判断（再試行 or failed）                │
│  ※ agentmineはDoD実行しない（Blackboard）                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### セッション記録項目

```typescript
// sessions テーブルに記録（観測可能な事実）
interface SessionRecord {
  sessionGroupId?: string | null;
  idempotencyKey?: string | null;
  branchName?: string | null;
  prUrl?: string | null;
  worktreePath?: string | null;
  exitCode: number | null;    // プロセス終了コード
  signal: string | null;      // 終了シグナル（SIGTERM等）
  dodResult: 'pending' | 'merged' | 'timeout' | 'error';
  artifacts: string[];        // 変更ファイル（worktree相対パス）
  error: SessionError | null; // エラー詳細
}
```

## タスクステータス遷移

```
┌──────┐     ┌───────────┐     ┌──────┐
│ open │────▶│in_progress│────▶│ done │
└──────┘     └───────────┘     └──────┘
                  │
                  │ (Worker異常終了)
                  ▼
             ┌──────────┐
             │  failed  │
             └──────────┘

Any state → cancelled
failed → in_progress (再試行時)
```

| 遷移 | トリガー | 判定基準 |
|------|----------|----------|
| open → in_progress | セッション開始 | running セッションが1つ以上 |
| in_progress → done | マージ完了 | git log baseBranch..branch が空 |
| in_progress → failed | 失敗確定 | runningなし、mergedなし、失敗/取消のみ |
| failed → in_progress | 再試行 | 新しいセッション開始 |
| * → cancelled | キャンセル | 人間またはOrchestratorが明示的に指示 |

**Note:** review/blockedステータスは削除。Orchestratorの主観的判断に依存するため。

## CLI コマンド

### Orchestrator向けコマンド

```bash
# タスク管理
agentmine task list --json
agentmine task add "タイトル" -t feature
agentmine task update <id> --labels blocked,needs_review

# エージェント定義取得
agentmine agent list
agentmine agent show coder --format yaml

# Worker実行
agentmine worker run <task-id> --exec
agentmine worker prompt <task-id> --agent coder
agentmine worker done <task-id>

# セッション記録（詳細に記録したい場合）
agentmine session end <session-id>   --exit-code 0   --signal ""   --dod-result merged   --artifacts '["src/auth.ts", "tests/auth.test.ts"]'

# Memory Bank
agentmine memory list --json
agentmine memory preview
```

**Note:**
- worktreeは `worker run` / `worker cleanup` が内部で管理する。
- Worker向けコマンドは存在しない。Workerはagentmineにアクセスしない。
- `session start` は手動運用時のみ使用。

## Worker終了方針

### 基本方針

```
exec mode + timeout の組み合わせ

1. AIクライアントのexec/非対話モードで起動
   → タスク完了時に自動終了
2. タイムアウト設定（デフォルト5分）
   → 無限ループ防止
3. タイムアウト時はSIGTERMで graceful shutdown
```

### 実行例

```bash
# Orchestratorが実行
TASK_ID=1

# 1. Worker環境準備（worktree作成 + session開始）
RUN_JSON=$(agentmine worker run $TASK_ID --json)
SESSION_ID=$(echo "$RUN_JSON" | jq -r '.session.id')

# 2. worktreeに移動
cd .agentmine/worktrees/task-$TASK_ID

# 3. プロンプト取得（タスク情報を含む）
PROMPT=$(agentmine worker prompt $TASK_ID)

# 4. exec modeで起動（タイムアウト付き）
timeout --signal=SIGTERM 300 claude-code exec "$PROMPT"
# または
timeout --signal=SIGTERM 300 codex exec "$PROMPT"

# 5. exit code取得
EXIT_CODE=$?

# 6. セッション終了（結果記録）
if [ $EXIT_CODE -eq 124 ]; then
  # タイムアウト（exit code 124 = timeout）
  agentmine session end $SESSION_ID --exit-code $EXIT_CODE --dod-result timeout
elif [ $EXIT_CODE -eq 0 ]; then
  # 正常終了 → マージ判定はOrchestratorが別途行う
  agentmine session end $SESSION_ID --exit-code $EXIT_CODE --dod-result pending
else
  # 異常終了
  agentmine session end $SESSION_ID --exit-code $EXIT_CODE --dod-result error
fi
```

### AIクライアント別対応

| クライアント | exec mode | コマンド例 |
|-------------|-----------|------------|
| Claude Code | `exec` サブコマンド | `claude-code exec "タスク"` |
| Codex | `exec` サブコマンド | `codex exec "タスク"` |
| Gemini CLI | `-i` なし | `gemini "タスク"` |

## References

- [Architecture](../architecture.md)
- [Agent System](./agent-system.md)
- [Parallel Execution](./parallel-execution.md)
- [Data Model](../data-model.md)
