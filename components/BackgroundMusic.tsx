
import React, { useEffect, useRef, useState } from 'react';

// Updated Resource Link with Commit Hash (93969c5) to bypass CDN cache
const BGM_URL = "https://cdn.jsdelivr.net/gh/lemonh2077/LocalMChristmasTree2@93969c5/bgm.mp3";

const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialize audio instance
    const audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.volume = 0.6;
    audio.preload = 'auto'; // Ensure metadata is loaded to check support
    audioRef.current = audio;

    // Attempt auto-play
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.log("Auto-play prevented. Waiting for interaction.", error);
          setIsPlaying(false);
        });
    }

    // Interaction Unlocker: 
    // If browser blocks autoplay, or if it didn't start, wait for first touch/click
    const unlockAudio = () => {
      if (audioRef.current) {
        // If not playing, try to play again on user interaction
        if (audioRef.current.paused) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Playback failed", e));
        }
      }
      // Remove listeners once we've tried to interact
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      audio.pause();
      audioRef.current = null;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const toggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent triggering other app interactions
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("Manual play failed", e));
      setIsPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      onTouchEnd={(e) => { e.preventDefault(); toggle(e); }}
      // Position adjusted to top-12 (approx 48px) based on user feedback 
      className="absolute top-12 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 transition-all hover:bg-white/20 active:scale-95 shadow-lg flex items-center justify-center overflow-hidden"
      aria-label={isPlaying ? "Mute music" : "Play music"}
    >
      {isPlaying ? (
        // Icon: Music Note (Inline SVG - Zero Dependency)
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      ) : (
        // Icon: Music Off (Inline SVG - Zero Dependency)
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      )}
    </button>
  );
};

export default BackgroundMusic;
