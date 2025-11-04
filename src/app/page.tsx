"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect } from "react";
import ScrollController from "@/components/ScrollController";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { CameraSwitcher } from "@/components/CameraSwitcher";
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";
import { useMouseStore } from "@/store/mouseStore";

// Toggle between the production and debug scenes
const USE_DEBUG_SCENE = false; // true: debug scene, false: production scene
const Scene = dynamic(
  () => USE_DEBUG_SCENE
    ? import("@/components/BladeDebugScene")
    : import("@/components/Scene"),
  {
    ssr: false,
  },
);

const Home = () => {
  const scrollMultiplier = useScrollMultiplierStore(
    (state) => state.scrollMultiplier,
  );
  const setMousePosition = useMouseStore((state) => state.setMousePosition);
  const setTouchStart = useMouseStore((state) => state.setTouchStart);
  const setTouchEnd = useMouseStore((state) => state.setTouchEnd);
  const touchStartX = useMouseStore((state) => state.touchStartX);
  const touchStartY = useMouseStore((state) => state.touchStartY);

  // Track mouse position for camera orbit effect
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize to -1 to 1 range
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      setMousePosition(x, y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [setMousePosition]);

  // Track touch position for horizontal orbit on mobile
  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        setTouchStart(touch.clientX, touch.clientY);
        // Don't change camera position on touch start
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        // Calculate gesture angle
        const angle = Math.abs(Math.atan2(deltaY, deltaX) * (180 / Math.PI));

        // Horizontal swipe detection: angle close to 0° or 180° (±45°)
        const isHorizontalSwipe = angle < 45 || angle > 135;

        // Minimum movement threshold to avoid jitter
        const minMovement = 10;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (isHorizontalSwipe && totalMovement > minMovement) {
          // Use relative delta from touch start, not absolute position
          // Normalize delta to -1 to 1 range based on screen width
          const normalizedDelta = (deltaX / window.innerWidth) * 2;
          // Invert direction and increase sensitivity (3x)
          const orbitValue = -normalizedDelta * 3;
          // Clamp to reasonable range (-3 to 3 allows ±30 degrees)
          const clampedOrbit = Math.max(-3, Math.min(3, orbitValue));

          // Keep Y at 0 to disable vertical orbit on mobile
          setMousePosition(clampedOrbit, 0);
        }
      }
    };

    const handleTouchEnd = () => {
      setTouchEnd();
      // Reset to neutral position when touch ends
      setMousePosition(0, 0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [setTouchStart, setTouchEnd, setMousePosition, touchStartX, touchStartY]);

  // Hide the scrollbar in the production scene
  useEffect(() => {
    const targets: HTMLElement[] = [document.body, document.documentElement];
    const shouldHideScrollbar = !USE_DEBUG_SCENE;

    targets.forEach((target) => {
      if (shouldHideScrollbar) {
        target.classList.add("hide-scrollbar");
      } else {
        target.classList.remove("hide-scrollbar");
      }
    });

    return () => {
      targets.forEach((target) => {
        target.classList.remove("hide-scrollbar");
      });
    };
  }, [USE_DEBUG_SCENE]);

  // Use scrollMultiplier in the debug scene and a fixed height in production
  const pageStyle = useMemo(() => {
    if (USE_DEBUG_SCENE) {
      const baseHeight = 100;
      const scrollableHeight = baseHeight * scrollMultiplier;
      return {
        minHeight: `${baseHeight + scrollableHeight}vh`,
      };
    }
    return {
      minHeight: "600vh",
    };
  }, [scrollMultiplier]);

  return (
    <main style={pageStyle} className="relative overflow-hidden bg-black text-white">
      <ScrollController />

      <div className="fixed inset-0 h-screen w-screen">
        <Scene />
      </div>

      {/* <article style={pageStyle} className="pointer-events-none relative z-10 flex flex-col justify-between">
        <section className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 pb-24 pt-32 md:px-10">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SHIFT
          </h1>
          <h2 className="text-xl font-semibold text-zinc-200">
            Ryusei Asakawa
          </h2>
        </section>
      </article> */}

      <article className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-start">
        <section className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 pb-24 pt-20 md:px-10">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SHIFT
          </h1>
          <h2 className="text-xl font-semibold text-zinc-200">
            Ryusei Asakawa
          </h2>
        </section>
      </article>

      <CameraSwitcher />

      {!USE_DEBUG_SCENE && <ScrollIndicator />}
    </main>
  );
};

export default Home;
