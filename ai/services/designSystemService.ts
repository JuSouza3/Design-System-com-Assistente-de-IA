export type KnowledgeBaseItem = {
  componentName: string;
  sourcePath?: string;
  analysis: {
    props?: { name: string; type: string; description?: string }[];
    variants?: { name: string; values: string[] }[];
    useWhen?: string;
    avoidWhen?: string;
    exampleUsage?: string;
  };
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

export function findComponentExact(
  kb: KnowledgeBaseItem[],
  input: string
): KnowledgeBaseItem | undefined {
  const normalizedInput = normalize(input);
  return kb.find((item) => normalize(item.componentName) === normalizedInput);
}

export function suggestComponents(
  kb: KnowledgeBaseItem[],
  input: string,
  limit = 3
): string[] {
  const normalizedInput = normalize(input);
  const ranked = kb
    .map((item) => {
      const name = normalize(item.componentName);
      const startsWith = name.startsWith(normalizedInput);
      const includes = name.includes(normalizedInput);
      const inverseIncludes = normalizedInput.includes(name);
      const distance = levenshtein(name, normalizedInput);

      let score = 999;
      if (startsWith) score = 0;
      else if (includes) score = 1;
      else if (inverseIncludes) score = 2;
      else if (distance <= 3) score = 10 + distance;

      return {
        name: item.componentName,
        score,
        length: item.componentName.length,
      };
    })
    .filter((candidate) => candidate.score < 999)
    .sort((a, b) => a.score - b.score || a.length - b.length)
    .slice(0, limit)
    .map((candidate) => candidate.name);

  return ranked;
}

export function searchByProp(
  kb: KnowledgeBaseItem[],
  propQuery: string
): { componentName: string; matchingProps: string[] }[] {
  const normalizedProp = normalize(propQuery);
  if (!normalizedProp) return [];

  return kb
    .map((item) => {
      const matchingProps =
        item.analysis.props
          ?.map((prop) => prop.name)
          .filter((propName) => normalize(propName).includes(normalizedProp)) ||
        [];

      return {
        componentName: item.componentName,
        matchingProps,
      };
    })
    .filter((entry) => entry.matchingProps.length > 0);
}

function scoreQuestionMatch(item: KnowledgeBaseItem, question: string): number {
  const tokens = normalize(question).split(/\s+/).filter(Boolean);
  const haystack = normalize(
    [
      item.componentName,
      item.analysis.useWhen || "",
      item.analysis.avoidWhen || "",
      item.analysis.props?.map((p) => p.name).join(" ") || "",
      item.analysis.variants?.map((v) => `${v.name} ${v.values.join(" ")}`).join(" ") || "",
    ].join(" ")
  );

  let score = 0;
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (haystack.includes(token)) score += 1;
  }

  return score;
}

export function buildHelpContext(
  kb: KnowledgeBaseItem[],
  question: string,
  limit = 5
): KnowledgeBaseItem[] {
  return [...kb]
    .map((item) => ({ item, score: scoreQuestionMatch(item, question) }))
    .sort((a, b) => b.score - a.score || a.item.componentName.localeCompare(b.item.componentName))
    .slice(0, limit)
    .map((entry) => entry.item);
}
