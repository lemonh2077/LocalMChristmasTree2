import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PARTICLE_COUNT, TREE_HEIGHT, TREE_RADIUS, COLORS } from '../constants';

interface TreeParticlesProps {
  wishProgress: number;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ wishProgress }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  
  // Scratch vectors for math to avoid GC
  const scratchCamDir = useMemo(() => new THREE.Vector3(), []);
  const scratchPos = useMemo(() => new THREE.Vector3(), []);

  // --- LOCAL ASSET GENERATION ---
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const [positions, colors, originalPositions, bgPositions] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const origPos = new Float32Array(PARTICLE_COUNT * 3);
    const bgPos = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 4);
    
    const colorA = new THREE.Color(COLORS.emerald);
    const colorB = new THREE.Color(COLORS.emeraldBright);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const h = Math.random();
      const radiusAtH = (1 - h) * TREE_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * radiusAtH;

      const x = Math.cos(angle) * r;
      const y = h * TREE_HEIGHT - TREE_HEIGHT / 2;
      const z = Math.sin(angle) * r;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;

      // Outer background sphere
      // REVERTED: Natural surrounding radius (12-30) instead of distant (35-65)
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
      const sr = 12 + Math.random() * 18; 
      
      bgPos[i * 3] = sr * Math.cos(theta) * Math.sin(phi);
      bgPos[i * 3 + 1] = sr * Math.sin(theta) * Math.sin(phi);
      bgPos[i * 3 + 2] = sr * Math.cos(phi);

      // Color mixing
      const mixRatio = h * 0.7 + (r / radiusAtH) * 0.3 + Math.random() * 0.2;
      const mixedColor = colorA.clone().lerp(colorB, Math.min(mixRatio, 1));
      
      cols[i * 4] = mixedColor.r;
      cols[i * 4 + 1] = mixedColor.g;
      cols[i * 4 + 2] = mixedColor.b;
      cols[i * 4 + 3] = 1.0; 
    }
    return [pos, cols, origPos, bgPos];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    
    const rotationSpeed = THREE.MathUtils.lerp(0.1, 0.02, wishProgress);
    pointsRef.current.rotation.y += delta * rotationSpeed;

    const lerpFactor = 0.1;
    
    // Prepare occlusion logic variables
    const camPos = state.camera.position;
    state.camera.getWorldDirection(scratchCamDir);
    const checkOcclusion = wishProgress > 0.7; // Only hide particles when fully exploded/wishing
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      const targetX = originalPositions[i3] * (1 - wishProgress) + bgPositions[i3] * wishProgress;
      const targetY = originalPositions[i3 + 1] * (1 - wishProgress) + bgPositions[i3 + 1] * wishProgress;
      const targetZ = originalPositions[i3 + 2] * (1 - wishProgress) + bgPositions[i3 + 2] * wishProgress;

      const currentX = posAttr.array[i3] + (targetX - posAttr.array[i3]) * lerpFactor;
      const currentY = posAttr.array[i3+1] + (targetY - posAttr.array[i3+1]) * lerpFactor;
      const currentZ = posAttr.array[i3+2] + (targetZ - posAttr.array[i3+2]) * lerpFactor;

      posAttr.array[i3] = currentX;
      posAttr.array[i3 + 1] = currentY;
      posAttr.array[i3 + 2] = currentZ;

      // Base Opacity
      let alpha = 1.0;

      // --- INVISIBILITY TUNNEL LOGIC ---
      if (checkOcclusion) {
         // Vector from camera to particle
         const dx = currentX - camPos.x;
         const dy = currentY - camPos.y;
         const dz = currentZ - camPos.z;
         
         // Project onto camera view direction
         const distAlongView = dx * scratchCamDir.x + dy * scratchCamDir.y + dz * scratchCamDir.z;
         
         // Check if particle is in the "danger zone"
         // 1. Is it in front of the camera? (distAlongView > 1.0)
         // 2. Is it not too far behind the photo? (distAlongView < 14.0)
         // 3. Is it close to the center line of sight? (distSq < radius^2)
         if (distAlongView > 1.0 && distAlongView < 14.0) {
             const distSq = (dx*dx + dy*dy + dz*dz) - (distAlongView * distAlongView);
             // Clear a cylinder of radius ~1.7 around the center line
             if (distSq < 3.0) {
                 alpha = 0.0;
             }
         }
      }

      // Smoothly blend alpha
      colAttr.array[i4 + 3] = THREE.MathUtils.lerp(colAttr.array[i4 + 3], alpha, 0.1);
    }
    
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    if (matRef.current) {
        matRef.current.size = THREE.MathUtils.lerp(0.06, 0.15, wishProgress); 
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 4}
          array={colors}
          itemSize={4}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.06}
        map={particleTexture || undefined}
        vertexColors
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
      />
    </points>
  );
};

export default TreeParticles;