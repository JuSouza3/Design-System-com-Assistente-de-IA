import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/custom/base/button"
import { CustomInput } from "@/components/custom/base/input"

export interface FiltroProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Categorias disponíveis para filtro
   */
  categorias: string[]
  /**
   * Categoria atualmente selecionada (índice ou nome)
   */
  categoriaAtiva?: string
  /**
   * Callback quando uma categoria é selecionada
   */
  onCategoriaChange?: (categoria: string) => void
  /**
   * Valor atual da busca
   */
  valorBusca?: string
  /**
   * Callback quando o valor da busca muda
   */
  onBuscaChange?: (valor: string) => void
  /**
   * Placeholder do input de busca
   */
  placeholderBusca?: string
  /**
   * Label do filtro (padrão: "Filtro")
   */
  labelFiltro?: string
  /**
   * Mostrar ícone de busca
   */
  mostrarIconeBusca?: boolean
}

const AppFilter = React.forwardRef<HTMLDivElement, FiltroProps>(
  (
    {
      className,
      categorias,
      categoriaAtiva,
      onCategoriaChange,
      valorBusca = "",
      onBuscaChange,
      placeholderBusca = "Pesquisar pelo nome",
      labelFiltro = "Filtro",
      mostrarIconeBusca = true,
      ...props
    },
    ref
  ) => {
    const handleCategoriaClick = (categoria: string) => {
      onCategoriaChange?.(categoria)
    }

    const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onBuscaChange?.(e.target.value)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 w-full",
          className
        )}
        {...props}
      >
        {/* Seção de categorias */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <span className="text-sm font-semibold text-foreground">
            {labelFiltro}
          </span>
          {categorias.map((categoria) => {
            const isActive = categoria === categoriaAtiva
            return (
              <Button
                key={categoria}
                variant={isActive ? "primary" : "outline"}
                size="sm"
                onClick={() => handleCategoriaClick(categoria)}
                className={cn(
                  "px-4 py-2 text-xs font-semibold uppercase tracking-wider",
                  isActive && "shadow-sm"
                )}
              >
                {categoria}
              </Button>
            )
          })}
        </div>

        {/* Campo de busca */}
        <div className="relative w-full lg:w-auto lg:min-w-[400px]">
          <CustomInput
            type="text"
            value={valorBusca}
            onChange={handleBuscaChange}
            placeholder={placeholderBusca}
            className={cn(
              "w-full h-12 pl-4 text-base",
              mostrarIconeBusca && "pr-12"
            )}
          />
          {mostrarIconeBusca && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    )
  }
)
AppFilter.displayName = "Filtro"

export { AppFilter }
