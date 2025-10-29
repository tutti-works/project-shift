"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera, Vector3 as Vector3Type } from "three";
import { Vector3 } from "three";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getCameraPosition } from "@/utils/animationHelpers";

type CameraControllerProps = {
  target: readonly [number, number, number];
};

const CameraController = ({ target }: CameraControllerProps) => {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const cameraRef = useRef(camera);
  const progress = useScrollStore((state) => state.progress);
  const targetVector = useMemo<Vector3Type>(
    () => new Vector3(...target),
    [target],
  );
  const initialPosition = useMemo(() => getCameraPosition(0), []);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const currentCamera = cameraRef.current;
    currentCamera.position.copy(initialPosition);
    currentCamera.lookAt(targetVector);
    currentCamera.updateProjectionMatrix();
  }, [initialPosition, targetVector]);

  useEffect(() => {
    const handleResize = () => {
      const currentCamera = cameraRef.current;
      currentCamera.aspect =
        gl.domElement.clientWidth / gl.domElement.clientHeight;
      const isMobile = window.innerWidth < 768;
      currentCamera.fov = isMobile
        ? ANIMATION_CONFIG.camera.fov.mobile
        : ANIMATION_CONFIG.camera.fov.desktop;
      currentCamera.updateProjectionMatrix();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [gl]);

  useFrame(() => {
    const currentCamera = cameraRef.current;
    const desiredPosition = getCameraPosition(progress);
    currentCamera.position.lerp(desiredPosition, 0.08);
    currentCamera.lookAt(targetVector);
  });

  return null;
};

export default CameraController;
