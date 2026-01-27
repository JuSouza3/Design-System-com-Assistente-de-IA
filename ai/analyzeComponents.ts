import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { readComponents } from "./readComponents";
import { ANALYZE_COMPONENT_PROMPT } from "./prompt";
import { callLLM } from "./llm";

const OUTPUT_PATH = path.resolve(__dirname, "./knowledge-base.json");

type KnowledgeBaseItem = {
  componentName: string;
  analysis: any;
};

async function analyzeComponents() {
  const components = readComponents();
  const knowledgeBase: KnowledgeBaseItem[] = [];

  for (const component of components) {
    const fullPrompt = `
${ANALYZE_COMPONENT_PROMPT}

Código do componente:
${component.content}
`;

    const result = await callLLM(fullPrompt);

    let analysis;

    try {
      // 🔎 tenta extrair apenas o JSON da resposta da IA
      const jsonStart = result.indexOf("{");
      const jsonEnd = result.lastIndexOf("}");

      const cleanJson =
        jsonStart !== -1 && jsonEnd !== -1
          ? result.slice(jsonStart, jsonEnd + 1)
          : result;

      analysis = JSON.parse(cleanJson);
    } catch (error) {
      console.error("❌ Erro ao parsear JSON da IA");
      console.error("Resposta recebida:");
      console.error(result);

      analysis = {
        error: "Resposta inválida da IA",
        rawResponse: result,
      };
    }

    knowledgeBase.push({
      componentName: component.fileName.replace(".tsx", ""),
      analysis,
    });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(knowledgeBase, null, 2),
    "utf-8"
  );

  console.log("✅ knowledge-base.json gerado com IA");
}

analyzeComponents();
