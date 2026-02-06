import { ClaudeAdapter } from "./claude-adapter";
import { CodexAdapter } from "./codex-adapter";
import type { RunnerAdapter, RunHandle, RunOutput } from "./types";
import { db } from "../db";
import { runs, eq } from "@agentmine/db";
import { eventEmitter } from "../events/emitter";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const LOG_DIR = "/tmp/agentmine/logs";

class RunnerManager {
  private adapters: Map<string, RunnerAdapter> = new Map();
  private handles: Map<number, RunHandle> = new Map();

  constructor() {
    const claude = new ClaudeAdapter();
    const codex = new CodexAdapter();

    claude.setOutputHandler((runId, output) => this.handleOutput(runId, output));
    codex.setOutputHandler((runId, output) => this.handleOutput(runId, output));

    this.adapters.set("claude", claude);
    this.adapters.set("codex", codex);
  }

  private appendLog(runId: number, output: RunOutput) {
    try {
      if (!existsSync(LOG_DIR)) {
        mkdirSync(LOG_DIR, { recursive: true });
      }
      const logPath = join(LOG_DIR, `${runId}.jsonl`);
      appendFileSync(logPath, JSON.stringify(output) + "\n", "utf-8");
    } catch (err) {
      console.error(`[run:${runId}] Failed to write log:`, err);
    }
  }

  private handleOutput(runId: number, output: RunOutput) {
    // ファイルログ保存
    this.appendLog(runId, output);

    // コンソールログ
    if (output.type === "stdout") {
      console.log(`[run:${runId}:stdout] ${output.data?.slice(0, 200)}`);
    } else if (output.type === "stderr") {
      console.error(`[run:${runId}:stderr] ${output.data?.slice(0, 200)}`);
    } else if (output.type === "exit") {
      console.log(`[run:${runId}:exit] code=${output.exitCode}`);
    }

    // イベント発行（emitRunEventでSSEワイルドカードリスナーにも届く）
    eventEmitter.emitRunEvent("run.output", {
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

    eventEmitter.emitRunEvent("run.finished", { runId, status, exitCode });
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
    model?: string,
    config?: Record<string, unknown>
  ): Promise<RunHandle | null> {
    const adapter = this.adapters.get(runner);
    if (!adapter) return null;

    const handle = await adapter.start({
      runId,
      worktreePath,
      prompt,
      model,
      config,
    });

    this.handles.set(runId, handle);

    // logRefをDBに記録
    const logRef = join(LOG_DIR, `${runId}.jsonl`);
    db.update(runs)
      .set({ logRef })
      .where(eq(runs.id, runId))
      .catch((err) => console.error(`[run:${runId}] Failed to set logRef:`, err));

    eventEmitter.emitRunEvent("run.started", { runId });

    return handle;
  }

  async stop(runId: number): Promise<void> {
    const handle = this.handles.get(runId);
    if (!handle) return;

    // handleから元のrunnerを特定
    const runnerName = this.findRunnerForHandle(runId);
    const adapter = runnerName ? this.adapters.get(runnerName) : undefined;
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

    eventEmitter.emitRunEvent("run.cancelled", { runId });
  }

  private findRunnerForHandle(runId: number): string | undefined {
    for (const [name, adapter] of this.adapters) {
      // アダプターのprocessesマップにrunIdがあるか確認
      if ((adapter as unknown as { processes?: Map<number, unknown> }).processes?.has(runId)) {
        return name;
      }
    }
    return undefined;
  }

  isRunning(runId: number): boolean {
    return this.handles.has(runId);
  }

  getRunningCount(): number {
    return this.handles.size;
  }
}

export const runnerManager = new RunnerManager();
