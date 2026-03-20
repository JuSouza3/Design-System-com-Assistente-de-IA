const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { discoverIncludePaths } = require("../dist-ai/discoverStructure.js");

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "design-assistant-test-"));
}

function writeFile(filePath, content = "export const x = 1;\n") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

test("discoverIncludePaths finds common component folders with supported files", () => {
  const workspace = createTempWorkspace();

  writeFile(path.join(workspace, "src", "components", "Button.tsx"));
  writeFile(path.join(workspace, "ui", "Card.tsx"));

  const result = discoverIncludePaths(
    workspace,
    ["node_modules", ".git", "dist"],
    [".tsx", ".jsx", ".ts", ".js"]
  ).sort();

  assert.deepEqual(result, ["src/components", "ui"]);
});

test("discoverIncludePaths ignores excluded folders", () => {
  const workspace = createTempWorkspace();

  writeFile(path.join(workspace, "node_modules", "components", "Fake.tsx"));
  writeFile(path.join(workspace, "components", "RealButton.tsx"));

  const result = discoverIncludePaths(
    workspace,
    ["node_modules", ".git", "dist"],
    [".tsx", ".jsx", ".ts", ".js"]
  );

  assert.equal(result.includes("node_modules/components"), false);
  assert.equal(result.includes("components"), true);
});
