"use client";

import { useState } from "react";

/**
 * UI controls panel for adjusting camera and scene settings
 */
interface ControlsUIProps {
  onResetCamera?: () => void;
  onToggleAutoRotate?: () => void;
  onAdjustStarBrightness?: (value: number) => void;
  autoRotateEnabled?: boolean;
}

export function ControlsUI({
  onResetCamera,
  onToggleAutoRotate,
  onAdjustStarBrightness,
  autoRotateEnabled = true,
}: ControlsUIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [brightness, setBrightness] = useState(200);

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10);
    setBrightness(value);
    onAdjustStarBrightness?.(value / 100);
  };

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
              Star Brightness: {brightness}%
            </label>
            <input
              id="brightness"
              type="range"
              min="10"
              max="1000"
              value={brightness}
              onChange={handleBrightnessChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

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
