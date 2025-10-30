"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ANIMATION_CONFIG } from "@/config/animation";
import { useScrollStore } from "@/store/scrollStore";
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";

const ScrollController = () => {
  const setProgress = useScrollStore((state) => state.setProgress);

  useEffect(() => {
    const lenis = new Lenis({
      smoothWheel: ANIMATION_CONFIG.scroll.smooth,
      lerp: ANIMATION_CONFIG.scroll.lerp,
      wheelMultiplier: ANIMATION_CONFIG.scroll.multiplier,
    });

    let rafId = 0;

    const computeProgress = (scroll: number, limit: number) => {
      if (limit <= 0) {
        return 0;
      }
      const ratio = Math.min(Math.max(scroll / limit, 0), 1);
      return ratio >= 0.999 ? 1 : ratio;
    };

    const onScroll = (event: { scroll: number; limit: number }) => {
      const scroll = event?.scroll ?? lenis.scroll ?? 0;
      const limit = event?.limit ?? lenis.limit ?? 0;
      setProgress(computeProgress(scroll, limit));
    };

    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    const unsubscribeMultiplier = useScrollMultiplierStore.subscribe(() => {
      lenis.resize();
      const scroll = lenis.scroll ?? 0;
      const limit = lenis.limit ?? 0;
      setProgress(computeProgress(scroll, limit));
    });

    const scroll = lenis.scroll ?? 0;
    const limit = lenis.limit ?? 0;
    setProgress(computeProgress(scroll, limit));

    document.documentElement.classList.add("lenis-ready");

    return () => {
      lenis.off("scroll", onScroll);
      cancelAnimationFrame(rafId);
      unsubscribeMultiplier();
      lenis.destroy();
      document.documentElement.classList.remove("lenis-ready");
    };
  }, [setProgress]);

  return null;
};

export default ScrollController;
