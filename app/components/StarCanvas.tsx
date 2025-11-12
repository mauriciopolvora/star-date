"use client";

import dynamic from "next/dynamic";

const SceneDynamic = dynamic(
  () => import("./Scene").then((m) => ({ default: m.Scene })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-zinc-400">Loading star field...</p>
      </div>
    ),
  },
);

/**
 * Wrapper for the 3D scene with dynamic import to avoid SSR issues
 */
export function StarCanvas() {
  return (
    <div className="w-full h-screen">
      <SceneDynamic />
    </div>
  );
}
