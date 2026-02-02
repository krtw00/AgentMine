import { spawn, ChildProcess } from "child_process";
import type {
  RunnerAdapter,
  RunStartOptions,
  RunHandle,
  RunOutputHandler,
} from "./types";

export class ClaudeAdapter implements RunnerAdapter {
  name = "claude";
  displayName = "Claude CLI";
  capabilities = {
    supportsModel: true,
    supportsNonInteractive: true,
    supportsPromptFileInclusion: true,
    availableModels: ["sonnet", "opus", "haiku"],
  };

  private processes = new Map<number, ChildProcess>();
  private outputHandler?: RunOutputHandler;

  setOutputHandler(handler: RunOutputHandler) {
    this.outputHandler = handler;
  }

  async start(options: RunStartOptions): Promise<RunHandle> {
    const { runId, worktreePath, prompt, model, env } = options;

    const args = [
      "--print",
      "--dangerously-skip-permissions",
      "--output-format",
      "stream-json",
    ];

    if (model) {
      args.push("--model", model);
    }

    args.push(prompt);

    const proc = spawn("claude", args, {
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

    // 5秒待ってもまだ動いていればSIGKILL
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
