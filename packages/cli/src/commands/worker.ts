import { Command } from 'commander'
import chalk from 'chalk'
import {
  createDb,
  isProjectInitialized,
  TaskService,
  SessionService,
  AgentService,
  TaskNotFoundError,
  AgentNotFoundError,
  type Task,
} from '@agentmine/core'

// ============================================
// Helpers
// ============================================

function ensureInitialized(): boolean {
  if (!isProjectInitialized()) {
    console.error(chalk.red('Error: agentmine not initialized'))
    console.log(chalk.gray('Run `agentmine init` first'))
    process.exit(3)
  }
  return true
}

function getServices() {
  const db = createDb()
  return {
    taskService: new TaskService(db),
    sessionService: new SessionService(db),
    agentService: new AgentService(),
  }
}

interface OutputOptions {
  json?: boolean
  quiet?: boolean
}

// ============================================
// Commands
// ============================================

export const workerCommand = new Command('worker')
  .description('Worker commands for task execution')

// worker command - Generate the command to run a task with an agent
workerCommand
  .command('command <taskId> <agentName>')
  .description('Generate the command to run a task with an agent')
  .option('--json', 'JSON output')
  .action(async (taskId, agentName, options: OutputOptions) => {
    ensureInitialized()
    const { taskService, agentService } = getServices()

    // Get task
    const task = await taskService.findById(parseInt(taskId))
    if (!task) {
      console.error(chalk.red(`Task #${taskId} not found`))
      process.exit(5)
    }

    // Get agent
    const agent = agentService.findByName(agentName)
    if (!agent) {
      console.error(chalk.red(`Agent "${agentName}" not found`))
      process.exit(5)
    }

    // Build prompt from task
    const prompt = buildPromptFromTask(task)

    // Build command
    const command = agentService.buildCommand(agent, prompt)

    if (options.json) {
      console.log(JSON.stringify({
        taskId: task.id,
        agentName: agent.name,
        command,
        prompt,
      }, null, 2))
    } else {
      console.log(command)
    }
  })

// worker prompt - Generate the prompt for a task
workerCommand
  .command('prompt <taskId>')
  .description('Generate the prompt for a task')
  .option('--json', 'JSON output')
  .action(async (taskId, options: OutputOptions) => {
    ensureInitialized()
    const { taskService } = getServices()

    // Get task
    const task = await taskService.findById(parseInt(taskId))
    if (!task) {
      console.error(chalk.red(`Task #${taskId} not found`))
      process.exit(5)
    }

    const prompt = buildPromptFromTask(task)

    if (options.json) {
      console.log(JSON.stringify({ taskId: task.id, prompt }))
    } else {
      console.log(prompt)
    }
  })

// worker context - Show context for a task (task info + subtasks + related info)
workerCommand
  .command('context <taskId>')
  .description('Show context for a task')
  .option('--json', 'JSON output')
  .action(async (taskId, options: OutputOptions) => {
    ensureInitialized()
    const { taskService, sessionService } = getServices()

    // Get task
    const task = await taskService.findById(parseInt(taskId))
    if (!task) {
      console.error(chalk.red(`Task #${taskId} not found`))
      process.exit(5)
    }

    // Get subtasks
    const subtasks = await taskService.getSubtasks(parseInt(taskId))

    // Get session if exists
    const session = await sessionService.findByTask(parseInt(taskId))

    // Get parent task if exists
    let parentTask = null
    if (task.parentId) {
      parentTask = await taskService.findById(task.parentId)
    }

    const context = {
      task,
      parentTask,
      subtasks,
      session,
    }

    if (options.json) {
      console.log(JSON.stringify(context, null, 2))
      return
    }

    console.log('')
    console.log(chalk.bold.cyan(`Task #${task.id}: ${task.title}`))
    console.log('')

    if (task.description) {
      console.log(chalk.gray('Description:'))
      console.log(task.description)
      console.log('')
    }

    console.log(chalk.gray('Status:  '), task.status)
    console.log(chalk.gray('Priority:'), task.priority)
    console.log(chalk.gray('Type:    '), task.type)

    if (parentTask) {
      console.log('')
      console.log(chalk.gray('Parent Task:'))
      console.log(chalk.gray(`  #${parentTask.id}: ${parentTask.title}`))
    }

    if (subtasks.length > 0) {
      console.log('')
      console.log(chalk.gray('Subtasks:'))
      subtasks.forEach(st => {
        const statusIcon = st.status === 'done' ? '✓' : st.status === 'in_progress' ? '→' : '○'
        console.log(chalk.gray(`  ${statusIcon} #${st.id}: ${st.title}`))
      })
    }

    if (session) {
      console.log('')
      console.log(chalk.gray('Session:'))
      console.log(chalk.gray(`  ID:     #${session.id}`))
      console.log(chalk.gray(`  Agent:  ${session.agentName}`))
      console.log(chalk.gray(`  Status: ${session.status}`))
    }

    console.log('')
  })

// worker run - Run a task with an agent (combines session start + command generation)
workerCommand
  .command('run <taskId> <agentName>')
  .description('Start a session and show the command to run (does not execute)')
  .option('--json', 'JSON output')
  .action(async (taskId, agentName, options: OutputOptions) => {
    ensureInitialized()
    const { taskService, sessionService, agentService } = getServices()

    // Get task
    const task = await taskService.findById(parseInt(taskId))
    if (!task) {
      console.error(chalk.red(`Task #${taskId} not found`))
      process.exit(5)
    }

    // Get agent
    const agent = agentService.findByName(agentName)
    if (!agent) {
      console.error(chalk.red(`Agent "${agentName}" not found`))
      process.exit(5)
    }

    // Start session
    try {
      const session = await sessionService.start({
        taskId: parseInt(taskId),
        agentName,
      })

      // Build prompt and command
      const prompt = buildPromptFromTask(task)
      const command = agentService.buildCommand(agent, prompt)

      if (options.json) {
        console.log(JSON.stringify({
          session,
          command,
          prompt,
        }, null, 2))
      } else {
        console.log(chalk.green('✓ Session started'), chalk.cyan(`#${session.id}`))
        console.log('')
        console.log(chalk.gray('Run the following command to execute the task:'))
        console.log('')
        console.log(chalk.white(command))
        console.log('')
        console.log(chalk.gray('When done, run:'))
        console.log(chalk.cyan(`  agentmine session end ${session.id} --status completed`))
      }
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        console.error(chalk.red(`Task #${taskId} not found`))
        process.exit(5)
      }
      throw error
    }
  })

// ============================================
// Prompt Building
// ============================================

function buildPromptFromTask(task: Task): string {
  const parts: string[] = []

  // Task header
  parts.push(`# Task #${task.id}: ${task.title}`)
  parts.push('')

  // Metadata
  parts.push(`Type: ${task.type}`)
  parts.push(`Priority: ${task.priority}`)
  parts.push('')

  // Description
  if (task.description) {
    parts.push('## Description')
    parts.push(task.description)
    parts.push('')
  }

  // Branch info
  if (task.branchName) {
    parts.push('## Branch')
    parts.push(`Work on branch: ${task.branchName}`)
    parts.push('')
  }

  // Instructions
  parts.push('## Instructions')
  parts.push('1. Implement the changes required for this task')
  parts.push('2. Ensure all tests pass')
  parts.push('3. Commit your changes with a descriptive message')
  parts.push('')

  return parts.join('\n')
}
