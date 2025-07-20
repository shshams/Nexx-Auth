import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

export default function AdvancedParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const { theme } = useTheme();

  const createParticle = useCallback((x?: number, y?: number): Particle => {
    const colors = theme === 'dark' 
      ? ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fed7d7', '#8b5cf6', '#a855f7']
      : ['#dc2626', '#ef4444', '#f87171', '#6366f1', '#8b5cf6', '#a855f7'];
    
    return {
      x: x ?? Math.random() * window.innerWidth,
      y: y ?? Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: Math.random() * 400 + 300
    };
  }, [theme]);

  const initializeParticles = useCallback(() => {
    particlesRef.current = [];
    for (let i = 0; i < 60; i++) {
      particlesRef.current.push(createParticle());
    }
  }, [createParticle]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = particle.color;
    ctx.fill();
    ctx.restore();
  }, []);

  const drawConnections = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    const maxDistance = 80;
    const maxConnections = 3; // Limit connections per particle for performance
    
    for (let i = 0; i < particles.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < particles.length && connections < maxConnections; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.15;
          ctx.save();
          ctx.globalAlpha = opacity * particles[i].opacity * particles[j].opacity;
          ctx.strokeStyle = theme === 'dark' ? '#dc2626' : '#ef4444';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
          connections++;
        }
      }
    }
  }, [theme]);

  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Frame rate limiting for better performance
    const deltaTime = currentTime - lastTimeRef.current;
    if (deltaTime < 16.67) { // ~60fps
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastTimeRef.current = currentTime;

    // Clear canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles with optimized loop
    for (let i = 0; i < particlesRef.current.length; i++) {
      const particle = particlesRef.current[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life++;

      // Mouse interaction - smooth repulsion
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distanceSquared = dx * dx + dy * dy;
      const interactionRadius = 100;
      
      if (distanceSquared < interactionRadius * interactionRadius && distanceSquared > 0) {
        const distance = Math.sqrt(distanceSquared);
        const force = (interactionRadius - distance) / interactionRadius;
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        particle.vx -= normalizedDx * force * 0.2;
        particle.vy -= normalizedDy * force * 0.2;
      }
      
      // Natural floating motion
      particle.vx += Math.sin(particle.life * 0.005) * 0.005;
      particle.vy += Math.cos(particle.life * 0.007) * 0.005;
      
      // Velocity damping
      particle.vx *= 0.996;
      particle.vy *= 0.996;

      // Boundary handling with smooth wrapping
      const margin = 50;
      if (particle.x < -margin) {
        particle.x = canvas.width + margin;
      } else if (particle.x > canvas.width + margin) {
        particle.x = -margin;
      }
      if (particle.y < -margin) {
        particle.y = canvas.height + margin;
      } else if (particle.y > canvas.height + margin) {
        particle.y = -margin;
      }

      // Smooth opacity management
      const lifeRatio = particle.life / particle.maxLife;
      if (lifeRatio > 0.8) {
        particle.opacity = Math.max(0.1, 1 - (lifeRatio - 0.8) / 0.2);
      }

      // Respawn particle when needed
      if (particle.life > particle.maxLife || particle.opacity <= 0.1) {
        particlesRef.current[i] = createParticle();
        continue;
      }

      drawParticle(ctx, particle);
    }

    // Draw connections efficiently
    drawConnections(ctx, particlesRef.current);

    animationRef.current = requestAnimationFrame(animate);
  }, [theme, createParticle, drawParticle, drawConnections]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    resizeCanvas();
    initializeParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [resizeCanvas, initializeParticles, animate, handleMouseMove]);

  // Reinitialize when theme changes
  useEffect(() => {
    initializeParticles();
  }, [theme, initializeParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: theme === 'dark' 
          ? 'radial-gradient(ellipse at top, #0f172a 0%, #020617 50%, #000000 100%)'
          : 'radial-gradient(ellipse at top, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
      }}
    />
  );
}