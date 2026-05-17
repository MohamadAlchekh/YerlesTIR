import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import * as THREE from 'three';

const PREDEFINED_COLORS = [
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#fbbf24', // amber-400
  '#34d399', // emerald-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
  '#e879f9', // fuchsia-400
  '#a3e635', // lime-400
  '#2dd4bf', // teal-400
  '#818cf8'  // indigo-400
];

const generateColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PREDEFINED_COLORS[Math.abs(hash) % PREDEFINED_COLORS.length];
};

let fragileTextureCache = null;

const getFragileTexture = () => {
  if (fragileTextureCache) return fragileTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Background (White Sticker)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Red Border
  ctx.strokeStyle = '#e32526';
  ctx.lineWidth = 24;
  ctx.strokeRect(24, 24, 464, 464);

  // Text "DİKKAT KIRILIR"
  ctx.fillStyle = '#e32526';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 64px "Arial Black", Arial, sans-serif';
  ctx.fillText('DİKKAT', 256, 110);
  ctx.fillText('KIRILIR', 256, 180);

  // Glass Icon
  ctx.save();
  ctx.translate(256, 260); 
  ctx.fillStyle = '#e32526';
  
  // Cup
  ctx.beginPath();
  ctx.moveTo(-70, -40);
  ctx.lineTo(70, -40);
  ctx.lineTo(70, 20);
  ctx.arc(0, 20, 70, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();

  // Stem
  ctx.fillRect(-10, 90, 20, 50);

  // Base
  ctx.fillRect(-60, 140, 120, 15);

  // Crack (Lightning bolt cutout)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(20, -40);
  ctx.lineTo(-5, 20);
  ctx.lineTo(15, 20);
  ctx.lineTo(-10, 70);
  ctx.lineTo(5, 30);
  ctx.lineTo(-15, 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Bottom Text
  ctx.fillStyle = '#e32526';
  ctx.font = '400 52px Arial, sans-serif';
  ctx.fillText('FRAGILE', 256, 450);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  fragileTextureCache = texture;
  return texture;
};

const AnimatedBox = ({ item, isPlaced, target, initial, isAnimating, isPlaying, playbackSpeed = 1, onComplete }) => {
  const meshRef = useRef();
  const completedRef = useRef(false);
  const [position, setPosition] = useState(initial);
  
  useEffect(() => {
    if (!isAnimating) {
      setPosition(isPlaced ? target : initial);
      if (meshRef.current) meshRef.current.position.set(...(isPlaced ? target : initial));
    }
    if (isAnimating) {
      completedRef.current = false;
    }
  }, [isPlaced, target, initial, isAnimating]);

  useFrame((state, delta) => {
    if (!isAnimating || !isPlaying || !meshRef.current) return;
    
    const safeDelta = Math.min(delta, 0.1); 
    const step = 4 * safeDelta * playbackSpeed; 
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, target[0], step);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, target[1], step);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, target[2], step);
    
    const dist = Math.sqrt(
      Math.pow(target[0] - meshRef.current.position.x, 2) +
      Math.pow(target[1] - meshRef.current.position.y, 2) +
      Math.pow(target[2] - meshRef.current.position.z, 2)
    );
    
    if (dist < 0.05 || (playbackSpeed > 2 && dist < 0.2)) {
      meshRef.current.position.set(...target);
      setPosition(target);
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }
  });

  const color = generateColor(item.name);
  const isFragile = item.name.toLowerCase().includes('kırıl');
  
  const width = item.placedW * 0.01 || item.w * 0.01;
  const height = item.placedH * 0.01 || item.h * 0.01;
  const depth = item.placedD * 0.01 || item.d * 0.01;

  // Font size calculation for fragile text
  const sizeZ = Math.min(width, height) * 0.7;
  const sizeX = Math.min(depth, height) * 0.7;

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      <Edges scale={1} threshold={15} color="#ffffff" />
      
      {isFragile && (
        <>
          <mesh position={[0, 0, depth / 2 + 0.001]}>
            <planeGeometry args={[sizeZ, sizeZ]} />
            <meshBasicMaterial map={getFragileTexture()} transparent depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, -depth / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[sizeZ, sizeZ]} />
            <meshBasicMaterial map={getFragileTexture()} transparent depthWrite={false} />
          </mesh>
          <mesh position={[width / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[sizeX, sizeX]} />
            <meshBasicMaterial map={getFragileTexture()} transparent depthWrite={false} />
          </mesh>
          <mesh position={[-width / 2 - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[sizeX, sizeX]} />
            <meshBasicMaterial map={getFragileTexture()} transparent depthWrite={false} />
          </mesh>
        </>
      )}
    </mesh>
  );
};

const Wheel = ({ position }) => (
  <group position={position}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.4, 0.4, 0.5, 32]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[(position[0] < 1 ? -0.26 : 0.26), 0, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
      <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.2} />
    </mesh>
  </group>
);

