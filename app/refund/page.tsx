import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/MarketingShell";

export const metadata: Metadata = {
  title: "Refund Policy | Seedance 2",
  description:
    "Refund policy for Seedance 2 subscriptions, credit packs, billing issues, and account support.",
};

export default function RefundPage() {
  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 text-white sm:px-6">
        <h1 className="text-4xl font-semibold">Refund Policy</h1>
        <p className="mt-4 leading-7 text-white/62">
          This policy explains how refund requests are handled for Seedance 2
          subscriptions and one-time credit packs. If you have a billing issue,
          contact us with your account email and payment receipt.
        </p>

        <section className="mt-8 grid gap-5 text-sm leading-7 text-white/62">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-semibold text-white">Subscriptions</h2>
            <p className="mt-2">
              You can cancel a subscription before the next renewal. Refunds for
              renewed subscription periods are reviewed case by case when there
              is a billing error or service issue.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-semibold text-white">Credit Packs</h2>
            <p className="mt-2">
              One-time credit packs are generally non-refundable after credits
              have been used. Unused credit pack purchases may be reviewed if
              you contact support promptly after purchase.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="text-lg font-semibold text-white">Support</h2>
            <p className="mt-2">
              Email{" "}
              <a className="text-[#f7c578] hover:underline" href="mailto:support@seedance.technology">
                support@seedance.technology
              </a>{" "}
              for billing help. Include your account email, transaction date,
              and a short description of the issue.
            </p>
          </div>
        </section>

        <Link className="mt-8 inline-flex rounded-full bg-[#f7c578] px-5 py-3 text-sm font-semibold text-[#080a0f]" href="/pricing">
          Back to Pricing
        </Link>
      </main>
    </PageShell>
  );
}
