"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import ShiftStructure from "@/components/ShiftStructure";
import Ground from "@/components/Ground";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import CameraController from "@/components/CameraController";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getCameraPositionForScroll } from "@/utils/cameraHelpers";
import { toSceneUnits } from "@/utils/geometryHelpers";

const Scene = () => {
  const initialCameraPosition = useMemo(() => getCameraPositionForScroll(0), []);
  const ambientIntensity = useBladeShadeStore(
    (state) => state.ambientIntensity,
  );

  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, ANIMATION_CONFIG.performance.pixelRatio.max]}
      camera={{
        position: [initialCameraPosition.x, initialCameraPosition.y, initialCameraPosition.z],
        fov: ANIMATION_CONFIG.camera.fov.desktop,
        near: 0.1,
        far: 100,
      }}
    >
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[
          toSceneUnits(ANIMATION_CONFIG.lighting.mainLight.position[0]),
          toSceneUnits(ANIMATION_CONFIG.lighting.mainLight.position[1]),
          toSceneUnits(ANIMATION_CONFIG.lighting.mainLight.position[2]),
        ]}
        intensity={ANIMATION_CONFIG.lighting.mainLight.intensity}
        castShadow={ANIMATION_CONFIG.lighting.mainLight.castShadow}
        shadow-mapSize-height={ANIMATION_CONFIG.lighting.mainLight.shadowMapSize}
        shadow-mapSize-width={ANIMATION_CONFIG.lighting.mainLight.shadowMapSize}
      />
      <directionalLight
        position={[
          toSceneUnits(ANIMATION_CONFIG.lighting.fillLight.position[0]),
          toSceneUnits(ANIMATION_CONFIG.lighting.fillLight.position[1]),
          toSceneUnits(ANIMATION_CONFIG.lighting.fillLight.position[2]),
        ]}
        intensity={ANIMATION_CONFIG.lighting.fillLight.intensity}
      />

      <Suspense fallback={null}>
        <ShiftStructure />
        <Ground />
        <CameraController />
      </Suspense>
    </Canvas>
  );
};

export default Scene;
