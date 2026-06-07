import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ACLType, TosClient } from "@volcengine/tos-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const stagingDir = path.join(rootDir, "artifacts/showcase-upload");
const posterDir = path.join(rootDir, "artifacts/showcase-upload/.generated-posters");
const outputJsonPath = path.join(rootDir, "public/samples/showcases.json");
const videoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);

function normalizeEndpoint(value) {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return "video/mp4";
}

function createClient() {
  const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.TOS_ENDPOINT?.trim();
  const region = (process.env.TOS_REGION || "cn-beijing").trim();

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Missing TOS_ACCESS_KEY_ID, TOS_SECRET_ACCESS_KEY, or TOS_ENDPOINT.");
  }

  return new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint: normalizeEndpoint(endpoint),
    secure: true,
    connectionTimeout: 30000,
    requestTimeout: 120000,
    maxRetryCount: 3,
  });
}

function findVideos() {
  return fs
    .readdirSync(stagingDir)
    .filter((fileName) => videoExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(stagingDir, fileName));
}

function generatePoster(videoPath, slug) {
  fs.mkdirSync(posterDir, { recursive: true });
  const posterPath = path.join(posterDir, `${slug}.jpg`);
  execFileSync("ffmpeg", [
    "-y",
    "-ss",
    "00:00:01",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    posterPath,
  ]);
  return posterPath;
}

async function uploadFile(client, { bucket, endpoint, filePath, key }) {
  await client.putObject({
    bucket,
    key,
    body: fs.readFileSync(filePath),
    contentType: contentTypeFor(filePath),
    acl: ACLType.ACLPublicRead,
  });

  return `https://${bucket}.${endpoint}/${key}`;
}

async function main() {
  const bucket = process.env.TOS_BUCKET?.trim();
  const endpoint = normalizeEndpoint(process.env.TOS_ENDPOINT?.trim() || "");
  if (!bucket || !endpoint) {
    throw new Error("Missing TOS_BUCKET or TOS_ENDPOINT.");
  }

  const videos = findVideos();
  if (videos.length === 0) {
    throw new Error(`No video files found in ${stagingDir}`);
  }

  const client = createClient();
  const uploaded = [];

  for (const [index, videoPath] of videos.entries()) {
    const slug = slugify(path.basename(videoPath)) || `showcase-${index + 1}`;
    const id = `showcase-${String(index + 1).padStart(2, "0")}`;
    const posterPath = generatePoster(videoPath, slug);
    const videoKey = `showcases/videos/${slug}${path.extname(videoPath).toLowerCase()}`;
    const posterKey = `showcases/posters/${slug}.jpg`;

    console.log(`Uploading ${path.basename(videoPath)}...`);
    const [videoUrl, posterUrl] = await Promise.all([
      uploadFile(client, { bucket, endpoint, filePath: videoPath, key: videoKey }),
      uploadFile(client, { bucket, endpoint, filePath: posterPath, key: posterKey }),
    ]);

    uploaded.push({
      id,
      title: `Seedance 2.0 Showcase ${String(index + 1).padStart(2, "0")}`,
      posterUrl,
      videoUrl,
      aspectRatio: "auto",
    });
  }

  fs.writeFileSync(outputJsonPath, `${JSON.stringify(uploaded, null, 2)}\n`);
  console.log(`Wrote ${outputJsonPath}`);
  console.log(`Uploaded ${uploaded.length} showcase item(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
