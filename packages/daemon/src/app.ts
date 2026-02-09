import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { projectsRouter } from "./routes/projects";
import { tasksRouter } from "./routes/tasks";
import { agentProfilesRouter } from "./routes/agent-profiles";
import { memoriesRouter } from "./routes/memories";
import { runsRouter } from "./routes/runs";
import { eventsRouter } from "./routes/events";
import { orchestrateRouter } from "./routes/orchestrate";
import { settingsRouter } from "./routes/settings";

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

// API routes
app.route("/api/projects", projectsRouter);
app.route("/api/projects/:projectId/tasks", tasksRouter);
app.route("/api/tasks", tasksRouter);
app.route("/api/projects/:projectId/agent-profiles", agentProfilesRouter);
app.route("/api/agent-profiles", agentProfilesRouter);
app.route("/api/projects/:projectId/memories", memoriesRouter);
app.route("/api/projects/:projectId/settings", settingsRouter);
app.route("/api/tasks/:taskId/runs", runsRouter);
app.route("/api/runs", runsRouter);
app.route("/api/events", eventsRouter);
app.route("/api/projects/:projectId/orchestrate", orchestrateRouter);

// Runners (static for now)
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
