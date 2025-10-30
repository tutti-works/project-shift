import { create } from "zustand";

type WaveConfigState = {
  waveSpeed: number;
  setWaveSpeed: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const useWaveConfigStore = create<WaveConfigState>((set) => ({
  waveSpeed: 0.05,
  setWaveSpeed: (value) =>
    set(() => ({
      waveSpeed: Number.isFinite(value) ? clamp(value, 0.01, 0.2) : 0.05,
    })),
}));

