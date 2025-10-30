// @ts-nocheck - React Three Fiber type issues
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedMesh,
  InstancedBufferAttribute,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RGBADepthPacking,
  ShaderMaterial,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";

type Shader = WebGLProgramParametersWithUniforms;
import { useRibbonConfigStore } from "@/store/ribbonConfigStore";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import { getBendAmount } from "@/utils/waveAnimation";
import ribbonVertexShader from "@/shaders/ribbonVertexInstanced.glsl";
import ribbonFragmentShader from "@/shaders/ribbonFragment.glsl";
import { computeBladePointMM, clamp01 } from "@/utils/bladeHelpers";

const TOTAL_UNITS = 51;
const CENTER_INDEX = 25;
const UNIT_PITCH_MM = 120;
const USE_CUSTOM_SHADOW = true;

const RibbonInstances = () => {
  const instancedMeshRef = useRef<InstancedMesh>(null);
  const tempInstanceObject = useMemo(() => new Object3D(), []);

  const anchorBase = useMemo(
    () => new Vector3(0, 0, toSceneUnits(ANIMATION_CONFIG.ribbon.anchorDistance)),
    [],
  );
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const tempEnd = useMemo(() => new Vector3(), []);
  const tempDir = useMemo(() => new Vector3(), []);
  const tempMid = useMemo(() => new Vector3(), []);
  const tempQuat = useMemo(() => new Quaternion(), []);
  const basePosition = useMemo(() => new Vector3(), []);
  const baseScale = useMemo(() => new Vector3(1, 1, 1), []);
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

  const material = useMemo(() => {
    const ribbonConfig = useRibbonConfigStore.getState();
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(ANIMATION_CONFIG.ribbon.color) },
        uOpacity: { value: ANIMATION_CONFIG.ribbon.opacity },
        uHeight: { value: toSceneUnits(ANIMATION_CONFIG.ribbon.height) },
        uTwistAngleAtRest: {
          value: ribbonConfig.twistAngleAtRest,
        },
        uTwistAngleAtMax: {
          value: ribbonConfig.twistAngleAtMax,
        },
        uBendAmount: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: ribbonVertexShader,
      fragmentShader: ribbonFragmentShader,
      side: DoubleSide,
    });
  }, []);

  const materialRef = useRef<ShaderMaterial | null>(material);
  const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
  const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);
  const sharedUniformsRef = useRef(material.uniforms);
  const twistAttributeRef = useRef<InstancedBufferAttribute | null>(null);

  useEffect(() => {
    sharedUniformsRef.current = material.uniforms;
    if (materialRef.current && materialRef.current !== material) {
      materialRef.current.dispose();
    }
    materialRef.current = material;
  }, [material]);

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
          transformed = twistPos;
        }
      `;

      shader.vertexShader = shader.vertexShader.replace(
        /#include\s*<project_vertex>/,
        `${twistBlock}
#include <project_vertex>`,
      );
    },
    [],
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
  }, [depthMaterial, distanceMaterial]);

  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) {
      return;
    }

    const attribute =
      twistAttributeRef.current ?? new InstancedBufferAttribute(new Float32Array(TOTAL_UNITS), 1);

    twistAttributeRef.current = attribute;
    mesh.geometry.setAttribute("aTwistAmount", attribute);

    return () => {
      const currentAttribute = twistAttributeRef.current;
      if (currentAttribute && mesh.geometry.getAttribute("aTwistAmount") === currentAttribute) {
        mesh.geometry.deleteAttribute("aTwistAmount");
      }
      twistAttributeRef.current = null;
    };
  }, [geometry]);

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

  const twistAngleAtRest = useRibbonConfigStore((state) => state.twistAngleAtRest);
  const twistAngleAtMax = useRibbonConfigStore((state) => state.twistAngleAtMax);
  const scrollProgress = useScrollStore((state) => state.progress);
  const baseHeightScene = useMemo(
    () => toSceneUnits(ANIMATION_CONFIG.ribbon.height),
    [],
  );

  useFrame(() => {
    const mesh = instancedMeshRef.current;
    const materialInstance = materialRef.current;
    if (!mesh || !materialInstance) {
      return;
    }

    const uniforms = sharedUniformsRef.current;
    uniforms.uTwistAngleAtRest.value = twistAngleAtRest;
    uniforms.uTwistAngleAtMax.value = twistAngleAtMax;

    const progress = clamp01(scrollProgress);
    const twistAttribute = twistAttributeRef.current;
    let anyVisible = false;
    let centerBend = 0;

    for (let i = 0; i < TOTAL_UNITS; i++) {
      const bendAmount = getBendAmount(i, progress);
      if (twistAttribute) {
        twistAttribute.setX(i, bendAmount);
      }
      if (i === CENTER_INDEX) {
        centerBend = bendAmount;
      }

      const tipPoint = computeBladePointMM(bendAmount, 1);
      tempEnd.set(0, toSceneUnits(tipPoint.y), toSceneUnits(tipPoint.z));
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
      const scaleY = hasLength ? Math.max(length / baseHeightScene, 1e-4) : 1e-4;
      baseScale.set(1, scaleY, 1);

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

    if (twistAttribute) {
      twistAttribute.needsUpdate = true;
    }

    mesh.visible = anyVisible;
    mesh.instanceMatrix.needsUpdate = true;
    materialInstance.uniformsNeedUpdate = true;
    uniforms.uBendAmount.value = centerBend;
    
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

export default RibbonInstances;
