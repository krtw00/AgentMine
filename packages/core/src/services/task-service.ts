import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import type { Db } from '../db/index.js'
import {
  tasks,
  type Task,
  type NewTask,
  type TaskStatus,
  type TaskPriority,
  type TaskType,
  type AssigneeType,
} from '../db/schema.js'
import { TaskNotFoundError, CircularDependencyError } from '../errors.js'

// Re-export errors for convenience
export { TaskNotFoundError, CircularDependencyError } from '../errors.js'

// ============================================
// Types
// ============================================

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  assigneeType?: AssigneeType
  assigneeName?: string
  parentId?: number | null
  unassigned?: boolean
  limit?: number
  offset?: number
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  type?: TaskType
  assigneeType?: AssigneeType
  assigneeName?: string
  parentId?: number
  projectId?: number
  complexity?: number
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  assigneeType?: AssigneeType | null
  assigneeName?: string | null
  parentId?: number | null
  selectedSessionId?: number | null
  labels?: string[]
  complexity?: number | null
}

// ============================================
// TaskService
// ============================================

export class TaskService {
  constructor(private db: Db) {}

  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<Task> {
    // Validate parent exists if specified
    if (input.parentId) {
      const parent = await this.findById(input.parentId)
      if (!parent) {
        throw new TaskNotFoundError(input.parentId)
      }
    }

    const [task] = await this.db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'medium',
        type: input.type ?? 'task',
        assigneeType: input.assigneeType,
        assigneeName: input.assigneeName,
        parentId: input.parentId,
        projectId: input.projectId,
        complexity: input.complexity,
      })
      .returning()

    return task
  }

  /**
   * Find a task by ID
   */
  async findById(id: number): Promise<Task | null> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1)

    return task ?? null
  }

  /**
   * Find all tasks with optional filters
   */
  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    const conditions = []

    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status))
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority))
    }

    if (filters.type) {
      conditions.push(eq(tasks.type, filters.type))
    }

    if (filters.assigneeType) {
      conditions.push(eq(tasks.assigneeType, filters.assigneeType))
    }

    if (filters.assigneeName) {
      conditions.push(eq(tasks.assigneeName, filters.assigneeName))
    }

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(tasks.parentId))
      } else {
        conditions.push(eq(tasks.parentId, filters.parentId))
      }
    }

    if (filters.unassigned) {
      conditions.push(isNull(tasks.assigneeType))
    }

    let query = this.db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt))

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
   * Update a task
   */
  async update(id: number, input: UpdateTaskInput): Promise<Task> {
    // Check task exists
    const existing = await this.findById(id)
    if (!existing) {
      throw new TaskNotFoundError(id)
    }

    // Validate parent if being changed
    if (input.parentId !== undefined && input.parentId !== null) {
      // Check parent exists
      const parent = await this.findById(input.parentId)
      if (!parent) {
        throw new TaskNotFoundError(input.parentId)
      }

      // Check for circular dependency
      if (await this.wouldCreateCycle(id, input.parentId)) {
        throw new CircularDependencyError(id, input.parentId)
      }
    }

    const [task] = await this.db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()

    return task
  }

  /**
   * Delete a task
   */
  async delete(id: number): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new TaskNotFoundError(id)
    }

    await this.db.delete(tasks).where(eq(tasks.id, id))
  }

  /**
   * Get subtasks of a task
   */
  async getSubtasks(parentId: number): Promise<Task[]> {
    return this.findAll({ parentId })
  }

  /**
   * Count tasks by status
   */
  async countByStatus(): Promise<Record<TaskStatus, number>> {
    const results = await this.db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)`,
      })
      .from(tasks)
      .groupBy(tasks.status)

    const counts: Record<TaskStatus, number> = {
      open: 0,
      in_progress: 0,
      done: 0,
      failed: 0,
      dod_failed: 0,
      cancelled: 0,
    }

    for (const row of results) {
      counts[row.status as TaskStatus] = Number(row.count)
    }

    return counts
  }

  /**
   * Select a session as the winner for this task
   */
  async selectSession(taskId: number, sessionId: number): Promise<Task> {
    const existing = await this.findById(taskId)
    if (!existing) {
      throw new TaskNotFoundError(taskId)
    }

    return this.update(taskId, {
      selectedSessionId: sessionId,
      status: 'done',
    })
  }

  /**
   * Check if setting a parent would create a circular dependency
   */
  private async wouldCreateCycle(taskId: number, parentId: number): Promise<boolean> {
    // If trying to set itself as parent
    if (taskId === parentId) {
      return true
    }

    // Traverse up the parent chain
    let currentId: number | null = parentId
    const visited = new Set<number>()

    while (currentId !== null) {
      if (currentId === taskId || visited.has(currentId)) {
        return true
      }

      visited.add(currentId)

      const [parent] = await this.db
        .select({ parentId: tasks.parentId })
        .from(tasks)
        .where(eq(tasks.id, currentId))
        .limit(1)

      currentId = parent?.parentId ?? null
    }

    return false
  }
}
