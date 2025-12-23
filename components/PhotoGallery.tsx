
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { USER_PHOTOS, TREE_HEIGHT, TREE_RADIUS } from '../constants';

interface PhotoItemProps {
  url: string;
  caption: string;
  index: number;
  wishProgress: number;
  heroIndex: number;
  total: number;
}

const getOptimizedUrl = (url: string) => {
  // 核心修改：如果是本地路径（以 / 开头），直接返回，不走国外代理
  if (url.startsWith('/')) {
    return url;
  }

  try {
    // 只有网络图片（http开头）才走加速
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1024&q=90&output=webp`;
  } catch (e) {
    return url;
  }
};

const PhotoItem: React.FC<PhotoItemProps> = ({ url, caption, index, wishProgress, heroIndex, total }) => {
  const meshRef = useRef<THREE.Group>(null);
  const cardMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const photoMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera, gl } = useThree();
  
  const texture = useTexture(getOptimizedUrl(url));

  // --- Handwritten Caption Texture Generation ---
  const captionTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1024; 
    canvas.height = 256;

    const dateMatch = caption.match(/^(\d{4}\.\d{1,2}\.\d{1,2})\s*(.*)$/);
    const dateText = dateMatch ? dateMatch[1] : '';
    const mainText = dateMatch ? dateMatch[2] : caption;

    const drawText = (fontSize: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4; 
      ctx.globalAlpha = 1.0; 
      
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = '3.5px'; 
      }
      
      const fontStack = '"Ma Shan Zheng", "STXingkai", "Xingkai SC", "Kaiti SC", "STKaiti", "KaiTi", cursive, serif';
      ctx.font = `${fontSize}px ${fontStack}`;
      
      const horizontalPadding = 70; 
      const verticalPadding = 20;
      const maxWidth = canvas.width - horizontalPadding * 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const chars = mainText.split('');
      let line = '';
      const lines = [];

      for (let n = 0; n < chars.length; n++) {
        const testLine = line + chars[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = chars[n];
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const lineHeight = fontSize * 1.5;
      lines.forEach((l, i) => {
        const y = verticalPadding + i * lineHeight;
        ctx.fillText(l, horizontalPadding, y);
        ctx.strokeText(l, horizontalPadding, y); 
      });

      if (dateText) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '1.5px'; 
        ctx.font = `${fontSize * 1.1}px ${fontStack}`;
        ctx.fillText(dateText, canvas.width - horizontalPadding, canvas.height - verticalPadding / 2);
        ctx.strokeText(dateText, canvas.width - horizontalPadding, canvas.height - verticalPadding / 2);
      }

      const totalTextHeight = lines.length * lineHeight + (dateText ? fontSize : 0);
      if (totalTextHeight > canvas.height - verticalPadding && fontSize > 24) {
        return false;
      }
      return true;
    };

    let currentFontSize = 58; 
    while (!drawText(currentFontSize) && currentFontSize > 22) {
      currentFontSize -= 2;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, [caption]);

  const dummy = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.rotation.order = 'YXZ'; 
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
      meshRef.current.rotation.order = 'YXZ';
    }
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture, gl]);

  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  let imgWidth = 1;
  let imgHeight = 1;
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
  const borderBottom = 0.45; 
  const frameWidth = imgWidth + borderSide * 2;
  const frameHeight = imgHeight + borderTop + borderBottom;
  const CARD_THICKNESS = 0.02; 
  const imageYOffset = (borderBottom - borderTop) / 2;
  const textYOffset = -frameHeight / 2 + borderBottom / 2 + 0.01;

  const { originalPos, originalRot, randomSway, treeScale } = useMemo(() => {
    const spiralLoops = 1.5;
    const progress = index / total; 
    const h = 0.35 + progress * 0.55;
    const angle = progress * Math.PI * 2 * spiralLoops;
    const radiusAtH = (1 - h) * TREE_RADIUS;
    const r = radiusAtH + 0.36;
    const x = Math.cos(angle) * r;
    const y = h * TREE_HEIGHT - TREE_HEIGHT / 2;
    const z = Math.sin(angle) * r;
    return {
      originalPos: new THREE.Vector3(x, y, z),
      originalRot: new THREE.Euler(THREE.MathUtils.lerp(-0.15, -0.45, progress) - Math.random() * 0.1, 0, (Math.random() - 0.5) * 0.4),
      treeScale: THREE.MathUtils.lerp(1.2, 0.7, progress) * 0.7 * (0.9 + Math.random() * 0.2),
      randomSway: { speed: 0.5 + Math.random() * 1.5, offset: Math.random() * 100 }
    };
  }, [index, total]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const orbitSpeed = 0.1;
    const angleOffset = -state.clock.getElapsedTime() * orbitSpeed;
    const currentAngle = Math.atan2(originalPos.z, originalPos.x) + angleOffset;
    const rBase = Math.sqrt(originalPos.x * originalPos.x + originalPos.z * originalPos.z);
    vec3Tree.set(Math.cos(currentAngle) * rBase, originalPos.y, Math.sin(currentAngle) * rBase);
    const sway = Math.sin(state.clock.elapsedTime * randomSway.speed + randomSway.offset) * 0.03;
    dummy.rotation.set(originalRot.x, -currentAngle + Math.PI / 2, originalRot.z + sway);
    quatTree.copy(dummy.quaternion);
    const treeScaleVec = dummy.scale.set(treeScale, treeScale, treeScale).clone();

    const isHero = index === heroIndex;
    let offset = index - heroIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    const theta = offset * 0.45;
    const radius = 4.2;
    dummy.position.set(Math.sin(theta) * radius, (isHero ? 0.1 : Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05) + (isHero ? 0.1 : 0), -4.5 - (1 - Math.cos(theta)) * 2.0);
    dummy.position.applyMatrix4(camera.matrixWorld);
    vec3Carousel.copy(dummy.position);
    dummy.lookAt(camera.position);
    quatCarousel.copy(dummy.quaternion);
    const cScaleVal = (isHero ? 1.0 : 0.6) * 1.3;
    const carouselScaleVec = new THREE.Vector3(cScaleVal, cScaleVal, cScaleVal);

    const t = wishProgress;
    targetPos.lerpVectors(vec3Tree, vec3Carousel, t);
    targetScale.lerpVectors(treeScaleVec, carouselScaleVec, t);
    targetQuat.copy(quatTree).slerp(quatCarousel, t);

    meshRef.current.position.lerp(targetPos, 0.25);
    meshRef.current.scale.lerp(targetScale, 0.25);
    meshRef.current.quaternion.slerp(targetQuat, 0.25);

    if (cardMaterialRef.current) {
       // Reduced emissive intensity to prevent blooming over the photo face
       cardMaterialRef.current.emissiveIntensity = 0.4 + wishProgress * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameWidth, frameHeight, CARD_THICKNESS]} />
        <meshStandardMaterial 
          ref={cardMaterialRef}
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.4}
          roughness={0.9} // Higher roughness to reduce sharp reflections
          metalness={0.0} 
        />
      </mesh>

      <mesh position={[0, imageYOffset, CARD_THICKNESS / 2 + 0.001]}>
        <planeGeometry args={[imgWidth, imgHeight]} />
        <meshStandardMaterial 
          ref={photoMaterialRef}
          map={texture} 
          color="#ffffff"
          roughness={1.0} // Maximum roughness to avoid overexposure from direct point lights
          metalness={0.0}
          side={THREE.FrontSide}
          envMapIntensity={0.5} // Lower environment reflection on photos
        />
      </mesh>

      {captionTexture && (
        <mesh 
          position={[0, textYOffset, CARD_THICKNESS / 2 + 0.015]}
          scale={[1, 0.76, 1]} 
        >
          <planeGeometry args={[frameWidth * 0.96, borderBottom * 0.9]} />
          <meshBasicMaterial 
            map={captionTexture}
            transparent={true}
            depthWrite={false}
          />
        </mesh>
      )}
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
      {USER_PHOTOS.map((photoEntry, i) => {
        // 1. 兼容处理：判断 constants.ts 里存的是“字符串”还是“对象”
        // 如果是字符串(我们现在的写法)，直接用；如果是对象，取 .url
        const url = typeof photoEntry === 'string' ? photoEntry : (photoEntry as any).url;
        
        // 2. 默认文案：因为我们 constants.ts 里没有配文字，这里给个默认的日期和祝福
        // 这样 PhotoItem 里的文字渲染逻辑就不会报错
        const caption = typeof photoEntry === 'string' 
          ? `2025.12.25 Memory ${i + 1}` 
          : (photoEntry as any).caption;

        return (
          <PhotoItem 
            key={url + i} 
            url={url}
            caption={caption}
            index={i} 
            wishProgress={wishProgress} 
            heroIndex={heroIndex}
            total={USER_PHOTOS.length}
          />
        );
      })}
    </group>
  );
};

export default PhotoGallery;