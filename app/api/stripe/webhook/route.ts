import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import {
  createStripeClient,
  getCreditPackById,
  getPlanByPriceId,
} from "@/app/lib/stripe";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";
import { buildCreditMetadataUpdate } from "@/app/lib/credit-metadata";
import type Stripe from "stripe";

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
  let event: Stripe.Event;

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
        await syncSubscriptionMetadata(
          event.data.object as unknown as StripeSubscriptionLike
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as unknown as StripeSubscriptionLike
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(
          event.data.object as unknown as StripeInvoiceLike
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(
          event.data.object as unknown as StripeInvoiceLike
        );
        break;

      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
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

type StripeSubscriptionLike = {
  id: string;
  customer: string | { id: string };
  metadata?: Record<string, string> | null;
  status?: string;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  items: {
    data: {
      price: {
        id: string;
      };
    }[];
  };
};

type StripeInvoiceLike = {
  id: string;
  parent?: {
    subscription_details?: {
      subscription?: string | StripeSubscriptionLike;
    } | null;
  } | null;
  subscription?: string | StripeSubscriptionLike | null;
};

type StripeExpandableRef = string | { id: string } | null | undefined;

function getCustomerId(customer: StripeSubscriptionLike["customer"]) {
  return typeof customer === "string" ? customer : customer.id;
}

function getExpandableId(value: StripeExpandableRef) {
  return typeof value === "string" ? value : value?.id;
}

async function getSubscriptionFromInvoice(invoice: StripeInvoiceLike) {
  const subscriptionRef =
    invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
  if (!subscriptionRef) return null;
  if (typeof subscriptionRef !== "string") return subscriptionRef;

  const stripe = createStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionRef);
  return subscription as unknown as StripeSubscriptionLike;
}

async function syncSubscriptionMetadata(subscription: StripeSubscriptionLike) {
  const clerkUserId = subscription.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);

    // Get plan details from subscription
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId);

    if (!plan) return;

    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;

    await client.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          stripeCustomerId: getCustomerId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionCancelAtPeriodEnd:
            subscription.cancel_at_period_end ?? false,
          subscriptionCancelAt: subscription.cancel_at ?? null,
          currentPlan: plan.id,
          subscriptionPeriodStart: subscription.current_period_start,
          subscriptionPeriodEnd: subscription.current_period_end,
        },
        credits: currentCredits,
      }),
    });

    console.log(`Synced subscription for user ${clerkUserId}: ${plan.name}`);
  } catch (error) {
    console.error("Failed to update user subscription:", error);
  }
}

async function grantSubscriptionCredits(
  subscription: StripeSubscriptionLike,
  invoiceId: string
) {
  const clerkUserId = subscription.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId);
    if (!plan) return;

    const processedInvoices =
      (user.unsafeMetadata?.processedStripeInvoices as string[] | undefined) ??
      [];
    if (processedInvoices.includes(invoiceId)) {
      console.log(`Skipped duplicate Stripe invoice ${invoiceId}`);
      return;
    }

    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;
    const newCredits = currentCredits + plan.credits;

    await client.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          processedStripeInvoices: [...processedInvoices, invoiceId].slice(-50),
          stripeCustomerId: getCustomerId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionCancelAtPeriodEnd:
            subscription.cancel_at_period_end ?? false,
          subscriptionCancelAt: subscription.cancel_at ?? null,
          currentPlan: plan.id,
          subscriptionPeriodStart: subscription.current_period_start,
          subscriptionPeriodEnd: subscription.current_period_end,
        },
        credits: newCredits,
        adjustmentEntry: {
          at: new Date().toISOString(),
          admin: "stripe",
          before: currentCredits,
          after: newCredits,
          reason: `Stripe ${plan.name} subscription credit grant (${invoiceId})`,
        },
      }),
    });

    console.log(
      `Granted ${plan.credits} credits for Stripe invoice ${invoiceId} to ${clerkUserId}`
    );
  } catch (error) {
    console.error("Failed to grant subscription credits:", error);
  }
}

async function handleSubscriptionDeleted(subscription: StripeSubscriptionLike) {
  const clerkUserId = subscription.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;

    await client.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          subscriptionStatus: "canceled",
          subscriptionCancelAtPeriodEnd: null,
          subscriptionCancelAt: null,
          currentPlan: null,
        },
        credits: currentCredits,
      }),
    });

    console.log(`Canceled subscription for user ${clerkUserId}`);
  } catch (error) {
    console.error("Failed to cancel user subscription:", error);
  }
}

async function handlePaymentSucceeded(invoice: StripeInvoiceLike) {
  try {
    const subscription = await getSubscriptionFromInvoice(invoice);
    if (!subscription) return;

    await syncSubscriptionMetadata(subscription);
    await grantSubscriptionCredits(subscription, invoice.id);

    console.log(`Payment succeeded for invoice ${invoice.id}`);
  } catch (error) {
    console.error("Failed to handle payment success:", error);
  }
}

async function handlePaymentFailed(invoice: StripeInvoiceLike) {
  try {
    const subscription = await getSubscriptionFromInvoice(invoice);
    const clerkUserId = subscription?.metadata?.clerk_user_id;
    if (!clerkUserId) return;

    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;

    await client.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          subscriptionStatus: "past_due",
        },
        credits: currentCredits,
      }),
    });

    console.log(`Payment failed for user ${clerkUserId}`);
  } catch (error) {
    console.error("Failed to handle payment failure:", error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.metadata?.purchase_type !== "credit_pack"
  ) {
    return;
  }

  const clerkUserId = session.metadata.clerk_user_id;
  const pack = getCreditPackById(session.metadata.pack_id);
  if (!clerkUserId || !pack) return;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const processedSessions =
      (user.unsafeMetadata?.processedStripeCheckoutSessions as
        | string[]
        | undefined) ?? [];

    if (processedSessions.includes(session.id)) {
      console.log(`Skipped duplicate Stripe checkout session ${session.id}`);
      return;
    }

    const currentCredits =
      (user.unsafeMetadata?.credits as number | undefined) ??
      DEFAULT_NEW_USER_CREDITS;
    const newCredits = currentCredits + pack.credits;
    const stripeCustomerId = getExpandableId(session.customer);

    await client.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: {
          ...user.unsafeMetadata,
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          processedStripeCheckoutSessions: [
            ...processedSessions,
            session.id,
          ].slice(-50),
        },
        credits: newCredits,
        adjustmentEntry: {
          at: new Date().toISOString(),
          admin: "stripe",
          before: currentCredits,
          after: newCredits,
          reason: `Stripe ${pack.name} one-time credit pack (${session.id})`,
        },
      }),
    });

    console.log(
      `Granted ${pack.credits} one-time credits for checkout ${session.id} to ${clerkUserId}`
    );
  } catch (error) {
    console.error("Failed to grant credit pack credits:", error);
  }
}
