import { Hono } from "hono";
import { db } from "../db";
import { scopeViolations, eq } from "@agentmine/db";

export const scopeViolationsRouter = new Hono();

// POST /api/scope-violations/:id/approve
scopeViolationsRouter.post("/:id/approve", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(scopeViolations).where(eq(scopeViolations.id, id));
  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Scope violation not found" } }, 404);
  }

  const violation = result[0]!;
  if (violation.approvedStatus !== "pending") {
    return c.json({ error: { code: "CONFLICT", message: "Scope violation already decided" } }, 409);
  }

  const now = new Date().toISOString();
  const updated = await db
    .update(scopeViolations)
    .set({ approvedStatus: "approved", decidedAt: now })
    .where(eq(scopeViolations.id, id))
    .returning();

  return c.json({ data: updated[0]! });
});

// POST /api/scope-violations/:id/reject
scopeViolationsRouter.post("/:id/reject", async (c) => {
  const id = Number(c.req.param("id"));

  const result = await db.select().from(scopeViolations).where(eq(scopeViolations.id, id));
  if (result.length === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Scope violation not found" } }, 404);
  }

  const violation = result[0]!;
  if (violation.approvedStatus !== "pending") {
    return c.json({ error: { code: "CONFLICT", message: "Scope violation already decided" } }, 409);
  }

  const now = new Date().toISOString();
  const updated = await db
    .update(scopeViolations)
    .set({ approvedStatus: "rejected", decidedAt: now })
    .where(eq(scopeViolations.id, id))
    .returning();

  return c.json({ data: updated[0]! });
});
