import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  allowedEmailDomainsLabel,
  getPrimaryEmailAddress,
  isAllowedSignupEmail,
} from "./email-access";

export async function requireAllowedEmailUser(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = getPrimaryEmailAddress(user);

  if (!isAllowedSignupEmail(email)) {
    return {
      user: null,
      email,
      response: NextResponse.json(
        {
          error: "Gmail account required",
          detail: `Please use a ${allowedEmailDomainsLabel} address to continue.`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    email,
    response: null,
  };
}
