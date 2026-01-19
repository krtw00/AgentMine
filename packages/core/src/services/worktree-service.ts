import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTMINE_DIR } from '../db/index.js'

// ============================================
// Types
// ============================================

export interface WorktreeInfo {
  /** Task ID */
  taskId: number
  /** Branch name */
  branchName: string
  /** Worktree path */
  path: string
  /** Whether the worktree exists */
  exists: boolean
}

export interface CreateWorktreeOptions {
  /** Task ID */
  taskId: number
  /** Base branch to create from (default: current branch) */
  baseBranch?: string
}

// ============================================
// Errors
// ============================================

export class WorktreeError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message)
    this.name = 'WorktreeError'
  }
}

export class WorktreeAlreadyExistsError extends WorktreeError {
  constructor(public readonly taskId: number, public readonly path: string) {
    super(`Worktree for task #${taskId} already exists at ${path}`)
    this.name = 'WorktreeAlreadyExistsError'
  }
}

export class WorktreeNotFoundError extends WorktreeError {
  constructor(public readonly taskId: number) {
    super(`Worktree for task #${taskId} not found`)
    this.name = 'WorktreeNotFoundError'
  }
}

// ============================================
// WorktreeService
// ============================================

export class WorktreeService {
  private projectRoot: string
  private worktreesDir: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.worktreesDir = join(projectRoot, AGENTMINE_DIR, 'worktrees')
  }

  /**
   * Get the worktrees directory path
   */
  getWorktreesDir(): string {
    return this.worktreesDir
  }

  /**
   * Get worktree path for a task
   */
  getWorktreePath(taskId: number): string {
    return join(this.worktreesDir, `task-${taskId}`)
  }

  /**
   * Get branch name for a task
   */
  getBranchName(taskId: number): string {
    return `task-${taskId}`
  }

  /**
   * Check if worktree exists for a task
   */
  exists(taskId: number): boolean {
    return existsSync(this.getWorktreePath(taskId))
  }

  /**
   * Get worktree info for a task
   */
  getInfo(taskId: number): WorktreeInfo {
    const path = this.getWorktreePath(taskId)
    const branchName = this.getBranchName(taskId)
    return {
      taskId,
      branchName,
      path,
      exists: existsSync(path),
    }
  }

  /**
   * List all worktrees
   */
  list(): WorktreeInfo[] {
    if (!existsSync(this.worktreesDir)) {
      return []
    }

    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      })

      const worktrees: WorktreeInfo[] = []
      const entries = output.split('\n\n').filter(Boolean)

      for (const entry of entries) {
        const lines = entry.split('\n')
        const worktreePath = lines.find(l => l.startsWith('worktree '))?.slice(9)
        const branch = lines.find(l => l.startsWith('branch '))?.slice(7)

        if (worktreePath && branch && worktreePath.includes('task-')) {
          const match = worktreePath.match(/task-(\d+)$/)
          if (match) {
            const taskId = parseInt(match[1])
            worktrees.push({
              taskId,
              branchName: branch.replace('refs/heads/', ''),
              path: worktreePath,
              exists: true,
            })
          }
        }
      }

      return worktrees
    } catch {
      return []
    }
  }

  /**
   * Create a worktree for a task
   */
  create(options: CreateWorktreeOptions): WorktreeInfo {
    const { taskId, baseBranch } = options
    const worktreePath = this.getWorktreePath(taskId)
    const branchName = this.getBranchName(taskId)

    // Check if already exists
    if (this.exists(taskId)) {
      throw new WorktreeAlreadyExistsError(taskId, worktreePath)
    }

    // Ensure worktrees directory exists
    if (!existsSync(this.worktreesDir)) {
      mkdirSync(this.worktreesDir, { recursive: true })
    }

    // Get base branch
    const base = baseBranch || this.getCurrentBranch()

    try {
      // Create worktree with new branch
      execSync(`git worktree add -b ${branchName} "${worktreePath}" ${base}`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      })

      return {
        taskId,
        branchName,
        path: worktreePath,
        exists: true,
      }
    } catch (error) {
      // Check if branch already exists
      if (error instanceof Error && error.message.includes('already exists')) {
        // Try to create worktree using existing branch
        try {
          execSync(`git worktree add "${worktreePath}" ${branchName}`, {
            cwd: this.projectRoot,
            encoding: 'utf-8',
            stdio: 'pipe',
          })

          return {
            taskId,
            branchName,
            path: worktreePath,
            exists: true,
          }
        } catch (innerError) {
          throw new WorktreeError(
            `Failed to create worktree: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`,
            { taskId, path: worktreePath }
          )
        }
      }

      throw new WorktreeError(
        `Failed to create worktree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { taskId, path: worktreePath }
      )
    }
  }

  /**
   * Remove a worktree for a task
   */
  remove(taskId: number, force: boolean = false): void {
    const worktreePath = this.getWorktreePath(taskId)

    if (!this.exists(taskId)) {
      throw new WorktreeNotFoundError(taskId)
    }

    try {
      const forceFlag = force ? '--force' : ''
      execSync(`git worktree remove ${forceFlag} "${worktreePath}"`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      })
    } catch (error) {
      throw new WorktreeError(
        `Failed to remove worktree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { taskId, path: worktreePath }
      )
    }
  }

  /**
   * Clean up all worktrees (prune stale entries)
   */
  prune(): void {
    try {
      execSync('git worktree prune', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      })
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get current branch name
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim()
    } catch {
      return 'main'
    }
  }
}
