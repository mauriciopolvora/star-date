"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCallback, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ControlsUI } from "./ControlsUI";
import type { SelectedStarInfo } from "./ControlsUI";
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
  onStarSelected,
  selectedStarIndex,
}: {
  autoRotate: boolean;
  starBrightness: number;
  onControlsReady: (controls: OrbitControlsImpl) => void;
  starsLoaded: boolean;
  onStarsLoaded: () => void;
  onStarSelected: (star: SelectedStarInfo | null) => void;
  selectedStarIndex: number | null;
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
        far={10000000}
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
        maxDistance={100000}
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
        onStarSelected={onStarSelected}
        selectedStarIndex={selectedStarIndex}
      />

      {/* Earth appears after stars are loaded */}
      {starsLoaded && <Earth />}

      {/* Post-processing: bloom effect for star glow */}
      <EffectComposer>
        <Bloom
          intensity={1.2 * starBrightness}
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
  const [starBrightness, setStarBrightness] = useState<number>(4);
  const [starsLoaded, setStarsLoaded] = useState(false);
  const [selectedStar, setSelectedStar] =
    useState<SelectedStarInfo | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const handleStarSelected = useCallback(
    (star: SelectedStarInfo | null) => {
      setSelectedStar(star);
    },
    [],
  );
  const selectedStarColorText = selectedStar
    ? `rgb(${selectedStar.colorRGB
        .map((channel) => Math.round(channel * 255))
        .join(",")})`
    : "";
  const selectedStarColorStyle = selectedStar
    ? { backgroundColor: selectedStarColorText }
    : undefined;

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
          onStarSelected={handleStarSelected}
          selectedStarIndex={selectedStar ? selectedStar.index : null}
        />
      </Canvas>

      {selectedStar && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-40 max-w-xs rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-white backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
            <span>{selectedStar.name}</span>
            <span>ID {selectedStar.id}</span>
          </div>
          <dl className="mt-3 space-y-1 text-zinc-200">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Distance (pc)</dt>
              <dd>{selectedStar.distanceParsec.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Distance (ly)</dt>
              <dd>{selectedStar.distanceLightYears.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Luminosity (N)</dt>
              <dd>{selectedStar.luminosity.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            xyz ≈ {selectedStar.position[0].toFixed(2)}, {selectedStar.position[1].toFixed(2)}, {selectedStar.position[2].toFixed(2)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
            <span>Color</span>
            <span
              className="inline-flex h-3 w-3 rounded-full border border-white/40"
              style={selectedStarColorStyle}
            />
            <span className="font-mono text-[10px] text-zinc-500">
              {selectedStarColorText}
            </span>
          </div>
        </div>
      )}

      {/* UI controls overlay */}
      <ControlsUI
        onResetCamera={() => controlsRef.current?.reset()}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onAdjustStarBrightness={setStarBrightness}
        autoRotateEnabled={autoRotate}
        starBrightness={starBrightness}
        selectedStar={selectedStar}
        onClearSelectedStar={() => handleStarSelected(null)}
      />
    </>
  );
}
