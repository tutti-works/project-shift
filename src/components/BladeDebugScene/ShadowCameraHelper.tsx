import { MutableRefObject, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraHelper, DirectionalLight } from "three";

type ShadowCameraHelperProps = {
  lightRef: MutableRefObject<DirectionalLight | null>;
  enabled?: boolean;
};

const ShadowCameraHelper = ({ lightRef, enabled = true }: ShadowCameraHelperProps) => {
  const { scene } = useThree();
  const helperRef = useRef<CameraHelper | null>(null);

  useEffect(() => {
    if (!enabled) {
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
  }, [scene, lightRef, enabled]);

  useFrame(() => {
    if (helperRef.current) {
      helperRef.current.update();
    }
  });

  return null;
};

export default ShadowCameraHelper;
