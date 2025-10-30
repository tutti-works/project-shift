"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect } from "react";
import ScrollController from "@/components/ScrollController";
import { ScrollIndicator } from "@/components/ScrollIndicator";
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

      <article style={pageStyle} className="pointer-events-none relative z-10 flex flex-col justify-between">
        <section className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-24 pt-32 md:px-10">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SHIFT
          </h1>
        </section>

        <section className="pointer-events-auto mx-auto w-full max-w-4xl space-y-6 px-6 pb-32 md:px-10">
          <h2 className="text-xl font-semibold text-zinc-200">
            Ryusei Asakawa
          </h2>
        </section>
      </article>

      {!USE_DEBUG_SCENE && <ScrollIndicator />}
    </main>
  );
};

export default Home;
