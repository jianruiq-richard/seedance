import { clerkClient } from "@clerk/nextjs/server";
import {
  updateGenerationJobResult,
  type GenerationJob,
} from "./generation-jobs";
import { buildCreditMetadataUpdate } from "./credit-metadata";
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

type SeedanceFetchOptions = {
  method: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
  retryDelaysMs?: number[];
};

const DEFAULT_SEEDANCE_TIMEOUT_MS = 30000;
const CREATE_SEEDANCE_TIMEOUT_MS = 45000;
const SEEDANCE_RETRY_DELAYS_MS = [750, 2000, 5000, 10000];
const SYSTEM_BUSY_MESSAGE = "System Busy. Please retry again later.";
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export class SeedanceRequestError extends Error {
  status?: number;
  statusText?: string;
  detail?: string;
  causeCode?: string | null;

  constructor(
    message: string,
    options?: {
      status?: number;
      statusText?: string;
      detail?: string;
      cause?: unknown;
      causeCode?: string | null;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "SeedanceRequestError";
    this.status = options?.status;
    this.statusText = options?.statusText;
    this.detail = options?.detail;
    this.causeCode = options?.causeCode;
  }
}

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

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  if (error instanceof Error && "cause" in error) {
    const cause = error.cause;
    if (cause && typeof cause === "object" && "code" in cause) {
      return String(cause.code);
    }
  }

  return null;
}

function isRetryableNetworkError(error: unknown) {
  const code = getErrorCode(error);
  return (
    (code !== null && RETRYABLE_NETWORK_ERROR_CODES.has(code)) ||
    (error instanceof TypeError && error.message === "fetch failed")
  );
}

function getUserFacingNetworkErrorDetail(error: unknown) {
  return isRetryableNetworkError(error)
    ? SYSTEM_BUSY_MESSAGE
    : error instanceof Error
      ? error.message
      : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSeedanceJson<T>(
  path: string,
  {
    method,
    body,
    timeoutMs = DEFAULT_SEEDANCE_TIMEOUT_MS,
    retryDelaysMs = SEEDANCE_RETRY_DELAYS_MS,
  }: SeedanceFetchOptions
) {
  requireSeedanceConfig();

  const url = `${getBaseUrl()}${path}`;
  const attempts = retryDelaysMs.length + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new SeedanceRequestError("Seedance request failed", {
          status: response.status,
          statusText: response.statusText,
          detail: detail || `HTTP ${response.status} ${response.statusText}`,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (error instanceof SeedanceRequestError) {
        throw error;
      }

      if (attempt === attempts || !isRetryableNetworkError(error)) {
        break;
      }

      await sleep(retryDelaysMs[attempt - 1]);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new SeedanceRequestError("Seedance request failed", {
    cause: lastError,
    causeCode: getErrorCode(lastError),
    detail: getUserFacingNetworkErrorDetail(lastError),
  });
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
  return fetchSeedanceJson<SeedanceTaskResponse>(
    `/contents/generations/tasks/${taskId}`,
    { method: "GET" }
  );
}

export async function createSeedanceTask(body: Record<string, unknown>) {
  return fetchSeedanceJson<{ id?: string }>("/contents/generations/tasks", {
    method: "POST",
    body,
    timeoutMs: CREATE_SEEDANCE_TIMEOUT_MS,
    retryDelaysMs: [1000, 3000, 7000, 15000, 25000],
  });
}

export function getSeedanceErrorMessage(data: SeedanceTaskResponse) {
  if (typeof data.error === "string") {
    return data.error;
  }
  if (
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  if (data.error) {
    return JSON.stringify(data.error);
  }
  return `Generation ${data.status ?? "failed"}`;
}

async function refundFailedGenerationJob(job: GenerationJob, reason: string) {
  if (job.creditsCharged <= 0) {
    return;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(job.clerkUserId);
  const metadata = user.unsafeMetadata ?? {};
  const refundedJobIds =
    (metadata.refundedGenerationJobIds as string[] | undefined) ?? [];

  if (refundedJobIds.includes(job.id)) {
    return;
  }

  const currentCredits = (metadata.credits as number | undefined) ?? 0;
  const nextCredits = currentCredits + job.creditsCharged;

  await client.users.updateUserMetadata(job.clerkUserId, {
    unsafeMetadata: buildCreditMetadataUpdate({
      metadata,
      credits: nextCredits,
      refundedGenerationJobId: job.id,
      usageEntry: {
        at: new Date().toISOString(),
        amount: job.creditsCharged,
        note: "Refund failed generation",
        taskId: job.upstreamTaskId,
        jobId: job.id,
        prompt: job.prompt.slice(0, 120),
        params: {
          ratio: job.ratio,
          resolution: job.resolution,
          duration: job.duration,
          generateAudio: job.generateAudio,
        },
      },
      adjustmentEntry: {
        at: new Date().toISOString(),
        admin: "system",
        before: currentCredits,
        after: nextCredits,
        reason: `Refund failed generation ${job.upstreamTaskId ?? job.id}: ${reason.slice(0, 180)}`,
      },
    }),
  });
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
    const errorMessage = getSeedanceErrorMessage(data);
    updatedJob = await updateGenerationJobResult({
      id: job.id,
      clerkUserId: job.clerkUserId,
      status: "failed",
      errorMessage,
    });
    try {
      await refundFailedGenerationJob(job, errorMessage);
    } catch (error) {
      console.error("Failed to refund failed generation:", {
        jobId: job.id,
        taskId: job.upstreamTaskId,
        userId: job.clerkUserId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    status: data.status ?? "unknown",
    videoUrl: persistedVideoUrl,
    error: data.error ?? null,
    errorMessage:
      data.status === "failed" ||
      data.status === "expired" ||
      data.status === "cancelled"
        ? getSeedanceErrorMessage(data)
        : null,
    raw: data,
    job: updatedJob ?? job,
  };
}
