import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { CONTAINERS } from '../utils/binPacking';

const generateColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

const AnimatedBox = ({ item, isPlaced, target, initial, isAnimating, isPlaying, onComplete }) => {
  const meshRef = useRef();
  const [position, setPosition] = useState(initial);
  
  useEffect(() => {
    if (!isAnimating) {
      setPosition(isPlaced ? target : initial);
      if (meshRef.current) meshRef.current.position.set(...(isPlaced ? target : initial));
    }
  }, [isPlaced, target, initial, isAnimating]);

  useFrame((state, delta) => {
    if (!isAnimating || !isPlaying || !meshRef.current) return;
    
    const step = 4 * delta; 
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, target[0], step);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, target[1], step);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, target[2], step);
    
    const dist = Math.sqrt(
      Math.pow(target[0] - meshRef.current.position.x, 2) +
      Math.pow(target[1] - meshRef.current.position.y, 2) +
      Math.pow(target[2] - meshRef.current.position.z, 2)
    );
    
    if (dist < 0.05) {
      meshRef.current.position.set(...target);
      setPosition(target);
      onComplete();
    }
  });

  const color = generateColor(item.name);

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[item.placedW * 0.01 || item.w * 0.01, item.placedH * 0.01 || item.h * 0.01, item.placedD * 0.01 || item.d * 0.01]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
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
        <Edges scale={1} threshold={15} color="#94a3b8" />
      </mesh>
      <gridHelper args={[Math.max(w, d), 10, '#ffffff', '#ffffff']} position={[0, -h/2 + 0.01, 0]} material-opacity={0.15} material-transparent />
    </group>
  );
};

export default function Scene3D({ items, containerType, packResult, animatingIndex, onAnimationComplete, isPlaying }) {
  const container = CONTAINERS[containerType];
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
      
      const target = [
        (item.x * scale) + (w / 2),
        (item.y * scale) + (h / 2),
        (item.z * scale) + (d / 2)
      ];
      
      const initial = [
        -2 - (index % 5) * 1.5,
        h / 2,
        (Math.floor(index / 5) * 1.5)
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

    packResult.unplaced.forEach((item, index) => {
      const h = item.h * scale;
      const pos = [
        cw + 2 + (index % 5) * 1.5,
        h / 2,
        (Math.floor(index / 5) * 1.5)
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
      const pos = [
        -2 - (index % 5) * 1.5,
        h / 2,
        (Math.floor(index / 5) * 1.5)
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      
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
          onComplete={onAnimationComplete}
        />
      ))}
      
      <OrbitControls target={[cx, cy, cz]} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
