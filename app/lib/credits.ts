export const DEFAULT_NEW_USER_CREDITS = 800;

const DEFAULT_FPS = 24;
const PRICE_OVER_COST = 2;
const CREDITS_PER_USD = 1000;
const USD_CNY_RATE = 7.2;
const SEEDREAM_INPUT_IMAGE_COST_RMB = 0.02;
const SEEDREAM_LITE_OUTPUT_COST_RMB = 0.22;
const SEEDREAM_PRO_SMALL_OUTPUT_COST_RMB = 0.3;
const SEEDREAM_PRO_LARGE_OUTPUT_COST_RMB = 0.6;
const SEEDREAM_PRO_LARGE_OUTPUT_MIN_PIXELS = 1536 * 1536;

export const resolutions = ["480p", "720p", "1080p"] as const;
export const seedanceModels = [
  {
    label: "Seedance 2.0 Fast",
    value: "doubao-seedance-2-0-fast-260128",
  },
  {
    label: "Seedance 2.0",
    value: "doubao-seedance-2-0-260128",
  },
] as const;

export const DEFAULT_SEEDANCE_MODEL = seedanceModels[0].value;
export const seedreamModels = [
  {
    label: "Seedream 5.0 Pro",
    value: "doubao-seedream-5-0-pro-260628",
  },
  {
    label: "Seedream 5.0 Lite",
    value: "doubao-seedream-5-0-lite-260628",
  },
] as const;

export const DEFAULT_SEEDREAM_MODEL = seedreamModels[0].value;
export const imageSizes = [
  "1K",
  "2K",
  "1024x1024",
  "1424x800",
  "800x1424",
  "1152x864",
  "864x1152",
  "1248x832",
  "832x1248",
  "1568x672",
  "2048x2048",
  "2816x1584",
  "1584x2816",
  "2368x1776",
  "1776x2368",
  "2496x1664",
  "1664x2496",
  "3136x1344",
] as const;

export type ResolutionLabel = (typeof resolutions)[number];
export type RatioKey = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
export type SeedanceModel = (typeof seedanceModels)[number]["value"];
export type SeedreamModel = (typeof seedreamModels)[number]["value"];
type PriceModelKey = "doubao-seedance-2.0" | "doubao-seedance-2.0-fast";
type AspectRatioGroup = "16:9" | "4:3" | "1:1" | "21:9";
type PriceMode = "no_video" | "with_video";
type OutputDuration = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

const pricingResolutionMap = {
  "480p": {
    "16:9": [864, 496],
    "4:3": [752, 560],
    "1:1": [640, 640],
    "3:4": [560, 752],
    "9:16": [496, 864],
    "21:9": [992, 432],
  },
  "720p": {
    "16:9": [1280, 720],
    "4:3": [1112, 834],
    "1:1": [960, 960],
    "3:4": [834, 1112],
    "9:16": [720, 1280],
    "21:9": [1470, 630],
  },
  "1080p": {
    "16:9": [1920, 1080],
    "4:3": [1664, 1248],
    "1:1": [1440, 1440],
    "3:4": [1248, 1664],
    "9:16": [1080, 1920],
    "21:9": [2206, 946],
  },
} satisfies Record<ResolutionLabel, Record<RatioKey, [number, number]>>;

const tokenUnitPrices = {
  "doubao-seedance-2.0": {
    "480p": { no_video: 46, with_video: 28 },
    "720p": { no_video: 46, with_video: 28 },
    "1080p": { no_video: 51, with_video: 31 },
  },
  "doubao-seedance-2.0-fast": {
    "480p": { no_video: 37, with_video: 22 },
    "720p": { no_video: 37, with_video: 22 },
  },
} satisfies Record<
  PriceModelKey,
  Partial<Record<ResolutionLabel, Record<PriceMode, number>>>
>;

const aspectRatioGroup = {
  "16:9": "16:9",
  "9:16": "16:9",
  "4:3": "4:3",
  "3:4": "4:3",
  "1:1": "1:1",
  "21:9": "21:9",
} satisfies Record<RatioKey, AspectRatioGroup>;

