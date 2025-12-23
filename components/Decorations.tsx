/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { COLORS, TREE_HEIGHT, TREE_RADIUS } from '../constants';

interface DecorationsProps {
  wishProgress: number;
}

const Decorations: React.FC<DecorationsProps> = ({ wishProgress }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pearlsGroupRef = useRef<THREE.Group>(null);
  const ribbonPointsRef = useRef<THREE.Points>(null);
  const starRef = useRef<THREE.Mesh>(null);
  
  const scratchVec = useMemo(() => new THREE.Vector3(), []);
  const scratchCamDir = useMemo(() => new THREE.Vector3(), []);
  
  const { camera } = useThree();

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

  // --- Geometry Definitions ---
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.0;
    const innerRadius = 0.4;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const a = (i / (points * 2)) * Math.PI * 2;
      const x = Math.cos(a + Math.PI / 2) * r; 
      const y = Math.sin(a + Math.PI / 2) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    
    const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // --- ORNAMENTS ---
  const ornaments = useMemo(() => {
    const items = [];
    const targetCount = 120; 
    const minDistance = 0.8; 
    let attempts = 0;
    const maxAttempts = 5000;

    while (items.length < targetCount && attempts < maxAttempts) {
      attempts++;
      
      // h is normalized height [0, 1]. 0.9 means top 10% is empty.
      const h = Math.random() * 0.85 + 0.05; 
      if (h > 0.75 && Math.random() > 0.4) continue;

      const radiusAtH = (1 - h) * TREE_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const r = radiusAtH * 0.95; 

      const ox = Math.cos(angle) * r;
      const oy = h * TREE_HEIGHT - TREE_HEIGHT / 2;
      const oz = Math.sin(angle) * r;
      const candidatePos = new THREE.Vector3(ox, oy, oz);

      let tooClose = false;
      for (const existingItem of items) {
          if (candidatePos.distanceTo(existingItem.orig) < minDistance) {
              tooClose = true;
              break;
          }
      }

      if (tooClose) continue;

      const typeRoll = Math.random();
      let type: 'box' | 'sphere' | 'star';
      
      if (typeRoll < 0.25) {
        if (h > 0.8) type = 'sphere'; 
        else type = 'box';
      }
      else if (typeRoll < 0.5) type = 'star'; 
      else type = 'sphere';

      const scaleBase = 0.1 + Math.random() * 0.1;
      let finalScale = scaleBase;
      if (type === 'box') finalScale *= 1.5;
      if (type === 'star') finalScale *= 0.6; 

      const sr = 8 + Math.random() * 12; 
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const bx = sr * Math.sin(phi) * Math.cos(theta);
      const by = sr * Math.sin(phi) * Math.sin(theta); 
      const bz = sr * Math.cos(phi);

      items.push({
        orig: candidatePos,
        back: new THREE.Vector3(bx, by, bz),
        color: Math.random() > 0.5 ? COLORS.ruby : COLORS.gold,
        type,
        scale: finalScale,
      });
    }
    return items;
  }, []);

  // --- FLOATING PEARLS ---
  const pearls = useMemo(() => {
    const items = [];
    const count = 52; 
    
    for (let i = 0; i < count; i++) {
        // Limit h to 0.9 to avoid top area
        let h = Math.random() * 0.9; 

        if (h > 0.75 && Math.random() > 0.3) {
            h = Math.random() * 0.75;
        }

        const radiusAtH = (1 - h) * TREE_RADIUS;
        const offset = 0.2 + Math.random() * 0.5; 
        const r = radiusAtH + offset;
        
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const y = h * TREE_HEIGHT - TREE_HEIGHT / 2;
        const z = Math.sin(angle) * r;
        
        const orig = new THREE.Vector3(x, y, z);
        
        const sr = 10 + Math.random() * 12; 
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const sx = sr * Math.sin(phi) * Math.cos(theta);
        const sy = sr * Math.sin(phi) * Math.sin(theta);
        const sz = sr * Math.cos(phi);
        const back = new THREE.Vector3(sx, sy, sz);

        items.push({
            orig,
            back,
            scale: 0.06 + Math.random() * 0.04, 
            phase: Math.random() * Math.PI * 2, 
        });
    }
    return items;
  }, []);

  // --- RIBBON PARTICLES ---
  const [ribbonPositions, ribbonScatterPositions, ribbonColors] = useMemo(() => {
    const pointsCount = 6000; 
    const loops = 6.5;
    
    const curvePoints = [];
    const colorValues = [];
    const color1 = new THREE.Color(COLORS.gold);
    const color2 = new THREE.Color(COLORS.goldAmber);
    
    for (let i = 0; i < pointsCount; i++) {
      const t = i / pointsCount;
      // Top height is TREE_HEIGHT/2 - 1.0 = 4.0. Tree top is 5.0. This is 1.0 units (10%) clear.
      const h = THREE.MathUtils.lerp(-TREE_HEIGHT/2 + 0.5, TREE_HEIGHT/2 - 1.0, t);
      const normalizedH = (h + TREE_HEIGHT/2) / TREE_HEIGHT;
      const radiusAtH = (1 - normalizedH) * TREE_RADIUS;
      
      const r = radiusAtH + 0.15; 
      
      const angle = t * Math.PI * 2 * loops;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      curvePoints.push(x, h, z);

      // Colors
      const mix = Math.random();
      const c = mix > 0.5 ? color1 : color2;
      colorValues.push(c.r, c.g, c.b, 1.0);
    }

    const scatterPoints = [];
    for (let i = 0; i < pointsCount; i++) {
        const sr = 10 + Math.random() * 15; 
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        const x = sr * Math.sin(phi) * Math.cos(theta);
        const y = sr * Math.sin(phi) * Math.sin(theta);
        const z = sr * Math.cos(phi);
        scatterPoints.push(x, y, z);
    }

    // Fixed: scatterPositions renamed to scatterPoints as defined in the block above
    return [new Float32Array(curvePoints), new Float32Array(scatterPoints), new Float32Array(colorValues)];
  }, []);

  // --- MAIN STAR ---
  const { starOriginalPos, starTargetPos } = useMemo(() => {
    const orig = new THREE.Vector3(0, TREE_HEIGHT / 2 + 0.55, 0);
    const r = 18 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const target = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
    );
    return { starOriginalPos: orig, starTargetPos: target };
  }, []);

  useFrame((state, delta) => {
    const rotationSpeed = THREE.MathUtils.lerp(0.1, 0.02, wishProgress);
    const checkOcclusion = wishProgress > 0.7;
    const camPos = state.camera.position;
    state.camera.getWorldDirection(scratchCamDir);

    // 1. Ornaments Update
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.updateMatrixWorld();

      groupRef.current.children.forEach((child, i) => {
        const data = ornaments[i];
        if (data) {
          child.position.lerpVectors(data.orig, data.back, wishProgress);
          
          const isExtra = i % 2 !== 0; 
          let currentScale = data.scale;

          if (isExtra) {
              currentScale = data.scale * THREE.MathUtils.smoothstep(wishProgress, 0, 0.8);
          }
          
          child.scale.setScalar(currentScale); 
          
          if (data.type === 'box') {
             child.rotation.x = Math.sin(state.clock.elapsedTime + i) * 0.2;
             child.rotation.z = Math.cos(state.clock.elapsedTime + i) * 0.2;
          } else if (data.type === 'star') {
             child.rotation.z += delta * 0.5;
             child.rotation.y += delta * 0.5;
          }

          if (checkOcclusion) {
              scratchVec.copy(child.position).applyMatrix4(groupRef.current!.matrixWorld);
              const dx = scratchVec.x - camPos.x;
              const dy = scratchVec.y - camPos.y;
              const dz = scratchVec.z - camPos.z;
              const distAlong = dx*scratchCamDir.x + dy*scratchCamDir.y + dz*scratchCamDir.z;
              
              let targetOpacity = 1.0;
              if (distAlong > 1.0 && distAlong < 14.0) {
                 const distSq = (dx*dx + dy*dy + dz*dz) - (distAlong*distAlong);
                 if (distSq < 3.0) targetOpacity = 0.0;
              }

              child.traverse((obj) => {
                  if (obj instanceof THREE.Mesh && obj.material) {
                      const mat = obj.material as THREE.MeshStandardMaterial;
                      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
                  }
              });
          }
        }
      });
    }

    // 2. Pearls Update
    if (pearlsGroupRef.current) {
        pearlsGroupRef.current.rotation.y += delta * rotationSpeed;
        pearlsGroupRef.current.updateMatrixWorld();

        pearlsGroupRef.current.children.forEach((child, i) => {
            const data = pearls[i];
            if (data) {
                scratchVec.lerpVectors(data.orig, data.back, wishProgress);
                const bobY = Math.sin(state.clock.elapsedTime * 2.0 + data.phase) * 0.08;
                child.position.set(scratchVec.x, scratchVec.y + bobY, scratchVec.z);
                child.scale.setScalar(data.scale);

                if (checkOcclusion) {
                    const worldPos = child.position.clone();
                    worldPos.applyMatrix4(pearlsGroupRef.current!.matrixWorld);

                    const dx = worldPos.x - camPos.x;
                    const dy = worldPos.y - camPos.y;
                    const dz = worldPos.z - camPos.z;
                    const distAlong = dx*scratchCamDir.x + dy*scratchCamDir.y + dz*scratchCamDir.z;
                    
                    let targetOpacity = 1.0;
                    if (distAlong > 1.0 && distAlong < 14.0) {
                        const distSq = (dx*dx + dy*dy + dz*dz) - (distAlong*distAlong);
                        if (distSq < 3.0) targetOpacity = 0.0;
                    }

                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    if (mat) {
                        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
                    }
                }
            }
        });
    }
    
    // 3. Ribbon Particles Update
    if (ribbonPointsRef.current) {
        ribbonPointsRef.current.rotation.y += delta * rotationSpeed;
        ribbonPointsRef.current.updateMatrixWorld();
        const matrixWorld = ribbonPointsRef.current.matrixWorld;

        const positions = ribbonPointsRef.current.geometry.attributes.position;
        const colors = ribbonPointsRef.current.geometry.attributes.color; 
        const lerpFactor = 0.1;
        
        for (let i = 0; i < positions.count; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            const targetX = ribbonPositions[i3] * (1 - wishProgress) + ribbonScatterPositions[i3] * wishProgress;
            const targetY = ribbonPositions[i3+1] * (1 - wishProgress) + ribbonScatterPositions[i3+1] * wishProgress;
            const targetZ = ribbonPositions[i3+2] * (1 - wishProgress) + ribbonScatterPositions[i3+2] * wishProgress;
            
            positions.array[i3] += (targetX - positions.array[i3]) * lerpFactor;
            positions.array[i3+1] += (targetY - positions.array[i3+1]) * lerpFactor;
            positions.array[i3+2] += (targetZ - positions.array[i3+2]) * lerpFactor;

            let alpha = 1.0;
            if (checkOcclusion && colors) {
               scratchVec.set(positions.array[i3], positions.array[i3+1], positions.array[i3+2]);
               scratchVec.applyMatrix4(matrixWorld);

               const dx = scratchVec.x - camPos.x;
               const dy = scratchVec.y - camPos.y;
               const dz = scratchVec.z - camPos.z;
               const distAlong = dx*scratchCamDir.x + dy*scratchCamDir.y + dz*scratchCamDir.z;

               if (distAlong > 1.0 && distAlong < 14.0) {
                   const distSq = (dx*dx + dy*dy + dz*dz) - (distAlong*distAlong);
                   if (distSq < 3.0) alpha = 0.0;
               }
               colors.array[i4+3] = THREE.MathUtils.lerp(colors.array[i4+3], alpha, 0.1);
            }
         }
         positions.needsUpdate = true;
         if (colors) colors.needsUpdate = true;
    }

    // 4. Main Star Update
    if (starRef.current) {
        starRef.current.rotation.y += delta * rotationSpeed;
        starRef.current.position.lerpVectors(starOriginalPos, starTargetPos, wishProgress);
        const starVisibleScale = THREE.MathUtils.lerp(0.6, 0.0, wishProgress);
        starRef.current.scale.setScalar(starVisibleScale);
        starRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1 * wishProgress;
        const mat = starRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
             const t = state.clock.elapsedTime;
             mat.opacity = THREE.MathUtils.lerp(1.0, 0.0, wishProgress);
             mat.emissiveIntensity = 0.5 + Math.sin(t * 1.5) * 0.2; 
        }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {ornaments.map((orn, i) => (
          <group key={i}>
            {orn.type === 'box' ? (
              <group>
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color={COLORS.ruby} metalness={0.6} roughness={0.2} transparent opacity={1} />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.25, 1.01, 1.01]} />
                  <meshStandardMaterial color={COLORS.gold} metalness={1.0} roughness={0.1} transparent opacity={1} />
                </mesh>
                <mesh>
                  <boxGeometry args={[1.01, 1.01, 0.25]} />
                  <meshStandardMaterial color={COLORS.gold} metalness={1.0} roughness={0.1} transparent opacity={1} />
                </mesh>
              </group>
            ) : orn.type === 'star' ? (
              <mesh geometry={starGeometry}>
                <meshStandardMaterial 
                    color="#FFD700"
                    emissive="#FFA500"
                    emissiveIntensity={0.6}
                    metalness={1.0}
                    roughness={0.1}
                    transparent
                    opacity={1}
                />
              </mesh>
            ) : (
              <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color={orn.color} metalness={0.9} roughness={0.1} envMapIntensity={1.5} transparent opacity={1} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      <group ref={pearlsGroupRef}>
          {pearls.map((pearl, i) => (
              <mesh key={i}>
                  <sphereGeometry args={[1, 32, 32]} />
                  <meshStandardMaterial 
                      color="#FFFFFF" 
                      emissive="#FFFFFF" 
                      emissiveIntensity={4.0} 
                      roughness={0.35} 
                      metalness={0.2} 
                      transparent
                      opacity={1}
                  />
              </mesh>
          ))}
      </group>

      <points ref={ribbonPointsRef}>
          <bufferGeometry>
              <bufferAttribute 
                 attach="attributes-position"
                 count={ribbonPositions.length / 3}
                 array={ribbonPositions.slice()}
                 itemSize={3}
              />
              <bufferAttribute 
                 attach="attributes-color"
                 count={ribbonColors.length / 4}
                 array={ribbonColors}
                 itemSize={4}
              />
          </bufferGeometry>
          <pointsMaterial 
              map={particleTexture || undefined}
              size={0.08}
              transparent
              vertexColors
              opacity={1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              alphaTest={0.01}
          />
      </points>

      <mesh 
        ref={starRef}
        position={starOriginalPos} 
        scale={0.6}
        geometry={starGeometry}
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial 
            color="#FFD700"
            emissive="#FFA500"
            emissiveIntensity={0.6}
            metalness={1.0}
            roughness={0.1}
            envMapIntensity={2.5}
            transparent
            opacity={1}
        />
      </mesh>
    </>
  );
};

export default Decorations;