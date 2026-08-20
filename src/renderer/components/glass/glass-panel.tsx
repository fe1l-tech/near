import { type HTMLMotionProps, motion } from 'framer-motion'
import { cn } from '@lib/utils'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

type GlassPanelProps = ComponentPropsWithoutRef<'div'> & {
  /** 毛玻璃强度等级 */
  intensity?: 'light' | 'medium' | 'heavy'
  /** 是否启用悬停效果 */
  hoverable?: boolean
  /** 是否使用 motion.div（带动画） */
  animated?: boolean
}

const intensityMap = {
  light: 'bg-black/30 backdrop-blur-md',
  medium: 'bg-black/40 backdrop-blur-xl',
  heavy: 'bg-black/50 backdrop-blur-2xl',
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity = 'medium', hoverable = false, animated = false, children, ...props }, ref) => {
    const baseClasses = cn(
      intensityMap[intensity],
      'border border-white/[0.06] rounded-2xl',
      hoverable && 'transition-all duration-200 hover:border-white/[0.10] hover:bg-black/45',
      className,
    )

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={baseClasses}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.4, 1] }}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    )
  },
)

GlassPanel.displayName = 'GlassPanel'
