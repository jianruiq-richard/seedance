import { TosClient } from "@volcengine/tos-sdk";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

async function main() {
  const accessKeyId = requireEnv("TOS_ACCESS_KEY_ID");
  const accessKeySecret = requireEnv("TOS_SECRET_ACCESS_KEY");
  const endpoint = requireEnv("TOS_ENDPOINT");
  const bucket = requireEnv("TOS_BUCKET");
  const region = (process.env.TOS_REGION || "cn-beijing").trim();

  const client = new TosClient({
    accessKeyId,
    accessKeySecret,
    region,
    endpoint,
  });

  const key = `diagnostics/${Date.now()}-tos-check.txt`;
  const body = Buffer.from(`tos-check ${new Date().toISOString()}\n`, "utf8");

  console.log("Uploading test object:", key);
  await client.putObject({
    bucket,
    key,
    body,
    contentType: "text/plain",
  });

  console.log("Verifying object exists...");
  await client.headObject({ bucket, key });

  console.log("Cleaning up...");
  await client.deleteObject({ bucket, key });

  console.log("TOS check succeeded.");
}

main().catch((error) => {
  console.error("TOS check failed:", error);
  process.exit(1);
});
