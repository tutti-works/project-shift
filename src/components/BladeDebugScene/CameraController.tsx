import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCameraConfigStore } from "@/store/cameraConfigStore";
import { toSceneUnits } from "@/utils/geometryHelpers";
import { ANIMATION_CONFIG } from "@/config/animation";

type CameraControllerProps = {
  use51Instances: boolean;
};

/**
 * Updates camera position and target when camera config changes
 */
const CameraController = ({ use51Instances }: CameraControllerProps) => {
  const { camera } = useThree();
  const targetHeight = useCameraConfigStore((state) => state.targetHeight);
  const orbitCenterHeight = useCameraConfigStore((state) => state.orbitCenterHeight);
  const cameraDistance = useCameraConfigStore((state) => state.cameraDistance);

  const bladeHeight = toSceneUnits(ANIMATION_CONFIG.blade.height);

  useEffect(() => {
    // Update camera position based on store values
    const height = bladeHeight * orbitCenterHeight;
    const distance = bladeHeight * cameraDistance;

    camera.position.set(0, height, distance);

    // Update what the camera looks at
    const targetY = bladeHeight * targetHeight;
    camera.lookAt(0, targetY, 0);

    camera.updateProjectionMatrix();
  }, [camera, bladeHeight, targetHeight, orbitCenterHeight, cameraDistance, use51Instances]);

  return null;
};

export default CameraController;
