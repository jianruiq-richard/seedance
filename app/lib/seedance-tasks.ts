import { updateGenerationJobResult, type GenerationJob } from "./generation-jobs";
import { archiveVideoToTos } from "./tos";

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;

type SeedanceTaskResponse = {
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

export function requireSeedanceConfig() {
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

export function getSeedanceVideoUrl(data: SeedanceTaskResponse) {
  return (
    data.output?.video_url ??
    data.output?.video_urls?.[0] ??
    data.output?.videos?.[0]?.url ??
    data.content?.video_url ??
    data.content?.video_urls?.[0] ??
    data.result?.video_url ??
    data.result?.video_urls?.[0] ??
    null
  );
}

export async function fetchSeedanceTask(taskId: string) {
  requireSeedanceConfig();

  const response = await fetch(
    `${getBaseUrl()}/contents/generations/tasks/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `HTTP ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SeedanceTaskResponse;
}

function getSeedanceErrorMessage(data: SeedanceTaskResponse) {
  if (typeof data.error === "string") {
    return data.error;
  }
  if (data.error) {
    return JSON.stringify(data.error);
  }
  return `Generation ${data.status ?? "failed"}`;
}

export async function syncGenerationJobFromSeedance(job: GenerationJob) {
  if (!job.upstreamTaskId) {
    return {
      status: job.status,
      videoUrl: job.videoUrl,
      error: "Missing taskId",
      raw: null,
      job,
    };
  }

  const data = await fetchSeedanceTask(job.upstreamTaskId);
  const videoUrl = getSeedanceVideoUrl(data);
  let persistedVideoUrl = videoUrl;
  let updatedJob: GenerationJob | null = null;

  if (data.status === "succeeded" && videoUrl) {
    try {
      persistedVideoUrl = await archiveVideoToTos({
        sourceUrl: videoUrl,
        userId: job.clerkUserId,
        jobId: job.id,
      });
    } catch (error) {
      console.error("Failed to archive generated video:", error);
    }

    updatedJob = await updateGenerationJobResult({
      id: job.id,
      clerkUserId: job.clerkUserId,
      status: "succeeded",
      videoUrl: persistedVideoUrl,
    });
  }

  if (
    data.status === "failed" ||
    data.status === "expired" ||
    data.status === "cancelled"
  ) {
    updatedJob = await updateGenerationJobResult({
      id: job.id,
      clerkUserId: job.clerkUserId,
      status: "failed",
      errorMessage: getSeedanceErrorMessage(data),
    });
  }

  return {
    status: data.status ?? "unknown",
    videoUrl: persistedVideoUrl,
    error: data.error ?? null,
    raw: data,
    job: updatedJob ?? job,
  };
}
