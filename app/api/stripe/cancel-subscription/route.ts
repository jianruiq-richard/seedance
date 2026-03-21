import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createStripeClient } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    const stripe = createStripeClient();

    // Verify subscription belongs to user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata.clerk_user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this subscription" },
        { status: 403 }
      );
    }

    // Cancel at period end to allow user to continue using until next billing cycle
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    return NextResponse.json({
      success: true,
      cancelAt: (updatedSubscription as any).cancel_at,
      currentPeriodEnd: (updatedSubscription as any).current_period_end,
    });
  } catch (error) {
    console.error("Stripe cancel subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}