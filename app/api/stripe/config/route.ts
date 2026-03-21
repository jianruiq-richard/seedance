import { NextResponse } from "next/server";
import { getStripePublishableKey, getStripeEnv } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getStripeEnv();
    const publishableKey = getStripePublishableKey();

    return NextResponse.json({
      publishableKey,
      env
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe config error" },
      { status: 500 }
    );
  }
}