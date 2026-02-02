import { spawn, ChildProcess } from "child_process";
import type {
  RunnerAdapter,
  RunStartOptions,
  RunHandle,
  RunOutputHandler,
} from "./types";

export class CodexAdapter implements RunnerAdapter {
  name = "codex";
  displayName = "Codex CLI";
  capabilities = {
    supportsModel: false,
    supportsNonInteractive: true,
    supportsPromptFileInclusion: false,
    availableModels: [],
  };

  private processes = new Map<number, ChildProcess>();
  private outputHandler?: RunOutputHandler;

  setOutputHandler(handler: RunOutputHandler) {
    this.outputHandler = handler;
  }

  async start(options: RunStartOptions): Promise<RunHandle> {
    const { runId, worktreePath, prompt, env } = options;

    const args = [
      "--approval-policy",
      "never",
      "--sandbox",
      "danger-full-access",
      "--cwd",
      worktreePath,
      prompt,
    ];

    const proc = spawn("codex", args, {
      cwd: worktreePath,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.processes.set(runId, proc);

    proc.stdout?.on("data", (data: Buffer) => {
      this.outputHandler?.({
        type: "stdout",
        data: data.toString(),
        timestamp: new Date().toISOString(),
      });
    });

    proc.stderr?.on("data", (data: Buffer) => {
      this.outputHandler?.({
        type: "stderr",
        data: data.toString(),
        timestamp: new Date().toISOString(),
      });
    });

    proc.on("exit", (code) => {
      this.processes.delete(runId);
      this.outputHandler?.({
        type: "exit",
        exitCode: code ?? 1,
        timestamp: new Date().toISOString(),
      });
    });

    return {
      runId,
      pid: proc.pid!,
      kill: () => proc.kill("SIGTERM"),
    };
  }

  async stop(handle: RunHandle): Promise<void> {
    const proc = this.processes.get(handle.runId);
    if (!proc) return;

    proc.kill("SIGTERM");

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      proc.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
