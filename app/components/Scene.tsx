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
 * Scene content with controllable camera
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

      {/* Camera and controls */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 50]}
        near={0.001}
        far={1000}
        fov={70}
      />
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

      {/* Scene content - Load stars first */}
      <StarField
        showDebug={true}
        brightness={starBrightness}
        onLoaded={onStarsLoaded}
      />
      {starsLoaded && <Earth />}

      {/* Post-processing effects */}
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
 * Main 3D scene with stars, Earth, camera, controls, and postprocessing
 */
export function Scene() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [starBrightness, setStarBrightness] = useState<number | undefined>(
    undefined,
  );
  const [starsLoaded, setStarsLoaded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleControlsReady = (controls: OrbitControlsImpl) => {
    controlsRef.current = controls;
  };

  const handleStarsLoaded = () => {
    setStarsLoaded(true);
  };

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
          onControlsReady={handleControlsReady}
          starsLoaded={starsLoaded}
          onStarsLoaded={handleStarsLoaded}
        />
      </Canvas>

      {/* UI Controls */}
      <ControlsUI
        onResetCamera={handleResetCamera}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onAdjustStarBrightness={setStarBrightness}
        autoRotateEnabled={autoRotate}
      />
    </>
  );
}
