import React, { Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
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
    <Canvas dpr={[1, 2]} shadows gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
      <color attach="background" args={[COLORS.background]} />
      
      {/* 
         【核心修改】国产化环境适配：
         1. 移除了 preset="city" (因为它会去连接 GitHub 下载，导致国内黑屏)。
         2. 改为 files="/env.hdr" (直接加载 public 文件夹下的本地文件)。
         
         务必确保你已经下载了一个 .hdr 文件，命名为 env.hdr 并放入 public 文件夹！
         如果你暂时没有 hdr 文件，可以先把下面这行注释掉，画面会变暗，但不黑屏。
      */}
      <Environment files="/env.hdr" />

      <PerspectiveCamera makeDefault position={[0, 5, 17]} fov={45} />
      
      {/* 稍微增强一点环境光，防止 HDR 加载失败时全黑 */}
      <ambientLight intensity={0.8 + wishProgress * 0.5} />
      
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
