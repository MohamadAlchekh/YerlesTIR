import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges, Text } from '@react-three/drei';
import * as THREE from 'three';
import { CONTAINERS } from '../utils/binPacking';
import { getCargoVisual } from '../utils/cargoMetadata';

const createWineGlassShape = (radius) => {
  const bowlWidth = radius * 0.28;
  const bowlHeight = radius * 0.38;
  const stemWidth = radius * 0.045;
  const stemHeight = radius * 0.2;
  const baseWidth = radius * 0.22;
  const baseHeight = radius * 0.04;

  const shape = new THREE.Shape();
  shape.moveTo(-bowlWidth, bowlHeight * 0.92);
  shape.quadraticCurveTo(-bowlWidth * 0.95, bowlHeight * 0.15, -bowlWidth * 0.42, -bowlHeight * 0.18);
  shape.lineTo(-stemWidth, -bowlHeight * 0.42);
  shape.lineTo(-stemWidth, -bowlHeight * 0.42 - stemHeight);
  shape.lineTo(-baseWidth, -bowlHeight * 0.42 - stemHeight - baseHeight);
  shape.lineTo(baseWidth, -bowlHeight * 0.42 - stemHeight - baseHeight);
  shape.lineTo(stemWidth, -bowlHeight * 0.42 - stemHeight);
  shape.lineTo(stemWidth, -bowlHeight * 0.42);
  shape.lineTo(bowlWidth * 0.42, -bowlHeight * 0.18);
  shape.quadraticCurveTo(bowlWidth * 0.95, bowlHeight * 0.15, bowlWidth, bowlHeight * 0.92);
  shape.lineTo(-bowlWidth, bowlHeight * 0.92);

  return shape;
};

const createBoltShape = (radius) => {
  const shape = new THREE.Shape();
  shape.moveTo(radius * 0.03, radius * 0.22);
  shape.lineTo(-radius * 0.04, radius * 0.05);
  shape.lineTo(radius * 0.005, radius * 0.05);
  shape.lineTo(-radius * 0.03, -radius * 0.18);
  shape.lineTo(radius * 0.055, -radius * 0.005);
  shape.lineTo(radius * 0.01, -radius * 0.005);
  shape.lineTo(radius * 0.03, radius * 0.22);
  return shape;
};

