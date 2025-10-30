import { MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Mesh,
  MeshDistanceMaterial,
  MeshDepthMaterial,
  PlaneGeometry,
  Quaternion,
  RGBADepthPacking,
  Shader,
  ShaderMaterial,
  Vector3,
} from "three";
import { useRibbonConfigStore } from "@/store/ribbonConfigStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import ribbonVertexShader from "@/shaders/ribbonVertex.glsl";
import ribbonFragmentShader from "@/shaders/ribbonFragment.glsl";
import { clamp01, computeBladePointMM } from "./utils";

const USE_CUSTOM_SHADOW = true;

type DebugRibbonProps = {
  bendAmountRef: MutableRefObject<number>;
};

const DebugRibbon = ({ bendAmountRef }: DebugRibbonProps) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
  const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);
  const anchorScene = useMemo(
    () => new Vector3(0, 0, toSceneUnits(ANIMATION_CONFIG.ribbon.anchorDistance)),
    [],
  );
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const tempEnd = useMemo(() => new Vector3(), []);
  const tempDir = useMemo(() => new Vector3(), []);
  const tempMid = useMemo(() => new Vector3(), []);
  const tempQuat = useMemo(() => new Quaternion(), []);
  const baseHeightScene = useMemo(
    () => toSceneUnits(ANIMATION_CONFIG.ribbon.height),
    [],
  );

  const twistChunk = useMemo(
    () =>
      `
        float bendAmount = clamp(uBendAmount, 0.0, 1.0);
        float normalizedY = clamp((twistPos.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
        float rootAngle = mix(uTwistAngleAtRest, uTwistAngleAtMax, bendAmount);
        float twistAngle = rootAngle * (1.0 - normalizedY);
        float cosTheta = cos(twistAngle);
        float sinTheta = sin(twistAngle);
        float x = twistPos.x * cosTheta - twistPos.z * sinTheta;
        float z = twistPos.x * sinTheta + twistPos.z * cosTheta;
        twistPos.x = x;
        twistPos.z = z;
      `,
    [],
  );

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

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useLayoutEffect(() => {
    geometry.rotateY(Math.PI);
  }, [geometry]);

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
  const sharedUniformsRef = useRef(material.uniforms);

  const applyTwistToShader = useMemo(
    () => (shader: Shader) => {
      const sharedUniforms = sharedUniformsRef.current;

      shader.uniforms.uHeight = sharedUniforms.uHeight;
      shader.uniforms.uTwistAngleAtRest = sharedUniforms.uTwistAngleAtRest;
      shader.uniforms.uTwistAngleAtMax = sharedUniforms.uTwistAngleAtMax;
      shader.uniforms.uBendAmount = sharedUniforms.uBendAmount;

      shader.vertexShader = shader.vertexShader.replace(
        /#include\s*<common>/,
        `#include <common>
uniform float uHeight;
uniform float uTwistAngleAtRest;
uniform float uTwistAngleAtMax;
uniform float uBendAmount;`,
      );

      const twistBlock = `
      {
        vec3 twistPos = transformed;
${twistChunk}
        transformed = twistPos;
      }
      `;

      shader.vertexShader = shader.vertexShader.replace(
        /#include\s*<project_vertex>/,
        `${twistBlock}
#include <project_vertex>`,
      );
    },
    [twistChunk],
  );

  const depthMaterial = useMemo(() => {
    if (!USE_CUSTOM_SHADOW) return null;
    const mat = new MeshDepthMaterial({
      side: DoubleSide,
      depthPacking: RGBADepthPacking,
    });
    mat.onBeforeCompile = applyTwistToShader;
    return mat;
  }, [applyTwistToShader]);

  const distanceMaterial = useMemo(() => {
    if (!USE_CUSTOM_SHADOW) return null;
    const mat = new MeshDistanceMaterial({ side: DoubleSide });
    mat.onBeforeCompile = applyTwistToShader;
    return mat;
  }, [applyTwistToShader]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    materialRef.current = material;
    depthMaterialRef.current = depthMaterial;
    distanceMaterialRef.current = distanceMaterial;
    mesh.customDepthMaterial = depthMaterial ?? undefined;
    mesh.customDistanceMaterial = distanceMaterial ?? undefined;

    return () => {
      mesh.customDepthMaterial = undefined;
      mesh.customDistanceMaterial = undefined;
      depthMaterialRef.current = null;
      distanceMaterialRef.current = null;
    };
  }, [depthMaterial, distanceMaterial, material]);

  const twistAngleAtRest = useRibbonConfigStore((state) => state.twistAngleAtRest);
  const twistAngleAtMax = useRibbonConfigStore((state) => state.twistAngleAtMax);

  useFrame(() => {
    const uniforms = sharedUniformsRef.current;
    const mesh = meshRef.current;
    if (!uniforms || !mesh) {
      return;
    }

    uniforms.uBendAmount.value = clamp01(bendAmountRef.current);
    uniforms.uTwistAngleAtRest.value = twistAngleAtRest;
    uniforms.uTwistAngleAtMax.value = twistAngleAtMax;

    const bendAmount = clamp01(bendAmountRef.current);
    const tipPoint = computeBladePointMM(bendAmount, 1);
    tempEnd.set(0, toSceneUnits(tipPoint.y), toSceneUnits(tipPoint.z));
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
    const scaleY = Math.max(length / baseHeightScene, 1e-4);
    mesh.scale.set(1, scaleY, 1);

    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }
  });

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

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
  );
};

export default DebugRibbon;
