"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Earth } from "./Earth";
import { StarField } from "./StarField";


/**
 * Main 3D scene with stars, Earth, camera, controls, and postprocessing
 */
export function Scene() {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
        logarithmicDepthBuffer: true,
        precision: "highp",
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[50, 50, 50]} intensity={0.4} />

      {/* Camera and controls */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 50]}
        near={0.001}
        far={1000}
        fov={70}
      />
      <OrbitControls
        makeDefault
        autoRotate={true}
        autoRotateSpeed={0.3}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={0.1}
        maxDistance={125}
        zoomSpeed={5}
      />

      {/* Scene content */}
      <StarField showDebug={true} />
      <Earth />
    </Canvas>
  );
}
