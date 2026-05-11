import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listGenerationJobsForUser } from "../../lib/generation-jobs";

export const runtime = "nodejs";

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

  return NextResponse.json(result);
}
