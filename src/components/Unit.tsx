// @ts-nocheck - React Three Fiber type issues
"use client";

import { memo, useMemo } from "react";
import { BoxGeometry, Color, MeshStandardMaterial, PlaneGeometry } from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { generateUnitPositions, toSceneUnits } from "@/utils/geometryHelpers";
import { useBladeConfigStore } from "@/store/bladeConfigStore";

type UnitProps = {
  index: number;
};

const bladeGeometry = new BoxGeometry(
  toSceneUnits(ANIMATION_CONFIG.blade.width),
  toSceneUnits(ANIMATION_CONFIG.blade.height),
  toSceneUnits(ANIMATION_CONFIG.blade.thickness),
  1,
  ANIMATION_CONFIG.blade.heightSegments,
  1,
);

const ribbonGeometry = new PlaneGeometry(
  toSceneUnits(ANIMATION_CONFIG.ribbon.width),
  toSceneUnits(ANIMATION_CONFIG.ribbon.height),
  1,
  ANIMATION_CONFIG.ribbon.heightSegments,
);

const bladeMaterial = new MeshStandardMaterial({
  color: new Color(ANIMATION_CONFIG.blade.color),
});

const ribbonMaterial = new MeshStandardMaterial({
  color: new Color(ANIMATION_CONFIG.ribbon.color),
  transparent: true,
  opacity: ANIMATION_CONFIG.ribbon.opacity,
});

const Unit = ({ index }: UnitProps) => {
  const positions = useMemo(() => generateUnitPositions(), []);
  const position = positions[index] ?? positions[0];
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const bladeScale = useMemo(() => {
    const baseThickness = ANIMATION_CONFIG.blade.thickness;
    if (baseThickness <= 0) {
      return 1;
    }
    return bladeThickness / baseThickness;
  }, [bladeThickness]);

  return (
    <group position={[toSceneUnits(position.x), 0, toSceneUnits(position.z)]}>
      <mesh
        geometry={bladeGeometry}
        material={bladeMaterial}
        scale={[1, 1, bladeScale]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={ribbonGeometry}
        material={ribbonMaterial}
        position={[
          0,
          0,
          -toSceneUnits(ANIMATION_CONFIG.ribbon.anchorDistance),
        ]}
        rotation={[0, Math.PI, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

export default memo(Unit);
