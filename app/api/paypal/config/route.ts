import { NextResponse } from "next/server";
import { getPayPalClientId, getPayPalEnv } from "@/app/lib/paypal";

export const runtime = "nodejs";

export async function GET() {
  const env = getPayPalEnv();
  const clientId = getPayPalClientId(env);
  if (!clientId) {
    return NextResponse.json(
      { error: "PayPal client id is not configured." },
      { status: 500 }
    );
  }
  return NextResponse.json({ clientId, env });
}
