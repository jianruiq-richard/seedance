"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";

const ratios = [
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
  { label: "9:16", value: "9:16" },
  { label: "21:9", value: "21:9" },
  { label: "Adaptive", value: "adaptive" },
];

const durations = [4, 5, 6, 8, 10, 12];
const resolutions = ["480p", "720p", "1080p"] as const;

type Mode = "text" | "image";

type RatioKey = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

const ratioSizeMap: Record<RatioKey, { width: number; height: number }> = {
  "16:9": { width: 960, height: 540 },
  "9:16": { width: 540, height: 960 },
  "1:1": { width: 720, height: 720 },
  "4:3": { width: 800, height: 600 },
  "3:4": { width: 600, height: 800 },
  "21:9": { width: 1260, height: 540 },
};

export default function AppPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const isSignedIn = Boolean(user);
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState(
    "Neon city streets, slow motion, cinematic glow"
  );
  const [duration, setDuration] = useState<number>(6);
  const [ratio, setRatio] = useState<string>("16:9");
  const [resolution, setResolution] = useState<(typeof resolutions)[number]>(
    "720p"
  );
  const [seed, setSeed] = useState<number>(-1);
  const [cameraFixed, setCameraFixed] = useState<boolean>(false);
  const [watermark, setWatermark] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [draft, setDraft] = useState<boolean>(false);
  const [serviceTier, setServiceTier] = useState<"default" | "flex">(
    "default"
  );
  const [executionExpiresAfter, setExecutionExpiresAfter] =
    useState<number>(172800);
  const [returnLastFrame, setReturnLastFrame] = useState<boolean>(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">(
    "idle"
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState<number>(Date.now());

  const [credits, setCredits] = useState<number>(100);

  useEffect(() => {
    const nextCredits =
      (user?.unsafeMetadata?.credits as number | undefined) ?? 100;
    setCredits(nextCredits);
  }, [user]);

  const cleanupUrls = useRef<string[]>([]);

  const aspectSize = useMemo(() => {
    const normalized = ratio as RatioKey;
    return ratioSizeMap[normalized] ?? ratioSizeMap["16:9"];
  }, [ratio]);

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
    if (mode === "image" && !imageUrl.trim()) {
      setErrorMessage("Please provide an image URL for image-to-video.");
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

    try {
      const response = await fetch("/api/seedance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          prompt,
          imageUrl: mode === "image" ? imageUrl : null,
          ratio,
          resolution,
          duration,
          seed,
          camera_fixed: cameraFixed,
          watermark,
          generate_audio: generateAudio,
          draft,
          service_tier: serviceTier,
          execution_expires_after: executionExpiresAfter,
          return_last_frame: returnLastFrame,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Generation failed.");
      }

      let taskStatus = data?.status ?? "queued";
      let outputUrl = data?.videoUrl ?? null;
      const taskId = data?.taskId ?? null;

      if (!outputUrl && taskId) {
        for (let i = 0; i < 40; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const pollResponse = await fetch(
            `/api/seedance?taskId=${encodeURIComponent(taskId)}`
          );
          const pollData = await pollResponse.json();
          taskStatus = pollData?.status ?? taskStatus;
          outputUrl = pollData?.videoUrl ?? null;

          if (taskStatus === "succeeded" && outputUrl) {
            break;
          }
          if (taskStatus === "failed") {
            throw new Error(pollData?.error?.message || "Generation failed.");
          }
        }
      }

      if (outputUrl) {
        setVideoUrl(outputUrl);
        setDownloadUrl(outputUrl);
        setStatus("ready");
      } else {
        throw new Error("Generation timed out. Please try again.");
      }

      setSeedKey(Date.now());
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
                  Upload image (preview only)
                </label>
                <input
                  className="w-full rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-xs text-white/70"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70 outline-none focus:border-white/40"
                  placeholder="Image URL for Seedance"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
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
                  Resolution
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  value={resolution}
                  onChange={(event) =>
                    setResolution(event.target.value as typeof resolution)
                  }
                >
                  {resolutions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Ratio
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ratios.map((item) => (
                    <button
                      key={item.value}
                      className={`rounded-full border px-4 py-2 text-xs transition ${
                        ratio === item.value
                          ? "border-white bg-white text-[#0a0b10]"
                          : "border-white/20 text-white/70"
                      }`}
                      onClick={() => setRatio(item.value)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Duration (seconds)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
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
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Seed (-1 for random)
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  type="number"
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value))}
                />
              </div>
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
                <label className="flex items-center justify-between gap-2">
                  Camera fixed
                  <input
                    type="checkbox"
                    checked={cameraFixed}
                    onChange={(event) => setCameraFixed(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Watermark
                  <input
                    type="checkbox"
                    checked={watermark}
                    onChange={(event) => setWatermark(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Generate audio
                  <input
                    type="checkbox"
                    checked={generateAudio}
                    onChange={(event) => setGenerateAudio(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Draft mode
                  <input
                    type="checkbox"
                    checked={draft}
                    onChange={(event) => setDraft(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Return last frame
                  <input
                    type="checkbox"
                    checked={returnLastFrame}
                    onChange={(event) =>
                      setReturnLastFrame(event.target.checked)
                    }
                  />
                </label>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Service tier
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  value={serviceTier}
                  onChange={(event) =>
                    setServiceTier(event.target.value as "default" | "flex")
                  }
                >
                  <option value="default">default</option>
                  <option value="flex">flex</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Execution expires after (seconds)
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  type="number"
                  min={3600}
                  max={259200}
                  value={executionExpiresAfter}
                  onChange={(event) =>
                    setExecutionExpiresAfter(Number(event.target.value))
                  }
                />
              </div>
            </div>

            <button
              className="mt-2 w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleGenerate}
              type="button"
              disabled={
                status === "generating" || (mode === "image" && !imageUrl.trim())
              }
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
                  key={seedKey}
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
                <span>Ratio: {ratio}</span>
                <span>Duration: {duration}s</span>
              </div>
              {downloadUrl && (
                <a
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0a0b10]"
                  href={downloadUrl}
                  download={`seedance-${mode}-${ratio}.mp4`}
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
                {resolution} · {ratio} · {duration}s
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
