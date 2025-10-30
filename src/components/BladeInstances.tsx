"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  Object3D,
  RGBADepthPacking,
  Shader,
  ShaderMaterial,
  Vector3,
} from "three";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import { getBendAmount } from "@/utils/waveAnimation";
import bladeVertexShader from "@/shaders/bladeDebugVertexInstanced.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";

const TOTAL_UNITS = 51;
const CENTER_INDEX = 25;
const UNIT_PITCH_MM = 120;
const USE_CUSTOM_SHADOW = true;

const BladeInstances = () => {
  const instancedMeshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  const bladeThickness = ANIMATION_CONFIG.blade.thickness;
  const ambientIntensity = useBladeShadeStore((state) => state.ambientIntensity);
  const specularIntensity = useBladeShadeStore((state) => state.specularIntensity);
  const specularPower = useBladeShadeStore((state) => state.specularPower);
  const scrollProgress = useScrollStore((state) => state.progress);

  const bendAmounts = useMemo(
    () => new InstancedBufferAttribute(new Float32Array(TOTAL_UNITS), 1),
    [],
  );

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

  useEffect(() => {
    geometry.setAttribute("aBendAmount", bendAmounts);

    return () => {
      if (geometry.getAttribute("aBendAmount") === bendAmounts) {
        geometry.deleteAttribute("aBendAmount");
      }
    };
  }, [geometry, bendAmounts]);

  const lightDirection = useMemo(() => {
    const [x, y, z] = ANIMATION_CONFIG.lighting.mainLight.position;
    return new Vector3(x, y, z).normalize().multiplyScalar(-1);
  }, []);

  const material = useMemo(() => {
    const currentShade = useBladeShadeStore.getState();
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(ANIMATION_CONFIG.blade.color) },
        uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
        uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
        uAmbientColor: { value: new Color("#ffffff") },
        uAmbientIntensity: { value: currentShade.ambientIntensity },
        uLightColor: { value: new Color("#ffffff") },
        uLightIntensity: { value: ANIMATION_CONFIG.lighting.mainLight.intensity },
        uLightDirection: { value: lightDirection.clone() },
        uSpecularIntensity: { value: currentShade.specularIntensity },
        uSpecularPower: { value: currentShade.specularPower },
      },
      side: DoubleSide,
      vertexShader: bladeVertexShader,
      fragmentShader: bladeFragmentShader,
    });
  }, [lightDirection]);

  const materialRef = useRef<ShaderMaterial | null>(material);
  const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
  const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);
  const sharedUniformsRef = useRef(material.uniforms);

  useEffect(() => {
    sharedUniformsRef.current = material.uniforms;
    if (materialRef.current && materialRef.current !== material) {
      materialRef.current.dispose();
    }
    materialRef.current = material;
  }, [material]);

  useEffect(() => {
    const uniforms = sharedUniformsRef.current;
    uniforms.uAmbientIntensity.value = ambientIntensity;
    uniforms.uSpecularIntensity.value = specularIntensity;
    uniforms.uSpecularPower.value = specularPower;
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  }, [ambientIntensity, specularIntensity, specularPower]);

  const bendChunk = useMemo(
    () =>
      `
        float bendAmount = clamp(aBendAmount, 0.0, 1.0);
        float theta = uMaxBendAngle * bendAmount;
        if (theta > 0.0001) {
          float normalizedY = clamp((transformed.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
          float radius = uHeight / theta;
          float angle = theta * normalizedY;
          float yPos = radius * sin(angle);
          float zOffset = radius * (1.0 - cos(angle));
          transformed.y = yPos - (uHeight * 0.5);
          transformed.z += zOffset;
        }
      `,
    [],
  );

  const applyBendToShader = useCallback(
    (shader: Shader) => {
      const sharedUniforms = sharedUniformsRef.current;

      shader.uniforms.uHeight = sharedUniforms.uHeight;
      shader.uniforms.uMaxBendAngle = sharedUniforms.uMaxBendAngle;

      shader.vertexShader = shader.vertexShader.replace(
        /#include\s*<common>/,
        `#include <common>
attribute float aBendAmount;
uniform float uHeight;
uniform float uMaxBendAngle;`,
      );

      const bendChunkForShader = bendChunk.replace(/transformed/g, "bendPos");
      const bendBlock = `
        {
          vec3 bendPos = transformed;
${bendChunkForShader}
          transformed = bendPos;
        }
      `;

      shader.vertexShader = shader.vertexShader.replace(
        /#include\s*<project_vertex>/,
        `${bendBlock}
#include <project_vertex>`,
      );
    },
    [bendChunk],
  );

  const depthMaterial = useMemo(() => {
    if (!USE_CUSTOM_SHADOW) return null;
    const mat = new MeshDepthMaterial({
      side: DoubleSide,
      depthPacking: RGBADepthPacking,
    });
    mat.onBeforeCompile = applyBendToShader;
    return mat;
  }, [applyBendToShader]);

  const distanceMaterial = useMemo(() => {
    if (!USE_CUSTOM_SHADOW) return null;
    const mat = new MeshDistanceMaterial({ side: DoubleSide });
    mat.onBeforeCompile = applyBendToShader;
    return mat;
  }, [applyBendToShader]);

  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) {
      return;
    }

    if (depthMaterialRef.current && depthMaterialRef.current !== depthMaterial) {
      depthMaterialRef.current.dispose();
    }
    if (distanceMaterialRef.current && distanceMaterialRef.current !== distanceMaterial) {
      distanceMaterialRef.current.dispose();
    }

    depthMaterialRef.current = depthMaterial;
    distanceMaterialRef.current = distanceMaterial;

    mesh.customDepthMaterial = depthMaterial ?? undefined;
    mesh.customDistanceMaterial = distanceMaterial ?? undefined;

    return () => {
      if (mesh.customDepthMaterial === depthMaterial) {
        mesh.customDepthMaterial = undefined;
      }
      if (mesh.customDistanceMaterial === distanceMaterial) {
        mesh.customDistanceMaterial = undefined;
      }
    };
  }, [bladeThickness, depthMaterial, distanceMaterial]);

  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    for (let i = 0; i < TOTAL_UNITS; i++) {
      const xPosition = toSceneUnits((i - CENTER_INDEX) * UNIT_PITCH_MM);
      const yPosition = toSceneUnits(ANIMATION_CONFIG.blade.height) / 2;

      tempObject.position.set(xPosition, yPosition, 0);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();

      mesh.setMatrixAt(i, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [geometry, tempObject]);

  useEffect(() => {
    if (depthMaterialRef.current) {
      depthMaterialRef.current.needsUpdate = true;
    }
    if (distanceMaterialRef.current) {
      distanceMaterialRef.current.needsUpdate = true;
    }
  }, [bladeThickness]);

  useLayoutEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) {
      return;
    }

    mesh.material = material;
    mesh.geometry = geometry;
  }, [geometry, material]);

  useEffect(
    () => () => {
      materialRef.current?.dispose();
      depthMaterialRef.current?.dispose();
      distanceMaterialRef.current?.dispose();
      materialRef.current = null;
      depthMaterialRef.current = null;
      distanceMaterialRef.current = null;
    },
    [],
  );

  useFrame(() => {
    const mesh = instancedMeshRef.current;
    const materialInstance = materialRef.current;
    if (!mesh || !materialInstance) {
      return;
    }

    const progress = Math.min(Math.max(scrollProgress, 0), 1);

    for (let i = 0; i < TOTAL_UNITS; i++) {
      const bendAmount = getBendAmount(i, progress);
      bendAmounts.setX(i, bendAmount);
    }

    bendAmounts.needsUpdate = true;

    const uniforms = sharedUniformsRef.current;
    uniforms.uLightDirection.value.copy(lightDirection);
    uniforms.uAmbientIntensity.value = ambientIntensity;
    uniforms.uSpecularIntensity.value = specularIntensity;
    uniforms.uSpecularPower.value = specularPower;

    materialInstance.uniformsNeedUpdate = true;
  });

  return (
    <instancedMesh
      key={geometry.uuid}
      ref={instancedMeshRef}
      args={[geometry, material, TOTAL_UNITS]}
      material={material}
      geometry={geometry}
      castShadow
      receiveShadow
    />
  );
};

export default BladeInstances;
