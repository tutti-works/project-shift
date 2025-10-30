import { create } from "zustand";

type BladeShadeState = {
  ambientIntensity: number;
  specularIntensity: number;
  specularPower: number;
  setAmbientIntensity: (value: number) => void;
  setSpecularIntensity: (value: number) => void;
  setSpecularPower: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const MIN_SPECULAR_POWER = 1;
const MAX_SPECULAR_POWER = 256;

export const useBladeShadeStore = create<BladeShadeState>((set) => ({
  ambientIntensity: 0.35,
  specularIntensity: 0.25,
  specularPower: 32,
  setAmbientIntensity: (value: number) =>
    set({
      ambientIntensity: clamp(value, 0, 1.5),
    }),
  setSpecularIntensity: (value: number) =>
    set({
      specularIntensity: clamp(value, 0, 1),
    }),
  setSpecularPower: (value: number) =>
    set({
      specularPower: clamp(value, MIN_SPECULAR_POWER, MAX_SPECULAR_POWER),
    }),
}));

