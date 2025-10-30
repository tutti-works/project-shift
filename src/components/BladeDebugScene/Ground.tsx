import { useMemo } from "react";
import { extend } from "@react-three/fiber";
import { CircleGeometry, MeshStandardMaterial } from "three";

extend({ CircleGeometry, MeshStandardMaterial });

const Ground = () => {
  const geometry = useMemo(() => new CircleGeometry(10, 64), []);

  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <primitive object={geometry} />
      <meshStandardMaterial color="#555555" />
    </mesh>
  );
};

export default Ground;
