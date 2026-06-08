import "dotenv/config";
import Stripe from "stripe";

const emails = [
  "4puppieslovers@gmail.com",
  "jeremiasdesousasousa342@gmail.com",
  "jmiguelrm3d@gmail.com",
  "khayman358@gmail.com",
  "daktariwasimu49@gmail.com",
];

const secretKey =
  process.env.STRIPE_ENV === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

if (!secretKey) {
  throw new Error("Stripe secret key is missing for the selected environment");
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

function fmtTime(ts) {
  if (!ts) return "-";
  return new Date(ts * 1000).toISOString();
}

function dollars(amount, currency) {
  if (amount == null) return "-";
  return `${(amount / 100).toFixed(2)} ${String(currency || "").toUpperCase()}`.trim();
}

async function listAllCheckoutSessionsForCustomer(customerId) {
  const sessions = [];
  for await (const session of stripe.checkout.sessions.list({
    customer: customerId,
    limit: 100,
    expand: ["data.payment_intent", "data.subscription"],
  })) {
    sessions.push(session);
  }
  return sessions;
}

async function listRecentPaymentIntentsForCustomer(customerId) {
  const intents = [];
  for await (const intent of stripe.paymentIntents.list({
    customer: customerId,
    limit: 100,
  })) {
    intents.push(intent);
  }
  return intents;
}

async function listSubscriptionsForCustomer(customerId) {
  const subscriptions = [];
  for await (const subscription of stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  })) {
    subscriptions.push(subscription);
  }
  return subscriptions;
}

for (const email of emails) {
  const customers = await stripe.customers.list({ email, limit: 10 });
  console.log(`\n== ${email} ==`);
  if (customers.data.length === 0) {
    console.log("customer: none");
    continue;
  }

  for (const customer of customers.data) {
    console.log(`customer: ${customer.id} created=${fmtTime(customer.created)} delinquent=${customer.delinquent ?? false}`);

    const [sessions, intents, subscriptions] = await Promise.all([
      listAllCheckoutSessionsForCustomer(customer.id),
      listRecentPaymentIntentsForCustomer(customer.id),
      listSubscriptionsForCustomer(customer.id),
    ]);

    if (sessions.length === 0) {
      console.log("checkout_sessions: none");
    } else {
      console.log("checkout_sessions:");
      for (const session of sessions) {
        const pi =
          session.payment_intent && typeof session.payment_intent !== "string"
            ? `${session.payment_intent.id}/${session.payment_intent.status}`
            : session.payment_intent || "-";
        const sub =
          session.subscription && typeof session.subscription !== "string"
            ? `${session.subscription.id}/${session.subscription.status}`
            : session.subscription || "-";
        console.log(
          `  ${session.id} created=${fmtTime(session.created)} mode=${session.mode} status=${session.status} payment=${session.payment_status} amount=${dollars(session.amount_total, session.currency)} pi=${pi} sub=${sub} metadata=${JSON.stringify(session.metadata || {})}`
        );
      }
    }

    if (intents.length === 0) {
      console.log("payment_intents: none");
    } else {
      console.log("payment_intents:");
      for (const intent of intents) {
        console.log(
          `  ${intent.id} created=${fmtTime(intent.created)} status=${intent.status} amount=${dollars(intent.amount, intent.currency)} last_error=${intent.last_payment_error?.message || "-"}`
        );
      }
    }

    if (subscriptions.length === 0) {
      console.log("subscriptions: none");
    } else {
      console.log("subscriptions:");
      for (const subscription of subscriptions) {
        console.log(
          `  ${subscription.id} created=${fmtTime(subscription.created)} status=${subscription.status} price=${subscription.items.data[0]?.price?.id || "-"} latest_invoice=${subscription.latest_invoice || "-"}`
        );
      }
    }
  }
}
