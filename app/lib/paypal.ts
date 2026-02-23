export type PayPalEnv = "sandbox" | "live";

export type PayPalPackage = {
  id: "pack_5" | "pack_10" | "pack_30";
  usd: number;
  credits: number;
  label: string;
};

export const PAYPAL_PACKAGES: PayPalPackage[] = [
  { id: "pack_5", usd: 5, credits: 5000, label: "Starter" },
  { id: "pack_10", usd: 10, credits: 11000, label: "Growth" },
  { id: "pack_30", usd: 30, credits: 35000, label: "Studio" },
];

export function getPayPalEnv(): PayPalEnv {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

export function getPayPalClientId(env: PayPalEnv) {
  return env === "live"
    ? process.env.PAYPAL_CLIENT_ID_LIVE
    : process.env.PAYPAL_CLIENT_ID_SANDBOX;
}

export function getPayPalSecret(env: PayPalEnv) {
  return env === "live"
    ? process.env.PAYPAL_CLIENT_SECRET_LIVE
    : process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
}

export function getPayPalBaseUrl(env: PayPalEnv) {
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function getPackageById(id: string | undefined) {
  return PAYPAL_PACKAGES.find((pack) => pack.id === id) ?? null;
}

export async function getPayPalAccessToken() {
  const env = getPayPalEnv();
  const clientId = getPayPalClientId(env);
  const secret = getPayPalSecret(env);
  if (!clientId || !secret) {
    throw new Error("PayPal credentials are not configured.");
  }
  const baseUrl = getPayPalBaseUrl(env);
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PayPal token error: ${detail}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export function formatUsd(value: number) {
  return value.toFixed(2);
}
