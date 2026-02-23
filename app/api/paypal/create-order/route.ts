import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  formatUsd,
  getPackageById,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  getPayPalEnv,
} from "@/app/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const packageId = String(body?.packageId || "");
  const pack = getPackageById(packageId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  try {
    const env = getPayPalEnv();
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl(env);

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: formatUsd(pack.usd),
            },
            custom_id: `${userId}:${pack.id}`,
            description: `${pack.credits} credits`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: "PayPal order failed", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: "PayPal order failed", detail: String(error) },
      { status: 500 }
    );
  }
}
