// @ts-nocheck - React Three Fiber type issues
import { useRef, useMemo, useEffect } from "react";
import {
  CircleGeometry,
  WebGLRenderTarget,
  LinearFilter,
  RGBAFormat,
  PerspectiveCamera,
  Matrix4,
  Plane,
  Vector3,
  Vector4,
  ShaderMaterial,
  Color,
  Mesh,
} from "three";
import reflectorVertexShader from "@/shaders/reflectorVertex.glsl";
import reflectorFragmentShader from "@/shaders/reflectorFragment.glsl";

const REFLECTION_SIZE = 1024;

const ReflectorGround = () => {
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => new CircleGeometry(10, 64), []);

  const renderTarget = useMemo(
    () =>
      new WebGLRenderTarget(REFLECTION_SIZE, REFLECTION_SIZE, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
      }),
    [],
  );

  const virtualCamera = useMemo(() => new PerspectiveCamera(), []);

  const reflectorPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const normal = useMemo(() => new Vector3(), []);
  const reflectorWorldPosition = useMemo(() => new Vector3(), []);
  const cameraWorldPosition = useMemo(() => new Vector3(), []);
  const rotationMatrix = useMemo(() => new Matrix4(), []);
  const lookAtPosition = useMemo(() => new Vector3(0, 0, -1), []);
  const clipPlane = useMemo(() => new Vector4(), []);
  const view = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  const q = useMemo(() => new Vector4(), []);
  const textureMatrix = useMemo(() => new Matrix4(), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          tDiffuse: { value: renderTarget.texture },
          color: { value: new Color(0.3, 0.3, 0.3) },
          textureOpacity: { value: 0.12 },
          textureMatrix: { value: textureMatrix },
        },
        vertexShader: reflectorVertexShader,
        fragmentShader: reflectorFragmentShader,
      }),
    [renderTarget, textureMatrix],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      renderTarget.dispose();
      material.dispose();
    };
  }, [geometry, renderTarget, material]);

  useEffect(() => {
    const reflector = meshRef.current;
    if (!reflector) return;

    const handleBeforeRender = (renderer, scene, camera) => {
      reflectorWorldPosition.setFromMatrixPosition(reflector.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      rotationMatrix.extractRotation(reflector.matrixWorld);

      normal.set(0, 0, 1);
      normal.applyMatrix4(rotationMatrix);

      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (view.dot(normal) > 0) return;

      view.reflect(normal).negate();
      view.add(reflectorWorldPosition);

      rotationMatrix.extractRotation(camera.matrixWorld);

      lookAtPosition.set(0, 0, -1);
      lookAtPosition.applyMatrix4(rotationMatrix);
      lookAtPosition.add(cameraWorldPosition);

      target.subVectors(reflectorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(reflectorWorldPosition);

      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0);
      virtualCamera.up.applyMatrix4(rotationMatrix);
      virtualCamera.up.reflect(normal);
      virtualCamera.lookAt(target);

      if (camera.isPerspectiveCamera) {
        virtualCamera.near = camera.near;
        virtualCamera.far = camera.far;
        virtualCamera.fov = camera.fov;
        virtualCamera.aspect = camera.aspect;
      }

      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
      virtualCamera.matrixWorldInverse.copy(virtualCamera.matrixWorld).invert();

      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0,
      );
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(reflector.matrixWorld);
      material.uniforms.textureMatrix.value.copy(textureMatrix);

      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

      clipPlane.set(
        reflectorPlane.normal.x,
        reflectorPlane.normal.y,
        reflectorPlane.normal.z,
        reflectorPlane.constant,
      );

      const projectionMatrix = virtualCamera.projectionMatrix;

      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = -1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0;
      projectionMatrix.elements[14] = clipPlane.w;

      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      const viewport = camera.viewport ? camera.viewport.clone() : null;

      reflector.visible = false;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;

      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (!renderer.autoClear) renderer.clear();
      renderer.render(scene, virtualCamera);
      renderer.setRenderTarget(currentRenderTarget);

      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      if (viewport) {
        renderer.state.viewport(viewport);
      }

      reflector.visible = true;
    };

    const previous = reflector.onBeforeRender;
    reflector.onBeforeRender = handleBeforeRender;

    return () => {
      reflector.onBeforeRender = previous ?? undefined;
    };
  }, [
    cameraWorldPosition,
    clipPlane,
    lookAtPosition,
    material,
    normal,
    q,
    reflectorPlane,
    reflectorWorldPosition,
    renderTarget,
    rotationMatrix,
    target,
    textureMatrix,
    view,
    virtualCamera,
  ]);

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <primitive object={geometry} />
      <primitive object={material} />
    </mesh>
  );
};

export default ReflectorGround;
