// @ts-nocheck - React Three Fiber type issues
"use client";

import BladeInstances from "@/components/BladeInstances";
import RibbonInstances from "@/components/RibbonInstances";
import WireInstances from "@/components/WireInstances";

const ShiftStructure = () => {
  return (
    <group>
      <BladeInstances />
      <RibbonInstances />
      <WireInstances />
    </group>
  );
};

export default ShiftStructure;
