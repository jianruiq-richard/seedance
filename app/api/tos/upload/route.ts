import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { TosClient, TosClientError, TosServerError } from "@volcengine/tos-sdk";

export const runtime = "nodejs";

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.TOS_ENDPOINT?.trim();
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || "cn-beijing").trim();

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
    endpoint,
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      acl: "public-read",
    });
  } catch (error) {
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
      { error: "Upload failed", detail: String(error) },
      { status: 500 }
    );
  }

  const publicUrl = `https://${bucket}.${endpoint}/${key}`;
  return NextResponse.json({ url: publicUrl, contentType });
}
