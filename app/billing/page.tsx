"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import StripeSubscription from "@/app/components/StripeSubscription";
import { DEFAULT_NEW_USER_CREDITS } from "@/app/lib/credits";

export default function BillingPage() {
  const { user } = useUser();
  const credits =
    (user?.unsafeMetadata?.credits as number | undefined) ??
    DEFAULT_NEW_USER_CREDITS;
  const currentPlan = user?.unsafeMetadata?.currentPlan as string | undefined;
  const subscriptionStatus = user?.unsafeMetadata?.subscriptionStatus as string | undefined;
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("topup") === "success") {
      const showTimeout = window.setTimeout(() => setTopUpSuccess(true), 0);
      const refreshTimeout = window.setTimeout(() => {
        setTopUpSuccess(false);
        window.history.replaceState({}, "", "/billing");
        window.location.reload();
      }, 3000);

      return () => {
        window.clearTimeout(showTimeout);
        window.clearTimeout(refreshTimeout);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="border-b border-white/10 bg-[#0c0f18]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]" />
            <span className="text-lg font-semibold">Seedance Studio</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <Link className="hover:text-white" href="/app">
              Back to studio
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 md:flex">
              <span className="text-white/60">Credits</span>
              <span className="font-semibold text-white">{credits.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Billing & Subscription</h1>
          <p className="mt-2 text-sm text-white/60">
            Choose a monthly credit plan or buy one-time credits when you need more.
          </p>

          {topUpSuccess && (
            <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm font-semibold text-green-400">
                Credit pack payment received.
              </p>
              <p className="mt-1 text-xs text-green-300/80">
                Credits are being added to your balance. This page will refresh shortly.
              </p>
            </div>
          )}

          {/* Current Plan Info */}
          {currentPlan && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-lg font-semibold text-white">Current Plan</h3>
              <div className="mt-2 grid gap-2 text-sm text-white/70">
                <p>Plan: <span className="text-white font-semibold capitalize">{currentPlan}</span></p>
                <p>Status: <span className="text-white font-semibold capitalize">{subscriptionStatus}</span></p>
                <p>Credits: <span className="text-white font-semibold">{credits.toLocaleString()}</span></p>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <StripeSubscription disabled={!user} onSubscriptionUpdated={() => window.location.reload()} />

            <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              <h2 className="text-base font-semibold text-white">
                How billing works
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Credits are used for every video generation. Monthly plans renew automatically, while credit packs are one-time top-ups.
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/60">
                <p>• <strong>Monthly plans:</strong> Credits are added each billing cycle</p>
                <p>• <strong>Credit packs:</strong> One-time purchases that add credits immediately</p>
                <p>• <strong>No subscription required:</strong> Any signed-in user can buy credit packs</p>
                <p>• <strong>Carry over:</strong> Unused credits stay in your balance</p>
                <p>• <strong>Cancel anytime:</strong> Monthly plans can be canceled before the next renewal</p>
                <p>• <strong>Secure payments:</strong> Powered by Stripe</p>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold text-white">Need Help?</p>
                <p className="mt-1 text-xs text-white/60">
                  Contact our support team at{" "}
                  <a
                    href="mailto:support@seedance.technology"
                    className="text-[#f7c578] hover:underline"
                  >
                    support@seedance.technology
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
