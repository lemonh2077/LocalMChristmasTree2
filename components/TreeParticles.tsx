
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

  const [positions, colors, originalPositions, bgPositions] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const origPos = new Float32Array(PARTICLE_COUNT * 3);
    const bgPos = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 3);
    const colorA = new THREE.Color(COLORS.emerald);
    const colorB = new THREE.Color(COLORS.emeraldBright);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const h = Math.random();
      // Cone shape: Radius decreases as h goes from 0 to 1
      const radiusAtH = (1 - h) * TREE_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      // Volume distribution adjustment
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

      // Outer background sphere (Starry background)
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
      const sr = 20 + Math.random() * 8; 
      bgPos[i * 3] = sr * Math.cos(theta) * Math.sin(phi);
      bgPos[i * 3 + 1] = sr * Math.sin(theta) * Math.sin(phi);
      bgPos[i * 3 + 2] = sr * Math.cos(phi);

      // Color mixing
      const mixRatio = h * 0.7 + (r / radiusAtH) * 0.3 + Math.random() * 0.2;
      const mixedColor = colorA.clone().lerp(colorB, Math.min(mixRatio, 1));
      cols[i * 3] = mixedColor.r;
      cols[i * 3 + 1] = mixedColor.g;
      cols[i * 3 + 2] = mixedColor.b;
    }
    return [pos, cols, origPos, bgPos];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    
    pointsRef.current.rotation.y += delta * (0.1 + wishProgress * 0.15);

    // Optimized loop: reduce object creation inside loop
    const lerpFactor = 0.1; // Smooth transition
    
    // Check if we actually need to update (optimization)
    // Always update for rotation effect? No, rotation is handled by group rotation.
    // We only need to update positions if wishProgress is changing or we are transitioning.
    // But since wishProgress changes continuously during interaction, we run it.
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Linear interpolation manually for speed
      const targetX = originalPositions[i3] * (1 - wishProgress) + bgPositions[i3] * wishProgress;
      const targetY = originalPositions[i3 + 1] * (1 - wishProgress) + bgPositions[i3 + 1] * wishProgress;
      const targetZ = originalPositions[i3 + 2] * (1 - wishProgress) + bgPositions[i3 + 2] * wishProgress;

      // Ease towards target
      const currentX = posAttr.array[i3];
      const currentY = posAttr.array[i3+1];
      const currentZ = posAttr.array[i3+2];

      posAttr.array[i3] = currentX + (targetX - currentX) * lerpFactor;
      posAttr.array[i3 + 1] = currentY + (targetY - currentY) * lerpFactor;
      posAttr.array[i3 + 2] = currentZ + (targetZ - currentZ) * lerpFactor;
    }
    posAttr.needsUpdate = true;

    if (matRef.current) {
        matRef.current.opacity = THREE.MathUtils.lerp(1, 0.7, wishProgress);
        matRef.current.size = THREE.MathUtils.lerp(0.04, 0.06, wishProgress); // Increased size
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.04}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default TreeParticles;
