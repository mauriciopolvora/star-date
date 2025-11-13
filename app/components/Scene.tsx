"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ControlsUI } from "./ControlsUI";
import type { SelectedStarInfo } from "./ControlsUI";
import { Earth } from "./Earth";
import { StarField } from "./StarField";

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;
const BIRTHDAY_TOLERANCE_YEARS = 0.75;

/**
 * Main 3D scene content with stars, Earth, camera, and post-processing
 */
function SceneContent({
  autoRotate,
  starBrightness,
  onControlsReady,
  onCameraDistanceChange,
  starsLoaded,
  onStarsLoaded,
  onStarSelected,
  selectedStarIndex,
  birthdayAgeYears,
  birthdayAgeTolerance,
  onBirthdayMatchesChange,
}: {
  autoRotate: boolean;
  starBrightness: number;
  onControlsReady: (controls: OrbitControlsImpl) => void;
  onCameraDistanceChange: (distance: number) => void;
  starsLoaded: boolean;
  onStarsLoaded: () => void;
  onStarSelected: (star: SelectedStarInfo | null) => void;
  selectedStarIndex: number | null;
  birthdayAgeYears: number | null;
  birthdayAgeTolerance: number;
  onBirthdayMatchesChange: (stars: SelectedStarInfo[]) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const lastDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      onControlsReady(controls);
      const distance = controls.getDistance();
      lastDistanceRef.current = distance;
      onCameraDistanceChange(distance);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const controls = controlsRef.current;
      if (!controls) {
        return;
      }
      onControlsReady(controls);
      const distance = controls.getDistance();
      lastDistanceRef.current = distance;
      onCameraDistanceChange(distance);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [onControlsReady, onCameraDistanceChange]);

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
            const distance = controlsRef.current.getDistance();
            if (
              lastDistanceRef.current == null ||
              Math.abs(lastDistanceRef.current - distance) > 0.5
            ) {
              lastDistanceRef.current = distance;
              onCameraDistanceChange(distance);
            }
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
        birthdayAgeYears={birthdayAgeYears}
        birthdayAgeTolerance={birthdayAgeTolerance}
        onBirthdayMatchesChange={onBirthdayMatchesChange}
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
  const [cameraDistance, setCameraDistance] = useState(50);
  const [birthdayValue, setBirthdayValue] = useState<string>("");
  const [birthdayMatches, setBirthdayMatches] = useState<SelectedStarInfo[]>([]);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const handleStarSelected = useCallback(
    (star: SelectedStarInfo | null) => {
      setSelectedStar(star);
    },
    [],
  );
  const handleControlsReady = useCallback((controls: OrbitControlsImpl) => {
    controlsRef.current = controls;
  }, []);
  const handleCameraDistanceChange = useCallback((distance: number) => {
    setCameraDistance((previous) =>
      Math.abs(previous - distance) > 0.5 ? distance : previous,
    );
  }, []);
  const effectiveStarBrightness = useMemo(() => {
    const baselineDistance = 50;
    const safeDistance = Math.max(cameraDistance, baselineDistance);
    const multiplier = Math.min(
      (safeDistance / baselineDistance) ** 0.6,
      100,
    );
    return starBrightness * multiplier;
  }, [cameraDistance, starBrightness]);
  const selectedStarColorText = selectedStar
    ? `rgb(${selectedStar.colorRGB
        .map((channel) => Math.round(channel * 255))
        .join(",")})`
    : "";
  const selectedStarColorStyle = selectedStar
    ? { backgroundColor: selectedStarColorText }
    : undefined;
  const birthdayDate = useMemo(() => {
    if (!birthdayValue) {
      return null;
    }
    const parts = birthdayValue.split("-");
    if (parts.length !== 3) {
      return null;
    }
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }, [birthdayValue]);
  const birthdayAgeYears = useMemo(() => {
    if (!birthdayDate) {
      return null;
    }
    const now = Date.now();
    const diffMs = now - birthdayDate.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) {
      return null;
    }
    return diffMs / MS_PER_YEAR;
  }, [birthdayDate]);
  const handleBirthdayChange = useCallback((value: string) => {
    setBirthdayValue(value);
    setBirthdayMatches([]);
  }, []);
  const handleBirthdayMatches = useCallback((matches: SelectedStarInfo[]) => {
    setBirthdayMatches(matches);
  }, []);
  const handleClearBirthday = useCallback(() => {
    setBirthdayValue("");
    setBirthdayMatches([]);
  }, []);

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
          starBrightness={effectiveStarBrightness}
          onControlsReady={handleControlsReady}
          onCameraDistanceChange={handleCameraDistanceChange}
          starsLoaded={starsLoaded}
          onStarsLoaded={() => setStarsLoaded(true)}
          onStarSelected={handleStarSelected}
          selectedStarIndex={selectedStar ? selectedStar.index : null}
          birthdayAgeYears={birthdayAgeYears}
          birthdayAgeTolerance={BIRTHDAY_TOLERANCE_YEARS}
          onBirthdayMatchesChange={handleBirthdayMatches}
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
        birthdayValue={birthdayValue}
        onBirthdayChange={handleBirthdayChange}
        onClearBirthday={handleClearBirthday}
        birthdayAgeYears={birthdayAgeYears}
        matchingStarCount={birthdayMatches.length}
        birthdayToleranceYears={BIRTHDAY_TOLERANCE_YEARS}
      />
    </>
  );
}
