import * as fs from "fs";
import * as path from "path";
import { KnowledgeBaseItem } from "./services/designSystemService";
import { loadDesignAssistantConfig } from "./config";
import { getKnowledgeBasePath, getWorkspaceRoot } from "./workspacePaths";

const KB_PATH = getKnowledgeBasePath();

function propsTable(item: KnowledgeBaseItem): string {
  const props = item.analysis.props || [];
  if (props.length === 0) return "_Sem props mapeadas._";
  const lines = [
    "| Prop | Tipo | Descricao |",
    "| --- | --- | --- |",
    ...props.map((prop) => `| ${prop.name} | ${prop.type} | ${prop.description || ""} |`),
  ];
  return lines.join("\n");
}

function variantsList(item: KnowledgeBaseItem): string {
  const variants = item.analysis.variants || [];
  if (variants.length === 0) return "_Sem variants mapeadas._";
  return variants.map((variant) => `- \`${variant.name}\`: ${variant.values.join(", ")}`).join("\n");
}

function buildMarkdown(kb: KnowledgeBaseItem[]): string {
  const sections = kb.map((item) => {
    return [
      `## ${item.componentName}`,
      `- Fonte: \`${item.sourcePath || "desconhecida"}\``,
      `- Use quando: ${item.analysis.useWhen || ""}`,
      `- Evite quando: ${item.analysis.avoidWhen || ""}`,
      "",
      "### Props",
      propsTable(item),
      "",
      "### Variants",
      variantsList(item),
      "",
      "### Exemplo",
      "```tsx",
      item.analysis.exampleUsage || `<${item.componentName} />`,
      "```",
      "",
    ].join("\n");
  });

  return [
    "# Design System Documentation",
    "",
    `Componentes documentados: ${kb.length}`,
    "",
    ...sections,
  ].join("\n");
}

export function generateMarkdownDocumentation(kb: KnowledgeBaseItem[]): string {
  const config = loadDesignAssistantConfig();
  const outputPath = path.resolve(getWorkspaceRoot(), config.docsOutputPath);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const markdown = buildMarkdown(kb);
  fs.writeFileSync(outputPath, markdown, "utf-8");
  return outputPath;
}

export function loadKnowledgeBaseFromDisk(): KnowledgeBaseItem[] {
  if (!fs.existsSync(KB_PATH)) return [];
  const raw = fs.readFileSync(KB_PATH, "utf-8");
  return JSON.parse(raw) as KnowledgeBaseItem[];
}
