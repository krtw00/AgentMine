import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import type { Db } from '../db/index.js'
import {
  sessions,
  tasks,
  type Session,
  type NewSession,
  type SessionStatus,
  type DodResult,
  type SessionError,
} from '../db/schema.js'
import {
  TaskNotFoundError,
  SessionNotFoundError,
  SessionAlreadyExistsError,
  SessionAlreadyEndedError,
} from '../errors.js'

// Re-export errors for convenience
export {
  SessionNotFoundError,
  SessionAlreadyExistsError,
  SessionAlreadyEndedError,
} from '../errors.js'

// ============================================
// Types
// ============================================

export interface SessionFilters {
  taskId?: number
  agentName?: string
  status?: SessionStatus
  dodResult?: DodResult
  limit?: number
  offset?: number
}

export interface StartSessionInput {
  taskId: number
  agentName: string
}

export interface EndSessionInput {
  status: 'completed' | 'failed' | 'cancelled'
  exitCode?: number
  signal?: string
  dodResult?: DodResult
  artifacts?: string[]
  error?: SessionError
}

export interface SessionResult {
  session: Session
  durationMs: number
}

// ============================================
// SessionService
// ============================================

export class SessionService {
  constructor(private db: Db) {}

  /**
   * Start a new session for a task
   * Enforces 1 task = 1 session constraint
   */
  async start(input: StartSessionInput): Promise<Session> {
    // Check task exists
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1)

    if (!task) {
      throw new TaskNotFoundError(input.taskId)
    }

    // Check if task already has a session (UNIQUE constraint)
    const [existing] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.taskId, input.taskId))
      .limit(1)

    if (existing) {
      throw new SessionAlreadyExistsError(input.taskId)
    }

    // Create session
    const [session] = await this.db
      .insert(sessions)
      .values({
        taskId: input.taskId,
        agentName: input.agentName,
        status: 'running',
      })
      .returning()

    // Update task status to in_progress
    await this.db
      .update(tasks)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(tasks.id, input.taskId))

    return session
  }

  /**
   * End a running session
   */
  async end(sessionId: number, input: EndSessionInput): Promise<SessionResult> {
    const existing = await this.findById(sessionId)
    if (!existing) {
      throw new SessionNotFoundError(sessionId)
    }

    if (existing.status !== 'running') {
      throw new SessionAlreadyEndedError(sessionId)
    }

    const completedAt = new Date()
    const startedAt = existing.startedAt ?? new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    const [session] = await this.db
      .update(sessions)
      .set({
        status: input.status,
        completedAt,
        durationMs,
        exitCode: input.exitCode,
        signal: input.signal,
        dodResult: input.dodResult ?? 'pending',
        artifacts: input.artifacts ?? [],
        error: input.error ?? null,
      })
      .where(eq(sessions.id, sessionId))
      .returning()

    // Update task status based on session result
    if (existing.taskId) {
      const taskStatus = input.status === 'completed' ? 'done' :
                        input.status === 'failed' ? 'failed' :
                        'cancelled'

      await this.db
        .update(tasks)
        .set({ status: taskStatus, updatedAt: new Date() })
        .where(eq(tasks.id, existing.taskId))
    }

    return { session, durationMs }
  }

  /**
   * Find a session by ID
   */
  async findById(id: number): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    return session ?? null
  }

  /**
   * Find session by task ID
   */
  async findByTask(taskId: number): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.taskId, taskId))
      .limit(1)

    return session ?? null
  }

  /**
   * Find all sessions with optional filters
   */
  async findAll(filters: SessionFilters = {}): Promise<Session[]> {
    const conditions = []

    if (filters.taskId !== undefined) {
      conditions.push(eq(sessions.taskId, filters.taskId))
    }

    if (filters.agentName) {
      conditions.push(eq(sessions.agentName, filters.agentName))
    }

    if (filters.status) {
      conditions.push(eq(sessions.status, filters.status))
    }

    if (filters.dodResult) {
      conditions.push(eq(sessions.dodResult, filters.dodResult))
    }

    let query = this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.startedAt))

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query
    }

    return query
  }

  /**
   * Get running sessions
   */
  async findRunning(): Promise<Session[]> {
    return this.findAll({ status: 'running' })
  }

  /**
   * Update DoD result
   */
  async updateDodResult(sessionId: number, dodResult: DodResult): Promise<Session> {
    const existing = await this.findById(sessionId)
    if (!existing) {
      throw new SessionNotFoundError(sessionId)
    }

    const [session] = await this.db
      .update(sessions)
      .set({ dodResult })
      .where(eq(sessions.id, sessionId))
      .returning()

    return session
  }

  /**
   * Add artifacts to a session
   */
  async addArtifacts(sessionId: number, newArtifacts: string[]): Promise<Session> {
    const existing = await this.findById(sessionId)
    if (!existing) {
      throw new SessionNotFoundError(sessionId)
    }

    const artifacts = [...(existing.artifacts ?? []), ...newArtifacts]

    const [session] = await this.db
      .update(sessions)
      .set({ artifacts })
      .where(eq(sessions.id, sessionId))
      .returning()

    return session
  }

  /**
   * Count sessions by status
   */
  async countByStatus(): Promise<Record<SessionStatus, number>> {
    const results = await this.db
      .select({
        status: sessions.status,
        count: sql<number>`count(*)`,
      })
      .from(sessions)
      .groupBy(sessions.status)

    const counts: Record<SessionStatus, number> = {
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    for (const row of results) {
      counts[row.status as SessionStatus] = Number(row.count)
    }

    return counts
  }

  /**
   * Cleanup: delete session and reset task status
   */
  async cleanup(sessionId: number): Promise<void> {
    const existing = await this.findById(sessionId)
    if (!existing) {
      throw new SessionNotFoundError(sessionId)
    }

    // Delete session
    await this.db.delete(sessions).where(eq(sessions.id, sessionId))

    // Reset task status if task exists
    if (existing.taskId) {
      await this.db
        .update(tasks)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(tasks.id, existing.taskId))
    }
  }

  /**
   * Get session with task information
   */
  async findByIdWithTask(id: number): Promise<{ session: Session; task: typeof tasks.$inferSelect | null } | null> {
    const session = await this.findById(id)
    if (!session) {
      return null
    }

    let task = null
    if (session.taskId) {
      const [t] = await this.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, session.taskId))
        .limit(1)
      task = t ?? null
    }

    return { session, task }
  }
}
