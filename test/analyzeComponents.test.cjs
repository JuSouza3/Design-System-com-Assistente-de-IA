const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { analyzeComponent } = require("../dist-ai/analyzeComponents.js");

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "design-assistant-analyze-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

test("analyzeComponent extracts props from React.forwardRef with interface props", () => {
  const content = `
    import * as React from "react";

    export interface FilterProps extends React.HTMLAttributes<HTMLDivElement> {
      categorias: string[];
      categoriaAtiva?: string;
      mostrarIconeBusca?: boolean;
    }

    const AppFilter = React.forwardRef<HTMLDivElement, FilterProps>(
      ({ categorias, categoriaAtiva, mostrarIconeBusca = true, ...props }, ref) => {
        return <div ref={ref} {...props}>{categorias.join(categoriaAtiva || "")}</div>;
      }
    );

    export { AppFilter };
  `;

  const result = analyzeComponent("Filter.tsx", "components/Filter.tsx", content);
  const propTypes = Object.fromEntries(
    result.analysis.props.map((prop) => [prop.name, prop.type])
  );

  assert.equal(result.componentName, "AppFilter");
  assert.equal(propTypes.categorias, "string[]");
  assert.equal(propTypes.categoriaAtiva, "string");
  assert.equal(propTypes.mostrarIconeBusca, "boolean");
});

test("analyzeComponent resolves local type aliases with intersections", () => {
  const content = `
    type ToneProps = {
      tone?: "neutral" | "brand";
    };

    type CardProps = ToneProps & {
      title: string;
    };

    export const Card = ({ title, tone = "neutral" }: CardProps) => {
      return <section>{title}-{tone}</section>;
    };
  `;

  const result = analyzeComponent("Card.tsx", "components/Card.tsx", content);
  const propTypes = Object.fromEntries(
    result.analysis.props.map((prop) => [prop.name, prop.type])
  );

  assert.equal(result.componentName, "Card");
  assert.equal(propTypes.title, "string");
  assert.equal(propTypes.tone, `"neutral" | "brand"`);
});

test("analyzeComponent uses export default identifier as component name", () => {
  const content = `
    const LanguageSelector = () => {
      return <div>Language</div>;
    };

    export default LanguageSelector;
  `;

  const result = analyzeComponent(
    "LanguageSelector.tsx",
    "components/LanguageSelector.tsx",
    content
  );

  assert.equal(result.componentName, "LanguageSelector");
});

test("analyzeComponent upgrades unknown variant props to literal unions", () => {
  const content = `
    import { cva } from "class-variance-authority";

    const buttonVariants = cva("base", {
      variants: {
        variant: {
          primary: "x",
          ghost: "y"
        },
        size: {
          sm: "a",
          lg: "b"
        }
      }
    });

    function Button({ variant, size, asChild = false }: {
      variant?: unknown;
      size?: unknown;
      asChild?: boolean;
    }) {
      return <button data-variant={variant} data-size={size}>{String(asChild)}</button>;
    }

    export { Button };
  `;

  const result = analyzeComponent("button.tsx", "components/button.tsx", content);
  const propTypes = Object.fromEntries(
    result.analysis.props.map((prop) => [prop.name, prop.type])
  );

  assert.equal(result.componentName, "Button");
  assert.equal(propTypes.variant, `"primary" | "ghost"`);
  assert.equal(propTypes.size, `"sm" | "lg"`);
  assert.equal(propTypes.asChild, "boolean");
});

test("analyzeComponent resolves imported local prop types", () => {
  const workspace = createTempWorkspace();
  const typesPath = path.join(workspace, "components", "shared", "types.ts");
  const componentPath = path.join(workspace, "components", "Panel.tsx");

  writeFile(
    typesPath,
    `
      export interface BasePanelProps {
        title: string;
      }

      export type PanelProps = BasePanelProps & {
        tone?: "info" | "warning";
      };
    `
  );

  const content = `
    import { PanelProps } from "./shared/types";

    export function Panel({ title, tone = "info" }: PanelProps) {
      return <section>{title}-{tone}</section>;
    }
  `;

  writeFile(componentPath, content);

  const result = analyzeComponent(
    "Panel.tsx",
    "components/Panel.tsx",
    content,
    workspace
  );
  const propTypes = Object.fromEntries(
    result.analysis.props.map((prop) => [prop.name, prop.type])
  );

  assert.equal(result.componentName, "Panel");
  assert.equal(propTypes.title, "string");
  assert.equal(propTypes.tone, `"info" | "warning"`);
});

test("analyzeComponent detects shadcn ui style components", () => {
  const content = `
    import * as React from "react";
    import { Slot } from "@radix-ui/react-slot";
    import { cva } from "class-variance-authority";
    import { cn } from "@/lib/utils";

    const badgeVariants = cva("base", {
      variants: {
        variant: {
          default: "x",
          outline: "y"
        }
      }
    });

    export function Badge({ variant }: { variant?: unknown }) {
      return <Slot className={cn(badgeVariants({ variant }))} />;
    }
  `;

  const result = analyzeComponent(
    "badge.tsx",
    "components/ui/badge.tsx",
    content
  );

  assert.equal(result.analysis.detectedLibraries?.[0]?.name, "shadcn/ui");
  assert.equal(result.analysis.detectedLibraries?.[0]?.confidence, "high");
});
