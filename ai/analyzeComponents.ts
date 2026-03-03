import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { createHash } from "crypto";
import { readComponents } from "./readComponents";
import {
  ensureAssistantDir,
  getCachePath,
  getKnowledgeBasePath,
} from "./workspacePaths";

const KB_PATH = getKnowledgeBasePath();
const CACHE_PATH = getCachePath();

type ComponentAnalysis = {
  props: { name: string; type: string; description: string }[];
  variants: { name: string; values: string[] }[];
  useWhen: string;
  avoidWhen: string;
  exampleUsage: string;
};

export type KnowledgeBaseItem = {
  componentName: string;
  sourcePath: string;
  analysis: ComponentAnalysis;
};

type AnalysisCacheItem = {
  relativePath: string;
  contentHash: string;
  item: KnowledgeBaseItem;
};

type PropMap = Map<string, string>;

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

function getLiteralType(initializer?: ts.Expression): string {
  if (!initializer) return "unknown";
  switch (initializer.kind) {
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
      return "boolean";
    case ts.SyntaxKind.NumericLiteral:
      return "number";
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return "string";
    case ts.SyntaxKind.ArrayLiteralExpression:
      return "array";
    case ts.SyntaxKind.ObjectLiteralExpression:
      return "object";
    default:
      return "unknown";
  }
}

function typeTextOrUnknown(typeNode?: ts.TypeNode): string {
  return typeNode ? typeNode.getText() : "unknown";
}

function collectInterfaceProps(sourceFile: ts.SourceFile): Map<string, PropMap> {
  const interfaceMap = new Map<string, PropMap>();

  sourceFile.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node)) return;
    const map: PropMap = new Map();
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const propName = member.name.getText(sourceFile).replace(/["']/g, "");
      map.set(propName, typeTextOrUnknown(member.type));
    }
    interfaceMap.set(node.name.text, map);
  });

  return interfaceMap;
}

function extractPropsFromBinding(
  binding: ts.ObjectBindingPattern,
  typeHints?: PropMap
): { name: string; type: string; description: string }[] {
  const props: { name: string; type: string; description: string }[] = [];
  for (const element of binding.elements) {
    if (element.dotDotDotToken) continue;
    const name = element.name.getText();
    const hinted = typeHints?.get(name);
    const inferredFromDefault = getLiteralType(element.initializer);
    props.push({
      name,
      type: hinted || inferredFromDefault,
      description: `Prop ${name}`,
    });
  }
  return props;
}

function extractPropsFromTypeNode(typeNode: ts.TypeNode): PropMap | undefined {
  if (ts.isTypeLiteralNode(typeNode)) {
    const map: PropMap = new Map();
    for (const member of typeNode.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = member.name.getText().replace(/["']/g, "");
      map.set(name, typeTextOrUnknown(member.type));
    }
    return map;
  }

  if (ts.isIntersectionTypeNode(typeNode)) {
    const merged: PropMap = new Map();
    for (const subType of typeNode.types) {
      const partial = extractPropsFromTypeNode(subType);
      if (!partial) continue;
      for (const [name, value] of partial.entries()) {
        merged.set(name, value);
      }
    }
    return merged.size > 0 ? merged : undefined;
  }

  return undefined;
}

function extractTypeReferenceProps(
  typeNode: ts.TypeNode,
  interfaceMap: Map<string, PropMap>
): PropMap | undefined {
  if (!ts.isTypeReferenceNode(typeNode)) return undefined;
  const refName = typeNode.typeName.getText();
  return interfaceMap.get(refName);
}

function extractProps(
  sourceFile: ts.SourceFile,
  interfaceMap: Map<string, PropMap>
): { name: string; type: string; description: string }[] {
  const props: { name: string; type: string; description: string }[] = [];

  function fromParameter(parameter: ts.ParameterDeclaration) {
    if (!ts.isObjectBindingPattern(parameter.name)) return;
    const fromTypeNode = parameter.type
      ? extractPropsFromTypeNode(parameter.type) ||
        extractTypeReferenceProps(parameter.type, interfaceMap)
      : undefined;
    props.push(...extractPropsFromBinding(parameter.name, fromTypeNode));
  }

  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
      const firstParam = node.parameters[0];
      if (firstParam) fromParameter(firstParam);
      return;
    }

    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (!/^[A-Z]/.test(declaration.name.text)) continue;
      if (!declaration.initializer) continue;
      if (!ts.isArrowFunction(declaration.initializer) && !ts.isFunctionExpression(declaration.initializer)) {
        continue;
      }
      const firstParam = declaration.initializer.parameters[0];
      if (firstParam) fromParameter(firstParam);
    }
  });

  const dedup = new Map<string, { name: string; type: string; description: string }>();
  for (const prop of props) {
    if (!dedup.has(prop.name)) dedup.set(prop.name, prop);
  }
  return [...dedup.values()];
}

