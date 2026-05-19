import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  createSeedanceTask,
  SeedanceRequestError,
} from "@/app/lib/seedance-tasks";
import { DEFAULT_SEEDANCE_MODEL } from "@/app/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAdminEmail(email: string | null) {
  if (!email) return false;

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(email.toLowerCase());
}

function getPrimaryEmail(
  user: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>
) {
  const primaryEmailId = user.primaryEmailAddressId;
  return (
    user.emailAddresses.find((email) => email.id === primaryEmailId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST this endpoint to create a real Seedance task from Vercel without writing generation_jobs or charging site credits.",
    warning: "This still consumes Volcengine/Ark generation quota.",
    example: {
      attempts: 1,
      prompt: "Neon city streets, slow motion, cinematic glow",
      resolution: "720p",
      duration: 15,
      ratio: "16:9",
      generate_audio: true,
    },
  });
}

function parseInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = getPrimaryEmail(user);

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const startedAt = Date.now();
  const attempts = parseInteger(body.attempts, 1, 1, 3);
  const payload = {
    model:
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_SEEDANCE_MODEL,
    content: [
      {
        type: "text",
        text:
          typeof body.prompt === "string" && body.prompt.trim()
            ? body.prompt.trim()
            : "Neon city streets, slow motion, cinematic glow",
      },
    ],
    ratio:
      typeof body.ratio === "string" && body.ratio.trim()
        ? body.ratio.trim()
        : "16:9",
    resolution:
      typeof body.resolution === "string" && body.resolution.trim()
        ? body.resolution.trim()
        : "480p",
    duration: parseInteger(body.duration, 4, -1, 15),
    seed: parseInteger(body.seed, -1, -1, 2147483647),
    watermark: Boolean(body.watermark),
    generate_audio:
      typeof body.generate_audio === "boolean" ? body.generate_audio : true,
    execution_expires_after: parseInteger(
      body.execution_expires_after,
      172800,
      3600,
      259200
    ),
    return_last_frame: Boolean(body.return_last_frame),
    safety_identifier:
      typeof body.safety_identifier === "string" && body.safety_identifier.trim()
        ? body.safety_identifier.trim()
        : userId,
  };
  const results = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const attemptStartedAt = Date.now();

    try {
      const data = await createSeedanceTask(payload);

      results.push({
        ok: true,
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        taskId: data.id ?? null,
      });
    } catch (error) {
      results.push({
        ok: false,
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        error: error instanceof Error ? error.message : String(error),
        detail:
          error instanceof SeedanceRequestError ? error.detail : undefined,
        causeCode:
          error instanceof SeedanceRequestError ? error.causeCode : undefined,
        upstreamStatus:
          error instanceof SeedanceRequestError ? error.status : undefined,
      });
    }
  }

  const ok = results.some((result) => result.ok);

  return NextResponse.json(
    {
      ok,
      region: process.env.VERCEL_REGION ?? null,
      durationMs: Date.now() - startedAt,
      attempts,
      results,
      payload: {
        model: payload.model,
        ratio: payload.ratio,
        resolution: payload.resolution,
        duration: payload.duration,
        generate_audio: payload.generate_audio,
        safety_identifier: payload.safety_identifier,
      },
      warning:
        "Each successful attempt creates a real Ark task and consumes Volcengine quota.",
    },
    { status: ok ? 200 : 502 }
  );
}
