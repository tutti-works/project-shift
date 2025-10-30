import { MutableRefObject, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";

type BladeNormalsHelperProps = {
  meshRef: MutableRefObject<Mesh | null>;
  size?: number;
  color?: number;
};

const BladeNormalsHelper = ({
  meshRef,
  size = 0.1,
  color = 0xff8800,
}: BladeNormalsHelperProps) => {
  const { scene } = useThree();
  const helperRef = useRef<VertexNormalsHelper | null>(null);

  useEffect(
    () => () => {
      if (helperRef.current) {
        scene.remove(helperRef.current);
        helperRef.current.dispose();
        helperRef.current = null;
      }
    },
    [scene],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    if (!helperRef.current) {
      const helper = new VertexNormalsHelper(mesh, size, color);
      helperRef.current = helper;
      scene.add(helper);
    }

    helperRef.current?.update();
  });

  return null;
};

export default BladeNormalsHelper;
