export interface RunForStatus {
  id: number;
  status: string;
  checks: { status: string }[];
  scopeViolations: { approvedStatus: string }[];
}

export interface DeriveTaskStatusOptions {
  repoPath: string;
  baseBranch: string;
}

export function deriveTaskStatus(
  task: { cancelledAt: string | null },
  taskRuns: RunForStatus[],
  dependencies: { dependsOnTaskId: number; status: string }[],
  _options: DeriveTaskStatusOptions
): { status: string; reasons: string[] } {
  const reasons: string[] = [];

  // cancelled
  if (task.cancelledAt) {
    return { status: "cancelled", reasons: [] };
  }

  // blocked by dependencies
  const blockedDeps = dependencies.filter((d) => d.status !== "done");
  if (blockedDeps.length > 0) {
    reasons.push("blocked_by_dependency");
    return { status: "blocked", reasons };
  }

  // running
  const runningRun = taskRuns.find((r) => r.status === "running");
  if (runningRun) {
    return { status: "running", reasons: [] };
  }

  const completedRuns = taskRuns.filter((r) => r.status === "completed");
  const failedRuns = taskRuns.filter((r) => r.status === "failed");

  if (failedRuns.length > 0 && completedRuns.length === 0) {
    reasons.push("last_run_failed");
    return { status: "failed", reasons };
  }

  if (completedRuns.length > 0) {
    // latest completed run
    const latestCompleted = completedRuns[completedRuns.length - 1]!;
    const checksArr = latestCompleted.checks;
    const violations = latestCompleted.scopeViolations;
    const unresolvedViolations = violations.filter((v) => v.approvedStatus === "pending");

    if (unresolvedViolations.length > 0) {
      reasons.push("unresolved_scope_violations");
      return { status: "needs_review", reasons };
    }

    if (checksArr.length === 0) {
      reasons.push("no_checks_run");
      return { status: "needs_review", reasons };
    }

    const allPassed = checksArr.every((c) => c.status === "passed");
    const anyFailed = checksArr.some((c) => c.status === "failed");

    if (anyFailed) {
      reasons.push("checks_failed");
      return { status: "needs_review", reasons };
    }

    if (allPassed) {
      return { status: "done", reasons: [] };
    }

    reasons.push("checks_pending");
    return { status: "needs_review", reasons };
  }

  // no runs
  if (taskRuns.length === 0) {
    return { status: "ready", reasons: [] };
  }

  return { status: "open", reasons: [] };
}
