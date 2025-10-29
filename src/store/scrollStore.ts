import { create } from "zustand";
import { clamp01 } from "@/utils/geometryHelpers";

interface ScrollState {
  progress: number;
  setProgress: (value: number) => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  setProgress: (value: number) => set({ progress: clamp01(value) }),
}));
