const API_BASE = "/api";

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T } | { error: { code: string; message: string } }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    return error;
  }

  return res.json();
}

// Projects
export const projectsApi = {
  list: () => fetchApi<Project[]>("/projects"),
  get: (id: number) => fetchApi<Project>(`/projects/${id}`),
  create: (data: CreateProjectInput) =>
    fetchApi<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Project>) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/projects/${id}`, { method: "DELETE" }),
};

// Tasks
export const tasksApi = {
  list: (projectId: number) => fetchApi<Task[]>(`/projects/${projectId}/tasks`),
  get: (id: number) => fetchApi<TaskDetail>(`/tasks/${id}`),
  create: (projectId: number, data: CreateTaskInput) =>
    fetchApi<Task>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Task>) =>
    fetchApi<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  cancel: (id: number) =>
    fetchApi<Task>(`/tasks/${id}/cancel`, { method: "POST" }),
};

// Agent Profiles
export const agentProfilesApi = {
  list: (projectId: number) =>
    fetchApi<AgentProfile[]>(`/projects/${projectId}/agent-profiles`),
  get: (id: number) => fetchApi<AgentProfileDetail>(`/agent-profiles/${id}`),
  create: (projectId: number, data: CreateAgentProfileInput) =>
    fetchApi<AgentProfile>(`/projects/${projectId}/agent-profiles`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<CreateAgentProfileInput>) =>
    fetchApi<AgentProfile>(`/agent-profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/agent-profiles/${id}`, { method: "DELETE" }),
};

// Runs
export const runsApi = {
  list: (taskId: number) => fetchApi<Run[]>(`/tasks/${taskId}/runs`),
  listAll: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return fetchApi<Run[]>(`/runs${qs}`);
  },
  get: (id: number) => fetchApi<RunDetail>(`/runs/${id}`),
  create: (taskId: number, agentProfileId: number) =>
    fetchApi<Run>(`/tasks/${taskId}/runs`, {
      method: "POST",
      body: JSON.stringify({ agentProfileId }),
    }),
  stop: (id: number) => fetchApi<Run>(`/runs/${id}/stop`, { method: "POST" }),
  getLogs: (id: number) => fetchApi<RunLogLine[]>(`/runs/${id}/logs`),
  retry: (id: number) => fetchApi<Run>(`/runs/${id}/retry`, { method: "POST" }),
  continue: (id: number, additionalInput: string) =>
    fetchApi<Run>(`/runs/${id}/continue`, {
      method: "POST",
      body: JSON.stringify({ additionalInput }),
    }),
};

// Runners
export const runnersApi = {
  list: () => fetchApi<Runner[]>("/runners"),
};

// Orchestrate
export const orchestrateApi = {
  start: (projectId: number, data: { command: string; agentProfileId: number }) =>
    fetchApi<{ parentTaskId: number; coordinatorRunId: number }>(
      `/projects/${projectId}/orchestrate`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// Settings
export const settingsApi = {
  get: (projectId: number) =>
    fetchApi<Setting[]>(`/projects/${projectId}/settings`),
  update: (projectId: number, key: string, value: unknown) =>
    fetchApi<Setting>(`/projects/${projectId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    }),
};

// Types
export interface Project {
  id: number;
  name: string;
  repoPath: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  repoPath: string;
  baseBranch: string;
}

export interface Task {
  id: number;
  projectId: number;
  parentId: number | null;
  title: string;
  description: string | null;
  writeScope: string[];
  status: string;
  reasons: string[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  dependencies: { taskId: number; title: string; status: string }[];
  latestRun: { id: number; status: string; startedAt: string; finishedAt: string | null } | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  writeScope: string[];
  parentId?: number;
  dependsOn?: number[];
}

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

export interface AgentProfileDetail extends AgentProfile {
  runnerCapabilities: RunnerCapabilities | null;
}

export interface CreateAgentProfileInput {
  name: string;
  description?: string;
  runner: string;
  model?: string;
  promptTemplate?: string;
  defaultExclude?: string[];
  defaultWriteScope?: string[];
  config?: Record<string, unknown>;
}

export interface Run {
  id: number;
  taskId: number;
  agentProfileId: number;
  status: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  cancelledAt: string | null;
  branchName: string;
  worktreePath: string;
  headSha: string | null;
  worktreeDirty: boolean | null;
  dodStatus?: string;
  scopeViolationCount?: number;
  role?: string | null;
}

export interface RunLogLine {
  type: "stdout" | "stderr" | "exit";
  data?: string;
  exitCode?: number;
  timestamp: string;
}

export interface RunDetail extends Run {
  taskTitle: string;
  agentProfileName: string;
  checks: Check[];
  scopeViolations: ScopeViolation[];
}

export interface Check {
  id: number;
  runId: number;
  checkKey: string;
  label: string;
  kind: string;
  status: string;
  exitCode: number | null;
  outputRef: string | null;
}

export interface ScopeViolation {
  id: number;
  runId: number;
  path: string;
  reason: string;
  approvedStatus: string;
  decidedAt: string | null;
}

export interface Runner {
  name: string;
  displayName: string;
  capabilities: RunnerCapabilities;
}

export interface RunnerCapabilities {
  supportsModel: boolean;
  supportsNonInteractive: boolean;
  supportsPromptFileInclusion: boolean;
  availableModels: string[];
}

export interface Setting {
  id: number;
  projectId: number;
  key: string;
  value: unknown;
}
