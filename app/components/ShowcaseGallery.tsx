"use client";

import { useEffect, useState } from "react";

type ShowcaseItem = {
  id: string;
  title: string;
  posterUrl: string;
  videoUrl: string;
  aspectRatio?: string;
};

function normalizeItems(value: unknown): ShowcaseItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is ShowcaseItem => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      typeof record.title === "string" &&
      typeof record.posterUrl === "string" &&
      typeof record.videoUrl === "string"
    );
  });
}

export default function ShowcaseGallery() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [activeItem, setActiveItem] = useState<ShowcaseItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/samples/showcases.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) {
          setItems(normalizeItems(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/52">
          Showcase assets are not uploaded yet.
        </div>
      ) : (
        <div
          className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
          role="list"
        >
          {items.map((item) => (
            <button
              key={item.id}
              className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-black/35 text-left shadow-lg transition hover:border-white/22 hover:shadow-2xl"
              type="button"
              onClick={() => setActiveItem(item)}
              role="listitem"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  src={item.posterUrl}
                  alt={item.title}
                  loading="lazy"
                />
                <div className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/30">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-lg text-[#080a0f] shadow-lg transition group-hover:scale-110">
                    ▶
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={() => setActiveItem(null)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0b0c10] p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4 px-1">
              <h3 className="text-sm font-semibold text-white">
                {activeItem.title}
              </h3>
              <button
                className="rounded-full border border-white/16 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                type="button"
                onClick={() => setActiveItem(null)}
              >
                Close
              </button>
            </div>
            <video
              className="max-h-[80vh] w-full rounded-xl bg-black"
              src={activeItem.videoUrl}
              poster={activeItem.posterUrl}
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
