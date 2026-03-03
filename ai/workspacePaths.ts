import * as fs from "fs";
import * as path from "path";

export function getWorkspaceRoot(): string {
  const fromEnv = process.env.DESIGN_ASSISTANT_WORKSPACE?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return process.cwd();
}

export function getAssistantDir(): string {
  return path.resolve(getWorkspaceRoot(), ".design-assistant");
}

export function ensureAssistantDir(): string {
  const dir = getAssistantDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getKnowledgeBasePath(): string {
  return path.resolve(getAssistantDir(), "knowledge-base.json");
}

export function getCachePath(): string {
  return path.resolve(getAssistantDir(), "analysis-cache.json");
}

