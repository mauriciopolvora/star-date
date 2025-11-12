"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ControlsUI } from "./ControlsUI";
import { Earth } from "./Earth";
import { StarField } from "./StarField";

/**
 * Main 3D scene content with stars, Earth, camera, and post-processing
 */
function SceneContent({
  autoRotate,
  starBrightness,
  onControlsReady,
  starsLoaded,
  onStarsLoaded,
}: {
  autoRotate: boolean;
  starBrightness?: number;
  onControlsReady: (controls: OrbitControlsImpl) => void;
  starsLoaded: boolean;
  onStarsLoaded: () => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[50, 50, 50]} intensity={0.4} />

      {/* Camera setup */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 50]}
        near={0.001}
        far={1000}
        fov={70}
      />

      {/* Orbit controls for camera movement */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={0.1}
        maxDistance={200}
        onChange={() => {
          if (controlsRef.current) {
            onControlsReady(controlsRef.current);
          }
        }}
      />

      {/* Star field loads first */}
      <StarField
        showDebug={true}
        brightness={starBrightness}
        onLoaded={onStarsLoaded}
      />

      {/* Earth appears after stars are loaded */}
      {starsLoaded && <Earth />}

      {/* Post-processing: bloom effect for star glow */}
      <EffectComposer>
        <Bloom
          intensity={1.2 * (starBrightness ?? 2)}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/**
 * Scene wrapper - manages state for controls and brightness
 */
export function Scene() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [starBrightness, setStarBrightness] = useState<number | undefined>(
    undefined, // Undefined uses StarField's default brightness
  );
  const [starsLoaded, setStarsLoaded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          logarithmicDepthBuffer: true,
          precision: "highp",
        }}
      >
        <SceneContent
          autoRotate={autoRotate}
          starBrightness={starBrightness}
          onControlsReady={(controls) => {
            controlsRef.current = controls;
          }}
          starsLoaded={starsLoaded}
          onStarsLoaded={() => setStarsLoaded(true)}
        />
      </Canvas>

      {/* UI controls overlay */}
      <ControlsUI
        onResetCamera={() => controlsRef.current?.reset()}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onAdjustStarBrightness={setStarBrightness}
        autoRotateEnabled={autoRotate}
      />
    </>
  );
}
