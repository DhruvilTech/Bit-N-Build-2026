import React, { useEffect, useRef } from 'react';

export const RadarBackground: React.FC<{ opacity?: number }> = ({ opacity = 0.4 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Tactical radar dots
    const dots: { x: number; y: number; alpha: number; pulse: number }[] = [];
    for (let i = 0; i < 28; i++) {
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * 0.02 + 0.01,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isLight = document.documentElement.classList.contains('light');

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.65;

      // Coordinate grid
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Concentric radar range rings
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(0, 212, 255, 0.06)';
      ctx.lineWidth = 1;
      const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
      rings.forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // Rotating radar beam
      angle = (angle + 0.007) % (Math.PI * 2);

      const sweepGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );
      if (isLight) {
        sweepGradient.addColorStop(0, 'rgba(2, 132, 199, 0.12)');
        sweepGradient.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
      } else {
        sweepGradient.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
        sweepGradient.addColorStop(1, 'rgba(0, 212, 255, 0.0)');
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, angle - 0.35, angle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Leading beam edge line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Render tactical blips
      dots.forEach((dot) => {
        dot.alpha += dot.pulse;
        if (dot.alpha > 0.8 || dot.alpha < 0.2) dot.pulse = -dot.pulse;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = isLight
          ? `rgba(2, 132, 199, ${dot.alpha * 0.5})`
          : `rgba(0, 212, 255, ${dot.alpha * 0.6})`;
        ctx.fill();

        // mini ping ring
        if (dot.alpha > 0.6) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = isLight
            ? `rgba(2, 132, 199, ${(0.8 - dot.alpha) * 0.3})`
            : `rgba(0, 212, 255, ${(0.8 - dot.alpha) * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Dynamic Theme Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#F8FAFC_85%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,#060911_85%)]" />
      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 scanlines opacity-30 dark:opacity-40" />
    </div>
  );
};
