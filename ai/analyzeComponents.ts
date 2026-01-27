import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// Caminho do knowledge base
const KB_PATH = path.resolve(__dirname, "./knowledge-base.json");

// Tipagem
type KnowledgeBaseItem = {
  componentName: string;
  analysis: {
    props?: { name: string; type: string; description: string }[];
    variants?: { name: string; values: string[] }[];
    useWhen?: string;
    avoidWhen?: string;
    exampleUsage?: string;
  };
};

// Lê o knowledge base
function loadKnowledgeBase(): KnowledgeBaseItem[] {
  if (!fs.existsSync(KB_PATH)) {
    console.error("❌ knowledge-base.json não encontrado. Rode analyzeComponents.ts primeiro.");
    process.exit(1);
  }
  const raw = fs.readFileSync(KB_PATH, "utf-8");
  return JSON.parse(raw) as KnowledgeBaseItem[];
}

// Função principal do CLI
async function main() {
  const args = process.argv.slice(2);
  const kb = loadKnowledgeBase();

  if (args.length === 0 || args[0] === "list") {
    console.log("📋 Componentes disponíveis:");
    kb.forEach(c => console.log("- " + c.componentName));
    return;
  }

  const name = args[0].toLowerCase();
  const component = kb.find(c => c.componentName.toLowerCase() === name);

  if (!component) {
    console.error(`❌ Componente "${args[0]}" não encontrado.`);
    return;
  }

  const { props, variants, useWhen, avoidWhen, exampleUsage } = component.analysis;

  console.log(`\n📦 Componente: ${component.componentName}\n`);

  if (props?.length) {
    console.log("🔧 Props:");
    props.forEach(p => console.log(`- ${p.name}: ${p.type}`));
    console.log("");
  }

  if (variants?.length) {
    console.log("🎨 Variants:");
    variants.forEach(v => {
      console.log(`- ${v.name}: ${v.values.join(" | ")}`);
    });
    console.log("");
  }

  if (useWhen) console.log(`✅ Use quando:\n- ${useWhen}\n`);
  if (avoidWhen) console.log(`⛔ Evite quando:\n- ${avoidWhen}\n`);
  if (exampleUsage) console.log(`💡 Exemplo:\n${exampleUsage}\n`);
}

main();
