"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { buildCreditMetadataUpdate } from "@/app/lib/credit-metadata";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";

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
    (user.unsafeMetadata?.credits as number | undefined) ??
    DEFAULT_NEW_USER_CREDITS;
  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: buildCreditMetadataUpdate({
      metadata: user.unsafeMetadata ?? {},
      credits,
      adjustmentEntry: {
        at: new Date().toISOString(),
        admin: adminEmail ?? "unknown",
        before: beforeCredits,
        after: credits,
        reason,
      },
    }),
  });
}
