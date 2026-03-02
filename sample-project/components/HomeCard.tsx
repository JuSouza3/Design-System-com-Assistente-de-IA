import { ReactNode } from 'react'
import { Button } from "@/components/custom/base/button"

interface HomeCardProps {
  title: string
  subtitle: string
  buttonText: string
  onButtonClick: () => void
  children: ReactNode
}

export const HomeCard = ({ title, subtitle, buttonText, onButtonClick, children }: HomeCardProps) => {
  return (
    <article className="rounded-lg border border-slate-100 bg-background p-9">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-primary">{title}</h2>
          <p className="">{subtitle}</p>
        </div>
        <Button variant="default" size="default" onClick={onButtonClick}>
          {buttonText}
        </Button>
      </header>
      <div className="mt-6">
        {children}
      </div>
    </article>
  )
}
