import { motion } from 'framer-motion'
import { cn } from '@lib/utils'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

type GlassCardProps = ComponentPropsWithoutRef<'div'> & {
  hoverable?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hoverable = true, glow = false, padding = 'md', children, ...props }, ref) => {
    const baseClasses = cn(
      paddingMap[padding],
      'bg-white/60 backdrop-blur-2xl border border-pink-200/40 rounded-2xl',
      'transition-all duration-200',
      hoverable && 'hover:bg-white/75 hover:border-pink-300/60 hover:-translate-y-0.5',
      hoverable && 'hover:shadow-[0_4px_12px_rgba(232,93,122,0.10),0_0_1px_rgba(232,93,122,0.08)]',
      glow && 'shadow-[0_0_30px_rgba(232,93,122,0.08),0_4px_12px_rgba(0,0,0,0.03)]',
      glow && hoverable && 'hover:shadow-[0_0_50px_rgba(232,93,122,0.14),0_8px_24px_rgba(0,0,0,0.05)]',
      className,
    )

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
      >
        {children}
      </motion.div>
    )
  },
)

GlassCard.displayName = 'GlassCard'
