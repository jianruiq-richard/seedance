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

const modelPricing = [
  {
    model: "Seedance 2.0",
    rows: [
      ["480p", "6 credits/sec", "30 credits", "4 credits/sec", "32 credits"],
      ["720p", "12 credits/sec", "60 credits", "8 credits/sec", "64 credits"],
      ["1080p", "30 credits/sec", "150 credits", "20 credits/sec", "160 credits"],
    ],
  },
  {
    model: "Seedance 2.0 Fast",
    rows: [
      ["480p", "5 credits/sec", "25 credits", "3 credits/sec", "24 credits"],
      ["720p", "10 credits/sec", "50 credits", "6 credits/sec", "48 credits"],
    ],
  },
];

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

        <section className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                  Seedance Model Credit Pricing
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                  Credits consumed per second vary by model, resolution, and
                  whether a video reference is included. These examples help
                  users compare common 5-second generations.
                </p>
              </div>
              <Link className="text-sm font-semibold text-[#f7c578]" href="/app">
                Estimate in studio
              </Link>
            </div>

            <div className="mt-7 grid gap-5">
              {modelPricing.map((model) => (
                <div key={model.model} className="overflow-hidden rounded-2xl border border-white/10 bg-black/18">
                  <div className="border-b border-white/10 px-5 py-4">
                    <h3 className="font-semibold text-white">{model.model}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.14em] text-white/38">
                        <tr>
                          <th className="px-5 py-3">Resolution</th>
                          <th className="px-5 py-3">Without Video Input</th>
                          <th className="px-5 py-3">5s Example</th>
                          <th className="px-5 py-3">With Video Input</th>
                          <th className="px-5 py-3">5s + 3s Input Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8 text-white/68">
                        {model.rows.map((row) => (
                          <tr key={`${model.model}-${row[0]}`}>
                            {row.map((cell) => (
                              <td key={cell} className="px-5 py-4">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
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
