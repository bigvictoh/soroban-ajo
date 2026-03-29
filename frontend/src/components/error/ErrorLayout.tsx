'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GradientText } from '../GradientText'

interface ErrorLayoutProps {
  code?: string
  title: string
  message: string
  children?: React.ReactNode
  icon?: React.ReactNode
}

export const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  code,
  title,
  message,
  children,
  icon,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="glass-card-elevated p-8 md:p-12 text-center shadow-2xl rounded-3xl border border-white/20 dark:border-white/10">
          {/* Icon / Illustration Slot */}
          {icon && (
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-8 flex justify-center text-blue-600 dark:text-indigo-400"
            >
              {icon}
            </motion.div>
          )}

          {/* Error Code */}
          {code && (
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-blue-100 dark:bg-indigo-900/50 text-blue-600 dark:text-indigo-400 rounded-full">
              Error {code}
            </span>
          )}

          {/* Title */}
          <GradientText as="h1" variant="stellar" className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {title}
          </GradientText>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-10 leading-relaxed max-w-sm mx-auto">
            {message}
          </p>

          {/* Actions / Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {children}
          </div>
        </div>

        {/* Brand Footer in Error State */}
        <p className="mt-8 text-center text-gray-400 dark:text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} Ajo Protocol. Secure decentralized savings.
        </p>
      </motion.div>
    </div>
  )
}
