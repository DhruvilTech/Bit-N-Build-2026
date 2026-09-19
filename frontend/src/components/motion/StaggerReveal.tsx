import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainerVariants, itemFadeInVariants } from '../../lib/motion';

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerReveal: React.FC<StaggerRevealProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemFadeInVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};
