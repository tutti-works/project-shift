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
  Vector3,
} from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getBendAmount } from "@/utils/animationHelpers";
import { generateUnitPositions, toSceneUnits } from "@/utils/geometryHelpers";
import { useScrollStore } from "@/store/scrollStore";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import bladeVertexShader from "@/shaders/bladeVertex.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";

const BladeInstances = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const scrollProgress = useScrollStore((state) => state.progress);
  const positions = useMemo(() => generateUnitPositions(), []);
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const ambientIntensity = useBladeShadeStore((state) => state.ambientIntensity);
  const specularIntensity = useBladeShadeStore((state) => state.specularIntensity);
  const specularPower = useBladeShadeStore((state) => state.specularPower);

  const bendAttributeRef = useRef<InstancedBufferAttribute>();
  const lightDirection = useMemo(() => {
    const [x, y, z] = ANIMATION_CONFIG.lighting.mainLight.position;
    return new Vector3(x, y, z).normalize().multiplyScalar(-1);
  }, []);

  const geometry = useMemo(
    () =>
      new BoxGeometry(
        toSceneUnits(ANIMATION_CONFIG.blade.width),
        toSceneUnits(ANIMATION_CONFIG.blade.height),
        toSceneUnits(bladeThickness),
        1,
        ANIMATION_CONFIG.blade.heightSegments,
        1,
      ),
    [bladeThickness],
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

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
          uAmbientColor: { value: new Color("#ffffff") },
          uAmbientIntensity: {
            value: useBladeShadeStore.getState().ambientIntensity,
          },
          uLightColor: { value: new Color("#ffffff") },
          uLightIntensity: {
            value: ANIMATION_CONFIG.lighting.mainLight.intensity,
          },
          uLightDirection: { value: lightDirection.clone() },
          uSpecularIntensity: {
            value: useBladeShadeStore.getState().specularIntensity,
          },
          uSpecularPower: {
            value: useBladeShadeStore.getState().specularPower,
          },
        },
        vertexShader: bladeVertexShader,
        fragmentShader: bladeFragmentShader,
        side: DoubleSide,
      }),
    [lightDirection],
  );
  const materialRef = useRef(material);
  const sharedUniformsRef = useRef(material.uniforms);

  useLayoutEffect(() => {
    materialRef.current = material;
    sharedUniformsRef.current = material.uniforms;
  }, [material]);

  useEffect(() => {
    const uniforms = sharedUniformsRef.current;
    uniforms.uAmbientIntensity.value = ambientIntensity;
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  }, [ambientIntensity]);

  useEffect(() => {
    const uniforms = sharedUniformsRef.current;
    uniforms.uSpecularIntensity.value = specularIntensity;
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  }, [specularIntensity]);

  useEffect(() => {
    const uniforms = sharedUniformsRef.current;
    uniforms.uSpecularPower.value = specularPower;
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  }, [specularPower]);

  useEffect(() => {
    const uniforms = sharedUniformsRef.current;
    uniforms.uLightDirection.value.copy(lightDirection);
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  }, [lightDirection]);

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
