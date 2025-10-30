import { MutableRefObject, useEffect, useRef } from "react";
import { DirectionalLight } from "three";
import { GUI } from "lil-gui";
import { useBladeConfigStore } from "@/store/bladeConfigStore";
import { useRibbonConfigStore } from "@/store/ribbonConfigStore";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { degToRad, radToDeg } from "./utils";

type DebugController = ReturnType<GUI["add"]>;

type BladeDebugControlsProps = {
  directionalLightRef: MutableRefObject<DirectionalLight | null>;
  wireThicknessRef: MutableRefObject<number>;
  showNormals: boolean;
  onToggleNormals: (value: boolean) => void;
  showAxes: boolean;
  onToggleAxes: (value: boolean) => void;
  showShadowHelper: boolean;
  onToggleShadowHelper: (value: boolean) => void;
};

const BladeDebugControls = ({
  directionalLightRef,
  wireThicknessRef,
  showNormals,
  onToggleNormals,
  showAxes,
  onToggleAxes,
  showShadowHelper,
  onToggleShadowHelper,
}: BladeDebugControlsProps) => {
  const bladeThickness = useBladeConfigStore((state) => state.bladeThickness);
  const setBladeThickness = useBladeConfigStore((state) => state.setBladeThickness);

  const twistAngleAtRest = useRibbonConfigStore((state) => state.twistAngleAtRest);
  const twistAngleAtMax = useRibbonConfigStore((state) => state.twistAngleAtMax);
  const setTwistAngleAtRest = useRibbonConfigStore((state) => state.setTwistAngleAtRest);
  const setTwistAngleAtMax = useRibbonConfigStore((state) => state.setTwistAngleAtMax);

  const ambientIntensity = useBladeShadeStore((state) => state.ambientIntensity);
  const specularIntensity = useBladeShadeStore((state) => state.specularIntensity);
  const specularPower = useBladeShadeStore((state) => state.specularPower);
  const setAmbientIntensity = useBladeShadeStore((state) => state.setAmbientIntensity);
  const setSpecularIntensity = useBladeShadeStore((state) => state.setSpecularIntensity);
  const setSpecularPower = useBladeShadeStore((state) => state.setSpecularPower);

  const guiRef = useRef<GUI | null>(null);
  const guiParamsRef = useRef({
    wireThickness: 10,
    bladeThickness: ANIMATION_CONFIG.blade.thickness,
    ribbonRestAngleDeg: radToDeg(twistAngleAtRest),
    ribbonMaxAngleDeg: radToDeg(twistAngleAtMax),
    ambientIntensity,
    specularIntensity,
    specularPower,
    lightIntensity: 1.4,
    showNormals,
    showAxes,
    showShadowHelper,
  });
  const guiControllersRef = useRef<{
    wireThickness?: DebugController;
    bladeThickness?: DebugController;
    ribbonRestAngleDeg?: DebugController;
    ribbonMaxAngleDeg?: DebugController;
    ambientIntensity?: DebugController;
    specularIntensity?: DebugController;
    specularPower?: DebugController;
    lightIntensity?: DebugController;
    showNormals?: DebugController;
    showAxes?: DebugController;
    showShadowHelper?: DebugController;
  }>({});

  useEffect(() => {
    if (guiRef.current) {
      return;
    }

    const gui = new GUI({ title: "Debug Controls" });
    guiRef.current = gui;

    const params = guiParamsRef.current;
    params.wireThickness = wireThicknessRef.current;
    params.bladeThickness = useBladeConfigStore.getState().bladeThickness;
    params.ribbonRestAngleDeg = radToDeg(useRibbonConfigStore.getState().twistAngleAtRest);
    params.ribbonMaxAngleDeg = radToDeg(useRibbonConfigStore.getState().twistAngleAtMax);
    params.ambientIntensity = useBladeShadeStore.getState().ambientIntensity;
    params.specularIntensity = useBladeShadeStore.getState().specularIntensity;
    params.specularPower = useBladeShadeStore.getState().specularPower;
    params.lightIntensity = directionalLightRef.current?.intensity ?? params.lightIntensity;
    params.showNormals = showNormals;
    params.showAxes = showAxes;
    params.showShadowHelper = showShadowHelper;

    const wireController = gui
      .add(params, "wireThickness", 0.5, 20, 0.1)
      .name("Wire Thickness (mm)")
      .onChange((value: number) => {
        wireThicknessRef.current = value;
        guiParamsRef.current.wireThickness = value;
      });

    const bladeController = gui
      .add(params, "bladeThickness", 1, 60, 1)
      .name("Blade Thickness (mm)")
      .onChange((value: number) => {
        guiParamsRef.current.bladeThickness = value;
        setBladeThickness(value);
      });

    const ribbonRestController = gui
      .add(params, "ribbonRestAngleDeg", -180, 180, 0.5)
      .name("Ribbon Twist (deg, rest)")
      .onChange((value: number) => {
        guiParamsRef.current.ribbonRestAngleDeg = value;
        setTwistAngleAtRest(degToRad(value));
      });

    const ribbonMaxController = gui
      .add(params, "ribbonMaxAngleDeg", -180, 360, 0.5)
      .name("Ribbon Twist (deg, max)")
      .onChange((value: number) => {
        guiParamsRef.current.ribbonMaxAngleDeg = value;
        setTwistAngleAtMax(degToRad(value));
      });

    const lightingFolder = gui.addFolder("Lighting");

    const ambientController = lightingFolder
      .add(params, "ambientIntensity", 0, 1.5, 0.01)
      .name("Ambient Intensity")
      .onChange((value: number) => {
        guiParamsRef.current.ambientIntensity = value;
        setAmbientIntensity(value);
      });

    const specularIntensityController = lightingFolder
      .add(params, "specularIntensity", 0, 1, 0.01)
      .name("Specular Intensity")
      .onChange((value: number) => {
        guiParamsRef.current.specularIntensity = value;
        setSpecularIntensity(value);
      });

    const specularPowerController = lightingFolder
      .add(params, "specularPower", 1, 256, 1)
      .name("Specular Power")
      .onChange((value: number) => {
        guiParamsRef.current.specularPower = value;
        setSpecularPower(value);
      });

    const lightIntensityController = lightingFolder
      .add(params, "lightIntensity", 0, 5, 0.05)
      .name("Directional Intensity")
      .onChange((value: number) => {
        guiParamsRef.current.lightIntensity = value;
        const light = directionalLightRef.current;
        if (light) {
          light.intensity = value;
        }
      });

    const showNormalsController = gui
      .add(params, "showNormals")
      .name("Show Normals")
      .onChange((value: boolean) => {
        guiParamsRef.current.showNormals = value;
        onToggleNormals(value);
      });

    const showAxesController = gui
      .add(params, "showAxes")
      .name("Show Axes")
      .onChange((value: boolean) => {
        guiParamsRef.current.showAxes = value;
        onToggleAxes(value);
      });

    const showShadowHelperController = gui
      .add(params, "showShadowHelper")
      .name("Show Shadow Helper")
      .onChange((value: boolean) => {
        guiParamsRef.current.showShadowHelper = value;
        onToggleShadowHelper(value);
      });

    lightingFolder.open();

    guiControllersRef.current = {
      wireThickness: wireController,
      bladeThickness: bladeController,
      ribbonRestAngleDeg: ribbonRestController,
      ribbonMaxAngleDeg: ribbonMaxController,
      ambientIntensity: ambientController,
      specularIntensity: specularIntensityController,
      specularPower: specularPowerController,
      lightIntensity: lightIntensityController,
      showNormals: showNormalsController,
      showAxes: showAxesController,
      showShadowHelper: showShadowHelperController,
    };

    gui.domElement.style.zIndex = "20";

    return () => {
      guiControllersRef.current = {};
      gui.destroy();
      guiRef.current = null;
    };
    // We intentionally run this effect only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDisplay = (controller?: DebugController) => {
    if (controller && typeof controller.updateDisplay === "function") {
      controller.updateDisplay();
    }
  };

  useEffect(() => {
    guiParamsRef.current.bladeThickness = bladeThickness;
    updateDisplay(guiControllersRef.current.bladeThickness);
  }, [bladeThickness]);

  useEffect(() => {
    guiParamsRef.current.ribbonRestAngleDeg = radToDeg(twistAngleAtRest);
    updateDisplay(guiControllersRef.current.ribbonRestAngleDeg);
  }, [twistAngleAtRest]);

  useEffect(() => {
    guiParamsRef.current.ribbonMaxAngleDeg = radToDeg(twistAngleAtMax);
    updateDisplay(guiControllersRef.current.ribbonMaxAngleDeg);
  }, [twistAngleAtMax]);

  useEffect(() => {
    guiParamsRef.current.ambientIntensity = ambientIntensity;
    updateDisplay(guiControllersRef.current.ambientIntensity);
  }, [ambientIntensity]);

  useEffect(() => {
    guiParamsRef.current.specularIntensity = specularIntensity;
    updateDisplay(guiControllersRef.current.specularIntensity);
  }, [specularIntensity]);

  useEffect(() => {
    guiParamsRef.current.specularPower = specularPower;
    updateDisplay(guiControllersRef.current.specularPower);
  }, [specularPower]);

  useEffect(() => {
    guiParamsRef.current.showNormals = showNormals;
    updateDisplay(guiControllersRef.current.showNormals);
  }, [showNormals]);

  useEffect(() => {
    guiParamsRef.current.showAxes = showAxes;
    updateDisplay(guiControllersRef.current.showAxes);
  }, [showAxes]);

  useEffect(() => {
    guiParamsRef.current.showShadowHelper = showShadowHelper;
    updateDisplay(guiControllersRef.current.showShadowHelper);
  }, [showShadowHelper]);

  return null;
};

export default BladeDebugControls;
