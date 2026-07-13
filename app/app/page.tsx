"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  calculateImageCreditCost,
  calculateCreditCost,
  DEFAULT_SEEDANCE_MODEL,
  DEFAULT_SEEDREAM_MODEL,
  DEFAULT_NEW_USER_CREDITS,
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
const GENERATION_POLL_INTERVAL_MS = 3000;
const GENERATION_MAX_POLLS = 600;
const HISTORY_QUEUED_POLL_INTERVAL_MS = 15000;
const HISTORY_QUEUED_MAX_POLL_MS = 30 * 60 * 1000;

type Mode = "text" | "image";
type GenerationProduct = "video" | "image";
type MediaKind = "image" | "video" | "audio";

const LEGACY_RELAY_MAX_BYTES = 4 * 1024 * 1024;
const MAX_REFERENCE_UPLOAD_BYTES_BY_KIND: Record<MediaKind, number> = {
  image: 20 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
};

const mediaKindLabels: Record<MediaKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
};

const emptyMediaRecord = <T,>(value: T): Record<MediaKind, T> => ({
  image: value,
  video: value,
  audio: value,
});

function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const error =
    typeof record.errorMessage === "string"
      ? record.errorMessage
      : typeof record.error === "string"
      ? record.error
      : record.error &&
          typeof record.error === "object" &&
          "message" in record.error
        ? String((record.error as { message?: unknown }).message)
        : fallback;
  const statusPart =
    typeof record.upstreamStatus === "number"
      ? ` (upstream ${record.upstreamStatus})`
      : "";
  const detail = record.detail
    ? typeof record.detail === "string"
      ? record.detail
      : JSON.stringify(record.detail)
    : "";

  return `${error}${statusPart}${detail ? `\n${detail}` : ""}`;
}

function parseApiJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

