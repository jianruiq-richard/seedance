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
    endpoint,
  });
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
  if (!isConfigured()) {
    return sourceUrl;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video for archive: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "video/mp4";
  const buffer = Buffer.from(await response.arrayBuffer());
  const key = `users/${userId}/generations/${jobId}-${crypto
    .randomBytes(4)
    .toString("hex")}.mp4`;

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

  return `https://${bucket}.${endpoint}/${key}`;
}
