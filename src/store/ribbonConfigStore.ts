import { create } from "zustand";

type RibbonConfigState = {
  twistAngleAtRest: number;
  twistAngleAtMax: number;
  setTwistAngleAtRest: (value: number) => void;
  setTwistAngleAtMax: (value: number) => void;
};

const MIN_TWIST_ANGLE = -Math.PI * 2;
const MAX_TWIST_ANGLE = Math.PI * 2;

const clampTwist = (value: number) =>
  Math.min(Math.max(value, MIN_TWIST_ANGLE), MAX_TWIST_ANGLE);

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const useRibbonConfigStore = create<RibbonConfigState>((set) => ({
  twistAngleAtRest: degToRad(-120), // Default: -120 degrees
  twistAngleAtMax: degToRad(360), // Default: 360 degrees
  setTwistAngleAtRest: (value: number) =>
    set((state) => {
      const next = clampTwist(value);
      return {
        twistAngleAtRest: Math.min(next, state.twistAngleAtMax),
      };
    }),
  setTwistAngleAtMax: (value: number) =>
    set((state) => {
      const next = Math.max(clampTwist(value), state.twistAngleAtRest);
      return {
        twistAngleAtMax: next,
      };
    }),
}));

