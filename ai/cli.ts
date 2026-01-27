import * as fs from "fs";
import * as path from "path";

const KB_PATH = path.resolve(__dirname, "./knowledge-base.json");

type Prop = {
  name: string;
  type?: string;
  description?: string;
};

type Variant = {
  name: string;
  values: string[];
};

type Analysis = {
  componentName?: string;
  props?: Prop[];
  variants?: Variant[];
  useWhen?: string;
  avoidWhen?: string;
  exampleUsage?: string;
};

type KnowledgeBaseItem = {
  componentName: string;
  analysis: Analysis;
};

function printComponent(component: KnowledgeBaseItem) {
  const { componentName, analysis } = component;

  console.log(`\n📦 Component: ${componentName}\n`);

  if (analysis.props?.length) {
    console.log("🔧 Props:");
    analysis.props.forEach((prop) => {
      console.log(
        `- ${prop.name}${prop.type ? `: ${prop.type}` : ""}`
      );
    });
    console.log("");
  }

  if (analysis.variants?.length) {
    console.log("🎨 Variants:");
    analysis.variants.forEach((variant) => {
      console.log(
        `- ${variant.name}: ${variant.values.join(" | ")}`
      );
    });
    console.log("");
  }

  if (analysis.useWhen) {
    console.log("✅ Use when:");
    console.log(`- ${analysis.useWhen}\n`);
  }

  if (analysis.avoidWhen) {
    console.log("⛔ Avoid when:");
    console.log(`- ${analysis.avoidWhen}\n`);
  }

  if (analysis.exampleUsage) {
    console.log("💡 Example:");
    console.log(analysis.exampleUsage + "\n");
  }
}

function run() {
  const componentName = process.argv[2];

  if (!componentName) {
    console.error("❌ Informe o nome do componente.");
    console.error("Exemplo: npx ts-node ai/cli.ts Button");
    process.exit(1);
  }

  if (!fs.existsSync(KB_PATH)) {
    console.error("❌ knowledge-base.json não encontrado.");
    process.exit(1);
  }

  const raw = fs.readFileSync(KB_PATH, "utf-8");
  const knowledgeBase: KnowledgeBaseItem[] = JSON.parse(raw);

  const component = knowledgeBase.find(
    (item) =>
      item.componentName.toLowerCase() === componentName.toLowerCase()
  );

  if (!component) {
    console.error(`❌ Componente "${componentName}" não encontrado.`);
    process.exit(1);
  }

  printComponent(component);
}

run();
