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
  getWorkspaceRoot,
} from "./workspacePaths";

const KB_PATH = getKnowledgeBasePath();
const CACHE_PATH = getCachePath();
const ANALYZER_VERSION = 4;

type ComponentAnalysis = {
  props: { name: string; type: string; description: string }[];
  variants: { name: string; values: string[] }[];
  detectedLibraries: {
    name: string;
    confidence: "low" | "medium" | "high";
    reasons: string[];
  }[];
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
  analyzerVersion?: number;
  item: KnowledgeBaseItem;
};

type PropMap = Map<string, string>;
type TypeDeclarationMap = Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>;
type ImportMap = Map<string, { filePath: string; exportedName: string }>;
type SourceContext = {
  filePath: string;
  sourceFile: ts.SourceFile;
  declarations: TypeDeclarationMap;
  imports: ImportMap;
};
type SourceContextCache = Map<string, SourceContext>;

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

function mergePropMaps(...maps: Array<PropMap | undefined>): PropMap | undefined {
  const merged: PropMap = new Map();

  for (const map of maps) {
    if (!map) continue;
    for (const [name, value] of map.entries()) {
      merged.set(name, value);
    }
  }

  return merged.size > 0 ? merged : undefined;
}

function collectTypeDeclarations(sourceFile: ts.SourceFile): TypeDeclarationMap {
  const declarations: TypeDeclarationMap = new Map();

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node)) {
      declarations.set(node.name.text, node);
      return;
    }

    if (ts.isTypeAliasDeclaration(node)) {
      declarations.set(node.name.text, node);
    }
  });

  return declarations;
}

function resolveImportFilePath(
  fromFilePath: string,
  specifier: string
): string | undefined {
  const basePath = path.resolve(path.dirname(fromFilePath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function collectImports(sourceFile: ts.SourceFile, filePath: string): ImportMap {
  const imports: ImportMap = new Map();

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) return;

    const specifier = node.moduleSpecifier.text;
    if (!specifier.startsWith(".")) return;

    const resolvedFilePath = resolveImportFilePath(filePath, specifier);
    if (!resolvedFilePath) return;

    if (node.importClause.name) {
      imports.set(node.importClause.name.text, {
        filePath: resolvedFilePath,
        exportedName: "default",
      });
    }

    const namedBindings = node.importClause.namedBindings;
    if (!namedBindings || ts.isNamespaceImport(namedBindings)) return;

    for (const element of namedBindings.elements) {
      imports.set(element.name.text, {
        filePath: resolvedFilePath,
        exportedName: element.propertyName?.text || element.name.text,
      });
    }
  });

  return imports;
}

