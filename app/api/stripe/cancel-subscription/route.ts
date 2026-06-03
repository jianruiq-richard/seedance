import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";
import { buildCreditMetadataUpdate } from "@/app/lib/credit-metadata";
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
    const updatedSubscriptionMetadata =
      updatedSubscription as typeof updatedSubscription & {
        current_period_end?: number;
      };

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;

    await client.users.updateUserMetadata(userId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          subscriptionStatus: updatedSubscription.status,
          subscriptionCancelAtPeriodEnd:
            updatedSubscription.cancel_at_period_end,
          subscriptionCancelAt: updatedSubscription.cancel_at,
          subscriptionPeriodEnd:
            updatedSubscriptionMetadata.current_period_end,
        },
        credits: currentCredits,
      }),
    });

    return NextResponse.json({
      success: true,
      cancelAt: updatedSubscription.cancel_at,
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      currentPeriodEnd: updatedSubscriptionMetadata.current_period_end,
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
