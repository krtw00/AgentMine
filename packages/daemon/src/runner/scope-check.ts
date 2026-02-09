import { execSync } from "child_process";
import ignore from "ignore";
import { db } from "../db";
import { runs, scopeViolations, eq } from "@agentmine/db";

/**
 * Run完了時にwrite_scope外の変更ファイルを検出し、scope_violationsに記録する
 */
export async function detectScopeViolations(runId: number): Promise<void> {
  const runResult = await db.select().from(runs).where(eq(runs.id, runId));
  const run = runResult[0];
  if (!run) return;

  const { worktreePath, scopeSnapshot, headSha } = run;
  if (!worktreePath || !scopeSnapshot || scopeSnapshot.length === 0) return;

  // 変更ファイル一覧を取得
  let changedFiles: string[];
  try {
    const diffBase = headSha ?? "HEAD~1";
    const output = execSync(`git diff --name-only ${diffBase}`, {
      cwd: worktreePath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    changedFiles = output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    // diff取得に失敗した場合はスキップ
    console.error(`[run:${runId}] Failed to get git diff for scope check`);
    return;
  }

  if (changedFiles.length === 0) return;

  // write_scopeのglobでマッチャーを構築
  const ig = ignore().add(scopeSnapshot);

  // write_scopeにマッチしないファイルが違反
  const violations = changedFiles.filter((file) => !ig.ignores(file));

  if (violations.length === 0) return;

  // scope_violationsテーブルに記録
  await db.insert(scopeViolations).values(
    violations.map((path) => ({
      runId,
      path,
      reason: "outside_write_scope",
    }))
  );

  console.log(`[run:${runId}] Detected ${violations.length} scope violation(s)`);
}
