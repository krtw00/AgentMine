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
    const { runId, worktreePath, prompt, model, env, config } = options;

    const args = [
      "--print",
      "--dangerously-skip-permissions",
      "--verbose",
      "--output-format",
      "stream-json",
    ];

    if (model) {
      args.push("--model", model);
    }

    // config からツール設定を適用
    if (config?.tools && Array.isArray(config.tools) && config.tools.length > 0) {
      for (const tool of config.tools as string[]) {
        args.push("--tools", tool);
      }
    }
    if (config?.disallowedTools && Array.isArray(config.disallowedTools) && config.disallowedTools.length > 0) {
      for (const tool of config.disallowedTools as string[]) {
        args.push("--disallowedTools", tool);
      }
    }
    if (config?.appendSystemPrompt && typeof config.appendSystemPrompt === "string") {
      args.push("--append-system-prompt", config.appendSystemPrompt);
    }

    args.push(prompt);

    const proc = spawn("claude", args, {
      cwd: worktreePath,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.processes.set(runId, proc);

    proc.stdout?.on("data", (data: Buffer) => {
      this.outputHandler?.(runId, {
        type: "stdout",
        data: data.toString(),
        timestamp: new Date().toISOString(),
      });
    });

    proc.stderr?.on("data", (data: Buffer) => {
      this.outputHandler?.(runId, {
        type: "stderr",
        data: data.toString(),
        timestamp: new Date().toISOString(),
      });
    });

    proc.on("exit", (code) => {
      this.processes.delete(runId);
      this.outputHandler?.(runId, {
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
