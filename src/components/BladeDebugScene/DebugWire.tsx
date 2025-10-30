import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import { computeWireAttachmentPointMM } from "./utils";

type DebugWireProps = {
  bendAmountRef: MutableRefObject<number>;
  wireThicknessRef: MutableRefObject<number>;
};

const DebugWire = ({ bendAmountRef, wireThicknessRef }: DebugWireProps) => {
  const meshRef = useRef<Mesh>(null);
  const anchorScene = useMemo(
    () => new Vector3(0, 0, -toSceneUnits(ANIMATION_CONFIG.wire.anchorDistance)),
    [],
  );

  const geometry = useMemo(
    () =>
      new CylinderGeometry(
        0.5,
        0.5,
        1,
        Math.max(ANIMATION_CONFIG.wire.radialSegments, 6),
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

  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const tempEnd = useMemo(() => new Vector3(), []);
  const tempDir = useMemo(() => new Vector3(), []);
  const tempMid = useMemo(() => new Vector3(), []);
  const tempQuat = useMemo(() => new Quaternion(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const bendAmount = bendAmountRef.current;
    const { point } = computeWireAttachmentPointMM(bendAmount);

    tempEnd.set(0, toSceneUnits(point.y), toSceneUnits(point.z));
    tempDir.copy(tempEnd).sub(anchorScene);

    const length = tempDir.length();
    if (length <= 1e-6) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    tempMid.copy(anchorScene).add(tempEnd).multiplyScalar(0.5);
    tempQuat.setFromUnitVectors(up, tempDir.normalize());

    mesh.position.copy(tempMid);
    mesh.quaternion.copy(tempQuat);
    const thicknessScene = toSceneUnits(Math.max(wireThicknessRef.current, 0.1));
    mesh.scale.set(thicknessScene, length, thicknessScene);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />;
};

export default DebugWire;
