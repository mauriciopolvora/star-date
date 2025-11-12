import { ErrorBoundary } from "./components/ErrorBoundary";
import { StarCanvas } from "./components/StarCanvas";

export default function Home() {
  return (
    <div className="w-full h-screen bg-black relative">
      <ErrorBoundary>
        <StarCanvas />
      </ErrorBoundary>
    </div>
  );
}
