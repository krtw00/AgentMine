import { Hono } from "hono";
import { db } from "../db";
import {
  runs,
  tasks,
  agentProfiles,
  checks,
  scopeViolations,
  eq,
  and,
} from "@agentmine/db";

export const runsRouter = new Hono();

// GET /api/tasks/:taskId/runs - タスクのrun一覧
runsRouter.get("/", async (c) => {
  const taskId = Number(c.req.param("taskId"));
  const statusFilter = c.req.query("status");

  let result = await db.select().from(runs).where(eq(runs.taskId, taskId));

  if (statusFilter) {
    result = result.filter((r) => r.status === statusFilter);
  }

  // dod_status, scope_violation_count を導出
  const runsWithDerived = await Promise.all(
    result.map(async (run) => {
      const runChecks = await db
        .select()
        .from(checks)
        .where(eq(checks.runId, run.id));
      const violations = await db
        .select()
        .from(scopeViolations)
        .where(eq(scopeViolations.runId, run.id));

      const allPassed = runChecks.every((c) => c.status === "passed");
      const anyFailed = runChecks.some((c) => c.status === "failed");
      const dodStatus = anyFailed ? "failed" : allPassed ? "passed" : "pending";

      return {
        ...run,
        dodStatus,
        scopeViolationCount: violations.length,
      };
    })
  );

  return c.json({ data: runsWithDerived });
});

// POST /api/tasks/:taskId/runs - Run開始
runsRouter.post("/", async (c) => {
  const taskId = Number(c.req.param("taskId"));
  const body = await c.req.json();
  const { agentProfileId } = body;

  // バリデーション
  if (!agentProfileId) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "agentProfileId is required",
        },
      },
      400
    );
  }

  // タスク存在確認
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (task.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Task not found" } },
      404
    );
  }

  // write_scope確認
  if (!task[0].writeScope || task[0].writeScope.length === 0) {
    return c.json(
      {
        error: {
          code: "PRECONDITION_FAILED",
          message: "Task writeScope is not set",
        },
      },
      412
    );
  }

  // タスクがdone/cancelledでないか
  if (task[0].cancelledAt) {
    return c.json(
      { error: { code: "CONFLICT", message: "Task is cancelled" } },
      409
    );
  }

  // 同一taskでrunning中のrunがないか
  const runningRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.taskId, taskId), eq(runs.status, "running")));

  if (runningRuns.length > 0) {
    return c.json(
      { error: { code: "CONFLICT", message: "Task already has a running run" } },
      409
    );
  }

  // AgentProfile存在確認
  const profile = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, agentProfileId));
  if (profile.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Agent profile not found" } },
      404
    );
  }

  const now = new Date().toISOString();
  const branchName = `agentmine/task-${taskId}-${Date.now()}`;
  const worktreePath = `/tmp/agentmine/worktrees/${branchName}`;

  const result = await db
    .insert(runs)
    .values({
      taskId,
      agentProfileId,
      status: "running",
      startedAt: now,
      branchName,
      worktreePath,
      scopeSnapshot: task[0].writeScope,
    })
    .returning();

  // TODO: 実際のRunnerAdapter呼び出し
  // runnerManager.start(result[0], task[0], profile[0]);

  return c.json({ data: result[0] }, 201);
});

// GET /api/runs/:id - Run詳細
runsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(runs).where(eq(runs.id, id));
  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Run not found" } },
      404
    );
  }

  const run = result[0];

  // 関連データ取得
  const task = await db.select().from(tasks).where(eq(tasks.id, run.taskId));
  const profile = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, run.agentProfileId));
  const runChecks = await db
    .select()
    .from(checks)
    .where(eq(checks.runId, id));
  const violations = await db
    .select()
    .from(scopeViolations)
    .where(eq(scopeViolations.runId, id));

  return c.json({
    data: {
      ...run,
      taskTitle: task[0]?.title,
      agentProfileName: profile[0]?.name,
      checks: runChecks,
      scopeViolations: violations,
    },
  });
});

// POST /api/runs/:id/stop - Run停止
runsRouter.post("/:id/stop", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(runs).where(eq(runs.id, id));
  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Run not found" } },
      404
    );
  }

  if (result[0].status !== "running") {
    return c.json(
      { error: { code: "CONFLICT", message: "Run is not running" } },
      409
    );
  }

  const now = new Date().toISOString();

  // TODO: 実際のプロセス停止
  // runnerManager.stop(id);

  const updated = await db
    .update(runs)
    .set({ status: "cancelled", cancelledAt: now })
    .where(eq(runs.id, id))
    .returning();

  return c.json({ data: updated[0] });
});

// POST /api/runs/:id/retry - リトライ（新run作成）
runsRouter.post("/:id/retry", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(runs).where(eq(runs.id, id));
  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Run not found" } },
      404
    );
  }

  const originalRun = result[0];

  if (originalRun.status === "running") {
    return c.json(
      { error: { code: "CONFLICT", message: "Original run is still running" } },
      409
    );
  }

  // 同一taskでrunning中のrunがないか
  const runningRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.taskId, originalRun.taskId), eq(runs.status, "running")));

  if (runningRuns.length > 0) {
    return c.json(
      { error: { code: "CONFLICT", message: "Task already has a running run" } },
      409
    );
  }

  const now = new Date().toISOString();
  const branchName = `agentmine/task-${originalRun.taskId}-${Date.now()}`;
  const worktreePath = `/tmp/agentmine/worktrees/${branchName}`;

  const newRun = await db
    .insert(runs)
    .values({
      taskId: originalRun.taskId,
      agentProfileId: originalRun.agentProfileId,
      status: "running",
      startedAt: now,
      branchName,
      worktreePath,
      scopeSnapshot: originalRun.scopeSnapshot,
    })
    .returning();

  return c.json({ data: newRun[0] }, 201);
});

// POST /api/runs/:id/continue - 追加入力で継続（新run作成）
runsRouter.post("/:id/continue", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { additionalInput } = body;

  if (!additionalInput || additionalInput.trim() === "") {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "additionalInput is required",
        },
      },
      400
    );
  }

  const result = await db.select().from(runs).where(eq(runs.id, id));
  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Run not found" } },
      404
    );
  }

  const originalRun = result[0];

  if (originalRun.status === "running") {
    return c.json(
      { error: { code: "CONFLICT", message: "Original run is still running" } },
      409
    );
  }

  const runningRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.taskId, originalRun.taskId), eq(runs.status, "running")));

  if (runningRuns.length > 0) {
    return c.json(
      { error: { code: "CONFLICT", message: "Task already has a running run" } },
      409
    );
  }

  const now = new Date().toISOString();
  const branchName = `agentmine/task-${originalRun.taskId}-${Date.now()}`;
  const worktreePath = `/tmp/agentmine/worktrees/${branchName}`;

  const newRun = await db
    .insert(runs)
    .values({
      taskId: originalRun.taskId,
      agentProfileId: originalRun.agentProfileId,
      status: "running",
      startedAt: now,
      branchName,
      worktreePath,
      scopeSnapshot: originalRun.scopeSnapshot,
      // TODO: additionalInputをログに記録
    })
    .returning();

  return c.json({ data: newRun[0] }, 201);
});
