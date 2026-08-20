import { cn } from '@lib/utils'

interface TitlebarProps {
  className?: string
}

export function Titlebar({ className }: TitlebarProps) {
  return (
    <div
      className={cn(
        'flex h-12 items-center justify-between border-b border-border/40 px-4 select-none',
        'bg-sidebar/80 backdrop-blur-xl',
        className,
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground/80">🌸 小零</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sakura Dream v0.1</span>
      </div>
    </div>
  )
}
