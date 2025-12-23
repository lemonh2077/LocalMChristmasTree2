
import React, { Suspense, ReactNode, Component } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Html, Environment } from '@react-three/drei';
import TreeParticles from './TreeParticles';
import Decorations from './Decorations';
import PhotoGallery from './PhotoGallery';
import { COLORS } from '../constants';
import * as THREE from 'three';

interface SceneProps {
  wishProgress: number;
  heroIndex: number;
}

interface GalleryErrorBoundaryProps {
  children?: ReactNode;
}

interface GalleryErrorBoundaryState {
  hasError: boolean;
}

class GalleryErrorBoundary extends Component<GalleryErrorBoundaryProps, GalleryErrorBoundaryState> {
  constructor(props: GalleryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): GalleryErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Gallery partially unavailable:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center position={[0, 0, 0]} zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center justify-center pointer-events-none opacity-80">
            <div className="w-12 h-12 border-2 border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-2">
               <span className="text-[#D4AF37] text-xl">!</span>
            </div>
            <div className="text-[#D4AF37] text-[10px] tracking-[0.2em] uppercase text-center font-light">
               Memories<br/>Unavailable
            </div>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

const Scene: React.FC<SceneProps> = ({ wishProgress, heroIndex }) => {
  return (
    <Canvas dpr={[1, 2]} shadows gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
      <color attach="background" args={[COLORS.background]} />
      
      <Environment preset="city" />

      <PerspectiveCamera makeDefault position={[0, 5, 17]} fov={45} />
      
      {/* Reduced Ambient Light intensity to prevent washing out textures */}
      <ambientLight intensity={0.4 + wishProgress * 0.4} />
      
      <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.gold} />
      <pointLight position={[-10, 5, -5]} intensity={1} color={COLORS.ruby} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#fff" />
      
      <TreeParticles wishProgress={wishProgress} />
      <Decorations wishProgress={wishProgress} />
      
      <GalleryErrorBoundary>
        <Suspense fallback={
          <Html center zIndexRange={[100, 0]}>
             <div className="text-[#D4AF37] text-[10px] tracking-widest uppercase animate-pulse">Loading Memories...</div>
          </Html>
        }>
          <PhotoGallery wishProgress={wishProgress} heroIndex={heroIndex} />
        </Suspense>
      </GalleryErrorBoundary>
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        minDistance={10} 
        maxDistance={35} 
        autoRotate={true} 
        autoRotateSpeed={wishProgress > 0.5 ? 0.2 : 0.6}
        enabled={wishProgress < 0.1} 
        target={[0, 1, 0]}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </Canvas>
  );
};

export default Scene;
