import { Hono } from "hono";
import { db } from "../db";
import {
  tasks,
  taskDependencies,
  runs,
  checks,
  scopeViolations,
  projects,
  eq,
  and,
  inArray,
} from "@agentmine/db";
import { runnerManager } from "../runner/manager";
import { deriveTaskStatus, type RunForStatus } from "../utils/task-status";

export const tasksRouter = new Hono();

// --- helper: runIdsからchecks/scopeViolationsをバッチ取得してRunForStatus[]に組み立てる ---
function buildRunsForStatus(
  allRuns: (typeof runs.$inferSelect)[],
  allChecks: (typeof checks.$inferSelect)[],
  allViolations: (typeof scopeViolations.$inferSelect)[]
): Map<number, RunForStatus[]> {
  const checksMap = new Map<number, (typeof checks.$inferSelect)[]>();
  for (const c of allChecks) {
    const arr = checksMap.get(c.runId) ?? [];
    arr.push(c);
    checksMap.set(c.runId, arr);
  }
  const violationsMap = new Map<number, (typeof scopeViolations.$inferSelect)[]>();
  for (const v of allViolations) {
    const arr = violationsMap.get(v.runId) ?? [];
    arr.push(v);
    violationsMap.set(v.runId, arr);
  }

  const result = new Map<number, RunForStatus[]>();
  for (const run of allRuns) {
    const arr = result.get(run.taskId) ?? [];
    arr.push({
      id: run.id,
      status: run.status,
      checks: (checksMap.get(run.id) ?? []).map((c) => ({ status: c.status })),
      scopeViolations: (violationsMap.get(run.id) ?? []).map((v) => ({
        approvedStatus: v.approvedStatus,
      })),
    });
    result.set(run.taskId, arr);
  }
  return result;
}

// GET /api/projects/:projectId/tasks - 一覧取得
tasksRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const statusFilter = c.req.query("status");
  const parentIdFilter = c.req.query("parent_id");

  // a. project取得
  const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
  if (projectResult.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }
  const { repoPath, baseBranch } = projectResult[0]!;
  const options = { repoPath, baseBranch };

  // b. 全tasks取得
  const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

  if (allTasks.length === 0) {
    return c.json({ data: [] });
  }

  const taskIds = allTasks.map((t) => t.id);

  // c. バッチでruns取得
  const allRuns = await db.select().from(runs).where(inArray(runs.taskId, taskIds));
  const runIds = allRuns.map((r) => r.id);

  // d. バッチでchecks, scopeViolations取得
  const allChecks =
    runIds.length > 0 ? await db.select().from(checks).where(inArray(checks.runId, runIds)) : [];
  const allViolations =
    runIds.length > 0
      ? await db.select().from(scopeViolations).where(inArray(scopeViolations.runId, runIds))
      : [];

  const runsMap = buildRunsForStatus(allRuns, allChecks, allViolations);

  // e. バッチでtaskDependencies取得
  const allDeps = await db
    .select()
    .from(taskDependencies)
    .where(inArray(taskDependencies.taskId, taskIds));

  // f. 2パス依存解決
  const statusMap = new Map<number, { status: string; reasons: string[] }>();
  const depsMap = new Map<number, number[]>();

  for (const task of allTasks) {
    const taskDeps = allDeps.filter((d) => d.taskId === task.id);
    depsMap.set(
      task.id,
      taskDeps.map((d) => d.dependsOnTaskId)
    );
    if (taskDeps.length === 0) {
      statusMap.set(task.id, deriveTaskStatus(task, runsMap.get(task.id) ?? [], [], options));
    }
  }

  // Pass 2: 依存ありタスク
  for (const task of allTasks) {
    if (statusMap.has(task.id)) continue;
    const depStatuses = (depsMap.get(task.id) ?? []).map((depId) => ({
      dependsOnTaskId: depId,
      status: statusMap.get(depId)?.status ?? "open",
    }));
    statusMap.set(
      task.id,
      deriveTaskStatus(task, runsMap.get(task.id) ?? [], depStatuses, options)
    );
  }

  // g. フィルタ適用
  let tasksWithStatus = allTasks.map((task) => {
    const derived = statusMap.get(task.id) ?? { status: "open", reasons: [] };
    return { ...task, status: derived.status, reasons: derived.reasons };
  });

  if (statusFilter) {
    tasksWithStatus = tasksWithStatus.filter((t) => t.status === statusFilter);
  }
  if (parentIdFilter !== undefined) {
    const pid = parentIdFilter === "null" ? null : Number(parentIdFilter);
    tasksWithStatus = tasksWithStatus.filter((t) => t.parentId === pid);
  }

  return c.json({ data: tasksWithStatus });
});