function formatUploadApiError(data: Record<string, unknown>, fallback: string) {
  const reason = typeof data.reason === "string" ? data.reason : "";
  const detail = typeof data.detail === "string" ? data.detail : "";
  const uploadId = typeof data.uploadId === "string" ? data.uploadId : "";
  return [
    detail || (typeof data.error === "string" ? data.error : fallback),
    reason ? `reason: ${reason}` : "",
    uploadId ? `uploadId: ${uploadId}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

type GenerationHistoryItem = {
  id: string;
  upstreamTaskId: string | null;
  mode: Mode;
  outputType: GenerationProduct;
  prompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
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

function imageSizeToAspect(size: string) {
  if (size === "2K" || size === "1K") {
    return { width: 1, height: 1 };
  }
  const [width, height] = size.split("x").map(Number);
  if (!width || !height) {
    return { width: 1, height: 1 };
  }
  return { width, height };
}

export default function AppPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const isSignedIn = Boolean(user);
  const [generationProduct, setGenerationProduct] =
    useState<GenerationProduct>("video");
  const [model, setModel] = useState<string>(DEFAULT_SEEDANCE_MODEL);
  const [imageModel, setImageModel] = useState<string>(DEFAULT_SEEDREAM_MODEL);
  const [prompt, setPrompt] = useState(
    "Neon city streets, slow motion, cinematic glow"
  );
  const [duration, setDuration] = useState<number>(4);
  const [ratio, setRatio] = useState<string>("16:9");
  const [resolution, setResolution] = useState<(typeof resolutions)[number]>(
    "480p"
  );
  const [seed, setSeed] = useState<number>(-1);
  const [watermark, setWatermark] = useState<boolean>(false);
  const [imageSize, setImageSize] =
    useState<(typeof imageSizes)[number]>("1K");
  const [imageOutputFormat, setImageOutputFormat] =
    useState<"jpeg" | "png">("jpeg");
  const [sequentialImageGeneration, setSequentialImageGeneration] =
    useState<"disabled" | "auto">("disabled");
  const [maxImages, setMaxImages] = useState<number>(4);
  const [webSearch, setWebSearch] = useState<boolean>(false);
  const [optimizePrompt, setOptimizePrompt] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [executionExpiresAfter, setExecutionExpiresAfter] =
    useState<number>(172800);
  const [returnLastFrame, setReturnLastFrame] = useState<boolean>(false);

  const [referenceFiles, setReferenceFiles] = useState<
    Record<MediaKind, File | null>
  >(emptyMediaRecord<File | null>(null));
  const [referencePreviews, setReferencePreviews] = useState<
    Record<MediaKind, string | null>
  >(emptyMediaRecord<string | null>(null));
  const [referenceUrls, setReferenceUrls] = useState<Record<MediaKind, string>>(
    emptyMediaRecord("")
  );
  const [referenceDurations, setReferenceDurations] = useState<
    Record<MediaKind, number>
  >(emptyMediaRecord(0));
  const [uploadProgress, setUploadProgress] = useState<Record<MediaKind, number>>(
    emptyMediaRecord(0)
  );
  const [uploading, setUploading] = useState<Record<MediaKind, boolean>>(
    emptyMediaRecord(false)
  );
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">(
    "idle"
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState<number>(Date.now());
  const [renderProgress, setRenderProgress] = useState<number>(0);

  const [credits, setCredits] = useState<number>(DEFAULT_NEW_USER_CREDITS);
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
  const historyLoadingRef = useRef(false);
  const historyQueuedPollStartedAtRef = useRef<number | null>(null);
  const activeGenerationRunRef = useRef<string | null>(null);
  const activeGenerationJobIdRef = useRef<string | null>(null);
  const uploadTokens = useRef<Record<MediaKind, string | null>>(
    emptyMediaRecord<string | null>(null)
  );

  const aspectSize = useMemo(() => {
    if (generationProduct === "image") {
      return imageSizeToAspect(imageSize);
    }
    const normalized = ratio as RatioKey;
    return ratioSizeMap[normalized] ?? ratioSizeMap["16:9"];
  }, [generationProduct, imageSize, ratio]);

  const generationStage = useMemo(() => {
    if (generationProduct === "image") {
      if (renderProgress < 40) return "Preparing image";
      if (renderProgress < 76) return "Composing pixels";
      return "Finalizing image";
    }
    if (renderProgress < 28) return "Preparing scene";
    if (renderProgress < 58) return "Composing motion";
    if (renderProgress < 82) return "Rendering frames";
    return "Finalizing video";
  }, [generationProduct, renderProgress]);

  const hasActiveUpload = useMemo(
    () => Object.values(uploading).some(Boolean),
    [uploading]
  );

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
      const result =
        generationProduct === "image"
          ? calculateImageCreditCost({
              model: imageModel,
              size: imageSize,
              referenceImageCount: referenceUrls.image ? 1 : 0,
              sequentialImageGeneration,
              maxImages,
            })
          : calculateCreditCost({
              resolution,
              ratio,
              duration,
              generateAudio,
              model,
              inputVideoDuration: referenceUrls.video
                ? referenceDurations.video
                : 0,
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
  }, [
    resolution,
    ratio,
    duration,
    generateAudio,
    model,
    generationProduct,
    imageModel,
    imageSize,
    sequentialImageGeneration,
    maxImages,
    referenceUrls.image,
    referenceUrls.video,
    referenceDurations.video,
  ]);

  useEffect(() => {
    if (status !== "generating") {
      if (status === "idle" || status === "error") {
        setRenderProgress(0);
      }
      return;
    }

    setRenderProgress(6);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setRenderProgress((previous) => {
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const curvedProgress = 94 - 88 * Math.exp(-elapsedSeconds / 38);
        const nextProgress = Math.max(previous + 0.5, curvedProgress);
        return Math.min(94, Math.round(nextProgress));
      });
    }, 900);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    return () => {
      cleanupUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cleanupUrls.current = [];
    };
  }, []);

  const loadGenerationHistory = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!isSignedIn) {
        setHistoryItems([]);
        setHistoryNextCursor(null);
        return;
      }
      if (historyLoadingRef.current) {
        return;
      }

      historyLoadingRef.current = true;
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
        historyLoadingRef.current = false;
        setHistoryLoading(false);
      }
    },
    [historyNextCursor, isSignedIn]
  );

  useEffect(() => {
    void loadGenerationHistory({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    const hasQueuedHistory = historyItems.some(
      (item) => item.status === "queued" || item.status === "processing"
    );

    if (!isSignedIn || !hasQueuedHistory) {
      historyQueuedPollStartedAtRef.current = null;
      return;
    }

    historyQueuedPollStartedAtRef.current ??= Date.now();
    const handle = window.setInterval(() => {
      const startedAt = historyQueuedPollStartedAtRef.current;
      if (
        startedAt &&
        Date.now() - startedAt > HISTORY_QUEUED_MAX_POLL_MS
      ) {
        window.clearInterval(handle);
        return;
      }
      void loadGenerationHistory({ reset: true });
    }, HISTORY_QUEUED_POLL_INTERVAL_MS);

    return () => window.clearInterval(handle);
  }, [historyItems, isSignedIn, loadGenerationHistory]);

  useEffect(() => {
    if (errorMessage !== "Generation failed.") {
      return;
    }

    const latestDetailedFailure = historyItems.find(
      (item) =>
        item.status === "failed" &&
        item.errorMessage &&
        (!activeGenerationJobIdRef.current ||
          item.id === activeGenerationJobIdRef.current)
    );

    if (latestDetailedFailure?.errorMessage) {
      setErrorMessage(latestDetailedFailure.errorMessage);
    }
  }, [errorMessage, historyItems]);

  const uploadReferenceFile = async (
    kind: MediaKind,
    file: File,
    token: string
  ) => {
    const isCurrentUpload = () => uploadTokens.current[kind] === token;
    setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
    setUploading((prev) => ({ ...prev, [kind]: true }));
    setErrorMessage(null);

    const contentType = file.type || "application/octet-stream";

    const uploadViaRelay = async () => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/tos/upload", true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            if (isCurrentUpload()) {
              setUploadProgress((prev) => ({ ...prev, [kind]: percent }));
            }
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.url) {
                if (isCurrentUpload()) {
                  setReferenceUrls((prev) => ({ ...prev, [kind]: data.url }));
                  setUploadProgress((prev) => ({ ...prev, [kind]: 100 }));
                }
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
                `Upload failed (${xhr.status}). ${
                  detail ? `Detail: ${detail}` : ""
                }`
              )
            );
          }
        };
        xhr.onerror = () => {
          const detail = xhr.responseText?.slice(0, 500) || "";
          reject(
            new Error(`Upload failed. ${detail ? `Detail: ${detail}` : ""}`)
          );
        };
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadId", token);
        xhr.send(formData);
      });
    };

    const putToSignedUrl = async (uploadUrl: string) => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("content-type", contentType);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(
              95,
              Math.round((event.loaded / event.total) * 95)
            );
            if (isCurrentUpload()) {
              setUploadProgress((prev) => ({ ...prev, [kind]: percent }));
            }
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          reject(
            new Error(
              `Direct upload failed (${xhr.status}). ${
                xhr.responseText ? xhr.responseText.slice(0, 500) : ""
              }`
            )
          );
        };
        xhr.onerror = () => {
          reject(
            new Error(
              "Direct upload failed. Check object storage CORS or network connectivity."
            )
          );
        };
        xhr.send(file);
      });
    };

    try {
      try {
        const presignResponse = await fetch("/api/tos/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "presign",
            uploadId: token,
            fileName: file.name,
            fileSize: file.size,
            contentType,
          }),
        });
        const presignData = await parseApiJson(presignResponse);
        if (!presignResponse.ok) {
          throw new Error(
            formatUploadApiError(presignData, "Failed to prepare upload.")
          );
        }

        const uploadUrl =
          typeof presignData.uploadUrl === "string"
            ? presignData.uploadUrl
            : "";
        const key = typeof presignData.key === "string" ? presignData.key : "";
        if (!uploadUrl || !key) {
          throw new Error("Failed to prepare upload.");
        }

        await putToSignedUrl(uploadUrl);

        if (isCurrentUpload()) {
          setUploadProgress((prev) => ({ ...prev, [kind]: 98 }));
        }

        const confirmResponse = await fetch("/api/tos/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            uploadId: token,
            key,
            fileSize: file.size,
            contentType,
          }),
        });
        const confirmData = await parseApiJson(confirmResponse);
        if (!confirmResponse.ok) {
          throw new Error(
            formatUploadApiError(confirmData, "Failed to confirm upload.")
          );
        }

        if (typeof confirmData.url !== "string") {
          throw new Error("Upload confirmation did not return a URL.");
        }

        if (isCurrentUpload()) {
          setReferenceUrls((prev) => ({ ...prev, [kind]: confirmData.url as string }));
          setUploadProgress((prev) => ({ ...prev, [kind]: 100 }));
        }
      } catch (directUploadError) {
        if (file.size > LEGACY_RELAY_MAX_BYTES) {
          throw directUploadError;
        }
        if (isCurrentUpload()) {
          setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
        }
        await uploadViaRelay();
      }
    } catch (error) {
      if (isCurrentUpload()) {
        setErrorMessage(
          error instanceof Error ? error.message : "Upload failed."
        );
      }
    } finally {
      if (isCurrentUpload()) {
        setUploading((prev) => ({ ...prev, [kind]: false }));
      }
    }
  };

  const addReferenceFile = (file: File) => {
    const kind = getMediaKind(file);
    if (!kind) {
      setErrorMessage("Upload an image, video, or audio file.");
      return;
    }
    if (generationProduct === "image" && kind !== "image") {
      setErrorMessage("Image generation only accepts image references.");
      return;
    }
    const maxUploadBytes = MAX_REFERENCE_UPLOAD_BYTES_BY_KIND[kind];
    if (file.size > maxUploadBytes) {
      setErrorMessage(
        `Reference uploads must be ${formatFileSize(
          maxUploadBytes
        )} or smaller. "${file.name}" is ${formatFileSize(file.size)}.`
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    uploadTokens.current[kind] = token;
    cleanupUrls.current.push(previewUrl);
    setReferenceFiles((prev) => ({ ...prev, [kind]: file }));
    setReferencePreviews((prev) => ({ ...prev, [kind]: previewUrl }));
    setReferenceUrls((prev) => ({ ...prev, [kind]: "" }));
    setReferenceDurations((prev) => ({ ...prev, [kind]: 0 }));
    setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
    void uploadReferenceFile(kind, file, token);
  };

  const addReferenceFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(addReferenceFile);
  };

  const handleRemoveReference = (kind: MediaKind) => {
    uploadTokens.current[kind] = null;
    setReferenceFiles((prev) => ({ ...prev, [kind]: null }));
    setReferencePreviews((prev) => ({ ...prev, [kind]: null }));
    setReferenceUrls((prev) => ({ ...prev, [kind]: "" }));
    setReferenceDurations((prev) => ({ ...prev, [kind]: 0 }));
    setUploadProgress((prev) => ({ ...prev, [kind]: 0 }));
    setUploading((prev) => ({ ...prev, [kind]: false }));
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    const trimmedPrompt = prompt.trim();
    const hasImage = Boolean(referenceUrls.image.trim());
    const hasVideo = Boolean(referenceUrls.video.trim());
    const hasAudio = Boolean(referenceUrls.audio.trim());
    const isUploading = Object.values(uploading).some(Boolean);

    if (!isSignedIn) {
      setErrorMessage("Please sign in to generate.");
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
    if (isUploading) {
      setErrorMessage("Wait for uploads to finish before generating.");
      return;
    }
    if (generationProduct === "image" && !trimmedPrompt) {
      setErrorMessage("Add a prompt before generating an image.");
      return;
    }
    if (generationProduct === "image" && imageModel.includes("-pro-") && sequentialImageGeneration !== "disabled") {
      setErrorMessage("Seedream 5.0 Pro only supports single image generation.");
      return;
    }
    if (generationProduct === "image" && imageModel.includes("-pro-") && webSearch) {
      setErrorMessage("Seedream 5.0 Pro does not support web search.");
      return;
    }
    if (generationProduct === "video" && !trimmedPrompt && !hasImage && !hasVideo) {
      setErrorMessage("Add a prompt, image, or video reference before generating.");
      return;
    }
    if (generationProduct === "video" && hasAudio && !hasImage && !hasVideo) {
      setErrorMessage("Audio must be combined with an image or video reference.");
      return;
    }
    if (generationProduct === "video" && hasVideo && referenceDurations.video <= 0) {
      setErrorMessage("Wait for the input video duration to load.");
      return;
    }
    const generationRunId = crypto.randomUUID();
    const isCurrentGeneration = () =>
      activeGenerationRunRef.current === generationRunId;

    activeGenerationRunRef.current = generationRunId;
    activeGenerationJobIdRef.current = null;
    setStatus("generating");
    setRenderProgress(6);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setGeneratedImageUrl(null);
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      if (generationProduct === "image") {
        const response = await fetch("/api/seedream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: trimmedPrompt,
            imageUrl: hasImage ? referenceUrls.image : null,
            size: imageSize,
            seed,
            watermark,
            output_format: imageOutputFormat,
            response_format: "url",
            sequential_image_generation: sequentialImageGeneration,
            max_images: maxImages,
            web_search: webSearch,
            optimize_prompt_mode: optimizePrompt ? "standard" : undefined,
          }),
        });
        const data = await parseApiJson(response);
        if (!isCurrentGeneration()) {
          return;
        }
        if (!response.ok) {
          throw new Error(formatApiError(data, "Image generation failed."));
        }
        if (typeof data?.creditsRemaining === "number") {
          setCredits(data.creditsRemaining);
        }
        const jobId = typeof data?.jobId === "string" ? data.jobId : null;
        activeGenerationJobIdRef.current = jobId;
        void loadGenerationHistory({ reset: true });

        let outputUrl =
          typeof data?.imageUrl === "string" ? data.imageUrl : null;
        let taskStatus =
          typeof data?.status === "string" ? data.status : "queued";

        if (!outputUrl && jobId) {
          for (let i = 0; i < GENERATION_MAX_POLLS; i += 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, GENERATION_POLL_INTERVAL_MS)
            );
            if (!isCurrentGeneration()) {
              return;
            }
            const pollResponse = await fetch(`/api/seedream?jobId=${jobId}`);
            const pollData = await parseApiJson(pollResponse);
            if (!isCurrentGeneration()) {
              return;
            }
            if (!pollResponse.ok) {
              continue;
            }
            taskStatus =
              typeof pollData?.status === "string"
                ? pollData.status
                : taskStatus;
            outputUrl =
              typeof pollData?.imageUrl === "string"
                ? pollData.imageUrl
                : null;

            if (taskStatus === "succeeded" && outputUrl) {
              break;
            }
            if (taskStatus === "failed") {
              throw new Error(
                formatApiError(pollData, "Image generation failed.")
              );
            }
          }
        }

        if (!outputUrl) {
          throw new Error(
            "Image generation is still processing. Check the generation log for updates."
          );
        }
        setRenderProgress(100);
        setGeneratedImageUrl(outputUrl);
        setDownloadUrl(outputUrl);
        setStatus("ready");
        setSeedKey(Date.now());
        activeGenerationRunRef.current = null;
        void loadGenerationHistory({ reset: true });
        return;
      }

      const response = await fetch("/api/seedance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: trimmedPrompt,
          imageUrl: hasImage ? referenceUrls.image : null,
          videoUrl: hasVideo ? referenceUrls.video : null,
          audioUrl: hasAudio ? referenceUrls.audio : null,
          inputVideoDuration: hasVideo ? referenceDurations.video : 0,
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
      const data = await parseApiJson(response);
      if (!isCurrentGeneration()) {
        return;
      }

      if (!response.ok) {
        throw new Error(formatApiError(data, "Generation failed."));
      }

      if (typeof data?.creditsRemaining === "number") {
        setCredits(data.creditsRemaining);
      }

      let taskStatus =
        typeof data?.status === "string" ? data.status : "queued";
      let outputUrl =
        typeof data?.videoUrl === "string" ? data.videoUrl : null;
      const taskId = typeof data?.taskId === "string" ? data.taskId : null;
      const jobId = typeof data?.jobId === "string" ? data.jobId : null;
      activeGenerationJobIdRef.current = jobId;
      void loadGenerationHistory({ reset: true });

      if (!outputUrl && taskId) {
        for (let i = 0; i < GENERATION_MAX_POLLS; i += 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, GENERATION_POLL_INTERVAL_MS)
          );
          if (!isCurrentGeneration()) {
            return;
          }
          const pollParams = new URLSearchParams({ taskId });
          if (jobId) {
            pollParams.set("jobId", jobId);
          }

          let pollResponse: Response;
          try {
            pollResponse = await fetch(`/api/seedance?${pollParams}`);
          } catch {
            continue;
          }
          const pollData = await parseApiJson(pollResponse);
          if (!isCurrentGeneration()) {
            return;
          }

          if (!pollResponse.ok) {
            continue;
          }

          taskStatus =
            typeof pollData?.status === "string" ? pollData.status : taskStatus;
          outputUrl =
            typeof pollData?.videoUrl === "string" ? pollData.videoUrl : null;

          if (taskStatus === "succeeded" && outputUrl) {
            break;
          }
          if (
            taskStatus === "failed" ||
            taskStatus === "expired" ||
            taskStatus === "cancelled"
          ) {
            throw new Error(
              formatApiError(pollData, `Generation ${taskStatus}.`)
            );
          }
        }

      }

      if (outputUrl) {
        if (!isCurrentGeneration()) {
          return;
        }
        setRenderProgress(100);
        setVideoUrl(outputUrl);
        setDownloadUrl(outputUrl);
        setStatus("ready");
        activeGenerationRunRef.current = null;
      } else {
        throw new Error(
          "Generation is still processing. Check the generation log for updates."
        );
      }

      setSeedKey(Date.now());
      void loadGenerationHistory({ reset: true });
    } catch (error) {
      if (!isCurrentGeneration()) {
        return;
      }
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Generation failed, try again."
      );
      activeGenerationRunRef.current = null;
      void loadGenerationHistory({ reset: true });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0b10] text-white">
      <div className="border-b border-white/10 bg-[#0c0f18]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]" />
            <span className="truncate text-base font-semibold sm:text-lg">
              Creative Studio
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-sm text-white/70 sm:flex-none sm:gap-4">
            <Link className="hover:text-white" href="/">
              Home
            </Link>
            {isSignedIn ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 sm:gap-3">
                  <span className="text-white/60">Credits</span>
                  <span className="font-semibold text-white">{credits}</span>
                </div>
                <Link
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/35 hover:bg-white/10 hover:text-white sm:px-4"
                  href="/billing"
                >
                  Billing
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
                    className="hidden rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/60 hover:text-white sm:inline-flex"
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
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base font-semibold text-green-400 sm:text-lg">
                Subscription Successful!
              </h3>
            </div>
            <p className="mt-2 text-sm text-green-300/80">
              Your credits have been updated. You can now start creating.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 px-4 py-5 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:rounded-3xl sm:p-6">
          <div className="space-y-4 sm:mt-2">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              {[
                ["video", "Video Generation"],
                ["image", "Image Generation"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`min-w-0 truncate rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 ${
                    generationProduct === value
                      ? "bg-white text-[#0a0b10]"
                      : "text-white/65 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => setGenerationProduct(value as GenerationProduct)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-[0.2em] text-white/50">
              Prompt
            </label>
            <textarea
              className="h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 outline-none focus:border-white/40 sm:h-32"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                References
              </label>
              <label
                className={`flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-5 text-center text-xs transition sm:py-6 ${
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
                  addReferenceFiles(event.dataTransfer.files);
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
                      addReferenceFiles(event.target.files);
                    }
                    event.target.value = "";
                  }}
                />
	                <span>Drag & drop or click to upload</span>
	                <span className="text-white/40">
                    {generationProduct === "image"
                      ? "Image references"
                      : "Image, video, or audio"}
                  </span>
	              </label>

	              {(generationProduct === "image"
                  ? (["image"] as MediaKind[])
                  : (["image", "video", "audio"] as MediaKind[])
                ).map((kind) => {
                const file = referenceFiles[kind];
                const preview = referencePreviews[kind];
                const progress = uploadProgress[kind];
                const isUploading = uploading[kind];
                const isReady = Boolean(referenceUrls[kind]) && !isUploading;
                const visibleProgress = isReady
                  ? 100
                  : isUploading
                    ? Math.min(progress, 95)
                    : progress;
                if (!file || !preview) return null;

                return (
                  <div
                    key={kind}
                    className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {kind === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="h-16 w-16 rounded-xl object-cover"
                            src={preview}
                            alt="Reference"
                          />
                        )}
                        {kind === "video" && (
                          <video
                            className="h-16 w-16 rounded-xl object-cover"
                            src={preview}
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(event) => {
                              const nextDuration =
                                event.currentTarget.duration;
                              if (Number.isFinite(nextDuration)) {
                                setReferenceDurations((prev) => ({
                                  ...prev,
                                  video: nextDuration,
                                }));
                              }
                            }}
                          />
                        )}
                        {kind === "audio" && (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/60">
                            Audio
                          </div>
                        )}
                        <div className="min-w-0 text-xs text-white/70">
                          <p className="font-semibold text-white/90">
                            {mediaKindLabels[kind]}
                          </p>
                          <p className="mt-1 truncate">{file.name}</p>
                        </div>
                      </div>
                      <button
                        className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 transition hover:border-white/60 hover:text-white"
                        type="button"
                        onClick={() => handleRemoveReference(kind)}
                      >
                        Remove
                      </button>
                    </div>
                    {kind === "audio" && (
                      <audio className="mt-3 w-full" src={preview} controls />
                    )}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#f7c578] transition-all"
                        style={{ width: `${visibleProgress}%` }}
                      />
                    </div>
                    {isUploading && visibleProgress < 95 && (
                      <p className="mt-2 text-xs text-white/60">
                        Uploading... {visibleProgress}%
                      </p>
                    )}
                    {isUploading && visibleProgress >= 95 && (
                      <p className="mt-2 text-xs text-white/60">
                        Processing upload...
                      </p>
                    )}
                    {isReady && (
                      <p className="mt-2 text-xs text-emerald-200">
                        Ready
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {generationProduct === "video" ? (
            <div className="grid min-w-0 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Model
                </label>
                <select
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
                <div className="mt-2 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap">
                  {ratios.map((item) => (
                    <button
                      key={item.value}
                      className={`min-w-0 truncate rounded-full border px-2 py-2 text-xs transition sm:px-4 ${
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
                <div className="mt-2 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap">
                  {durations.map((item) => (
                    <button
                      key={item}
                      className={`min-w-0 truncate rounded-full border px-2 py-2 text-xs transition sm:px-4 ${
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
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
            ) : (
            <div className="grid min-w-0 gap-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Model
                </label>
                <select
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                  value={imageModel}
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    setImageModel(nextModel);
                    if (nextModel.includes("-pro-")) {
                      setSequentialImageGeneration("disabled");
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
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Size
                </label>
                <select
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Output format
                </label>
                <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
                  {(["jpeg", "png"] as const).map((item) => (
                    <button
                      key={item}
                      className={`min-w-0 truncate rounded-full border px-3 py-2 text-xs uppercase transition ${
                        imageOutputFormat === item
                          ? "border-white bg-white text-[#0a0b10]"
                          : "border-white/20 text-white/70"
                      }`}
                      onClick={() => setImageOutputFormat(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Seed (-1 for random)
                </label>
                <input
                  className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
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
                  Optimize prompt
                  <input
                    type="checkbox"
                    checked={optimizePrompt}
                    onChange={(event) => setOptimizePrompt(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Group images
                  <input
                    type="checkbox"
                    checked={sequentialImageGeneration === "auto"}
                    disabled={imageModel.includes("-pro-")}
                    onChange={(event) =>
                      setSequentialImageGeneration(
                        event.target.checked ? "auto" : "disabled"
                      )
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Web search
                  <input
                    type="checkbox"
                    checked={webSearch}
                    disabled={imageModel.includes("-pro-")}
                    onChange={(event) => setWebSearch(event.target.checked)}
                  />
                </label>
              </div>
              {sequentialImageGeneration === "auto" && !imageModel.includes("-pro-") && (
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Max images
                  </label>
                  <input
                    className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 outline-none"
                    type="number"
                    min={1}
                    max={15}
                    value={maxImages}
                    onChange={(event) => setMaxImages(Number(event.target.value))}
                  />
                </div>
              )}
            </div>
            )}

            <button
              className="mt-2 w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleGenerate}
              type="button"
              disabled={
                status === "generating" ||
                pricingLoading ||
                Boolean(pricingError) ||
                hasActiveUpload
              }
            >
              {status === "generating" ? (
                "Generating..."
              ) : hasActiveUpload ? (
                "Finishing upload..."
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
              <p className="text-xs text-rose-200">
                {errorMessage}
                {errorMessage.toLowerCase().includes("not enough credits") && (
                  <>
                    {" "}
                    <Link className="text-[#f7c578] underline" href="/billing">
                      Buy more credits
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-5 sm:space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Preview</span>
              <span className="rounded-full border border-white/20 px-2 py-1">
                {status === "generating" ? "Rendering" : "Ready"}
              </span>
            </div>
            <div
              className="relative mt-4 flex w-full max-w-full min-h-[160px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/20 sm:min-h-[320px]"
              style={{ aspectRatio: `${aspectSize.width}/${aspectSize.height}` }}
            >
              {generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={seedKey}
                  className="max-h-[70vh] w-full rounded-2xl object-contain sm:max-h-[520px]"
                  src={generatedImageUrl}
                  alt="Generated image"
                />
              ) : videoUrl ? (
                <video
                  key={seedKey}
                  className="max-h-[70vh] w-full rounded-2xl bg-black/40 sm:max-h-[360px]"
                  src={videoUrl}
                  controls
                  loop
                />
              ) : status === "generating" ? (
                <div className="relative flex h-full min-h-[160px] w-full items-center justify-center overflow-hidden sm:min-h-[320px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(247,197,120,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:22px_22px]" />
                  <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f7c578]/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col items-center px-6 text-center">
                    <div className="relative grid h-28 w-28 place-items-center sm:h-36 sm:w-36">
                      <div
                        className="absolute inset-0 rounded-full shadow-[0_0_42px_rgba(247,197,120,0.18)]"
                        style={{
                          background: `conic-gradient(#f7c578 ${renderProgress * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
                        }}
                      />
                      <div className="absolute inset-2 animate-spin rounded-full border border-transparent border-t-white/70 border-r-[#f7c578]/90" />
                      <div className="absolute inset-4 rounded-full bg-[#0d0f16]/95 shadow-inner shadow-black/60" />
                      <div className="relative">
                        <div className="text-2xl font-semibold text-white sm:text-3xl">
                          {renderProgress}%
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#f7c578]/80">
                          Rendering
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 text-sm font-medium text-white/90 sm:mt-6">
                      {generationStage}
                    </div>
                    <div className="mt-2 max-w-sm text-xs leading-5 text-white/45">
                      {generationProduct === "image"
                        ? "You can leave this page after the job is queued. The result will appear in history."
                        : "You can leave this page after the job is queued. The result will appear in history."}
                    </div>
                    <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f7c578] via-white to-[#f7c578] transition-all duration-700"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-white/40">
                  Your result will appear here.
                </div>
              )}
            </div>
            {downloadUrl && (
              <div className="mt-5 flex justify-end">
                <a
                  className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-white/20 bg-white px-4 py-2 text-center text-xs font-semibold !text-[#0a0b10] shadow-sm transition hover:bg-white/90"
                  href={downloadUrl}
                  download={
                    generationProduct === "image"
                      ? `seedream-${imageSize}.${imageOutputFormat === "png" ? "png" : "jpg"}`
                      : `seedance-${ratio}.mp4`
                  }
                >
                  {generationProduct === "image" ? "Download image" : "Download video"}
                </a>
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 sm:rounded-3xl sm:p-6">
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
                  const imageResultUrl =
                    item.outputType === "image" ? item.imageUrl : null;
                  const itemRatio = item.ratio ?? "16:9";
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-white">
                            {item.outputType === "image"
                              ? item.mode === "text"
                                ? "Text to Image"
                                : "Image to Image"
                              : item.mode === "text"
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
                      {imageResultUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="mt-3 max-h-[360px] w-full rounded-2xl bg-black/40 object-contain"
                          src={imageResultUrl}
                          alt="Generated image"
                        />
                      ) : playableUrl && (
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
                          {item.outputType === "video" && (
                            <span>{item.duration ?? "—"}s</span>
                          )}
                          <span>{item.creditsCharged} credits</span>
                        </div>
                        {(item.outputType === "image" ? imageResultUrl : item.downloadUrl) && (
                          <a
                            className="inline-flex min-w-[112px] items-center justify-center rounded-full border border-white/20 bg-white px-4 py-2 text-xs font-semibold !text-[#0a0b10] shadow-sm transition hover:bg-white/90"
                            href={
                              item.outputType === "image"
                                ? imageResultUrl ?? undefined
                                : item.downloadUrl ?? undefined
                            }
                            download={
                              item.outputType === "image"
                                ? `seedream-${item.mode}-${item.resolution ?? "image"}.jpg`
                                : `seedance-${item.mode}-${itemRatio}.mp4`
                            }
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
