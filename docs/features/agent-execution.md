# Agent Execution Flow

エージェント実行の詳細設計。

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    agentmine Agent Execution                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【設計方針】                                                        │
│  - ツール非依存: Claude Code, Codex, OpenCode等を統一的に扱う       │
│  - 客観判定: エージェントの発言ではなく成果物で完了を判定           │
│  - 3階層ゴール: DoD + タイプルール + AC で検証                      │
│  - Orchestrator + Blackboard: 中央制御 + 共有状態                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture

### ツール非依存アダプタ層

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Agent Executor                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │ Claude  │  │  Codex  │  │  Open   │  │ Custom  │              │
│  │  Code   │  │   CLI   │  │  Code   │  │  Agent  │              │
│  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │              │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘              │
│       └────────────┴────────────┴─────────────┘                   │
│                           │                                        │
│                           ▼                                        │
│              ┌──────────────────────┐                              │
│              │   AgentAdapter       │                              │
│              │   (共通Interface)    │                              │
│              └──────────────────────┘                              │
│                           │                                        │
│                           ▼                                        │
│              ┌──────────────────────┐                              │
│              │    Sandbox Layer     │                              │
│              │  (Docker/Worktree)   │                              │
│              └──────────────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### AgentAdapter Interface

```typescript
interface AgentAdapter {
  name: string;  // "claude-code", "codex", "opencode", "custom"
  
  // エージェント起動
  start(config: AgentStartConfig): Promise<AgentProcess>;
  
  // タスク実行（成果物を返す）
  execute(process: AgentProcess, task: TaskInput): Promise<ExecutionResult>;
  
  // プロセス状態確認
  getStatus(process: AgentProcess): Promise<ProcessStatus>;
  
  // 停止
  stop(process: AgentProcess): Promise<void>;
}

interface AgentStartConfig {
  task: Task;
  workdir: string;              // サンドボックス内の作業ディレクトリ
  tools: string[];              // 許可するツール
  timeout: number;              // タイムアウト（ms）
  env: Record<string, string>;  // 環境変数
}

interface ExecutionResult {
  exitCode: number;
  artifacts: Artifact[];        // 生成された成果物
  duration: number;
  logs: string;                 // 実行ログ（デバッグ用）
}
```

### アダプタ実装例

```typescript
// Claude Code Adapter
class ClaudeCodeAdapter implements AgentAdapter {
  name = 'claude-code';
  
  async execute(process: AgentProcess, task: TaskInput): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // claude --print でタスク実行
    const result = await execInSandbox(process.sandbox, 
      `claude --print "${escapePrompt(task.prompt)}"`,
      { cwd: process.workdir, timeout: process.timeout }
    );
    
    // 成果物を収集（git diff等から）
    const artifacts = await collectArtifacts(process.workdir);
    
    return {
      exitCode: result.exitCode,
      artifacts,
      duration: Date.now() - startTime,
      logs: result.stdout + result.stderr,
    };
  }
}

// Codex Adapter
class CodexAdapter implements AgentAdapter {
  name = 'codex';
  
  async execute(process: AgentProcess, task: TaskInput): Promise<ExecutionResult> {
    const result = await execInSandbox(process.sandbox,
      `codex exec "${escapePrompt(task.prompt)}"`,
      { cwd: process.workdir, timeout: process.timeout }
    );
    
    const artifacts = await collectArtifacts(process.workdir);
    
    return {
      exitCode: result.exitCode,
      artifacts,
      duration: Date.now() - startTime,
      logs: result.stdout + result.stderr,
    };
  }
}
```

## Orchestrator + Blackboard

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Orchestrator + Blackboard                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     Orchestrator                               │ │
│  │  - タスク分解・分配                                            │ │
│  │  - Worker監視                                                  │ │
│  │  - 結果集約・マージ                                            │ │
│  │  - 人間エスカレーション                                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│          ┌───────────────────┼───────────────────┐                  │
│          ▼                   ▼                   ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │   Worker    │     │   Worker    │     │   Worker    │          │
│  │  (Agent A)  │     │  (Agent B)  │     │  (Agent C)  │          │
│  │  Sandbox    │     │  Sandbox    │     │  Sandbox    │          │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘          │
│         │                   │                   │                   │
│         └───────────────────┴───────────────────┘                   │
│                             │                                        │
│                             ▼                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Blackboard (DB)                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │ │
│  │  │  Tasks   │  │ Sessions │  │ Messages │  │  Artifacts   │  │ │
│  │  │  状態    │  │  進捗    │  │  通信    │  │   成果物     │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Orchestrator

```typescript
interface Orchestrator {
  // タスク分解・分配
  decompose(task: Task): Promise<SubTask[]>;
  assign(subTask: SubTask, adapter: AgentAdapter): Promise<Worker>;
  
  // Worker管理
  startWorker(subTask: SubTask): Promise<Worker>;
  monitorWorkers(): AsyncGenerator<WorkerEvent>;
  
  // 結果集約
  collectArtifacts(taskId: number): Promise<Artifact[]>;
  mergeBranches(taskId: number): Promise<MergeResult>;
  
  // エスカレーション
  escalateToHuman(issue: Issue): Promise<void>;
}
```

