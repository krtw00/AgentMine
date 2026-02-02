export interface RunnerCapabilities {
  supportsModel: boolean;
  supportsNonInteractive: boolean;
  supportsPromptFileInclusion: boolean;
  availableModels: string[];
}

export interface RunnerAdapter {
  name: string;
  displayName: string;
  capabilities: RunnerCapabilities;

  start(options: RunStartOptions): Promise<RunHandle>;
  stop(handle: RunHandle): Promise<void>;
}

export interface RunStartOptions {
  runId: number;
  worktreePath: string;
  prompt: string;
  model?: string;
  env?: Record<string, string>;
}

export interface RunHandle {
  runId: number;
  pid: number;
  kill: () => void;
}

export interface RunOutput {
  type: "stdout" | "stderr" | "exit";
  data?: string;
  exitCode?: number;
  timestamp: string;
}

export type RunOutputHandler = (output: RunOutput) => void;
