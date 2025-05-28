
import { useEffect, useRef, useState } from 'react';

const WebGLLoader = ({ onComplete }: { onComplete: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let startTime = Date.now();
    const duration = 3000; // 3 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setProgress(progress);

      // Clear canvas
      ctx.fillStyle = '#0f0f23';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      gradient.addColorStop(0, '#1e1b4b');
      gradient.addColorStop(0.5, '#312e81');
      gradient.addColorStop(1, '#0f0f23');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated particles
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + elapsed * 0.001;
        const radius = 100 + Math.sin(elapsed * 0.002 + i) * 50;
        const x = canvas.width / 2 + Math.cos(angle) * radius;
        const y = canvas.height / 2 + Math.sin(angle) * radius;
        
        const size = 2 + Math.sin(elapsed * 0.005 + i) * 1;
        const opacity = 0.3 + Math.sin(elapsed * 0.003 + i) * 0.3;
        
        ctx.fillStyle = `rgba(139, 92, 246, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw central rotating element
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(elapsed * 0.002);
      
      const ringRadius = 80;
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.8 * progress})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2 * progress);
      ctx.stroke();
      
      ctx.restore();

      // Draw loading progress bar
      const barWidth = Math.min(400, canvas.width * 0.8);
      const barHeight = 6;
      const barX = (canvas.width - barWidth) / 2;
      const barY = canvas.height / 2 + 150;

      // Background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar
      const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      progressGradient.addColorStop(0, '#06b6d4');
      progressGradient.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = progressGradient;
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
            AkProject
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mt-4">
            Загрузка...
          </p>
        </div>
        <div className="text-sm md:text-base text-gray-400">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  );
};

export default WebGLLoader;
