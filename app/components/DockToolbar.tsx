"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Calendar, Settings } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useMeasure from "react-use-measure";

import useClickOutside from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils";

const transition = {
  type: "spring" as const,
  bounce: 0.1,
  duration: 0.25,
};

interface DockToolbarProps {
  onResetCamera?: () => void;
  onToggleAutoRotate?: () => void;
  onAdjustStarBrightness?: (value: number) => void;
  autoRotateEnabled?: boolean;
  starBrightness?: number;
  birthdayValue?: string;
  onBirthdayChange?: (value: string) => void;
  onClearBirthday?: () => void;
  birthdayAgeYears?: number | null;
  matchingStarCount?: number;
  birthdayToleranceYears?: number;
}

type DockItemId = "calendar" | "settings";

type DockItem = {
  id: DockItemId;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export function DockToolbar({
  onResetCamera,
  onToggleAutoRotate,
  onAdjustStarBrightness,
  autoRotateEnabled = true,
  starBrightness = 1,
  birthdayValue = "",
  onBirthdayChange,
  onClearBirthday,
  birthdayAgeYears = null,
  matchingStarCount = 0,
  birthdayToleranceYears = 0,
}: DockToolbarProps) {
  const [active, setActive] = useState<DockItemId | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentRef, { height: contentHeight }] = useMeasure();

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setActive(null);
  });

  const sliderValue = Math.round(starBrightness * 100);

  const birthdayHelperText = useMemo(() => {
    if (!birthdayValue) {
      return "Pick a date to find the stars whose light is reaching Earth right now.";
    }
    if (matchingStarCount > 0) {
      return `Found ${matchingStarCount} birthday star${matchingStarCount === 1 ? "" : "s"}.`;
    }
    return `No stars within ±${birthdayToleranceYears.toFixed(1)} light years yet.`;
  }, [birthdayToleranceYears, birthdayValue, matchingStarCount]);

  const handleBrightnessChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isFinite(value)) {
        return;
      }
      onAdjustStarBrightness?.(value / 100);
    },
    [onAdjustStarBrightness],
  );

  const handleDateChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onBirthdayChange?.(event.target.value);
    },
    [onBirthdayChange],
  );

  const items = useMemo<DockItem[]>(
    () => [
      {
        id: "calendar",
        label: "Birthday",
        icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
        content: (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="birthday"
                className="text-xs uppercase tracking-wide text-zinc-400"
              >
                Birthday Star Finder
              </label>
              <input
                id="birthday"
                type="date"
                value={birthdayValue}
                onChange={handleDateChange}
                className="mt-2 w-full rounded-lg border border-zinc-800/70 bg-zinc-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-500 focus:bg-zinc-900"
              />
              <p className="mt-2 text-xs text-zinc-400">{birthdayHelperText}</p>
              {birthdayValue && birthdayAgeYears != null ? (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                  <span>Light travel age</span>
                  <span>{birthdayAgeYears.toFixed(1)} years</span>
                </div>
              ) : null}
            </div>
            {birthdayValue ? (
              <button
                type="button"
                onClick={() => onClearBirthday?.()}
                className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                Clear date
              </button>
            ) : null}
          </div>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        icon: <Settings className="h-5 w-5" aria-hidden="true" />,
        content: (
          <div className="space-y-5">
            <div>
              <span className="text-xs uppercase tracking-wide text-zinc-400">
                Camera
              </span>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
                <div>
                  <div className="text-sm text-white">Auto-rotate</div>
                  <div className="text-xs text-zinc-400">
                    Orbit the scene automatically
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoRotateEnabled}
                  onClick={onToggleAutoRotate}
                  className={cn(
                    "inline-flex h-6 w-11 items-center rounded-full border border-transparent px-1 transition",
                    autoRotateEnabled ? "bg-blue-500" : "bg-zinc-700/80",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white shadow transition-transform",
                      autoRotateEnabled ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
                <span>Star brightness</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {sliderValue}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={6000}
                value={sliderValue}
                onChange={handleBrightnessChange}
                className="mt-3 w-full accent-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Higher values amplify fainter stars.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetCamera}
              className="w-full rounded-lg bg-blue-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
            >
              Reset camera
            </button>
          </div>
        ),
      },
    ],
    [
      autoRotateEnabled,
      birthdayAgeYears,
      birthdayHelperText,
      birthdayValue,
      onClearBirthday,
      onResetCamera,
      onToggleAutoRotate,
      handleBrightnessChange,
      handleDateChange,
      sliderValue,
    ],
  );

  useEffect(() => {
    if (!active) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [active]);

  return (
    <MotionConfig transition={transition}>
      <div
        ref={containerRef}
        className="pointer-events-auto absolute bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl backdrop-blur-xl">
          <div className="overflow-hidden">
            <AnimatePresence initial={false}>
              {isOpen && active ? (
                <motion.div
                  layout
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: contentHeight || "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="min-w-[18rem]"
                >
                  <div
                    ref={contentRef}
                    className="px-4 pt-4 pb-2 text-sm text-white"
                  >
                    {items.find((item) => item.id === active)?.content}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-2 px-3 py-2">
            {items.map((item) => {
              const isSelected = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={item.label}
                  onClick={() => {
                    if (isSelected) {
                      setActive(null);
                      return;
                    }
                    setActive(item.id);
                  }}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-zinc-400 transition",
                    "hover:border-zinc-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
                    isSelected
                      ? "border-zinc-700 bg-zinc-800/70 text-white shadow-lg"
                      : "bg-zinc-900/50",
                  )}
                >
                  <motion.span
                    layout
                    className="flex items-center justify-center"
                    transition={transition}
                  >
                    {item.icon}
                  </motion.span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
