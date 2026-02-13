import { tasks, runs, scopeViolations, checks } from "@agentmine/db";
import { execSync } from "child_process";

// Gitでコミットがブランチに含まれているかを判定するヘルパー関数
function isCommitInBranch(
  commitSha: string | null,
  branchName: string,
  repoPath: string
): boolean {
  if (!commitSha) {
    return false;
  }
  try {
    // git merge-base --is-ancestor でコミットがブランチの祖先か確認
    execSync(
      `git merge-base --is-ancestor "${commitSha}" "${branchName}"`,
      { cwd: repoPath, stdio: "pipe" }
    );
    return true;
  } catch {
    // エラー時は含まれていないと判定
    return false;
  }
}

// DoDがpassedかどうかを判定するヘルパー関数
function isDoDPassed(
  run: typeof runs.$inferSelect,
  checksMap: Map<number, (typeof checks.$inferSelect)[]>
): boolean {
  const runChecks = checksMap.get(run.id) || [];

  const dodSnapshot = run.dodSnapshot as
    | { requiredChecks?: { check_key: string; required?: boolean }[] }
    | null
    | undefined;

  if (!dodSnapshot?.requiredChecks) {
    return false;
  }

  const requiredCheckKeys = dodSnapshot.requiredChecks
    .filter((c) => c.required !== false)
    .map((c) => c.check_key);

  if (requiredCheckKeys.length === 0) {
    return true; // 必須チェックがない場合はpassedとみなす
  }

  const completedCheckKeys = runChecks
    .filter((c) => c.status !== "pending")
    .map((c) => c.checkKey);

  const missingChecks = requiredCheckKeys.filter(
    (key) => !completedCheckKeys.includes(key)
  );
  if (missingChecks.length > 0) {
    return false; // 必須チェックが未完了
  }

  const failedChecks = runChecks.filter(
    (c) => c.status === "failed" && requiredCheckKeys.includes(c.checkKey)
  );
  if (failedChecks.length > 0) {
    return false; // 必須チェックが失敗
  }

  return true; // すべての必須チェックが成功
}

export interface DeriveTaskStatusOptions {
  repoPath?: string;
  baseBranch?: string;
  scopeViolationsMap?: Map<number, (typeof scopeViolations.$inferSelect)[]>;
  checksMap?: Map<number, (typeof checks.$inferSelect)[]>;
}

/**
 * Task状態を導出する共通関数
 * 
 * @param task - タスク
 * @param taskRuns - タスクに関連するruns
 * @param dependencies - 依存タスクの状態配列
 * @param options - オプショナルパラメータ（詳細な判定に必要）
 * @returns statusとreasonsのオブジェクト
 */
export function deriveTaskStatus(
  task: typeof tasks.$inferSelect,
  taskRuns: (typeof runs.$inferSelect)[],
  dependencies: { dependsOnTaskId: number; status: string }[],
  options: DeriveTaskStatusOptions = {}
): { status: string; reasons: string[] } {
  const {
    repoPath,
    baseBranch,
    scopeViolationsMap,
    checksMap,
  } = options;

  const reasons: string[] = [];

  // キャンセル済み
  if (task.cancelledAt) {
    return { status: "cancelled", reasons: [] };
  }

  // 依存タスクがすべてdoneか確認
  const blockedDeps = dependencies.filter((d) => d.status !== "done");
  if (blockedDeps.length > 0) {
    reasons.push("blocked_by_dependencies");
    return { status: "blocked", reasons };
  }

  // 実行中のrunがあるか
  const runningRun = taskRuns.find((r) => r.status === "running");
  if (runningRun) {
    return { status: "running", reasons: [] };
  }

  // 完了したrunがあるか
  const completedRuns = taskRuns.filter((r) => r.status === "completed");
  const failedRuns = taskRuns.filter((r) => r.status === "failed");

  if (failedRuns.length > 0 && completedRuns.length === 0) {
    reasons.push("run_failed");
    return { status: "failed", reasons };
  }

  // 詳細な判定が可能な場合（monitor.ts用）
  if (repoPath && baseBranch && scopeViolationsMap && checksMap) {
    // 最新のrunを取得
    const latestRun = taskRuns.length > 0
      ? taskRuns.sort((a, b) => 
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )[0]
      : null;

    // scope violationsをチェック
    if (latestRun) {
      const allViolations = scopeViolationsMap.get(latestRun.id) || [];
      const pendingViolations = allViolations.filter(
        (v) => v.approvedStatus === "pending"
      );
      
      if (pendingViolations.length > 0) {
        reasons.push("scope_violation_pending");
      }

      const rejectedViolations = allViolations.filter(
        (v) => v.approvedStatus === "rejected"
      );
      
      if (rejectedViolations.length > 0) {
        reasons.push("scope_violation_rejected");
      }

      // DoDチェック
      const runChecks = checksMap.get(latestRun.id) || [];

      // dodSnapshotから必須チェックを取得
      const dodSnapshot = latestRun.dodSnapshot as
        | { requiredChecks?: { check_key: string; required?: boolean }[] }
        | null
        | undefined;

      if (dodSnapshot?.requiredChecks) {
        const requiredCheckKeys = dodSnapshot.requiredChecks
          .filter((c) => c.required !== false)
          .map((c) => c.check_key);

        const completedCheckKeys = runChecks
          .filter((c) => c.status !== "pending")
          .map((c) => c.checkKey);

        const missingChecks = requiredCheckKeys.filter(
          (key) => !completedCheckKeys.includes(key)
        );
        if (missingChecks.length > 0) {
          reasons.push("dod_pending");
        }

        const failedChecks = runChecks.filter(
          (c) => c.status === "failed" && requiredCheckKeys.includes(c.checkKey)
        );
        if (failedChecks.length > 0) {
          reasons.push("dod_failed");
        }
      }
    }

    // 優先順位6: merged_passed_run_exists をチェック
    // baseブランチが head_sha を含み、DoDがpassedで、かつworktree_dirty = falseのrunが存在する
    for (const run of taskRuns) {
      if (
        run.headSha &&
        run.worktreeDirty === false &&
        isCommitInBranch(run.headSha, baseBranch, repoPath)
      ) {
        const dodPassed = isDoDPassed(run, checksMap);
        if (dodPassed) {
          return { status: "done", reasons: [] };
        }
      }
    }

    // needs_review判定
    if (reasons.length > 0 || (completedRuns.length > 0 && latestRun)) {
      return { status: "needs_review", reasons };
    }
  } else {
    // 簡易版（tasks.ts用）
    if (completedRuns.length > 0) {
      return { status: "needs_review", reasons: ["pending_review"] };
    }
  }

  // runがない場合
  if (taskRuns.length === 0) {
    return { status: "ready", reasons: [] };
  }

  return { status: "open", reasons: [] };
}

