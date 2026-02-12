import { Hono } from "hono";
import { db } from "../db";
import { projectMemories, eq, and, desc } from "@agentmine/db";

export const memoriesRouter = new Hono();

// 有効なtype値
const VALID_TYPES = ["pattern", "warning", "learning", "context"] as const;
const VALID_SOURCES = ["human", "run", "learning"] as const;

// GET /api/projects/:projectId/memories - 一覧取得
memoriesRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const typeFilter = c.req.query("type");
  const activeFilter = c.req.query("active");
  const tagsFilter = c.req.query("tags");
  const limit = Number(c.req.query("limit")) || 50;

  // SQLレベルでフィルタリング条件を構築
  const conditions = [eq(projectMemories.projectId, projectId)];

  // type フィルタ
  if (typeFilter && VALID_TYPES.includes(typeFilter as (typeof VALID_TYPES)[number])) {
    conditions.push(eq(projectMemories.type, typeFilter));
  }

  // active フィルタ（デフォルトはtrue）
  const showActive = activeFilter !== "false";
  if (showActive) {
    conditions.push(eq(projectMemories.active, true));
  }

  // SQLクエリ実行（フィルタ後にLIMIT適用）
  const results = await db
    .select()
    .from(projectMemories)
    .where(and(...conditions))
    .orderBy(desc(projectMemories.relevanceScore))
    .limit(limit);

  // tags フィルタ（JSONフィールドのためメモリ内でフィルタ、十分な結果を取得済み）
  let filtered = results;
  if (tagsFilter) {
    const searchTags = tagsFilter.split(",").map((t) => t.trim().toLowerCase());
    filtered = filtered.filter((m) => {
      if (!m.tags) return false;
      const memoryTags = m.tags.map((t) => t.toLowerCase());
      return searchTags.some((st) => memoryTags.includes(st));
    });
  }

  return c.json({ data: filtered });
});

// POST /api/projects/:projectId/memories - 作成
memoriesRouter.post("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const { type, content, source, sourceRunId, tags, relevanceScore } = body;

  // バリデーション
  if (!type || !VALID_TYPES.includes(type)) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `type must be one of: ${VALID_TYPES.join(", ")}`,
        },
      },
      400
    );
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "content is required" } }, 400);
  }

  if (source && !VALID_SOURCES.includes(source)) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `source must be one of: ${VALID_SOURCES.join(", ")}`,
        },
      },
      400
    );
  }

  if (relevanceScore !== undefined && (relevanceScore < 0 || relevanceScore > 1)) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "relevanceScore must be between 0 and 1",
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const result = await db
    .insert(projectMemories)
    .values({
      projectId,
      type,
      content: content.trim(),
      source: source ?? "human",
      sourceRunId: sourceRunId ?? null,
      tags: tags ?? null,
      relevanceScore: relevanceScore ?? 1.0,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ data: result[0] }, 201);
});

// GET /api/projects/:projectId/memories/:memoryId - 単体取得
memoriesRouter.get("/:memoryId", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const memoryId = Number(c.req.param("memoryId"));

  // projectIdとmemoryIdの両方でチェック（セキュリティ対策）
  const result = await db
    .select()
    .from(projectMemories)
    .where(and(eq(projectMemories.id, memoryId), eq(projectMemories.projectId, projectId)));

  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Memory not found" } }, 404);
  }

  return c.json({ data: result[0] });
});

// PATCH /api/projects/:projectId/memories/:memoryId - 更新
memoriesRouter.patch("/:memoryId", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const memoryId = Number(c.req.param("memoryId"));
  const body = await c.req.json();

  // projectIdとmemoryIdの両方でチェック（セキュリティ対策）
  const existing = await db
    .select()
    .from(projectMemories)
    .where(and(eq(projectMemories.id, memoryId), eq(projectMemories.projectId, projectId)));

  if (existing.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Memory not found" } }, 404);
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  // type
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type)) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `type must be one of: ${VALID_TYPES.join(", ")}`,
          },
        },
        400
      );
    }
    updateData.type = body.type;
  }

  // content
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || body.content.trim() === "") {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "content cannot be empty" } },
        400
      );
    }
    updateData.content = body.content.trim();
  }

  // relevanceScore
  if (body.relevanceScore !== undefined) {
    if (body.relevanceScore < 0 || body.relevanceScore > 1) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "relevanceScore must be between 0 and 1",
          },
        },
        400
      );
    }
    updateData.relevanceScore = body.relevanceScore;
  }

  // tags
  if (body.tags !== undefined) {
    updateData.tags = body.tags;
  }

  // active
  if (body.active !== undefined) {
    updateData.active = body.active;
  }

  // projectIdも条件に含める（セキュリティ対策）
  const result = await db
    .update(projectMemories)
    .set(updateData)
    .where(and(eq(projectMemories.id, memoryId), eq(projectMemories.projectId, projectId)))
    .returning();

  return c.json({ data: result[0] });
});

// DELETE /api/projects/:projectId/memories/:memoryId - 削除
memoriesRouter.delete("/:memoryId", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const memoryId = Number(c.req.param("memoryId"));

  // projectIdとmemoryIdの両方でチェック（セキュリティ対策）
  const result = await db
    .delete(projectMemories)
    .where(and(eq(projectMemories.id, memoryId), eq(projectMemories.projectId, projectId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Memory not found" } }, 404);
  }

  return c.body(null, 204);
});
