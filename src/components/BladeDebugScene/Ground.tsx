const Ground = () => (
  <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[10, 10]} />
    <meshStandardMaterial color="#cccccc" />
  </mesh>
);

export default Ground;
