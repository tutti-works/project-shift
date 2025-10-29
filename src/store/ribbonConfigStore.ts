import { create } from "zustand";
import { ANIMATION_CONFIG } from "@/config/animation";

type RibbonConfigState = {
  twistAngleAtRest: number;
  twistAngleAtMax: number;
  setTwistAngleAtRest: (value: number) => void;
  setTwistAngleAtMax: (value: number) => void;
};

const { maxTwistAngle } = ANIMATION_CONFIG.ribbon;
const MIN_TWIST_ANGLE = -Math.PI * 2;
const MAX_TWIST_ANGLE = Math.PI * 2;

const clampTwist = (value: number) =>
  Math.min(Math.max(value, MIN_TWIST_ANGLE), MAX_TWIST_ANGLE);

export const useRibbonConfigStore = create<RibbonConfigState>((set) => ({
  twistAngleAtRest: 0,
  twistAngleAtMax: clampTwist(maxTwistAngle),
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