const minTokens = {
  "480p": {
    "16:9": {
      4: 70308,
      5: 90396,
      6: 100440,
      7: 120528,
      8: 140616,
      9: 150660,
      10: 170748,
      11: 190836,
      12: 200880,
      13: 220968,
      14: 241056,
      15: 251100,
    },
    "4:3": {
      4: 69090,
      5: 88830,
      6: 98700,
      7: 118440,
      8: 138180,
      9: 148050,
      10: 167790,
      11: 187530,
      12: 197400,
      13: 217140,
      14: 236880,
      15: 246750,
    },
    "1:1": {
      4: 67200,
      5: 86400,
      6: 96000,
      7: 115200,
      8: 134400,
      9: 144000,
      10: 163200,
      11: 182400,
      12: 192000,
      13: 211200,
      14: 230400,
      15: 240000,
    },
    "21:9": {
      4: 70308,
      5: 90396,
      6: 100440,
      7: 120528,
      8: 140616,
      9: 150660,
      10: 170748,
      11: 190836,
      12: 200880,
      13: 220968,
      14: 241056,
      15: 251100,
    },
  },
  "720p": {
    "16:9": {
      4: 151200,
      5: 194400,
      6: 216000,
      7: 259200,
      8: 302400,
      9: 324000,
      10: 367200,
      11: 410400,
      12: 432000,
      13: 475200,
      14: 518400,
      15: 540000,
    },
    "4:3": {
      4: 152153,
      5: 195625,
      6: 217361,
      7: 260834,
      8: 304306,
      9: 326042,
      10: 369514,
      11: 412986,
      12: 434723,
      13: 478195,
      14: 521667,
      15: 543403,
    },
    "1:1": {
      4: 151200,
      5: 194400,
      6: 216000,
      7: 259200,
      8: 302400,
      9: 324000,
      10: 367200,
      11: 410400,
      12: 432000,
      13: 475200,
      14: 518400,
      15: 540000,
    },
    "21:9": {
      4: 151938,
      5: 195349,
      6: 217055,
      7: 260466,
      8: 303877,
      9: 325582,
      10: 368993,
      11: 412404,
      12: 434109,
      13: 477520,
      14: 520931,
      15: 542637,
    },
  },
  "1080p": {
    "16:9": {
      4: 340200,
      5: 437400,
      6: 486000,
      7: 583200,
      8: 680400,
      9: 729000,
      10: 826200,
      11: 923400,
      12: 972000,
      13: 1069200,
      14: 1166400,
      15: 1215000,
    },
    "4:3": {
      4: 340704,
      5: 438048,
      6: 486720,
      7: 584064,
      8: 681408,
      9: 730080,
      10: 827424,
      11: 924768,
      12: 973440,
      13: 1070784,
      14: 1168128,
      15: 1216800,
    },
    "1:1": {
      4: 340200,
      5: 437400,
      6: 486000,
      7: 583200,
      8: 680400,
      9: 729000,
      10: 826200,
      11: 923400,
      12: 972000,
      13: 1069200,
      14: 1166400,
      15: 1215000,
    },
    "21:9": {
      4: 342378,
      5: 440200,
      6: 489112,
      7: 586934,
      8: 684756,
      9: 733667,
      10: 831490,
      11: 929312,
      12: 978223,
      13: 1076045,
      14: 1173868,
      15: 1222779,
    },
  },
} satisfies Record<
  ResolutionLabel,
  Record<AspectRatioGroup, Record<OutputDuration, number>>
>;

type PriceResult =
  | {
      estimatedTokens: number;
      minTokensLimit: number;
      finalBilledTokens: number;
      pricePerMillionRmb: number;
      totalCostRmb: number;
    }
  | {
      error: string;
    };

function normalizePricingModel(model: string): PriceModelKey | null {
  if (
    model === "doubao-seedance-2.0" ||
    model === "doubao-seedance-2-0-260128"
  ) {
    return "doubao-seedance-2.0";
  }

  if (
    model === "doubao-seedance-2.0-fast" ||
    model === "doubao-seedance-2-0-fast-260128"
  ) {
    return "doubao-seedance-2.0-fast";
  }

  return null;
}

export function calculateVideoPrice(
  resolutionLabel: string,
  aspectRatio: string,
  durationSeconds: number,
  model: string = DEFAULT_SEEDANCE_MODEL,
  inputVideoDuration = 0,
  fps = DEFAULT_FPS
): PriceResult {
  const normalizedRatio = aspectRatio === "adaptive" ? "16:9" : aspectRatio;
  const ratioMap =
    pricingResolutionMap[resolutionLabel as ResolutionLabel] ?? null;
  const pricingModel = normalizePricingModel(model);

  if (!pricingModel) {
    return { error: `Unsupported Seedance model: ${model}` };
  }
  if (!ratioMap) {
    return { error: `Unsupported resolution: ${resolutionLabel}` };
  }
  if (!Object.prototype.hasOwnProperty.call(ratioMap, normalizedRatio)) {
    return {
      error: `Unsupported ratio for ${resolutionLabel}: ${normalizedRatio}`,
    };
  }
  if (!Number.isInteger(durationSeconds) || durationSeconds < 4 || durationSeconds > 15) {
    return {
      error: `Seedance 2.0 duration must be an integer from 4 to 15.`,
    };
  }
  if (!Number.isFinite(inputVideoDuration) || inputVideoDuration < 0) {
    return { error: "Input video duration must be a non-negative number." };
  }
  if (pricingModel === "doubao-seedance-2.0-fast" && resolutionLabel === "1080p") {
    return {
      error: "Seedance 2.0 Fast does not support 1080p. Use 480p or 720p.",
    };
  }

  const [width, height] = ratioMap[normalizedRatio as RatioKey];
  const outputDuration = durationSeconds as OutputDuration;
  const ratioGroup = aspectRatioGroup[normalizedRatio as RatioKey];
  const minTokensLimit =
    minTokens[resolutionLabel as ResolutionLabel][ratioGroup][outputDuration];
  const estimatedTokens =
    ((inputVideoDuration + durationSeconds) * width * height * fps) / 1024;
  const finalBilledTokens =
    inputVideoDuration > 0
      ? Math.max(estimatedTokens, minTokensLimit)
      : estimatedTokens;
  const priceMode = inputVideoDuration > 0 ? "with_video" : "no_video";
  const resolutionPrices =
    (
      tokenUnitPrices[pricingModel] as Partial<
        Record<ResolutionLabel, Record<PriceMode, number>>
      >
    )[resolutionLabel as ResolutionLabel] ?? null;

  if (!resolutionPrices) {
    return {
      error: `Unsupported resolution for ${pricingModel}: ${resolutionLabel}`,
    };
  }

  const pricePerMillionRmb = resolutionPrices[priceMode];
  const totalCostRmb = (pricePerMillionRmb * finalBilledTokens) / 1_000_000;

  return {
    estimatedTokens,
    minTokensLimit,
    finalBilledTokens,
    pricePerMillionRmb,
    totalCostRmb,
  };
}

