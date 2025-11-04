"use client";

import { useCameraStore, type CameraMode } from "@/store/cameraStore";
import { useState } from "react";

interface CameraButton {
  mode: CameraMode;
  label: string;
  tooltip: string;
}

const cameras: CameraButton[] = [
  { mode: "fixed", label: "1", tooltip: "Fixed Camera" },
  { mode: "arc", label: "2", tooltip: "Arc Camera" },
  { mode: "walkthrough", label: "3", tooltip: "Walkthrough" },
];

export const CameraSwitcher = () => {
  const currentMode = useCameraStore((state) => state.mode);
  const setMode = useCameraStore((state) => state.setMode);
  const [hoveredMode, setHoveredMode] = useState<CameraMode | null>(null);

  return (
    <nav className="pointer-events-auto fixed right-6 top-20 z-20 hidden flex-col gap-2 md:flex">
      {cameras.map(({ mode, label, tooltip }) => {
        const isActive = currentMode === mode;
        const isHovered = hoveredMode === mode;

        return (
          <div key={mode} className="relative">
            <button
              onClick={() => setMode(mode)}
              onMouseEnter={() => setHoveredMode(mode)}
              onMouseLeave={() => setHoveredMode(null)}
              className={`
                flex h-10 w-10 items-center justify-center
                rounded-md text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-white text-black shadow-lg"
                    : "border border-white/30 bg-white/10 text-white backdrop-blur-md hover:scale-105 hover:bg-white/20"
                }
              `}
              aria-label={tooltip}
            >
              {label}
            </button>

            {/* Tooltip */}
            {isHovered && !isActive && (
              <div className="absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/90 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                {tooltip}
                <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-black/90" />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
