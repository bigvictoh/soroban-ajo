/**
 * @file EmptyState.tsx
 * @description A premium, reusable empty state component with support for illustrations and animations.
 * Provides a consistent fallback UI when collections or dashboards are empty.
 */

import React from 'react';
import Image from 'next/image';

interface Action {
  /** Text to display on the button */
  label: string;
  /** Callback fired when the button is clicked */
  onClick: () => void;
  /** Optional icon to prepend to the label */
  icon?: string;
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface EmptyStateProps {
  /** Path to the SVG illustration in the public folder */
  illustration: string;
  /** Main heading text */
  heading: string;
  /** Detailed message explaining the empty state */
  description: string;
  /** Primary call to action button */
  primaryAction?: Action;
  /** Optional secondary call to action button */
  secondaryAction?: Action;
  /** Visual scale of the illustration */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-[180px]',
  md: 'max-w-[280px]',
  lg: 'max-w-[420px]',
};

/**
 * A standard layout for empty states across the application.
 * Designed with premium aesthetics, supporting dark mode and responsive layouts.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  heading,
  description,
  primaryAction,
  secondaryAction,
  size = 'md',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ${className}`}>
      {/* Illustration */}
      <div className={`relative w-full aspect-square mb-10 transition-transform duration-500 hover:scale-105 ${sizeClasses[size]}`}>
        <Image
          src={illustration}
          alt=""
          fill
          className="object-contain drop-shadow-2xl dark:brightness-90"
          priority
        />
      </div>

      {/* Content */}
      <div className="max-w-xl">
        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          {heading}
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed font-medium">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 group"
            >
              {primaryAction.label}
              <svg 
                className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
