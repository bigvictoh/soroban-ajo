'use client';

import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTourStore, TourStepConfig } from '../../hooks/useTour';
import { TourStep } from './TourStep';

interface ProductTourProps {
  initialSteps?: TourStepConfig[];
  autoStartDelay?: number;
}

export const ProductTour: React.FC<ProductTourProps> = ({ 
  initialSteps = [], 
  autoStartDelay = 2000 
}) => {
  const { 
    isActive, 
    currentStepIndex, 
    steps, 
    setSteps, 
    startTour, 
    hasCompletedTour 
  } = useTourStore();

  useEffect(() => {
    if (initialSteps.length > 0) {
      setSteps(initialSteps);
    }
  }, [initialSteps, setSteps]);

  useEffect(() => {
    // If user hasn't completed tour and steps are set, start after delay
    if (!hasCompletedTour && !isActive && steps.length > 0) {
      const timer = setTimeout(() => {
        startTour();
      }, autoStartDelay);
      
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, isActive, steps, startTour, autoStartDelay]);

  if (!isActive || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];

  return (
    <AnimatePresence>
      <TourStep 
        key={currentStep.id}
        step={currentStep}
        index={currentStepIndex}
        totalSteps={steps.length}
      />
    </AnimatePresence>
  );
};

export default ProductTour;
