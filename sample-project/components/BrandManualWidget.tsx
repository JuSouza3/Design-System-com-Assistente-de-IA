import { ArrowDownRight } from 'lucide-react'

interface BrandManualWidgetProps {
  onClick?: () => void
}

export const BrandManualWidget = ({ onClick }: BrandManualWidgetProps) => {
  return (
    <button
      className="flex w-full items-center justify-between rounded-md bg-cinzaSecondary px-4 py-3 text-sm font-semibold text-black hover:bg-cinzaSecondary/90 transition-colors"
      onClick={onClick}
    >
      Manual de marca
      <ArrowDownRight className="h-4 w-4" />
    </button>
  )
}
