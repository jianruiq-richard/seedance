"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PayPalConfig = {
  clientId: string;
  env: "sandbox" | "live";
};

type Package = {
  id: "pack_5" | "pack_10" | "pack_30";
  usd: number;
  credits: number;
  label: string;
};

const PACKAGES: Package[] = [
  { id: "pack_5", usd: 5, credits: 5000, label: "Starter" },
  { id: "pack_10", usd: 10, credits: 11000, label: "Growth" },
  { id: "pack_30", usd: 30, credits: 35000, label: "Studio" },
];

type PayPalWindow = Window &
  typeof globalThis & {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: unknown) => void;
      }) => { render: (container: HTMLElement) => Promise<void> };
    };
  };

type Props = {
  onCreditsUpdated: (nextCredits: number) => void;
  disabled?: boolean;
};

export default function PayPalCheckout({ onCreditsUpdated, disabled }: Props) {
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [selected, setSelected] = useState<Package>(PACKAGES[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef<boolean>(false);
  const selectedRef = useRef<Package>(PACKAGES[0]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/paypal/config")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.clientId) {
          setConfig({ clientId: data.clientId, env: data.env });
        } else {
          setError(data?.error || "PayPal config missing.");
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "PayPal config failed.");
        }
      })
    return () => {
      mounted = false;
    };
  }, []);

  const scriptSrc = useMemo(() => {
    if (!config?.clientId) return null;
    const params = new URLSearchParams({
      "client-id": config.clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons",
    });
    return `https://www.paypal.com/sdk/js?${params.toString()}`;
  }, [config]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const win = window as PayPalWindow;
    if (!scriptSrc) return;
    if (win.paypal) {
      setLoading(false);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-paypal-sdk]"
    );
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => {
      setLoading(false);
    };
    script.onerror = () => {
      setError("Failed to load PayPal SDK.");
    };
    document.body.appendChild(script);
  }, [scriptSrc]);

  useEffect(() => {
    const win = window as PayPalWindow;
    const container = containerRef.current;
    if (!container || !win.paypal || loading || error) return;
    if (renderedRef.current) return;

    renderedRef.current = true;
    win
      .paypal
      .Buttons({
        createOrder: async () => {
          setProcessing(true);
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageId: selectedRef.current.id }),
          });
          const data = await response.json();
          if (!response.ok) {
            setProcessing(false);
            throw new Error(data?.error || "Create order failed");
          }
          return data.orderId as string;
        },
        onApprove: async (data) => {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const result = await response.json();
          setProcessing(false);
          if (!response.ok) {
            setError(result?.error || "Capture failed");
            return;
          }
          if (typeof result?.credits === "number") {
            onCreditsUpdated(result.credits);
            window.location.href = "/app";
          }
        },
        onError: (err) => {
          setProcessing(false);
          setError(err instanceof Error ? err.message : "PayPal error");
        },
      })
      .render(container)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "PayPal render failed.");
        renderedRef.current = false;
      });
  }, [loading, error, onCreditsUpdated]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Buy credits</span>
        <span>{config?.env === "live" ? "Live" : "Sandbox"}</span>
      </div>
      <div className="mt-4 grid gap-3">
        {PACKAGES.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              selected.id === pack.id
                ? "border-white bg-white text-[#0a0b10]"
                : "border-white/20 text-white/70 hover:border-white/50"
            }`}
            onClick={() => setSelected(pack)}
            disabled={disabled || processing}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">
                {pack.label}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {pack.credits.toLocaleString()} credits
              </p>
            </div>
            <span className="text-sm font-semibold">${pack.usd}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {disabled ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
            Sign in to purchase credits.
          </div>
        ) : (
          <div
            ref={containerRef}
            className={`min-h-[44px] ${processing ? "opacity-60" : ""}`}
          />
        )}
      </div>

      {processing && (
        <p className="mt-2 text-xs text-white/60">Processing payment...</p>
      )}
      {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
    </div>
  );
}
