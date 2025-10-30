import { create } from "zustand";

interface ScrollState {
  progress: number;
  setProgress: (value: number) => void;
}

const clampProgress = (value: number) => Math.min(Math.max(value, 0), 1);

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  setProgress: (value: number) => set({ progress: clampProgress(value) }),
}));