const FragileSeal = ({ radius }) => {
  const glassShape = createWineGlassShape(radius);
  const boltShape = createBoltShape(radius);

  return (
    <group position={[0, 0.02, -radius * 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[radius * 0.78, 40]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 0.86, radius, 48]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 0.6, radius * 0.68, 48]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-radius * 0.63, 0, 0]}>
        <circleGeometry args={[radius * 0.08, 20]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[radius * 0.63, 0, 0]}>
        <circleGeometry args={[radius * 0.08, 20]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, -radius * 0.02, 0.002]}>
        <shapeGeometry args={[glassShape]} />
        <meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, radius * 0.03, 0.004]}>
        <shapeGeometry args={[boltShape]} />
        <meshStandardMaterial color="#fff7ed" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const FragileMarker = ({ width, height, depth }) => {
  const plateWidth = Math.max(Math.min(width * 0.54, 0.62), 0.2);
  const plateDepth = Math.max(Math.min(depth * 0.34, 0.26), 0.13);
  const borderThickness = Math.max(Math.min(plateWidth * 0.045, 0.025), 0.012);
  const iconSize = Math.min(plateWidth, plateDepth) * 0.34;
  const textSize = Math.max(Math.min(plateWidth * 0.12, 0.072), 0.038);
  const arrowWidth = Math.max(iconSize * 0.18, 0.02);
  const arrowHeight = Math.max(iconSize * 0.26, 0.03);
  const showText = plateWidth >= 0.24;
  const sealRadius = Math.max(Math.min(Math.min(plateWidth, plateDepth) * 0.26, 0.05), 0.028);

  return (
    <group position={[0, height / 2 + 0.018, 0]}>
      <mesh>
        <boxGeometry args={[plateWidth, 0.016, plateDepth]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.009, plateDepth / 2 - borderThickness / 2]}>
        <boxGeometry args={[plateWidth, 0.008, borderThickness]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.009, -plateDepth / 2 + borderThickness / 2]}>
        <boxGeometry args={[plateWidth, 0.008, borderThickness]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[plateWidth / 2 - borderThickness / 2, 0.009, 0]}>
        <boxGeometry args={[borderThickness, 0.008, plateDepth]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[-plateWidth / 2 + borderThickness / 2, 0.009, 0]}>
        <boxGeometry args={[borderThickness, 0.008, plateDepth]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.018, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[iconSize * 0.58, iconSize * 0.58, 0.01, 3]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.16} />
      </mesh>
      <Text
        position={[0, 0.028, 0.022]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={iconSize * 0.5}
        color="#fff7ed"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0015}
        outlineColor="#7c2d12"
      >
        !
      </Text>
      {showText ? (
        <Text
          position={[0, 0.028, -0.008]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={textSize * 0.76}
          color="#9a3412"
          anchorX="center"
          anchorY="middle"
          maxWidth={plateWidth * 0.84}
          outlineWidth={0.001}
          outlineColor="#ffedd5"
        >
          KIRILABİLİR
        </Text>
      ) : null}
      <FragileSeal radius={sealRadius} />
      <mesh position={[-plateWidth * 0.22, 0.018, 0.074]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[arrowWidth, arrowHeight, 0.01]} />
        <meshStandardMaterial color="#9a3412" />
      </mesh>
      <mesh position={[-plateWidth * 0.22, 0.018, 0.095]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[arrowWidth * 0.75, arrowWidth * 0.75, 0.01, 3]} />
        <meshStandardMaterial color="#9a3412" />
      </mesh>
      <mesh position={[plateWidth * 0.22, 0.018, 0.074]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[arrowWidth, arrowHeight, 0.01]} />
        <meshStandardMaterial color="#9a3412" />
      </mesh>
      <mesh position={[plateWidth * 0.22, 0.018, 0.095]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[arrowWidth * 0.75, arrowWidth * 0.75, 0.01, 3]} />
        <meshStandardMaterial color="#9a3412" />
      </mesh>
    </group>
  );
};

const AnimatedBox = ({ item, isPlaced, target, initial, isAnimating, isPlaying, playbackSpeed, onComplete }) => {
  const meshRef = useRef();
  const completionTriggeredRef = useRef(false);
  const [position, setPosition] = useState(initial);
  
  useEffect(() => {
    completionTriggeredRef.current = false;
    if (!isAnimating) {
      setPosition(isPlaced ? target : initial);
      if (meshRef.current) meshRef.current.position.set(...(isPlaced ? target : initial));
    }
  }, [isPlaced, target, initial, isAnimating]);

  useFrame((state, delta) => {
    if (!isAnimating || !isPlaying || !meshRef.current) return;
    
    const step = Math.min(4 * playbackSpeed * delta, 1);
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, target[0], step);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, target[1], step);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, target[2], step);
    
    const dist = Math.sqrt(
      Math.pow(target[0] - meshRef.current.position.x, 2) +
      Math.pow(target[1] - meshRef.current.position.y, 2) +
      Math.pow(target[2] - meshRef.current.position.z, 2)
    );
    
    if (dist < 0.05 && !completionTriggeredRef.current) {
      completionTriggeredRef.current = true;
      meshRef.current.position.set(...target);
      setPosition(target);
      onComplete();
    }
  });

  const width = item.placedW * 0.01 || item.w * 0.01;
  const height = item.placedH * 0.01 || item.h * 0.01;
  const depth = item.placedD * 0.01 || item.d * 0.01;
  const visual = getCargoVisual(item);

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={visual.color}
          emissive={visual.color}
          emissiveIntensity={0.08}
          roughness={0.55}
          metalness={0.08}
        />
        <Edges scale={1} threshold={15} color={visual.edge} />
      </mesh>
      {visual.fragile ? <FragileMarker width={width} height={height} depth={depth} /> : null}
    </group>
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

export default function Scene3D({
  items,
  containerType,
  packResult,
  animatingIndex,
  onAnimationComplete,
  isPlaying,
  playbackSpeed = 1,
}) {
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
          playbackSpeed={playbackSpeed}
          onComplete={onAnimationComplete}
        />
      ))}
      
      <OrbitControls target={[cx, cy, cz]} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  );
}
