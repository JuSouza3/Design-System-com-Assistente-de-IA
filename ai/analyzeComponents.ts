import * as fs from "fs";
import * as path from "path";
import { readComponents } from "./readComponents";
import { ANALYZE_COMPONENT_PROMPT } from "./prompt";
import { callLLM } from "./llm";

const OUTPUT_PATH = path.resolve(__dirname, "./knowledge-base.json");

async function analyzeComponents() {
  const components = readComponents();
  const knowledgeBase = [];

  for (const component of components) {
    const fullPrompt = `
${ANALYZE_COMPONENT_PROMPT}

Código do componente:
${component.content}
`;

    const result = await callLLM(fullPrompt);

    knowledgeBase.push({
      componentName: component.fileName.replace(".tsx", ""),
      analysis: JSON.parse(result),
    });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(knowledgeBase, null, 2),
    "utf-8"
  );

  console.log("knowledge-base.json gerado com IA");
}

analyzeComponents();
