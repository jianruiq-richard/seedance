"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CREDIT_PACKS } from "@/app/lib/stripe";

type Props = {
  disabled?: boolean;
  onPurchaseStarted?: () => void;
};

export default function CreditPackCheckout({
  disabled,
  onPurchaseStarted,
}: Props) {
  const { user } = useUser();
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[1]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.publishableKey) {
          setIsReady(true);
        } else {
          setError(data?.error || "Stripe config missing.");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Stripe config failed.");
      });
  }, []);

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
        onPurchaseStarted?.();
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit pack purchase failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#f7c578]/20 bg-[#f7c578]/[0.06] p-6 text-sm text-white/70">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>One-time Credit Packs</span>
        <span>No subscription required</span>
      </div>
      <h2 className="mt-3 text-xl font-semibold text-white">Top up credits</h2>
      <p className="mt-2 text-sm text-white/60">
        Buy credits immediately when your balance runs low. These do not change your subscription.
      </p>

      <div className="mt-5 grid gap-3">
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              selectedPack.id === pack.id
                ? "border-[#f7c578] bg-[#f7c578]/10 text-white"
                : "border-white/20 bg-black/10 text-white/70 hover:border-white/50"
            }`}
            onClick={() => setSelectedPack(pack)}
            disabled={disabled || processing}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                  {pack.name}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {pack.credits.toLocaleString()} credits, added once
                </p>
                <p className="mt-2 text-xs opacity-60">{pack.description}</p>
              </div>
              <span className="shrink-0 text-lg font-bold">${pack.price}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {disabled ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
            Sign in to buy credits.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBuyCreditPack}
            disabled={processing || !isReady}
            className="w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-[#f7c578]/90 disabled:opacity-60"
          >
            {processing ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0b10] border-t-transparent" />
                Processing...
              </span>
            ) : (
              `Buy ${selectedPack.credits.toLocaleString()} credits - $${selectedPack.price}`
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
    </div>
  );
}
