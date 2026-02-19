import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const priceMap: Record<string, { priceId: string; credits: number }> = {
  starter: {
    priceId: process.env.STRIPE_PRICE_20 ?? "",
    credits: 2000,
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_50 ?? "",
    credits: 5000,
  },
  studio: {
    priceId: process.env.STRIPE_PRICE_100 ?? "",
    credits: 10000,
  },
};

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: Stripe.LatestApiVersion,
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const tier = body?.tier as keyof typeof priceMap;
  const selected = priceMap[tier];

  if (!selected?.priceId) {
    return NextResponse.json(
      { error: "Invalid tier or missing price ID" },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") ?? "";

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: selected.priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/app?checkout=cancel`,
    metadata: {
      userId,
      credits: String(selected.credits),
      tier,
    },
  });

  return NextResponse.json({ url: session.url });
}