export function calculateCreditCost({
  resolution,
  ratio,
  duration,
  model,
  inputVideoDuration = 0,
}: {
  resolution: string;
  ratio: string;
  duration: number;
  generateAudio?: boolean;
  model?: string;
  inputVideoDuration?: number;
}) {
  const price = calculateVideoPrice(
    resolution,
    ratio,
    duration,
    model,
    inputVideoDuration
  );
  if ("error" in price) {
    return price;
  }

  return {
    credits: Math.max(
      1,
      Math.ceil(rmbCostToCredits(price.totalCostRmb))
    ),
  };
}

function rmbCostToCredits(totalCostRmb: number) {
  return (totalCostRmb / USD_CNY_RATE) * PRICE_OVER_COST * CREDITS_PER_USD;
}

function normalizeSeedreamModel(model: string): SeedreamModel | null {
  if (
    model === "doubao-seedream-5-0-pro" ||
    model === "doubao-seedream-5-0-pro-260628"
  ) {
    return "doubao-seedream-5-0-pro-260628";
  }

  if (
    model === "doubao-seedream-5-0-lite" ||
    model === "doubao-seedream-5-0-lite-260628"
  ) {
    return "doubao-seedream-5-0-lite-260628";
  }

  return null;
}

export function calculateImageCreditCost({
  model = DEFAULT_SEEDREAM_MODEL,
  size,
  hasReferenceImage = false,
  referenceImageCount,
  sequentialImageGeneration = "disabled",
  maxImages,
}: {
  model?: string;
  size: string;
  hasReferenceImage?: boolean;
  referenceImageCount?: number;
  sequentialImageGeneration?: "auto" | "disabled";
  maxImages?: number;
}) {
  const normalizedModel = normalizeSeedreamModel(model);
  if (!normalizedModel) {
    return { error: `Unsupported Seedream model: ${model}` };
  }
  if (!imageSizes.includes(size as (typeof imageSizes)[number])) {
    return { error: `Unsupported image size: ${size}` };
  }
  if (
    referenceImageCount !== undefined &&
    (!Number.isInteger(referenceImageCount) || referenceImageCount < 0)
  ) {
    return { error: "Reference image count must be a non-negative integer." };
  }
  if (
    maxImages !== undefined &&
    (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > 15)
  ) {
    return { error: "max_images must be an integer from 1 to 15." };
  }

  const normalizedReferenceCount =
    referenceImageCount ?? (hasReferenceImage ? 1 : 0);
  const isLite = normalizedModel === "doubao-seedream-5-0-lite-260628";
  const outputImageCount =
    isLite && sequentialImageGeneration === "auto"
      ? (maxImages ?? Math.max(1, 15 - normalizedReferenceCount))
      : 1;
  const outputPixels =
    size === "1K"
      ? 1024 * 1024
      : size === "2K"
        ? 2048 * 2048
        : size
            .split("x")
            .map(Number)
            .reduce((total, value) => total * value, 1);

  const outputCostRmb = isLite
    ? SEEDREAM_LITE_OUTPUT_COST_RMB
    : outputPixels > SEEDREAM_PRO_LARGE_OUTPUT_MIN_PIXELS
      ? SEEDREAM_PRO_LARGE_OUTPUT_COST_RMB
      : SEEDREAM_PRO_SMALL_OUTPUT_COST_RMB;
  const inputCostRmb = isLite
    ? 0
    : normalizedReferenceCount * SEEDREAM_INPUT_IMAGE_COST_RMB;
  const totalCostRmb = inputCostRmb + outputImageCount * outputCostRmb;

  return {
    credits: Math.max(
      1,
      Math.ceil(rmbCostToCredits(totalCostRmb))
    ),
  };
}
