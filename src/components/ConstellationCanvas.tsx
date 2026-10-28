import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId: number;
    const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    const count = width < 640 ? 25 : 45;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 1,
      });
    }

    function render(step: boolean) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (step) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 125) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(15, 23, 42, ${0.1 - (dist / 125) * 0.1})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      render(true);
      animationFrameId = requestAnimationFrame(animate);
    }

    if (isReducedMotion) {
      render(false);
    } else {
      animate();
    }

    const handleResize = () => {
      resize();
      render(false);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!isReducedMotion) {
        animate();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />
      {/* Decorative ambient gradients */}
      <div
        className="fixed w-96 h-96 bg-blue-300/35 top-10 left-10 rounded-full filter blur-[70px] pointer-events-none z-0 animate-float-blob-1"
        aria-hidden="true"
      />
      <div
        className="fixed w-[450px] h-[450px] bg-indigo-200/40 top-1/2 right-8 rounded-full filter blur-[80px] pointer-events-none z-0 animate-float-blob-2"
        aria-hidden="true"
      />
      <div
        className="fixed w-80 h-80 bg-cyan-200/30 bottom-10 left-1/3 rounded-full filter blur-[70px] pointer-events-none z-0"
        aria-hidden="true"
      />
    </>
  );
}
