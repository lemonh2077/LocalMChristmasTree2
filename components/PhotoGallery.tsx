import React, { useMemo, useRef, useLayoutEffect } from 'react';
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
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1024&q=90&output=webp`;
  } catch (e) {
    return url;
  }
};

const PhotoItem: React.FC<PhotoItemProps> = ({ url, index, wishProgress, heroIndex, total }) => {
  const meshRef = useRef<THREE.Group>(null);
  const cardMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const photoMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera, gl } = useThree();
  
  const texture = useTexture(getOptimizedUrl(url));

  // Helper objects for calculation to avoid garbage collection
  const dummy = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.rotation.order = 'YXZ'; // Match mesh rotation order
    return obj;
  }, []);
  const vec3Tree = useMemo(() => new THREE.Vector3(), []);
  const vec3Carousel = useMemo(() => new THREE.Vector3(), []);
  const quatTree = useMemo(() => new THREE.Quaternion(), []);
  const quatCarousel = useMemo(() => new THREE.Quaternion(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetScale = useMemo(() => new THREE.Vector3(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);

  useLayoutEffect(() => {
    if (meshRef.current) {
      // CRITICAL: Keep rotation order YXZ to separate facing direction (Y) from tilt (X).
      meshRef.current.rotation.order = 'YXZ';
    }
    
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture, gl]);

  // --- Aspect Ratio & Geometry Logic ---
  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  let imgWidth = 1;
  let imgHeight = 1;
  // Increased MAX_SIZE by 10% (1.2 -> 1.32)
  const MAX_SIZE = 1.32;

  if (aspect >= 1) {
    imgWidth = MAX_SIZE;
    imgHeight = MAX_SIZE / aspect;
  } else {
    imgHeight = MAX_SIZE;
    imgWidth = MAX_SIZE * aspect;
  }

  const borderTop = 0.1;
  const borderSide = 0.1;
  const borderBottom = 0.35;
  const frameWidth = imgWidth + borderSide * 2;
  const frameHeight = imgHeight + borderTop + borderBottom;
  const CARD_THICKNESS = 0.02; 
  const imageYOffset = (borderBottom - borderTop) / 2;

  // --- Physics & Position Logic ---
  const { originalPos, originalRot, randomSway, treeScale } = useMemo(() => {
    const spiralLoops = 1.5;
    const progress = index / total; // 0 at bottom, 1 at top
    
    // Range: 0.35 to 0.90 (Above bottom 30%)
    // Previously 0.15 to 0.80
    const h = 0.35 + progress * 0.55;
    const angle = progress * Math.PI * 2 * spiralLoops;
    
    const radiusAtH = (1 - h) * TREE_RADIUS;
    const r = radiusAtH + 0.36;

    const x = Math.cos(angle) * r;
    const y = h * TREE_HEIGHT - TREE_HEIGHT / 2;
    const z = Math.sin(angle) * r;

    // --- ROTATION PHYSICS ---
    const baseTilt = THREE.MathUtils.lerp(-0.15, -0.45, progress);
    const randomTiltX = baseTilt - Math.random() * 0.1; 
    
    const randomTiltZ = (Math.random() - 0.5) * 0.4; 

    // --- SIZE VARIATION ---
    const baseSizeGradient = THREE.MathUtils.lerp(1.2, 0.7, progress);
    const randomVariance = 0.9 + Math.random() * 0.2;
    const finalTreeScale = baseSizeGradient * 0.7 * randomVariance;

    return {
      originalPos: new THREE.Vector3(x, y, z),
      originalRot: new THREE.Euler(randomTiltX, 0, randomTiltZ),
      treeScale: finalTreeScale,
      randomSway: {
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * 100
      }
    };
  }, [index, total]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // --- 1. CALCULATE TREE STATE (Idle) ---
    const orbitSpeed = 0.1;
    const angleOffset = -state.clock.getElapsedTime() * orbitSpeed;
    const currentAngle = Math.atan2(originalPos.z, originalPos.x) + angleOffset;
    const rBase = Math.sqrt(originalPos.x * originalPos.x + originalPos.z * originalPos.z);
    
    const treeX = Math.cos(currentAngle) * rBase;
    const treeZ = Math.sin(currentAngle) * rBase;
    const treeY = originalPos.y;
    vec3Tree.set(treeX, treeY, treeZ);

    const sway = Math.sin(state.clock.elapsedTime * randomSway.speed + randomSway.offset) * 0.03;
    // Simulate YXZ rotation logic for tree state
    dummy.rotation.set(originalRot.x, -currentAngle + Math.PI / 2, originalRot.z + sway);
    quatTree.copy(dummy.quaternion);

    const treeScaleVec = dummy.scale.set(treeScale, treeScale, treeScale).clone(); // Re-use dummy scale temporarily or just new Vector


    // --- 2. CALCULATE CAROUSEL STATE (Exploded) ---
    const isHero = index === heroIndex;
    let offset = index - heroIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const theta = offset * 0.45;
    const radius = 4.2;
    const cX = Math.sin(theta) * radius;
    const cZ = -4.5 - (1 - Math.cos(theta)) * 2.0; 
    
    // Adjusted Vertical Shift:
    // Moved up to 0.1 to avoid overlapping the Reset button at bottom-24
    const verticalShift = isHero ? 0.1 : 0;
    
    const cYBase = isHero ? 0 : Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
    const cY = cYBase + verticalShift;

    // Carousel World Position
    dummy.position.set(cX, cY, cZ);
    dummy.position.applyMatrix4(camera.matrixWorld);
    vec3Carousel.copy(dummy.position);

    // Carousel Rotation (LookAt Camera)
    dummy.lookAt(camera.position);
    quatCarousel.copy(dummy.quaternion);

    // Carousel Scale
    const scaleFactor = 1.3;
    const cScaleVal = (isHero ? 1.0 : 0.6) * scaleFactor;
    const carouselScaleVec = new THREE.Vector3(cScaleVal, cScaleVal, cScaleVal);


    // --- 3. BLEND STATES ---
    // Use wishProgress directly to interpolate. 
    // This ensures that as soon as Reset is clicked (progress < 1), 
    // the photo starts moving towards the tree immediately.
    const t = wishProgress;

    targetPos.lerpVectors(vec3Tree, vec3Carousel, t);
    targetScale.lerpVectors(treeScaleVec, carouselScaleVec, t);
    targetQuat.copy(quatTree).slerp(quatCarousel, t);


    // --- 4. APPLY TO MESH ---
    // Increased lerp factor from 0.1 to 0.25 for snappier response to state changes.
    // This reduces the "lag" feel when the hero photo needs to return.
    const responsiveness = 0.25; 

    meshRef.current.position.lerp(targetPos, responsiveness);
    meshRef.current.scale.lerp(targetScale, responsiveness);
    meshRef.current.quaternion.slerp(targetQuat, responsiveness);

    if (cardMaterialRef.current) {
       cardMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(0.0, 0.2, wishProgress);
    }
  });

  return (
    <group ref={meshRef}>
      {/* 1. PHYSICAL CARD BODY (Back/Frame) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameWidth, frameHeight, CARD_THICKNESS]} />
        <meshStandardMaterial 
          ref={cardMaterialRef}
          color="#E0D6C2" /* Matte Khaki/Paper color */
          roughness={1.0} /* Fully Matte, no reflections */
          metalness={0.0} 
          envMapIntensity={0}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>

      {/* 2. GLOSSY PHOTO SURFACE (Front Image) */}
      <mesh position={[0, imageYOffset, CARD_THICKNESS / 2 + 0.001]}>
        <planeGeometry args={[imgWidth, imgHeight]} />
        <meshStandardMaterial 
          ref={photoMaterialRef}
          map={texture} 
          roughness={0.2} // Decreased roughness to 0.2 for clearer, semi-glossy look
          metalness={0.0} // Keep as non-metal
          envMapIntensity={0.9} // Increased slightly to 0.9 for better visibility/clarity without washing out
          transparent={false}
          side={THREE.FrontSide}
        />
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