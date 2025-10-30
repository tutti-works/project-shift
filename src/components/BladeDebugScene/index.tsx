"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DirectionalLight, Mesh } from "three";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
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

const BladeDebugScene = () => {
  const directionalLightRef = useRef<DirectionalLight | null>(null);
  const singleBladeRef = useRef<Mesh | null>(null);
  const bendAmountRef = useRef<number>(0);
  const wireThicknessRef = useRef<number>(10);
  const [showNormals, setShowNormals] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showShadowHelper, setShowShadowHelper] = useState(true);

  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const ambientLightIntensity = useBladeShadeStore((state) => state.ambientIntensity);

  const bladeHeight = toSceneUnits(ANIMATION_CONFIG.blade.height);
  const cameraDistance = bladeHeight * 1.8;
  const cameraHeight = bladeHeight * 0.75;
  const orbitTarget = useMemo(
    () => [0, bladeHeight * 0.5, 0] as const,
    [bladeHeight],
  );

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
      />
      <Canvas
        className="h-full w-full"
        shadows
        camera={{
          position: [0, cameraHeight, cameraDistance],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(...orbitTarget);
        }}
      >
        <color attach="background" args={["#050505"]} />
        <ambientLight intensity={ambientLightIntensity} />
        {showAxes ? <AxesIndicator size={0.5} /> : null}
        <directionalLight
          ref={directionalLightRef}
          position={[3, 5, 2]}
          intensity={1.4}
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
          target={orbitTarget}
          maxPolarAngle={Math.PI * 0.9}
          minPolarAngle={0}
        />

        <ShadowCameraHelper
          lightRef={directionalLightRef}
          enabled={showShadowHelper}
        />

        <Suspense fallback={null}>
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
          <Ground />
        </Suspense>
      </Canvas>
    </>
  );
};

export default BladeDebugScene;
