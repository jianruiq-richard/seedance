import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  calculateCreditCost,
  DEFAULT_SEEDANCE_MODEL,
  DEFAULT_NEW_USER_CREDITS,
  seedanceModels,
} from "../../lib/credits";
import {
  createGenerationJob,
  getGenerationJobForUser,
  updateGenerationJobResult,
} from "../../lib/generation-jobs";
import { archiveVideoToTos } from "../../lib/tos";

export const runtime = "nodejs";
export const maxDuration = 600;

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;
const configuredModel = process.env.SEEDANCE_MODEL || DEFAULT_SEEDANCE_MODEL;
const supportedModels = new Set<string>(seedanceModels.map((item) => item.value));

type GenerateRequest = {
  mode?: "text" | "image";
  model?: string;
  prompt: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  inputVideoDuration?: number;
  ratio?: string;
  resolution?: string;
  duration?: number;
  frames?: number;
  seed?: number;
  camera_fixed?: boolean;
  watermark?: boolean;
  generate_audio?: boolean;
  draft?: boolean;
  execution_expires_after?: number;
  return_last_frame?: boolean;
};

type CreditUsageEntry = {
  at: string;
  amount: number;
  note?: string;
  taskId?: string | null;
  prompt?: string;
  params?: {
    ratio?: string;
    resolution?: string;
    duration?: number;
    inputVideoDuration?: number;
    generateAudio?: boolean;
    model?: string;
  };
};

function requireConfig() {
  if (!apiKey || !endpoint) {
    throw new Error(
      "Seedance API is not configured. Please set VOLCENGINE_ARK_API_KEY and VOLCENGINE_ARK_ENDPOINT."
    );
  }
}

function getBaseUrl() {
  const raw = endpoint?.replace(/\/+$/, "") ?? "";
  if (raw.endsWith("/api/v3")) {
    return raw;
  }
  return `${raw}/api/v3`;
}

function normalizeModel(input?: string | null) {
  const value = input || configuredModel;
  const aliases: Record<string, string> = {
    "seedance2.0": "doubao-seedance-2-0-260128",
    "seedance-2.0": "doubao-seedance-2-0-260128",
    "seedance 2.0": "doubao-seedance-2-0-260128",
    "doubao-seedance-2-0": "doubao-seedance-2-0-260128",
    "seedance2.0-fast": "doubao-seedance-2-0-fast-260128",
    "seedance-2.0-fast": "doubao-seedance-2-0-fast-260128",
    "seedance 2.0 fast": "doubao-seedance-2-0-fast-260128",
    "doubao-seedance-2-0-fast": "doubao-seedance-2-0-fast-260128",
    fast: "doubao-seedance-2-0-fast-260128",
  };
  return aliases[value.toLowerCase()] ?? value;
}

function validateSeedance2Options({
  model,
  resolution,
  ratio,
  duration,
  executionExpiresAfter,
}: {
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
  executionExpiresAfter?: number;
}) {
  if (!supportedModels.has(model)) {
    return `Unsupported Seedance model: ${model}`;
  }
  if (!["480p", "720p", "1080p"].includes(resolution)) {
    return `Unsupported resolution: ${resolution}`;
  }
  if (model === "doubao-seedance-2-0-fast-260128" && resolution === "1080p") {
    return "Seedance 2.0 Fast does not support 1080p. Use 480p or 720p.";
  }
  if (
    !["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"].includes(ratio)
  ) {
    return `Unsupported ratio: ${ratio}`;
  }
  if (
    !Number.isInteger(duration) ||
    (duration !== -1 && (duration < 4 || duration > 15))
  ) {
    return "Seedance 2.0 duration must be an integer from 4 to 15, or -1 for model-selected duration.";
  }
  if (
    executionExpiresAfter !== undefined &&
    (!Number.isInteger(executionExpiresAfter) ||
      executionExpiresAfter < 3600 ||
      executionExpiresAfter > 259200)
  ) {
    return "execution_expires_after must be an integer from 3600 to 259200 seconds.";
  }
  return null;
}

