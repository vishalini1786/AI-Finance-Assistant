import React, { useRef, useState } from 'react';

export const MagneticButton = ({
  children,
  className = '',
  onClick,
  strength = 0.3,
  ...props
}) => {
  const btnRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * strength;
    const y = (clientY - (top + height / 2)) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        transition: 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      className={`inline-flex items-center justify-center transition-shadow duration-200 active:scale-95 cursor-pointer select-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default MagneticButton;