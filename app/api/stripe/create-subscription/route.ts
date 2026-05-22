import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAllowedEmailUser } from "@/app/lib/server-email-access";
import { createStripeClient, getPlanById } from "@/app/lib/stripe";

export const runtime = "nodejs";

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
    const { planId, customerEmail } = body;

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = createStripeClient();

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          clerk_user_id: userId,
        },
      });
    }

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.seedance.technology'}/app?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.seedance.technology'}/billing?canceled=true`,
      metadata: {
        clerk_user_id: userId,
        plan_id: plan.id,
        credits: plan.credits.toString(),
      },
      subscription_data: {
        metadata: {
          clerk_user_id: userId,
          plan_id: plan.id,
          credits: plan.credits.toString(),
        },
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
