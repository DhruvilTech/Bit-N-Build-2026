import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  type: 'incident' | 'command' | 'fire' | 'medical' | 'police' | 'hospital';
}

interface Pulse {
  sourceIdx: number;
  targetIdx: number;
  progress: number;
  speed: number;
}

interface EmergencyNetworkProps {
  className?: string;
  nodeCount?: number;
  opacity?: number;
}

export const EmergencyNetwork: React.FC<EmergencyNetworkProps> = ({
  className = '',
  nodeCount = 20,
  opacity = 0.45,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const types: Node['type'][] = ['incident', 'command', 'fire', 'medical', 'police', 'hospital'];
    const labels = ['INC-01', 'HQ-CORE', 'ENG-4', 'EMS-2', 'TAC-9', 'TRAUMA-1', 'UNIT-7', 'DISP-1'];

    const nodes: Node[] = Array.from({ length: nodeCount }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: i === 0 ? 5 : Math.random() * 2.5 + 2,
      label: labels[i % labels.length],
      type: types[i % types.length],
    }));

    const pulses: Pulse[] = [];
    for (let i = 0; i < 6; i++) {
      pulses.push({
        sourceIdx: Math.floor(Math.random() * nodeCount),
        targetIdx: Math.floor(Math.random() * nodeCount),
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.008,
      });
    }

    const getNodeColor = (type: Node['type']) => {
      switch (type) {
        case 'incident':
          return '#FB4A4A';
        case 'command':
          return '#2DD4BF';
        case 'medical':
          return '#34D399';
        case 'police':
          return '#3B82F6';
        case 'hospital':
          return '#7C5CFC';
        case 'fire':
        default:
          return '#F5A623';
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const isLight = document.documentElement.classList.contains('light');

      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      // Draw connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.25 * opacity;
            ctx.strokeStyle = isLight
              ? `rgba(13, 148, 136, ${alpha * 2.5})`
              : `rgba(45, 212, 191, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw traveling telemetry pulses
      pulses.forEach((pulse) => {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          pulse.progress = 0;
          pulse.sourceIdx = Math.floor(Math.random() * nodeCount);
          pulse.targetIdx = Math.floor(Math.random() * nodeCount);
        }

        const source = nodes[pulse.sourceIdx];
        const target = nodes[pulse.targetIdx];
        const px = source.x + (target.x - source.x) * pulse.progress;
        const py = source.y + (target.y - source.y) * pulse.progress;

        ctx.fillStyle = isLight ? '#0D9488' : '#2DD4BF';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const color = getNodeColor(node.type);

        // Node halo
        ctx.fillStyle = `${color}22`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Node center
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Small monospace label
        ctx.fillStyle = isLight ? 'rgba(51, 65, 85, 0.9)' : 'rgba(156, 165, 180, 0.6)';
        ctx.font = '8px monospace';
        ctx.fillText(node.label, node.x + 8, node.y + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodeCount, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ opacity }}
    />
  );
};
