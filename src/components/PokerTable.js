'use client'; // Required because Three.js runs in the browser

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function TableSurface() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      {/* A large cylinder for the poker table */}
      <cylinderGeometry args={[5, 5, 0.2, 64]} />
      <meshStandardMaterial 
        color="#076324" 
        roughness={0.9} 
        metalness={0.1} 
      />
    </mesh>
  );
}

export default function PokerTable() {
  return (
    <div className="w-full h-screen absolute top-0 left-0 -z-10 bg-gray-900">
      <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <spotLight 
          position={[0, 10, 0]} 
          angle={0.6} 
          penumbra={0.5} 
          intensity={2} 
          castShadow 
        />
        
        <TableSurface />
        
        {/* Soft studio lighting environment */}
        <Environment preset="studio" />
        
        {/* Allows the user to rotate the camera around the table */}
        <OrbitControls 
          enableZoom={false} 
          maxPolarAngle={Math.PI / 2.2} 
        />
      </Canvas>
    </div>
  );
}