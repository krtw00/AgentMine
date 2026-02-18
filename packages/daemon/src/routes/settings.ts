import { Hono } from "hono";
import { db } from "../db";
import { settings, projects, eq, and } from "@agentmine/db";
import type { DodRequiredChecks } from "@agentmine/shared";

export const settingsRouter = new Hono();

// GET /api/projects/:projectId/settings - そのProjectの全settings取得
settingsRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

  // プロジェクト存在確認
  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  if (project.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  const result = await db.select().from(settings).where(eq(settings.projectId, projectId));

  return c.json({ data: result });
});

// PATCH /api/projects/:projectId/settings - key単位でupsert（作成 or 更新）
settingsRouter.patch("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();
  const { key, value } = body;

  // バリデーション
  if (!key) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "key is required",
        },
      },
      400
    );
  }
  if (value === undefined) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "value is required",
        },
      },
      400
    );
  }

  // dod.requiredChecksのバリデーション
  if (key === "dod.requiredChecks") {
    if (!Array.isArray(value)) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "dod.requiredChecks must be an array",
          },
        },
        400
      );
    }

    const checks = value as DodRequiredChecks;

    // 各要素にcheck_key/label/commandがあるか確認
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      if (!check || !check.check_key || !check.label || !check.command) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: `dod.requiredChecks[${i}] must have check_key, label, and command`,
            },
          },
          400
        );
      }
    }

    // check_keyが配列内で一意か確認（Project内で一意）
    const checkKeys = checks.map((c) => c.check_key);
    const uniqueCheckKeys = new Set(checkKeys);
    if (checkKeys.length !== uniqueCheckKeys.size) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "check_key must be unique within the project",
          },
        },
        400
      );
    }
  }

  // プロジェクト存在確認
  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  if (project.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
  }

  // 既存レコード確認
  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.projectId, projectId), eq(settings.key, key)));

  let result;
  if (existing.length > 0) {
    // 更新
    result = await db
      .update(settings)
      .set({ value })
      .where(and(eq(settings.projectId, projectId), eq(settings.key, key)))
      .returning();
  } else {
    // 作成
    result = await db
      .insert(settings)
      .values({
        projectId,
        key,
        value,
      })
      .returning();
  }

  return c.json({ data: result[0] });
});
