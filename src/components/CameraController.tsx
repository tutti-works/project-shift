"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";
import { useScrollStore } from "@/store/scrollStore";
import { useMouseStore } from "@/store/mouseStore";
import { useCameraStore } from "@/store/cameraStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import {
  getCameraPositionForScroll,
  getCameraTargetForScroll,
  getCameraPositionFixed,
  getCameraTargetFixed,
  getCameraPositionWalkthrough,
} from "@/utils/cameraHelpers";

const CameraController = () => {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const cameraRef = useRef(camera);
  const progress = useScrollStore((state) => state.progress);
  const cameraMode = useCameraStore((state) => state.mode);
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
    // 初期カメラは固定カメラ（モード1）
    const initialPosition = getCameraPositionFixed();
    const initialTarget = getCameraTargetFixed();
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

    // Walkthrough mode uses first-person camera (cursor look)
    if (cameraMode === "walkthrough") {
      const basePosition = getCameraPositionWalkthrough(progress);

      // First-person camera: rotate view direction based on mouse
      // Horizontal: ±10 degrees, Vertical: ±5 degrees
      const yaw = smoothMouseX.current * (10 * Math.PI / 180);   // Horizontal rotation (not inverted)
      const pitch = -smoothMouseY.current * (5 * Math.PI / 180); // Vertical rotation (inverted for natural feel)

      // Base look direction: -X axis
      const lookDirection = new Vector3(-1, 0, 0);

      // Apply horizontal rotation (yaw) around Y-axis
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const rotatedX = lookDirection.x * cosYaw - lookDirection.z * sinYaw;
      const rotatedZ = lookDirection.x * sinYaw + lookDirection.z * cosYaw;
      lookDirection.set(rotatedX, lookDirection.y, rotatedZ);

      // Apply vertical rotation (pitch)
      // Rotate around the right axis (perpendicular to look direction and up)
      const right = new Vector3(0, 1, 0).cross(lookDirection).normalize();
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Rotate look direction around right axis
      const pitchedX = lookDirection.x * cosPitch + 0 * sinPitch;
      const pitchedY = lookDirection.x * (-sinPitch) * right.x +
                       lookDirection.z * (-sinPitch) * right.z +
                       Math.sin(pitch);
      const pitchedZ = lookDirection.z * cosPitch + 0 * sinPitch;
      lookDirection.set(pitchedX, pitchedY, pitchedZ).normalize();

      // Calculate target position (camera position + look direction)
      const target = basePosition.clone().add(lookDirection);

      // Smooth camera movement
      currentCamera.position.lerp(basePosition, 0.04);
      currentCamera.lookAt(target);
      return;
    }

    // Fixed and Arc modes use orbit camera (target-centered rotation)
    let basePosition: Vector3;
    let baseTarget: Vector3;

    switch (cameraMode) {
      case "fixed":
        basePosition = getCameraPositionFixed();
        baseTarget = getCameraTargetFixed();
        break;
      case "arc":
        basePosition = getCameraPositionForScroll(progress);
        baseTarget = getCameraTargetForScroll(progress);
        break;
      default:
        basePosition = getCameraPositionFixed();
        baseTarget = getCameraTargetFixed();
    }

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

    // Smooth camera movement with easing
    currentCamera.position.lerp(finalPosition, 0.02);
    currentCamera.lookAt(baseTarget);
  });

  return null;
};

export default CameraController;