function createSourceContext(
  filePath: string,
  content: string,
  cache: SourceContextCache
): SourceContext {
  const normalizedPath = path.resolve(filePath);
  const cached = cache.get(normalizedPath);
  if (cached) return cached;

  const sourceFile = ts.createSourceFile(
    normalizedPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    normalizedPath.endsWith(".tsx") || normalizedPath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const context: SourceContext = {
    filePath: normalizedPath,
    sourceFile,
    declarations: collectTypeDeclarations(sourceFile),
    imports: collectImports(sourceFile, normalizedPath),
  };

  cache.set(normalizedPath, context);
  return context;
}

function loadSourceContextFromFile(
  filePath: string,
  cache: SourceContextCache
): SourceContext | undefined {
  const normalizedPath = path.resolve(filePath);
  const cached = cache.get(normalizedPath);
  if (cached) return cached;
  if (!fs.existsSync(normalizedPath)) return undefined;

  try {
    const content = fs.readFileSync(normalizedPath, "utf-8");
    return createSourceContext(normalizedPath, content, cache);
  } catch {
    return undefined;
  }
}

function getDeclaredTypeByExportName(
  context: SourceContext,
  exportedName: string
): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | undefined {
  if (exportedName === "default") {
    for (const statement of context.sourceFile.statements) {
      if (!ts.isExportAssignment(statement)) continue;
      if (!ts.isIdentifier(statement.expression)) continue;
      return context.declarations.get(statement.expression.text);
    }
    return undefined;
  }

  return context.declarations.get(exportedName);
}

function resolveExpressionValueType(
  expression: ts.Expression,
  variants: { name: string; values: string[] }[]
): string | undefined {
  if (ts.isIdentifier(expression)) {
    const variant = variants.find((item) => item.name === expression.text);
    if (variant && variant.values.length > 0) {
      return variant.values.map((value) => `"${value}"`).join(" | ");
    }
  }

  return undefined;
}

function resolvePropMapFromTypeNode(
  typeNode: ts.TypeNode | undefined,
  context: SourceContext,
  cache: SourceContextCache,
  seen = new Set<string>()
): PropMap | undefined {
  if (!typeNode) return undefined;

  if (ts.isTypeLiteralNode(typeNode)) {
    const map: PropMap = new Map();
    for (const member of typeNode.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const propName = member.name.getText().replace(/["']/g, "");
      map.set(propName, typeTextOrUnknown(member.type));
    }
    return map;
  }

  if (ts.isIntersectionTypeNode(typeNode)) {
    return mergePropMaps(
      ...typeNode.types.map((subType) =>
        resolvePropMapFromTypeNode(subType, context, cache, seen)
      )
    );
  }

  if (ts.isParenthesizedTypeNode(typeNode)) {
    return resolvePropMapFromTypeNode(typeNode.type, context, cache, seen);
  }

  if (ts.isExpressionWithTypeArguments(typeNode)) {
    const expression = typeNode.expression;
    const refName = ts.isIdentifier(expression)
      ? expression.text
      : ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : undefined;

    if (!refName) return undefined;

    return resolveNamedTypeReference(refName, context, cache, seen);
  }

  if (ts.isTypeReferenceNode(typeNode)) {
    const refName = ts.isIdentifier(typeNode.typeName)
      ? typeNode.typeName.text
      : typeNode.typeName.getText();
    return resolveNamedTypeReference(refName, context, cache, seen);
  }

  return undefined;
}

function resolveNamedTypeReference(
  refName: string,
  context: SourceContext,
  cache: SourceContextCache,
  seen: Set<string>
): PropMap | undefined {
  if (seen.has(`${context.filePath}:${refName}`)) return undefined;

  let declaration = context.declarations.get(refName);
  let declarationContext = context;

  if (!declaration) {
    const importEntry = context.imports.get(refName);
    if (importEntry) {
      const importedContext = loadSourceContextFromFile(importEntry.filePath, cache);
      const importedDeclaration = importedContext
        ? getDeclaredTypeByExportName(importedContext, importEntry.exportedName)
        : undefined;

      if (importedContext && importedDeclaration) {
        declaration = importedDeclaration;
        declarationContext = importedContext;
      }
    }
  }

  if (!declaration) return undefined;

  const seenKey = `${declarationContext.filePath}:${refName}`;
  seen.add(seenKey);

  if (ts.isInterfaceDeclaration(declaration)) {
    const ownProps = resolvePropMapFromTypeNode(
      ts.factory.createTypeLiteralNode(
        declaration.members.filter(ts.isPropertySignature)
      ),
      declarationContext,
      cache,
      seen
    );

    const inheritedProps = mergePropMaps(
      ...(declaration.heritageClauses || []).flatMap((clause) =>
        clause.types.map((heritageType) =>
          resolvePropMapFromTypeNode(
            heritageType,
            declarationContext,
            cache,
            seen
          )
        )
      )
    );

    seen.delete(seenKey);
    return mergePropMaps(inheritedProps, ownProps);
  }

  const resolved = resolvePropMapFromTypeNode(
    declaration.type,
    declarationContext,
    cache,
    seen
  );
  seen.delete(seenKey);
  return resolved;
}

function extractPropsFromBinding(
  binding: ts.ObjectBindingPattern,
  typeHints?: PropMap,
  variants: { name: string; values: string[] }[] = []
): { name: string; type: string; description: string }[] {
  const props: { name: string; type: string; description: string }[] = [];

  for (const element of binding.elements) {
    if (element.dotDotDotToken) continue;

    const bindingName = element.name.getText();
    const propertyName = element.propertyName?.getText() || bindingName;
    const cleanName = propertyName.replace(/["']/g, "");
    const hinted = typeHints?.get(cleanName) || typeHints?.get(propertyName);
    const inferredFromDefault = getLiteralType(element.initializer);
    const inferredFromVariant = element.initializer
      ? resolveExpressionValueType(element.initializer, variants)
      : undefined;

    props.push({
      name: cleanName,
      type: hinted || inferredFromVariant || inferredFromDefault,
      description: `Prop ${cleanName}`,
    });
  }

  return props;
}

function isForwardRefCall(node: ts.CallExpression): boolean {
  if (ts.isIdentifier(node.expression)) {
    return node.expression.text === "forwardRef";
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.name.text === "forwardRef";
  }

  return false;
}

function getComponentFunctionParameter(
  declaration:
    | ts.FunctionDeclaration
    | ts.ArrowFunction
    | ts.FunctionExpression
    | undefined
): ts.ParameterDeclaration | undefined {
  if (!declaration) return undefined;
  return declaration.parameters[0];
}

function extractProps(
  context: SourceContext,
  cache: SourceContextCache,
  variants: { name: string; values: string[] }[]
): { name: string; type: string; description: string }[] {
  const props: { name: string; type: string; description: string }[] = [];

  function fromParameter(
    parameter: ts.ParameterDeclaration,
    fallbackTypeNode?: ts.TypeNode
  ) {
    if (!ts.isObjectBindingPattern(parameter.name)) return;

    const fromTypeNode = resolvePropMapFromTypeNode(
      parameter.type || fallbackTypeNode,
      context,
      cache
    );
    props.push(...extractPropsFromBinding(parameter.name, fromTypeNode, variants));
  }

  context.sourceFile.forEachChild((node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      /^[A-Z]/.test(node.name.text)
    ) {
      const firstParam = getComponentFunctionParameter(node);
      if (firstParam) fromParameter(firstParam);
      return;
    }

    if (!ts.isVariableStatement(node)) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (!/^[A-Z]/.test(declaration.name.text)) continue;
      if (!declaration.initializer) continue;

      if (
        ts.isArrowFunction(declaration.initializer) ||
        ts.isFunctionExpression(declaration.initializer)
      ) {
        const firstParam = getComponentFunctionParameter(declaration.initializer);
        if (firstParam) fromParameter(firstParam);
        continue;
      }

      if (
        ts.isCallExpression(declaration.initializer) &&
        isForwardRefCall(declaration.initializer)
      ) {
        const renderFn = declaration.initializer.arguments[0];
        const fallbackTypeNode = declaration.initializer.typeArguments?.[1];
        if (
          renderFn &&
          (ts.isArrowFunction(renderFn) || ts.isFunctionExpression(renderFn))
        ) {
          const firstParam = getComponentFunctionParameter(renderFn);
          if (firstParam) fromParameter(firstParam, fallbackTypeNode);
        }
      }
    }
  });

  for (const variant of variants) {
    const existing = props.find((prop) => prop.name === variant.name);
    const literalUnion = variant.values.map((value) => `"${value}"`).join(" | ");

    if (existing && existing.type === "unknown") {
      existing.type = literalUnion;
      continue;
    }

    if (!existing) {
      props.push({
        name: variant.name,
        type: literalUnion,
        description: `Prop ${variant.name}`,
      });
    }
  }

  const dedup = new Map<string, { name: string; type: string; description: string }>();
  for (const prop of props) {
    if (!dedup.has(prop.name)) {
      dedup.set(prop.name, prop);
      continue;
    }

    const current = dedup.get(prop.name);
    if (current && current.type === "unknown" && prop.type !== "unknown") {
      dedup.set(prop.name, prop);
    }
  }

  return [...dedup.values()];
}

function objectLiteralProperty(
  node: ts.ObjectLiteralExpression,
  name: string
): ts.ObjectLiteralExpression | undefined {
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

function extractVariants(
  sourceFile: ts.SourceFile
): { name: string; values: string[] }[] {
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

function detectLibraries(
  sourceFile: ts.SourceFile,
  relativePath: string,
  variants: { name: string; values: string[] }[]
): { name: string; confidence: "low" | "medium" | "high"; reasons: string[] }[] {
  const reasons: string[] = [];
  let hasClassVarianceAuthority = false;
  let hasRadixImport = false;
  let hasSlotImport = false;
  let hasCnImport = false;

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }

    const moduleName = node.moduleSpecifier.text;
    if (moduleName === "class-variance-authority") {
      hasClassVarianceAuthority = true;
      reasons.push("usa class-variance-authority");
    }

    if (moduleName.startsWith("@radix-ui/")) {
      hasRadixImport = true;
      reasons.push(`importa ${moduleName}`);
      if (
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings) &&
        node.importClause.namedBindings.elements.some(
          (element) => (element.propertyName?.text || element.name.text) === "Slot"
        )
      ) {
        hasSlotImport = true;
        reasons.push("usa Slot do Radix");
      }
    }

    if (
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings) &&
      node.importClause.namedBindings.elements.some(
        (element) => (element.propertyName?.text || element.name.text) === "cn"
      )
    ) {
      hasCnImport = true;
      reasons.push("usa helper cn");
    }
  });

  if (relativePath.replace(/\\/g, "/").includes("/components/ui/")) {
    reasons.push("arquivo em components/ui");
  }

  if (variants.length > 0) {
    reasons.push("possui variants no estilo cva");
  }

  const uniqueReasons = [...new Set(reasons)];
  const score =
    Number(hasClassVarianceAuthority) +
    Number(hasRadixImport) +
    Number(hasSlotImport) +
    Number(hasCnImport) +
    Number(relativePath.replace(/\\/g, "/").includes("/components/ui/")) +
    Number(variants.length > 0);

  if (score >= 3 && (hasClassVarianceAuthority || hasRadixImport)) {
    return [
      {
        name: "shadcn/ui",
        confidence: score >= 5 ? "high" : "medium",
        reasons: uniqueReasons,
      },
    ];
  }

  return [];
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return Boolean(
    ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  );
}

function hasDefaultModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return Boolean(
    ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
    )
  );
}

function extractComponentName(sourceFile: ts.SourceFile, fileName: string): string {
  let exportName: string | undefined;

  sourceFile.forEachChild((node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      hasExportModifier(node) &&
      /^[A-Z]/.test(node.name.text)
    ) {
      exportName = node.name.text;
      return;
    }

    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          /^[A-Z]/.test(declaration.name.text)
        ) {
          exportName = declaration.name.text;
          return;
        }
      }
      return;
    }

    if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        exportName = node.expression.text;
      }
      return;
    }

    if (!ts.isExportDeclaration(node) || !node.exportClause) return;
    if (!ts.isNamedExports(node.exportClause)) return;
    const first = node.exportClause.elements[0];
    if (!first) return;
    exportName = first.name.getText(sourceFile);
  });

  if (exportName) return exportName;

  const baseName = path.basename(fileName, path.extname(fileName));
  return hasDefaultExportLikeName(sourceFile, baseName) || baseName;
}

function hasDefaultExportLikeName(
  sourceFile: ts.SourceFile,
  fallbackName: string
): string | undefined {
  for (const node of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      hasDefaultModifier(node) &&
      /^[A-Z]/.test(node.name.text)
    ) {
      return node.name.text;
    }
  }

  return /^[A-Z]/.test(fallbackName) ? fallbackName : undefined;
}

