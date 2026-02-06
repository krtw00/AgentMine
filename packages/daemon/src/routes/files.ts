import { Hono } from "hono";
import { db } from "../db";
import { projects, eq } from "@agentmine/db";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import ignore from "ignore";

interface FileNode {
  path: string;
  type: "file" | "directory";
  children: FileNode[] | null;
}

export const filesRouter = new Hono();

async function loadGitignore(repoPath: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  // Always ignore .git directory
  ig.add(".git");
  try {
    const content = await readFile(join(repoPath, ".gitignore"), "utf-8");
    ig.add(content);
  } catch {
    // .gitignore not found — proceed without it
  }
  return ig;
}

async function buildTree(
  basePath: string,
  currentPath: string,
  ig: ReturnType<typeof ignore>,
  currentDepth: number,
  maxDepth: number
): Promise<FileNode[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relativePath = relative(basePath, fullPath);

    // Check if ignored by .gitignore rules
    const isDir = entry.isDirectory();
    const checkPath = isDir ? relativePath + "/" : relativePath;
    if (ig.ignores(checkPath)) {
      continue;
    }

    if (isDir) {
      let children: FileNode[] | null = null;
      if (currentDepth < maxDepth) {
        children = await buildTree(basePath, fullPath, ig, currentDepth + 1, maxDepth);
      }
      nodes.push({ path: relativePath, type: "directory", children });
    } else {
      nodes.push({ path: relativePath, type: "file", children: null });
    }
  }

  // Sort: directories first, then alphabetical
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  return nodes;
}

// GET /api/projects/:projectId/files
filesRouter.get("/", async (c) => {
  const projectId = Number(c.req.param("projectId"));
  const pathParam = c.req.query("path") ?? ".";
  const depthParam = Number(c.req.query("depth") ?? "2");

  const depth = Number.isNaN(depthParam) || depthParam < 1 ? 2 : depthParam;

  // Get project to find repo_path
  const project = await db.select().from(projects).where(eq(projects.id, projectId));

  if (project.length === 0) {
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

  const repoPath = project[0]!.repoPath;

  // Resolve target path and validate it's within repo
  const targetPath = resolve(repoPath, pathParam);
  if (!targetPath.startsWith(resolve(repoPath))) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Path must be within the project repository",
        },
      },
      400
    );
  }

  // Verify target path exists and is a directory
  try {
    const s = await stat(targetPath);
    if (!s.isDirectory()) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Path is not a directory",
          },
        },
        400
      );
    }
  } catch {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Path not found",
        },
      },
      404
    );
  }

  const ig = await loadGitignore(repoPath);
  const tree = await buildTree(repoPath, targetPath, ig, 1, depth);

  return c.json({ data: tree });
});
