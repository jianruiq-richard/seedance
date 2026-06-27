import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { TosClient, ACLType } from "@volcengine/tos-sdk";
import { requireAllowedEmailUser } from "@/app/lib/server-email-access";

export const runtime = "nodejs";

const DIRECT_UPLOAD_EXPIRES_SECONDS = 15 * 60;
const LEGACY_RELAY_MAX_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_BYTES_BY_KIND = {
  image: 20 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
} as const;

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.TOS_ENDPOINT?.trim();
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || "cn-beijing").trim();

type MediaKind = keyof typeof MAX_UPLOAD_BYTES_BY_KIND;

function normalizeTosEndpoint(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function getPublicUrl(key: string) {
  return `https://${bucket}.${normalizeTosEndpoint(endpoint!)}/${key}`;
}

function getMediaKind(contentType: string): MediaKind | null {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return null;
}

function safeFileName(fileName: string) {
  return (fileName || "reference").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function createUploadId(input?: unknown) {
  if (typeof input === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(input)) {
    return input;
  }
  return crypto.randomUUID();
}

function createObjectKey({
  userId,
  uploadId,
  fileName,
}: {
  userId: string;
  uploadId: string;
  fileName: string;
}) {
  return `users/${userId}/uploads/${uploadId}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${safeFileName(fileName)}`;
}

function jsonError({
  status,
  reason,
  detail,
  uploadId,
  retryable = false,
}: {
  status: number;
  reason: string;
  detail: string;
  uploadId?: string;
  retryable?: boolean;
}) {
  return NextResponse.json(
    {
      error: "Upload failed",
      reason,
      detail,
      uploadId,
      retryable,
    },
    { status }
  );
}

function validateUploadMetadata({
  fileName,
  fileSize,
  contentType,
}: {
  fileName: unknown;
  fileSize: unknown;
  contentType: unknown;
}) {
  if (typeof fileName !== "string" || !fileName.trim()) {
    return { error: "Missing file name." };
  }
  if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
    return { error: "Missing or invalid file size." };
  }
  if (typeof contentType !== "string" || !contentType.trim()) {
    return { error: "Missing content type." };
  }

  const kind = getMediaKind(contentType);
  if (!kind) {
    return { error: "Upload an image, video, or audio file." };
  }

  const maxBytes = MAX_UPLOAD_BYTES_BY_KIND[kind];
  if (fileSize > maxBytes) {
    return {
      error: `${kind} reference uploads must be ${Math.round(
        maxBytes / 1024 / 1024
      )} MB or smaller.`,
    };
  }

  return { kind };
}

function requireConfig() {
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error(
      "TOS is not configured. Please set TOS_ACCESS_KEY_ID, TOS_SECRET_ACCESS_KEY, TOS_ENDPOINT, TOS_BUCKET."
    );
  }
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
    secure: true,
    connectionTimeout: 30000,
    requestTimeout: 120000,
    maxRetryCount: 3,
  });
}

function serializeUploadError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as Record<string, unknown>;
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as Record<string, unknown>)
      : null;

  return {
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : String(error),
    code: typeof record.code === "string" ? record.code : undefined,
    statusCode:
      typeof record.statusCode === "number" ? record.statusCode : undefined,
    requestId:
      typeof record.requestId === "string" ? record.requestId : undefined,
    cause: cause
      ? {
          name: typeof cause.name === "string" ? cause.name : undefined,
          message:
            typeof cause.message === "string" ? cause.message : undefined,
          code: typeof cause.code === "string" ? cause.code : undefined,
        }
      : undefined,
    errors: Array.isArray(record.errors)
      ? record.errors.map((item) => {
          if (!item || typeof item !== "object") {
            return { message: String(item) };
          }
          const nested = item as Record<string, unknown>;
          return {
            name: typeof nested.name === "string" ? nested.name : undefined,
            message:
              typeof nested.message === "string" ? nested.message : undefined,
            code: typeof nested.code === "string" ? nested.code : undefined,
            address:
              typeof nested.address === "string" ? nested.address : undefined,
            port: typeof nested.port === "number" ? nested.port : undefined,
          };
        })
      : undefined,
  };
}

function getUploadErrorDetail(
  error: unknown,
  serializedError: ReturnType<typeof serializeUploadError>
) {
  const parts = [
    serializedError.message,
    serializedError.name,
    serializedError.code,
    serializedError.statusCode ? `status ${serializedError.statusCode}` : "",
    serializedError.requestId ? `request ${serializedError.requestId}` : "",
    serializedError.cause?.message,
    serializedError.cause?.code,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  try {
    return JSON.stringify(serializedError);
  } catch {
    return error instanceof Error ? error.name : "Unknown upload error";
  }
}

function logUploadEvent(
  message: string,
  data: Record<string, unknown>
) {
  console.info(message, {
    ...data,
    endpoint: endpoint ? normalizeTosEndpoint(endpoint) : undefined,
    bucket,
  });
}

async function handlePresignUpload({
  request,
  userId,
  email,
}: {
  request: Request;
  userId: string;
  email: string | null;
}) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const uploadId = createUploadId(body?.uploadId);

  if (!body || body.action !== "presign") {
    return jsonError({
      status: 400,
      reason: "bad_request",
      detail: "Invalid upload request.",
      uploadId,
    });
  }

  const validation = validateUploadMetadata({
    fileName: body.fileName,
    fileSize: body.fileSize,
    contentType: body.contentType,
  });
  if ("error" in validation) {
    return jsonError({
      status: 400,
      reason: "invalid_file",
      detail: validation.error || "Invalid file.",
      uploadId,
    });
  }

  const key = createObjectKey({
    userId,
    uploadId,
    fileName: String(body.fileName),
  });
  const client = createClient();
  const uploadUrl = client.getPreSignedUrl({
    bucket,
    key,
    method: "PUT",
    expires: DIRECT_UPLOAD_EXPIRES_SECONDS,
  });
  const publicUrl = getPublicUrl(key);

  logUploadEvent("TOS direct upload presigned", {
    uploadId,
    userId,
    email,
    key,
    fileName: body.fileName,
    contentType: body.contentType,
    size: body.fileSize,
    kind: validation.kind,
  });

  return NextResponse.json({
    uploadId,
    uploadUrl,
    key,
    url: publicUrl,
    contentType: body.contentType,
    expiresIn: DIRECT_UPLOAD_EXPIRES_SECONDS,
    method: "PUT",
  });
}

