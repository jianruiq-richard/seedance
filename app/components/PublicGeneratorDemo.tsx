"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  calculateCreditCost,
  DEFAULT_SEEDANCE_MODEL,
  resolutions,
  seedanceModels,
  type RatioKey,
} from "../lib/credits";

const ratios = [
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
  { label: "9:16", value: "9:16" },
  { label: "21:9", value: "21:9" },
  { label: "Adaptive", value: "adaptive" },
];

const durations = [4, 5, 6, 8, 10, 12, 15];

const ratioSizeMap: Record<RatioKey, { width: number; height: number }> = {
  "16:9": { width: 960, height: 540 },
  "9:16": { width: 540, height: 960 },
  "1:1": { width: 720, height: 720 },
  "4:3": { width: 800, height: 600 },
  "3:4": { width: 600, height: 800 },
  "21:9": { width: 1260, height: 540 },
};

type PreviewImage = {
  id: string;
  name: string;
  url: string;
  kind: MediaKind;
};

type MediaKind = "image" | "video" | "audio";

function normalizeRatio(value: string): RatioKey {
  return value === "adaptive" ? "16:9" : (value as RatioKey);
}

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

export default function PublicGeneratorDemo() {
  const { isSignedIn } = useUser();
  const [model, setModel] = useState<string>(DEFAULT_SEEDANCE_MODEL);
  const [prompt, setPrompt] = useState(
    "A cinematic product reveal using the uploaded image as the main subject, with slow camera movement, soft reflections, and ambient sound design."
  );
  const [duration, setDuration] = useState<number>(4);
  const [ratio, setRatio] = useState<string>("16:9");
  const [resolution, setResolution] = useState<(typeof resolutions)[number]>(
    "480p"
  );
  const [seed, setSeed] = useState<number>(-1);
  const [watermark, setWatermark] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [returnLastFrame, setReturnLastFrame] = useState<boolean>(false);
  const [executionExpiresAfter, setExecutionExpiresAfter] =
    useState<number>(172800);
  const [references, setReferences] = useState<PreviewImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);

  const availableResolutions = useMemo(
    () =>
      model === "doubao-seedance-2-0-fast-260128"
        ? resolutions.filter((item) => item !== "1080p")
        : resolutions,
    [model]
  );

  const aspectSize = useMemo(
    () => ratioSizeMap[normalizeRatio(ratio)],
    [ratio]
  );

  const pricing = useMemo(
    () =>
      calculateCreditCost({
        resolution,
        ratio,
        duration,
        generateAudio,
        model,
      }),
    [duration, generateAudio, model, ratio, resolution]
  );

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = [];
    };
  }, []);

  const addReferences = (files: FileList | File[]) => {
    const nextFiles = Array.from(files)
      .map((file) => ({ file, kind: getMediaKind(file) }))
      .filter(
        (item): item is { file: File; kind: MediaKind } => item.kind !== null
      );

    if (nextFiles.length === 0) {
      setNotice("Upload an image, video, or audio file.");
      return;
    }

    setReferences((previous) => {
      const nextReferences = nextFiles.map(({ file, kind }) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          url,
          kind,
        };
      });

      setNotice(null);

      return [...previous, ...nextReferences];
    });
  };

  const removeReference = (id: string) => {
    setReferences((previous) => {
      const removed = previous.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
        objectUrls.current = objectUrls.current.filter(
          (url) => url !== removed.url
        );
      }
      return previous.filter((item) => item.id !== id);
    });
  };

  const handleGenerate = () => {
    if (!isSignedIn) {
      setNotice("Sign in is required before generation. Draft inputs are not saved.");
      window.setTimeout(() => {
        window.location.href = "/sign-in?redirect_url=/app";
      }, 350);
      return;
    }

    window.location.href = "/app";
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
            AI Model
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Seedance 2.0 With Audio
          </h2>
          <p className="mt-1 text-xs text-white/55">
            Prepare a draft, then sign in to generate
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-white/50">
              <span>References</span>
              <span>{references.length} added</span>
            </div>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center text-xs transition ${
                dragActive
                  ? "border-white/70 bg-white/8 text-white"
                  : "border-white/18 bg-black/25 text-white/58 hover:border-white/42"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                addReferences(event.dataTransfer.files);
              }}
            >
              <input
                className="hidden"
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={(event) => {
                  if (event.target.files) {
                    addReferences(event.target.files);
                  }
                  event.target.value = "";
                }}
              />
              <span className="font-semibold text-white/80">
                Click to upload or drag and drop
              </span>
              <span className="mt-1 text-white/45">Image, video, or audio</span>
            </label>

            {references.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {references.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/25"
                  >
                    {item.kind === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="h-full w-full object-cover"
                        src={item.url}
                        alt={item.name}
                      />
                    )}
                    {item.kind === "video" && (
                      <video
                        className="h-full w-full object-cover"
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}
                    {item.kind === "audio" && (
                      <div className="grid h-full w-full place-items-center text-xs text-white/58">
                        Audio
                      </div>
                    )}
                    <button
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white transition hover:bg-black"
                      type="button"
                      onClick={() => removeReference(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-white/50">
              <span>Prompt</span>
              <span>{prompt.length}/5000</span>
            </div>
            <textarea
              className="h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white/82 outline-none transition focus:border-white/35"
              maxLength={5000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">
              Model
            </label>
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
              value={model}
              onChange={(event) => {
                const nextModel = event.target.value;
                setModel(nextModel);
                if (
                  nextModel === "doubao-seedance-2-0-fast-260128" &&
                  resolution === "1080p"
                ) {
                  setResolution("720p");
                }
              }}
            >
              {seedanceModels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                Resolution
              </label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
                value={resolution}
                onChange={(event) =>
                  setResolution(event.target.value as typeof resolution)
                }
              >
                {availableResolutions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                Seed (-1 random)
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
                type="number"
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">
              Ratio
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ratios.map((item) => (
                <button
                  key={item.value}
                  className={`rounded-full border px-3 py-2 text-xs transition ${
                    ratio === item.value
                      ? "border-white bg-white text-[#080a0f]"
                      : "border-white/18 text-white/68 hover:border-white/42"
                  }`}
                  type="button"
                  onClick={() => setRatio(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">
              Duration (seconds)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {durations.map((item) => (
                <button
                  key={item}
                  className={`rounded-full border px-3 py-2 text-xs transition ${
                    duration === item
                      ? "border-white bg-white text-[#080a0f]"
                      : "border-white/18 text-white/68 hover:border-white/42"
                  }`}
                  type="button"
                  onClick={() => setDuration(item)}
                >
                  {item}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
            <label className="flex items-center justify-between gap-3">
              Watermark
              <input
                type="checkbox"
                checked={watermark}
                onChange={(event) => setWatermark(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              Generate audio
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(event) => setGenerateAudio(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              Return last frame
              <input
                type="checkbox"
                checked={returnLastFrame}
                onChange={(event) => setReturnLastFrame(event.target.checked)}
              />
            </label>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">
              Execution expires after (seconds)
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
              type="number"
              min={3600}
              max={259200}
              value={executionExpiresAfter}
              onChange={(event) =>
                setExecutionExpiresAfter(Number(event.target.value))
              }
            />
          </div>

          <button
            className="w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-center text-sm font-semibold text-[#080a0f] transition hover:bg-[#ffd895]"
            type="button"
            onClick={handleGenerate}
          >
            {"error" in pricing
              ? "Sign in to generate"
              : `Generate (${pricing.credits} credits)`}
          </button>

          {notice && (
            <p className="text-xs leading-5 text-[#f7c578]">{notice}</p>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/18 p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-white/58">
            <span>Preview</span>
            <span className="rounded-full border border-white/18 px-2 py-1">
              Ready
            </span>
          </div>
          <div
            className="relative mt-4 flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/25 sm:min-h-[360px]"
            style={{ aspectRatio: `${aspectSize.width}/${aspectSize.height}` }}
          >
            {references[0] ? (
              <>
                {references[0].kind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="absolute inset-0 h-full w-full object-cover opacity-75"
                    src={references[0].url}
                    alt={references[0].name}
                  />
                )}
                {references[0].kind === "video" && (
                  <video
                    className="absolute inset-0 h-full w-full object-cover opacity-75"
                    src={references[0].url}
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
                {references[0].kind === "audio" && (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(247,197,120,0.18),transparent_24rem),rgba(255,255,255,0.04)]">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/72">
                      Audio reference loaded
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/18 to-transparent" />
                <div className="relative z-10 mt-auto w-full p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f7c578]">
                    {references[0].kind} reference loaded
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/82">
                    {prompt || "Add a prompt to guide motion and camera style."}
                  </p>
                </div>
              </>
            ) : (
              <video
                className="h-full w-full bg-black object-contain"
                src="/samples/dark_barbie_sound_1080.mp4"
                poster="/samples/dark_barbie_poster.jpg"
                controls
                playsInline
                preload="metadata"
              />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/52">
            <div className="flex flex-wrap gap-3">
              <span>Ratio: {ratio}</span>
              <span>Duration: {duration}s</span>
              <span>Resolution: {resolution}</span>
            </div>
            <span>
              {"error" in pricing ? "Estimate unavailable" : `${pricing.credits} credits`}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/18 p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Generation history</span>
            <span>{isSignedIn ? "Open studio for live history" : "Sign in required"}</span>
          </div>
          <div className="mt-4 max-h-[360px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.035] p-4 text-sm">
              <p className="font-semibold text-white">
                {isSignedIn ? "Continue in the studio" : "No saved generations on this page"}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/50">
                {isSignedIn
                  ? "Your full generation log, video playback, downloads, and lazy-loaded history are available in /app below the preview panel."
                  : "Sign in and generate from the studio to save videos, load more history, and download completed outputs."}
              </p>
            </div>
          </div>
          <button
            className="mt-4 w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold text-white/72 transition hover:border-white/42 hover:text-white"
            type="button"
            onClick={() => {
              window.location.href = isSignedIn ? "/app" : "/sign-in?redirect_url=/app";
            }}
          >
            {isSignedIn ? "Open saved history" : "Sign in to view history"}
          </button>
        </div>
      </section>
    </div>
  );
}
