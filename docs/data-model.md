# Data Model

## Database Strategy

| 環境 | DB | 用途 |
|------|-----|------|
| ローカル開発 | **SQLite** | ゼロ設定、ポータブル |
| 本番環境 | **PostgreSQL** | AI機能（pgvector）、スケーラビリティ |

Drizzle ORMにより、両DBで共通のクエリAPIを使用。スキーマ定義は若干異なるが、アプリケーションコードは共通化可能。

**参考:** [ADR-002: Database Strategy](./adr/002-sqlite-default.md)

## ER Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     Project     │       │      Agent      │
├─────────────────┤       ├─────────────────┤
│ id          PK  │       │ id          PK  │
│ name            │       │ name            │
│ description     │       │ description     │
│ created_at      │       │ model           │
│ updated_at      │       │ tools       []  │
└────────┬────────┘       │ config      {}  │
         │                │ created_at      │
         │                └────────┬────────┘
         │                         │
         │    ┌────────────────────┤
         │    │                    │
         ▼    ▼                    │
┌─────────────────┐                │
│      Task       │                │
├─────────────────┤                │
│ id          PK  │                │
│ project_id  FK  │                │
│ parent_id   FK  │──┐ (self-ref)  │
│ title           │  │             │
│ description     │  │             │
│ status          │◄─┘             │
│ priority        │                │
│ type            │                │
│ assignee_type   │                │
│ assignee_name   │────────────────┘
│ branch_name     │
│ pr_url          │
│ complexity      │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌───────────────────┐
│     Session     │       │ ProjectDecision   │
├─────────────────┤       ├───────────────────┤
│ id          PK  │       │ id            PK  │
│ task_id     FK  │       │ category          │
│ agent_name      │       │ title             │
│ status          │       │ decision          │
│ started_at      │       │ reason            │
│ completed_at    │       │ related_task_id FK│
│ duration_ms     │       │ created_at        │
│ artifacts   []  │       │ updated_at        │
│ error       {}  │       └───────────────────┘
└─────────────────┘
```

**Note:** スキル管理は agentmine の範囲外（各AIツールに委ねる）

## Schema Definition (Drizzle)

### tasks

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').references(() => projects.id),
  parentId: integer('parent_id').references(() => tasks.id),
  
  title: text('title').notNull(),
  description: text('description'),
  
  status: text('status', {
    enum: ['open', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
  }).notNull().default('open'),
  
  priority: text('priority', { 
    enum: ['low', 'medium', 'high', 'critical'] 
  }).notNull().default('medium'),
  
  type: text('type', { 
    enum: ['task', 'feature', 'bug', 'refactor'] 
  }).notNull().default('task'),
  
  assigneeType: text('assignee_type', { 
    enum: ['ai', 'human'] 
  }),
  assigneeName: text('assignee_name'),
  
  branchName: text('branch_name'),
  prUrl: text('pr_url'),
  
  complexity: integer('complexity'), // 1-10
  
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

### agents

```typescript
export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull().unique(),
  description: text('description'),
  model: text('model').notNull(), // claude-opus, claude-sonnet, etc.

  tools: text('tools', { mode: 'json' }).$type<string[]>().default([]),
  config: text('config', { mode: 'json' }).$type<AgentConfig>().default({}),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

**Note:** `skills` フィールドは削除。スキル管理は agentmine の範囲外。

### sessions

```typescript
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  taskId: integer('task_id').references(() => tasks.id),
  agentName: text('agent_name').notNull(),

  status: text('status', {
    enum: ['running', 'completed', 'failed', 'cancelled']
  }).notNull().default('running'),

  // 実行時間
  startedAt: integer('started_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  durationMs: integer('duration_ms'),

  // 成果物（変更されたファイルパス）
  artifacts: text('artifacts', { mode: 'json' })
    .$type<string[]>()
    .default([]),

  // エラー情報（失敗時）
  error: text('error', { mode: 'json' })
    .$type<SessionError | null>()
    .default(null),
});

interface SessionError {
  type: string;      // timeout, crash, etc.
  message: string;
  details?: Record<string, any>;
}
```

**Note:** `tokenUsage` は測定不可のため削除。Orchestrator が観測可能な範囲のみ記録。

### project_decisions (Memory Bank)

```typescript
export const projectDecisions = sqliteTable('project_decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  category: text('category', {
    enum: ['architecture', 'tooling', 'convention', 'rule']
  }).notNull(),

  title: text('title').notNull(),
  decision: text('decision').notNull(),
  reason: text('reason'),

  // 関連タスク（任意）
  relatedTaskId: integer('related_task_id').references(() => tasks.id),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
```

