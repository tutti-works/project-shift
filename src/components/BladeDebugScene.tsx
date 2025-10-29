"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  BasicDepthPacking,
  BoxGeometry,
  CameraHelper,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshDistanceMaterial,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Quaternion,
  RGBADepthPacking,
  ShaderMaterial,
  Shader,
  Vector3,
} from "three";
import { GUI } from "lil-gui";
import { useScrollStore } from "@/store/scrollStore";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";
import bladeDebugVertexShader from "@/shaders/bladeDebugVertex.glsl";

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const USE_CUSTOM_SHADOW = true;
const SHOW_SHADOW_CAMERA_HELPER = false;

type DebugController = ReturnType<GUI["add"]>;

const computeBladePointMM = (bendAmount: number, normalizedY: number): Vector3 => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const clampedNormal = clamp01(normalizedY);
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    return new Vector3(0, height * clampedNormal, 0);
  }

  const radius = height / theta;
  const angle = theta * clampedNormal;
  const y = radius * Math.sin(angle);
  const z = radius * (1.0 - Math.cos(angle));
  return new Vector3(0, y, z);
};

const computeWireAttachmentPointMM = (bendAmount: number): {
  point: Vector3;
  attachesAtTip: boolean;
} => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const { anchorDistance } = ANIMATION_CONFIG.wire;
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    return { point: computeBladePointMM(0, 1), attachesAtTip: true };
  }

  const radius = height / theta;
  const cosAlpha = radius / (radius + anchorDistance);
  const clampedCos = Math.min(Math.max(cosAlpha, -1), 1);
  const alpha = Math.acos(clampedCos);
  const limitedAlpha = Math.min(alpha, theta);
  const attachesAtTip = Math.abs(limitedAlpha - theta) < 1e-4;
  const normalizedY = theta > 1e-4 ? limitedAlpha / theta : 1;

  return {
    point: computeBladePointMM(bendAmount, normalizedY),
    attachesAtTip,
  };
};

const useBladeGeometry = (thickness: number) =>
  useMemo(
    () =>
      new BoxGeometry(
        toSceneUnits(ANIMATION_CONFIG.blade.width),
        toSceneUnits(ANIMATION_CONFIG.blade.height),
        toSceneUnits(thickness),
        1,
        ANIMATION_CONFIG.blade.heightSegments,
        1,
      ),
    [thickness],
  );

type SingleBladeProps = {
  bendAmountRef: MutableRefObject<number>;
  bladeThickness: number;
};

const SingleBlade = ({ bendAmountRef, bladeThickness }: SingleBladeProps) => {
  const geometry = useBladeGeometry(bladeThickness);
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
  const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);
  const depthShaderRef = useRef<Shader | null>(null);
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
        },
        side: DoubleSide,
        vertexShader: bladeDebugVertexShader,
        fragmentShader: bladeFragmentShader,
      }),
    [],
  );
  const sharedUniformsRef = useRef(material.uniforms);

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

    console.log('✅ [SHADER] Bend applied to shadow shader');
  },
  [bendChunk],
);

  const depthMaterial = useMemo(() => {
    if (!USE_CUSTOM_SHADOW) return null;
    const mat = new MeshDepthMaterial({
      side: DoubleSide,
      depthPacking: RGBADepthPacking
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

  const scrollProgress = useScrollStore((state) => state.progress);
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

  useFrame((state, delta) => {
    const progress = clamp01(scrollProgress);
    const normalized =
      progress <= 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(normalized));

    sharedUniformsRef.current.uBendAmount.value = eased;
    if (materialRef.current) {
      materialRef.current.uniformsNeedUpdate = true;
    }

    bendAmountRef.current = eased;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, toSceneUnits(ANIMATION_CONFIG.blade.height) / 2, 0]}
      castShadow
      receiveShadow
    />
  );
};

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

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
  );
};

const Ground = () => (
  <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[10, 10]} />
    <meshStandardMaterial color="#cccccc" />
  </mesh>
);

const BladeDebugScene = () => {
  const directionalLightRef = useRef<DirectionalLight | null>(null);
  const bendAmountRef = useRef<number>(0);
  const wireThicknessRef = useRef<number>(10);
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const setBladeThickness = useBladeConfigStore(
    (state) => state.setBladeThickness,
  );
  const guiParamsRef = useRef({
    wireThickness: 10,
    bladeThickness: ANIMATION_CONFIG.blade.thickness,
  });
  const guiControllersRef = useRef<{
    wireThickness?: DebugController;
    bladeThickness?: DebugController;
  }>({});
  const guiRef = useRef<GUI | null>(null);
  const bladeHeight = toSceneUnits(ANIMATION_CONFIG.blade.height);
  const cameraDistance = bladeHeight * 1.8;
  const cameraHeight = bladeHeight * 0.75;
  const orbitTarget = useMemo(
    () => [0, bladeHeight * 0.5, 0] as const,
    [bladeHeight],
  );

  useEffect(() => {
    if (!SHOW_SHADOW_CAMERA_HELPER) {
      return;
    }

    const light = directionalLightRef.current;
    if (!light) {
      return;
    }

    const helper = new CameraHelper(light.shadow.camera);
    helper.name = "shadow-camera-helper";
    light.add(helper);

    return () => {
      light.remove(helper);
      helper.dispose();
    };
  }, []);

  useEffect(() => {
    if (guiRef.current) {
      return;
    }

    const gui = new GUI({ title: "Debug Controls" });
    guiRef.current = gui;

    const params = guiParamsRef.current;
    params.wireThickness = wireThicknessRef.current;
    params.bladeThickness = useBladeConfigStore.getState().bladeThickness;

    const wireController = gui
      .add(params, "wireThickness", 0.5, 20, 0.1)
      .name("Wire Thickness (mm)")
      .onChange((value: number) => {
        wireThicknessRef.current = value;
        guiParamsRef.current.wireThickness = value;
      });

    const bladeController = gui
      .add(params, "bladeThickness", 1, 20, 0.5)
      .name("Blade Thickness (mm)")
      .onChange((value: number) => {
        guiParamsRef.current.bladeThickness = value;
        setBladeThickness(value);
      });

    guiControllersRef.current = {
      wireThickness: wireController,
      bladeThickness: bladeController,
    };

    gui.domElement.style.zIndex = "20";

    return () => {
      guiControllersRef.current = {};
      gui.destroy();
      guiRef.current = null;
    };
  }, [setBladeThickness]);

  useEffect(() => {
    guiParamsRef.current.bladeThickness = bladeThickness;
    const controller = guiControllersRef.current.bladeThickness;
    if (controller && typeof controller.updateDisplay === "function") {
      controller.updateDisplay();
    }
  }, [bladeThickness]);

  return (
    <Canvas
      className="h-full w-full"
      shadows
      camera={{
        position: [0, cameraHeight, cameraDistance],
        fov: 40,
        near: 0.1,
        far: 100,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(...orbitTarget);
      }}
    >
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        enableZoom={false}
        target={orbitTarget}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={0}
      />

      <Suspense fallback={null}>
        <SingleBlade
          bendAmountRef={bendAmountRef}
          bladeThickness={bladeThickness}
        />
        <DebugWire
          bendAmountRef={bendAmountRef}
          wireThicknessRef={wireThicknessRef}
        />
        <Ground />
      </Suspense>
    </Canvas>
  );
};

export default BladeDebugScene;
