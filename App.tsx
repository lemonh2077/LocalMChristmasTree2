
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Scene from './components/Scene';
import { USER_PHOTOS } from './constants';

const App: React.FC = () => {
  const [isExploded, setIsExploded] = useState(false);
  const [wishProgress, setWishProgress] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const requestRef = useRef<number>();

  // Swipe detection
  const touchStart = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    setWishProgress(prev => {
      const target = isExploded ? 1 : 0;
      const step = 0.05;
      if (Math.abs(prev - target) < step) return target;
      return prev + (target > prev ? step : -step);
    });
    requestRef.current = requestAnimationFrame(updateProgress);
  }, [isExploded]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateProgress]);

  const toggleExplosion = () => {
    if (!isExploded) {
      setIsExploded(true);
    }
  };

  const reset = () => {
    setIsExploded(false);
  };

  const nextPhoto = () => {
    setHeroIndex(prev => (prev + 1) % USER_PHOTOS.length);
  };

  const prevPhoto = () => {
    setHeroIndex(prev => (prev - 1 + USER_PHOTOS.length) % USER_PHOTOS.length);
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStart.current = x;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStart.current === null) return;
    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = touchStart.current - x;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPhoto();
      else prevPhoto();
    }
    touchStart.current = null;
  };

  return (
    <div 
      className="relative w-full h-full select-none touch-none bg-[#050505] overflow-hidden"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene wishProgress={wishProgress} heroIndex={heroIndex} />
      </div>

      {/* Overlay UI */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${wishProgress > 0.8 ? 'bg-black/40' : 'bg-transparent'}`}>
        {/* Header */}
        <div className={`absolute top-12 left-0 right-0 text-center px-6 transition-transform duration-700 ${wishProgress > 0.5 ? '-translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <h1 className="text-[#D4AF37] text-3xl font-bold tracking-widest drop-shadow-lg mb-2">
            ROYAL EMERALD
          </h1>
          <p className="text-[#FDF5E6]/60 text-xs tracking-[0.2em] uppercase">
            A Masterpiece of Winter Memories
          </p>
        </div>

        {/* Carousel Indicator */}
        {wishProgress > 0.9 && (
          <div className="absolute top-16 left-0 right-0 flex justify-center gap-1.5 transition-opacity duration-500 opacity-100">
             {USER_PHOTOS.map((_, i) => (
               <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-6 bg-[#D4AF37]' : 'w-2 bg-[#FDF5E6]/20'}`} />
             ))}
          </div>
        )}

        {/* Wish Interaction UI */}
        <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center pointer-events-auto">
          {!isExploded ? (
            <button
              onClick={toggleExplosion}
              className="relative group w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md active:scale-90"
            >
              <div className="absolute inset-1 rounded-full border-2 border-[#D4AF37] opacity-20 animate-pulse" />
              <div className="text-center">
                <span className="block text-[#D4AF37] text-[10px] font-bold tracking-tighter uppercase mb-0.5">TAP TO</span>
                <span className="block text-[#FDF5E6] text-sm font-black tracking-widest uppercase">WISH</span>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-8">
               <p className="text-[#FDF5E6]/60 text-[10px] uppercase tracking-[0.3em] animate-pulse">
                Swipe to browse gallery
              </p>
              <button
                onClick={reset}
                className="px-8 py-3 rounded-full border border-[#B22222]/50 bg-[#B22222]/10 backdrop-blur-md text-[#FDF5E6] text-xs font-bold tracking-[0.2em] uppercase transition-all active:scale-95 hover:bg-[#B22222]/20"
              >
                Reset Tree
              </button>
            </div>
          )}
          
          <p className={`mt-6 text-[#FDF5E6]/40 text-[10px] uppercase tracking-widest transition-opacity duration-300 ${isExploded ? 'opacity-0' : 'opacity-100'}`}>
            Experience the royal scattering
          </p>
        </div>
      </div>

      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
    </div>
  );
};

export default App;
