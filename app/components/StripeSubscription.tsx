"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useUser } from "@clerk/nextjs";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/app/lib/stripe";

type StripeConfig = {
  publishableKey: string;
  env: "test" | "live";
};

type Props = {
  onSubscriptionUpdated?: () => void;
  disabled?: boolean;
};

export default function StripeSubscription({ onSubscriptionUpdated, disabled }: Props) {
  const { user } = useUser();
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[0]);
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Get current subscription info from user metadata
  const currentPlan = user?.unsafeMetadata?.currentPlan as string | undefined;
  const subscriptionStatus = user?.unsafeMetadata?.subscriptionStatus as string | undefined;
  const stripeSubscriptionId = user?.unsafeMetadata?.stripeSubscriptionId as string | undefined;

  useEffect(() => {
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.publishableKey) {
          setConfig({ publishableKey: data.publishableKey, env: data.env });
        } else {
          setError(data?.error || "Stripe config missing.");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Stripe config failed.");
        setLoading(false);
      });
  }, []);

  const handleSubscribe = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      setError("Email address is required");
      return;
    }

    if (!config?.publishableKey) {
      setError("Stripe not configured");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const stripe = await loadStripe(config.publishableKey);
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          customerEmail: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create subscription");
      }

      // Redirect to Stripe Checkout for subscription
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Fallback: if using PaymentIntent flow
      if (data.clientSecret) {
        const { error: stripeError } = await stripe.confirmPayment({
          clientSecret: data.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/billing?success=true`,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }
      }

      onSubscriptionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!stripeSubscriptionId) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: stripeSubscriptionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to cancel subscription");
      }

      onSubscriptionUpdated?.();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyCreditPack = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      setError("Email address is required");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-credit-pack-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: selectedPack.id,
          customerEmail: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create credit pack checkout");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      onSubscriptionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit pack purchase failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Monthly Plans</span>
        <span>{config?.env === "live" ? "Live" : "Test Mode"}</span>
      </div>

      {/* Current Subscription Status */}
      {currentPlan && (
        <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-400">
                Current: {SUBSCRIPTION_PLANS.find(p => p.id === currentPlan)?.name}
              </p>
              <p className="text-xs text-green-300/70">
                Status: {subscriptionStatus}
              </p>
            </div>
            {subscriptionStatus === "active" && (
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={processing}
                className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-400 transition hover:border-red-500/60 disabled:opacity-50"
              >
                {processing ? "..." : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Selection */}
      <div className="mt-4 grid gap-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`text-left rounded-2xl border px-4 py-4 transition ${
              selectedPlan.id === plan.id
                ? "border-white bg-white text-[#0a0b10]"
                : "border-white/20 text-white/70 hover:border-white/50"
            } ${currentPlan === plan.id ? "opacity-50" : ""}`}
            onClick={() => setSelectedPlan(plan)}
            disabled={disabled || processing || currentPlan === plan.id}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold">
                    {plan.name}
                  </p>
                  {currentPlan === plan.id && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-lg font-bold">
                  ${plan.monthlyPrice}/month
                </p>
                <p className="text-xs opacity-70">
                  {plan.credits.toLocaleString()} credits added each month
                </p>
                <div className="mt-2 space-y-1">
                  {plan.features.map((feature, index) => (
                    <p key={index} className="text-xs opacity-60">
                      • {feature}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Subscribe Button */}
      {!currentPlan && (
        <div className="mt-4">
          {disabled ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
              Sign in to subscribe to a plan.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:opacity-60"
            >
              {processing ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0b10] border-t-transparent" />
                  Processing...
                </span>
              ) : (
                `Subscribe to ${selectedPlan.name} - $${selectedPlan.monthlyPrice}/month`
              )}
            </button>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-6">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>One-time Credit Packs</span>
          <span>No subscription required</span>
        </div>
        <div className="mt-4 grid gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                selectedPack.id === pack.id
                  ? "border-[#f7c578] bg-[#f7c578]/10 text-white"
                  : "border-white/20 text-white/70 hover:border-white/50"
              }`}
              onClick={() => setSelectedPack(pack)}
              disabled={disabled || processing}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {pack.name}
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    ${pack.price}
                  </p>
                  <p className="text-xs opacity-70">
                    {pack.credits.toLocaleString()} credits, added once
                  </p>
                  <p className="mt-2 text-xs opacity-60">{pack.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {disabled ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
              Sign in to buy credits.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBuyCreditPack}
              disabled={processing}
              className="w-full rounded-2xl border border-[#f7c578]/40 bg-[#f7c578]/10 px-4 py-3 text-sm font-semibold text-[#f7c578] transition hover:bg-[#f7c578]/20 disabled:opacity-60"
            >
              {processing ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f7c578] border-t-transparent" />
                  Processing...
                </span>
              ) : (
                `Buy ${selectedPack.credits.toLocaleString()} credits - $${selectedPack.price}`
              )}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
    </div>
  );
}
