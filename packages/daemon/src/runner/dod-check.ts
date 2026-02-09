import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { db } from "../db";
import { runs, tasks, settings, checks, eq, and } from "@agentmine/db";

interface RequiredCheck {
  check_key: string;
  label: string;
  command: string;
  timeout_sec?: number;
  required?: boolean;
}

const CHECK_LOG_DIR = "/tmp/agentmine/check-logs";

/**
 * Run完了時にDoDチェックを自動実行し、結果をchecksテーブルに記録する
 */
export async function runDodChecks(runId: number): Promise<void> {
  const runResult = await db.select().from(runs).where(eq(runs.id, runId));
  const run = runResult[0];
  if (!run) return;

  // task → project → settingsを辿る
  const taskResult = await db.select().from(tasks).where(eq(tasks.id, run.taskId));
  const task = taskResult[0];
  if (!task) return;

  const settingResult = await db
    .select()
    .from(settings)
    .where(and(eq(settings.projectId, task.projectId), eq(settings.key, "dod.requiredChecks")));

  const setting = settingResult[0];
  if (!setting || !Array.isArray(setting.value)) return;

  const requiredChecks = setting.value as RequiredCheck[];
  if (requiredChecks.length === 0) return;

  if (!existsSync(CHECK_LOG_DIR)) {
    mkdirSync(CHECK_LOG_DIR, { recursive: true });
  }

  for (const check of requiredChecks) {
    const outputPath = join(CHECK_LOG_DIR, `${runId}-${check.check_key}.log`);
    let status: string;
    let exitCode: number;

    try {
      const timeoutMs = (check.timeout_sec ?? 300) * 1000;
      const output = execSync(check.command, {
        cwd: run.worktreePath,
        encoding: "utf-8",
        timeout: timeoutMs,
        stdio: ["pipe", "pipe", "pipe"],
      });
      writeFileSync(outputPath, output, "utf-8");
      status = "passed";
      exitCode = 0;
    } catch (err: unknown) {
      const execErr = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = execErr.status ?? 1;
      status = "failed";
      const output = [execErr.stdout ?? "", execErr.stderr ?? ""].join("\n");
      writeFileSync(outputPath, output, "utf-8");
    }

    await db.insert(checks).values({
      runId,
      checkKey: check.check_key,
      label: check.label,
      kind: "command",
      status,
      exitCode,
      outputRef: outputPath,
    });

    console.log(`[run:${runId}] DoD check "${check.check_key}": ${status} (exit=${exitCode})`);
  }
}
