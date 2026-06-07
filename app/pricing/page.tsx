import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/MarketingShell";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "../lib/stripe";

export const metadata: Metadata = {
  title: "Seedance 2.0 Pricing | AI Video Credit Plans",
  description:
    "Compare Seedance 2.0 AI video credit pricing, monthly plans, one-time credit packs, and model costs for text to video, image to video, and video reference generation.",
  keywords: [
    "Seedance pricing",
    "Seedance 2.0 credits",
    "AI video pricing",
    "text to video pricing",
    "image to video pricing",
    "Seedance credit pack",
    "AI video subscription",
  ],
};

const faqs = [
  {
    question: "How are Seedance 2.0 credits calculated?",
    answer:
      "Credit usage depends on model, resolution, duration, aspect ratio, and whether video input is included. The studio estimates credits before you generate.",
  },
  {
    question: "Do I need a subscription?",
    answer:
      "No. You can subscribe for monthly credits or buy one-time credit packs when you need extra generations.",
  },
  {
    question: "Do unused credits expire?",
    answer:
      "Current plans are designed so unused credits remain in your account balance instead of disappearing at the end of the month.",
  },
];

export default function PricingPage() {
  return (
    <PageShell>
      <main>
        <section className="mx-auto w-full max-w-5xl px-4 py-12 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c578]">
            Seedance 2.0 Pricing
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            AI video credit plans for every creator workflow
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/64">
            Choose a monthly plan or one-time credit pack, then generate text
            to video, image to video, audio synced clips, and video reference
            outputs with transparent credit estimates.
          </p>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article
                key={plan.id}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f7c578]">
                  {plan.name}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-white">${plan.monthlyPrice}</span>
                  <span className="pb-1 text-sm text-white/52">/ month</span>
                </div>
                <p className="mt-3 text-sm text-white/62">
                  {plan.credits.toLocaleString()} credits added each month
                </p>
                <div className="mt-5 grid gap-2 text-sm text-white/58">
                  {plan.features.map((feature) => (
                    <p key={feature}>{feature}</p>
                  ))}
                </div>
                <Link
                  className="mt-6 inline-flex w-full justify-center rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#080a0f]"
                  href="/billing"
                >
                  Subscribe
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            One-Time Credit Packs
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <article key={pack.id} className="rounded-2xl border border-[#f7c578]/18 bg-[#f7c578]/[0.055] p-5">
                <p className="text-sm font-semibold text-white">{pack.name}</p>
                <p className="mt-2 text-3xl font-semibold text-white">${pack.price}</p>
                <p className="mt-2 text-sm text-white/62">
                  {pack.credits.toLocaleString()} credits, added once
                </p>
                <p className="mt-3 text-sm leading-6 text-white/52">{pack.description}</p>
                <Link
                  className="mt-5 inline-flex w-full justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold !text-[#080a0f] shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#f7c578]/70 focus:ring-offset-2 focus:ring-offset-[#15130f]"
                  href="/billing"
                >
                  Buy credits
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-semibold text-white">Pricing FAQ</h2>
          <div className="mt-6 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <h3 className="font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
