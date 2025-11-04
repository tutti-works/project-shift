import { create } from "zustand";

export type CameraMode = "fixed" | "arc" | "walkthrough";

interface CameraStore {
  mode: CameraMode;
  setMode: (mode: CameraMode) => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  mode: "fixed",
  setMode: (mode) => set({ mode }),
}));
