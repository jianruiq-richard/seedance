import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listGenerationJobsForUser } from "../../lib/generation-jobs";
import { syncGenerationJobFromSeedance } from "../../lib/seedance-tasks";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_INLINE_QUEUED_SYNCS = 5;

function parseLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor");
  const result = await listGenerationJobsForUser({
    clerkUserId: userId,
    limit,
    cursor,
  });
  const queuedJobs = result.items
    .filter(
      (item) =>
        item.outputType === "video" &&
        item.status === "queued" &&
        item.upstreamTaskId
    )
    .slice(0, MAX_INLINE_QUEUED_SYNCS);

  if (queuedJobs.length === 0) {
    return NextResponse.json(result);
  }

  const syncedJobs = await Promise.all(
    queuedJobs.map(async (job) => {
      try {
        const synced = await syncGenerationJobFromSeedance(job);
        return synced.job;
      } catch (error) {
        console.error("Failed to sync queued generation history item:", error);
        return job;
      }
    })
  );
  const syncedById = new Map(syncedJobs.map((job) => [job.id, job]));

  return NextResponse.json({
    ...result,
    items: result.items.map((item) => syncedById.get(item.id) ?? item),
  });
}
