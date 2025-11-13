"use client";

import { useState, type ChangeEvent } from "react";

export interface SelectedStarInfo {
  index: number;
  id: number | string;
  name: string;
  position: [number, number, number];
  distanceParsec: number;
  distanceLightYears: number;
  luminosity: number;
  colorRGB: [number, number, number];
}

/**
 * UI controls panel for adjusting camera and scene settings
 */
interface ControlsUIProps {
  onResetCamera?: () => void;
  onToggleAutoRotate?: () => void;
  onAdjustStarBrightness?: (value: number) => void;
  autoRotateEnabled?: boolean;
  starBrightness?: number;
  selectedStar?: SelectedStarInfo | null;
  onClearSelectedStar?: () => void;
  birthdayValue?: string;
  onBirthdayChange?: (value: string) => void;
  onClearBirthday?: () => void;
  birthdayAgeYears?: number | null;
  matchingStarCount?: number;
  birthdayToleranceYears?: number;
}

export function ControlsUI({
  onResetCamera,
  onToggleAutoRotate,
  onAdjustStarBrightness,
  autoRotateEnabled = true,
  starBrightness = 1,
  selectedStar = null,
  onClearSelectedStar,
  birthdayValue = "",
  onBirthdayChange,
  onClearBirthday,
  birthdayAgeYears = null,
  matchingStarCount = 0,
  birthdayToleranceYears,
}: ControlsUIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sliderValue = Math.round(starBrightness * 100);
  const selectedStarColorStyle = selectedStar
    ? {
        backgroundColor: `rgb(${selectedStar.colorRGB
          .map((channel) => Math.round(channel * 255))
          .join(",")})`,
      }
    : undefined;
  const selectedStarColorText = selectedStar
    ? `rgb(${selectedStar.colorRGB
        .map((channel) => Math.round(channel * 255))
        .join(",")})`
    : "";

  const handleBrightnessChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    onAdjustStarBrightness?.(value / 100);
  };

  const handleBirthdayInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onBirthdayChange?.(e.target.value);
  };

  const birthdayHelperText = (() => {
    if (!birthdayValue) {
      return "Enter your birthday to reveal stars whose light left in that moment.";
    }
    if (matchingStarCount > 0) {
      return `Found ${matchingStarCount} birthday star${matchingStarCount === 1 ? "" : "s"}.`;
    }
    const tolerance = birthdayToleranceYears ?? 0;
    return `No matches within ±${tolerance.toFixed(1)} light years yet.`;
  })();

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-zinc-900/80 backdrop-blur-sm text-white rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
        aria-label="Toggle controls"
      >
        {isOpen ? "✕" : "☰"} Controls
      </button>

      {/* Controls panel */}
      {isOpen && (
        <div className="fixed top-20 right-4 z-50 w-72 bg-zinc-900/90 backdrop-blur-md text-white rounded-lg border border-zinc-700 p-4 shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 border-b border-zinc-700 pb-2">
            Scene Controls
          </h2>

          {/* Camera Reset */}
          <div className="mb-4">
            <button
              type="button"
              onClick={onResetCamera}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              Reset Camera
            </button>
          </div>

          {/* Auto-rotate toggle */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm">Auto-rotate</span>
            <label className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                checked={autoRotateEnabled}
                onChange={onToggleAutoRotate}
                className="sr-only peer"
              />
              <span className="absolute cursor-pointer inset-0 bg-zinc-700 rounded-full transition-colors peer-checked:bg-blue-600" />
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6" />
            </label>
          </div>

          {/* Star brightness */}
          <div className="mb-4">
            <label htmlFor="brightness" className="text-sm block mb-2">
              Star Brightness: {sliderValue}%
            </label>
            <input
              id="brightness"
              type="range"
              min="10"
              max="6000"
              value={sliderValue}
              onChange={handleBrightnessChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Birthday star search */}
          <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-800/60 p-3">
            <label htmlFor="birthday" className="text-sm block mb-2">
              Birthday Star Finder
            </label>
            <input
              id="birthday"
              type="date"
              value={birthdayValue}
              onChange={handleBirthdayInputChange}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
            <p className="mt-2 text-xs text-zinc-400">{birthdayHelperText}</p>
            {birthdayValue && birthdayAgeYears != null && (
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                <span>Light travel age</span>
                <span>{birthdayAgeYears.toFixed(1)} years</span>
              </div>
            )}
            {birthdayValue && (
              <button
                type="button"
                onClick={() => onClearBirthday?.()}
                className="mt-3 w-full rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
              >
                Clear Birthday
              </button>
            )}
          </div>

          {/* Selected star information */}
          {selectedStar && (
            <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-800/60 p-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
                <span>{selectedStar.name}</span>
                <span>ID {selectedStar.id}</span>
              </div>
              <dl className="mt-2 space-y-1 text-sm text-zinc-200">
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
              <div className="mt-2 rounded bg-zinc-900/60 p-2 text-[11px] leading-relaxed text-zinc-400">
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
              <button
                type="button"
                onClick={() => onClearSelectedStar?.()}
                className="mt-3 w-full rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div className="mt-6 pt-4 border-t border-zinc-700">
            <h3 className="text-xs font-semibold mb-2 text-zinc-400">
              Keyboard Shortcuts
            </h3>
            <ul className="text-xs text-zinc-400 space-y-1">
              <li>• Click + Drag: Rotate</li>
              <li>• Scroll: Zoom</li>
              <li>• Right-click + Drag: Pan</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