### Blackboard通信（DevHive互換）

```typescript
// メッセージテーブル（並列実行の詳細実装時に data-model.md へ追加）
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  fromSessionId: integer('from_session_id').references(() => sessions.id),
  toSessionId: integer('to_session_id').references(() => sessions.id),
  
  type: text('type', { 
    enum: ['instruction', 'handover', 'broadcast'] 
  }).notNull(),
  
  content: text('content').notNull(),
  
  status: text('status', { 
    enum: ['pending', 'read', 'resolved'] 
  }).default('pending'),
  
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});
```

## 完了判定システム

### 基本原則

```
┌─────────────────────────────────────────────────────────────────────┐
│                       完了判定の原則                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【エージェントの発言は判定に使わない】                              │
│                                                                     │
│  ✗ "完了しました" → 無視                                            │
│  ✗ "失敗しました" → 無視                                            │
│  ✗ "〇〇を実装しました" → 無視                                      │
│                                                                     │
│  【成果物とゴールのみで客観判定】                                    │
│                                                                     │
│  完了 = 成果物が存在 ∧ ゴール検証がパス                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 成果物（Artifact）

```typescript
// 検証可能な物理的存在
// Note: PR は Orchestrator が作成するため、Agent の成果物には含まない
type Artifact =
  | { type: 'commit'; sha: string; branch: string }
  | { type: 'file'; path: string; checksum: string }
  | { type: 'branch'; name: string; baseBranch: string }
  ;

// 成果物テーブル（詳細実装時に data-model.md へ追加）
export const artifacts = sqliteTable('artifacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  sessionId: integer('session_id').references(() => sessions.id),
  taskId: integer('task_id').references(() => tasks.id),

  type: text('type', {
    enum: ['commit', 'file', 'branch']
  }).notNull(),
  
  // 検証用データ
  data: text('data', { mode: 'json' }).$type<ArtifactData>(),
  
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

// 期待される成果物（タスクタイプ別）
const expectedArtifacts: Record<TaskType, ArtifactType[]> = {
  feature: ['commit', 'branch'],
  bug: ['commit', 'branch'],
  refactor: ['commit', 'branch'],
  docs: ['commit'],
  test: ['commit'],
};
```

### ゴール3階層

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ゴール階層構造                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Level 1: Definition of Done (プロジェクト全体)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  .agentmine/config.yaml で定義                              │   │
│  │  例:                                                        │   │
│  │  - lint_passes: npm run lint                                │   │
│  │  - build_succeeds: npm run build                            │   │
│  │  - no_secrets: gitleaks detect                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓ 継承                                 │
│  Level 2: タスクタイプ別ルール (組み込み)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  feature: files_changed(src/**)                             │   │
│  │  bug: test_added(*.test.*)                                  │   │
│  │  refactor: tests_pass(npm test)                             │   │
│  │  test: test_file_exists(*.test.*)                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓ 継承                                 │
│  Level 3: Acceptance Criteria (タスク固有)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  タスク作成時に定義（人間 or AI推論）                        │   │
│  │  例:                                                        │   │
│  │  - endpoint_responds: POST /api/login → 200                 │   │
│  │  - response_contains: $.token exists                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  【完了判定】                                                        │
│  Level 1 ∧ Level 2 ∧ Level 3 = TRUE → done                        │
│                                       FALSE → rejected              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ゴールスキーマ

```typescript
// ゴール定義（Goal Verification 詳細実装時に data-model.md へ追加）
export const taskGoals = sqliteTable('task_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').references(() => tasks.id),
  
  level: text('level', { 
    enum: ['dod', 'type_rule', 'acceptance_criteria'] 
  }).notNull(),
  
  type: text('type', { 
    enum: [
      'lint_passes',      // リンター通過
      'build_succeeds',   // ビルド成功
      'tests_pass',       // テスト成功
      'test_added',       // テスト追加
      'files_changed',    // ファイル変更
      'file_exists',      // ファイル存在
      'no_secrets',       // 機密情報なし
      'endpoint_responds',// エンドポイント応答
      'response_contains',// レスポンス内容
      'custom_script',    // カスタムスクリプト
    ] 
  }).notNull(),
  
  condition: text('condition', { mode: 'json' }).$type<GoalCondition>(),
  required: integer('required', { mode: 'boolean' }).default(true),
  
  source: text('source', { 
    enum: ['project_config', 'type_default', 'ai_inferred', 'human_defined'] 
  }).notNull(),
});

