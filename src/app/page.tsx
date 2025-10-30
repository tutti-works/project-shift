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
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            SHIFT
          </h1>
        </section>

        <section className="pointer-events-auto mx-auto w-full max-w-4xl space-y-6 px-6 pb-24 md:px-10">
          <h2 className="text-xl font-semibold text-zinc-200">
            Ryusei Asakawa
          </h2>
        </section>
      </article>
    </main>
  );
};

export default Home;
