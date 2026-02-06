import { Hono } from "hono";
import { db } from "../db";
import { tasks, taskDependencies, runs, eq, and } from "@agentmine/db";
import { runnerManager } from "../runner/manager";

export const tasksRouter = new Hono();

// Task状態を導出する関数
function deriveTaskStatus(
  task: typeof tasks.$inferSelect,
  taskRuns: (typeof runs.$inferSelect)[],
  dependencies: { dependsOnTaskId: number; status: string }[]
): { status: string; reasons: string[] } {
  const reasons: string[] = [];

  // キャンセル済み
  if (task.cancelledAt) {
    return { status: "cancelled", reasons: [] };
  }

  // 依存タスクがすべてdoneか確認
  const blockedDeps = dependencies.filter((d) => d.status !== "done");
  if (blockedDeps.length > 0) {
    reasons.push("blocked_by_dependency");
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
    reasons.push("last_run_failed");
    return { status: "failed", reasons };
  }

  // TODO: DoD, merge状態, scope violationを確認してdone/needs_reviewを判定
  // MVPでは簡易実装
  if (completedRuns.length > 0) {
    return { status: "needs_review", reasons: ["pending_review"] };
  }

  // runがない場合
  if (taskRuns.length === 0) {
    return { status: "ready", reasons: [] };
  }

  return { status: "open", reasons: [] };
}

// GET /api/projects/:projectId/tasks - 一覧取得
tasksRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const statusFilter = c.req.query("status");
  const parentIdFilter = c.req.query("parent_id");

  let query = db.select().from(tasks).where(eq(tasks.projectId, projectId));

  const result = await query;

  // 各タスクの状態を導出
  const tasksWithStatus = await Promise.all(
    result.map(async (task) => {
      // このタスクのruns取得
      const taskRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.taskId, task.id));

      // 依存タスクの状態取得
      const deps = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.taskId, task.id));

      const depsWithStatus = await Promise.all(
        deps.map(async (dep) => {
          const depTask = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, dep.dependsOnTaskId));
          // 簡易的にcancelledAtで判定
          return {
            dependsOnTaskId: dep.dependsOnTaskId,
            status: depTask[0]?.cancelledAt ? "cancelled" : "open",
          };
        })
      );

      const { status, reasons } = deriveTaskStatus(
        task,
        taskRuns,
        depsWithStatus
      );

      return {
        ...task,
        status,
        reasons,
      };
    })
  );

  // フィルタ適用
  let filtered = tasksWithStatus;
  if (statusFilter) {
    filtered = filtered.filter((t) => t.status === statusFilter);
  }
  if (parentIdFilter !== undefined) {
    const pid = parentIdFilter === "null" ? null : Number(parentIdFilter);
    filtered = filtered.filter((t) => t.parentId === pid);
  }

  return c.json({ data: filtered });
});

// POST /api/projects/:projectId/tasks - 作成
tasksRouter.post("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const { title, description, writeScope, parentId, dependsOn } = body;

  // バリデーション
  if (!title) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "title is required" } },
      400
    );
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

  return c.json(
    { data: { ...newTask, status: "ready", reasons: [] } },
    201
  );
});

// GET /api/tasks/:id - 単体取得
tasksRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await db.select().from(tasks).where(eq(tasks.id, id));

  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  const task = result[0]!;

  // runs取得
  const taskRuns = await db.select().from(runs).where(eq(runs.taskId, id));

  // 依存取得
  const deps = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, id));

  const dependencies = await Promise.all(
    deps.map(async (dep) => {
      const depTask = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, dep.dependsOnTaskId));
      return {
        taskId: dep.dependsOnTaskId,
        title: depTask[0]?.title ?? "",
        status: depTask[0]?.cancelledAt ? "cancelled" : "open",
      };
    })
  );

  const { status, reasons } = deriveTaskStatus(
    task,
    taskRuns,
    dependencies.map((d) => ({ dependsOnTaskId: d.taskId, status: d.status }))
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

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();

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
    return c.json(
      { error: { code: "CONFLICT", message: "Task already cancelled" } },
      409
    );
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
