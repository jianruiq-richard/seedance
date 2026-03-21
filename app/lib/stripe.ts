import Stripe from "stripe";

export type StripeEnv = "test" | "live";

export type SubscriptionPlan = {
  id: "starter" | "growth" | "studio";
  name: string;
  credits: number;
  priceId: string; // Stripe Price ID
  monthlyPrice: number;
  features: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 5000,
    monthlyPrice: 5,
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    features: [
      "5,000 credits per month",
      "Text to video generation",
      "Image to video generation",
      "Basic video quality"
    ]
  },
  {
    id: "growth",
    name: "Growth",
    credits: 11000,
    monthlyPrice: 10,
    priceId: process.env.STRIPE_PRICE_GROWTH || "",
    features: [
      "11,000 credits per month",
      "All Starter features",
      "Higher video quality",
      "Priority processing"
    ]
  },
  {
    id: "studio",
    name: "Studio",
    credits: 35000,
    monthlyPrice: 30,
    priceId: process.env.STRIPE_PRICE_STUDIO || "",
    features: [
      "35,000 credits per month",
      "All Growth features",
      "Premium video quality",
      "API access",
      "Team collaboration"
    ]
  }
];

export function getStripeEnv(): StripeEnv {
  return process.env.STRIPE_ENV === "live" ? "live" : "test";
}

export function getStripeSecretKey(): string {
  const env = getStripeEnv();
  const key = env === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

  if (!key) {
    throw new Error(`Stripe secret key not configured for ${env} environment`);
  }
  return key;
}

export function getStripePublishableKey(): string {
  const env = getStripeEnv();
  const key = env === "live"
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;

  if (!key) {
    throw new Error(`Stripe publishable key not configured for ${env} environment`);
  }
  return key;
}

export function createStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });
}

export function getPlanById(id: string | undefined): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) ?? null;
}

export function getPlanByPriceId(priceId: string | undefined): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((plan) => plan.priceId === priceId) ?? null;
}

export function formatPrice(price: number): string {
  return (price / 100).toFixed(2);
}