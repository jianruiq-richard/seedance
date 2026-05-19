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

type SeedanceFetchOptions = {
  method: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
};

const SEEDANCE_RETRY_DELAYS_MS = [750, 2000];
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSeedanceJson<T>(
  path: string,
  { method, body, timeoutMs = 30000 }: SeedanceFetchOptions
) {
  requireSeedanceConfig();

  const url = `${getBaseUrl()}${path}`;
  const attempts = SEEDANCE_RETRY_DELAYS_MS.length + 1;
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

      if (
        error instanceof SeedanceRequestError ||
        attempt === attempts ||
        !isRetryableNetworkError(error)
      ) {
        break;
      }

      await sleep(SEEDANCE_RETRY_DELAYS_MS[attempt - 1]);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new SeedanceRequestError("Seedance request failed", {
    cause: lastError,
    causeCode: getErrorCode(lastError),
    detail: lastError instanceof Error ? lastError.message : String(lastError),
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
  });
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
