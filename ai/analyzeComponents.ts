import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { readComponents } from "./readComponents";

const KB_PATH = path.resolve(__dirname, "./knowledge-base.json");
const CACHE_PATH = path.resolve(__dirname, "./analysis-cache.json");

type ComponentAnalysis = {
  props: { name: string; type: string; description: string }[];
  variants: { name: string; values: string[] }[];
  useWhen: string;
  avoidWhen: string;
  exampleUsage: string;
};

type KnowledgeBaseItem = {
  componentName: string;
  analysis: ComponentAnalysis;
};

type AnalysisCacheItem = {
  fileName: string;
  contentHash: string;
  item: KnowledgeBaseItem;
};

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function loadCache(): AnalysisCacheItem[] {
  if (!fs.existsSync(CACHE_PATH)) return [];
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalysisCacheItem[]) : [];
  } catch {
    return [];
  }
}

function saveCache(cache: AnalysisCacheItem[]) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function inferTypeFromDefault(defaultValue?: string): string {
  if (!defaultValue) return "unknown";
  const normalized = defaultValue.trim();
  if (normalized === "true" || normalized === "false") return "boolean";
  if (/^["'`].*["'`]$/.test(normalized)) return "string";
  if (/^\d+(\.\d+)?$/.test(normalized)) return "number";
  if (normalized.startsWith("[") && normalized.endsWith("]")) return "array";
  if (normalized.startsWith("{") && normalized.endsWith("}")) return "object";
  return "unknown";
}

function extractProps(content: string): { name: string; type: string; description: string }[] {
  const functionMatch = content.match(
    /function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*{([\s\S]*?)}\s*:\s*[\s\S]*?\)\s*{/
  );

  if (!functionMatch) return [];

  const rawProps = functionMatch[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith("..."));

  return rawProps.map((prop) => {
    const [rawName, rawDefault] = prop.split("=");
    const name = rawName.trim();
    const defaultValue = rawDefault?.trim();
    const type = inferTypeFromDefault(defaultValue);
    return {
      name,
      type,
      description: `Prop ${name}`,
    };
  });
}

function extractVariants(content: string): { name: string; values: string[] }[] {
  const blockMatch = content.match(
    /variants\s*:\s*{([\s\S]*?)}\s*,\s*defaultVariants/s
  );

  if (!blockMatch) return [];

  const block = blockMatch[1];
  const variants: { name: string; values: string[] }[] = [];
  const variantGroupRegex = /(["']?[A-Za-z0-9_-]+["']?)\s*:\s*{([\s\S]*?)\n\s*},?/g;

  let groupMatch = variantGroupRegex.exec(block);
  while (groupMatch) {
    const rawGroupName = groupMatch[1].replace(/["']/g, "");
    const groupBody = groupMatch[2];
    const values: string[] = [];
    const valueRegex = /(?:^|\n)\s*(["']?[A-Za-z0-9_-]+["']?)\s*:/g;
    let valueMatch = valueRegex.exec(groupBody);
    while (valueMatch) {
      values.push(valueMatch[1].replace(/["']/g, ""));
      valueMatch = valueRegex.exec(groupBody);
    }

    if (values.length > 0) {
      variants.push({ name: rawGroupName, values });
    }
    groupMatch = variantGroupRegex.exec(block);
  }

  return variants;
}

function extractComponentName(fileName: string, content: string): string {
  const exportMatch = content.match(/export\s*{\s*([A-Z][A-Za-z0-9_]*)[\s,}]/);
  if (exportMatch) return exportMatch[1];
  return path.basename(fileName, path.extname(fileName));
}

function generateExampleUsage(componentName: string, variants: { name: string; values: string[] }[]): string {
  if (variants.length === 0) return `<${componentName} />`;
  const variantAttrs = variants
    .filter((variant) => variant.values.length > 0)
    .map((variant) => `${variant.name}="${variant.values[0]}"`)
    .join(" ");
  return `<${componentName} ${variantAttrs}>Conteudo</${componentName}>`;
}

function generateUsageHints(componentName: string): { useWhen: string; avoidWhen: string } {
  const name = componentName.toLowerCase();
  if (name.includes("button")) {
    return {
      useWhen: "Quando precisar de uma acao principal ou secundaria com clique.",
      avoidWhen: "Quando for apenas navegacao sem acao; prefira um link.",
    };
  }
  if (name.includes("card")) {
    return {
      useWhen: "Quando precisar agrupar conteudo relacionado em um bloco visual.",
      avoidWhen: "Quando a informacao for simples e nao exigir agrupamento.",
    };
  }
  if (name.includes("sidebar") || name.includes("topbar")) {
    return {
      useWhen: "Quando compor estrutura de navegacao da interface.",
      avoidWhen: "Quando o fluxo nao exigir navegacao persistente.",
    };
  }
  return {
    useWhen: "Quando esse componente representar bem o padrao visual e funcional necessario.",
    avoidWhen: "Quando um elemento HTML nativo atender melhor com menor complexidade.",
  };
}

function analyzeComponent(fileName: string, content: string): KnowledgeBaseItem {
  const componentName = extractComponentName(fileName, content);
  const props = extractProps(content);
  const variants = extractVariants(content);
  const { useWhen, avoidWhen } = generateUsageHints(componentName);
  const exampleUsage = generateExampleUsage(componentName, variants);

  return {
    componentName,
    analysis: {
      props,
      variants,
      useWhen,
      avoidWhen,
      exampleUsage,
    },
  };
}

export function generateKnowledgeBase(): KnowledgeBaseItem[] {
  const components = readComponents();
  const previousCache = loadCache();
  const cacheByFileName = new Map(previousCache.map((entry) => [entry.fileName, entry]));
  let reused = 0;
  let analyzed = 0;

  const nextCache: AnalysisCacheItem[] = [];
  const kb = components
    .map((component) => {
      const contentHash = hashContent(component.content);
      const cached = cacheByFileName.get(component.fileName);

      if (cached && cached.contentHash === contentHash) {
        reused += 1;
        nextCache.push(cached);
        return cached.item;
      }

      const analyzedItem = analyzeComponent(component.fileName, component.content);
      analyzed += 1;
      nextCache.push({
        fileName: component.fileName,
        contentHash,
        item: analyzedItem,
      });
      return analyzedItem;
    })
    .sort((a, b) => a.componentName.localeCompare(b.componentName));

  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), "utf-8");
  saveCache(nextCache);
  console.log(`Reutilizados por hash: ${reused} | Reanalisados: ${analyzed}`);
  return kb;
}

function main() {
  const kb = generateKnowledgeBase();
  console.log(`knowledge-base atualizada com ${kb.length} componente(s).`);
}

if (require.main === module) {
  main();
}