**Note:** `skills` テーブルは削除。スキル管理は agentmine の範囲外。

## Status Transitions

### Task Status

```
                    ┌─────────────┐
                    │             │
                    ▼             │
┌──────┐      ┌───────────┐      │     ┌──────┐
│ open │─────▶│in_progress│──────┼────▶│ done │
└──────┘      └───────────┘      │     └──────┘
                    │            │
                    ▼            │
              ┌──────────┐       │
              │  review  │───────┘
              └──────────┘
                    │
                    │ (reject)
                    ▼
              ┌───────────┐
              │in_progress│
              └───────────┘

in_progress → blocked (コンフリクト等)
blocked → open (解消後)
Any state → cancelled
```

### Session Status

```
┌─────────┐      ┌───────────┐
│ running │─────▶│ completed │
└─────────┘      └───────────┘
     │
     │ (error)
     ▼
┌─────────┐
│ failed  │
└─────────┘

running → cancelled (manual stop)
```

## Indexes

```sql
-- Task queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_type, assignee_name);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);

-- Session queries
CREATE INDEX idx_sessions_task ON sessions(task_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Project decisions queries
CREATE INDEX idx_decisions_category ON project_decisions(category);
```

## Configuration Schema (YAML)

### .agentmine/config.yaml

```yaml
# Project configuration
project:
  name: string          # required
  description: string   # optional

# Database configuration
database:
  url: string           # file:./data.db or postgres://...

# Agent definitions
agents:
  [name]:
    description: string
    model: string       # claude-opus | claude-sonnet | claude-haiku | ...
    tools: string[]     # Read, Write, Edit, Bash, Grep, Glob, WebSearch
    config:
      temperature: number    # 0.0 - 1.0
      maxTokens: number
      systemPrompt: string

# Git integration
git:
  baseBranch: string    # default: "develop"
  branchPrefix: string  # default: "task-"
  commitConvention:
    enabled: boolean    # default: true
    format: string      # conventional | simple | custom

# Execution settings
execution:
  parallel:
    enabled: boolean
    maxWorkers: number
    worktree:
      path: string      # default: ".worktrees/"
      cleanup: boolean  # default: true

# Session log retention
sessionLog:
  retention:
    enabled: boolean    # default: false
    days: number        # 保持日数
```

## Migration Strategy

### Initial Migration

```typescript
// packages/core/src/db/migrations/0001_initial.ts
import { sql } from 'drizzle-orm';

export async function up(db: Database) {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      parent_id INTEGER REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      type TEXT NOT NULL DEFAULT 'task',
      assignee_type TEXT,
      assignee_name TEXT,
      branch_name TEXT,
      pr_url TEXT,
      complexity INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  
  // ... other tables
}

export async function down(db: Database) {
  await db.run(sql`DROP TABLE IF EXISTS tasks`);
}
```

### Running Migrations

```bash
# マイグレーション生成
agentmine db migrate:generate

# マイグレーション実行
agentmine db migrate

# ロールバック
agentmine db migrate:rollback
```

## PostgreSQL拡張: pgvector（将来）

本番環境（PostgreSQL）では、pgvectorを使用したベクトル検索が利用可能。

### project_decisions（PostgreSQL版）

```typescript
import { pgTable, serial, text, integer, timestamp, vector } from 'drizzle-orm/pg-core';

export const projectDecisions = pgTable('project_decisions', {
  id: serial('id').primaryKey(),

  category: text('category', {
    enum: ['architecture', 'tooling', 'convention', 'rule']
  }).notNull(),

  title: text('title').notNull(),
  decision: text('decision').notNull(),
  reason: text('reason'),

  relatedTaskId: integer('related_task_id').references(() => tasks.id),

  // ベクトル埋め込み（将来追加）
  embedding: vector('embedding', { dimensions: 1536 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});
```

### ベクトル検索インデックス

```sql
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSWインデックス（高速な近似最近傍検索）
CREATE INDEX ON project_decisions
USING hnsw (embedding vector_cosine_ops);
```

### セマンティック検索クエリ（将来）

```typescript
import { sql } from 'drizzle-orm';

// 類似する決定事項を検索
const similarDecisions = await db.execute(sql`
  SELECT id, title, decision, reason,
         1 - (embedding <=> ${queryEmbedding}) as similarity
  FROM project_decisions
  ORDER BY embedding <=> ${queryEmbedding}
  LIMIT 5
`);
```

### ユースケース（将来）

| 機能 | 説明 |
|------|------|
| 決定事項のセマンティック検索 | 関連する過去の決定を検索 |
| タスク類似検索 | 「似たタスクを探す」 |
| 重複検出 | 同様の決定を検出 |
