# Comandos

Gerar ou atualizar a base de conhecimento:
`npx ts-node ai/analyzeComponents.ts`
Observacao: a analise agora e incremental por hash (so reanalisa componentes alterados).
Observacao: a analise agora usa AST do TypeScript (mais precisa para props/variants).
Observacao: os artefatos ficam em `.design-assistant/` no workspace analisado.

Atualizar a base direto pela CLI:
`npx ts-node ai/cli.ts refresh`

Listar componentes:
`npx ts-node ai/cli.ts list`

Listar componentes em JSON:
`npx ts-node ai/cli.ts list --json`

Perguntar ao assistente:
`npx ts-node ai/cli.ts help "qual componente usar para acao principal?"`

Ver detalhes de um componente:
`npx ts-node ai/cli.ts button`

Ver detalhes de um componente em JSON:
`npx ts-node ai/cli.ts button --json`

Buscar componentes por prop:
`npx ts-node ai/cli.ts search variant`

Buscar por prop em JSON:
`npx ts-node ai/cli.ts search variant --json`

Gerar documentacao automatica em Markdown:
`npx ts-node ai/cli.ts docs`

Gerar documentacao e retornar metadados em JSON:
`npx ts-node ai/cli.ts docs --json`

Criar arquivo de configuracao padrao:
`npx ts-node ai/cli.ts init-config`

# Configuracao para qualquer projeto

Arquivo `.design-assistant.json`:

```json
{
  "include": ["src/components", "components", "ui"],
  "extensions": [".tsx", ".jsx", ".ts", ".js"],
  "exclude": ["node_modules", ".git", "dist", "build", ".next"],
  "docsOutputPath": "docs/design-system.generated.md",
  "autoDiscovery": true
}
```

Com isso, o analisador pode funcionar em estruturas diferentes de projeto.
Com `autoDiscovery: true`, ele tambem tenta detectar automaticamente pastas como
`frontend/src/components`, `app/components`, `components` e `ui`.

# Estrutura de saída no workspace

- `.design-assistant/knowledge-base.json`
- `.design-assistant/analysis-cache.json`
- `docs/design-system.generated.md` (ou caminho configurado)

# Plugin VS Code (base)

Comandos disponíveis na Command Palette:

- `Design Assistant: Refresh Knowledge Base`
- `Design Assistant: Generate Documentation`
- `Design Assistant: Ask Question`
- `Design Assistant: Search Prop`
- `Design Assistant: Open Knowledge Base`

## Rodar em desenvolvimento

1. Build:
`npm run build`

2. Abrir este projeto no VS Code e pressionar `F5` para iniciar a Extension Development Host.

3. No novo VS Code, abra um workspace alvo e rode os comandos acima.
