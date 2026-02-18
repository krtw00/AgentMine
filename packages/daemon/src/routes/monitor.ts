import { Hono } from "hono";
import { db } from "../db";
import {
  tasks,
  runs,
  agentProfiles,
  taskDependencies,
  checks,
  scopeViolations,
  projects,
  eq,
} from "@agentmine/db";
import { inArray } from "drizzle-orm";
import { deriveTaskStatus } from "../utils/task-status";

export const monitorRouter = new Hono();

// GET /api/projects/:projectId/monitor
monitorRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

  // クエリパラメータ取得
  const statusFilter = c.req.query("status"); // run status: running/failed/completed
  const reasonCodesFilter = c.req.query("reason_codes"); // カンマ区切り: dod_failed,scope_violation_pending,etc.
  const taskFilter = c.req.query("task_id"); // task_id または title検索
  const agentProfileFilter = c.req.query("agent_profile_id"); // profile name
  const sinceFilter = c.req.query("since"); // ISO timestamp

  // プロジェクト情報取得（repoPath, baseBranch）
  const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (projectResult.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  const project = projectResult[0]!;
  const { repoPath, baseBranch } = project;

  // 全タスク取得
  const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

  // taskIdでフィルタしてruns取得
  const taskIds = allTasks.map((t) => t.id);
  let allRuns =
    taskIds.length > 0 ? await db.select().from(runs).where(inArray(runs.taskId, taskIds)) : [];

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

  // 一括取得: taskDependencies
  const allTaskDependencies =
    taskIds.length > 0
      ? await db.select().from(taskDependencies).where(inArray(taskDependencies.taskId, taskIds))
      : [];

  // taskId -> taskDependencies[] のMapを作成
  const taskDependenciesMap = new Map<number, (typeof taskDependencies.$inferSelect)[]>();
  allTaskDependencies.forEach((dep) => {
    const existing = taskDependenciesMap.get(dep.taskId) || [];
    existing.push(dep);
    taskDependenciesMap.set(dep.taskId, existing);
  });

  // 一括取得: scopeViolations と checks
  const runIds = allRuns.map((r) => r.id);
  const [allScopeViolations, allChecks] = await Promise.all([
    runIds.length > 0
      ? db.select().from(scopeViolations).where(inArray(scopeViolations.runId, runIds))
      : Promise.resolve([]),
    runIds.length > 0
      ? db.select().from(checks).where(inArray(checks.runId, runIds))
      : Promise.resolve([]),
  ]);

  // runId -> scopeViolations[] のMapを作成
  const scopeViolationsMap = new Map<number, (typeof scopeViolations.$inferSelect)[]>();
  allScopeViolations.forEach((violation) => {
    const existing = scopeViolationsMap.get(violation.runId) || [];
    existing.push(violation);
    scopeViolationsMap.set(violation.runId, existing);
  });

  // runId -> checks[] のMapを作成
  const checksMap = new Map<number, (typeof checks.$inferSelect)[]>();
  allChecks.forEach((check) => {
    const existing = checksMap.get(check.runId) || [];
    existing.push(check);
    checksMap.set(check.runId, existing);
  });

  // 各タスクの状態を導出（フィルタ適用前の全runsで計算）
  const tasksWithStatus = allTasks.map((task) => {
    // このタスクのruns取得（フィルタ適用前）
    const taskRuns = allRuns.filter((r) => r.taskId === task.id);

    // 依存タスクの状態取得（Mapから取得）
    const deps = taskDependenciesMap.get(task.id) || [];

    const depsWithStatus = deps.map((dep) => {
      const depTask = allTasks.find((t) => t.id === dep.dependsOnTaskId);
      // 簡易的にcancelledAtで判定
      return {
        dependsOnTaskId: dep.dependsOnTaskId,
        status: depTask?.cancelledAt ? "cancelled" : "open",
      };
    });

    const { status, reasons } = deriveTaskStatus(task, taskRuns, depsWithStatus, {
      repoPath,
      baseBranch,
      scopeViolationsMap,
      checksMap,
    });

    // フィルタ適用前の全runsを保持
    let filteredRuns = taskRuns;

    // statusフィルタ適用（run status）
    if (statusFilter) {
      filteredRuns = filteredRuns.filter((r) => r.status === statusFilter);
    }

    // agent_profileフィルタ適用
    if (agentProfileFilter && filteredRuns.length > 0) {
      filteredRuns = filteredRuns.filter((r) => {
        const profileName = profileNameMap.get(r.agentProfileId);
        return profileName === agentProfileFilter;
      });
    }

    return {
      ...task,
      status,
      reasons,
      runs: filteredRuns,
    };
  });

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
  type TaskWithChildren = (typeof filteredTasks)[0] & { children: TaskWithChildren[] };
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

  // 集計情報を計算（tasksWithStatusから再利用）
  const summary = {
    total_tasks: allTasks.length,
    running_runs: allRuns.filter((r) => r.status === "running").length,
    needs_review_tasks: tasksWithStatus.filter((t) => t.status === "needs_review").length,
    failed_tasks: tasksWithStatus.filter((t) => t.status === "failed").length,
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
