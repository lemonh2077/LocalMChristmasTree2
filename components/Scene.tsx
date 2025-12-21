import React, { Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, ContactShadows, Html } from '@react-three/drei';
import TreeParticles from './TreeParticles';
import Decorations from './Decorations';
import PhotoGallery from './PhotoGallery';
import { COLORS } from '../constants';

interface SceneProps {
  wishProgress: number;
  heroIndex: number;
}

interface GalleryErrorBoundaryProps {
  children: ReactNode;
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
    // Log minimal error info
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
    <Canvas dpr={[1, 2]} shadows gl={{ antialias: false }}>
      <color attach="background" args={[COLORS.background]} />
      <PerspectiveCamera makeDefault position={[0, 2, 16]} fov={45} />
      
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.gold} />
      <pointLight position={[-10, 5, -5]} intensity={1} color={COLORS.ruby} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#fff" />
      
      {/* 
          Split Suspense: 
          1. TreeParticles and Decorations are procedural and instant -> Render immediately.
          2. PhotoGallery loads images -> Wrapped in Suspense.
      */}
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
      
      {/* Floor logic: fades out during explosion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#050505" 
          roughness={0.8} 
          metalness={0.2}
          transparent
          opacity={1 - wishProgress * 0.9}
        />
      </mesh>
      
      <ContactShadows 
        opacity={0.4 * (1 - wishProgress)} 
        scale={20} 
        blur={2.4} 
        far={10} 
        resolution={256} 
        color="#000000" 
      />

      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        minDistance={10} 
        maxDistance={25} 
        autoRotate={true} // Always auto-rotate background elements
        autoRotateSpeed={wishProgress > 0.5 ? 0.3 : 0.6}
        enabled={wishProgress < 0.1} // Allow user orbit only when in tree mode
      />
    </Canvas>
  );
};

export default Scene;