import { create } from "zustand";
import { ANIMATION_CONFIG } from "@/config/animation";

type BladeConfigState = {
  bladeThickness: number;
  setBladeThickness: (value: number) => void;
};

const MIN_BLADE_THICKNESS = 0.5;

export const useBladeConfigStore = create<BladeConfigState>((set) => ({
  bladeThickness: 26, // Default: 26mm
  setBladeThickness: (value: number) =>
    set({
      bladeThickness: Math.max(MIN_BLADE_THICKNESS, value),
    }),
}));

