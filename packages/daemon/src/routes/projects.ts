import { Hono } from "hono";
import { db } from "../db";
import { projects, eq } from "@agentmine/db";

export const projectsRouter = new Hono();

// GET /api/projects - 一覧取得
projectsRouter.get("/", async (c) => {
  const result = await db.select().from(projects);
  return c.json({ data: result });
});

// POST /api/projects - 作成
projectsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { name, repoPath, baseBranch } = body;

  // バリデーション
  if (!name || !repoPath || !baseBranch) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "name, repoPath, baseBranch are required",
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const result = await db
    .insert(projects)
    .values({
      name,
      repoPath,
      baseBranch,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ data: result[0] }, 201);
});

// GET /api/projects/:id - 単体取得
projectsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await db.select().from(projects).where(eq(projects.id, id));

  if (result.length === 0) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      },
      404
    );
  }

  return c.json({ data: result[0] });
});

// PATCH /api/projects/:id - 更新
projectsRouter.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.repoPath !== undefined) updateData.repoPath = body.repoPath;
  if (body.baseBranch !== undefined) updateData.baseBranch = body.baseBranch;

  const result = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, id))
    .returning();

  if (result.length === 0) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      },
      404
    );
  }

  return c.json({ data: result[0] });
});

// DELETE /api/projects/:id - 削除
projectsRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning();

  if (result.length === 0) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      },
      404
    );
  }

  return c.body(null, 204);
});
