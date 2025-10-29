"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
} from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { generateUnitPositions, toSceneUnits } from "@/utils/geometryHelpers";

const WireInstances = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const positions = useMemo(() => generateUnitPositions(), []);

  const geometry = useMemo(
    () =>
      new CylinderGeometry(
        toSceneUnits(ANIMATION_CONFIG.wire.diameter / 2),
        toSceneUnits(ANIMATION_CONFIG.wire.diameter / 2),
        toSceneUnits(ANIMATION_CONFIG.blade.height),
        ANIMATION_CONFIG.wire.radialSegments,
      ),
    [],
  );

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(ANIMATION_CONFIG.wire.color),
        metalness: ANIMATION_CONFIG.wire.metalness,
        roughness: ANIMATION_CONFIG.wire.roughness,
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new Matrix4();
    const yOffset = toSceneUnits(ANIMATION_CONFIG.blade.height / 2);
    const zOffset = -toSceneUnits(ANIMATION_CONFIG.wire.anchorDistance / 2);

    positions.forEach((position, index) => {
      matrix.makeTranslation(
        toSceneUnits(position.x),
        yOffset,
        zOffset,
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, positions.length]}
      castShadow
      receiveShadow
    />
  );
};

export default WireInstances;
