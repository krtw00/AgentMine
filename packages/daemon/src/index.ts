import { serve } from "@hono/node-server";
import { runMigrations, runs, eq } from "@agentmine/db";
import { app } from "./app";
import { db } from "./db";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3001;

async function cleanupStaleRuns() {
  const staleRuns = await db.select().from(runs).where(eq(runs.status, "running"));

  if (staleRuns.length === 0) return;

  const now = new Date().toISOString();
  await db
    .update(runs)
    .set({ status: "failed", exitCode: -1, finishedAt: now })
    .where(eq(runs.status, "running"));

  console.log(`Cleaned up ${staleRuns.length} stale running run(s)`);
}

async function main() {
  // マイグレーションを実行
  const migrationsFolder = process.env.MIGRATIONS_PATH || join(__dirname, "../../db/drizzle");
  console.log("Running migrations...");
  await runMigrations(db, migrationsFolder);
  console.log("Migrations completed");

  // 前回の起動で残ったゾンビRunをクリーンアップ
  await cleanupStaleRuns();

  console.log(`AgentMine Daemon starting on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

main().catch((err) => {
  console.error("Failed to start daemon:", err);
  process.exit(1);
});
