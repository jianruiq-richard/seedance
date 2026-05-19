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
  });
}

export async function POST() {
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

  const startedAt = Date.now();
  const payload = {
    model: DEFAULT_SEEDANCE_MODEL,
    content: [
      {
        type: "text",
        text: "Neon city streets, slow motion, cinematic glow",
      },
    ],
    ratio: "16:9",
    resolution: "480p",
    duration: 4,
    seed: -1,
    watermark: false,
    generate_audio: true,
    execution_expires_after: 172800,
    return_last_frame: false,
    safety_identifier: userId,
  };

  try {
    const data = await createSeedanceTask(payload);

    return NextResponse.json({
      ok: true,
      region: process.env.VERCEL_REGION ?? null,
      durationMs: Date.now() - startedAt,
      taskId: data.id ?? null,
      payload: {
        model: payload.model,
        ratio: payload.ratio,
        resolution: payload.resolution,
        duration: payload.duration,
        generate_audio: payload.generate_audio,
        safety_identifier: payload.safety_identifier,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        region: process.env.VERCEL_REGION ?? null,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        detail:
          error instanceof SeedanceRequestError ? error.detail : undefined,
        causeCode:
          error instanceof SeedanceRequestError ? error.causeCode : undefined,
        upstreamStatus:
          error instanceof SeedanceRequestError ? error.status : undefined,
      },
      { status: 502 }
    );
  }
}
