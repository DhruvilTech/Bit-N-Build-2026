import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export const SplitCursor: React.FC = () => {
  const [cursorState, setCursorState] = useState<'default' | 'pointer' | 'critical' | 'crosshair'>('default');
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for outer trailing ring
  const springX = useSpring(mouseX, { stiffness: 450, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 450, damping: 28 });

  useEffect(() => {
    // Disable custom cursor on touch screens
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const criticalEl = target.closest('[data-cursor="critical"]') || target.closest('.cursor-critical');
      const crosshairEl = target.closest('[data-cursor="crosshair"]') || target.closest('.leaflet-container');
      const interactiveEl = target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('input') || target.closest('select');

      if (criticalEl) {
        setCursorState('critical');
      } else if (crosshairEl) {
        setCursorState('crosshair');
      } else if (interactiveEl) {
        setCursorState('pointer');
      } else {
        setCursorState('default');
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
      {/* Outer Ring */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: cursorState === 'pointer' ? 1.5 : cursorState === 'critical' ? 1.8 : cursorState === 'crosshair' ? 1.3 : 1,
          borderColor:
            cursorState === 'critical'
              ? 'rgba(255, 59, 59, 0.9)'
              : cursorState === 'crosshair'
              ? 'rgba(56, 189, 248, 0.85)'
              : cursorState === 'pointer'
              ? 'rgba(0, 217, 255, 0.85)'
              : 'rgba(0, 217, 255, 0.45)',
          backgroundColor:
            cursorState === 'critical'
              ? 'rgba(255, 59, 59, 0.08)'
              : cursorState === 'pointer'
              ? 'rgba(0, 217, 255, 0.08)'
              : 'transparent',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`w-9 h-9 rounded-full border border-dashed transition-colors duration-150 ${
          cursorState === 'crosshair' ? 'border-dashed border-2' : 'border-solid'
        }`}
      />

      {/* Center Target Point */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: cursorState === 'pointer' ? 0.7 : cursorState === 'critical' ? 1.4 : 1,
          backgroundColor:
            cursorState === 'critical'
              ? '#FF3B3B'
              : cursorState === 'crosshair'
              ? '#38BDF8'
              : '#00D9FF',
          boxShadow:
            cursorState === 'critical'
              ? '0 0 12px 2px rgba(255, 59, 59, 0.8)'
              : '0 0 10px 2px rgba(0, 217, 255, 0.7)',
        }}
        className="w-2 h-2 rounded-full fixed"
      />
    </div>
  );
};
