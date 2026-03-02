import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { callLLM } from "./llm";
import { generateKnowledgeBase } from "./analyzeComponents";
import {
  buildHelpContext,
  findComponentExact,
  KnowledgeBaseItem,
  searchByProp,
  suggestComponents,
} from "./services/designSystemService";

const KB_PATH = path.resolve(__dirname, "./knowledge-base.json");

function loadKnowledgeBase(): KnowledgeBaseItem[] {
  if (!fs.existsSync(KB_PATH)) {
    console.error(
      "❌ knowledge-base.json não encontrado. Rode analyzeComponents.ts primeiro."
    );
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(KB_PATH, "utf-8"));
}

function listComponents(kb: KnowledgeBaseItem[]) {
  console.log("📋 Componentes disponíveis:\n");
  kb.forEach((c) => console.log("- " + c.componentName));
}

function showComponent(component: KnowledgeBaseItem) {
  const { props, variants, useWhen, avoidWhen, exampleUsage } =
    component.analysis;

  console.log(`\n📦 Component: ${component.componentName}\n`);

  if (props?.length) {
    console.log("🔧 Props:");
    props.forEach((p) => console.log(`- ${p.name}: ${p.type}`));
    console.log("");
  }

  if (variants?.length) {
    console.log("🎨 Variants:");
    variants.forEach((v) =>
      console.log(`- ${v.name}: ${v.values.join(" | ")}`)
    );
    console.log("");
  }

  if (useWhen) console.log(`✅ Use quando:\n- ${useWhen}\n`);
  if (avoidWhen) console.log(`⛔ Evite quando:\n- ${avoidWhen}\n`);
  if (exampleUsage) console.log(`💡 Exemplo:\n${exampleUsage}\n`);
}

async function askDesignSystem(
  question: string,
  kb: KnowledgeBaseItem[]
) {
  const scopedKb = buildHelpContext(kb, question, 5).map((item) => ({
    componentName: item.componentName,
    analysis: {
      props: item.analysis.props || [],
      variants: item.analysis.variants || [],
      useWhen: item.analysis.useWhen || "",
      avoidWhen: item.analysis.avoidWhen || "",
      exampleUsage: item.analysis.exampleUsage || "",
    },
  }));

  const prompt = `
Você é um assistente especializado no seguinte Design System.
Use apenas os dados fornecidos abaixo.
Se a resposta não existir nos dados, responda exatamente: "Não há informação suficiente na knowledge-base."
Se existir mais de um candidato, escolha o mais aderente ao "useWhen" e explique em 1 frase curta.

Base de conhecimento:
${JSON.stringify(scopedKb, null, 2)}

Pergunta do desenvolvedor:
${question}

Responda de forma objetiva, em português do Brasil.
Limite a resposta a no máximo 5 linhas.
`;

  try {
    const response = await callLLM(prompt);
    const normalized = response?.trim();

    if (!normalized) {
      console.error(
        "❌ O modelo retornou resposta vazia. Verifique OPENROUTER_API_KEY/OPENAI_API_KEY e o modelo configurado no .env."
      );
      return;
    }

    console.log("\n🤖 Assistente do Design System:\n");
    console.log(normalized);
    console.log("");
  } catch (error) {
    console.error("❌ Erro ao consultar o assistente.");
    console.error(error instanceof Error ? error.message : error);
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const jsonOutput = rawArgs.includes("--json");
  const args = rawArgs.filter((arg) => arg !== "--json");
  const command = args[0]?.toLowerCase();

  // 👉 SEM ARGUMENTOS
  if (args.length === 0) {
    const kb = loadKnowledgeBase();
    listComponents(kb);
    return;
  }

  // 👉 REFRESH
  if (command === "refresh") {
    const kb = generateKnowledgeBase() as KnowledgeBaseItem[];
    if (jsonOutput) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            components: kb.map((item) => item.componentName),
            count: kb.length,
          },
          null,
          2
        )
      );
    } else {
      console.log("✅ Base de conhecimento atualizada.");
      listComponents(kb);
    }
    return;
  }

  const kb = loadKnowledgeBase();

  // 👉 LIST
  if (command === "list") {
    if (jsonOutput) {
      console.log(JSON.stringify(kb.map((item) => item.componentName), null, 2));
    } else {
      listComponents(kb);
    }
    return;
  }

  // 👉 SEARCH (PROPS)
  if (command === "search") {
    const propQuery = args.slice(1).join(" ").trim();
    if (!propQuery) {
      console.error("❌ Informe a prop para busca. Exemplo: search variant");
      return;
    }

    const matches = searchByProp(kb, propQuery);
    if (jsonOutput) {
      console.log(JSON.stringify(matches, null, 2));
      return;
    }

    if (matches.length === 0) {
      console.log(`Nenhum componente possui prop compatível com "${propQuery}".`);
      return;
    }

    matches.forEach((match) => {
      console.log(`${match.componentName} possui prop: ${match.matchingProps.join(", ")}`);
    });
    return;
  }

  // 👉 HELP (PERGUNTA NATURAL)
  if (command === "help") {
    const question = args.slice(1).join(" ");

    if (!question) {
      console.error("❌ Faça uma pergunta após 'help'.");
      return;
    }

    await askDesignSystem(question, kb);
    return;
  }

  // 👉 BUSCA COMPONENTE
  const component = findComponentExact(kb, command);

  if (!component) {
    const suggestions = suggestComponents(kb, args[0] || "", 3);
    console.error(`❌ Componente "${args[0]}" não encontrado.`);
    if (suggestions.length === 1) {
      console.error(`Você quis dizer: ${suggestions[0]}?`);
    } else if (suggestions.length > 1) {
      console.error(`Você quis dizer um destes: ${suggestions.join(", ")}?`);
    }
    return;
  }

  if (jsonOutput) {
    console.log(JSON.stringify(component, null, 2));
  } else {
    showComponent(component);
  }
}

main();
