export const DEFAULT_NEW_USER_CREDITS = 600;

const DEFAULT_FPS = 24;
const PRICE_OVER_COST = 2;
const DEFAULT_PRICE_WITH_AUDIO = 16 * PRICE_OVER_COST;
const DEFAULT_PRICE_WITHOUT_AUDIO = 8 * PRICE_OVER_COST;
const CREDITS_PER_USD = 1000;
const USD_CNY_RATE = 7.2;

export const resolutions = ["480p", "720p", "1080p"] as const;

export type ResolutionLabel = (typeof resolutions)[number];
export type RatioKey = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

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

type PriceResult =
  | {
      totalTokens: number;
      unitPrice: number;
      totalPrice: number;
    }
  | {
      error: string;
    };

export function calculateVideoPrice(
  resolutionLabel: string,
  aspectRatio: string,
  durationSeconds: number,
  hasAudio: boolean,
  fps = DEFAULT_FPS
): PriceResult {
  const normalizedRatio = aspectRatio === "adaptive" ? "16:9" : aspectRatio;
  const ratioMap =
    pricingResolutionMap[resolutionLabel as ResolutionLabel] ?? null;

  if (!ratioMap) {
    return { error: `Unsupported resolution: ${resolutionLabel}` };
  }
  if (!Object.prototype.hasOwnProperty.call(ratioMap, normalizedRatio)) {
    return {
      error: `Unsupported ratio for ${resolutionLabel}: ${normalizedRatio}`,
    };
  }

  const [width, height] = ratioMap[normalizedRatio as RatioKey];
  const totalTokens = (width * height * fps * durationSeconds) / 1024;
  const unitPrice = hasAudio
    ? DEFAULT_PRICE_WITH_AUDIO
    : DEFAULT_PRICE_WITHOUT_AUDIO;
  const totalPrice = totalTokens * (unitPrice / 1_000_000);

  return {
    totalTokens,
    unitPrice,
    totalPrice,
  };
}

export function calculateCreditCost({
  resolution,
  ratio,
  duration,
  generateAudio,
}: {
  resolution: string;
  ratio: string;
  duration: number;
  generateAudio: boolean;
}) {
  const price = calculateVideoPrice(resolution, ratio, duration, generateAudio);
  if ("error" in price) {
    return price;
  }

  return {
    credits: Math.max(
      1,
      Math.ceil((price.totalPrice / USD_CNY_RATE) * CREDITS_PER_USD)
    ),
  };
}
