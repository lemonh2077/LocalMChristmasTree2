
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { USER_PHOTOS, TREE_HEIGHT, TREE_RADIUS, COLORS } from '../constants';

interface PhotoItemProps {
  url: string;
  index: number;
  wishProgress: number;
  heroIndex: number;
  total: number;
}

// Utility to proxy URLs through wsrv.nl for CORS support and optimization
const getOptimizedUrl = (url: string) => {
  try {
    // wsrv.nl provides CORS headers and on-the-fly resizing
    // w=500: Resize to 500px width (sufficient for 3D cards)
    // q=80: 80% quality
    // output=webp: Efficient format
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=500&q=80&output=webp`;
  } catch (e) {
    return url;
  }
};

const PhotoItem: React.FC<PhotoItemProps> = ({ url, index, wishProgress, heroIndex, total }) => {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera } = useThree();
  
  // Load texture via proxy to ensure CORS headers are present
  const texture = useTexture(getOptimizedUrl(url));

  const { originalPos, originalRot } = useMemo(() => {
    const spiralLoops = 1.5;
    const h = 0.3 + (index / total) * 0.65;
    const angle = (index / total) * Math.PI * 2 * spiralLoops;
    const r = (1 - h) * TREE_RADIUS + 0.5;

    const x = Math.cos(angle) * r;
    const y = h * TREE_HEIGHT - TREE_HEIGHT / 2;
    const z = Math.sin(angle) * r;

    return {
      originalPos: new THREE.Vector3(x, y, z),
      originalRot: new THREE.Euler(-0.2, angle + Math.PI / 2, 0)
    };
  }, [index, total]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Idle Orbit (Christmas Tree state)
    const orbitSpeed = 0.1;
    const angleOffset = state.clock.getElapsedTime() * orbitSpeed;
    const currentAngle = Math.atan2(originalPos.z, originalPos.x) + angleOffset;
    const rBase = originalPos.length() - (originalPos.y + TREE_HEIGHT/2) / TREE_HEIGHT * 0.5;
    const orbitX = Math.cos(currentAngle) * rBase;
    const orbitZ = Math.sin(currentAngle) * rBase;
    const orbitY = originalPos.y;

    if (wishProgress > 0.01) {
      // --- MOBILE RING LAYOUT ---
      const isHero = index === heroIndex;
      
      let targetPos: THREE.Vector3;
      let targetScale: number;

      if (isHero) {
        // Hero: Center, slightly pushed back to allow context, scale adjusted for mobile width
        targetPos = new THREE.Vector3(0, 0, -5).applyMatrix4(camera.matrixWorld);
        targetScale = 1.5; // ~60-70% of screen width
      } else {
        // Others: Arranged in a circle around the hero
        let relativeIndex = (index - heroIndex);
        while (relativeIndex < 0) relativeIndex += total;
        relativeIndex = relativeIndex % total;

        const angleStep = (Math.PI * 2) / total;
        const angle = relativeIndex * angleStep - Math.PI / 2; // Start from top

        const radiusX = 1.8; 
        const radiusY = 2.8; 

        const rx = Math.cos(angle) * radiusX;
        const ry = Math.sin(angle) * radiusY;
        
        targetPos = new THREE.Vector3(rx, ry, -9).applyMatrix4(camera.matrixWorld);
        targetScale = 0.6; // Small thumbnail size
      }
      
      meshRef.current.position.lerp(targetPos, 0.1);
      meshRef.current.lookAt(camera.position);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      if (materialRef.current) {
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(0.2, isHero ? 1.0 : 0.1, wishProgress);
        materialRef.current.opacity = THREE.MathUtils.lerp(1, isHero ? 1 : 0.7, wishProgress);
      }
    } else {
      // --- IDLE STATE ---
      meshRef.current.position.lerp(new THREE.Vector3(orbitX, orbitY, orbitZ), 0.1);
      meshRef.current.rotation.set(originalRot.x, currentAngle + Math.PI / 2, originalRot.z);
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      
      if (materialRef.current) {
        materialRef.current.opacity = 1;
        materialRef.current.emissiveIntensity = 0.2;
      }
    }
  });

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.2, 1.5]} />
        <meshStandardMaterial 
          ref={materialRef}
          color={COLORS.pearl} 
          roughness={0.05} 
          metalness={0.1} 
          emissive={COLORS.pearl} 
          emissiveIntensity={0.2} 
          transparent
        />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

interface PhotoGalleryProps {
  wishProgress: number;
  heroIndex: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ wishProgress, heroIndex }) => {
  return (
    <group>
      {USER_PHOTOS.map((url, i) => (
        <PhotoItem 
          key={url + i} 
          url={url} 
          index={i} 
          wishProgress={wishProgress} 
          heroIndex={heroIndex}
          total={USER_PHOTOS.length}
        />
      ))}
    </group>
  );
};

export default PhotoGallery;
