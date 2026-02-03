import { Hono } from "hono";
import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { db } from "../db";
import {
  runs,
  tasks,
  agentProfiles,
  projects,
  eq,
} from "@agentmine/db";
import { runnerManager } from "../runner/manager";

export const orchestrateRouter = new Hono();

// POST /api/projects/:projectId/orchestrate
orchestrateRouter.post("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const { command, agentProfileId } = body;

  // バリデーション
  if (!command || !agentProfileId) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "command and agentProfileId are required",
        },
      },
      400
    );
  }

  // プロジェクト存在確認
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (project.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      404
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

  // 親タスク作成
  const now = new Date().toISOString();
  const parentTask = await db
    .insert(tasks)
    .values({
      projectId,
      title: command,
      writeScope: ["**"],
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const parentTaskId = parentTask[0].id;

  // git worktree作成
  const branchName = `agentmine/coordinator-${parentTaskId}-${Date.now()}`;
  const worktreePath = `/tmp/agentmine/worktrees/${branchName.replace(/\//g, "-")}`;

  const worktreeParent = "/tmp/agentmine/worktrees";
  if (!existsSync(worktreeParent)) {
    mkdirSync(worktreeParent, { recursive: true });
  }

  try {
    execSync(`git worktree add -b "${branchName}" "${worktreePath}" HEAD`, {
      cwd: project[0].repoPath,
      stdio: "pipe",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json(
      {
        error: {
          code: "WORKTREE_ERROR",
          message: `Failed to create worktree: ${message}`,
        },
      },
      500
    );
  }

  // HEADのSHAを取得
  let headSha: string | null = null;
  try {
    headSha = execSync("git rev-parse HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
    }).trim();
  } catch {
    // ignore
  }

  // Coordinator Run作成
  const coordinatorRun = await db
    .insert(runs)
    .values({
      taskId: parentTaskId,
      agentProfileId,
      status: "running",
      startedAt: now,
      branchName,
      worktreePath,
      headSha,
      scopeSnapshot: ["**"],
      role: "coordinator",
    })
    .returning();

  const coordinatorRunId = coordinatorRun[0].id;

  // Coordinator プロンプト生成（Orchestrator + Planner 役割）
  const prompt = `あなたはOrchestrator兼Plannerです。
Human（ユーザー）からの指令を分析し、独立したサブタスクに分解してWorkerを起動してください。

## プロジェクト
- ID: ${projectId}
- リポジトリ: ${project[0].repoPath}

## 利用可能API（curlで呼び出し）
- タスク作成: curl -s -X POST http://localhost:3001/api/projects/${projectId}/tasks \\
    -H "Content-Type: application/json" \\
    -d '{"title":"タスク名","description":"詳細","writeScope":["対象パス"],"parentId":${parentTaskId}}'
- Run開始: curl -s -X POST http://localhost:3001/api/tasks/{taskId}/runs \\
    -H "Content-Type: application/json" \\
    -d '{"agentProfileId":${agentProfileId},"role":"worker"}'
- Run状態確認: curl -s http://localhost:3001/api/runs

## 手順
1. コードベースを分析して現状把握
2. 指令を独立サブタスク（2-4個）に分解
3. 各サブタスクのwriteScopeが重ならないよう設計
4. API経由で各サブタスクを作成（parentId指定）
5. 各タスクにRunを開始
6. 全Run完了を待ち、結果確認
7. 最終報告を出力

## 指令
${command}`;

  // RunnerAdapter呼び出し（非同期で実行）
  runnerManager
    .start(
      coordinatorRunId,
      profile[0].runner,
      worktreePath,
      prompt,
      profile[0].model || undefined,
      profile[0].config || undefined
    )
    .catch((err) => {
      console.error(
        `Failed to start coordinator run ${coordinatorRunId}:`,
        err
      );
    });

  return c.json(
    { data: { parentTaskId, coordinatorRunId } },
    201
  );
});
