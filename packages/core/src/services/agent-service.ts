import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { AGENTMINE_DIR } from '../db/index.js'
import type { AgentDefinition } from '../db/schema.js'
import {
  AgentNotFoundError,
  AgentAlreadyExistsError,
  InvalidAgentDefinitionError,
} from '../errors.js'

// Re-export errors for convenience
export {
  AgentNotFoundError,
  AgentAlreadyExistsError,
  InvalidAgentDefinitionError,
} from '../errors.js'

// ============================================
// Types
// ============================================

export interface CreateAgentInput {
  name: string
  description?: string
  client: string
  model: string
  scope?: {
    read?: string[]
    write?: string[]
    exclude?: string[]
  }
  config?: {
    temperature?: number
    maxTokens?: number
    promptFile?: string
  }
}

export interface UpdateAgentInput {
  description?: string
  client?: string
  model?: string
  scope?: {
    read?: string[]
    write?: string[]
    exclude?: string[]
  }
  config?: {
    temperature?: number
    maxTokens?: number
    promptFile?: string
  }
}

// ============================================
// AgentService
// ============================================

export class AgentService {
  private agentsDir: string

  constructor(projectRoot: string = process.cwd()) {
    this.agentsDir = join(projectRoot, AGENTMINE_DIR, 'agents')
  }

  /**
   * Get the agents directory path
   */
  getAgentsDir(): string {
    return this.agentsDir
  }

  /**
   * Check if agents directory exists
   */
  isInitialized(): boolean {
    return existsSync(this.agentsDir)
  }

  /**
   * Find all agents
   */
  findAll(): AgentDefinition[] {
    if (!this.isInitialized()) {
      return []
    }

    const files = readdirSync(this.agentsDir).filter(f => f.endsWith('.yaml'))
    return files.map(f => {
      const content = readFileSync(join(this.agentsDir, f), 'utf-8')
      return this.parseAgent(content, f)
    })
  }

  /**
   * Find agent by name
   */
  findByName(name: string): AgentDefinition | null {
    const filePath = join(this.agentsDir, `${name}.yaml`)

    if (!existsSync(filePath)) {
      return null
    }

    const content = readFileSync(filePath, 'utf-8')
    return this.parseAgent(content, `${name}.yaml`)
  }

  /**
   * Create a new agent
   */
  create(input: CreateAgentInput): AgentDefinition {
    const filePath = join(this.agentsDir, `${input.name}.yaml`)

    if (existsSync(filePath)) {
      throw new AgentAlreadyExistsError(input.name)
    }

    const defaultScope = {
      read: ['**/*'],
      write: ['**/*'],
      exclude: ['node_modules/**', '.git/**'],
    }

    const agent: AgentDefinition = {
      name: input.name,
      description: input.description,
      client: input.client,
      model: input.model,
      scope: {
        read: input.scope?.read ?? defaultScope.read,
        write: input.scope?.write ?? defaultScope.write,
        exclude: input.scope?.exclude ?? defaultScope.exclude,
      },
      config: input.config,
    }

    writeFileSync(filePath, stringify(agent), 'utf-8')
    return agent
  }

  /**
   * Update an agent
   */
  update(name: string, input: UpdateAgentInput): AgentDefinition {
    const existing = this.findByName(name)
    if (!existing) {
      throw new AgentNotFoundError(name)
    }

    const updated: AgentDefinition = {
      ...existing,
      description: input.description ?? existing.description,
      client: input.client ?? existing.client,
      model: input.model ?? existing.model,
      scope: input.scope ? {
        read: input.scope.read ?? existing.scope.read,
        write: input.scope.write ?? existing.scope.write,
        exclude: input.scope.exclude ?? existing.scope.exclude,
      } : existing.scope,
      config: input.config ?? existing.config,
    }

    const filePath = join(this.agentsDir, `${name}.yaml`)
    writeFileSync(filePath, stringify(updated), 'utf-8')
    return updated
  }