function generateExampleUsage(
  componentName: string,
  variants: { name: string; values: string[] }[]
): string {
  if (variants.length === 0) return `<${componentName} />`;

  const variantAttrs = variants
    .filter((variant) => variant.values.length > 0)
    .map((variant) => `${variant.name}="${variant.values[0]}"`)
    .join(" ");

  return `<${componentName} ${variantAttrs}>Conteudo</${componentName}>`;
}

function generateUsageHints(componentName: string): {
  useWhen: string;
  avoidWhen: string;
} {
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
    useWhen:
      "Quando esse componente representar bem o padrao visual e funcional necessario.",
    avoidWhen:
      "Quando um elemento HTML nativo atender melhor com menor complexidade.",
  };
}

export function analyzeComponent(
  fileName: string,
  relativePath: string,
  content: string,
  workspaceRoot = getWorkspaceRoot()
): KnowledgeBaseItem {
  const absoluteFilePath = path.resolve(workspaceRoot, relativePath);
  const cache: SourceContextCache = new Map();
  const context = createSourceContext(absoluteFilePath, content, cache);
  const variants = extractVariants(context.sourceFile);
  const detectedLibraries = detectLibraries(
    context.sourceFile,
    relativePath,
    variants
  );
  const componentName = extractComponentName(context.sourceFile, fileName);
  const props = extractProps(context, cache, variants);
  const { useWhen, avoidWhen } = generateUsageHints(componentName);
  const exampleUsage = generateExampleUsage(componentName, variants);

  return {
    componentName,
    sourcePath: relativePath,
    analysis: {
      props,
      variants,
      detectedLibraries,
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
  const cacheByPath = new Map(
    previousCache.map((entry) => [entry.relativePath, entry])
  );
  let reused = 0;
  let analyzed = 0;

  const nextCache: AnalysisCacheItem[] = [];
  const kb = components
    .map((component) => {
      const contentHash = hashContent(component.content);
      const cached = cacheByPath.get(component.relativePath);

      if (
        cached &&
        cached.contentHash === contentHash &&
        cached.analyzerVersion === ANALYZER_VERSION
      ) {
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
        analyzerVersion: ANALYZER_VERSION,
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
