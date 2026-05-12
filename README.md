This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Analytics

Google Analytics 4 is loaded when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Use `trackEvent` from `app/lib/analytics.ts` in client components to record custom behavior, for example video generation, sign-up, or checkout actions.

Microsoft Clarity is loaded when `NEXT_PUBLIC_CLARITY_PROJECT_ID` is configured:

```bash
NEXT_PUBLIC_CLARITY_PROJECT_ID=your_clarity_project_id
```

Use Clarity's dashboard to inspect heatmaps and session recordings after the site receives real user traffic.

## Stripe Billing

Subscription plans use recurring Stripe Price IDs:

```bash
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_STUDIO=price_...
```

One-time credit packs use one-time Stripe Price IDs:

```bash
STRIPE_PRICE_CREDITS_SMALL=price_...
STRIPE_PRICE_CREDITS_MEDIUM=price_...
STRIPE_PRICE_CREDITS_LARGE=price_...
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
