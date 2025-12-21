
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS, TREE_HEIGHT, TREE_RADIUS } from '../constants';

interface DecorationsProps {
  wishProgress: number;
}

const Decorations: React.FC<DecorationsProps> = ({ wishProgress }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ribbonRef = useRef<THREE.Points>(null);
  const ribbonMatRef = useRef<THREE.PointsMaterial>(null);

  const ornaments = useMemo(() => {
    const items = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
      const h = Math.random() * 0.9 + 0.05;
      const radiusAtH = (1 - h) * TREE_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const r = radiusAtH * 0.95;
      const isBox = Math.random() > 0.6;
      const scale = 0.1 + Math.random() * 0.1;

      // Original Tree Pos
      const ox = Math.cos(angle) * r;
      const oy = h * TREE_HEIGHT - TREE_HEIGHT / 2;
      const oz = Math.sin(angle) * r;

      // Background Sphere Pos - Match Particle Sphere Radius (~20)
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const sr = 18 + Math.random() * 4;
      const bx = sr * Math.sin(phi) * Math.cos(theta);
      const by = sr * Math.sin(phi) * Math.sin(theta);
      const bz = sr * Math.cos(phi);

      items.push({
        orig: new THREE.Vector3(ox, oy, oz),
        back: new THREE.Vector3(bx, by, bz),
        color: Math.random() > 0.5 ? COLORS.ruby : COLORS.gold,
        isBox,
        scale: isBox ? scale * 1.4 : scale,
      });
    }
    return items;
  }, []);

  const ribbonPoints = useMemo(() => {
    const pts = [];
    const loops = 8;
    const pointsPerLoop = 200;
    for (let i = 0; i < loops * pointsPerLoop; i++) {
      const t = i / (loops * pointsPerLoop);
      const h = t;
      const radiusAtH = (1 - h) * TREE_RADIUS;
      const angle = t * Math.PI * 2 * loops;
      const r = radiusAtH * 1.05;
      
      const ox = Math.cos(angle) * r;
      const oy = h * TREE_HEIGHT - TREE_HEIGHT / 2;
      const oz = Math.sin(angle) * r;

      // Scatter ribbon points
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const sr = 19;
      const bx = sr * Math.sin(phi) * Math.cos(theta);
      const by = sr * Math.sin(phi) * Math.sin(theta);
      const bz = sr * Math.cos(phi);

      pts.push({ orig: new THREE.Vector3(ox, oy, oz), back: new THREE.Vector3(bx, by, bz) });
    }
    return pts;
  }, []);

  const ribbonPosArray = useMemo(() => new Float32Array(ribbonPoints.length * 3), [ribbonPoints]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (0.1 + wishProgress * 0.15);
      
      groupRef.current.children.forEach((child, i) => {
        const data = ornaments[i];
        if (data) {
          child.position.lerpVectors(data.orig, data.back, wishProgress);
          child.scale.setScalar(data.scale * (1 - wishProgress * 0.5));
        }
      });
    }
    if (ribbonRef.current) {
      ribbonRef.current.rotation.y += delta * 0.2;
      const posAttr = ribbonRef.current.geometry.attributes.position;
      ribbonPoints.forEach((pt, i) => {
        const currentPos = new THREE.Vector3().lerpVectors(pt.orig, pt.back, wishProgress);
        posAttr.array[i * 3] = currentPos.x;
        posAttr.array[i * 3 + 1] = currentPos.y;
        posAttr.array[i * 3 + 2] = currentPos.z;
      });
      posAttr.needsUpdate = true;

      if (ribbonMatRef.current) {
          ribbonMatRef.current.opacity = THREE.MathUtils.lerp(0.6, 0.2, wishProgress);
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {ornaments.map((orn, i) => (
          <group key={i}>
            {orn.isBox ? (
              <>
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial 
                    color={COLORS.ruby} 
                    metalness={0.7} 
                    roughness={0.2} 
                    emissive={COLORS.ruby} 
                    emissiveIntensity={0.2} 
                    transparent
                    opacity={THREE.MathUtils.lerp(1, 0.3, wishProgress)}
                  />
                </mesh>
                <mesh scale={[1.1, 0.2, 1.1]}>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} transparent opacity={THREE.MathUtils.lerp(1, 0.3, wishProgress)} />
                </mesh>
              </>
            ) : (
              <mesh>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial 
                    color={orn.color} 
                    metalness={0.9} 
                    roughness={0.1} 
                    emissive={orn.color} 
                    emissiveIntensity={0.3} 
                    transparent
                    opacity={THREE.MathUtils.lerp(1, 0.3, wishProgress)}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>

      <points ref={ribbonRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={ribbonPoints.length}
            array={ribbonPosArray}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={ribbonMatRef}
          size={0.05}
          color={COLORS.goldAmber}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Star Top logic */}
      <mesh 
        position={[0, TREE_HEIGHT / 2 + 0.5, 0]} 
        scale={0.8 * (1 - wishProgress)}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
            color={COLORS.gold} 
            emissive={COLORS.gold} 
            emissiveIntensity={2} 
            metalness={1} 
            roughness={0} 
            transparent
            opacity={1 - wishProgress}
        />
      </mesh>
    </>
  );
};

export default Decorations;
