import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
          note: `PayPal top-up (${orderId})`,
        },
      ].slice(-50),
    },
  });

  return { credits: nextCredits, alreadyProcessed: false };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const orderId = String(body?.orderId || "");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  try {
    const env = getPayPalEnv();
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl(env);

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
    if (!orderDetailsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch order details", detail: orderDetails },
        { status: 500 }
      );
    }

    const orderUnit = orderDetails?.purchase_units?.[0];
    const orderCustomId = orderUnit?.custom_id as string | undefined;
    const orderUserId = orderCustomId?.split(":")[0];
    const packageId = orderCustomId?.split(":")[1];

    if (!orderUserId || orderUserId !== userId) {
      return NextResponse.json(
        { error: "Order does not belong to user" },
        { status: 403 }
      );
    }

    const pack = getPackageById(packageId);
    if (!pack) {
      return NextResponse.json(
        { error: "Invalid package in order" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: "PayPal capture failed", detail: data },
        { status: 500 }
      );
    }

    if (data?.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const result = await applyCredits(userId, pack.credits, orderId);
    return NextResponse.json({
      credits: result.credits,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "PayPal capture failed", detail: String(error) },
      { status: 500 }
    );
  }
}
