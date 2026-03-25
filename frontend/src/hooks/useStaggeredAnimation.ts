import { useEffect, useState } from 'react'

/**
 * useStaggeredAnimation
 * Returns per-item inline styles with staggered animation delays.
 * Items animate in sequence after an optional initial delay.
 *
 * @param count      Number of items to animate
 * @param stepMs     Delay between each item in ms (default 80)
 * @param initialMs  Delay before the first item animates (default 0)
 */
export function useStaggeredAnimation(
  count: number,
  stepMs = 80,
  initialMs = 0
): React.CSSProperties[] {
  const [styles, setStyles] = useState<React.CSSProperties[]>([])

  useEffect(() => {
    setStyles(
      Array.from({ length: count }, (_, i) => ({
        animationDelay: `${initialMs + i * stepMs}ms`,
        animationFillMode: 'both',
      }))
    )
  }, [count, stepMs, initialMs])

  return styles
}
