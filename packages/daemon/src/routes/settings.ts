import { Hono } from "hono";
import { db } from "../db";
import { settings, eq, and } from "@agentmine/db";

export const settingsRouter = new Hono();

// GET /api/projects/:projectId/settings - 設定取得
settingsRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.projectId, projectId));

  // key-value行をネストされたオブジェクトに組み立てる
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

// PATCH /api/projects/:projectId/settings - 設定更新
settingsRouter.patch("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const body = await c.req.json();

  // ネストされたオブジェクトをフラットなkey-valueペアに変換
  const entries: Array<{ key: string; value: unknown }> = [];
  for (const [namespace, values] of Object.entries(body)) {
    if (typeof values === "object" && values !== null && !Array.isArray(values)) {
      for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
        entries.push({ key: `${namespace}.${name}`, value });
      }
    } else {
      entries.push({ key: namespace, value: values });
    }
  }

  // dod.requiredChecks のバリデーション
  for (const entry of entries) {
    if (entry.key === "dod.requiredChecks") {
      if (!Array.isArray(entry.value)) {
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
      const checkKeys = new Set<string>();
      for (const check of entry.value) {
        if (!check.check_key || !check.label || !check.command) {
          return c.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message:
                  "Each requiredCheck must have check_key, label, and command",
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
      .where(
        and(eq(settings.projectId, projectId), eq(settings.key, entry.key))
      );

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: entry.value })
        .where(eq(settings.id, existing[0]!.id));
    } else {
      await db.insert(settings).values({
        projectId,
        key: entry.key,
        value: entry.value,
      });
    }
  }

  // 更新後の設定を返す
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.projectId, projectId));

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
