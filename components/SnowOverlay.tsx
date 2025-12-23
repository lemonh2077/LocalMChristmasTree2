import React, { useMemo } from 'react';

const SnowOverlay: React.FC = () => {
  const snowflakes = useMemo(() => {
    // Generate 65 snowflakes for a dense but performant effect
    return Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      // Distribute flakes immediately across the screen using negative delay
      delay: `${-Math.random() * 20}s`,
      size: `${Math.random() * 0.4 + 0.4}rem`,
      duration: `${Math.random() * 5 + 10}s`,
      opacity: Math.random() * 0.4 + 0.2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {snowflakes.map((snow) => (
        <div
          key={snow.id}
          className="absolute animate-snowfall"
          style={{
            left: snow.left,
            animationDelay: snow.delay,
            fontSize: snow.size,
            animationDuration: snow.duration,
            opacity: snow.opacity,
            color: 'white',
            willChange: 'transform',
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};

export default SnowOverlay;