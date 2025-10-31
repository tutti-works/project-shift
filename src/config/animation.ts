import type { AnimationConfig } from "@/types/animation";

export const ANIMATION_CONFIG: AnimationConfig = {
  units: {
    total: 51,
    centerIndex: 25,
    pitch: 120, // mm
  },
  blade: {
    width: 100,
    height: 3762,
    thickness: 26,
    color: "rgba(235, 217, 197, 1)",
    heightSegments: 64,
    maxBendAngle: Math.PI / 2,
  },
  ribbon: {
    width: 100,
    height: 3000,
    thickness: 2,
    color: "#ffffff",
    opacity: 0.8,
    heightSegments: 64,
    maxTwistAngle: Math.PI,
    anchorDistance: 2400,
  },
  wire: {
    diameter: 20,
    color: "#ffffff",
    metalness: 0.4,
    roughness: 0.2,
    radialSegments: 8,
    anchorDistance: 2400,
  },
  wave: {
    phase1: {
      startFromCenter: true,
      propagationSpeed: 0.05,
      easing: "easeInOutSine",
    },
    phase2: {
      startFromEnd: true,
      propagationSpeed: 0.05,
      easing: "easeInOutSine",
    },
  },
  camera: {
    target: {
      x: 0,
      y: 1881,
      z: 0,
    },
    distance: 8000,
    fov: {
      desktop: 50,
      mobile: 75,
    },
    positionA: {
      azimuth: 45,
      elevation: 30,
    },
    positionB: {
      azimuth: 225,
      elevation: 30,
    },
    transitionEasing: "easeInOutCubic",
  },
  lighting: {
    ambient: {
      intensity: 0.4,
    },
    mainLight: {
      position: [5000, 8000, 3000],
      intensity: 1.2,
      castShadow: true,
      shadowMapSize: 2048,
    },
    fillLight: {
      position: [-3000, 4000, -2000],
      intensity: 0.5,
    },
  },
  performance: {
    targetFPS: {
      desktop: 60,
      mobile: 30,
    },
    pixelRatio: {
      max: 2,
    },
    lod: {
      mobile: {
        bladeHeightSegments: 32,
        ribbonHeightSegments: 32,
        wireRadialSegments: 6,
      },
    },
  },
  scroll: {
    smooth: true,
    lerp: 0.05,
    multiplier: 1.0,
  },
};

export type { AnimationConfig };
