import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import {
  isProjectInitialized,
  MemoryService,
  MemoryNotFoundError,
  MemoryAlreadyExistsError,
  type MemoryEntry,
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

function getMemoryService(): MemoryService {
  return new MemoryService()
}

interface OutputOptions {
  json?: boolean
  quiet?: boolean
}

function formatEntry(entry: MemoryEntry, options: OutputOptions): string {
  if (options.json) {
    return JSON.stringify(entry)
  }
  if (options.quiet) {
    return entry.path
  }
  return `${entry.path} (${entry.category})`
}

function formatEntryList(entries: MemoryEntry[], options: OutputOptions): void {
  if (options.json) {
    console.log(JSON.stringify(entries, null, 2))
    return
  }

  if (options.quiet) {
    entries.forEach(e => console.log(e.path))
    return
  }

  if (entries.length === 0) {
    console.log(chalk.gray('No memory entries found.'))
    console.log(chalk.gray('Add one with:'))
    console.log(chalk.cyan('  agentmine memory add <path> <content>'))
    return
  }

  const table = new Table({
    head: [
      chalk.white('Path'),
      chalk.white('Category'),
      chalk.white('Title'),
      chalk.white('Updated'),
    ],
    style: { head: [], border: [] },
  })

  for (const entry of entries) {
    table.push([
      chalk.cyan(entry.path),
      entry.category,
      entry.title,
      entry.updatedAt.toLocaleDateString(),
    ])
  }

  console.log(table.toString())
}

// ============================================
// Commands
// ============================================

export const memoryCommand = new Command('memory')
  .description('Manage Memory Bank entries')

// memory list
memoryCommand
  .command('list')
  .description('List memory entries')
  .option('-c, --category <category>', 'Filter by category')
  .option('--json', 'JSON output')
  .option('--quiet', 'Minimal output (paths only)')
  .action(async (options) => {
    ensureInitialized()
    const service = getMemoryService()

    const entries = service.list({ category: options.category })
    formatEntryList(entries, options)
  })

// memory show
memoryCommand
  .command('show <path>')
  .description('Show memory entry content')
  .option('--json', 'JSON output')
  .action(async (path, options) => {
    ensureInitialized()
    const service = getMemoryService()

    const entry = service.get(path)

    if (!entry) {
      console.error(chalk.red(`Memory entry "${path}" not found`))
      process.exit(5)
    }

    if (options.json) {
      console.log(JSON.stringify(entry, null, 2))
      return
    }

    console.log('')
    console.log(chalk.cyan(entry.path), chalk.gray(`(${entry.category})`))
    console.log(chalk.gray('Title:  '), entry.title)
    console.log(chalk.gray('Updated:'), entry.updatedAt.toISOString())
    console.log('')
    console.log(entry.content)
  })

// memory add
memoryCommand
  .command('add <path>')
  .description('Add a new memory entry')
  .option('-c, --content <content>', 'Content (or use stdin)')
  .option('-f, --file <file>', 'Read content from file')
  .option('--json', 'JSON output')
  .option('--quiet', 'Minimal output')
  .action(async (path, options) => {
    ensureInitialized()
    const service = getMemoryService()

    let content = options.content || ''

    // Read from file if specified
    if (options.file) {
      const { readFileSync, existsSync } = await import('fs')
      if (!existsSync(options.file)) {
        console.error(chalk.red(`File not found: ${options.file}`))
        process.exit(5)
      }
      content = readFileSync(options.file, 'utf-8')
    }

    // If no content provided, show error
    if (!content) {
      console.error(chalk.red('Content is required. Use -c or -f option.'))
      process.exit(2)
    }

    try {
      const entry = service.create({ path, content })

      if (options.json) {
        console.log(JSON.stringify(entry))
      } else if (options.quiet) {
        console.log(entry.path)
      } else {
        console.log(chalk.green('✓ Created memory entry'), chalk.cyan(path))
      }
    } catch (error) {
      if (error instanceof MemoryAlreadyExistsError) {
        console.error(chalk.red(`Memory entry "${path}" already exists`))
        console.log(chalk.gray('Use `agentmine memory edit` to update'))
        process.exit(6)
      }
      throw error
    }
  })

// memory edit
memoryCommand
  .command('edit <path>')
  .description('Edit a memory entry')
  .option('-c, --content <content>', 'New content')
  .option('-f, --file <file>', 'Read content from file')
  .option('--json', 'JSON output')
  .option('--quiet', 'Minimal output')
  .action(async (path, options) => {
    ensureInitialized()
    const service = getMemoryService()

    let content = options.content

    // Read from file if specified
    if (options.file) {
      const { readFileSync, existsSync } = await import('fs')
      if (!existsSync(options.file)) {
        console.error(chalk.red(`File not found: ${options.file}`))
        process.exit(5)
      }
      content = readFileSync(options.file, 'utf-8')
    }

    if (!content) {
      // Show file path for manual editing
      const fullPath = service.getMemoryDir() + '/' + path
      console.log(chalk.gray('Edit memory entry at:'))
      console.log(chalk.cyan(fullPath))
      return
    }

    try {
      const entry = service.update(path, { content })

      if (options.json) {
        console.log(JSON.stringify(entry))
      } else if (options.quiet) {
        console.log(entry.path)
      } else {
        console.log(chalk.green('✓ Updated memory entry'), chalk.cyan(path))
      }
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        console.error(chalk.red(`Memory entry "${path}" not found`))
        process.exit(5)
      }
      throw error
    }
  })

// memory remove
memoryCommand
  .command('remove <path>')
  .alias('rm')
  .description('Remove a memory entry')
  .option('--json', 'JSON output')
  .option('--quiet', 'Minimal output')
  .action(async (path, options) => {
    ensureInitialized()
    const service = getMemoryService()

    try {
      service.delete(path)

      if (options.json) {
        console.log(JSON.stringify({ deleted: true, path }))
      } else if (options.quiet) {
        console.log(path)
      } else {
        console.log(chalk.green('✓ Removed memory entry'), chalk.cyan(path))
      }
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        console.error(chalk.red(`Memory entry "${path}" not found`))
        process.exit(5)
      }
      throw error
    }
  })

// memory preview
memoryCommand
  .command('preview')
  .description('Generate preview for AI consumption')
  .option('--compact', 'Compact format (titles and first lines only)')
  .option('--json', 'JSON output')
  .action(async (options) => {
    ensureInitialized()
    const service = getMemoryService()

    if (options.compact) {
      const preview = service.previewCompact()
      if (options.json) {
        console.log(JSON.stringify({ preview }))
      } else {
        console.log(preview)
      }
    } else {
      const preview = service.preview()
      if (options.json) {
        console.log(JSON.stringify({ preview }))
      } else {
        console.log(preview)
      }
    }
  })

// memory categories
memoryCommand
  .command('categories')
  .description('List available categories')
  .option('--json', 'JSON output')
  .action(async (options) => {
    ensureInitialized()
    const service = getMemoryService()

    const categories = service.getCategories()

    if (options.json) {
      console.log(JSON.stringify(categories))
      return
    }

    if (categories.length === 0) {
      console.log(chalk.gray('No categories found.'))
      return
    }

    console.log(chalk.bold('Categories:'))
    categories.forEach(c => console.log(chalk.cyan(`  ${c}`)))
  })
