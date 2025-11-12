"use client";

interface LoadingProgressProps {
  progress: number;
  message?: string;
}

/**
 * Simple loading indicator shown while Three.js initializes
 */
export function LoadingProgress({ message }: LoadingProgressProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-zinc-400 text-lg">{message || "Loading..."}</div>
    </div>
  );
}
