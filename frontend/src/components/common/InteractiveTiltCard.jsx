import React, { useRef, useState } from 'react';

export const InteractiveTiltCard = ({
  children,
  className = '',
  glowColor = 'rgba(56, 189, 248, 0.18)',
  tiltMaxAngleX = 8,
  tiltMaxAngleY = 8,
  glowSize = 450,
  onClick,
  ...props
}) => {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -tiltMaxAngleX;
    const rotateY = ((x - centerX) / centerX) * tiltMaxAngleY;

    setRotate({ x: rotateX, y: rotateY });
    setSpotlight({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-2xl hover:border-sky-400/50 dark:hover:border-sky-400/40 transition-all duration-300 group cursor-pointer ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-2xl z-0"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(${glowSize}px circle at ${spotlight.x}% ${spotlight.y}%, ${glowColor}, transparent 70%)`,
        }}
      />
      
      {/* Dynamic Edge Highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-sky-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default InteractiveTiltCard;