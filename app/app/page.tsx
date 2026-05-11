"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  calculateCreditCost,
  DEFAULT_SEEDANCE_MODEL,
  DEFAULT_NEW_USER_CREDITS,
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

type Mode = "text" | "image";

type GenerationHistoryItem = {
  id: string;
  upstreamTaskId: string | null;
  mode: Mode;
  prompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  status: "queued" | "succeeded" | "failed";
  creditsCharged: number;
  ratio: string | null;
  resolution: string | null;
  duration: number | null;
  generateAudio: boolean | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

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
  const [model, setModel] = useState<string>(DEFAULT_SEEDANCE_MODEL);
  const [prompt, setPrompt] = useState(
    "Neon city streets, slow motion, cinematic glow"
  );
  const [duration, setDuration] = useState<number>(5);
  const [ratio, setRatio] = useState<string>("adaptive");
  const [resolution, setResolution] = useState<(typeof resolutions)[number]>(
    "720p"
  );
  const [seed, setSeed] = useState<number>(-1);
  const [watermark, setWatermark] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [executionExpiresAfter, setExecutionExpiresAfter] =
    useState<number>(172800);
  const [returnLastFrame, setReturnLastFrame] = useState<boolean>(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">(
    "idle"
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState<number>(Date.now());

  const [credits, setCredits] = useState<number>(600);
  const [pricingCredits, setPricingCredits] = useState<number>(100);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState<boolean>(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const nextCredits =
      (user?.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;
    setCredits(nextCredits);
  }, [user]);

  // Check for subscription success from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      setSubscriptionSuccess(true);
      // Clear URL parameters after 3 seconds
      setTimeout(() => {
        setSubscriptionSuccess(false);
        window.history.replaceState({}, '', '/app');
      }, 5000);
    }
  }, []);

  const cleanupUrls = useRef<string[]>([]);

  const aspectSize = useMemo(() => {
    const normalized = ratio as RatioKey;
    return ratioSizeMap[normalized] ?? ratioSizeMap["16:9"];
  }, [ratio]);

  const availableResolutions = useMemo(
    () =>
      model === "doubao-seedance-2-0-fast-260128"
        ? resolutions.filter((item) => item !== "1080p")
        : resolutions,
    [model]
  );

  useEffect(() => {
    if (model === "doubao-seedance-2-0-fast-260128" && resolution === "1080p") {
      setResolution("720p");
    }
  }, [model, resolution]);

  useEffect(() => {
    setPricingLoading(true);
    setPricingError(null);
    const handle = setTimeout(() => {
      const result = calculateCreditCost({
        resolution,
        ratio,
        duration,
        generateAudio,
        model,
      });
      if ("error" in result) {
        setPricingError(result.error);
        setPricingCredits(0);
        setPricingLoading(false);
        return;
      }
      setPricingCredits(result.credits);
      setPricingLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [resolution, ratio, duration, generateAudio, model]);

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

  useEffect(() => {
    if (!imageFile) return;
    void handleUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  const loadGenerationHistory = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!isSignedIn) {
        setHistoryItems([]);
        setHistoryNextCursor(null);
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const params = new URLSearchParams({ limit: "10" });
        if (!reset && historyNextCursor) {
          params.set("cursor", historyNextCursor);
        }
        const response = await fetch(`/api/generations?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load generation history.");
        }
        setHistoryItems((prev) =>
          reset ? data.items ?? [] : [...prev, ...(data.items ?? [])]
        );
        setHistoryNextCursor(data.nextCursor ?? null);
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error.message
            : "Failed to load generation history."
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyNextCursor, isSignedIn]
  );

  useEffect(() => {
    void loadGenerationHistory({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]);

  const handleUpload = async () => {
    if (!imageFile) return;
    setUploadProgress(0);
    setErrorMessage(null);
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/tos/upload", true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.url) {
                setImageUrl(data.url);
                resolve();
              } else {
                reject(new Error("Upload failed."));
              }
            } catch {
              reject(new Error("Upload failed."));
            }
          } else {
            const detail = xhr.responseText?.slice(0, 500) || "";
            reject(
              new Error(
                `Upload failed (${xhr.status}). ${detail ? `Detail: ${detail}` : ""}`
              )
            );
          }
        };
        xhr.onerror = () => {
          const detail = xhr.responseText?.slice(0, 500) || "";
          reject(
            new Error(
              `Upload failed. ${detail ? `Detail: ${detail}` : ""}`
            )
          );
        };
        const formData = new FormData();
        formData.append("file", imageFile);
        xhr.send(formData);
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    setUploadProgress(0);
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!isSignedIn) {
      setErrorMessage("Please sign in to generate videos.");
      return;
    }
    if (pricingLoading) {
      setErrorMessage("Calculating price. Please wait.");
      return;
    }
    if (pricingError) {
      setErrorMessage(pricingError);
      return;
    }
    if (credits < pricingCredits) {
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
          model,
          prompt,
          imageUrl: mode === "image" ? imageUrl : null,
          ratio,
          resolution,
          duration,
          seed,
          watermark,
          generate_audio: generateAudio,
          execution_expires_after: executionExpiresAfter,
          return_last_frame: returnLastFrame,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const detail = data?.detail
          ? typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail)
          : "";
        const statusPart = data?.upstreamStatus
          ? ` (upstream ${data.upstreamStatus})`
          : "";
        throw new Error(
          `${data?.error || "Generation failed."}${statusPart}${
            detail ? `\n${detail}` : ""
          }`
        );
      }

      if (typeof data?.creditsRemaining === "number") {
        setCredits(data.creditsRemaining);
      }

      let taskStatus = data?.status ?? "queued";
      let outputUrl = data?.videoUrl ?? null;
      const taskId = data?.taskId ?? null;
      const jobId = data?.jobId ?? null;

      if (!outputUrl && taskId) {
        for (let i = 0; i < 40; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const pollParams = new URLSearchParams({ taskId });
          if (jobId) {
            pollParams.set("jobId", jobId);
          }
          const pollResponse = await fetch(`/api/seedance?${pollParams}`);
          const pollData = await pollResponse.json();
          taskStatus = pollData?.status ?? taskStatus;
          outputUrl = pollData?.videoUrl ?? null;

          if (taskStatus === "succeeded" && outputUrl) {
            break;
          }
          if (
            taskStatus === "failed" ||
            taskStatus === "expired" ||
            taskStatus === "cancelled"
          ) {
            const pollError =
              pollData?.error?.message ||
              (typeof pollData?.error === "string" ? pollData.error : "");
            const pollDetail = pollData?.detail
              ? typeof pollData.detail === "string"
                ? pollData.detail
                : JSON.stringify(pollData.detail)
              : "";
            throw new Error(
              `${pollError || `Generation ${taskStatus}.`}${
                pollDetail ? `\n${pollDetail}` : ""
              }`
            );
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
      void loadGenerationHistory({ reset: true });
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
                <Link
                  className="rounded-full bg-[#f7c578] px-4 py-2 text-xs font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90"
                  href="/billing"
                >
                  Subscribe
                </Link>
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

      {/* Subscription Success Banner */}
      {subscriptionSuccess && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-4">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-lg font-semibold text-green-400">
                Subscription Successful!
              </h3>
            </div>
            <p className="mt-2 text-sm text-green-300/80">
              Your credits have been updated. You can now start creating amazing videos!
            </p>
          </div>
        </div>
      )}

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
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center text-xs transition ${
                    dragActive
                      ? "border-white/80 bg-white/5 text-white"
                      : "border-white/20 bg-black/20 text-white/60 hover:border-white/50"
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
                    const file = event.dataTransfer.files?.[0] ?? null;
                    if (file) {
                      setImageFile(file);
                    }
                  }}
                >
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <span>Drag & drop or click to upload</span>
                  {imageFile && (
                    <span className="text-white/80">{imageFile.name}</span>
                  )}
                </label>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#f7c578] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p className="text-xs text-white/60">
                    Uploading... {uploadProgress}%
                  </p>
                )}
                {imagePreview && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <img
                      className="h-16 w-16 rounded-xl object-cover"
                      src={imagePreview}
                      alt="Preview"
                    />
                    <div className="flex-1 text-xs text-white/70">
                      <p className="font-semibold text-white/90">Preview</p>
                      <p className="mt-1 break-all">{imageFile?.name}</p>
                    </div>
                    <button
                      className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 transition hover:border-white/60 hover:text-white"
                      type="button"
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Model
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {seedanceModels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  {availableResolutions.map((item) => (
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
                status === "generating" ||
                pricingLoading ||
                Boolean(pricingError) ||
                (mode === "image" && !imageUrl.trim())
              }
            >
              {status === "generating" ? (
                "Generating..."
              ) : pricingLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0b10] border-t-transparent" />
                  Calculating...
                </span>
              ) : (
                `Generate (${pricingCredits} credits)`
              )}
            </button>

            {pricingError && (
              <p className="text-xs text-rose-200">{pricingError}</p>
            )}
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
              <span>{historyItems.length} loaded</span>
            </div>
            {historyError && (
              <p className="text-xs text-rose-200">{historyError}</p>
            )}
            {historyItems.length === 0 && !historyLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/45">
                No saved generations yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {historyItems.map((item) => {
                  const playableUrl = item.videoUrl ?? item.downloadUrl;
                  const itemRatio = item.ratio ?? "16:9";
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-white">
                            {item.mode === "text"
                              ? "Text to Video"
                              : "Image to Video"}
                          </span>
                          <span className="ml-2 rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/45">
                            {item.status}
                          </span>
                        </div>
                        <span className="text-xs text-white/40">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {playableUrl && (
                        <video
                          className="mt-3 max-h-[280px] w-full rounded-2xl bg-black/40"
                          src={playableUrl}
                          controls
                          preload="metadata"
                        />
                      )}
                      <p className="mt-3 text-xs text-white/50">
                        {item.prompt}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
                        <div className="flex flex-wrap gap-3">
                          <span>{item.resolution ?? "—"}</span>
                          <span>{itemRatio}</span>
                          <span>{item.duration ?? "—"}s</span>
                          <span>{item.creditsCharged} credits</span>
                        </div>
                        {item.downloadUrl && (
                          <a
                            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0a0b10]"
                            href={item.downloadUrl}
                            download={`seedance-${item.mode}-${itemRatio}.mp4`}
                          >
                            Download
                          </a>
                        )}
                      </div>
                      {item.errorMessage && (
                        <p className="mt-2 text-xs text-rose-200">
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {historyNextCursor && (
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => void loadGenerationHistory()}
                disabled={historyLoading}
              >
                {historyLoading ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