// ゴール検証結果（Goal Verification 詳細実装時に data-model.md へ追加）
export const goalResults = sqliteTable('goal_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goalId: integer('goal_id').references(() => taskGoals.id),
  sessionId: integer('session_id').references(() => sessions.id),
  
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  details: text('details'),
  
  verifiedAt: integer('verified_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});
```

### 検証フロー

```typescript
async function verifyTaskCompletion(taskId: number, sessionId: number): Promise<VerifyResult> {
  // 1. 成果物チェック
  const artifacts = await getArtifacts(sessionId);
  const task = await getTask(taskId);
  const expected = expectedArtifacts[task.type];
  
  const missingArtifacts = expected.filter(
    type => !artifacts.some(a => a.type === type)
  );
  
  if (missingArtifacts.length > 0) {
    return { 
      status: 'rejected', 
      reason: 'missing_artifacts',
      details: { missing: missingArtifacts },
    };
  }
  
  // 2. ゴール検証（3階層）
  const goals = await getAllGoals(taskId);  // L1 + L2 + L3
  
  const results: GoalResult[] = [];
  for (const goal of goals) {
    const result = await verifyGoal(goal, artifacts, task);
    results.push(result);
    await saveGoalResult(goal.id, sessionId, result);
  }
  
  // 3. 判定
  const failedRequired = results.filter(r => !r.passed && r.goal.required);
  
  if (failedRequired.length > 0) {
    return {
      status: 'rejected',
      reason: 'goals_not_met',
      details: { failedGoals: failedRequired },
    };
  }
  
  return { status: 'done' };
}
```

### ゴール検証の実装例

```typescript
async function verifyGoal(goal: Goal, artifacts: Artifact[], task: Task): Promise<GoalResult> {
  switch (goal.type) {
    case 'lint_passes':
      return runCommand(goal.condition.command || 'npm run lint');
    
    case 'build_succeeds':
      return runCommand(goal.condition.command || 'npm run build');
    
    case 'tests_pass':
      return runCommand(goal.condition.command || 'npm test');
    
    case 'test_added':
      const testFiles = await glob(goal.condition.pattern || '**/*.test.*');
      const newTests = testFiles.filter(f => isNewInBranch(f, task.branchName));
      return { passed: newTests.length > 0, details: { newTests } };
    
    case 'files_changed':
      const changed = await getChangedFiles(task.branchName);
      const matches = changed.filter(f => matchPattern(f, goal.condition.pattern));
      return { passed: matches.length > 0, details: { changed: matches } };
    
    case 'endpoint_responds':
      const response = await fetch(goal.condition.url, {
        method: goal.condition.method,
      });
      return { 
        passed: response.status === goal.condition.status,
        details: { actualStatus: response.status },
      };
    
    case 'custom_script':
      return runCommand(goal.condition.script);
    
    default:
      return { passed: false, details: { error: 'unknown goal type' } };
  }
}
```

## タスクステータス遷移

```
┌──────┐     ┌───────────┐     ┌────────────┐
│ open │────▶│in_progress│────▶│  (verify)  │  ← 内部処理
└──────┘     └───────────┘     └─────┬──────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                 ┌──────────┐              ┌───────────┐
                 │  review  │              │in_progress│ (再作業)
                 └──────────┘              └───────────┘

※ verify（検証）は Orchestrator の内部処理。
  タスクステータスは data-model.md の enum を使用:
  open | in_progress | review | done | blocked | cancelled
```

## レビューは別タスク

```typescript
// タスク完了後、必要に応じてレビュータスクを生成
// Note: レビューも task type を使用（type enum: task | feature | bug | refactor）
async function onTaskDone(task: Task): Promise<void> {
  if (task.requiresReview) {
    await createTask({
      parentId: task.id,
      title: `Review: ${task.title}`,
      type: 'task',  // レビューは通常の task として作成
      assigneeType: task.reviewerType || 'human',  // 人間 or AI
      description: `Review artifacts from task #${task.id}`,
    });
  }
}
```

## 設定例

### .agentmine/config.yaml

```yaml
project:
  name: my-project

# Definition of Done (Level 1)
dod:
  - type: lint_passes
    command: npm run lint
  - type: build_succeeds
    command: npm run build
  - type: no_secrets
    command: gitleaks detect

# エージェント設定
agents:
  default:
    adapter: claude-code
    model: claude-sonnet
    timeout: 1800000  # 30分
    tools: [Read, Write, Edit, Bash, Grep, Glob]

  codex:
    adapter: codex
    timeout: 1800000

# タスクタイプ別設定（Level 2 のカスタマイズ）
task_types:
  bug:
    goals:
      - type: test_added
        pattern: "**/*.test.*"
        required: true
    requires_review: true
    reviewer_type: human
  
  feature:
    goals:
      - type: files_changed
        pattern: "src/**/*"
    requires_review: true
    reviewer_type: ai
```

## References

- [ADR-001: TypeScript Monorepo](../adr/001-typescript-monorepo.md)
- [ADR-002: Database Strategy](../adr/002-sqlite-default.md)
- [Agent System](./agent-system.md)
- [Parallel Execution](./parallel-execution.md)
