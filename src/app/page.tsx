"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import ScrollController from "@/components/ScrollController";
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";

const BladeDebugScene = dynamic(
  () => import("@/components/BladeDebugScene"),
  {
    ssr: false,
  },
);

const Home = () => {
  const scrollMultiplier = useScrollMultiplierStore(
    (state) => state.scrollMultiplier,
  );

  // ページの高さを scrollMultiplier に応じて動的に計算
  // 100vh(固定) + (100vh × scrollMultiplier)(スクロール可能領域)
  const pageHeight = useMemo(() => {
    const baseHeight = 100; // 100vh
    const scrollableHeight = baseHeight * scrollMultiplier;
    return baseHeight + scrollableHeight; // vh単位
  }, [scrollMultiplier]);

  const pageStyle = useMemo(
    () => ({
      minHeight: `${pageHeight}vh`,
    }),
    [pageHeight],
  );

  return (
    <main style={pageStyle} className="relative overflow-hidden bg-black text-white">
      <ScrollController />

      <div className="fixed inset-0 h-screen w-screen">
        <BladeDebugScene />
      </div>

      <article style={pageStyle} className="pointer-events-none relative z-10 flex flex-col justify-between">
        <section className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-24 pt-32 md:px-10">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-400">
            Prototype
          </span>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SHIFT - Single Blade Study
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
            Scroll to drive the current bending shader on a single unit. This
            debug scene keeps the camera static and isolates one blade so we
            can validate deformation behaviour before layering additional
            elements.
          </p>
          <p className="max-w-2xl text-sm uppercase tracking-[0.2em] text-zinc-500">
            Scroll to bend the blade
          </p>
        </section>

        <section className="pointer-events-auto mx-auto w-full max-w-4xl space-y-6 px-6 pb-24 md:px-10">
          <h2 className="text-xl font-semibold text-zinc-200">
            Debug roadmap
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed text-zinc-400 md:text-base">
            <li>
              Step&nbsp;1 - Validate single-blade bending response.
            </li>
            <li>
              Step&nbsp;2 - Restore ribbon and wire logic once bending is
              correct.
            </li>
            <li>
              Step&nbsp;3 - Re-enable full instanced structure and camera
              choreography.
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
};

export default Home;
