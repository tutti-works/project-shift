// @ts-nocheck - React Three Fiber type issues
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CircleGeometry,
  WebGLCubeRenderTarget,
  RGBAFormat,
  LinearMipmapLinearFilter,
  CubeCamera,
  Mesh,
} from "three";

const ReflectiveGround = () => {
  const meshRef = useRef<Mesh>(null);
  const cubeCameraRef = useRef<CubeCamera>(null);

  const geometry = useMemo(() => new CircleGeometry(10, 64), []);

  // キューブレンダーターゲットを作成（環境マップ用）
  const cubeRenderTarget = useMemo(() => {
    return new WebGLCubeRenderTarget(256, {
      format: RGBAFormat,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    });
  }, []);

  // 毎フレーム更新（パフォーマンスが気になる場合は頻度を下げられます）
  useFrame(({ gl, scene }) => {
    if (!meshRef.current || !cubeCameraRef.current) return;

    // 地面を一時的に非表示にして無限ループを防ぐ
    meshRef.current.visible = false;

    // CubeCameraでシーンをレンダリング
    cubeCameraRef.current.update(gl, scene);

    // 地面を再表示
    meshRef.current.visible = true;
  });

  return (
    <>
      {/* CubeCamera を地面の位置に配置 */}
      <cubeCamera
        ref={cubeCameraRef}
        args={[0.1, 100, cubeRenderTarget]}
        position={[0, 0, 0]}
      />

      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <primitive object={geometry} />
        <meshStandardMaterial
          color="#555555"
          metalness={0.1}
          roughness={0.8}
          envMap={cubeRenderTarget.texture}
          envMapIntensity={0.5}
        />
      </mesh>
    </>
  );
};

export default ReflectiveGround;