const TruckBody = ({ dims }) => {
  const scale = 0.01;
  const cw = dims.w * scale;
  const cd = dims.d * scale;

  return (
    <group>
      {/* Dorse Şasisi */}
      <mesh position={[cw / 2, -0.15, cd / 2]}>
        <boxGeometry args={[cw + 0.2, 0.3, cd]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Tır Kupası (Cabin) - Konteynerin önünde (Z < 0) */}
      <group position={[cw / 2, 1.2, -1.5]}>
        {/* Alt Gövde */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[cw + 0.2, 1.4, 2.5]} />
          <meshStandardMaterial color="#0284c7" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Camlar ve Tavan */}
        <mesh position={[0, 0.7, -0.2]}>
          <boxGeometry args={[cw - 0.2, 1.2, 1.8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Farlar */}
        <mesh position={[-cw/2 + 0.3, -0.8, -1.26]}>
          <boxGeometry args={[0.4, 0.2, 0.1]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
        </mesh>
        <mesh position={[cw/2 - 0.3, -0.8, -1.26]}>
          <boxGeometry args={[0.4, 0.2, 0.1]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={2} />
        </mesh>
        {/* Izgara */}
        <mesh position={[0, -0.5, -1.26]}>
          <boxGeometry args={[1.2, 0.6, 0.1]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      </group>

      {/* Tekerlekler */}
      {/* Kupa Altı */}
      <Wheel position={[-0.1, -0.4, -2]} />
      <Wheel position={[cw + 0.1, -0.4, -2]} />
      
      {/* Dorse Altı Arka Tekerlekler */}
      <Wheel position={[-0.1, -0.4, cd * 0.75]} />
      <Wheel position={[cw + 0.1, -0.4, cd * 0.75]} />
      <Wheel position={[-0.1, -0.4, cd * 0.9]} />
      <Wheel position={[cw + 0.1, -0.4, cd * 0.9]} />
    </group>
  );
};

const ContainerBox = ({ dims }) => {
  const scale = 0.01;
  const w = dims.w * scale;
  const h = dims.h * scale;
  const d = dims.d * scale;
  
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;

  return (
    <group position={[x, y, z]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.2} side={THREE.DoubleSide} />
        <Edges scale={1} threshold={15} color="#ffffff" />
      </mesh>
      <gridHelper args={[Math.max(w, d), 10, '#ffffff', '#ffffff']} position={[0, -h/2 + 0.01, 0]} material-opacity={0.15} material-transparent />
    </group>
  );
};

export default function Scene3D({ items, containerDims, packResult, animatingIndex, onAnimationComplete, isPlaying, playbackSpeed = 1 }) {
  const container = containerDims;
  const scale = 0.01;
  const cw = container.w * scale;
  const ch = container.h * scale;
  const cd = container.d * scale;
  
  const cx = cw / 2;
  const cy = ch / 2;
  const cz = cd / 2;

  const renderItems = [];
  
  if (packResult) {
    packResult.placed.forEach((item, index) => {
      const w = item.placedW * scale;
      const h = item.placedH * scale;
      const d = item.placedD * scale;
      
      // Convert corner-based position to center-based position before rendering
      const centerX = item.x + item.placedW / 2;
      const centerY = item.y + item.placedH / 2;
      const centerZ = item.z + item.placedD / 2;
      
      // Apply these center values to the Three.js mesh position (scaled)
      const target = [
        centerX * scale,
        centerY * scale,
        centerZ * scale
      ];
      
      // Kutu yerleşimi: Sağlı sollu ve 8'erli (toplam 16) sütunlar halinde
      const side = index % 2 === 0 ? -1 : 1;
      const rowIndex = Math.floor(index / 2);
      const col = rowIndex % 8;
      const rowZ = Math.floor(rowIndex / 8);
      
      const xPos = side === -1 ? -1.5 - col * 1.5 : cw + 1.5 + col * 1.5;

      const initial = [
        xPos,
        h / 2,
        rowZ * 1.5
      ];

      const isPlaced = animatingIndex === -1 || index < animatingIndex;
      const isAnimating = index === animatingIndex;

      renderItems.push({
        key: item.id,
        item,
        isPlaced,
        target,
        initial,
        isAnimating,
      });
    });

    const maxPlacedRowZ = Math.ceil((packResult.placed.length / 2) / 8);
    const unplacedOffsetZ = (maxPlacedRowZ + 2) * 1.5;

    packResult.unplaced.forEach((item, index) => {
      const h = item.h * scale;
      const side = index % 2 === 0 ? -1 : 1;
      const rowIndex = Math.floor(index / 2);
      const col = rowIndex % 8;
      const rowZ = Math.floor(rowIndex / 8);

      const xPos = side === -1 ? -1.5 - col * 1.5 : cw + 1.5 + col * 1.5;

      const pos = [
        xPos,
        h / 2,
        unplacedOffsetZ + rowZ * 1.5
      ];

      renderItems.push({
        key: item.id,
        item,
        isPlaced: false,
        target: pos,
        initial: pos,
        isAnimating: false
      });
    });

  } else {
    items.forEach((item, index) => {
      const h = item.h * scale;
      const side = index % 2 === 0 ? -1 : 1;
      const rowIndex = Math.floor(index / 2);
      const col = rowIndex % 8;
      const rowZ = Math.floor(rowIndex / 8);

      const xPos = side === -1 ? -1.5 - col * 1.5 : cw + 1.5 + col * 1.5;

      const pos = [
        xPos,
        h / 2,
        rowZ * 1.5
      ];

      renderItems.push({
        key: item.id,
        item,
        isPlaced: false,
        target: pos,
        initial: pos,
        isAnimating: false
      });
    });
  }

  return (
    <Canvas camera={{ position: [cx + 10, cy + 8, cd + 8], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 20, 10]} intensity={2} />
      
      {/* Tır (Dorse + Kupa + Tekerlekler) */}
      <TruckBody dims={container} />
      
      {/* Konteyner */}
      <ContainerBox dims={container} />
      
      {/* Zemin */}
      <mesh position={[cx, -0.8, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <gridHelper args={[50, 50, '#475569', '#1e293b']} position={[cx, -0.79, cz]} />

      {renderItems.map((data) => (
        <AnimatedBox 
          key={data.key}
          item={data.item}
          isPlaced={data.isPlaced}
          target={data.target}
          initial={data.initial}
          isAnimating={data.isAnimating}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onComplete={onAnimationComplete}
        />
      ))}
      
      <OrbitControls target={[cx, cy, cz]} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
