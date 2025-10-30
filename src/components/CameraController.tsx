"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getCameraPositionForScroll, getCameraTargetForScroll } from "@/utils/cameraHelpers";

const CameraController = () => {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const cameraRef = useRef(camera);
  const progress = useScrollStore((state) => state.progress);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const currentCamera = cameraRef.current;
    const initialPosition = getCameraPositionForScroll(0);
    const initialTarget = getCameraTargetForScroll(0);
    currentCamera.position.copy(initialPosition);
    currentCamera.lookAt(initialTarget);
    currentCamera.updateProjectionMatrix();
  }, []);

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
    const desiredPosition = getCameraPositionForScroll(progress);
    const desiredTarget = getCameraTargetForScroll(progress);

    // スムーズなカメラ移動
    currentCamera.position.lerp(desiredPosition, 0.08);
    currentCamera.lookAt(desiredTarget);
  });

  return null;
};

export default CameraController;
