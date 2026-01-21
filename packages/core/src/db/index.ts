import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'
import * as schema from './schema.js'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { sql } from 'drizzle-orm'

// ============================================
// Types
// ============================================

export type Db = ReturnType<typeof drizzle<typeof schema>>

export interface DbOptions {
  /** Database file path (default: .agentmine/data.db) */
  path?: string
  /** Project root directory (default: process.cwd()) */
  projectRoot?: string
}

// ============================================
// Constants
// ============================================

export const AGENTMINE_DIR = '.agentmine'
export const DEFAULT_DB_NAME = 'data.db'

// ============================================
// Module state
// ============================================

let dbInstance: Db | null = null
let clientInstance: Client | null = null

// ============================================
// Database functions
// ============================================

/**
 * Get the .agentmine directory path for a project
 */
export function getAgentmineDir(projectRoot: string = process.cwd()): string {
  return join(projectRoot, AGENTMINE_DIR)
}

/**
 * Get the default database path for a project
 */
export function getDefaultDbPath(projectRoot: string = process.cwd()): string {
  return join(getAgentmineDir(projectRoot), DEFAULT_DB_NAME)
}

/**
 * Check if a project is initialized (has .agentmine directory)
 */
export function isProjectInitialized(projectRoot: string = process.cwd()): boolean {
  return existsSync(getAgentmineDir(projectRoot))
}

/**
 * Create SQLite database connection using libsql
 */
