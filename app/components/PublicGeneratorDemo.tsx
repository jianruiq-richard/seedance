"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  calculateCreditCost,
  calculateImageCreditCost,
  DEFAULT_SEEDANCE_MODEL,
  DEFAULT_SEEDREAM_MODEL,
  imageSizes,
  resolutions,
  seedanceModels,
  seedreamModels,
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

type GenerationProduct = "video" | "image";
type MediaKind = "image" | "video" | "audio";

type PreviewReference = {
  id: string;
  name: string;
  url: string;
  kind: MediaKind;
};

function normalizeRatio(value: string): RatioKey {
  return value === "adaptive" ? "16:9" : (value as RatioKey);
}

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function imageSizeToAspect(size: string) {
  if (size === "1K" || size === "2K") return { width: 1, height: 1 };
  const [width, height] = size.split("x").map(Number);
  return width && height ? { width, height } : { width: 1, height: 1 };
}

export default function PublicGeneratorDemo() {
  const { isSignedIn } = useUser();
  const [generationProduct, setGenerationProduct] =
    useState<GenerationProduct>("video");
  const [model, setModel] = useState<string>(DEFAULT_SEEDANCE_MODEL);
  const [imageModel, setImageModel] = useState<string>(DEFAULT_SEEDREAM_MODEL);
  const [prompt, setPrompt] = useState(
    "A cinematic product reveal using the uploaded image as the main subject, with slow camera movement, soft reflections, and ambient sound design."
  );
  const [duration, setDuration] = useState<number>(4);
  const [ratio, setRatio] = useState<string>("16:9");
  const [resolution, setResolution] = useState<(typeof resolutions)[number]>(
    "480p"
  );
  const [imageSize, setImageSize] =
    useState<(typeof imageSizes)[number]>("1K");
  const [imageOutputFormat, setImageOutputFormat] =
    useState<"jpeg" | "png">("jpeg");
  const [seed, setSeed] = useState<number>(-1);
  const [watermark, setWatermark] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [groupImages, setGroupImages] = useState<boolean>(false);
  const [webSearch, setWebSearch] = useState<boolean>(false);
  const [references, setReferences] = useState<PreviewReference[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);

  const imageReferences = references.filter((item) => item.kind === "image");
  const visibleReferences =
    generationProduct === "image" ? imageReferences : references;

  const availableResolutions = useMemo(
    () =>
      model === "doubao-seedance-2-0-fast-260128"
        ? resolutions.filter((item) => item !== "1080p")
        : resolutions,
    [model]
  );

  const aspectSize = useMemo(
    () =>
      generationProduct === "image"
        ? imageSizeToAspect(imageSize)
        : ratioSizeMap[normalizeRatio(ratio)],
    [generationProduct, imageSize, ratio]
  );

  const pricing = useMemo(
    () =>
      generationProduct === "image"
        ? calculateImageCreditCost({
            model: imageModel,
            size: imageSize,
            hasReferenceImage: imageReferences.length > 0,
          })
        : calculateCreditCost({
            resolution,
            ratio,
            duration,
            generateAudio,
            model,
          }),
    [
      duration,
      generateAudio,
      generationProduct,
      imageModel,
      imageReferences.length,
      imageSize,
      model,
      ratio,
      resolution,
    ]
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
      )
      .filter((item) => generationProduct === "video" || item.kind === "image");

    if (nextFiles.length === 0) {
      setNotice(
        generationProduct === "image"
          ? "Upload an image reference."
          : "Upload an image, video, or audio file."
      );
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

  const firstReference = visibleReferences[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">
            Creative Mode
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {generationProduct === "video"
              ? "Video Generation"
              : "Image Generation"}
          </h2>
          <p className="mt-1 text-xs text-white/55">
            Prepare a draft, then sign in to generate
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1">
          {[
            ["video", "Video"],
            ["image", "Image"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                generationProduct === value
                  ? "bg-white text-[#080a0f]"
                  : "text-white/65 hover:text-white"
              }`}
              type="button"
              onClick={() => setGenerationProduct(value as GenerationProduct)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-white/50">
              <span>References</span>
              <span>{visibleReferences.length} added</span>
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
                accept={
                  generationProduct === "image"
                    ? "image/*"
                    : "image/*,video/*,audio/*"
                }
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
              <span className="mt-1 text-white/45">
                {generationProduct === "image"
                  ? "Image references"
                  : "Image, video, or audio"}
              </span>
            </label>

            {visibleReferences.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {visibleReferences.map((item) => (
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

          {generationProduct === "video" ? (
            <>
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
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Model
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
                  value={imageModel}
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    setImageModel(nextModel);
                    if (nextModel.includes("-pro-")) {
                      setGroupImages(false);
                      setWebSearch(false);
                    }
                  }}
                >
                  {seedreamModels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Size
                  </label>
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 outline-none"
                    value={imageSize}
                    onChange={(event) =>
                      setImageSize(event.target.value as typeof imageSize)
                    }
                  >
                    {imageSizes.map((item) => (
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
                  Output format
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["jpeg", "png"] as const).map((item) => (
                    <button
                      key={item}
                      className={`rounded-full border px-3 py-2 text-xs uppercase transition ${
                        imageOutputFormat === item
                          ? "border-white bg-white text-[#080a0f]"
                          : "border-white/18 text-white/68 hover:border-white/42"
                      }`}
                      type="button"
                      onClick={() => setImageOutputFormat(item)}
                    >
                      {item}
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
                  Group images
                  <input
                    type="checkbox"
                    checked={groupImages}
                    disabled={imageModel.includes("-pro-")}
                    onChange={(event) => setGroupImages(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  Web search
                  <input
                    type="checkbox"
                    checked={webSearch}
                    disabled={imageModel.includes("-pro-")}
                    onChange={(event) => setWebSearch(event.target.checked)}
                  />
                </label>
              </div>
            </>
          )}

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
              Draft
            </span>
          </div>
          <div
            className="relative mt-4 flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/25 sm:min-h-[360px]"
            style={{ aspectRatio: `${aspectSize.width}/${aspectSize.height}` }}
          >
            {firstReference ? (
              <>
                {firstReference.kind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="absolute inset-0 h-full w-full object-cover opacity-75"
                    src={firstReference.url}
                    alt={firstReference.name}
                  />
                )}
                {firstReference.kind === "video" && (
                  <video
                    className="absolute inset-0 h-full w-full object-cover opacity-75"
                    src={firstReference.url}
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
                {firstReference.kind === "audio" && (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(247,197,120,0.18),transparent_24rem),rgba(255,255,255,0.04)]">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/72">
                      Audio reference loaded
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/18 to-transparent" />
                <div className="relative z-10 mt-auto w-full p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f7c578]">
                    {generationProduct === "image"
                      ? "Image reference loaded"
                      : `${firstReference.kind} reference loaded`}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/82">
                    {prompt ||
                      (generationProduct === "image"
                        ? "Add a prompt to guide image composition and style."
                        : "Add a prompt to guide motion and camera style.")}
                  </p>
                </div>
              </>
            ) : generationProduct === "video" ? (
              <video
                className="h-full w-full bg-black object-contain"
                src="/samples/dark_barbie_compressed.mp4"
                poster="/samples/dark_barbie_poster.jpg"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgba(247,197,120,0.16),transparent_24rem),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]">
                <div className="max-w-sm px-6 text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f7c578]">
                    Seedream 5.0 preview
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    Draft an image prompt, choose Pro or Lite, then continue in
                    the studio to generate and save outputs.
                  </p>
                </div>
              </div>
            )}
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
                {isSignedIn
                  ? "Continue in the studio"
                  : "No saved generations on this page"}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/50">
                {isSignedIn
                  ? "Your full generation log combines image and video outputs in one timeline inside /app."
                  : "Sign in and generate from the studio to save images, videos, history, and downloads."}
              </p>
            </div>
          </div>
          <button
            className="mt-4 w-full rounded-full border border-white/18 px-4 py-2 text-xs font-semibold text-white/72 transition hover:border-white/42 hover:text-white"
            type="button"
            onClick={() => {
              window.location.href = isSignedIn
                ? "/app"
                : "/sign-in?redirect_url=/app";
            }}
          >
            {isSignedIn ? "Open saved history" : "Sign in to view history"}
          </button>
        </div>
      </section>
    </div>
  );
}
