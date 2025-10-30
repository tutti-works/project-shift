import { useMemo } from "react";
import { BoxGeometry } from "three";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";

export const useBladeGeometry = (thickness: number): BoxGeometry =>
  useMemo(
    () =>
      new BoxGeometry(
        toSceneUnits(ANIMATION_CONFIG.blade.width),
        toSceneUnits(ANIMATION_CONFIG.blade.height),
        toSceneUnits(thickness),
        1,
        ANIMATION_CONFIG.blade.heightSegments,
        1,
      ),
    [thickness],
  );
