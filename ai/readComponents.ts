import * as fs from "fs";
import * as path from "path";

const COMPONENTS_DIR = path.resolve(
  __dirname,
  "../sample-project/components"
);

export type ComponentFile = {
  fileName: string;
  content: string;
};

export function readComponents(): ComponentFile[] {
  const files = fs.readdirSync(COMPONENTS_DIR);

  const components = files
    .filter(
      (file) => file.endsWith(".tsx") || file.endsWith(".jsx")
    )
    .map((file) => {
      const filePath = path.join(COMPONENTS_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");

      return {
        fileName: file,
        content,
      };
    });

  return components;
}

/* Execução direta (debug)
   Permite rodar `ts-node ai/readComponents.ts`
*/
if (require.main === module) {
  const components = readComponents();

  console.log(
    components.map((c) => ({
      file: c.fileName,
      size: c.content.length,
    }))
  );
}
