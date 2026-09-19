import React, { useEffect, useState, useRef } from 'react';

interface TextScrambleProps {
  text: string;
  className?: string;
  duration?: number;
  trigger?: any;
}

const GLYPHS = 'ABCDEF0123456789!#%&*?@+-/<>~';

export const TextScramble: React.FC<TextScrambleProps> = ({
  text,
  className = '',
  duration = 400,
  trigger,
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayText(text);
      return;
    }

    let startTime = performance.now();
    const length = text.length;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Determine how many characters are resolved
      const resolvedCount = Math.floor(progress * length);

      let scrambled = '';
      for (let i = 0; i < length; i++) {
        if (i < resolvedCount || text[i] === ' ') {
          scrambled += text[i];
        } else {
          scrambled += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }

      setDisplayText(scrambled);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, duration, trigger]);

  return <span className={className}>{displayText}</span>;
};
