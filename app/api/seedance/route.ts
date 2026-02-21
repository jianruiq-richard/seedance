import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;
const model = process.env.SEEDANCE_MODEL || "doubao-seedance-1-5-pro-251215";

type GenerateRequest = {
  mode: "text" | "image";
  prompt: string;
  imageUrl?: string | null;
  ratio?: string;
  resolution?: string;
  duration?: number;
  frames?: number;
  seed?: number;
  camera_fixed?: boolean;
  watermark?: boolean;
  generate_audio?: boolean;
  draft?: boolean;
  service_tier?: "default" | "flex";
  execution_expires_after?: number;
  return_last_frame?: boolean;
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
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: body.prompt,
    },
  ];

  if (body.mode === "image") {
    if (!body.imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required for image-to-video." },
        { status: 400 }
      );
    }
    content.push({
      type: "image_url",
      image_url: {
        url: body.imageUrl,
      },
    });
  }

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
      ratio: body.ratio,
      resolution: body.resolution,
      duration: body.duration,
      frames: body.frames,
      seed: body.seed,
      camera_fixed: body.camera_fixed,
      watermark: body.watermark,
      generate_audio: body.generate_audio,
      draft: body.draft,
      service_tier: body.service_tier,
      execution_expires_after: body.execution_expires_after,
      return_last_frame: body.return_last_frame,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: "Seedance request failed",
        detail: detail || `HTTP ${response.status} ${response.statusText}`,
      },
      { status: 500 }
    );
  }

  const data = (await response.json()) as { id?: string };

  return NextResponse.json({
    taskId: data.id ?? null,
    status: "queued",
  });
}

export async function GET(request: Request) {
  try {
    requireConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing config" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
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
    content?: { video_url?: string; video_urls?: string[] };
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

  return NextResponse.json({
    status: data.status ?? "unknown",
    videoUrl,
    error: data.error ?? null,
    raw: data,
  });
}
