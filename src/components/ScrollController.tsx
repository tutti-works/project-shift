"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ANIMATION_CONFIG } from "@/config/animation";
import { useScrollStore } from "@/store/scrollStore";

const ScrollController = () => {
  const setProgress = useScrollStore((state) => state.setProgress);

  useEffect(() => {
    const lenis = new Lenis({
      smoothWheel: ANIMATION_CONFIG.scroll.smooth,
      lerp: ANIMATION_CONFIG.scroll.lerp,
      wheelMultiplier: ANIMATION_CONFIG.scroll.multiplier,
    });

    let rafId = 0;

    const onScroll = (event: { progress: number }) => {
      setProgress(event?.progress ?? 0);
    };

    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    document.documentElement.classList.add("lenis-ready");

    return () => {
      lenis.off("scroll", onScroll);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.documentElement.classList.remove("lenis-ready");
    };
  }, [setProgress]);

  return null;
};

export default ScrollController;
