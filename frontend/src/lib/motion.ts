/**
 * PS-9 Intelligent Emergency Response Platform
 * Motion System Specifications
 */

import { Variants, Transition } from 'framer-motion';

export const MOTION_TIMINGS = {
  micro: 0.15,     // 150ms
  fast: 0.25,      // 250ms
  standard: 0.4,   // 400ms
  emphasis: 0.6,   // 600ms
  ambient: 8.0,    // 8000ms
};

export const MOTION_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const standardTransition: Transition = {
  duration: MOTION_TIMINGS.standard,
  ease: MOTION_EASE,
};

export const fastTransition: Transition = {
  duration: MOTION_TIMINGS.fast,
  ease: MOTION_EASE,
};

export const pageRevealVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMINGS.standard,
      ease: MOTION_EASE,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: MOTION_TIMINGS.fast,
      ease: MOTION_EASE,
    },
  },
};

export const itemFadeInVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMINGS.standard,
      ease: MOTION_EASE,
    },
  },
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};
