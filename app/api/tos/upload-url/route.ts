import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export const runtime = "nodejs";

const accessKeyId = process.env.TOS_ACCESS_KEY_ID;
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY;
const endpoint = process.env.TOS_ENDPOINT;
const bucket = process.env.TOS_BUCKET;
const region = process.env.TOS_REGION || "cn-beijing";

function requireConfig() {
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error(
      "TOS is not configured. Please set TOS_ACCESS_KEY_ID, TOS_SECRET_ACCESS_KEY, TOS_ENDPOINT, TOS_BUCKET."
    );
  }
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function hmac(key: Buffer | string, data: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: string) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getSignatureKey(secret: string, date: string, regionName: string) {
  const kDate = hmac(`TOS4${secret}`, date);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, "tos");
  return hmac(kService, "request");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeKey(key: string) {
  return key
    .split("/")
    .map((part) => encodeRfc3986(part))
    .join("/");
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

  const body = await request.json();
  const filename = String(body?.filename || "upload.png");
  const contentType = String(body?.contentType || "application/octet-stream");

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `users/${userId}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${safeName}`;

  const host = `${bucket}.${endpoint}`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const expires = 900; // 15 minutes

  const credentialScope = `${dateStamp}/${region}/tos/request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams: Record<string, string> = {
    "X-Tos-Algorithm": "TOS4-HMAC-SHA256",
    "X-Tos-Credential": credential,
    "X-Tos-Date": amzDate,
    "X-Tos-Expires": String(expires),
    "X-Tos-SignedHeaders": "host",
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(queryParams[k])}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    `/${encodeKey(key)}`,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region);
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const uploadUrl = `https://${host}/${key}?${canonicalQuery}&X-Tos-Signature=${signature}`;
  const publicUrl = `https://${host}/${key}`;

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    contentType,
  });
}
