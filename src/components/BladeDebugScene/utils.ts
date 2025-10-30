import { Vector3 } from "three";
import { ANIMATION_CONFIG } from "@/config/animation";

export const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);
export const degToRad = (value: number): number => (value * Math.PI) / 180;
export const radToDeg = (value: number): number => (value * 180) / Math.PI;

export const computeBladePointMM = (bendAmount: number, normalizedY: number): Vector3 => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const clampedNormal = clamp01(normalizedY);
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    return new Vector3(0, height * clampedNormal, 0);
  }

  const radius = height / theta;
  const angle = theta * clampedNormal;
  const y = radius * Math.sin(angle);
  const z = radius * (1.0 - Math.cos(angle));
  return new Vector3(0, y, z);
};

export const computeWireAttachmentPointMM = (bendAmount: number): {
  point: Vector3;
  attachesAtTip: boolean;
} => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const { anchorDistance } = ANIMATION_CONFIG.wire;
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    return { point: computeBladePointMM(0, 1), attachesAtTip: true };
  }

  const radius = height / theta;
  const cosAlpha = radius / (radius + anchorDistance);
  const clampedCos = Math.min(Math.max(cosAlpha, -1), 1);
  const alpha = Math.acos(clampedCos);
  const limitedAlpha = Math.min(alpha, theta);
  const attachesAtTip = Math.abs(limitedAlpha - theta) < 1e-4;
  const normalizedY = theta > 1e-4 ? limitedAlpha / theta : 1;

  return {
    point: computeBladePointMM(bendAmount, normalizedY),
    attachesAtTip,
  };
};
