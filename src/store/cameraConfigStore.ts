import { create } from "zustand";

type CameraConfigState = {
  /**
   * Camera target height (Y position of the point camera looks at)
   */
  targetHeight: number;

  /**
   * Orbit center height (Y position of the orbit center)
   */
  orbitCenterHeight: number;

  /**
   * Camera distance from target
   */
  cameraDistance: number;

  /**
   * Current camera position (read-only, updated by scene)
   */
  currentPosition: { x: number; y: number; z: number };

  setTargetHeight: (value: number) => void;
  setOrbitCenterHeight: (value: number) => void;
  setCameraDistance: (value: number) => void;
  setCurrentPosition: (x: number, y: number, z: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const useCameraConfigStore = create<CameraConfigState>((set) => ({
  targetHeight: 0.3, // Default: 0.3 (30% of blade height)
  orbitCenterHeight: 0, // Default: ground level
  cameraDistance: 2.5, // Default: 3x blade height distance
  currentPosition: { x: 0, y: 0, z: 0 },

  setTargetHeight: (value) =>
    set(() => ({
      targetHeight: Number.isFinite(value) ? clamp(value, 0, 5) : 0.3,
    })),

  setOrbitCenterHeight: (value) =>
    set(() => ({
      orbitCenterHeight: Number.isFinite(value) ? clamp(value, 0, 5) : 0,
    })),

  setCameraDistance: (value) =>
    set(() => ({
      cameraDistance: Number.isFinite(value) ? clamp(value, 1, 20) : 2.5,
    })),

  setCurrentPosition: (x, y, z) =>
    set(() => ({
      currentPosition: { x, y, z },
    })),
}));
