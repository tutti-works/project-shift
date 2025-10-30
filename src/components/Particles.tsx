// @ts-nocheck - React Three Fiber type issues
"use client";

import { useMemo } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 900;
const PARTICLE_SIZE = 0.2;
const OUTER_RADIUS = 60; // Diameter 60, so radius is 30
const INNER_RADIUS = 15; // Diameter 20, so radius is 10 (exclusion zone)

export const Particles = () => {
  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Generate random point in hollow sphere (between inner and outer radius)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);

      // Generate radius between INNER_RADIUS and OUTER_RADIUS
      // Using cubic root for uniform volume distribution in the hollow sphere
      const innerVolume = Math.pow(INNER_RADIUS, 3);
      const outerVolume = Math.pow(OUTER_RADIUS, 3);
      const r = Math.cbrt(innerVolume + Math.random() * (outerVolume - innerVolume));

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={PARTICLE_SIZE}
        color="#ffffff"
        sizeAttenuation={true}
        transparent={true}
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
};
