import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;

function getBaseUrl() {
  const raw = endpoint?.replace(/\/+$/, "") ?? "";
  if (raw.endsWith("/api/v3")) {
    return raw;
  }
  return `${raw}/api/v3`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "VOLCENGINE_ARK_ENDPOINT is not configured." },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(baseUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    return NextResponse.json({
      ok: true,
      region: process.env.VERCEL_REGION ?? null,
      endpoint: baseUrl,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error.cause as Error | undefined)
        : undefined;

    return NextResponse.json(
      {
        ok: false,
        region: process.env.VERCEL_REGION ?? null,
        endpoint: baseUrl,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        cause: cause?.message ?? null,
        causeCode:
          cause && "code" in cause ? String(cause.code) : null,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
