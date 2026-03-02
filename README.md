# Comandos

Gerar ou atualizar a base de conhecimento:
`npx ts-node ai/analyzeComponents.ts`
Observacao: a analise agora e incremental por hash (so reanalisa componentes alterados).

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
