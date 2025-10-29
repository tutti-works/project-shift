"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
} from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getBendAmount } from "@/utils/animationHelpers";
import { generateUnitPositions, toSceneUnits } from "@/utils/geometryHelpers";
import { useScrollStore } from "@/store/scrollStore";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import bladeVertexShader from "@/shaders/bladeVertex.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";

const BladeInstances = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const scrollProgress = useScrollStore((state) => state.progress);
  const positions = useMemo(() => generateUnitPositions(), []);
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);

  const bendAttributeRef = useRef<InstancedBufferAttribute>();

  const thicknessScale = useMemo(() => {
    const baseThickness = ANIMATION_CONFIG.blade.thickness;
    if (baseThickness <= 0) {
      return 1;
    }
    return bladeThickness / baseThickness;
  }, [bladeThickness]);

  const geometry = useMemo(
    () =>
      new BoxGeometry(
        toSceneUnits(ANIMATION_CONFIG.blade.width),
        toSceneUnits(ANIMATION_CONFIG.blade.height),
        toSceneUnits(ANIMATION_CONFIG.blade.thickness),
        1,
        ANIMATION_CONFIG.blade.heightSegments,
        1,
      ),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    mesh.scale.set(1, 1, thicknessScale);
    mesh.updateMatrix();
  }, [thicknessScale]);

  useLayoutEffect(() => {
    const attribute = new InstancedBufferAttribute(
      new Float32Array(positions.length),
      1,
    );
    geometry.setAttribute("aBendAmount", attribute);
    bendAttributeRef.current = attribute;

    return () => {
      geometry.deleteAttribute("aBendAmount");
      bendAttributeRef.current = undefined;
    };
  }, [geometry, positions.length]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(ANIMATION_CONFIG.blade.color) },
          uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
          uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
        },
        vertexShader: bladeVertexShader,
        fragmentShader: bladeFragmentShader,
        side: DoubleSide,
      }),
    [],
  );
  const materialRef = useRef(material);

  useLayoutEffect(() => {
    materialRef.current = material;
  }, [material]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new Matrix4();
    const yOffset = toSceneUnits(ANIMATION_CONFIG.blade.height / 2);

    positions.forEach((position, index) => {
      matrix.makeTranslation(
        toSceneUnits(position.x),
        yOffset,
        toSceneUnits(position.z),
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useFrame(() => {
    const attribute = bendAttributeRef.current;
    if (!attribute) {
      return;
    }

    for (let index = 0; index < positions.length; index += 1) {
      const bendAmount = getBendAmount(scrollProgress, index);
      attribute.setX(index, bendAmount);
    }

    attribute.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, positions.length]}
      castShadow
      receiveShadow
    />
  );
};

export default BladeInstances;
