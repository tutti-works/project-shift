import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { AxesHelper } from "three";

type AxesIndicatorProps = {
  size?: number;
};

const AxesIndicator = ({ size = 0.5 }: AxesIndicatorProps) => {
  const { scene } = useThree();

  useEffect(() => {
    const helper = new AxesHelper(size);
    helper.name = "blade-debug-axes-helper";
    scene.add(helper);
    return () => {
      scene.remove(helper);
      helper.dispose();
    };
  }, [scene, size]);

  return null;
};

export default AxesIndicator;
