import { create } from "zustand";

type ScrollMultiplierState = {
  /**
   * Ratio of actual scroll required to complete the animation.
   * 1.0 = 100% scroll, 0.5 = 50%, 2.0 = 200%, etc.
   */
  scrollMultiplier: number;
  setScrollMultiplier: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const useScrollMultiplierStore = create<ScrollMultiplierState>((set) => ({
  scrollMultiplier: 2.0, // Default: 200% scroll range
  setScrollMultiplier: (value) =>
    set(() => ({
      scrollMultiplier: Number.isFinite(value) ? clamp(value, 0.5, 3.0) : 2.0,
    })),
}));

