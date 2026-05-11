import { Pool, type QueryResultRow } from "pg";

type GenerationStatus = "queued" | "succeeded" | "failed";
type GenerationMode = "text" | "image";

export type GenerationJob = {
  id: string;
  clerkUserId: string;
  upstreamTaskId: string | null;
  mode: GenerationMode;
  prompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  status: GenerationStatus;
  creditsCharged: number;
  ratio: string | null;
  resolution: string | null;
  duration: number | null;
  generateAudio: boolean | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type CreateGenerationJobInput = {
  clerkUserId: string;
  upstreamTaskId: string | null;
  mode: GenerationMode;
  prompt: string;
  imageUrl: string | null;
  creditsCharged: number;
  ratio: string;
  resolution: string;
  duration: number;
  generateAudio: boolean;
};

declare global {
  var generationJobsPool: Pool | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!global.generationJobsPool) {
    const isLocal =
      process.env.DATABASE_URL.includes("localhost") ||
      process.env.DATABASE_URL.includes("127.0.0.1");

    global.generationJobsPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }

  return global.generationJobsPool;
}

function mapGenerationJob(row: QueryResultRow): GenerationJob {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    upstreamTaskId: row.upstream_task_id,
    mode: row.mode,
    prompt: row.prompt,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    downloadUrl: row.download_url,
    status: row.status,
    creditsCharged: row.credits_charged,
    ratio: row.ratio,
    resolution: row.resolution,
    duration: row.duration,
    generateAudio: row.generate_audio,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

export async function createGenerationJob(input: CreateGenerationJobInput) {
  const result = await getPool().query(
    `insert into generation_jobs (
      clerk_user_id,
      upstream_task_id,
      mode,
      prompt,
      image_url,
      credits_charged,
      ratio,
      resolution,
      duration,
      generate_audio
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    returning *`,
    [
      input.clerkUserId,
      input.upstreamTaskId,
      input.mode,
      input.prompt,
      input.imageUrl,
      input.creditsCharged,
      input.ratio,
      input.resolution,
      input.duration,
      input.generateAudio,
    ]
  );

  return mapGenerationJob(result.rows[0]);
}

export async function getGenerationJobForUser(id: string, clerkUserId: string) {
  const result = await getPool().query(
    `select * from generation_jobs
     where id = $1 and clerk_user_id = $2
     limit 1`,
    [id, clerkUserId]
  );

  return result.rows[0] ? mapGenerationJob(result.rows[0]) : null;
}

export async function updateGenerationJobResult({
  id,
  clerkUserId,
  status,
  videoUrl,
  errorMessage,
}: {
  id: string;
  clerkUserId: string;
  status: GenerationStatus;
  videoUrl?: string | null;
  errorMessage?: string | null;
}) {
  const result = await getPool().query(
    `update generation_jobs
     set status = $3,
       video_url = coalesce($4, video_url),
       download_url = coalesce($4, download_url),
       error_message = coalesce($5, error_message),
       completed_at = case when $3 in ('succeeded', 'failed') then now() else completed_at end
     where id = $1 and clerk_user_id = $2
     returning *`,
    [id, clerkUserId, status, videoUrl ?? null, errorMessage ?? null]
  );

  return result.rows[0] ? mapGenerationJob(result.rows[0]) : null;
}

export async function listGenerationJobsForUser({
  clerkUserId,
  limit,
  cursor,
}: {
  clerkUserId: string;
  limit: number;
  cursor?: string | null;
}) {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const params: Array<string | number> = [clerkUserId, boundedLimit + 1];
  let cursorClause = "";

  if (cursor) {
    const [createdAt, id] = cursor.split("|");
    if (createdAt && id) {
      params.push(createdAt, id);
      cursorClause = `and (created_at, id) < ($3::timestamptz, $4::uuid)`;
    }
  }

  const result = await getPool().query(
    `select * from generation_jobs
     where clerk_user_id = $1
     ${cursorClause}
     order by created_at desc, id desc
     limit $2`,
    params
  );

  const rows = result.rows.slice(0, boundedLimit);
  const jobs = rows.map(mapGenerationJob);
  const hasMore = result.rows.length > boundedLimit;
  const last = rows[rows.length - 1];

  return {
    items: jobs,
    nextCursor: hasMore
      ? `${last.created_at.toISOString()}|${last.id}`
      : null,
  };
}
