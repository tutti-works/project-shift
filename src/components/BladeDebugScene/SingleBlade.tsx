import {
  MutableRefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshDistanceMaterial,
  MeshDepthMaterial,
  RGBADepthPacking,
  Shader,
  ShaderMaterial,
  Vector3,
} from "three";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import bladeDebugVertexShader from "@/shaders/bladeDebugVertex.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";
import { clamp01 } from "./utils";
import { useBladeGeometry } from "./useBladeGeometry";

const USE_CUSTOM_SHADOW = true;

type SingleBladeProps = {
  bendAmountRef: MutableRefObject<number>;
  bladeThickness: number;
  lightRef: MutableRefObject<DirectionalLight | null>;
  name?: string;
};

const SingleBlade = forwardRef<Mesh, SingleBladeProps>(
  ({ bendAmountRef, bladeThickness, lightRef, name }, forwardedRef) => {
    const geometry = useBladeGeometry(bladeThickness);
    const meshRef = useRef<Mesh>(null);
    useImperativeHandle(forwardedRef, () => meshRef.current, []);

    const materialRef = useRef<ShaderMaterial | null>(null);
    const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
    const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);
    const tempLightDirection = useMemo(() => new Vector3(), []);
    const tempLightPosition = useMemo(() => new Vector3(), []);
    const tempTargetPosition = useMemo(() => new Vector3(), []);
    const ambientIntensity = useBladeShadeStore((state) => state.ambientIntensity);
    const specularIntensity = useBladeShadeStore((state) => state.specularIntensity);
    const specularPower = useBladeShadeStore((state) => state.specularPower);
    const scrollProgress = useScrollStore((state) => state.progress);

    const bendChunk = useMemo(
      () =>
        `
          float bendAmount = clamp(uBendAmount, 0.0, 1.0);
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

    useEffect(
      () => () => {
        geometry.dispose();
      },
      [geometry],
    );

    const material = useMemo(
      () =>
        new ShaderMaterial({
          uniforms: {
            uColor: { value: new Color(ANIMATION_CONFIG.blade.color) },
            uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
            uBendAmount: { value: 0 },
            uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
            uAmbientColor: { value: new Color("#ffffff") },
            uAmbientIntensity: { value: ambientIntensity },
            uLightColor: { value: new Color("#ffffff") },
            uLightIntensity: { value: 1.4 },
            uLightDirection: { value: new Vector3(0, -1, 0) },
            uSpecularIntensity: { value: specularIntensity },
            uSpecularPower: { value: specularPower },
          },
          side: DoubleSide,
          vertexShader: bladeDebugVertexShader,
          fragmentShader: bladeFragmentShader,
        }),
      [ambientIntensity, specularIntensity, specularPower],
    );
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

    const applyBendToShader = useCallback(
      (shader: Shader) => {
        const sharedUniforms = sharedUniformsRef.current;

        shader.uniforms.uHeight = sharedUniforms.uHeight;
        shader.uniforms.uBendAmount = sharedUniforms.uBendAmount;
        shader.uniforms.uMaxBendAngle = sharedUniforms.uMaxBendAngle;

        shader.vertexShader = shader.vertexShader.replace(
          /#include\s*<common>/,
          `#include <common>
uniform float uHeight;
uniform float uBendAmount;
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
      // material dependency ensures we rebind uniforms when the main material is recreated.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyBendToShader, material]);

    const distanceMaterial = useMemo(() => {
      if (!USE_CUSTOM_SHADOW) return null;
      const mat = new MeshDistanceMaterial({ side: DoubleSide });
      mat.onBeforeCompile = applyBendToShader;
      return mat;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyBendToShader, material]);

    useEffect(
      () => () => {
        depthMaterial?.dispose();
        distanceMaterial?.dispose();
      },
      [depthMaterial, distanceMaterial],
    );

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

    useFrame(() => {
      const progress = clamp01(scrollProgress);
      const normalized = progress <= 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(normalized));

      const uniforms = sharedUniformsRef.current;
      uniforms.uBendAmount.value = eased;

      const light = lightRef.current;
      if (light) {
        light.getWorldPosition(tempLightPosition);
        light.target.getWorldPosition(tempTargetPosition);
        tempLightDirection.copy(tempTargetPosition).sub(tempLightPosition).normalize();
        uniforms.uLightDirection.value.copy(tempLightDirection);
        uniforms.uLightColor.value.copy(light.color);
        uniforms.uLightIntensity.value = light.intensity;
      }

      if (materialRef.current) {
        materialRef.current.uniformsNeedUpdate = true;
      }

      bendAmountRef.current = eased;
    });

    return (
      <mesh
        ref={meshRef}
        name={name}
        geometry={geometry}
        material={material}
        position={[0, toSceneUnits(ANIMATION_CONFIG.blade.height) / 2, 0]}
        castShadow
        receiveShadow
      />
    );
  },
);

SingleBlade.displayName = "SingleBlade";

export default SingleBlade;
