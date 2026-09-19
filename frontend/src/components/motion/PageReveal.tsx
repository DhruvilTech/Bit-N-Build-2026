import React from 'react';
import { motion } from 'framer-motion';
import { pageRevealVariants } from '../../lib/motion';

interface PageRevealProps {
  children: React.ReactNode;
  className?: string;
}

export const PageReveal: React.FC<PageRevealProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={pageRevealVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
};