function validateContentCombination({
  prompt,
  imageUrl,
  videoUrl,
  audioUrl,
}: {
  prompt: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}) {
  const hasText = Boolean(prompt.trim());
  const hasImage = Boolean(imageUrl?.trim());
  const hasVideo = Boolean(videoUrl?.trim());
  const hasAudio = Boolean(audioUrl?.trim());

  if (!hasText && !hasImage && !hasVideo) {
    return hasAudio
      ? "Audio input must be combined with an image or video reference."
      : "Provide a prompt, image, or video reference before generating.";
  }

  if (hasAudio && !hasImage && !hasVideo) {
    return "Audio input must be combined with an image or video reference.";
  }

  return null;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requireConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing config" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as GenerateRequest;
  const prompt = body.prompt?.trim() ?? "";
  const model = normalizeModel(body.model);
  const resolution = body.resolution ?? "720p";
  const ratio = body.ratio ?? "adaptive";
  const duration = body.duration ?? 5;
  const generateAudio = body.generate_audio ?? true;
  const imageUrl = body.imageUrl?.trim() || null;
  const videoUrl = body.videoUrl?.trim() || null;
  const audioUrl = body.audioUrl?.trim() || null;
  const inputVideoDuration = videoUrl ? Number(body.inputVideoDuration ?? 0) : 0;
  const contentValidationError = validateContentCombination({
    prompt,
    imageUrl,
    videoUrl,
    audioUrl,
  });
  const validationError = validateSeedance2Options({
    model,
    resolution,
    ratio,
    duration,
    executionExpiresAfter: body.execution_expires_after,
  });

  if (contentValidationError) {
    return NextResponse.json({ error: contentValidationError }, { status: 400 });
  }

  if (
    videoUrl &&
    (!Number.isFinite(inputVideoDuration) || inputVideoDuration <= 0)
  ) {
    return NextResponse.json(
      { error: "Input video duration is required for video references." },
      { status: 400 }
    );
  }

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const billedDuration = duration === -1 ? 15 : duration;
  const creditCost = calculateCreditCost({
    resolution,
    ratio,
    duration: billedDuration,
    generateAudio,
    model,
    inputVideoDuration,
  });

  if ("error" in creditCost) {
    return NextResponse.json({ error: creditCost.error }, { status: 400 });
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const currentCredits =
    (clerkUser.unsafeMetadata?.credits as number | undefined) ??
    DEFAULT_NEW_USER_CREDITS;

  if (currentCredits < creditCost.credits) {
    return NextResponse.json(
      {
        error: "Not enough credits",
        creditsRequired: creditCost.credits,
        creditsRemaining: currentCredits,
      },
      { status: 402 }
    );
  }

  const content: Array<Record<string, unknown>> = [];

  if (prompt) {
    content.push({
      type: "text",
      text: prompt,
    });
  }

  if (imageUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    });
  }

  if (videoUrl) {
    content.push({
      type: "video_url",
      video_url: {
        url: videoUrl,
      },
    });
  }

  if (audioUrl) {
    content.push({
      type: "audio_url",
      audio_url: {
        url: audioUrl,
      },
    });
  }

  const generationMode = imageUrl ? "image" : "text";
  const promptForLog = prompt || "(media reference)";

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      content,
      ratio,
      resolution,
      duration,
      seed: body.seed,
      watermark: body.watermark,
      generate_audio: body.generate_audio,
      execution_expires_after: body.execution_expires_after,
      return_last_frame: body.return_last_frame,
      safety_identifier: userId,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: "Seedance request failed",
        upstreamStatus: response.status,
        detail: detail || `HTTP ${response.status} ${response.statusText}`,
      },
      { status: 500 }
    );
  }

  const data = (await response.json()) as { id?: string };
  const taskId = data.id ?? null;
  const generationJob = await createGenerationJob({
    clerkUserId: userId,
    upstreamTaskId: taskId,
    mode: generationMode,
    prompt: promptForLog,
    imageUrl,
    creditsCharged: creditCost.credits,
    ratio,
    resolution,
    duration,
    generateAudio,
  });
  const updatedCredits = Math.max(currentCredits - creditCost.credits, 0);
  const usageLog =
    (clerkUser.unsafeMetadata?.creditUsage as CreditUsageEntry[] | undefined) ??
    [];

  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: {
      ...clerkUser.unsafeMetadata,
      credits: updatedCredits,
      creditUsage: [
        ...usageLog,
        {
          at: new Date().toISOString(),
          amount: -creditCost.credits,
          note: `Generate (${generationMode})`,
          taskId,
          prompt: promptForLog.slice(0, 240),
          params: {
            ratio,
            resolution,
            duration,
            inputVideoDuration,
            generateAudio,
            model,
          },
        },
      ].slice(-100),
    },
  });

  return NextResponse.json({
    jobId: generationJob.id,
    taskId,
    status: "queued",
    creditsCharged: creditCost.credits,
    creditsRemaining: updatedCredits,
  });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requireConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing config" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  let taskId = searchParams.get("taskId");

  if (jobId) {
    const job = await getGenerationJobForUser(jobId, userId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    taskId = job.upstreamTaskId;
  }

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/contents/generations/tasks/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: "Seedance polling failed",
        upstreamStatus: response.status,
        detail: detail || `HTTP ${response.status} ${response.statusText}`,
      },
      { status: 500 }
    );
  }

  const data = (await response.json()) as {
    status?: string;
    error?: unknown;
    output?: {
      video_url?: string;
      video_urls?: string[];
      videos?: { url?: string }[];
    };
    content?: {
      video_url?: string;
      video_urls?: string[];
      last_frame_url?: string;
    };
    result?: { video_url?: string; video_urls?: string[] };
  };

  const videoUrl =
    data.output?.video_url ??
    data.output?.video_urls?.[0] ??
    data.output?.videos?.[0]?.url ??
    data.content?.video_url ??
    data.content?.video_urls?.[0] ??
    data.result?.video_url ??
    data.result?.video_urls?.[0] ??
    null;

  let persistedVideoUrl = videoUrl;

  if (jobId) {
    if (data.status === "succeeded" && videoUrl) {
      try {
        persistedVideoUrl = await archiveVideoToTos({
          sourceUrl: videoUrl,
          userId,
          jobId,
        });
      } catch (error) {
        console.error("Failed to archive generated video:", error);
      }
      await updateGenerationJobResult({
        id: jobId,
        clerkUserId: userId,
        status: "succeeded",
        videoUrl: persistedVideoUrl,
      });
    }
    if (
      data.status === "failed" ||
      data.status === "expired" ||
      data.status === "cancelled"
    ) {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : data.error
            ? JSON.stringify(data.error)
            : `Generation ${data.status}`;
      await updateGenerationJobResult({
        id: jobId,
        clerkUserId: userId,
        status: "failed",
        errorMessage,
      });
    }
  }

  return NextResponse.json({
    status: data.status ?? "unknown",
    videoUrl: persistedVideoUrl,
    error: data.error ?? null,
    raw: data,
  });
}
