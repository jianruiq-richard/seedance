"use server";

import { clerkClient } from "@clerk/nextjs/server";

function isAdminEmail(email: string | null) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function updateUserCreditsWithLog(
  userId: string,
  credits: number,
  adminEmail: string | null,
  reason: string
) {
  if (!isAdminEmail(adminEmail)) {
    throw new Error("Unauthorized");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const beforeCredits =
    (user.unsafeMetadata?.credits as number | undefined) ?? 0;
  const existingLog =
    (user.unsafeMetadata?.creditAdjustments as
      | {
          at: string;
          admin: string;
          before: number;
          after: number;
          reason: string;
        }[]
      | undefined) ?? [];
  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: {
      ...user.unsafeMetadata,
      credits,
      creditAdjustments: [
        ...existingLog,
        {
          at: new Date().toISOString(),
          admin: adminEmail ?? "unknown",
          before: beforeCredits,
          after: credits,
          reason,
        },
      ].slice(-50),
    },
  });
}
