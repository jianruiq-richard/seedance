 "use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import PayPalCheckout from "@/app/components/PayPalCheckout";

export default function BillingPage() {
  const { user } = useUser();
  const credits =
    (user?.unsafeMetadata?.credits as number | undefined) ?? 100;

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
              <span className="font-semibold text-white">{credits}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Purchase credits</h1>
          <p className="mt-2 text-sm text-white/60">
            Choose a package and complete checkout to top up your account.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <PayPalCheckout disabled={!user} onCreditsUpdated={() => {}} />

            <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              <h2 className="text-base font-semibold text-white">
                What happens after purchase
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Credits are added immediately after PayPal confirms payment.
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/60">
                <p>• Payments are processed securely by PayPal.</p>
                <p>• You will be redirected back to the studio after payment.</p>
                <p>• Need help? Email support@seedance.technology.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
