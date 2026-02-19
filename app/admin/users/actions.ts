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

export async function updateUserCredits(
  userId: string,
  credits: number,
  adminEmail: string | null
) {
  if (!isAdminEmail(adminEmail)) {
    throw new Error("Unauthorized");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: {
      ...user.unsafeMetadata,
      credits,
    },
  });
}
