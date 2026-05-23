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

function compactPreservedMetadata(metadata: UnsafeMetadata) {
  const compact: UnsafeMetadata = {};

  for (const key of Object.keys(metadata)) {
    if (!PRESERVED_METADATA_KEYS.has(key)) {
      compact[key] = null;
    }
  }

  const currentPlan = nullableString(metadata.currentPlan);
  const subscriptionStatus = nullableString(metadata.subscriptionStatus);
  const stripeCustomerId = nullableString(metadata.stripeCustomerId);
  const stripeSubscriptionId = nullableString(metadata.stripeSubscriptionId);

  if (currentPlan !== undefined || "currentPlan" in metadata) {
    compact.currentPlan = currentPlan ?? null;
  }
  if (subscriptionStatus !== undefined || "subscriptionStatus" in metadata) {
    compact.subscriptionStatus = subscriptionStatus ?? null;
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
