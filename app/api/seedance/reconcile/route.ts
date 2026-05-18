import { NextResponse } from "next/server";
import { listStaleQueuedGenerationJobs } from "@/app/lib/generation-jobs";
import {
  requireSeedanceConfig,
  syncGenerationJobFromSeedance,
} from "@/app/lib/seedance-tasks";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.SEEDANCE_RECONCILE_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerToken = request.headers.get("x-reconcile-secret");
  return bearerToken === secret || headerToken === secret;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function reconcile(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requireSeedanceConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing config" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const olderThanMinutes = parsePositiveInt(
    searchParams.get("olderThanMinutes"),
    5
  );
  const limit = parsePositiveInt(searchParams.get("limit"), 20);
  const jobs = await listStaleQueuedGenerationJobs({
    olderThanMinutes,
    limit,
  });

  const results = [];
  for (const job of jobs) {
    try {
      const result = await syncGenerationJobFromSeedance(job);
      results.push({
        jobId: job.id,
        taskId: job.upstreamTaskId,
        before: job.status,
        after: result.job.status,
        upstreamStatus: result.status,
        hasVideoUrl: Boolean(result.job.videoUrl),
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        taskId: job.upstreamTaskId,
        before: job.status,
        after: job.status,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    checked: jobs.length,
    updated: results.filter((item) => item.before !== item.after).length,
    results,
  });
}

export async function GET(request: Request) {
  return reconcile(request);
}

export async function POST(request: Request) {
  return reconcile(request);
}
