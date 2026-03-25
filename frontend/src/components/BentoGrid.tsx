/**
 * BentoGrid - reusable bento-style grid wrapper
 * Issue #318: Bento grid dashboard layout
 */
import React from 'react'

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

interface BentoCellProps {
  children: React.ReactNode
  /** col-span classes e.g. "col-span-1 md:col-span-2" */
  colSpan?: string
  /** row-span classes e.g. "row-span-1 md:row-span-2" */
  rowSpan?: string
  className?: string
  style?: React.CSSProperties
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => (
  <div
    className={`
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
      gap-4
      auto-rows-[160px]
      ${className}
    `}
  >
    {children}
  </div>
)

export const BentoCell: React.FC<BentoCellProps> = ({
  children,
  colSpan = 'col-span-1',
  rowSpan = 'row-span-1',
  className = '',
  style,
}) => (
  <div
    className={`${colSpan} ${rowSpan} ${className}`}
    style={style}
  >
    {children}
  </div>
)
