"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const tiers = [
  {
    id: "starter",
    title: "$20 Credits",
    price: 20,
    credits: 2000,
    description: "Best for testing the workflow",
  },
  {
    id: "pro",
    title: "$50 Credits",
    price: 50,
    credits: 5000,
    description: "For weekly content runs",
  },
  {
    id: "studio",
    title: "$100 Credits",
    price: 100,
    credits: 10000,
    description: "For teams and heavier usage",
  },
];

export default function BillingPage() {
  const { isSignedIn } = useUser();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tierId: string) => {
    setLoadingTier(tierId);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier: tierId }),
    });

    const data = await response.json();
    if (data?.url) {
      window.location.href = data.url as string;
      return;
    }

    setLoadingTier(null);
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Sign in to purchase credits</h1>
          <p className="text-sm text-white/60">
            You need an account to buy credits and track usage.
          </p>
          <Link
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a0b10]"
            href="/sign-in"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Billing
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Buy credits</h1>
            <p className="mt-2 text-sm text-white/60">
              $1 = 100 credits · 100 credits per video generation
            </p>
          </div>
          <Link className="text-sm text-white/60 hover:text-white" href="/app">
            Back to Studio
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-xl font-semibold">{tier.title}</h2>
              <p className="mt-2 text-sm text-white/60">{tier.description}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
                <p className="text-white/80">
                  {tier.credits.toLocaleString()} credits
                </p>
                <p className="text-xs text-white/50">${tier.price} one-time</p>
              </div>
              <button
                className="mt-6 w-full rounded-full bg-[#f7c578] px-5 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handleCheckout(tier.id)}
                type="button"
                disabled={loadingTier === tier.id}
              >
                {loadingTier === tier.id ? "Redirecting..." : "Checkout"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
