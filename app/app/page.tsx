"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";

const styles = [
  "Cinematic Glow",
  "Neo Noir",
  "Soft Portrait",
  "Retro Film",
  "Studio Product",
];

const ratios = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
];

const durations = [3, 6, 10];

type Mode = "text" | "image";

type RenderPayload = {
  mode: Mode;
  prompt: string;
  image?: HTMLImageElement | null;
  aspect: "16:9" | "9:16" | "1:1";
  duration: number;
  style: string;
};

const ratioSizeMap = {
  "16:9": { width: 960, height: 540 },
  "9:16": { width: 540, height: 960 },
  "1:1": { width: 720, height: 720 },
} as const;

export default function AppPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const isSignedIn = Boolean(user);
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState(
    "Neon city streets, slow motion, cinematic glow"
  );
  const [style, setStyle] = useState(styles[0]);
  const [duration, setDuration] = useState<number>(6);
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">(
    "idle"
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(Date.now());

  const [credits, setCredits] = useState<number>(100);

  useEffect(() => {
    const nextCredits =
      (user?.unsafeMetadata?.credits as number | undefined) ?? 100;
    setCredits(nextCredits);
  }, [user]);

  const cleanupUrls = useRef<string[]>([]);

  const aspectSize = useMemo(() => ratioSizeMap[aspect], [aspect]);

  useEffect(() => {
    return () => {
      cleanupUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupUrls.current = [];
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const nextUrl = URL.createObjectURL(imageFile);
    cleanupUrls.current.push(nextUrl);
    setImagePreview(nextUrl);
  }, [imageFile]);

  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!isSignedIn) {
      setErrorMessage("Please sign in to generate videos.");
      return;
    }
    if (credits < 100) {
      setErrorMessage("Not enough credits. Please top up to continue.");
      return;
    }
    setStatus("generating");
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    let imageElement: HTMLImageElement | null = null;
    if (mode === "image" && imagePreview) {
      imageElement = await loadImage(imagePreview);
    }

    try {
      const blob = await renderDemoVideo({
        mode,
        prompt,
        image: imageElement,
        aspect,
        duration,
        style,
      });

      const url = URL.createObjectURL(blob);
      cleanupUrls.current.push(url);
      setVideoUrl(url);
      setDownloadUrl(url);
      setStatus("ready");
      setSeed(Date.now());
      const updatedCredits = Math.max(credits - 100, 0);
      setCredits(updatedCredits);
      const usageLog =
        (user?.unsafeMetadata?.creditUsage as
          | { at: string; amount: number; note?: string }[]
          | undefined) ?? [];
      await user?.update({
        unsafeMetadata: {
          ...user?.unsafeMetadata,
          credits: updatedCredits,
          creditUsage: [
            ...usageLog,
            {
              at: new Date().toISOString(),
              amount: -100,
              note: `Generate (${mode})`,
            },
          ].slice(-50),
        },
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Generation failed, try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="border-b border-white/10 bg-[#0c0f18]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]" />
            <span className="text-lg font-semibold">Seedance Studio</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <Link className="hover:text-white" href="/">
              Home
            </Link>
            {isSignedIn ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 md:flex">
                  <span className="text-white/60">Credits</span>
                  <span className="font-semibold text-white">{credits}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "h-8 w-8",
                      },
                    }}
                  />
                  <button
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/60 hover:text-white"
                    onClick={() => signOut()}
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <Link
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/60 hover:text-white"
                href="/sign-in"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex gap-2 rounded-full bg-white/5 p-1 text-xs">
            <button
              className={`flex-1 rounded-full px-3 py-2 transition ${
                mode === "text" ? "bg-white text-[#0a0b10]" : "text-white/70"
              }`}
              onClick={() => setMode("text")}
              type="button"
            >
              Text to Video
            </button>
            <button
              className={`flex-1 rounded-full px-3 py-2 transition ${
                mode === "image" ? "bg-white text-[#0a0b10]" : "text-white/70"
              }`}
              onClick={() => setMode("image")}
              type="button"
            >
              Image to Video
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">
              Prompt
            </label>
            <textarea
              className="h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 outline-none focus:border-white/40"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            {mode === "image" && (
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Upload image
                </label>
                <input
                  className="w-full rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-xs text-white/70"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                />
                {imagePreview && (
                  <img
                    className="h-40 w-full rounded-2xl object-cover"
                    src={imagePreview}
                    alt="Preview"
                  />
                )}
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Style
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                >
                  {styles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Aspect ratio
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ratios.map((ratio) => (
                    <button
                      key={ratio.value}
                      className={`rounded-full border px-4 py-2 text-xs transition ${
                        aspect === ratio.value
                          ? "border-white bg-white text-[#0a0b10]"
                          : "border-white/20 text-white/70"
                      }`}
                      onClick={() =>
                        setAspect(ratio.value as "16:9" | "9:16" | "1:1")
                      }
                      type="button"
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Duration
                </label>
                <div className="mt-2 flex gap-2">
                  {durations.map((item) => (
                    <button
                      key={item}
                      className={`rounded-full border px-4 py-2 text-xs transition ${
                        duration === item
                          ? "border-white bg-white text-[#0a0b10]"
                          : "border-white/20 text-white/70"
                      }`}
                      onClick={() => setDuration(item)}
                      type="button"
                    >
                      {item}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="mt-2 w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleGenerate}
              type="button"
              disabled={status === "generating" || (mode === "image" && !imageFile)}
            >
              {status === "generating"
                ? "Generating..."
                : "Generate (100 credits)"}
            </button>

            {errorMessage && (
              <p className="text-xs text-rose-200">{errorMessage}</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Preview</span>
              <span className="rounded-full border border-white/20 px-2 py-1">
                {status === "generating" ? "Rendering" : "Ready"}
              </span>
            </div>
            <div
              className="mt-4 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20"
              style={{ aspectRatio: `${aspectSize.width}/${aspectSize.height}` }}
            >
              {videoUrl ? (
                <video
                  key={seed}
                  className="max-h-[360px] w-full rounded-2xl bg-black/40"
                  src={videoUrl}
                  controls
                  loop
                />
              ) : (
                <div className="text-center text-sm text-white/40">
                  Your result will appear here.
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
              <div className="flex gap-3">
                <span>Size: {aspect}</span>
                <span>Duration: {duration}s</span>
              </div>
              {downloadUrl && (
                <a
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0a0b10]"
                  href={downloadUrl}
                  download={`seedance-${mode}-${aspect}.webm`}
                >
                  Download video
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Generation log</span>
              <span>Most recent</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-white">
                  {mode === "text" ? "Text to Video" : "Image to Video"}
                </span>
                <span className="text-xs text-white/40">
                  {new Date().toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/50">{prompt}</p>
              <div className="mt-3 text-xs text-white/40">
                {style} · {aspect} · {duration}s
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function renderDemoVideo(payload: RenderPayload): Promise<Blob> {
  const { width, height } = ratioSizeMap[payload.aspect];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas recording is not supported.");
  }

  const stream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const totalMs = payload.duration * 1000;
  const start = performance.now();
  recorder.start();

  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / totalMs, 1);
      drawFrame(context, payload, width, height, progress);
      if (elapsed < totalMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });

  recorder.stop();

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  return new Blob(chunks, { type: mimeType });
}

function drawFrame(
  context: CanvasRenderingContext2D,
  payload: RenderPayload,
  width: number,
  height: number,
  progress: number
) {
  const hueShift = Math.floor(progress * 160);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${28 + hueShift}, 70%, 55%)`);
  gradient.addColorStop(1, `hsl(${210 + hueShift}, 70%, 45%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(7, 8, 12, 0.35)";
  context.fillRect(0, 0, width, height);

  if (payload.mode === "image" && payload.image) {
    const zoom = 1.05 + progress * 0.1;
    const imgWidth = payload.image.width * zoom;
    const imgHeight = payload.image.height * zoom;
    const scale = Math.max(width / imgWidth, height / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;
    context.drawImage(payload.image, dx, dy, drawWidth, drawHeight);
  }

  context.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let i = 0; i < 50; i += 1) {
    const x = (i * 37 + progress * 200) % width;
    const y = (i * 53 + progress * 120) % height;
    context.fillRect(x, y, 2, 2);
  }

  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.fillRect(32, height - 120, width - 64, 80);

  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.font = "20px 'Geist', system-ui, sans-serif";
  context.fillText(payload.prompt.slice(0, 48), 52, height - 75);

  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.font = "14px 'Geist', system-ui, sans-serif";
  context.fillText(`${payload.style} · ${payload.aspect}`, 52, height - 50);
}

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) ||
    "video/webm"
  );
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load."));
    img.src = url;
  });
}
