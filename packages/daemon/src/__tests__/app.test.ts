import { describe, it, expect, vi } from "vitest";

// DB接続をモック（better-sqlite3が必要なため）
vi.mock("../../node_modules/@agentmine/db/dist/index.js", () => ({
  projects: {},
  tasks: {},
  runs: {},
  checks: {},
  scopeViolations: {},
  agentProfiles: {},
  settings: {},
  projectMemories: {},
  taskDependencies: {},
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  sql: vi.fn(),
  createDb: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// RunnerManagerのモック
vi.mock("../runner/manager", () => ({
  runnerManager: {
    getAllAdapters: () => [],
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: () => false,
  },
}));

describe("Hono app", () => {
  it("Health check returns ok", async () => {
    const { app } = await import("../app");
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body).toEqual({ status: "ok" });
  });

  it("GET /api/runners returns runner list", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/runners");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string }[] };
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.name).toBe("claude");
    expect(body.data[1]!.name).toBe("codex");
  });
});
