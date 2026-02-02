// Project
export interface Project {
  id: number;
  name: string;
  repoPath: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
}

// Task
export type TaskStatus =
  | "open"
  | "blocked"
  | "ready"
  | "running"
  | "needs_review"
  | "done"
  | "failed"
  | "cancelled";

export interface Task {
  id: number;
  projectId: number;
  parentId: number | null;
  title: string;
  description: string | null;
  writeScope: string[];
  status: TaskStatus;
  reasons: string[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Run
export type RunStatus = "running" | "completed" | "failed" | "cancelled";

export interface Run {
  id: number;
  taskId: number;
  agentProfileId: number;
  status: RunStatus;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  cancelledAt: string | null;
  branchName: string;
  worktreePath: string;
  headSha: string | null;
  worktreeDirty: boolean | null;
}

// AgentProfile
export interface AgentProfile {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  runner: string;
  model: string | null;
  promptTemplate: string | null;
  defaultExclude: string[];
  defaultWriteScope: string[] | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Runner capabilities
export interface RunnerCapabilities {
  supportsModel: boolean;
  supportsNonInteractive: boolean;
  supportsPromptFileInclusion: boolean;
  availableModels: string[];
}

export interface Runner {
  name: string;
  displayName: string;
  capabilities: RunnerCapabilities;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
