import { StarCanvas } from "./components/StarCanvas";

export default function Home() {
  return (
    <div className="w-full h-screen bg-black relative">
      <h1 className="text-white text-4xl font-bold">Hello World</h1>
      <StarCanvas />
      {/* Optional CSS-based grain overlay */}
      <div className="grain-overlay" />
    </div>
  );
}
