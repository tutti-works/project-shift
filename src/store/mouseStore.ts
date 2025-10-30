import { create } from "zustand";

interface MouseState {
  // Normalized mouse position: -1 (left/top) to 1 (right/bottom)
  mouseX: number;
  mouseY: number;
  setMousePosition: (x: number, y: number) => void;
}

export const useMouseStore = create<MouseState>((set) => ({
  mouseX: 0,
  mouseY: 0,
  setMousePosition: (x: number, y: number) => set({ mouseX: x, mouseY: y }),
}));
