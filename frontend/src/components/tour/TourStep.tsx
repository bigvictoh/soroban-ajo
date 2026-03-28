'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { useTourStore, TourStepConfig } from '../../hooks/useTour';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TourStepProps {
  step: TourStepConfig;
  index: number;
  totalSteps: number;
}

export const TourStep: React.FC<TourStepProps> = ({ step, index, totalSteps }) => {
  const { nextStep, prevStep, stopTour } = useTourStore();
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('relative', 'z-[9999]', 'ring-4', 'ring-blue-500/50', 'ring-offset-2', 'rounded-lg', 'transition-all');
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      const element = document.querySelector(step.target);
      if (element) {
        element.classList.remove('relative', 'z-[9999]', 'ring-4', 'ring-blue-500/50', 'ring-offset-2');
      }
    };
  }, [step.target]);

  if (!isMounted) return null;

  const getTooltipStyles = () => {
    const padding = 12;
    switch (step.position) {
      case 'bottom':
        return { top: coords.top + coords.height + padding, left: coords.left + coords.width / 2 };
      case 'top':
        return { top: coords.top - padding, left: coords.left + coords.width / 2 };
      case 'left':
        return { top: coords.top + coords.height / 2, left: coords.left - padding };
      case 'right':
        return { top: coords.top + coords.height / 2, left: coords.left + coords.width + padding };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      default:
        return { top: coords.top + coords.height + padding, left: coords.left + coords.width / 2 };
    }
  };

  const tooltipStyles = getTooltipStyles();

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
        onClick={stopTour}
      />

      {/* Spotlight effect (approximated with CSS) */}
      <div 
        className="absolute pointer-events-none transition-all duration-300 ease-out border-[2000px] border-black/40 rounded-full"
        style={{
          top: coords.top - 2000 + (coords.height / 2),
          left: coords.left - 2000 + (coords.width / 2),
          width: 4000,
          height: 4000,
          clipPath: `path('M 0 0 h 4000 v 4000 h -4000 z M ${2000 - coords.width/2 - 8} ${2000 - coords.height/2 - 8} h ${coords.width + 16} v ${coords.height + 16} h ${-coords.width - 16} z')`
        }}
      />

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          ...tooltipStyles,
          position: 'absolute' as const,
          transform: step.position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)'
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="pointer-events-auto w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 border border-gray-200 dark:border-gray-800"
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
          <button 
            onClick={stopTour}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
          {step.content}
        </p>

        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-400">
            Step {index + 1} of {totalSteps}
          </span>
          
          <div className="flex gap-2">
            {index > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevStep}
                leftIcon={<ChevronLeft size={16} />}
              >
                Back
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={nextStep}
              rightIcon={index === totalSteps - 1 ? undefined : <ChevronRight size={16} />}
            >
              {index === totalSteps - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
        
        {/* Arrow implementation would go here depending on position */}
      </motion.div>
    </div>,
    document.body
  );
};
