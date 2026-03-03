import * as fs from "fs";
import * as path from "path";
import { loadDesignAssistantConfig } from "./config";
import { getWorkspaceRoot } from "./workspacePaths";

export type ComponentFile = {
  fileName: string;
  filePath: string;
  relativePath: string;
  content: string;
};

function shouldIgnorePath(fullPath: string, exclude: string[]): boolean {
  const normalized = fullPath.replace(/\\/g, "/").toLowerCase();
  return exclude.some((entry) => {
    const token = `/${entry.toLowerCase().replace(/\\/g, "/")}/`;
    return normalized.includes(token);
  });
}

function walkFiles(rootDir: string, exclude: string[], extensions: string[]): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const result: string[] = [];
  const queue: string[] = [rootDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    if (shouldIgnorePath(current, exclude)) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (shouldIgnorePath(fullPath, exclude)) continue;

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (extensions.includes(extension)) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

export function readComponents(): ComponentFile[] {
  const config = loadDesignAssistantConfig();
  const cwd = getWorkspaceRoot();
  const files = config.include.flatMap((entry) =>
    walkFiles(path.resolve(cwd, entry), config.exclude, config.extensions)
  );

  return files.map((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      fileName: path.basename(filePath),
      filePath,
      relativePath: path.relative(cwd, filePath).replace(/\\/g, "/"),
      content,
    };
  });
}

/* Execução direta (debug)
   Permite rodar `ts-node ai/readComponents.ts`
*/
if (require.main === module) {
  const components = readComponents();

  console.log(
    components.map((c) => ({
      file: c.fileName,
      size: c.content.length,
    }))
  );
}
