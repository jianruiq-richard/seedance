import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  getPackageById,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  getPayPalEnv,
} from "@/app/lib/paypal";

export const runtime = "nodejs";

async function applyCredits(userId: string, creditsToAdd: number, orderId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentCredits =
    (user.unsafeMetadata?.credits as number | undefined) ?? 100;
  const processed =
    (user.unsafeMetadata?.paypalOrders as string[] | undefined) ?? [];

  if (processed.includes(orderId)) {
    return { credits: currentCredits, alreadyProcessed: true };
  }

  const nextCredits = currentCredits + creditsToAdd;
  const creditUsage =
    (user.unsafeMetadata?.creditUsage as
      | { at: string; amount: number; note?: string }[]
      | undefined) ?? [];

  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: {
      ...user.unsafeMetadata,
      credits: nextCredits,
      paypalOrders: [...processed, orderId].slice(-50),
      creditUsage: [
        ...creditUsage,
        {
          at: new Date().toISOString(),
          amount: creditsToAdd,
          note: `PayPal webhook (${orderId})`,
        },
      ].slice(-50),
    },
  });

  return { credits: nextCredits, alreadyProcessed: false };
}

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    return NextResponse.json(
      { error: "Missing PAYPAL_WEBHOOK_ID" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");

  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo
  ) {
    return NextResponse.json(
      { error: "Missing PayPal headers" },
      { status: 400 }
    );
  }

  try {
    const env = getPayPalEnv();
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl(env);

    const verifyResponse = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }
    );

    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok || verifyData?.verification_status !== "SUCCESS") {
      return NextResponse.json(
        { error: "Webhook verification failed", detail: verifyData },
        { status: 400 }
      );
    }

    if (event?.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return NextResponse.json({ received: true });
    }

    const capture = event?.resource;
    const orderId = capture?.supplementary_data?.related_ids?.order_id as
      | string
      | undefined;

    if (!orderId) {
      return NextResponse.json(
        { error: "Webhook missing order id" },
        { status: 400 }
      );
    }

    let orderUserId: string | undefined;
    let packageId: string | undefined;

    const customId = capture?.custom_id as string | undefined;
    if (customId) {
      orderUserId = customId.split(":")[0];
      packageId = customId.split(":")[1];
    }

    if (!orderUserId || !packageId) {
      const orderDetailsResponse = await fetch(
        `${baseUrl}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const orderDetails = await orderDetailsResponse.json();
      if (orderDetailsResponse.ok) {
        const unit = orderDetails?.purchase_units?.[0];
        const detailCustomId = unit?.custom_id as string | undefined;
        orderUserId = detailCustomId?.split(":")[0];
        packageId = detailCustomId?.split(":")[1];
      }
    }

    if (!orderUserId || !packageId) {
      return NextResponse.json(
        { error: "Webhook missing required data" },
        { status: 400 }
      );
    }

    const pack = getPackageById(packageId);
    if (!pack) {
      return NextResponse.json(
        { error: "Invalid package in webhook" },
        { status: 400 }
      );
    }

    await applyCredits(orderUserId, pack.credits, orderId);

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook handling failed", detail: String(error) },
      { status: 500 }
    );
  }
}
