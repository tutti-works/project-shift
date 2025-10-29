import { Matrix4, Vector3 } from "three";
import { ANIMATION_CONFIG } from "@/config/animation";

export const SCENE_SCALE = 0.001;

export const toSceneUnits = (value: number): number => value * SCENE_SCALE;

export const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 1);
};

export const generateUnitPositions = (): Vector3[] => {
  const { total, centerIndex, pitch } = ANIMATION_CONFIG.units;

  return Array.from({ length: total }, (_, index) => {
    const x = (index - centerIndex) * pitch;
    return new Vector3(x, 0, 0);
  });
};

export const createInstanceMatrix = (
  position: Vector3,
  yOffset: number = 0,
): Matrix4 => {
  const matrix = new Matrix4();
  matrix.setPosition(position.x, position.y + yOffset, position.z);
  return matrix;
};

export const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
};
