import { Hono } from "hono";
import { db } from "../db";
import {
  tasks,
  runs,
  agentProfiles,
  taskDependencies,
  checks,
  scopeViolations,
  eq,
  and,
  or,
  sql,
} from "@agentmine/db";

export const monitorRouter = new Hono();

// Task状態を導出する関数（tasks.tsと同様だが、より詳細な理由コードを返す）
async function deriveTaskStatusWithReasons(
  task: typeof tasks.$inferSelect,
  taskRuns: (typeof runs.$inferSelect)[],
  dependencies: { dependsOnTaskId: number; status: string }[]
): Promise<{ status: string; reasons: string[] }> {
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

  // 最新のrunを取得
  const latestRun = taskRuns.length > 0
    ? taskRuns.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0]
    : null;

  // scope violationsをチェック
  if (latestRun) {
    const pendingViolations = await db
      .select()
      .from(scopeViolations)
      .where(
        and(
          eq(scopeViolations.runId, latestRun.id),
          eq(scopeViolations.approvedStatus, "pending")
        )
      );
    
    if (pendingViolations.length > 0) {
      reasons.push("scope_violation_pending");
    }

    const rejectedViolations = await db
      .select()
      .from(scopeViolations)
      .where(
        and(
          eq(scopeViolations.runId, latestRun.id),
          eq(scopeViolations.approvedStatus, "rejected")
        )
      );
    
    if (rejectedViolations.length > 0) {
      reasons.push("scope_violation_rejected");
    }

    // DoDチェック
    const runChecks = await db
      .select()
      .from(checks)
      .where(eq(checks.runId, latestRun.id));

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

  // needs_review判定
  if (reasons.length > 0 || (completedRuns.length > 0 && latestRun)) {
    return { status: "needs_review", reasons };
  }

  // runがない場合
  if (taskRuns.length === 0) {
    return { status: "ready", reasons: [] };
  }

  return { status: "open", reasons: [] };
}

// GET /api/projects/:projectId/monitor
monitorRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

  // クエリパラメータ取得
  const statusFilter = c.req.query("status"); // run status: running/failed/completed
  const reasonCodesFilter = c.req.query("reason_codes"); // カンマ区切り: dod_failed,scope_violation_pending,etc.
  const taskFilter = c.req.query("task"); // task_id または title検索
  const agentProfileFilter = c.req.query("agent_profile"); // profile name
  const sinceFilter = c.req.query("since"); // ISO timestamp

  // 全タスク取得
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  // 全runs取得（フィルタ適用前）
  // まず全runsを取得してからフィルタリング
  let allRuns = await db.select().from(runs);
  
  // taskIdでフィルタ
  const taskIds = allTasks.map((t) => t.id);
  allRuns = allRuns.filter((r) => taskIds.includes(r.taskId));
  
  // sinceフィルタ適用
  if (sinceFilter) {
    allRuns = allRuns.filter((r) => r.startedAt >= sinceFilter);
  }

  // agent_profileフィルタ用にprofile名を取得
  let profileNameMap: Map<number, string> = new Map();
  if (agentProfileFilter) {
    const profiles = await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.projectId, projectId));
    
    profiles.forEach((p) => {
      profileNameMap.set(p.id, p.name);
    });
  }

  // 各タスクの状態を導出
  const tasksWithStatus = await Promise.all(
    allTasks.map(async (task) => {
      // このタスクのruns取得
      let taskRuns = allRuns.filter((r) => r.taskId === task.id);

      // statusフィルタ適用（run status）
      if (statusFilter) {
        taskRuns = taskRuns.filter((r) => r.status === statusFilter);
      }

      // agent_profileフィルタ適用
      if (agentProfileFilter && taskRuns.length > 0) {
        taskRuns = taskRuns.filter((r) => {
          const profileName = profileNameMap.get(r.agentProfileId);
          return profileName === agentProfileFilter;
        });
      }

      // 依存タスクの状態取得
      const deps = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.taskId, task.id));

      const depsWithStatus = await Promise.all(
        deps.map(async (dep) => {
          const depTask = allTasks.find((t) => t.id === dep.dependsOnTaskId);
          // 簡易的にcancelledAtで判定
          return {
            dependsOnTaskId: dep.dependsOnTaskId,
            status: depTask?.cancelledAt ? "cancelled" : "open",
          };
        })
      );

      const { status, reasons } = await deriveTaskStatusWithReasons(
        task,
        taskRuns,
        depsWithStatus
      );

      return {
        ...task,
        status,
        reasons,
        runs: taskRuns,
      };
    })
  );

  // taskフィルタ適用（task_id または title検索）
  let filteredTasks = tasksWithStatus;
  if (taskFilter) {
    const taskId = Number(taskFilter);
    if (!isNaN(taskId)) {
      // task_idでフィルタ
      filteredTasks = filteredTasks.filter((t) => t.id === taskId);
    } else {
      // title検索
      filteredTasks = filteredTasks.filter((t) =>
        t.title.toLowerCase().includes(taskFilter.toLowerCase())
      );
    }
  }

  // reason_codesフィルタ適用
  if (reasonCodesFilter) {
    const reasonCodes = reasonCodesFilter.split(",").map((r) => r.trim());
    filteredTasks = filteredTasks.filter((t) =>
      reasonCodes.some((code) => t.reasons.includes(code))
    );
  }

  // 子タスクを含む階層構造を構築
  type TaskWithChildren = (typeof filteredTasks[0]) & { children: TaskWithChildren[] };
  const taskMap = new Map<number, TaskWithChildren>();
  
  filteredTasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  const rootTasks: TaskWithChildren[] = [];

  filteredTasks.forEach((task) => {
    const taskWithChildren = taskMap.get(task.id)!;
    if (task.parentId === null) {
      rootTasks.push(taskWithChildren);
    } else {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        parent.children.push(taskWithChildren);
      } else {
        // 親がフィルタで除外されている場合はルートに追加
        rootTasks.push(taskWithChildren);
      }
    }
  });

  // 集計情報を計算
  const allTasksForSummary = await Promise.all(
    allTasks.map(async (task) => {
      const taskRuns = allRuns.filter((r) => r.taskId === task.id);
      const deps = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.taskId, task.id));
      const depsWithStatus = await Promise.all(
        deps.map(async (dep) => {
          const depTask = allTasks.find((t) => t.id === dep.dependsOnTaskId);
          return {
            dependsOnTaskId: dep.dependsOnTaskId,
            status: depTask?.cancelledAt ? "cancelled" : "open",
          };
        })
      );
      const { status, reasons } = await deriveTaskStatusWithReasons(
        task,
        taskRuns,
        depsWithStatus
      );
      return { status, reasons };
    })
  );

  const summary = {
    total_tasks: allTasks.length,
    running_runs: allRuns.filter((r) => r.status === "running").length,
    needs_review_tasks: allTasksForSummary.filter(
      (t) => t.status === "needs_review"
    ).length,
    failed_tasks: allTasksForSummary.filter((t) => t.status === "failed").length,
  };

  // 時間分布（overview）を計算
  // 過去24時間を1時間単位で集計
  const now = new Date();
  const timeRange = {
    start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    end: now.toISOString(),
  };

  const activity: Array<{ time: string; count: number }> = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const hourRuns = allRuns.filter((r) => {
      const started = new Date(r.startedAt);
      return started >= hourStart && started < hourEnd;
    });
    activity.push({
      time: hourStart.toISOString(),
      count: hourRuns.length,
    });
  }

  return c.json({
    data: {
      summary,
      tasks: rootTasks,
      overview: {
        time_range: timeRange,
        activity,
      },
    },
  });
});

