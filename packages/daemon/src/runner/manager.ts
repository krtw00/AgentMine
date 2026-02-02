import { ClaudeAdapter } from "./claude-adapter";
import { CodexAdapter } from "./codex-adapter";
import type { RunnerAdapter, RunHandle, RunOutput, RunOutputHandler } from "./types";
import { db } from "../db";
import { runs, eq } from "@agentmine/db";
import { eventEmitter } from "../events/emitter";

class RunnerManager {
  private adapters: Map<string, RunnerAdapter> = new Map();
  private handles: Map<number, RunHandle> = new Map();

  constructor() {
    const claude = new ClaudeAdapter();
    const codex = new CodexAdapter();

    claude.setOutputHandler((output) => this.handleOutput(output));
    codex.setOutputHandler((output) => this.handleOutput(output));

    this.adapters.set("claude", claude);
    this.adapters.set("codex", codex);
  }

  private currentRunId: number | null = null;

  private handleOutput(output: RunOutput) {
    if (this.currentRunId === null) return;

    const runId = this.currentRunId;

    // イベント発行
    eventEmitter.emit("run.output", {
      runId,
      ...output,
    });

    // 終了時はDBを更新
    if (output.type === "exit") {
      this.onRunExit(runId, output.exitCode ?? 1);
    }
  }

  private async onRunExit(runId: number, exitCode: number) {
    const now = new Date().toISOString();
    const status = exitCode === 0 ? "completed" : "failed";

    await db
      .update(runs)
      .set({
        status,
        exitCode,
        finishedAt: now,
      })
      .where(eq(runs.id, runId));

    this.handles.delete(runId);
    this.currentRunId = null;

    eventEmitter.emit("run.finished", { runId, status, exitCode });
  }

  getAdapter(name: string): RunnerAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): RunnerAdapter[] {
    return Array.from(this.adapters.values());
  }

  async start(
    runId: number,
    runner: string,
    worktreePath: string,
    prompt: string,
    model?: string
  ): Promise<RunHandle | null> {
    const adapter = this.adapters.get(runner);
    if (!adapter) return null;

    this.currentRunId = runId;

    const handle = await adapter.start({
      runId,
      worktreePath,
      prompt,
      model,
    });

    this.handles.set(runId, handle);

    eventEmitter.emit("run.started", { runId });

    return handle;
  }

  async stop(runId: number): Promise<void> {
    const handle = this.handles.get(runId);
    if (!handle) return;

    const adapter = this.adapters.get("claude") || this.adapters.get("codex");
    if (adapter) {
      await adapter.stop(handle);
    }

    const now = new Date().toISOString();
    await db
      .update(runs)
      .set({
        status: "cancelled",
        cancelledAt: now,
      })
      .where(eq(runs.id, runId));

    this.handles.delete(runId);
    this.currentRunId = null;

    eventEmitter.emit("run.cancelled", { runId });
  }

  isRunning(runId: number): boolean {
    return this.handles.has(runId);
  }
}

export const runnerManager = new RunnerManager();
