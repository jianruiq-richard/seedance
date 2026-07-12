type CreditUsageEntry = {
  at: string;
  amount: number;
  note?: string;
  taskId?: string | null;
  jobId?: string | null;
  prompt?: string;
  params?: {
    ratio?: string | null;
    resolution?: string | null;
    duration?: number | null;
    inputVideoDuration?: number | null;
    generateAudio?: boolean | null;
    model?: string | null;
    size?: string | null;
    hasReferenceImage?: boolean | null;
    seed?: number | null;
    watermark?: boolean | null;
    output_format?: string | null;
    sequential_image_generation?: string | null;
    max_images?: number | null;
    web_search?: boolean | null;
    optimize_prompt_mode?: string | null;
  };
};

type CreditAdjustmentEntry = {
  at: string;
  admin: string;
  before: number;
  after: number;
  reason: string;
};

type UnsafeMetadata = Record<string, unknown>;

const MAX_CREDIT_USAGE_ENTRIES = 10;
const MAX_CREDIT_ADJUSTMENT_ENTRIES = 10;
const MAX_REFUNDED_JOB_IDS = 40;
const MAX_STRIPE_DEDUPE_IDS = 50;

const PRESERVED_METADATA_KEYS = new Set([
  "credits",
  "creditUsage",
  "creditAdjustments",
  "refundedGenerationJobIds",
  "currentPlan",
  "subscriptionStatus",
  "subscriptionCancelAtPeriodEnd",
  "subscriptionCancelAt",
  "subscriptionPeriodStart",
  "subscriptionPeriodEnd",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "processedStripeInvoices",
  "processedStripeCheckoutSessions",
]);

function trimText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function normalizeCreditUsageEntry(value: unknown): CreditUsageEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const params =
    record.params && typeof record.params === "object"
      ? (record.params as Record<string, unknown>)
      : null;

  return {
    at: typeof record.at === "string" ? record.at : new Date().toISOString(),
    amount: Number(record.amount ?? 0),
    note: trimText(record.note, 80),
    taskId: typeof record.taskId === "string" ? record.taskId : null,
    jobId: typeof record.jobId === "string" ? record.jobId : null,
    prompt: trimText(record.prompt, 120),
    params: params
      ? {
          ratio: trimText(params.ratio, 16) ?? null,
          resolution: trimText(params.resolution, 16) ?? null,
          duration:
            typeof params.duration === "number" ? params.duration : null,
          inputVideoDuration:
            typeof params.inputVideoDuration === "number"
              ? params.inputVideoDuration
              : null,
          generateAudio:
            typeof params.generateAudio === "boolean"
              ? params.generateAudio
              : null,
          model: trimText(params.model, 80) ?? null,
          size: trimText(params.size, 16) ?? null,
          hasReferenceImage:
            typeof params.hasReferenceImage === "boolean"
              ? params.hasReferenceImage
              : null,
          seed: typeof params.seed === "number" ? params.seed : null,
          watermark:
            typeof params.watermark === "boolean" ? params.watermark : null,
          output_format: trimText(params.output_format, 16) ?? null,
          sequential_image_generation:
            trimText(params.sequential_image_generation, 16) ?? null,
          max_images:
            typeof params.max_images === "number" ? params.max_images : null,
          web_search:
            typeof params.web_search === "boolean" ? params.web_search : null,
          optimize_prompt_mode:
            trimText(params.optimize_prompt_mode, 16) ?? null,
        }
      : undefined,
  };
}

function normalizeCreditAdjustmentEntry(
  value: unknown
): CreditAdjustmentEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    at: typeof record.at === "string" ? record.at : new Date().toISOString(),
    admin: trimText(record.admin, 80) ?? "unknown",
    before: Number(record.before ?? 0),
    after: Number(record.after ?? 0),
    reason: trimText(record.reason, 180) ?? "",
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : value === null ? null : undefined;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" ? value : value === null ? null : undefined;
}

