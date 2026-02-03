import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Projects
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  repoPath: text("repo_path").notNull(),
  baseBranch: text("base_branch").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Tasks
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  parentId: integer("parent_id"),
  title: text("title").notNull(),
  description: text("description"),
  writeScope: text("write_scope", { mode: "json" }).notNull().$type<string[]>(),
  cancelledAt: text("cancelled_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Task Dependencies
export const taskDependencies = sqliteTable("task_dependencies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  dependsOnTaskId: integer("depends_on_task_id")
    .notNull()
    .references(() => tasks.id),
});

// Agent Profiles
export const agentProfiles = sqliteTable("agent_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  runner: text("runner").notNull(),
  model: text("model"),
  promptTemplate: text("prompt_template"),
  defaultExclude: text("default_exclude", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default([]),
  defaultWriteScope: text("default_write_scope", { mode: "json" }).$type<
    string[] | null
  >(),
  config: text("config", { mode: "json" }).$type<Record<
    string,
    unknown
  > | null>(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Runs
export const runs = sqliteTable("runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id),
  agentProfileId: integer("agent_profile_id")
    .notNull()
    .references(() => agentProfiles.id),
  status: text("status").notNull().default("running"),
  exitCode: integer("exit_code"),
  startedAt: text("started_at").notNull().default("CURRENT_TIMESTAMP"),
  finishedAt: text("finished_at"),
  cancelledAt: text("cancelled_at"),
  branchName: text("branch_name").notNull(),
  worktreePath: text("worktree_path").notNull(),
  headSha: text("head_sha"),
  worktreeDirty: integer("worktree_dirty", { mode: "boolean" }),
  scopeSnapshot: text("scope_snapshot", { mode: "json" }).$type<string[]>(),
  dodSnapshot: text("dod_snapshot", { mode: "json" }),
  logRef: text("log_ref"),
  role: text("role"),  // 'coordinator' | 'worker' | 'reviewer' | null
});

// Checks
export const checks = sqliteTable("checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id),
  checkKey: text("check_key").notNull(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  exitCode: integer("exit_code"),
  outputRef: text("output_ref"),
});

// Scope Violations
export const scopeViolations = sqliteTable("scope_violations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id),
  path: text("path").notNull(),
  reason: text("reason").notNull(),
  approvedStatus: text("approved_status").notNull().default("pending"),
  decidedAt: text("decided_at"),
});

// Settings
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  key: text("key").notNull(),
  value: text("value", { mode: "json" }).notNull(),
});
