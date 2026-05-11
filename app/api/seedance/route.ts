import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  calculateCreditCost,
  DEFAULT_NEW_USER_CREDITS,
} from "../../lib/credits";

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
    generateAudio?: boolean;
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
  const resolution = body.resolution ?? "720p";
  const ratio = body.ratio ?? "16:9";
  const duration = body.duration ?? 6;
  const generateAudio = body.generate_audio ?? true;
  const creditCost = calculateCreditCost({
    resolution,
    ratio,
    duration,
    generateAudio,
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
      ratio,
      resolution,
      duration,
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
        upstreamStatus: response.status,
        detail: detail || `HTTP ${response.status} ${response.statusText}`,
      },
      { status: 500 }
    );
  }

  const data = (await response.json()) as { id?: string };
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
          note: `Generate (${body.mode})`,
          taskId: data.id ?? null,
          prompt: body.prompt.slice(0, 240),
          params: {
            ratio,
            resolution,
            duration,
            generateAudio,
          },
        },
      ].slice(-100),
    },
  });

  return NextResponse.json({
    taskId: data.id ?? null,
    status: "queued",
    creditsCharged: creditCost.credits,
    creditsRemaining: updatedCredits,
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