export function createDb(options: DbOptions = {}): Db {
  const projectRoot = options.projectRoot ?? process.cwd()
  const dbPath = options.path ?? getDefaultDbPath(projectRoot)
  const absolutePath = resolve(projectRoot, dbPath)

  // Ensure directory exists
  const dir = dirname(absolutePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const client = createClient({
    url: `file:${absolutePath}`,
  })

  clientInstance = client
  dbInstance = drizzle(client, { schema })

  return dbInstance
}

/**
 * Get the underlying libsql client
 */
export function getClient(): Client | null {
  return clientInstance
}

/**
 * Initialize database tables
 * Creates tables if they don't exist
 * Based on docs/04-data/data-model.md
 */
export async function initializeDb(db: Db): Promise<void> {
  // Create projects table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create tasks table (without branchName, prUrl - moved to sessions)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      parent_id INTEGER REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done', 'failed', 'dod_failed', 'cancelled')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      type TEXT NOT NULL DEFAULT 'task' CHECK(type IN ('task', 'feature', 'bug', 'refactor')),
      assignee_type TEXT CHECK(assignee_type IN ('ai', 'human')),
      assignee_name TEXT,
      selected_session_id INTEGER,
      labels TEXT DEFAULT '[]',
      complexity INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create sessions table (no UNIQUE on task_id, with branchName, prUrl)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id),
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER,
      duration_ms INTEGER,
      session_group_id TEXT,
      idempotency_key TEXT UNIQUE,
      branch_name TEXT,
      pr_url TEXT,
      worktree_path TEXT,
      exit_code INTEGER,
      signal TEXT,
      dod_result TEXT CHECK(dod_result IN ('passed', 'failed', 'skipped', 'timeout')),
      artifacts TEXT DEFAULT '[]',
      error TEXT DEFAULT NULL,
      pid INTEGER,
      review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected', 'needs_work')),
      reviewed_by TEXT,
      reviewed_at INTEGER,
      review_comment TEXT
    )
  `)

  // Create agents table (with dod column)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      name TEXT NOT NULL,
      description TEXT,
      client TEXT NOT NULL,
      model TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT '{"write":[],"exclude":[]}',
      config TEXT DEFAULT '{}',
      prompt_content TEXT,
      dod TEXT DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(project_id, name)
    )
  `)

  // Create agent_history table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS agent_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      snapshot TEXT NOT NULL,
      version INTEGER NOT NULL,
      changed_by TEXT,
      change_summary TEXT,
      changed_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create memories table (with version)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'archived')),
      tags TEXT DEFAULT '[]',
      related_task_id INTEGER REFERENCES tasks(id),
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create memory_history table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS memory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id INTEGER NOT NULL REFERENCES memories(id),
      snapshot TEXT NOT NULL,
      version INTEGER NOT NULL,
      changed_by TEXT,
      change_summary TEXT,
      changed_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create settings table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(project_id, key)
    )
  `)

  // Create audit_logs table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      user_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'start', 'stop', 'export')),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'agent', 'memory', 'session', 'settings')),
      entity_id TEXT NOT NULL,
      changes TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  // Create project_decisions table (legacy)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS project_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('architecture', 'tooling', 'convention', 'rule')),
      title TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      related_task_id INTEGER REFERENCES tasks(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER
    )
  `)

  // Create indexes
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_type, assignee_name)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_idempotency_key ON sessions(idempotency_key)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_agent_history_agent ON agent_history(agent_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_memory_history_memory ON memory_history(memory_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_settings_project_key ON settings(project_id, key)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_decisions_category ON project_decisions(category)`)

  // Run migrations for existing databases
  await runMigrations(db)
}

/**
 * Run migrations to update existing databases to the new schema
 */
async function runMigrations(db: Db): Promise<void> {
  // Migration: Add new columns to tasks
  try {
    const taskInfo = await db.all(sql`PRAGMA table_info(tasks)`) as Array<{ name: string }>
    const taskColumns = taskInfo.map((row) => row.name)

    if (!taskColumns.includes('selected_session_id')) {
      await db.run(sql`ALTER TABLE tasks ADD COLUMN selected_session_id INTEGER`)
    }
    if (!taskColumns.includes('labels')) {
      await db.run(sql`ALTER TABLE tasks ADD COLUMN labels TEXT DEFAULT '[]'`)
    }
  } catch {
    // Ignore errors if columns already exist
  }

  // Migration: Add new columns to sessions
  try {
    const sessionInfo = await db.all(sql`PRAGMA table_info(sessions)`) as Array<{ name: string }>
    const sessionColumns = sessionInfo.map((row) => row.name)

    if (!sessionColumns.includes('pid')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN pid INTEGER`)
    }
    if (!sessionColumns.includes('worktree_path')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN worktree_path TEXT`)
    }
    if (!sessionColumns.includes('review_status')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN review_status TEXT DEFAULT 'pending'`)
    }
    if (!sessionColumns.includes('reviewed_by')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN reviewed_by TEXT`)
    }
    if (!sessionColumns.includes('reviewed_at')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN reviewed_at INTEGER`)
    }
    if (!sessionColumns.includes('review_comment')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN review_comment TEXT`)
    }
    if (!sessionColumns.includes('session_group_id')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN session_group_id TEXT`)
    }
    if (!sessionColumns.includes('idempotency_key')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN idempotency_key TEXT`)
    }
    if (!sessionColumns.includes('branch_name')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN branch_name TEXT`)
    }
    if (!sessionColumns.includes('pr_url')) {
      await db.run(sql`ALTER TABLE sessions ADD COLUMN pr_url TEXT`)
    }
  } catch {
    // Ignore errors if columns already exist
  }

  // Migration: Add dod column to agents
  try {
    const agentInfo = await db.all(sql`PRAGMA table_info(agents)`) as Array<{ name: string }>
    const agentColumns = agentInfo.map((row) => row.name)

    if (!agentColumns.includes('dod')) {
      await db.run(sql`ALTER TABLE agents ADD COLUMN dod TEXT DEFAULT '[]'`)
    }
  } catch {
    // Ignore errors if columns already exist
  }

  // Migration: Add version column to memories
  try {
    const memoryInfo = await db.all(sql`PRAGMA table_info(memories)`) as Array<{ name: string }>
    const memoryColumns = memoryInfo.map((row) => row.name)

    if (!memoryColumns.includes('version')) {
      await db.run(sql`ALTER TABLE memories ADD COLUMN version INTEGER NOT NULL DEFAULT 1`)
    }
  } catch {
    // Ignore errors if columns already exist
  }

  // Migration: Migrate branchName/prUrl from tasks to sessions (if columns exist in tasks)
  await migrateBranchDataToSessions(db)

  // Migration: Remove UNIQUE constraint on sessions.task_id (recreate table)
  await removeSessionsTaskIdUniqueConstraint(db)
}

