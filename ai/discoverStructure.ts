import * as fs from "fs";
import * as path from "path";

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/").toLowerCase();
}

function shouldIgnorePath(fullPath: string, exclude: string[]): boolean {
  const normalized = normalizePath(fullPath);
  return exclude.some((entry) => {
    const token = `/${normalizePath(entry)}/`;
    return normalized.includes(token);
  });
}

function hasComponentLikeFiles(
  rootDir: string,
  extensions: string[],
  maxDepth = 2
): boolean {
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth > maxDepth) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
        continue;
      }
      if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

export function discoverIncludePaths(
  workspaceRoot: string,
  exclude: string[],
  extensions: string[]
): string[] {
  const discovered = new Set<string>();
  const maxDepth = 5;
  const queue: Array<{ dir: string; depth: number }> = [
    { dir: workspaceRoot, depth: 0 },
  ];
  const componentDirectoryNames = new Set(["components", "ui"]);

  const commonCandidates = [
    "src/components",
    "src/ui",
    "components",
    "ui",
    "app/components",
    "app/ui",
    "frontend/src/components",
    "frontend/src/ui",
    "frontend/components",
    "frontend/ui",
    "apps/web/src/components",
    "apps/web/src/ui",
    "packages/ui/src/components",
    "packages/ui/components",
  ];

  for (const candidate of commonCandidates) {
    const fullPath = path.resolve(workspaceRoot, candidate);
    if (fs.existsSync(fullPath) && hasComponentLikeFiles(fullPath, extensions, 2)) {
      discovered.add(candidate.replace(/\\/g, "/"));
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth > maxDepth) continue;
    if (shouldIgnorePath(current.dir, exclude)) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(current.dir, entry.name);
      if (shouldIgnorePath(fullPath, exclude)) continue;

      const name = entry.name.toLowerCase();
      if (componentDirectoryNames.has(name) && hasComponentLikeFiles(fullPath, extensions, 2)) {
        const relative = path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
        if (relative && relative !== ".") {
          discovered.add(relative);
        }
      }

      queue.push({ dir: fullPath, depth: current.depth + 1 });
    }
  }

  return [...discovered];
}

