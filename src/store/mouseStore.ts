import { create } from "zustand";

interface MouseState {
  // Normalized mouse position: -1 (left/top) to 1 (right/bottom)
  mouseX: number;
  mouseY: number;
  setMousePosition: (x: number, y: number) => void;

  // Touch state for mobile gesture detection
  touchStartX: number;
  touchStartY: number;
  isTouching: boolean;
  setTouchStart: (x: number, y: number) => void;
  setTouchEnd: () => void;
}

export const useMouseStore = create<MouseState>((set) => ({
  mouseX: 0,
  mouseY: 0,
  setMousePosition: (x: number, y: number) => set({ mouseX: x, mouseY: y }),

  touchStartX: 0,
  touchStartY: 0,
  isTouching: false,
  setTouchStart: (x: number, y: number) => set({
    touchStartX: x,
    touchStartY: y,
    isTouching: true
  }),
  setTouchEnd: () => set({ isTouching: false }),
}));
