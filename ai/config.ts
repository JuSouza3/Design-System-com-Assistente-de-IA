import * as fs from "fs";
import * as path from "path";
import { discoverIncludePaths } from "./discoverStructure";
import { getWorkspaceRoot } from "./workspacePaths";

export type DesignAssistantConfig = {
  include: string[];
  extensions: string[];
  exclude: string[];
  docsOutputPath: string;
  autoDiscovery?: boolean;
};

const DEFAULT_CONFIG: DesignAssistantConfig = {
  include: [
    "src/components",
    "src/ui",
    "components",
    "ui",
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
  autoDiscovery: true,
};

function getConfigPath(): string {
  return path.resolve(getWorkspaceRoot(), ".design-assistant.json");
}

export function loadDesignAssistantConfig(): DesignAssistantConfig {
  const CONFIG_PATH = getConfigPath();
  const workspaceRoot = getWorkspaceRoot();
  if (!fs.existsSync(CONFIG_PATH)) {
    const discovered = discoverIncludePaths(
      workspaceRoot,
      DEFAULT_CONFIG.exclude,
      DEFAULT_CONFIG.extensions
    );
    return {
      ...DEFAULT_CONFIG,
      include: [...new Set([...DEFAULT_CONFIG.include, ...discovered])],
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DesignAssistantConfig>;
    const extensions =
      parsed.extensions && parsed.extensions.length > 0
        ? parsed.extensions
        : DEFAULT_CONFIG.extensions;
    const exclude =
      parsed.exclude && parsed.exclude.length > 0
        ? parsed.exclude
        : DEFAULT_CONFIG.exclude;
    const includeBase =
      parsed.include && parsed.include.length > 0
        ? parsed.include
        : DEFAULT_CONFIG.include;
    const autoDiscovery =
      typeof parsed.autoDiscovery === "boolean"
        ? parsed.autoDiscovery
        : true;
    const discovered = autoDiscovery
      ? discoverIncludePaths(workspaceRoot, exclude, extensions)
      : [];

    return {
      include: [...new Set([...includeBase, ...discovered])],
      extensions,
      exclude,
      docsOutputPath: parsed.docsOutputPath || DEFAULT_CONFIG.docsOutputPath,
      autoDiscovery,
    };
  } catch {
    const discovered = discoverIncludePaths(
      workspaceRoot,
      DEFAULT_CONFIG.exclude,
      DEFAULT_CONFIG.extensions
    );
    return {
      ...DEFAULT_CONFIG,
      include: [...new Set([...DEFAULT_CONFIG.include, ...discovered])],
    };
  }
}

export function ensureDefaultConfigFile(): void {
  const CONFIG_PATH = getConfigPath();
  if (fs.existsSync(CONFIG_PATH)) return;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
}
