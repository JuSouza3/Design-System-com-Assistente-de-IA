# Design Assistant

Extensao VS Code e CLI para mapear componentes React/TypeScript de um projeto,
gerar uma knowledge base local, documentacao Markdown e consultas guiadas sobre
o design system do workspace aberto.

## O que faz hoje

- Analisa componentes via AST do TypeScript
- Descobre pastas comuns como `src/components`, `components` e `ui`
- Mantem cache incremental por hash em `.design-assistant/analysis-cache.json`
- Gera `.design-assistant/knowledge-base.json`
- Gera documentacao Markdown em `docs/design-system.generated.md`
- Permite busca por prop e consulta por componente
- Oferece uma sidebar no VS Code com acoes e detalhes dos componentes
- Permite configurar IA no proprio VS Code para perguntas em linguagem natural

## Como usar no VS Code

Depois de instalar a extensao:

1. Abra qualquer projeto React/TypeScript no VS Code.
2. Abra a view `Design Assistant` no Explorer.
3. Rode `Refresh Knowledge Base`.
4. Opcionalmente rode `Create Default Config` para gerar `.design-assistant.json`.
5. Se quiser perguntas em linguagem natural, rode `Configure AI`.

## Configuracao do workspace

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

## Estrutura de saida

- `.design-assistant/knowledge-base.json`
- `.design-assistant/analysis-cache.json`
- `docs/design-system.generated.md`

## CLI

Atualizar a base:
`npx ts-node ai/cli.ts refresh`

Listar componentes:
`npx ts-node ai/cli.ts list`

Buscar componentes por prop:
`npx ts-node ai/cli.ts search variant`

Gerar documentacao:
`npx ts-node ai/cli.ts docs`

Perguntar ao assistente:
`npx ts-node ai/cli.ts help "qual componente usar para acao principal?"`

Criar config padrao:
`npx ts-node ai/cli.ts init-config`

## Desenvolvimento

Build:
`npm run build`

Rodar em modo de extensao:
1. Abra este projeto no VS Code.
2. Pressione `F5`.
3. No novo host de extensao, abra o projeto alvo.

## Empacotar para instalacao local

Gerar o `.vsix`:
`npm run package:vsix`

Instalar no VS Code:
1. Abra `Extensions`.
2. Clique em `...`
3. Escolha `Install from VSIX...`
4. Selecione `design-assistant.vsix`

## Proximos passos recomendados

- adicionar testes automatizados
- ampliar cobertura do parser AST
- publicar no Marketplace
- substituir o `.env` local por fluxo completo de secrets e onboarding