function compactPreservedMetadata(metadata: UnsafeMetadata) {
  const compact: UnsafeMetadata = {};

  for (const key of Object.keys(metadata)) {
    if (!PRESERVED_METADATA_KEYS.has(key)) {
      compact[key] = null;
    }
  }

  const currentPlan = nullableString(metadata.currentPlan);
  const subscriptionStatus = nullableString(metadata.subscriptionStatus);
  const subscriptionCancelAt = nullableNumber(metadata.subscriptionCancelAt);
  const subscriptionPeriodStart = nullableNumber(
    metadata.subscriptionPeriodStart
  );
  const subscriptionPeriodEnd = nullableNumber(metadata.subscriptionPeriodEnd);
  const subscriptionCancelAtPeriodEnd =
    typeof metadata.subscriptionCancelAtPeriodEnd === "boolean"
      ? metadata.subscriptionCancelAtPeriodEnd
      : metadata.subscriptionCancelAtPeriodEnd === null
        ? null
        : undefined;
  const stripeCustomerId = nullableString(metadata.stripeCustomerId);
  const stripeSubscriptionId = nullableString(metadata.stripeSubscriptionId);

  if (currentPlan !== undefined || "currentPlan" in metadata) {
    compact.currentPlan = currentPlan ?? null;
  }
  if (subscriptionStatus !== undefined || "subscriptionStatus" in metadata) {
    compact.subscriptionStatus = subscriptionStatus ?? null;
  }
  if (
    subscriptionCancelAtPeriodEnd !== undefined ||
    "subscriptionCancelAtPeriodEnd" in metadata
  ) {
    compact.subscriptionCancelAtPeriodEnd =
      subscriptionCancelAtPeriodEnd ?? null;
  }
  if (
    subscriptionCancelAt !== undefined ||
    "subscriptionCancelAt" in metadata
  ) {
    compact.subscriptionCancelAt = subscriptionCancelAt ?? null;
  }
  if (
    subscriptionPeriodStart !== undefined ||
    "subscriptionPeriodStart" in metadata
  ) {
    compact.subscriptionPeriodStart = subscriptionPeriodStart ?? null;
  }
  if (
    subscriptionPeriodEnd !== undefined ||
    "subscriptionPeriodEnd" in metadata
  ) {
    compact.subscriptionPeriodEnd = subscriptionPeriodEnd ?? null;
  }
  if (stripeCustomerId !== undefined || "stripeCustomerId" in metadata) {
    compact.stripeCustomerId = stripeCustomerId ?? null;
  }
  if (stripeSubscriptionId !== undefined || "stripeSubscriptionId" in metadata) {
    compact.stripeSubscriptionId = stripeSubscriptionId ?? null;
  }

  const processedStripeInvoices = normalizeStringArray(
    metadata.processedStripeInvoices
  ).slice(-MAX_STRIPE_DEDUPE_IDS);
  const processedStripeCheckoutSessions = normalizeStringArray(
    metadata.processedStripeCheckoutSessions
  ).slice(-MAX_STRIPE_DEDUPE_IDS);

  if (
    processedStripeInvoices.length > 0 ||
    "processedStripeInvoices" in metadata
  ) {
    compact.processedStripeInvoices = processedStripeInvoices;
  }
  if (
    processedStripeCheckoutSessions.length > 0 ||
    "processedStripeCheckoutSessions" in metadata
  ) {
    compact.processedStripeCheckoutSessions = processedStripeCheckoutSessions;
  }

  return compact;
}

export function buildCreditMetadataUpdate({
  metadata,
  credits,
  usageEntry,
  adjustmentEntry,
  refundedGenerationJobId,
}: {
  metadata: UnsafeMetadata;
  credits: number;
  usageEntry?: CreditUsageEntry;
  adjustmentEntry?: CreditAdjustmentEntry;
  refundedGenerationJobId?: string;
}) {
  const creditUsage = [
    ...(Array.isArray(metadata.creditUsage) ? metadata.creditUsage : []),
    usageEntry,
  ]
    .map(normalizeCreditUsageEntry)
    .filter((item): item is CreditUsageEntry => Boolean(item))
    .slice(-MAX_CREDIT_USAGE_ENTRIES);

  const creditAdjustments = [
    ...(Array.isArray(metadata.creditAdjustments)
      ? metadata.creditAdjustments
      : []),
    adjustmentEntry,
  ]
    .map(normalizeCreditAdjustmentEntry)
    .filter((item): item is CreditAdjustmentEntry => Boolean(item))
    .slice(-MAX_CREDIT_ADJUSTMENT_ENTRIES);

  const refundedGenerationJobIds = [
    ...normalizeStringArray(metadata.refundedGenerationJobIds),
    ...(refundedGenerationJobId ? [refundedGenerationJobId] : []),
  ].slice(-MAX_REFUNDED_JOB_IDS);

  return {
    ...compactPreservedMetadata(metadata),
    credits,
    creditUsage,
    creditAdjustments,
    refundedGenerationJobIds,
  };
}
