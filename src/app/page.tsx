"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect } from "react";
import ScrollController from "@/components/ScrollController";
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";

// 本番シーンとデバッグシーンの切り替え
const USE_DEBUG_SCENE = false; // true: デバッグシーン, false: 本番シーン

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

  // 本番シーンではスクロールバーを非表示
  useEffect(() => {
    if (!USE_DEBUG_SCENE) {
      document.body.classList.add("hide-scrollbar");
    } else {
      document.body.classList.remove("hide-scrollbar");
    }

    return () => {
      document.body.classList.remove("hide-scrollbar");
    };
  }, []);

  // デバッグシーンではscrollMultiplierを使用、本番シーンでは固定
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
    </main>
  );
};

export default Home;
