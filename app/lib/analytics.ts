"use client";

import { sendGAEvent } from "@next/third-parties/google";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    return;
  }

  sendGAEvent("event", eventName, params);
}
