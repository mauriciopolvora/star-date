"use client";

import dynamic from "next/dynamic";
import { LoadingProgress } from "./LoadingProgress";

// Dynamically import Scene to avoid SSR issues with Three.js
const SceneDynamic = dynamic(
  () => import("./Scene").then((m) => ({ default: m.Scene })),
  {
    ssr: false,
    loading: () => <LoadingProgress progress={0} message="Loading..." />,
  },
);

/**
 * Canvas wrapper component with dynamic import for Three.js scene
 */
export function StarCanvas() {
  return (
    <div className="w-full h-screen">
      <SceneDynamic />
    </div>
  );
}
