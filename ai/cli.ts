import * as fs from "fs";
import * as path from "path";

const KB_PATH = path.resolve(__dirname, "./knowledge-base.json");

type KnowledgeBaseItem = {
  componentName: string;
  analysis: {
    props?: { name: string; type: string; description?: string }[];
    variants?: { name: string; values: string[] }[];
    useWhen?: string;
    avoidWhen?: string;
    exampleUsage?: string;
  };
};

function loadKnowledgeBase(): KnowledgeBaseItem[] {
  if (!fs.existsSync(KB_PATH)) {
    console.error("❌ knowledge-base.json não encontrado. Rode analyzeComponents.ts primeiro.");
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(KB_PATH, "utf-8"));
}

function listComponents(kb: KnowledgeBaseItem[]) {
  console.log("📋 Componentes disponíveis:\n");
  kb.forEach(c => console.log("- " + c.componentName));
}

function showComponent(component: KnowledgeBaseItem) {
  const { props, variants, useWhen, avoidWhen, exampleUsage } = component.analysis;

  console.log(`\n📦 Component: ${component.componentName}\n`);

  if (props?.length) {
    console.log("🔧 Props:");
    props.forEach(p => console.log(`- ${p.name}: ${p.type}`));
    console.log("");
  }

  if (variants?.length) {
    console.log("🎨 Variants:");
    variants.forEach(v =>
      console.log(`- ${v.name}: ${v.values.join(" | ")}`)
    );
    console.log("");
  }

  if (useWhen) console.log(`✅ Use quando:\n- ${useWhen}\n`);
  if (avoidWhen) console.log(`⛔ Evite quando:\n- ${avoidWhen}\n`);
  if (exampleUsage) console.log(`💡 Exemplo:\n${exampleUsage}\n`);
}

function main() {
  const args = process.argv.slice(2);
  const kb = loadKnowledgeBase();

  // 👉 SEM ARGUMENTOS
  if (args.length === 0) {
    listComponents(kb);
    return;
  }

  const command = args[0].toLowerCase();

  // 👉 COMANDO LIST
  if (command === "list") {
    listComponents(kb);
    return;
  }

  // 👉 BUSCA COMPONENTE
  const component = kb.find(
    c => c.componentName.toLowerCase() === command
  );

  if (!component) {
    console.error(`❌ Componente "${args[0]}" não encontrado.`);
    return;
  }

  showComponent(component);
}

main();
