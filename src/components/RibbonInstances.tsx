"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getTwistAmount } from "@/utils/animationHelpers";
import { generateUnitPositions, toSceneUnits } from "@/utils/geometryHelpers";
import { useScrollStore } from "@/store/scrollStore";
import { useRibbonConfigStore } from "@/store/ribbonConfigStore";
import ribbonVertexShader from "@/shaders/ribbonVertex.glsl";
import ribbonFragmentShader from "@/shaders/ribbonFragment.glsl";

const RibbonInstances = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const scrollProgress = useScrollStore((state) => state.progress);
  const twistAngleAtRest = useRibbonConfigStore(
    (state) => state.twistAngleAtRest,
  );
  const twistAngleAtMax = useRibbonConfigStore(
    (state) => state.twistAngleAtMax,
  );
  const positions = useMemo(() => generateUnitPositions(), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(ANIMATION_CONFIG.ribbon.color) },
          uOpacity: { value: ANIMATION_CONFIG.ribbon.opacity },
          uHeight: { value: toSceneUnits(ANIMATION_CONFIG.ribbon.height) },
          uTwistAngleAtRest: {
            value: useRibbonConfigStore.getState().twistAngleAtRest,
          },
          uTwistAngleAtMax: {
            value: useRibbonConfigStore.getState().twistAngleAtMax,
          },
          uBendAmount: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: ribbonVertexShader,
        fragmentShader: ribbonFragmentShader,
        side: DoubleSide,
      }),
    [],
  );

  const twistAttributeRef = useRef<InstancedBufferAttribute>();

  const geometry = useMemo(
    () =>
      new PlaneGeometry(
        toSceneUnits(ANIMATION_CONFIG.ribbon.width),
        toSceneUnits(ANIMATION_CONFIG.ribbon.height),
        1,
        ANIMATION_CONFIG.ribbon.heightSegments,
      ),
    [],
  );

  useLayoutEffect(() => {
    const attribute = new InstancedBufferAttribute(
      new Float32Array(positions.length),
      1,
    );
    geometry.setAttribute("aTwistAmount", attribute);
    twistAttributeRef.current = attribute;

    return () => {
      geometry.deleteAttribute("aTwistAmount");
      twistAttributeRef.current = undefined;
    };
  }, [geometry, positions.length]);

  useLayoutEffect(() => {
    geometry.rotateY(Math.PI);
  }, [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new Matrix4();
    const yOffset = toSceneUnits(ANIMATION_CONFIG.ribbon.height / 2);
    const zOffset = -toSceneUnits(ANIMATION_CONFIG.ribbon.anchorDistance);

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

  useFrame(() => {
    const attribute = twistAttributeRef.current;
    if (!attribute) {
      return;
    }

    for (let index = 0; index < positions.length; index += 1) {
      const twistAmount = getTwistAmount(scrollProgress, index);
      attribute.setX(index, twistAmount);
    }

    attribute.needsUpdate = true;
    material.uniforms.uTwistAngleAtRest.value = twistAngleAtRest;
    material.uniforms.uTwistAngleAtMax.value = twistAngleAtMax;
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

export default RibbonInstances;
