import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { execFile } from "child_process";

type KnowledgeBaseItem = {
  componentName: string;
  sourcePath?: string;
  analysis: {
    props?: { name: string; type: string; description?: string }[];
    variants?: { name: string; values: string[] }[];
    useWhen?: string;
    avoidWhen?: string;
    exampleUsage?: string;
  };
};

type TreeNodeKind =
  | "group"
  | "action"
  | "component"
  | "info"
  | "propsGroup"
  | "variantsGroup"
  | "prop"
  | "variant";

class SidebarItem extends vscode.TreeItem {
  constructor(
    public readonly kind: TreeNodeKind,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly component?: KnowledgeBaseItem,
    public readonly data?: string
  ) {
    super(label, collapsibleState);
  }
}

class DesignAssistantSidebarProvider
  implements vscode.TreeDataProvider<SidebarItem>
{
  private readonly onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<SidebarItem | null | undefined>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
    if (!element) {
      return [this.createActionsRoot(), this.createComponentsRoot()];
    }

    switch (element.kind) {
      case "group":
        if (element.data === "actions") {
          return this.createActionItems();
        }
        if (element.data === "components") {
          return this.createComponentItems();
        }
        return [];
      case "component":
        return this.createComponentDetails(element.component);
      case "propsGroup":
        return this.createPropItems(element.component);
      case "variantsGroup":
        return this.createVariantItems(element.component);
      default:
        return [];
    }
  }

  private createActionsRoot(): SidebarItem {
    return new SidebarItem(
      "group",
      "Actions",
      vscode.TreeItemCollapsibleState.Expanded,
      undefined,
      "actions"
    );
  }

  private createComponentsRoot(): SidebarItem {
    const count = this.loadKnowledgeBase().length;
    const label = count > 0 ? `Components (${count})` : "Components";
    return new SidebarItem(
      "group",
      label,
      vscode.TreeItemCollapsibleState.Expanded,
      undefined,
      "components"
    );
  }

  private createActionItems(): SidebarItem[] {
    return [
      this.buildActionItem(
        "Refresh Knowledge Base",
        "designAssistant.refresh",
        "Analyze components in the current workspace."
      ),
      this.buildActionItem(
        "Generate Docs",
        "designAssistant.generateDocs",
        "Generate the Markdown documentation file."
      ),
      this.buildActionItem(
        "Ask Question",
        "designAssistant.askQuestion",
        "Ask the assistant using the current knowledge base."
      ),
      this.buildActionItem(
        "Search Prop",
        "designAssistant.searchProp",
        "Find components by prop name."
      ),
      this.buildActionItem(
        "Configure AI",
        "designAssistant.configureAI",
        "Set provider, API key and optional model."
      ),
      this.buildActionItem(
        "Create Default Config",
        "designAssistant.initConfig",
        "Create a .design-assistant.json file in the workspace."
      ),
      this.buildActionItem(
        "Open Knowledge Base",
        "designAssistant.openKnowledgeBase",
        "Open the generated .design-assistant/knowledge-base.json file."
      ),
      this.buildActionItem(
        "Open Generated Docs",
        "designAssistant.openGeneratedDocs",
        "Open the generated Markdown documentation."
      ),
    ];
  }

  private createComponentItems(): SidebarItem[] {
    const kb = this.loadKnowledgeBase();
    if (kb.length === 0) {
      const empty = new SidebarItem(
        "info",
        "Run Refresh Knowledge Base to load components",
        vscode.TreeItemCollapsibleState.None
      );
      empty.description = "No local knowledge base found";
      return [empty];
    }

    return kb.map((component) => {
      const item = new SidebarItem(
        "component",
        component.componentName,
        vscode.TreeItemCollapsibleState.Collapsed,
        component
      );
      item.description = component.sourcePath || "";
      item.tooltip = `${component.componentName}\n${component.sourcePath || ""}`;
      if (component.sourcePath) {
        item.command = {
          command: "designAssistant.openComponentSource",
          title: "Open Component Source",
          arguments: [component.sourcePath],
        };
      }
      return item;
    });
  }

  private createComponentDetails(component?: KnowledgeBaseItem): SidebarItem[] {
    if (!component) return [];

    const items: SidebarItem[] = [];

    if (component.sourcePath) {
      const source = new SidebarItem(
        "info",
        `Source: ${component.sourcePath}`,
        vscode.TreeItemCollapsibleState.None,
        component,
        component.sourcePath
      );
      source.command = {
        command: "designAssistant.openComponentSource",
        title: "Open Component Source",
        arguments: [component.sourcePath],
      };
      items.push(source);
    }

    const propsCount = component.analysis.props?.length || 0;
    items.push(
      new SidebarItem(
        "propsGroup",
        `Props (${propsCount})`,
        propsCount > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        component
      )
    );

    const variantsCount = component.analysis.variants?.length || 0;
    items.push(
      new SidebarItem(
        "variantsGroup",
        `Variants (${variantsCount})`,
        variantsCount > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        component
      )
    );

    if (component.analysis.useWhen) {
      items.push(
        new SidebarItem(
          "info",
          `Use when: ${component.analysis.useWhen}`,
          vscode.TreeItemCollapsibleState.None
        )
      );
    }

    if (component.analysis.avoidWhen) {
      items.push(
        new SidebarItem(
          "info",
          `Avoid when: ${component.analysis.avoidWhen}`,
          vscode.TreeItemCollapsibleState.None
        )
      );
    }

    if (component.analysis.exampleUsage) {
      const example = new SidebarItem(
        "info",
        `Example: ${component.analysis.exampleUsage}`,
        vscode.TreeItemCollapsibleState.None
      );
      example.tooltip = component.analysis.exampleUsage;
      items.push(example);
    }

    return items;
  }

  private createPropItems(component?: KnowledgeBaseItem): SidebarItem[] {
    const props = component?.analysis.props || [];
    if (props.length === 0) {
      return [
        new SidebarItem(
          "info",
          "No mapped props",
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return props.map((prop) => {
      const item = new SidebarItem(
        "prop",
        `${prop.name}: ${prop.type}`,
        vscode.TreeItemCollapsibleState.None
      );
      item.description = prop.description || "";
      return item;
    });
  }

  private createVariantItems(component?: KnowledgeBaseItem): SidebarItem[] {
    const variants = component?.analysis.variants || [];
    if (variants.length === 0) {
      return [
        new SidebarItem(
          "info",
          "No mapped variants",
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return variants.map(
      (variant) =>
        new SidebarItem(
          "variant",
          `${variant.name}: ${variant.values.join(" | ")}`,
          vscode.TreeItemCollapsibleState.None
        )
    );
  }

  private buildActionItem(
    label: string,
    commandId: string,
    tooltip: string
  ): SidebarItem {
    const item = new SidebarItem(
      "action",
      label,
      vscode.TreeItemCollapsibleState.None
    );
    item.command = { command: commandId, title: label };
    item.tooltip = tooltip;
    return item;
  }

  private loadKnowledgeBase(): KnowledgeBaseItem[] {
    const workspacePath = getWorkspaceFolder();
    if (!workspacePath) return [];

    const kbPath = path.join(
      workspacePath,
      ".design-assistant",
      "knowledge-base.json"
    );

    if (!fs.existsSync(kbPath)) return [];

    try {
      const raw = fs.readFileSync(kbPath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as KnowledgeBaseItem[]) : [];
    } catch {
      return [];
    }
  }
}

function getWorkspaceFolder(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getAiConfig() {
  return vscode.workspace.getConfiguration("designAssistant.ai");
}

async function buildCliEnv(
  context: vscode.ExtensionContext,
  workspacePath: string
): Promise<NodeJS.ProcessEnv> {
  const aiConfig = getAiConfig();
  const provider = aiConfig.get<string>("provider") || "openrouter";
  const model = aiConfig.get<string>("model")?.trim();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DESIGN_ASSISTANT_WORKSPACE: workspacePath,
  };

  if (provider === "openai") {
    const apiKey = await context.secrets.get("designAssistant.openaiApiKey");
    if (apiKey) env.OPENAI_API_KEY = apiKey;
    if (model) env.OPENAI_MODEL = model;
  } else {
    const apiKey = await context.secrets.get("designAssistant.openrouterApiKey");
    if (apiKey) env.OPENROUTER_API_KEY = apiKey;
    if (model) env.OPENROUTER_MODEL = model;
  }

  return env;
}

async function hasConfiguredAi(
  context: vscode.ExtensionContext
): Promise<boolean> {
  const provider = getAiConfig().get<string>("provider") || "openrouter";
  const secretKey =
    provider === "openai"
      ? "designAssistant.openaiApiKey"
      : "designAssistant.openrouterApiKey";

  return Boolean(await context.secrets.get(secretKey));
}

async function runCli(
  context: vscode.ExtensionContext,
  workspacePath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const env = await buildCliEnv(context, workspacePath);

  return new Promise((resolve, reject) => {
    const cliPath = path.join(context.extensionPath, "dist-ai", "cli.js");
    execFile(
      process.execPath,
      [cliPath, ...args],
      {
        cwd: workspacePath,
        env,
        maxBuffer: 1024 * 1024 * 8,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

async function ensureWorkspace(): Promise<string | undefined> {
  const workspacePath = getWorkspaceFolder();
  if (!workspacePath) {
    await vscode.window.showErrorMessage(
      "Abra uma pasta/projeto no VS Code para usar o Design Assistant."
    );
    return undefined;
  }
  return workspacePath;
}

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("Design Assistant");
  }
  return outputChannel;
}

function getKnowledgeBaseUri(workspacePath: string): vscode.Uri {
  return vscode.Uri.file(
    path.join(workspacePath, ".design-assistant", "knowledge-base.json")
  );
}

function getDocsUri(workspacePath: string): vscode.Uri {
  const configPath = path.join(workspacePath, ".design-assistant.json");
  let docsOutputPath = "docs/design-system.generated.md";

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as { docsOutputPath?: string };
      if (parsed.docsOutputPath?.trim()) {
        docsOutputPath = parsed.docsOutputPath.trim();
      }
    } catch {
      // Keep default docs output when config is invalid.
    }
  }

  return vscode.Uri.file(path.join(workspacePath, docsOutputPath));
}

async function openDocument(uri: vscode.Uri, missingMessage: string) {
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } catch {
    vscode.window.showErrorMessage(missingMessage);
  }
}

async function configureAi(context: vscode.ExtensionContext) {
  const provider = await vscode.window.showQuickPick(
    [
      { label: "OpenRouter", value: "openrouter" },
      { label: "OpenAI", value: "openai" },
    ],
    { placeHolder: "Selecione o provedor de IA do Design Assistant" }
  );
  if (!provider) return;

  const apiKey = await vscode.window.showInputBox({
    prompt: `Informe a API key do ${provider.label}`,
    password: true,
    ignoreFocusOut: true,
  });
  if (!apiKey) return;

  const currentModel = getAiConfig().get<string>("model") || "";
  const model = await vscode.window.showInputBox({
    prompt: "Modelo opcional",
    placeHolder:
      provider.value === "openai"
        ? "gpt-4o-mini"
        : "meta-llama/llama-3.1-8b-instruct",
    value: currentModel,
    ignoreFocusOut: true,
  });

  await getAiConfig().update(
    "provider",
    provider.value,
    vscode.ConfigurationTarget.Global
  );
  await getAiConfig().update(
    "model",
    model?.trim() || "",
    vscode.ConfigurationTarget.Global
  );

  const secretKey =
    provider.value === "openai"
      ? "designAssistant.openaiApiKey"
      : "designAssistant.openrouterApiKey";
  await context.secrets.store(secretKey, apiKey.trim());

  vscode.window.showInformationMessage(
    `IA configurada com ${provider.label}.`
  );
}

async function openComponentSource(sourcePath?: string) {
  const workspacePath = await ensureWorkspace();
  if (!workspacePath || !sourcePath) return;

  await openDocument(
    vscode.Uri.file(path.resolve(workspacePath, sourcePath)),
    "Arquivo fonte do componente nao encontrado."
  );
}

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new DesignAssistantSidebarProvider();
  const output = getOutputChannel();

  context.subscriptions.push(output);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "designAssistant.sidebar",
      sidebarProvider
    )
  );

  const refresh = vscode.commands.registerCommand(
    "designAssistant.refresh",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      output.show(true);
      output.appendLine("Executando refresh da knowledge-base...");
      try {
        const result = await runCli(context, workspacePath, ["refresh"]);
        output.appendLine(result.stdout.trim());
        sidebarProvider.refresh();
        vscode.window.showInformationMessage("Knowledge-base atualizada.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao atualizar knowledge-base.");
      }
    }
  );

  const generateDocs = vscode.commands.registerCommand(
    "designAssistant.generateDocs",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      output.show(true);
      output.appendLine("Gerando documentacao...");
      try {
        const result = await runCli(context, workspacePath, ["docs", "--json"]);
        output.appendLine(result.stdout.trim());
        sidebarProvider.refresh();
        vscode.window.showInformationMessage("Documentacao gerada.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao gerar documentacao.");
      }
    }
  );

  const askQuestion = vscode.commands.registerCommand(
    "designAssistant.askQuestion",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      const configuredAi = await hasConfiguredAi(context);
      if (!configuredAi) {
        const choice = await vscode.window.showWarningMessage(
          "Configure a IA antes de fazer perguntas ao assistente.",
          "Configurar agora"
        );
        if (choice === "Configurar agora") {
          await configureAi(context);
        }
        return;
      }

      const question = await vscode.window.showInputBox({
        prompt: "Pergunta sobre o Design System",
        placeHolder: "Qual componente usar para acao principal?",
      });
      if (!question) return;

      output.show(true);
      output.appendLine(`Pergunta: ${question}`);
      try {
        const result = await runCli(context, workspacePath, ["help", question]);
        output.appendLine(result.stdout.trim());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao consultar assistente.");
      }
    }
  );

  const searchProp = vscode.commands.registerCommand(
    "designAssistant.searchProp",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      const propName = await vscode.window.showInputBox({
        prompt: "Buscar prop",
        placeHolder: "variant",
      });
      if (!propName) return;

      output.show(true);
      output.appendLine(`Busca por prop: ${propName}`);
      try {
        const result = await runCli(context, workspacePath, [
          "search",
          propName,
        ]);
        output.appendLine(result.stdout.trim());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao buscar prop.");
      }
    }
  );

  const openKnowledgeBase = vscode.commands.registerCommand(
    "designAssistant.openKnowledgeBase",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      await openDocument(
        getKnowledgeBaseUri(workspacePath),
        "knowledge-base nao encontrada. Rode 'Design Assistant: Refresh Knowledge Base' primeiro."
      );
    }
  );

  const openGeneratedDocs = vscode.commands.registerCommand(
    "designAssistant.openGeneratedDocs",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      await openDocument(
        getDocsUri(workspacePath),
        "Documentacao gerada nao encontrada. Rode 'Design Assistant: Generate Documentation' primeiro."
      );
    }
  );

  const configureAiCommand = vscode.commands.registerCommand(
    "designAssistant.configureAI",
    async () => {
      await configureAi(context);
    }
  );

  const openComponentSourceCommand = vscode.commands.registerCommand(
    "designAssistant.openComponentSource",
    async (sourcePath?: string) => {
      await openComponentSource(sourcePath);
    }
  );

  const initConfig = vscode.commands.registerCommand(
    "designAssistant.initConfig",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;

      output.show(true);
      output.appendLine("Criando configuracao padrao...");
      try {
        const result = await runCli(context, workspacePath, ["init-config"]);
        output.appendLine(result.stdout.trim());
        vscode.window.showInformationMessage(
          "Arquivo .design-assistant.json criado."
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao criar configuracao padrao.");
      }
    }
  );

  context.subscriptions.push(
    refresh,
    generateDocs,
    askQuestion,
    searchProp,
    openKnowledgeBase,
    openGeneratedDocs,
    configureAiCommand,
    openComponentSourceCommand,
    initConfig
  );
}

export function deactivate() {}
