# Design System Documentation

Componentes documentados: 11

## AppFilter
- Fonte: `sample-project/components/Filter.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
_Sem props mapeadas._

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<AppFilter />
```

## BrandManualWidget
- Fonte: `sample-project/components/BrandManualWidget.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| onClick | () => void | Prop onClick |

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<BrandManualWidget />
```

## Button
- Fonte: `sample-project/components/button.tsx`
- Use quando: Quando precisar de uma acao principal ou secundaria com clique.
- Evite quando: Quando for apenas navegacao sem acao; prefira um link.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| className | unknown | Prop className |
| variant | unknown | Prop variant |
| size | unknown | Prop size |
| asChild | boolean | Prop asChild |

### Variants
- `variant`: default, primary, outline, link, ghost
- `size`: default, sm, md, lg, icon, icon-sm, icon-lg

### Exemplo
```tsx
<Button variant="default" size="default">Conteudo</Button>
```

## HomeCard
- Fonte: `sample-project/components/HomeCard.tsx`
- Use quando: Quando precisar agrupar conteudo relacionado em um bloco visual.
- Evite quando: Quando a informacao for simples e nao exigir agrupamento.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| title | string | Prop title |
| subtitle | string | Prop subtitle |
| buttonText | string | Prop buttonText |
| onButtonClick | () => void | Prop onButtonClick |
| children | ReactNode | Prop children |

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<HomeCard />
```

## LanguageSelector
- Fonte: `sample-project/components/LanguageSelector.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
_Sem props mapeadas._

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<LanguageSelector />
```

## LatestVideosWidget
- Fonte: `sample-project/components/LatestVideosWidget.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| count | number | Prop count |

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<LatestVideosWidget />
```

## QRGeneratorWidget
- Fonte: `sample-project/components/QRGeneratorWidget.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| onGoToTool | () => void | Prop onGoToTool |
| variant | "default" | "widgetMini" | Prop variant |

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<QRGeneratorWidget />
```

## Sidebar
- Fonte: `sample-project/components/Sidebar.tsx`
- Use quando: Quando compor estrutura de navegacao da interface.
- Evite quando: Quando o fluxo nao exigir navegacao persistente.

### Props
_Sem props mapeadas._

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<Sidebar />
```

## Topbar
- Fonte: `sample-project/components/Topbar.tsx`
- Use quando: Quando compor estrutura de navegacao da interface.
- Evite quando: Quando o fluxo nao exigir navegacao persistente.

### Props
_Sem props mapeadas._

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<Topbar />
```

## UserDropdown
- Fonte: `sample-project/components/UserDropdown.tsx`
- Use quando: Quando esse componente representar bem o padrao visual e funcional necessario.
- Evite quando: Quando um elemento HTML nativo atender melhor com menor complexidade.

### Props
_Sem props mapeadas._

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<UserDropdown />
```

## VideoCardWidget
- Fonte: `sample-project/components/VideoCardWidget.tsx`
- Use quando: Quando precisar agrupar conteudo relacionado em um bloco visual.
- Evite quando: Quando a informacao for simples e nao exigir agrupamento.

### Props
| Prop | Tipo | Descricao |
| --- | --- | --- |
| video | Video | Prop video |

### Variants
_Sem variants mapeadas._

### Exemplo
```tsx
<VideoCardWidget />
```
