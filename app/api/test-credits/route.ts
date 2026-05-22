import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { buildCreditMetadataUpdate } from "@/app/lib/credit-metadata";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";
import { requireAllowedEmailUser } from "@/app/lib/server-email-access";

export const runtime = "nodejs";

// 仅用于测试 - 生产环境需要删除
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
    const body = await request.json();
    const { credits, planId } = body;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // 获取当前积分，然后增加
    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;
    const newCredits = currentCredits + (credits || 5000);

    await client.users.updateUserMetadata(userId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          currentPlan: planId || "starter",
          subscriptionStatus: "active",
          stripeCustomerId: "test_customer",
          stripeSubscriptionId: "test_subscription",
        },
        credits: newCredits,
        adjustmentEntry: {
          at: new Date().toISOString(),
          admin: "test",
          before: currentCredits,
          after: newCredits,
          reason: `Test credits update (${planId || "starter"})`,
        },
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Added ${credits || 5000} credits. Total: ${newCredits}`
    });
  } catch (error) {
    console.error("Test credits update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update credits",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
