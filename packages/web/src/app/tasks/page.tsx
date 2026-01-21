'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Ban,
} from 'lucide-react'

interface Task {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  assigneeType: string | null
  assigneeName: string | null
  labels: string[]
  createdAt: string | null
  updatedAt: string | null
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline' }> = {
  open: { label: 'Open', icon: Circle, variant: 'secondary' },
  in_progress: { label: 'In Progress', icon: Clock, variant: 'warning' },
  done: { label: 'Done', icon: CheckCircle2, variant: 'success' },
  failed: { label: 'Failed', icon: XCircle, variant: 'destructive' },
  dod_failed: { label: 'DoD Failed', icon: AlertCircle, variant: 'destructive' },
  cancelled: { label: 'Cancelled', icon: Ban, variant: 'outline' },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  high: { label: 'High', className: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'Medium', className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Low', className: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30' },
}

const typeConfig: Record<string, { label: string; className: string }> = {
  task: { label: 'Task', className: 'text-blue-600' },
  feature: { label: 'Feature', className: 'text-purple-600' },
  bug: { label: 'Bug', className: 'text-red-600' },
  refactor: { label: 'Refactor', className: 'text-green-600' },
}

function TaskStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.medium
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  })
}

function TasksContent() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setTasks(json)
      } catch (e) {
        setError('Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (statusFilter && task.status !== statusFilter) {
        return false
      }
      if (priorityFilter && task.priority !== priorityFilter) {
        return false
      }
      if (typeFilter && task.type !== typeFilter) {
        return false
      }
      return true
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, typeFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const task of tasks) {
      counts[task.status] = (counts[task.status] || 0) + 1
    }
    return counts
  }, [tasks])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter:</span>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All ({tasks.length})
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            >
              {config.label} ({statusCounts[key] || 0})
            </Button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}
            </p>
            {tasks.length === 0 && (
              <Button className="mt-4" asChild>
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">#{task.id}</span>
                        <span className={`text-xs font-medium ${typeConfig[task.type]?.className || ''}`}>
                          {typeConfig[task.type]?.label || task.type}
                        </span>
                      </div>
                      <h3 className="font-medium truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {task.assigneeName && (
                          <span>
                            {task.assigneeType === 'ai' ? '🤖' : '👤'} {task.assigneeName}
                          </span>
                        )}
                        <span>Updated {formatDate(task.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    }>
      <TasksContent />
    </Suspense>
  )
}
