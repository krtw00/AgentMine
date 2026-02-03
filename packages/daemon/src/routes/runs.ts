import { Hono } from "hono";
import { execSync } from "child_process";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { db } from "../db";
import {
  runs,
  tasks,
  agentProfiles,
  projects,
  checks,
  scopeViolations,
  eq,
  and,
} from "@agentmine/db";
import { runnerManager } from "../runner/manager";

// --- 共通ヘルパー: Run作成（worktree作成 → DB insert → ランナー起動） ---

interface StartRunParams {
  taskId: number;
  agentProfileId: number;
  role: string;
  scopeSnapshot: string[];
  task: { title: string; description: string | null; writeScope: string[] | null };
  profile: {
    runner: string;
    model: string | null;
    promptTemplate: string | null;
    config: Record<string, unknown> | null;
  };
  repoPath: string;
}

async function startRun(params: StartRunParams): Promise<
  | { ok: true; run: typeof runs.$inferSelect }
  | { ok: false; error: { code: string; message: string }; status: number }
> {
  const now = new Date().toISOString();
  const branchName = `agentmine/task-${params.taskId}-${Date.now()}`;
  const worktreePath = `/tmp/agentmine/worktrees/${branchName.replace(/\//g, "-")}`;

  // worktreeディレクトリ作成
  const worktreeParent = "/tmp/agentmine/worktrees";
  if (!existsSync(worktreeParent)) {
    mkdirSync(worktreeParent, { recursive: true });
  }

  // git worktree作成
  try {
    execSync(`git worktree add -b "${branchName}" "${worktreePath}" HEAD`, {
      cwd: params.repoPath,
      stdio: "pipe",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: { code: "WORKTREE_ERROR", message: `Failed to create worktree: ${message}` },
      status: 500,
    };
  }

  // HEADのSHAを取得
  let headSha: string | null = null;
  try {
    headSha = execSync("git rev-parse HEAD", { cwd: worktreePath, encoding: "utf-8" }).trim();
  } catch {
    // ignore
  }

  // DB insert
  const result = await db
    .insert(runs)
    .values({
      taskId: params.taskId,
      agentProfileId: params.agentProfileId,
      status: "running",
      startedAt: now,
      branchName,
      worktreePath,
      headSha,
      scopeSnapshot: params.scopeSnapshot,
      role: params.role,
    })
    .returning();

  // プロンプト生成
  const basePrompt = `タスク: ${params.task.title}

説明: ${params.task.description || "なし"}

書き込み可能スコープ: ${(params.task.writeScope || []).join(", ")}

このタスクを完了してください。`;

  const prompt = params.profile.promptTemplate
    ? `${params.profile.promptTemplate}\n\n---\n\n${basePrompt}`
    : basePrompt;

  // RunnerAdapter呼び出し（非同期で実行）
  runnerManager
    .start(
      result[0].id,
      params.profile.runner,
      worktreePath,
      prompt,
      params.profile.model || undefined,
      params.profile.config || undefined
    )
    .catch((err) => {
      console.error(`Failed to start runner for run ${result[0].id}:`, err);
    });

  return { ok: true, run: result[0] };
}

export const runsRouter = new Hono();

// GET /api/tasks/:taskId/runs - タスクのrun一覧
// GET /api/runs - 全run一覧
runsRouter.get("/", async (c) => {
  const taskIdParam = c.req.param("taskId");
  const statusFilter = c.req.query("status");
  const roleFilter = c.req.query("role");

  let result;
  if (taskIdParam) {
    const taskId = Number(taskIdParam);
    result = await db.select().from(runs).where(eq(runs.taskId, taskId));
  } else {
    result = await db.select().from(runs);
  }

  if (statusFilter) {
    result = result.filter((r) => r.status === statusFilter);
  }

  if (roleFilter) {
    result = result.filter((r) => r.role === roleFilter);
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
  const { agentProfileId, role } = body;

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

  // プロジェクト情報取得
  const project = await db.select().from(projects).where(eq(projects.id, task[0].projectId));
  if (project.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      404
    );
  }

  const result = await startRun({
    taskId,
    agentProfileId,
    role: role ?? "worker",
    scopeSnapshot: task[0].writeScope,
    task: task[0],
    profile: profile[0],
    repoPath: project[0].repoPath,
  });

  if (!result.ok) {
    return c.json({ error: { code: result.error.code, message: result.error.message } }, result.status as 500);
  }

  return c.json({ data: result.run }, 201);
});

// GET /api/runs/:id/logs - Runログ取得
runsRouter.get("/:id/logs", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(runs).where(eq(runs.id, id));
  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Run not found" } },
      404
    );
  }

  const logRef = result[0].logRef;
  if (!logRef || !existsSync(logRef)) {
    return c.json({ data: [] });
  }

  try {
    const content = readFileSync(logRef, "utf-8");
    const lines = content
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
    return c.json({ data: lines });
  } catch {
    return c.json({ data: [] });
  }
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

  if (runnerManager.isRunning(id)) {
    await runnerManager.stop(id);
  } else {
    await db
      .update(runs)
      .set({ status: "cancelled", cancelledAt: now })
      .where(eq(runs.id, id));
  }

  const updated = await db.select().from(runs).where(eq(runs.id, id));
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

  // 関連データ取得
  const task = await db.select().from(tasks).where(eq(tasks.id, originalRun.taskId));
  if (task.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  const profile = await db.select().from(agentProfiles).where(eq(agentProfiles.id, originalRun.agentProfileId));
  if (profile.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Agent profile not found" } }, 404);
  }

  const project = await db.select().from(projects).where(eq(projects.id, task[0].projectId));
  if (project.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  const retryResult = await startRun({
    taskId: originalRun.taskId,
    agentProfileId: originalRun.agentProfileId,
    role: originalRun.role ?? "worker",
    scopeSnapshot: originalRun.scopeSnapshot ?? task[0].writeScope,
    task: task[0],
    profile: profile[0],
    repoPath: project[0].repoPath,
  });

  if (!retryResult.ok) {
    return c.json({ error: { code: retryResult.error.code, message: retryResult.error.message } }, retryResult.status as 500);
  }

  return c.json({ data: retryResult.run }, 201);
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

  // 関連データ取得
  const task = await db.select().from(tasks).where(eq(tasks.id, originalRun.taskId));
  if (task.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, 404);
  }

  const profile = await db.select().from(agentProfiles).where(eq(agentProfiles.id, originalRun.agentProfileId));
  if (profile.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Agent profile not found" } }, 404);
  }

  const project = await db.select().from(projects).where(eq(projects.id, task[0].projectId));
  if (project.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  const continueResult = await startRun({
    taskId: originalRun.taskId,
    agentProfileId: originalRun.agentProfileId,
    role: originalRun.role ?? "worker",
    scopeSnapshot: originalRun.scopeSnapshot ?? task[0].writeScope,
    task: task[0],
    profile: profile[0],
    repoPath: project[0].repoPath,
  });

  if (!continueResult.ok) {
    return c.json({ error: { code: continueResult.error.code, message: continueResult.error.message } }, continueResult.status as 500);
  }

  return c.json({ data: continueResult.run }, 201);
});
