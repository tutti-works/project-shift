// @ts-nocheck - React Three Fiber type issues
"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DirectionalLight, Mesh } from "three";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import { useCameraConfigStore } from "@/store/cameraConfigStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import SingleBlade from "./SingleBlade";
import DebugRibbon from "./DebugRibbon";
import DebugWire from "./DebugWire";
import Ground from "./Ground";
import ShadowCameraHelper from "./ShadowCameraHelper";
import BladeDebugControls from "./BladeDebugControls";
import AxesIndicator from "./AxesIndicator";
import BladeNormalsHelper from "./BladeNormalsHelper";
import DebugBladeInstances from "./DebugBladeInstances";
import DebugRibbonInstances from "./DebugRibbonInstances";
import DebugWireInstances from "./DebugWireInstances";
import CameraPositionUpdater from "./CameraPositionUpdater";
import CameraController from "./CameraController";

const BladeDebugScene = () => {
  const directionalLightRef = useRef<DirectionalLight | null>(null);
  const singleBladeRef = useRef<Mesh | null>(null);
  const bendAmountRef = useRef<number>(0);
  const wireThicknessRef = useRef<number>(10);
  const [showNormals, setShowNormals] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showShadowHelper, setShowShadowHelper] = useState(false);
  const [use51Instances, setUse51Instances] = useState(true);

  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const ambientLightIntensity = useBladeShadeStore((state) => state.ambientIntensity);

  const targetHeight = useCameraConfigStore((state) => state.targetHeight);
  const orbitCenterHeight = useCameraConfigStore((state) => state.orbitCenterHeight);
  const cameraDistance = useCameraConfigStore((state) => state.cameraDistance);

  const bladeHeight = toSceneUnits(ANIMATION_CONFIG.blade.height);

  // Camera target position (what the camera looks at)
  const orbitTarget = useMemo(
    () => [0, bladeHeight * targetHeight, 0] as const,
    [bladeHeight, targetHeight],
  );

  // Camera initial position
  const cameraPosition = useMemo(
    () => [0, bladeHeight * orbitCenterHeight, bladeHeight * cameraDistance] as const,
    [bladeHeight, orbitCenterHeight, cameraDistance],
  );
  const camera51Config = useMemo(() => {
    if (!use51Instances) {
      return null;
    }

    // Use camera settings from store
    const distance = bladeHeight * cameraDistance;
    const height = bladeHeight * orbitCenterHeight;
    const targetY = bladeHeight * targetHeight;

    return {
      position: [0, height, distance] as const,
      target: [0, targetY, 0] as const,
    };
  }, [bladeHeight, use51Instances, cameraDistance, orbitCenterHeight, targetHeight]);

  return (
    <>
      <BladeDebugControls
        directionalLightRef={directionalLightRef}
        wireThicknessRef={wireThicknessRef}
        showNormals={showNormals}
        onToggleNormals={setShowNormals}
        showAxes={showAxes}
        onToggleAxes={setShowAxes}
        showShadowHelper={showShadowHelper}
        onToggleShadowHelper={setShowShadowHelper}
        use51Instances={use51Instances}
        onToggle51Instances={setUse51Instances}
      />
      <Canvas
        className="h-full w-full"
        shadows
        camera={
          use51Instances && camera51Config
            ? {
                position: camera51Config.position,
                fov: 50,
                near: 0.1,
                far: 200,
              }
            : {
                position: cameraPosition,
                fov: 40,
                near: 0.1,
                far: 100,
              }
        }
        onCreated={({ camera }) => {
          const target =
            use51Instances && camera51Config ? camera51Config.target : orbitTarget;
          camera.lookAt(...target);
        }}
      >
        <color attach="background" args={["#050505"]} />
        <CameraPositionUpdater />
        <CameraController use51Instances={use51Instances} />
        <ambientLight intensity={ambientLightIntensity} />
        {showAxes ? <AxesIndicator size={0.5} /> : null}
        <directionalLight
          ref={directionalLightRef}
          position={[3, 5, 2]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-camera-near={0.1}
          shadow-camera-far={10}
        />

        <OrbitControls
          enablePan={false}
          enableDamping
          enableZoom={false}
          target={
            use51Instances && camera51Config ? camera51Config.target : orbitTarget
          }
          maxPolarAngle={Math.PI * 0.9}
          minPolarAngle={0}
        />

        <ShadowCameraHelper
          lightRef={directionalLightRef}
          enabled={showShadowHelper}
        />

        <Suspense fallback={null}>
          {use51Instances ? (
            <>
              <DebugBladeInstances
                bendAmountRef={bendAmountRef}
                bladeThickness={bladeThickness}
                lightRef={directionalLightRef}
              />
              <DebugRibbonInstances bendAmountRef={bendAmountRef} />
              <DebugWireInstances
                bendAmountRef={bendAmountRef}
                wireThicknessRef={wireThicknessRef}
              />
            </>
          ) : (
            <>
              <SingleBlade
                ref={singleBladeRef}
                bendAmountRef={bendAmountRef}
                bladeThickness={bladeThickness}
                lightRef={directionalLightRef}
                name="single-blade"
              />
              {showNormals ? <BladeNormalsHelper meshRef={singleBladeRef} size={0.2} /> : null}
              <DebugRibbon bendAmountRef={bendAmountRef} />
              <DebugWire
                bendAmountRef={bendAmountRef}
                wireThicknessRef={wireThicknessRef}
              />
            </>
          )}
          <Ground />
        </Suspense>
      </Canvas>
    </>
  );
};

export default BladeDebugScene;
