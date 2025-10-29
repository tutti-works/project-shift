"use client";

import {
  MutableRefObject,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
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
  PlaneGeometry,
  Quaternion,
  RGBADepthPacking,
  ShaderMaterial,
  Shader,
  Vector3,
} from "three";
import { GUI } from "lil-gui";
import { useScrollStore } from "@/store/scrollStore";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { useRibbonConfigStore } from "@/store/ribbonConfigStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import bladeDebugVertexShader from "@/shaders/bladeDebugVertex.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";
import ribbonVertexShader from "@/shaders/ribbonVertex.glsl";
import ribbonFragmentShader from "@/shaders/ribbonFragment.glsl";

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const degToRad = (value: number) => (value * Math.PI) / 180;
const radToDeg = (value: number) => (value * 180) / Math.PI;

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

  useFrame(() => {
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
  const applyTwistToShader = useCallback(
    (shader: Shader) => {
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

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useLayoutEffect(() => {
    geometry.rotateY(Math.PI);
  }, [geometry]);

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

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    mesh.position.copy(anchorScene);
  }, [anchorScene]);

  const twistAngleAtRest = useRibbonConfigStore(
    (state) => state.twistAngleAtRest,
  );
  const twistAngleAtMax = useRibbonConfigStore(
    (state) => state.twistAngleAtMax,
  );

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
      if (materialRef.current) {
        materialRef.current.dispose();
        materialRef.current = null;
      }
      if (depthMaterialRef.current) {
        depthMaterialRef.current.dispose();
        depthMaterialRef.current = null;
      }
      if (distanceMaterialRef.current) {
        distanceMaterialRef.current.dispose();
        distanceMaterialRef.current = null;
      }
    },
    [],
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
};

const Ground = () => (
  <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[10, 10]} />
    <meshStandardMaterial color="#cccccc" />
  </mesh>
);

type ShadowCameraHelperProps = {
  lightRef: MutableRefObject<DirectionalLight | null>;
};

const ShadowCameraHelper = ({ lightRef }: ShadowCameraHelperProps) => {
  const { scene } = useThree();
  const helperRef = useRef<CameraHelper | null>(null);

  useEffect(() => {
    if (!SHOW_SHADOW_CAMERA_HELPER) {
      return;
    }

    const light = lightRef.current;
    if (!light) {
      return;
    }

    const helper = new CameraHelper(light.shadow.camera);
    helper.name = "shadow-camera-helper";
    helperRef.current = helper;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.dispose();
      helperRef.current = null;
    };
  }, [scene, lightRef]);

  useFrame(() => {
    if (helperRef.current) {
      helperRef.current.update();
    }
  });

  return null;
};

const BladeDebugScene = () => {
  const directionalLightRef = useRef<DirectionalLight | null>(null);
  const bendAmountRef = useRef<number>(0);
  const wireThicknessRef = useRef<number>(10);
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const setBladeThickness = useBladeConfigStore(
    (state) => state.setBladeThickness,
  );
  const twistAngleAtRest = useRibbonConfigStore(
    (state) => state.twistAngleAtRest,
  );
  const twistAngleAtMax = useRibbonConfigStore(
    (state) => state.twistAngleAtMax,
  );
  const setTwistAngleAtRest = useRibbonConfigStore(
    (state) => state.setTwistAngleAtRest,
  );
  const setTwistAngleAtMax = useRibbonConfigStore(
    (state) => state.setTwistAngleAtMax,
  );
  const guiParamsRef = useRef({
    wireThickness: 10,
    bladeThickness: ANIMATION_CONFIG.blade.thickness,
    ribbonRestAngleDeg: radToDeg(useRibbonConfigStore.getState().twistAngleAtRest),
    ribbonMaxAngleDeg: radToDeg(useRibbonConfigStore.getState().twistAngleAtMax),
  });
  const guiControllersRef = useRef<{
    wireThickness?: DebugController;
    bladeThickness?: DebugController;
    ribbonRestAngleDeg?: DebugController;
    ribbonMaxAngleDeg?: DebugController;
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
    if (guiRef.current) {
      return;
    }

    const gui = new GUI({ title: "Debug Controls" });
    guiRef.current = gui;

    const params = guiParamsRef.current;
    params.wireThickness = wireThicknessRef.current;
    params.bladeThickness = useBladeConfigStore.getState().bladeThickness;
    params.ribbonRestAngleDeg = radToDeg(
      useRibbonConfigStore.getState().twistAngleAtRest,
    );
    params.ribbonMaxAngleDeg = radToDeg(
      useRibbonConfigStore.getState().twistAngleAtMax,
    );

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

    const ribbonRestController = gui
      .add(params, "ribbonRestAngleDeg", -180, 180, 0.5)
      .name("Ribbon Twist (deg, rest)")
      .onChange((value: number) => {
        guiParamsRef.current.ribbonRestAngleDeg = value;
        setTwistAngleAtRest(degToRad(value));
      });

    const ribbonMaxController = gui
      .add(params, "ribbonMaxAngleDeg", -180, 360, 0.5)
      .name("Ribbon Twist (deg, max)")
      .onChange((value: number) => {
        guiParamsRef.current.ribbonMaxAngleDeg = value;
        setTwistAngleAtMax(degToRad(value));
      });

    guiControllersRef.current = {
      wireThickness: wireController,
      bladeThickness: bladeController,
      ribbonRestAngleDeg: ribbonRestController,
      ribbonMaxAngleDeg: ribbonMaxController,
    };

    gui.domElement.style.zIndex = "20";

    return () => {
      guiControllersRef.current = {};
      gui.destroy();
      guiRef.current = null;
    };
  }, [setBladeThickness, setTwistAngleAtRest, setTwistAngleAtMax]);

  useEffect(() => {
    guiParamsRef.current.bladeThickness = bladeThickness;
    const controller = guiControllersRef.current.bladeThickness;
    if (controller && typeof controller.updateDisplay === "function") {
      controller.updateDisplay();
    }
  }, [bladeThickness]);

  useEffect(() => {
    guiParamsRef.current.ribbonRestAngleDeg = radToDeg(twistAngleAtRest);
    const controller = guiControllersRef.current.ribbonRestAngleDeg;
    if (controller && typeof controller.updateDisplay === "function") {
      controller.updateDisplay();
    }
  }, [twistAngleAtRest]);

  useEffect(() => {
    guiParamsRef.current.ribbonMaxAngleDeg = radToDeg(twistAngleAtMax);
    const controller = guiControllersRef.current.ribbonMaxAngleDeg;
    if (controller && typeof controller.updateDisplay === "function") {
      controller.updateDisplay();
    }
  }, [twistAngleAtMax]);

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
        ref={directionalLightRef}
        position={[3, 5, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        enableZoom={false}
        target={orbitTarget}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={0}
      />

      <ShadowCameraHelper lightRef={directionalLightRef} />

      <Suspense fallback={null}>
        <SingleBlade
          bendAmountRef={bendAmountRef}
          bladeThickness={bladeThickness}
        />
        <DebugRibbon bendAmountRef={bendAmountRef} />
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
