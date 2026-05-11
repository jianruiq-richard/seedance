import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";

export const runtime = "nodejs";

// 仅用于测试 - 生产环境需要删除
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    await client.users.updateUser(userId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        credits: newCredits,
        currentPlan: planId || "starter",
        subscriptionStatus: "active",
        stripeCustomerId: "test_customer",
        stripeSubscriptionId: "test_subscription",
      },
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
