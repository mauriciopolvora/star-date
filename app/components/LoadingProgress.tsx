"use client";

interface LoadingProgressProps {
  progress: number;
  message?: string;
}

/**
 * Loading progress indicator for star data
 */
export function LoadingProgress({ progress, message }: LoadingProgressProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <div className="text-zinc-400 mb-4">
        {message || "Loading star field..."}
      </div>
      <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-zinc-500 text-sm mt-2">{Math.round(progress)}%</div>
    </div>
  );
}
