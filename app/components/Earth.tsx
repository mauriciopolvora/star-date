"use client";

/**
 * Earth sphere at origin with atmospheric glow effect
 */
export function Earth() {
  return (
    <group>
      {/* Main Earth sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 64, 64]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive="#1e3a8a"
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Atmospheric glow layer */}
      <mesh position={[0, 0, 0]} scale={1.15}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.15}
          side={2}
        />
      </mesh>
    </group>
  );
}
