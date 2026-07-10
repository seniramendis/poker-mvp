'use client'; // Required because Three.js runs in the browser

import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

function TableSurface() {
  return (
    <group position={[0, -1, 0]}>
      {/* Wooden rail */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.35, 5.35, 0.28, 64]} />
        <meshStandardMaterial color="#3b2412" roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Gold trim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <torusGeometry args={[5.1, 0.035, 16, 64]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Felt */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[5, 5, 0.2, 64]} />
        <meshStandardMaterial color="#0e4429" roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  );
}

export default function PokerTable() {
  return (
    <div className="w-full h-screen absolute top-0 left-0 -z-10 bg-[#06140e]">
      <Canvas shadows camera={{ position: [0, 6, 8.5], fov: 45 }}>
        <ambientLight intensity={0.35} />
        <spotLight
          position={[0, 10, 1]}
          angle={0.65}
          penumbra={0.6}
          intensity={2.4}
          color="#fff3d6"
          castShadow
        />
        <pointLight position={[-6, 4, -4]} intensity={0.3} color="#3f7fd4" />

        <TableSurface />

        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
