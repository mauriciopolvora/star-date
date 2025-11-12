"use client";

import { useRef } from "react";
import type { Mesh } from "three";

/**
 * Earth sphere at the origin with a basic material
 */
export function Earth() {
  const meshRef = useRef<Mesh>(null);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Earth sphere with modest size relative to parsec scale */}
      <sphereGeometry args={[0.0010, 32, 32]} />
      <meshStandardMaterial
        color="blue"
        emissive="#2c5cdb"
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}
