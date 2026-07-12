import { archiveMediaToTos } from "./tos";

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;

type SeedreamImageResponse = {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: unknown;
  output?: {
    image_url?: string;
    image_urls?: string[];
    images?: { url?: string }[];
  };
  result?: {
    image_url?: string;
    image_urls?: string[];
  };
};

type SeedreamStreamEvent = {
  type?: string;
  url?: string;
  b64_json?: string;
  error?: { code?: string; message?: string } | string;
};

export class SeedreamRequestError extends Error {
  status?: number;
  statusText?: string;
  detail?: string;

  constructor(
    message: string,
    options?: { status?: number; statusText?: string; detail?: string }
  ) {
    super(message);
    this.name = "SeedreamRequestError";
    this.status = options?.status;
    this.statusText = options?.statusText;
    this.detail = options?.detail;
  }
}

export function requireSeedreamConfig() {
  if (!apiKey || !endpoint) {
    throw new Error(
      "Seedream API is not configured. Please set VOLCENGINE_ARK_API_KEY and VOLCENGINE_ARK_ENDPOINT."
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

export function getSeedreamImageUrl(data: SeedreamImageResponse) {
  return (
    data.data?.[0]?.url ??
    data.output?.image_url ??
    data.output?.image_urls?.[0] ??
    data.output?.images?.[0]?.url ??
    data.result?.image_url ??
    data.result?.image_urls?.[0] ??
    null
  );
}

export function getSeedreamErrorMessage(data: SeedreamImageResponse) {
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
  return "Image generation failed.";
}

export async function createSeedreamImage(body: Record<string, unknown>) {
  requireSeedreamConfig();

  const response = await fetch(`${getBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new SeedreamRequestError("Seedream request failed", {
      status: response.status,
      statusText: response.statusText,
      detail: detail || `HTTP ${response.status} ${response.statusText}`,
    });
  }

  return (await response.json()) as SeedreamImageResponse;
}

export async function createSeedreamImageStream(
  body: Record<string, unknown>,
  onEvent: (event: SeedreamStreamEvent) => Promise<void> | void
) {
  requireSeedreamConfig();

  const response = await fetch(`${getBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new SeedreamRequestError("Seedream stream request failed", {
      status: response.status,
      statusText: response.statusText,
      detail: detail || `HTTP ${response.status} ${response.statusText}`,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\n\n+/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLines = chunk
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter((line) => line && line !== "[DONE]");

      for (const line of dataLines) {
        await onEvent(JSON.parse(line) as SeedreamStreamEvent);
      }
    }
  }
}

export async function archiveSeedreamImage({
  sourceUrl,
  userId,
  jobId,
}: {
  sourceUrl: string;
  userId: string;
  jobId: string;
}) {
  return archiveMediaToTos({
    sourceUrl,
    userId,
    jobId,
    mediaType: "image",
  });
}
