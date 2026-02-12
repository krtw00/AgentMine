import { Hono } from "hono";
import { db } from "../db";
import { settings, projects, eq, and } from "@agentmine/db";
import type { DodRequiredChecks } from "@agentmine/shared";

export const settingsRouter = new Hono();

// GET /api/projects/:projectId/settings - そのProjectの全settings取得
settingsRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

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

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.projectId, projectId));

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
<<<<<<< HEAD
              message: `dod.requiredChecks[${i}] must have check_key, label, and command`,
=======
              message: "dod.requiredChecks must be an array",
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
            },
          },
          400
        );
      }
<<<<<<< HEAD
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

=======
      const checkKeys = new Set<string>();
      for (const check of entry.value) {
        if (!check.check_key || !check.label || !check.command) {
          return c.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "Each requiredCheck must have check_key, label, and command",
              },
            },
            400
          );
        }
        if (checkKeys.has(check.check_key)) {
          return c.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: `Duplicate check_key: ${check.check_key}`,
              },
            },
            400
          );
        }
        checkKeys.add(check.check_key);
      }
    }
  }

  // upsert each key
  for (const entry of entries) {
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.projectId, projectId), eq(settings.key, entry.key)));

    if (existing.length > 0) {
      await db.update(settings).set({ value: entry.value }).where(eq(settings.id, existing[0]!.id));
    } else {
      await db.insert(settings).values({
        projectId,
        key: entry.key,
        value: entry.value,
      });
    }
  }

  // 更新後の設定を返す
  const rows = await db.select().from(settings).where(eq(settings.projectId, projectId));

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const parts = row.key.split(".");
    if (parts.length === 2) {
      const [namespace, name] = parts;
      if (!result[namespace!]) {
        result[namespace!] = {};
      }
      (result[namespace!] as Record<string, unknown>)[name!] = row.value;
    } else {
      result[row.key] = row.value;
    }
  }

  return c.json({ data: result });
});
>>>>>>> 63f99f35976f5a6e81eb0dd7487376c04b56f0ad
