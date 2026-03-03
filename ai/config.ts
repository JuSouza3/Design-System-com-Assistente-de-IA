import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./workspacePaths";

export type DesignAssistantConfig = {
  include: string[];
  extensions: string[];
  exclude: string[];
  docsOutputPath: string;
};

const DEFAULT_CONFIG: DesignAssistantConfig = {
  include: [
    "src/components",
    "src/ui",
    "components",
    "ui",
    "sample-project/components",
  ],
  extensions: [".tsx", ".jsx", ".ts", ".js"],
  exclude: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
  ],
  docsOutputPath: "docs/design-system.generated.md",
};

function getConfigPath(): string {
  return path.resolve(getWorkspaceRoot(), ".design-assistant.json");
}

export function loadDesignAssistantConfig(): DesignAssistantConfig {
  const CONFIG_PATH = getConfigPath();
  if (!fs.existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DesignAssistantConfig>;

    return {
      include:
        parsed.include && parsed.include.length > 0
          ? parsed.include
          : DEFAULT_CONFIG.include,
      extensions:
        parsed.extensions && parsed.extensions.length > 0
          ? parsed.extensions
          : DEFAULT_CONFIG.extensions,
      exclude:
        parsed.exclude && parsed.exclude.length > 0
          ? parsed.exclude
          : DEFAULT_CONFIG.exclude,
      docsOutputPath:
        parsed.docsOutputPath || DEFAULT_CONFIG.docsOutputPath,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ensureDefaultConfigFile(): void {
  const CONFIG_PATH = getConfigPath();
  if (fs.existsSync(CONFIG_PATH)) return;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
}