function objectLiteralProperty(node: ts.ObjectLiteralExpression, name: string): ts.ObjectLiteralExpression | undefined {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const propName = property.name.getText().replace(/["']/g, "");
    if (propName !== name) continue;
    if (ts.isObjectLiteralExpression(property.initializer)) {
      return property.initializer;
    }
  }
  return undefined;
}

function extractVariants(sourceFile: ts.SourceFile): { name: string; values: string[] }[] {
  const results: { name: string; values: string[] }[] = [];

  function readVariantObject(variantsObject: ts.ObjectLiteralExpression) {
    for (const variantGroup of variantsObject.properties) {
      if (!ts.isPropertyAssignment(variantGroup)) continue;
      const groupName = variantGroup.name.getText().replace(/["']/g, "");
      if (!ts.isObjectLiteralExpression(variantGroup.initializer)) continue;
      const values: string[] = [];
      for (const valueProperty of variantGroup.initializer.properties) {
        if (!ts.isPropertyAssignment(valueProperty)) continue;
        values.push(valueProperty.name.getText().replace(/["']/g, ""));
      }
      if (values.length > 0) {
        results.push({ name: groupName, values });
      }
    }
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const calleeName = node.expression.getText(sourceFile);
      if (calleeName.endsWith("cva") || calleeName === "cva") {
        const configArg = node.arguments[1];
        if (configArg && ts.isObjectLiteralExpression(configArg)) {
          const variantsObject = objectLiteralProperty(configArg, "variants");
          if (variantsObject) readVariantObject(variantsObject);
        }
      }
    }
    node.forEachChild(visit);
  }

  visit(sourceFile);
  return results;
}

function extractComponentName(sourceFile: ts.SourceFile, fileName: string): string {
  let exportName: string | undefined;

  sourceFile.forEachChild((node) => {
    if (!ts.isExportDeclaration(node) || !node.exportClause) return;
    if (!ts.isNamedExports(node.exportClause)) return;
    const first = node.exportClause.elements[0];
    if (!first) return;
    exportName = first.name.getText(sourceFile);
  });

  if (exportName) return exportName;
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

function analyzeComponent(
  fileName: string,
  relativePath: string,
  content: string
): KnowledgeBaseItem {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const interfaceMap = collectInterfaceProps(sourceFile);
  const componentName = extractComponentName(sourceFile, fileName);
  const props = extractProps(sourceFile, interfaceMap);
  const variants = extractVariants(sourceFile);
  const { useWhen, avoidWhen } = generateUsageHints(componentName);
  const exampleUsage = generateExampleUsage(componentName, variants);

  return {
    componentName,
    sourcePath: relativePath,
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
  ensureAssistantDir();
  const components = readComponents();
  const previousCache = loadCache();
  const cacheByPath = new Map(previousCache.map((entry) => [entry.relativePath, entry]));
  let reused = 0;
  let analyzed = 0;

  const nextCache: AnalysisCacheItem[] = [];
  const kb = components
    .map((component) => {
      const contentHash = hashContent(component.content);
      const cached = cacheByPath.get(component.relativePath);

      if (cached && cached.contentHash === contentHash) {
        reused += 1;
        nextCache.push(cached);
        return cached.item;
      }

      const analyzedItem = analyzeComponent(
        component.fileName,
        component.relativePath,
        component.content
      );
      analyzed += 1;
      nextCache.push({
        relativePath: component.relativePath,
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
