import crypto from "crypto";
import {
  ACLType,
  TosClient,
  TosClientError,
  TosServerError,
} from "@volcengine/tos-sdk";

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.TOS_ENDPOINT?.trim();
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || "cn-beijing").trim();

function normalizeTosEndpoint(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isConfigured() {
  return Boolean(accessKeyId && secretAccessKey && endpoint && bucket);
}

function createClient() {
  if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
    throw new Error("Missing TOS credentials.");
  }
  return new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint: normalizeTosEndpoint(endpoint),
    secure: false,
    connectionTimeout: 30000,
    requestTimeout: 120000,
    maxRetryCount: 3,
  });
}

export async function archiveMediaToTos({
  sourceUrl,
  userId,
  jobId,
  mediaType = "video",
}: {
  sourceUrl: string;
  userId: string;
  jobId: string;
  mediaType?: "video" | "image";
}) {
  if (!isConfigured()) {
    return sourceUrl;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${mediaType} for archive: ${response.status}`);
  }

  const fallbackContentType = mediaType === "image" ? "image/png" : "video/mp4";
  const contentType = response.headers.get("content-type") || fallbackContentType;
  const buffer = Buffer.from(await response.arrayBuffer());
  const extension =
    contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("png")
          ? "png"
          : mediaType === "image"
            ? "png"
            : "mp4";
  const key = `users/${userId}/generations/${jobId}-${crypto
    .randomBytes(4)
    .toString("hex")}.${extension}`;

  const client = createClient();
  try {
    await client.putObject({
      bucket,
      key,
      body: buffer,
      contentType,
      acl: ACLType.ACLPublicRead,
    });
  } catch (error) {
    if (error instanceof TosClientError || error instanceof TosServerError) {
      throw new Error(error.message);
    }
    throw error;
  }

  return `https://${bucket}.${normalizeTosEndpoint(endpoint!)}/${key}`;
}

export async function archiveVideoToTos({
  sourceUrl,
  userId,
  jobId,
}: {
  sourceUrl: string;
  userId: string;
  jobId: string;
}) {
  return archiveMediaToTos({ sourceUrl, userId, jobId, mediaType: "video" });
}
