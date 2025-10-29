import { MathUtils, Vector3 } from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { clamp01, toSceneUnits } from "@/utils/geometryHelpers";

const easingFns: Record<string, (t: number) => number> = {
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  linear: (t: number) => t,
};

const applyEasing = (value: number, easingKey: string): number => {
  const easing = easingFns[easingKey] ?? easingFns.linear;
  return clamp01(easing(clamp01(value)));
};

const computePhaseDelay = (phase: "phase1" | "phase2", index: number): number => {
  const { units, wave } = ANIMATION_CONFIG;
  const phaseConfig = wave[phase];
  const { propagationSpeed } = phaseConfig;

  if (phase === "phase1" && phaseConfig.startFromCenter) {
    const distanceFromCenter = Math.abs(index - units.centerIndex);
    return distanceFromCenter * propagationSpeed;
  }

  if (phase === "phase2" && phaseConfig.startFromEnd) {
    const distanceFromEnd = units.total - 1 - index;
    return distanceFromEnd * propagationSpeed;
  }

  return index * propagationSpeed;
};

export const getPhaseProgress = (
  scrollProgress: number,
  index: number,
): number => {
  const phase: "phase1" | "phase2" = scrollProgress <= 0.5 ? "phase1" : "phase2";
  const localProgress =
    phase === "phase1" ? scrollProgress / 0.5 : (scrollProgress - 0.5) / 0.5;

  const delay = computePhaseDelay(phase, index);
  const eased = applyEasing(localProgress - delay, ANIMATION_CONFIG.wave[phase].easing);

  return clamp01(eased);
};

export const getBendAmount = (scrollProgress: number, index: number): number => {
  const phaseProgress = getPhaseProgress(scrollProgress, index);
  return clamp01(phaseProgress);
};

export const getTwistAmount = (scrollProgress: number, index: number): number => {
  return getBendAmount(scrollProgress, index);
};

export const getCameraPosition = (scrollProgress: number): Vector3 => {
  const { camera } = ANIMATION_CONFIG;
  const clamped = clamp01(scrollProgress);
  let azimuth: number;

  if (clamped <= 0.5) {
    const t = clamped * 2;
    azimuth = MathUtils.lerp(camera.positionA.azimuth, camera.positionB.azimuth, t);
  } else {
    const t = (clamped - 0.5) * 2;
    azimuth = MathUtils.lerp(camera.positionB.azimuth, camera.positionA.azimuth, t);
  }

  const elevation = camera.positionA.elevation;
  const azimuthRad = MathUtils.degToRad(azimuth);
  const elevationRad = MathUtils.degToRad(elevation);
  const distance = camera.distance;

  const x =
    camera.target.x +
    distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
  const y = camera.target.y + distance * Math.sin(elevationRad);
  const z =
    camera.target.z +
    distance * Math.cos(elevationRad) * Math.sin(azimuthRad);

  return new Vector3(toSceneUnits(x), toSceneUnits(y), toSceneUnits(z));
};
