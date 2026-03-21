import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { createStripeClient, getPlanByPriceId } from "@/app/lib/stripe";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("Stripe webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = createStripeClient();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  const clerkUserId = subscription.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);

    // Get plan details from subscription
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId);

    if (!plan) return;

    // 获取当前积分，然后增加（订阅续费时增加积分）
    const currentCredits = (user.unsafeMetadata?.credits as number) || 100;
    const isFirstSubscription = !user.unsafeMetadata?.stripeSubscriptionId;

    // 首次订阅设置为计划积分，续费则增加积分
    const newCredits = isFirstSubscription ? plan.credits : currentCredits + plan.credits;

    await client.users.updateUser(clerkUserId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPlan: plan.id,
        credits: newCredits,
        subscriptionPeriodStart: (subscription as any).current_period_start,
        subscriptionPeriodEnd: (subscription as any).current_period_end,
      },
    });

    console.log(`Updated subscription for user ${clerkUserId}: ${plan.name} - Credits: ${newCredits}`);
  } catch (error) {
    console.error("Failed to update user subscription:", error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const clerkUserId = subscription.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();

    await client.users.updateUser(clerkUserId, {
      unsafeMetadata: {
        subscriptionStatus: "canceled",
        currentPlan: null,
        credits: 100, // Reset to free tier credits
      },
    });

    console.log(`Canceled subscription for user ${clerkUserId}`);
  } catch (error) {
    console.error("Failed to cancel user subscription:", error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  try {
    const stripe = createStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Refresh credits for monthly billing
    await handleSubscriptionUpdate(subscription);

    console.log(`Payment succeeded for subscription ${subscriptionId}`);
  } catch (error) {
    console.error("Failed to handle payment success:", error);
  }
}

async function handlePaymentFailed(invoice: any) {
  const clerkUserId = invoice.subscription?.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();

    await client.users.updateUser(clerkUserId, {
      unsafeMetadata: {
        subscriptionStatus: "past_due",
      },
    });

    console.log(`Payment failed for user ${clerkUserId}`);
  } catch (error) {
    console.error("Failed to handle payment failure:", error);
  }
}