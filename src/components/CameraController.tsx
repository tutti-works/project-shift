"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";
import { useScrollStore } from "@/store/scrollStore";
import { useMouseStore } from "@/store/mouseStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { getCameraPositionForScroll, getCameraTargetForScroll } from "@/utils/cameraHelpers";

const CameraController = () => {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const cameraRef = useRef(camera);
  const progress = useScrollStore((state) => state.progress);
  const mouseX = useMouseStore((state) => state.mouseX);
  const mouseY = useMouseStore((state) => state.mouseY);

  // Smoothed mouse position for easing
  const smoothMouseX = useRef(0);
  const smoothMouseY = useRef(0);

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

    // Smooth mouse position with easing
    smoothMouseX.current += (mouseX - smoothMouseX.current) * 0.05;
    smoothMouseY.current += (mouseY - smoothMouseY.current) * 0.05;

    // Get base camera position and target from scroll
    const basePosition = getCameraPositionForScroll(progress);
    const baseTarget = getCameraTargetForScroll(progress);

    // Apply mouse-based orbit offset (inverted direction)
    // Horizontal: ±10 degrees, Vertical: ±5 degrees
    const horizontalAngle = -smoothMouseX.current * (10 * Math.PI / 180); // ±10 degrees in radians (inverted)
    const verticalAngle = -smoothMouseY.current * (5 * Math.PI / 180);    // ±5 degrees in radians (inverted)

    // Calculate offset from target
    const offsetFromTarget = new Vector3().subVectors(basePosition, baseTarget);

    // Apply horizontal rotation (around Y-axis)
    const cosH = Math.cos(horizontalAngle);
    const sinH = Math.sin(horizontalAngle);
    const rotatedX = offsetFromTarget.x * cosH - offsetFromTarget.z * sinH;
    const rotatedZ = offsetFromTarget.x * sinH + offsetFromTarget.z * cosH;

    // Apply vertical rotation (pitch)
    const horizontalDistance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
    const currentPitch = Math.atan2(offsetFromTarget.y, horizontalDistance);
    const newPitch = currentPitch + verticalAngle;
    const newY = horizontalDistance * Math.tan(newPitch);

    // Calculate final camera position
    const finalPosition = new Vector3(
      baseTarget.x + rotatedX,
      baseTarget.y + newY,
      baseTarget.z + rotatedZ
    );

    // Smooth camera movement
    currentCamera.position.lerp(finalPosition, 0.08);
    currentCamera.lookAt(baseTarget);
  });

  return null;
};

export default CameraController;
