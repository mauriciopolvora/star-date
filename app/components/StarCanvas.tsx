"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LoadingProgress } from "./LoadingProgress";

const SceneDynamic = dynamic(
  () => import("./Scene").then((m) => ({ default: m.Scene })),
  {
    ssr: false,
    loading: () => (
      <LoadingProgress progress={0} message="Initializing 3D engine..." />
    ),
  },
);

/**
 * Wrapper for the 3D scene with dynamic import to avoid SSR issues
 */
export function StarCanvas() {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Monitor star data loading progress
    const checkProgress = async () => {
      try {
        // Simulate progress tracking for the initial load
        const response1 = await fetch("/gcns-positions.bin", {
          method: "HEAD",
        });
        const response2 = await fetch("/gcns-mag.bin", { method: "HEAD" });

        if (response1.ok && response2.ok) {
          // Files exist, loading will be handled by StarField component
          setLoadingProgress(100);
          setTimeout(() => setIsLoading(false), 500);
        }
      } catch (error) {
        console.error("Error checking star data:", error);
      }
    };

    checkProgress();
  }, []);

  return (
    <div className="w-full h-screen">
      {isLoading && loadingProgress < 100 && (
        <div className="absolute inset-0 z-10">
          <LoadingProgress progress={loadingProgress} />
        </div>
      )}
      <SceneDynamic />
    </div>
  );
}
