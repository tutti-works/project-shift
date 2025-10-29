export interface UnitConfig {
  total: number;
  centerIndex: number;
  pitch: number;
}

export interface BladeConfig {
  width: number;
  height: number;
  thickness: number;
  color: string;
  heightSegments: number;
  maxBendAngle: number;
}

export interface RibbonConfig {
  width: number;
  height: number;
  thickness: number;
  color: string;
  opacity: number;
  heightSegments: number;
  maxTwistAngle: number;
  anchorDistance: number;
}

export interface WireConfig {
  diameter: number;
  color: string;
  metalness: number;
  roughness: number;
  radialSegments: number;
  anchorDistance: number;
}

export interface WavePhaseConfig {
  startFromCenter?: boolean;
  startFromEnd?: boolean;
  propagationSpeed: number;
  easing: string;
}

export interface WaveConfig {
  phase1: WavePhaseConfig;
  phase2: WavePhaseConfig;
}

export interface CameraTargetConfig {
  x: number;
  y: number;
  z: number;
}

export interface CameraPositionConfig {
  azimuth: number;
  elevation: number;
}

export interface CameraConfig {
  target: CameraTargetConfig;
  distance: number;
  fov: {
    desktop: number;
    mobile: number;
  };
  positionA: CameraPositionConfig;
  positionB: CameraPositionConfig;
  transitionEasing: string;
}

export interface LightingConfig {
  ambient: {
    intensity: number;
  };
  mainLight: {
    position: [number, number, number];
    intensity: number;
    castShadow: boolean;
    shadowMapSize: number;
  };
  fillLight: {
    position: [number, number, number];
    intensity: number;
  };
}

export interface PerformanceConfig {
  targetFPS: {
    desktop: number;
    mobile: number;
  };
  pixelRatio: {
    max: number;
  };
  lod: {
    mobile: {
      bladeHeightSegments: number;
      ribbonHeightSegments: number;
      wireRadialSegments: number;
    };
  };
}

export interface ScrollConfig {
  smooth: boolean;
  lerp: number;
  multiplier: number;
}

export interface AnimationConfig {
  units: UnitConfig;
  blade: BladeConfig;
  ribbon: RibbonConfig;
  wire: WireConfig;
  wave: WaveConfig;
  camera: CameraConfig;
  lighting: LightingConfig;
  performance: PerformanceConfig;
  scroll: ScrollConfig;
}
