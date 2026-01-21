'use client'

import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/sessions': 'Sessions',
  '/agents': 'Agents',
  '/memory': 'Memory Bank',
  '/settings': 'Settings',
}

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  // Get page title from pathname
  const getPageTitle = () => {
    if (pageTitles[pathname]) return pageTitles[pathname]
    // Handle nested routes
    for (const [path, title] of Object.entries(pageTitles)) {
      if (path !== '/' && pathname.startsWith(path)) return title
    }
    return 'AgentMine'
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  )
}
