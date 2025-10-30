import {
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  CylinderGeometry,
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { useScrollStore } from "@/store/scrollStore";
import { getBendAmount } from "@/utils/waveAnimation";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import { computeWireAttachmentPointMM } from "./utils";

const TOTAL_UNITS = 51;
const CENTER_INDEX = 25;
const UNIT_PITCH_MM = 120;

type DebugWireInstancesProps = {
  bendAmountRef: MutableRefObject<number>;
  wireThicknessRef: MutableRefObject<number>;
};

const DebugWireInstances = ({
  bendAmountRef,
  wireThicknessRef,
}: DebugWireInstancesProps) => {
  const instancedMeshRef = useRef<InstancedMesh>(null);
  const tempInstanceObject = useMemo(() => new Object3D(), []);

  const anchorBase = useMemo(
    () => new Vector3(0, 0, -toSceneUnits(ANIMATION_CONFIG.wire.anchorDistance)),
    [],
  );
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const tempEnd = useMemo(() => new Vector3(), []);
  const tempDir = useMemo(() => new Vector3(), []);
  const tempMid = useMemo(() => new Vector3(), []);
  const tempQuat = useMemo(() => new Quaternion(), []);
  const basePosition = useMemo(() => new Vector3(), []);
  const baseScale = useMemo(() => new Vector3(1, 1, 1), []);
  const scrollProgress = useScrollStore((state) => state.progress);

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

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) {
      return;
    }

    const progress = Math.min(Math.max(scrollProgress, 0), 1);
    const thicknessScene = toSceneUnits(Math.max(wireThicknessRef.current, 0.1));
    let anyVisible = false;
    let centerBend = 0;

    for (let i = 0; i < TOTAL_UNITS; i++) {
      const bendAmount = getBendAmount(i, progress);
      if (i === CENTER_INDEX) {
        centerBend = bendAmount;
      }

      const { point } = computeWireAttachmentPointMM(bendAmount);
      tempEnd.set(0, toSceneUnits(point.y), toSceneUnits(point.z));
      tempDir.copy(tempEnd).sub(anchorBase);

      const length = tempDir.length();
      const hasLength = length > 1e-6;
      if (hasLength) {
        anyVisible = true;
        tempDir.normalize();
        tempQuat.setFromUnitVectors(up, tempDir);
      } else {
        tempQuat.identity();
      }

      tempMid.copy(anchorBase).add(tempEnd).multiplyScalar(0.5);
      basePosition.copy(tempMid);
      const scaleY = hasLength ? Math.max(length, 1e-4) : 1e-4;
      baseScale.set(thicknessScene, scaleY, thicknessScene);

      const xOffset = toSceneUnits((i - CENTER_INDEX) * UNIT_PITCH_MM);
      tempInstanceObject.position.set(
        basePosition.x + xOffset,
        basePosition.y,
        basePosition.z,
      );
      tempInstanceObject.quaternion.copy(tempQuat);
      tempInstanceObject.scale.copy(baseScale);
      tempInstanceObject.updateMatrix();
      mesh.setMatrixAt(i, tempInstanceObject.matrix);
    }

    mesh.visible = anyVisible;
    mesh.instanceMatrix.needsUpdate = true;
    bendAmountRef.current = centerBend;
  });

  return (
    <instancedMesh
      key={geometry.uuid}
      ref={instancedMeshRef}
      args={[geometry, material, TOTAL_UNITS]}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
};

export default DebugWireInstances;
