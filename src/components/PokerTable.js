'use client'; // Required because Three.js runs in the browser

import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

// Oval "kidney table" felt, like a PokerStars cash-game table.
// A circular geometry is stretched on the X axis so it reads as an
// elongated oval rather than a perfectly round table.
const OVAL_STRETCH = 1.55;

function TableSurface() {
  return (
    <group position={[0, -1, 0]} scale={[OVAL_STRETCH, 1, 1]}>
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

/**
 * Keeps the whole oval table framed in view no matter the screen shape.
 * Portrait phones need the camera pulled back and angled down more so the
 * wide oval doesn't get clipped by the narrow viewport; wide desktop
 * screens can sit closer with a tighter fov.
 */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  const frame = useRef();

  useEffect(() => {
    const aspect = size.width / size.height;

    let fov;
    let posY;
    let posZ;

    if (aspect < 0.7) {
      // Narrow phone portrait
      fov = 62;
      posY = 8.5;
      posZ = 12.5;
    } else if (aspect < 1) {
      // Phone / small tablet portrait
      fov = 56;
      posY = 7.5;
      posZ = 11;
    } else if (aspect < 1.4) {
      // Tablet / square-ish window
      fov = 50;
      posY = 6.6;
      posZ = 9.5;
    } else {
      // Desktop landscape
      fov = 45;
      posY = 6;
      posZ = 8.5;
    }

    // Mutating the three.js camera object in place is the standard
    // react-three-fiber pattern (it's a Three.js instance, not React state).
    // eslint-disable-next-line react-hooks/immutability
    camera.fov = fov;
    camera.position.set(0, posY, posZ);
    camera.lookAt(0, -0.6, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return <group ref={frame} />;
}

export default function PokerTable() {
  return (
    <div className="w-full h-full absolute top-0 left-0 -z-10 bg-[#06140e]">
      <Canvas shadows camera={{ position: [0, 6, 8.5], fov: 45 }}>
        <ResponsiveCamera />
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
