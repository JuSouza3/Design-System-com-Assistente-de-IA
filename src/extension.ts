import * as vscode from "vscode";
import * as path from "path";
import { execFile } from "child_process";

function getWorkspaceFolder(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function runCli(
  context: vscode.ExtensionContext,
  workspacePath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(context.extensionPath, "dist-ai", "cli.js");
    execFile(
      process.execPath,
      [cliPath, ...args],
      {
        cwd: workspacePath,
        env: {
          ...process.env,
          DESIGN_ASSISTANT_WORKSPACE: workspacePath,
        },
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

function showOutputChannel() {
  return vscode.window.createOutputChannel("Design Assistant");
}

export function activate(context: vscode.ExtensionContext) {
  const refresh = vscode.commands.registerCommand(
    "designAssistant.refresh",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;
      const output = showOutputChannel();
      output.show(true);
      output.appendLine("Executando refresh da knowledge-base...");
      try {
        const result = await runCli(context, workspacePath, ["refresh"]);
        output.appendLine(result.stdout.trim());
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
      const output = showOutputChannel();
      output.show(true);
      output.appendLine("Gerando documentação...");
      try {
        const result = await runCli(context, workspacePath, ["docs", "--json"]);
        output.appendLine(result.stdout.trim());
        vscode.window.showInformationMessage("Documentação gerada.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        vscode.window.showErrorMessage("Falha ao gerar documentação.");
      }
    }
  );

  const askQuestion = vscode.commands.registerCommand(
    "designAssistant.askQuestion",
    async () => {
      const workspacePath = await ensureWorkspace();
      if (!workspacePath) return;
      const question = await vscode.window.showInputBox({
        prompt: "Pergunta sobre o Design System",
        placeHolder: "Qual componente usar para ação principal?",
      });
      if (!question) return;

      const output = showOutputChannel();
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

      const output = showOutputChannel();
      output.show(true);
      output.appendLine(`Busca por prop: ${propName}`);
      try {
        const result = await runCli(context, workspacePath, ["search", propName]);
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
      const knowledgeBaseUri = vscode.Uri.file(
        path.join(workspacePath, ".design-assistant", "knowledge-base.json")
      );
      try {
        const document = await vscode.workspace.openTextDocument(knowledgeBaseUri);
        await vscode.window.showTextDocument(document);
      } catch {
        vscode.window.showErrorMessage(
          "knowledge-base não encontrada. Rode 'Design Assistant: Refresh Knowledge Base' primeiro."
        );
      }
    }
  );

  context.subscriptions.push(
    refresh,
    generateDocs,
    askQuestion,
    searchProp,
    openKnowledgeBase
  );
}

export function deactivate() {}