/**
 * Migrate branchName and prUrl from tasks to sessions
 * This handles the schema change where these fields moved from tasks to sessions
 */
async function migrateBranchDataToSessions(db: Db): Promise<void> {
  try {
    // Check if tasks has branch_name column (old schema)
    const taskInfo = await db.all(sql`PRAGMA table_info(tasks)`) as Array<{ name: string }>
    const taskColumns = taskInfo.map((row) => row.name)

    if (!taskColumns.includes('branch_name')) {
      return // Already migrated or fresh install
    }

    // Migrate data: Update sessions with branchName/prUrl from their associated tasks
    await db.run(sql`
      UPDATE sessions
      SET branch_name = (
        SELECT t.branch_name FROM tasks t WHERE t.id = sessions.task_id
      ),
      pr_url = (
        SELECT t.pr_url FROM tasks t WHERE t.id = sessions.task_id
      )
      WHERE sessions.branch_name IS NULL
        AND EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = sessions.task_id
            AND (t.branch_name IS NOT NULL OR t.pr_url IS NOT NULL)
        )
    `)

    // Note: We don't drop columns from tasks since SQLite doesn't support DROP COLUMN
    // The columns will be ignored by the new schema
  } catch {
    // Ignore errors - migration may have already been applied
  }
}

/**
 * Remove UNIQUE constraint on sessions.task_id to support 1:N relationship
 * SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table
 */
async function removeSessionsTaskIdUniqueConstraint(db: Db): Promise<void> {
  try {
    // Check if there's a UNIQUE index on task_id
    const indexInfo = await db.all(sql`
      SELECT name, sql FROM sqlite_master
      WHERE type = 'index'
        AND tbl_name = 'sessions'
        AND sql LIKE '%task_id%UNIQUE%'
    `) as Array<{ name: string; sql: string | null }>

    // Also check for UNIQUE constraint in table definition
    const tableInfo = await db.all(sql`
      SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sessions'
    `) as Array<{ sql: string }>

    const tableSql = tableInfo[0]?.sql || ''
    const hasUniqueConstraint = tableSql.includes('UNIQUE') && tableSql.includes('task_id')
    const hasUniqueIndex = indexInfo.length > 0

    if (!hasUniqueConstraint && !hasUniqueIndex) {
      return // No constraint to remove
    }

    // Recreate sessions table without UNIQUE constraint
    // Step 1: Create new table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sessions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id),
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
        started_at INTEGER NOT NULL DEFAULT (unixepoch()),
        completed_at INTEGER,
        duration_ms INTEGER,
        session_group_id TEXT,
        idempotency_key TEXT UNIQUE,
        branch_name TEXT,
        pr_url TEXT,
        worktree_path TEXT,
        exit_code INTEGER,
        signal TEXT,
        dod_result TEXT CHECK(dod_result IN ('passed', 'failed', 'skipped', 'timeout')),
        artifacts TEXT DEFAULT '[]',
        error TEXT DEFAULT NULL,
        pid INTEGER,
        review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected', 'needs_work')),
        reviewed_by TEXT,
        reviewed_at INTEGER,
        review_comment TEXT
      )
    `)

    // Step 2: Copy data
    await db.run(sql`
      INSERT INTO sessions_new
      SELECT id, task_id, agent_name, status, started_at, completed_at, duration_ms,
             session_group_id, idempotency_key, branch_name, pr_url, worktree_path,
             exit_code, signal, dod_result, artifacts, error, pid,
             review_status, reviewed_by, reviewed_at, review_comment
      FROM sessions
    `)

    // Step 3: Drop old table and rename new one
    await db.run(sql`DROP TABLE sessions`)
    await db.run(sql`ALTER TABLE sessions_new RENAME TO sessions`)

    // Step 4: Recreate indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id)`)
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`)
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_idempotency_key ON sessions(idempotency_key)`)
  } catch {
    // Ignore errors - migration may have already been applied or table structure differs
  }
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (clientInstance) {
    clientInstance.close()
    clientInstance = null
    dbInstance = null
  }
}

// Re-export schema
export * from './schema.js'
