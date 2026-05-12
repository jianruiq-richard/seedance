"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const SampleVideoPreview = lazy(() => import("./SampleVideoPreview"));
type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function SamplePreviewSkeleton() {
  return (
    <div className="mt-4">
      <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-500/15 to-cyan-400/20 sm:h-64">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_25%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative flex h-full items-center justify-center p-6 text-center text-white">
          <div className="max-w-sm">
            <div className="mb-4 text-5xl opacity-80" aria-hidden="true">
              🎬
            </div>
            <h3 className="mb-2 text-base font-semibold leading-tight">
              AI Generated Sample Video
            </h3>
            <p className="text-xs leading-relaxed text-white/70">
              High-quality AI video generation demo
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-white/70">
        <div className="flex items-center justify-between gap-4">
          <span>Prompt</span>
          <span className="max-w-[200px] truncate text-right text-white/60">
            AI Generated Sample Video
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Style</span>
          <span className="text-white/60">Professional Showcase</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Duration</span>
          <span className="text-white/60">Preview</span>
        </div>
      </div>
    </div>
  );
}

export default function DeferredSampleVideoPreview() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const loadPreview = () => setShouldLoad(true);
    const idleWindow = window as IdleWindow;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(loadPreview, { timeout: 1800 });
    } else {
      timeoutHandle = setTimeout(loadPreview, 900);
    }

    return () => {
      if (
        idleHandle !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };
  }, []);

  if (!shouldLoad) {
    return <SamplePreviewSkeleton />;
  }

  return (
    <Suspense fallback={<SamplePreviewSkeleton />}>
      <SampleVideoPreview />
    </Suspense>
  );
}