  /**
   * Delete an agent
   */
  delete(name: string): void {
    const filePath = join(this.agentsDir, `${name}.yaml`)

    if (!existsSync(filePath)) {
      throw new AgentNotFoundError(name)
    }

    unlinkSync(filePath)
  }

  /**
   * Get agent file path
   */
  getFilePath(name: string): string {
    return join(this.agentsDir, `${name}.yaml`)
  }

  /**
   * Validate agent definition
   */
  validate(agent: AgentDefinition): void {
    if (!agent.name || typeof agent.name !== 'string') {
      throw new InvalidAgentDefinitionError(agent.name ?? 'unknown', 'name is required')
    }

    if (!agent.client || typeof agent.client !== 'string') {
      throw new InvalidAgentDefinitionError(agent.name, 'client is required')
    }

    if (!agent.model || typeof agent.model !== 'string') {
      throw new InvalidAgentDefinitionError(agent.name, 'model is required')
    }

    if (agent.scope) {
      if (agent.scope.read && !Array.isArray(agent.scope.read)) {
        throw new InvalidAgentDefinitionError(agent.name, 'scope.read must be an array')
      }
      if (agent.scope.write && !Array.isArray(agent.scope.write)) {
        throw new InvalidAgentDefinitionError(agent.name, 'scope.write must be an array')
      }
      if (agent.scope.exclude && !Array.isArray(agent.scope.exclude)) {
        throw new InvalidAgentDefinitionError(agent.name, 'scope.exclude must be an array')
      }
    }
  }

  /**
   * Get prompt file content for an agent
   * Returns null if promptFile is not specified or file doesn't exist
   */
  getPromptFileContent(agent: AgentDefinition): string | null {
    if (!agent.config?.promptFile) {
      return null
    }

    // promptFile is relative to agents directory
    const promptPath = join(this.agentsDir, '..', agent.config.promptFile)

    if (!existsSync(promptPath)) {
      return null
    }

    return readFileSync(promptPath, 'utf-8')
  }

  /**
   * Build command for running an agent
   * Returns the command string to execute the agent
   */
  buildCommand(agent: AgentDefinition, prompt: string): string {
    const client = agent.client.toLowerCase()

    switch (client) {
      case 'claude-code':
        return this.buildClaudeCodeCommand(agent, prompt)
      case 'codex':
        return this.buildCodexCommand(agent, prompt)
      case 'gemini':
        return this.buildGeminiCommand(agent, prompt)
      default:
        // Generic command - assume CLI tool with same name
        return `${client} "${prompt.replace(/"/g, '\\"')}"`
    }
  }

  private buildClaudeCodeCommand(agent: AgentDefinition, prompt: string): string {
    const parts = ['claude']

    // Add model flag if specified
    if (agent.model) {
      parts.push(`--model ${agent.model}`)
    }

    // Add prompt
    parts.push(`"${prompt.replace(/"/g, '\\"')}"`)

    return parts.join(' ')
  }

  private buildCodexCommand(agent: AgentDefinition, prompt: string): string {
    const parts = ['codex']

    // Add model flag if specified
    if (agent.model) {
      parts.push(`-m ${agent.model}`)
    }

    // Add prompt
    parts.push(`"${prompt.replace(/"/g, '\\"')}"`)

    return parts.join(' ')
  }

  private buildGeminiCommand(agent: AgentDefinition, prompt: string): string {
    const parts = ['gemini']

    // Add model flag if specified
    if (agent.model) {
      parts.push(`-m ${agent.model}`)
    }

    // Add prompt
    parts.push(`"${prompt.replace(/"/g, '\\"')}"`)

    return parts.join(' ')
  }

  /**
   * Parse YAML content into AgentDefinition
   */
  private parseAgent(content: string, filename: string): AgentDefinition {
    try {
      const agent = parse(content) as AgentDefinition
      this.validate(agent)
      return agent
    } catch (error) {
      if (error instanceof InvalidAgentDefinitionError) {
        throw error
      }
      throw new InvalidAgentDefinitionError(
        filename.replace('.yaml', ''),
        error instanceof Error ? error.message : 'parse error'
      )
    }
  }
}
