import { Hono } from "hono";
import { db } from "../db";
import { agentProfiles, runs, eq, and } from "@agentmine/db";

// Runner定義（静的）
const RUNNERS = {
  claude: {
    name: "claude",
    displayName: "Claude CLI",
    capabilities: {
      supportsModel: true,
      supportsNonInteractive: true,
      supportsPromptFileInclusion: true,
      availableModels: ["sonnet", "opus", "haiku"],
    },
  },
  codex: {
    name: "codex",
    displayName: "Codex CLI",
    capabilities: {
      supportsModel: false,
      supportsNonInteractive: true,
      supportsPromptFileInclusion: false,
      availableModels: [],
    },
  },
};

export const agentProfilesRouter = new Hono();

// GET /api/projects/:projectId/agent-profiles - 一覧取得
agentProfilesRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

  const result = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.projectId, projectId));

  return c.json({ data: result });
});

// POST /api/projects/:projectId/agent-profiles - 作成
agentProfilesRouter.post("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const {
    name,
    description,
    runner,
    model,
    promptTemplate,
    defaultExclude,
    defaultWriteScope,
    config,
  } = body;

  // バリデーション
  if (!name) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "name is required" } },
      400
    );
  }
  if (!runner || !(runner in RUNNERS)) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid runner" } },
      400
    );
  }

  const runnerConfig = RUNNERS[runner as keyof typeof RUNNERS];

  // model指定時、runnerがサポートしているか確認
  if (model && !runnerConfig.capabilities.supportsModel) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Runner ${runner} does not support model selection`,
        },
      },
      400
    );
  }

  // 同一project内で名前の重複チェック
  const existing = await db
    .select()
    .from(agentProfiles)
    .where(
      and(eq(agentProfiles.projectId, projectId), eq(agentProfiles.name, name))
    );

  if (existing.length > 0) {
    return c.json(
      { error: { code: "CONFLICT", message: "Name already exists" } },
      409
    );
  }

  const now = new Date().toISOString();
  const result = await db
    .insert(agentProfiles)
    .values({
      projectId,
      name,
      description: description ?? null,
      runner,
      model: model ?? null,
      promptTemplate: promptTemplate ?? null,
      defaultExclude: defaultExclude ?? [],
      defaultWriteScope: defaultWriteScope ?? null,
      config: config ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ data: result[0] }, 201);
});

// GET /api/agent-profiles/:id - 単体取得
agentProfilesRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, id));

  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Agent profile not found" } },
      404
    );
  }

  const profile = result[0];
  const runnerConfig = RUNNERS[profile.runner as keyof typeof RUNNERS];

  return c.json({
    data: {
      ...profile,
      runnerCapabilities: runnerConfig?.capabilities ?? null,
    },
  });
});

// PATCH /api/agent-profiles/:id - 更新
agentProfilesRouter.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();

  // 既存レコード確認
  const existing = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, id));
  if (existing.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Agent profile not found" } },
      404
    );
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.runner !== undefined) updateData.runner = body.runner;
  if (body.model !== undefined) updateData.model = body.model;
  if (body.promptTemplate !== undefined)
    updateData.promptTemplate = body.promptTemplate;
  if (body.defaultExclude !== undefined)
    updateData.defaultExclude = body.defaultExclude;
  if (body.defaultWriteScope !== undefined)
    updateData.defaultWriteScope = body.defaultWriteScope;
  if (body.config !== undefined) updateData.config = body.config;

  const result = await db
    .update(agentProfiles)
    .set(updateData)
    .where(eq(agentProfiles.id, id))
    .returning();

  return c.json({ data: result[0] });
});

// DELETE /api/agent-profiles/:id - 削除
agentProfilesRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  // running中のrunで使用されていないか確認
  const runningRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.agentProfileId, id), eq(runs.status, "running")));

  if (runningRuns.length > 0) {
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "Profile is in use by running runs",
        },
      },
      409
    );
  }

  const result = await db
    .delete(agentProfiles)
    .where(eq(agentProfiles.id, id))
    .returning();

  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Agent profile not found" } },
      404
    );
  }

  return c.body(null, 204);
});