async function handleConfirmUpload({
  request,
  userId,
  email,
}: {
  request: Request;
  userId: string;
  email: string | null;
}) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const uploadId = createUploadId(body?.uploadId);

  if (!body || body.action !== "confirm") {
    return jsonError({
      status: 400,
      reason: "bad_request",
      detail: "Invalid upload confirmation.",
      uploadId,
    });
  }
  if (typeof body.key !== "string" || !body.key.startsWith(`users/${userId}/uploads/${uploadId}/`)) {
    return jsonError({
      status: 400,
      reason: "invalid_key",
      detail: "Upload key does not match this user.",
      uploadId,
    });
  }

  const client = createClient();
  try {
    const head = await client.headObject({ bucket, key: body.key });
    const uploadedSize = Number(head.data["content-length"] || 0);
    if (
      typeof body.fileSize === "number" &&
      Number.isFinite(body.fileSize) &&
      uploadedSize !== body.fileSize
    ) {
      return jsonError({
        status: 400,
        reason: "size_mismatch",
        detail: `Uploaded size ${uploadedSize} does not match expected size ${body.fileSize}.`,
        uploadId,
        retryable: true,
      });
    }

    await client.putObjectAcl({
      bucket,
      key: body.key,
      acl: ACLType.ACLPublicRead,
    });

    logUploadEvent("TOS direct upload confirmed", {
      uploadId,
      userId,
      email,
      key: body.key,
      size: uploadedSize,
      requestId: head.requestId,
    });

    return NextResponse.json({
      uploadId,
      url: getPublicUrl(body.key),
      contentType:
        typeof body.contentType === "string" ? body.contentType : undefined,
    });
  } catch (error) {
    const serializedError = serializeUploadError(error);
    console.error("TOS direct upload confirm failed:", {
      uploadId,
      userId,
      email,
      key: body.key,
      endpoint: normalizeTosEndpoint(endpoint!),
      bucket,
      error: serializedError,
    });
    return jsonError({
      status: 500,
      reason: "tos_confirm_failed",
      detail: getUploadErrorDetail(error, serializedError),
      uploadId,
      retryable: true,
    });
  }
}

async function handleLegacyRelayUpload({
  request,
  userId,
  email,
}: {
  request: Request;
  userId: string;
  email: string | null;
}) {
  const formData = await request.formData();
  const file = formData.get("file");
  const uploadId = createUploadId(formData.get("uploadId"));
  if (!(file instanceof File)) {
    return jsonError({
      status: 400,
      reason: "missing_file",
      detail: "Missing file.",
      uploadId,
    });
  }

  const contentType = file.type || "application/octet-stream";
  const validation = validateUploadMetadata({
    fileName: file.name,
    fileSize: file.size,
    contentType,
  });
  if ("error" in validation) {
    return jsonError({
      status: 400,
      reason: "invalid_file",
      detail: validation.error || "Invalid file.",
      uploadId,
    });
  }
  if (file.size > LEGACY_RELAY_MAX_BYTES) {
    return jsonError({
      status: 413,
      reason: "file_too_large_for_relay",
      detail: "Direct upload is required for files larger than 4 MB.",
      uploadId,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = createObjectKey({ userId, uploadId, fileName: file.name });

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
    const serializedError = serializeUploadError(error);
    console.error("TOS relay upload failed:", {
      uploadId,
      userId,
      email,
      key,
      endpoint: normalizeTosEndpoint(endpoint!),
      bucket,
      contentType,
      size: buffer.length,
      error: serializedError,
    });

    return jsonError({
      status: 500,
      reason: "tos_upload_failed",
      detail: getUploadErrorDetail(error, serializedError),
      uploadId,
      retryable: true,
    });
  }

  const publicUrl = getPublicUrl(key);
  logUploadEvent("TOS relay upload succeeded", {
    uploadId,
    userId,
    email,
    key,
    contentType,
    size: buffer.length,
    kind: validation.kind,
  });
  return NextResponse.json({ uploadId, url: publicUrl, contentType });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await requireAllowedEmailUser(userId);
  if (access.response) {
    return access.response;
  }

  try {
    requireConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing config" },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const requestForAction = request.clone();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (body?.action === "presign") {
      return handlePresignUpload({
        request: requestForAction,
        userId,
        email: access.email,
      });
    }
    if (body?.action === "confirm") {
      return handleConfirmUpload({
        request: requestForAction,
        userId,
        email: access.email,
      });
    }
    return jsonError({
      status: 400,
      reason: "bad_request",
      detail: "Unknown upload action.",
    });
  }

  return handleLegacyRelayUpload({ request, userId, email: access.email });
}
