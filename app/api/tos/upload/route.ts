import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import {
  TosClient,
  TosClientError,
  TosServerError,
  ACLType,
} from "@volcengine/tos-sdk";
import { requireAllowedEmailUser } from "@/app/lib/server-email-access";

export const runtime = "nodejs";

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.TOS_ENDPOINT?.trim();
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || "cn-beijing").trim();

function normalizeTosEndpoint(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `users/${userId}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${safeName}`;

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
    console.error("TOS upload failed:", {
      userId,
      key,
      endpoint: normalizeTosEndpoint(endpoint!),
      bucket,
      contentType,
      size: buffer.length,
      error: serializedError,
    });

    if (error instanceof TosClientError) {
      return NextResponse.json(
        { error: "Upload failed", detail: error.message },
        { status: 500 }
      );
    }
    if (error instanceof TosServerError) {
      return NextResponse.json(
        {
          error: "Upload failed",
          detail: error.message,
          requestId: error.requestId,
          statusCode: error.statusCode,
          code: error.code,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Upload failed",
        detail:
          error instanceof Error ? error.message : serializedError.message,
      },
      { status: 500 }
    );
  }

  const publicUrl = `https://${bucket}.${normalizeTosEndpoint(endpoint!)}/${key}`;
  return NextResponse.json({ url: publicUrl, contentType });
}