// POST /api/projects/:projectId/tasks - 作成
tasksRouter.post("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const { title, description, writeScope, parentId, dependsOn } = body;

  // バリデーション
  if (!title) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "title is required" } }, 400);
  }
  if (!writeScope || !Array.isArray(writeScope) || writeScope.length === 0) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "writeScope must be a non-empty array",
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const result = await db
    .insert(tasks)
    .values({
      projectId,
      parentId: parentId ?? null,
      title,
      description: description ?? null,
      writeScope,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const newTask = result[0]!;

  // 依存関係を登録
  if (dependsOn && Array.isArray(dependsOn)) {
    for (const depTaskId of dependsOn) {
      await db.insert(taskDependencies).values({
        taskId: newTask.id,
        dependsOnTaskId: depTaskId,
      });
    }
  }

  return c.json({ data: { ...newTask, status: "ready", reasons: [] } }, 201);
});

// GET /api/tasks/:id - 単体取得
tasksRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await db.select().from(tasks).where(eq(tasks.id, id));

  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  const task = result[0]!;

  // project取得（repoPath/baseBranch用）
  const projectResult = await db.select().from(projects).where(eq(projects.id, task.projectId));
  const { repoPath, baseBranch } = projectResult[0]!;
  const options = { repoPath, baseBranch };

  // runs取得
  const taskRuns = await db.select().from(runs).where(eq(runs.taskId, id));
  const runIds = taskRuns.map((r) => r.id);
  const taskChecks =
    runIds.length > 0 ? await db.select().from(checks).where(inArray(checks.runId, runIds)) : [];
  const taskViolations =
    runIds.length > 0
      ? await db.select().from(scopeViolations).where(inArray(scopeViolations.runId, runIds))
      : [];

  const runsForStatus = buildRunsForStatus(taskRuns, taskChecks, taskViolations);

  // 依存取得
  const deps = await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, id));

  // 依存先タスクのstatus導出
  const dependencies = await Promise.all(
    deps.map(async (dep) => {
      const depTask = await db.select().from(tasks).where(eq(tasks.id, dep.dependsOnTaskId));
      if (!depTask[0]) return { taskId: dep.dependsOnTaskId, title: "", status: "open" };

      const depRuns = await db.select().from(runs).where(eq(runs.taskId, dep.dependsOnTaskId));
      const depRunIds = depRuns.map((r) => r.id);
      const depChecks =
        depRunIds.length > 0
          ? await db.select().from(checks).where(inArray(checks.runId, depRunIds))
          : [];
      const depViolations =
        depRunIds.length > 0
          ? await db.select().from(scopeViolations).where(inArray(scopeViolations.runId, depRunIds))
          : [];
      const depRunsForStatus = buildRunsForStatus(depRuns, depChecks, depViolations);
      const depStatus = deriveTaskStatus(
        depTask[0],
        depRunsForStatus.get(dep.dependsOnTaskId) ?? [],
        [],
        options
      );
      return { taskId: dep.dependsOnTaskId, title: depTask[0].title, status: depStatus.status };
    })
  );

  const { status, reasons } = deriveTaskStatus(
    task,
    runsForStatus.get(id) ?? [],
    dependencies.map((d) => ({ dependsOnTaskId: d.taskId, status: d.status })),
    options
  );

  const latestRun = taskRuns.length > 0 ? taskRuns[taskRuns.length - 1] : null;

  return c.json({
    data: {
      ...task,
      status,
      reasons,
      dependencies,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            finishedAt: latestRun.finishedAt,
          }
        : null,
    },
  });
});

// PATCH /api/tasks/:id - 更新
tasksRouter.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.writeScope !== undefined) updateData.writeScope = body.writeScope;

  const result = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  return c.json({ data: result[0] });
});

// POST /api/tasks/:id/cancel - キャンセル
tasksRouter.post("/:id/cancel", async (c) => {
  const id = Number(c.req.param("id"));

  const existing = await db.select().from(tasks).where(eq(tasks.id, id));
  if (existing.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  if (existing[0]!.cancelledAt) {
    return c.json({ error: { code: "CONFLICT", message: "Task already cancelled" } }, 409);
  }

  const now = new Date().toISOString();

  // running中のrunがあればプロセスを停止
  const runningRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.taskId, id), eq(runs.status, "running")));

  for (const run of runningRuns) {
    if (runnerManager.isRunning(run.id)) {
      await runnerManager.stop(run.id);
    } else {
      await db
        .update(runs)
        .set({ status: "cancelled", cancelledAt: now })
        .where(eq(runs.id, run.id));
    }
  }

  const result = await db
    .update(tasks)
    .set({ cancelledAt: now, updatedAt: now })
    .where(eq(tasks.id, id))
    .returning();

  return c.json({ data: { ...result[0], status: "cancelled" } });
});
