import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createStripeClient, getCreditPackById } from "@/app/lib/stripe";

export const runtime = "nodejs";

function getAppBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.seedance.technology";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { packId, customerEmail } = body;

    const pack = getCreditPackById(packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
    }
    if (!pack.priceId) {
      return NextResponse.json(
        { error: "Credit pack price is not configured" },
        { status: 500 }
      );
    }

    const stripe = createStripeClient();
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    const customer =
      existingCustomers.data[0] ??
      (await stripe.customers.create({
        email: customerEmail,
        metadata: {
          clerk_user_id: userId,
        },
      }));

    const metadata = {
      purchase_type: "credit_pack",
      clerk_user_id: userId,
      pack_id: pack.id,
      credits: pack.credits.toString(),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "payment",
      line_items: [
        {
          price: pack.priceId,
          quantity: 1,
        },
      ],
      success_url: `${getAppBaseUrl()}/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppBaseUrl()}/billing?canceled=true`,
      metadata,
      payment_intent_data: {
        metadata,
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Stripe credit pack checkout error:", error);
    return NextResponse.json(
      {
        error: "Failed to create credit pack checkout",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
