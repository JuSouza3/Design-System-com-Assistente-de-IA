const test = require("node:test");
const assert = require("node:assert/strict");

const {
  findComponentExact,
  suggestComponents,
  searchByProp,
  buildHelpContext,
} = require("../dist-ai/services/designSystemService.js");

const kb = [
  {
    componentName: "Button",
    analysis: {
      props: [
        { name: "variant", type: "string" },
        { name: "size", type: "string" },
      ],
      variants: [{ name: "variant", values: ["primary", "ghost"] }],
      useWhen: "acao principal",
      avoidWhen: "navegacao simples",
      exampleUsage: "<Button />",
    },
  },
  {
    componentName: "Sidebar",
    analysis: {
      props: [{ name: "collapsed", type: "boolean" }],
      variants: [],
      useWhen: "navegacao persistente",
      avoidWhen: "fluxo simples",
      exampleUsage: "<Sidebar />",
    },
  },
  {
    componentName: "HomeCard",
    analysis: {
      props: [{ name: "title", type: "string" }],
      variants: [],
      useWhen: "conteudo agrupado",
      avoidWhen: "texto simples",
      exampleUsage: "<HomeCard />",
    },
  },
];

test("findComponentExact ignores case and accents", () => {
  const found = findComponentExact(kb, "bUtTóN");
  assert.equal(found?.componentName, "Button");
});

test("suggestComponents returns close matches first", () => {
  const suggestions = suggestComponents(kb, "buton", 2);
  assert.deepEqual(suggestions, ["Button"]);
});

test("searchByProp finds matching props by partial query", () => {
  const result = searchByProp(kb, "vari");
  assert.deepEqual(result, [
    {
      componentName: "Button",
      matchingProps: ["variant"],
    },
  ]);
});

test("buildHelpContext prioritizes the most relevant components", () => {
  const result = buildHelpContext(
    kb,
    "qual componente usar para acao principal com variant primary?",
    2
  );

  assert.equal(result[0]?.componentName, "Button");
  assert.equal(result.length, 2);
});
