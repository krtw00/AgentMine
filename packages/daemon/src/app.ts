import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

export const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:3000"],
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// API routes placeholder
app.get("/api/projects", (c) => c.json({ data: [] }));
app.get("/api/runners", (c) =>
  c.json({
    data: [
      {
        name: "claude",
        displayName: "Claude CLI",
        capabilities: {
          supportsModel: true,
          supportsNonInteractive: true,
          supportsPromptFileInclusion: true,
          availableModels: ["sonnet", "opus", "haiku"],
        },
      },
      {
        name: "codex",
        displayName: "Codex CLI",
        capabilities: {
          supportsModel: false,
          supportsNonInteractive: true,
          supportsPromptFileInclusion: false,
          availableModels: [],
        },
      },
    ],
  })
);
