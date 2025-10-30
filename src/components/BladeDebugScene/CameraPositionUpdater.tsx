import { useFrame, useThree } from "@react-three/fiber";
import { useCameraConfigStore } from "@/store/cameraConfigStore";

/**
 * Updates camera position in store every frame for GUI display
 */
const CameraPositionUpdater = () => {
  const { camera } = useThree();
  const setCurrentPosition = useCameraConfigStore((state) => state.setCurrentPosition);

  useFrame(() => {
    setCurrentPosition(camera.position.x, camera.position.y, camera.position.z);
  });

  return null;
};

export default CameraPositionUpdater;
