import { NextResponse } from "next/server";
import { after } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  calculateImageCreditCost,
  DEFAULT_NEW_USER_CREDITS,
  DEFAULT_SEEDREAM_MODEL,
  imageSizes,
  seedreamModels,
} from "../../lib/credits";
import { buildCreditMetadataUpdate } from "../../lib/credit-metadata";
import {
  getPrimaryEmailAddress,
  isAllowedSignupEmail,
} from "../../lib/email-access";
import {
  createGenerationJob,
  getGenerationJobForUser,
  updateGenerationJobResult,
} from "../../lib/generation-jobs";
import {
  archiveSeedreamImage,
  createSeedreamImage,
  createSeedreamImageStream,
  getSeedreamImageUrl,
  SeedreamRequestError,
} from "../../lib/seedream-tasks";

export const runtime = "nodejs";
export const maxDuration = 300;

const supportedModels = new Set<string>(seedreamModels.map((item) => item.value));

type GenerateImageRequest = {
  model?: string;
  prompt?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  size?: string;
  seed?: number;
  watermark?: boolean;
  response_format?: "url" | "b64_json";
  output_format?: "png" | "jpeg";
  sequential_image_generation?: "auto" | "disabled";
  max_images?: number;
  web_search?: boolean;
  optimize_prompt_mode?: "standard";
};

function normalizeModel(input?: string | null) {
  const value = input || DEFAULT_SEEDREAM_MODEL;
  const aliases: Record<string, string> = {
    "seedream5.0-pro": "doubao-seedream-5-0-pro-260628",
    "seedream-5.0-pro": "doubao-seedream-5-0-pro-260628",
    "seedream 5.0 pro": "doubao-seedream-5-0-pro-260628",
    "doubao-seedream-5-0-pro": "doubao-seedream-5-0-pro-260628",
    pro: "doubao-seedream-5-0-pro-260628",
    "seedream5.0-lite": "doubao-seedream-5-0-lite-260628",
    "seedream-5.0-lite": "doubao-seedream-5-0-lite-260628",
    "seedream 5.0 lite": "doubao-seedream-5-0-lite-260628",
    "doubao-seedream-5-0-lite": "doubao-seedream-5-0-lite-260628",
    lite: "doubao-seedream-5-0-lite-260628",
  };
  return aliases[value.toLowerCase()] ?? value;
}

function sizeToRatio(size: string) {
  const [width, height] = size.split("x").map(Number);
  if (!width || !height) return "1:1";
  if (width === height) return "1:1";
  return width > height ? "16:9" : "9:16";
}

function validateImageOptions({
  model,
  prompt,
  size,
  imageUrls,
  sequentialImageGeneration,
  maxImages,
  webSearch,
}: {
  model: string;
  prompt: string;
  size: string;
  imageUrls: string[];
  sequentialImageGeneration: "auto" | "disabled";
  maxImages?: number;
  webSearch?: boolean;
}) {
  if (!supportedModels.has(model)) {
    return `Unsupported Seedream model: ${model}`;
  }
  if (!prompt.trim()) {
    return "Prompt is required for image generation.";
  }
  if (!imageSizes.includes(size as (typeof imageSizes)[number])) {
    return `Unsupported image size: ${size}`;
  }
  const isPro = model.includes("-pro-");
  if (isPro && sequentialImageGeneration !== "disabled") {
    return "Seedream 5.0 Pro does not support sequential_image_generation. Use disabled.";
  }
  if (isPro && webSearch) {
    return "Seedream 5.0 Pro does not support web_search.";
  }
  if (
    maxImages !== undefined &&
    (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > 15)
  ) {
    return "max_images must be an integer from 1 to 15.";
  }
  const maxReferenceImages = isPro ? 10 : 14;
  if (imageUrls.length > maxReferenceImages) {
    return `Seedream 5.0 ${isPro ? "Pro" : "Lite"} supports up to ${maxReferenceImages} reference images.`;
  }
  if (
    !isPro &&
    sequentialImageGeneration === "auto" &&
    imageUrls.length + (maxImages ?? 15) > 15
  ) {
    return "For Seedream 5.0 Lite group images, reference image count plus max_images must be 15 or less.";
  }
  return null;
}

function getErrorDetail(error: unknown) {
  return error instanceof SeedreamRequestError
    ? (error.detail ?? error.message)
    : error instanceof Error
      ? error.message
      : "Unknown error";
}

async function refundFailedSeedreamJob({
  userId,
  jobId,
  requestId,
  prompt,
  credits,
  reason,
  model,
  size,
}: {
  userId: string;
  jobId: string;
  requestId: string | null;
  prompt: string;
  credits: number;
  reason: string;
  model: string;
  size: string;
}) {
  if (credits <= 0) return;

  const client = await clerkClient();
  const latestUser = await client.users.getUser(userId);
  const latestMetadata = latestUser.unsafeMetadata ?? {};
  const refundedJobIds =
    (latestMetadata.refundedGenerationJobIds as string[] | undefined) ?? [];
  if (refundedJobIds.includes(jobId)) return;

  const latestCredits = (latestMetadata.credits as number | undefined) ?? 0;
  await client.users.updateUserMetadata(userId, {
    unsafeMetadata: buildCreditMetadataUpdate({
      metadata: latestMetadata,
      credits: latestCredits + credits,
      refundedGenerationJobId: jobId,
      usageEntry: {
        at: new Date().toISOString(),
        amount: credits,
        note: "Refund failed image generation",
        taskId: requestId,
        jobId,
        prompt: prompt.slice(0, 120),
        params: { model, size },
      },
      adjustmentEntry: {
        at: new Date().toISOString(),
        admin: "system",
        before: latestCredits,
        after: latestCredits + credits,
        reason: `Refund failed Seedream generation ${requestId ?? jobId}: ${reason.slice(0, 120)}`,
      },
    }),
  });
}

async function processSeedreamJob(jobId: string, userId: string) {
  const job = await getGenerationJobForUser(jobId, userId);
  if (!job || job.outputType !== "image" || job.status !== "queued") {
    return job;
  }

  const payload = job.requestPayload;
  if (!payload) {
    await updateGenerationJobResult({
      id: job.id,
      clerkUserId: userId,
      status: "failed",
      errorMessage: "Missing Seedream request payload.",
    });
    return null;
  }

  await updateGenerationJobResult({
    id: job.id,
    clerkUserId: userId,
    status: "processing",
  });

  const model = String(payload.model ?? "");
  const size = String(payload.size ?? job.resolution ?? "1K");
  const useStream =
    !model.includes("-pro-") &&
    payload.sequential_image_generation === "auto";

  try {
    let persistedImageUrl: string | null = null;

    const persistImage = async (sourceUrl: string) => {
      if (persistedImageUrl) return persistedImageUrl;
      try {
        persistedImageUrl = await archiveSeedreamImage({
          sourceUrl,
          userId,
          jobId: job.id,
        });
      } catch (archiveError) {
        console.error("Failed to archive generated image:", archiveError);
        persistedImageUrl = sourceUrl;
      }
      await updateGenerationJobResult({
        id: job.id,
        clerkUserId: userId,
        status: "processing",
        imageUrl: persistedImageUrl,
      });
      return persistedImageUrl;
    };

    if (useStream) {
      const failures: string[] = [];
      await createSeedreamImageStream(payload, async (event) => {
        if (event.type === "image_generation.partial_succeeded" && event.url) {
          await persistImage(event.url);
        }
        if (event.type === "image_generation.partial_failed") {
          const reason =
            typeof event.error === "string"
              ? event.error
              : event.error?.message ?? "Partial image generation failed.";
          failures.push(reason);
        }
        if (event.error) {
          const reason =
            typeof event.error === "string"
              ? event.error
              : event.error.message ?? JSON.stringify(event.error);
          failures.push(reason);
        }
      });

      if (!persistedImageUrl) {
        throw new Error(failures[0] ?? "Seedream stream did not return an image URL.");
      }
    } else {
      const data = await createSeedreamImage(payload);
      const generatedImageUrl = getSeedreamImageUrl(data);

      if (!generatedImageUrl) {
        throw new Error("Seedream did not return an image URL.");
      }
      await persistImage(generatedImageUrl);
    }

    return updateGenerationJobResult({
      id: job.id,
      clerkUserId: userId,
      status: "succeeded",
      imageUrl: persistedImageUrl,
    });
  } catch (error) {
    const errorDetail = getErrorDetail(error);
    await updateGenerationJobResult({
      id: job.id,
      clerkUserId: userId,
      status: "failed",
      errorMessage: errorDetail,
    });
    try {
      await refundFailedSeedreamJob({
        userId,
        jobId: job.id,
        requestId: job.upstreamTaskId,
        prompt: job.prompt,
        credits: job.creditsCharged,
        reason: errorDetail,
        model,
        size,
      });
    } catch (refundError) {
      console.error("Failed to refund Seedream generation failure:", {
        jobId: job.id,
        userId,
        error:
          refundError instanceof Error
            ? refundError.message
            : String(refundError),
      });
    }
    return null;
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GenerateImageRequest;
  const prompt = body.prompt?.trim() ?? "";
  const model = normalizeModel(body.model);
  const size = body.size ?? "1K";
  const imageUrls = [
    ...(body.imageUrl?.trim() ? [body.imageUrl.trim()] : []),
    ...((Array.isArray(body.imageUrls) ? body.imageUrls : [])
      .map((item) => item.trim())
      .filter(Boolean)),
  ];
  const imageUrl = imageUrls[0] ?? null;
  const sequentialImageGeneration =
    body.sequential_image_generation ?? "disabled";
  const validationError = validateImageOptions({
    model,
    prompt,
    size,
    imageUrls,
    sequentialImageGeneration,
    maxImages: body.max_images,
    webSearch: body.web_search,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const creditCost = calculateImageCreditCost({
    model,
    size,
    referenceImageCount: imageUrls.length,
    sequentialImageGeneration,
    maxImages: body.max_images,
  });
  if ("error" in creditCost) {
    return NextResponse.json({ error: creditCost.error }, { status: 400 });
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const primaryEmail = getPrimaryEmailAddress(clerkUser);

  if (!isAllowedSignupEmail(primaryEmail)) {
    return NextResponse.json(
      {
        error: "Gmail account required",
        detail: "Please sign in with a Gmail address to generate images.",
      },
      { status: 403 }
    );
  }

  const currentCredits =
    (clerkUser.unsafeMetadata?.credits as number | undefined) ??
    DEFAULT_NEW_USER_CREDITS;

  if (currentCredits < creditCost.credits) {
    return NextResponse.json(
      {
        error: "Not enough credits",
        creditsRequired: creditCost.credits,
        creditsRemaining: currentCredits,
      },
      { status: 402 }
    );
  }

  const requestId = crypto.randomUUID();
  const updatedCredits = Math.max(currentCredits - creditCost.credits, 0);
  const generationMode = imageUrl ? "image" : "text";

  try {
    await client.users.updateUserMetadata(userId, {
      unsafeMetadata: buildCreditMetadataUpdate({
        metadata: clerkUser.unsafeMetadata ?? {},
        credits: updatedCredits,
        usageEntry: {
          at: new Date().toISOString(),
          amount: -creditCost.credits,
          note: `Generate image (${generationMode})`,
          taskId: null,
          prompt: prompt.slice(0, 120),
          params: {
            model,
            size,
            hasReferenceImage: Boolean(imageUrl),
            seed: body.seed,
            watermark: body.watermark,
            output_format: body.output_format,
            sequential_image_generation: sequentialImageGeneration,
            max_images: body.max_images,
            web_search: body.web_search,
            optimize_prompt_mode: body.optimize_prompt_mode,
          },
        },
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reserve credits",
        requestId,
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  const isPro = model.includes("-pro-");
  const payload: Record<string, unknown> = {
    model,
    prompt,
    response_format: "url",
    size,
    seed: body.seed,
    output_format: body.output_format ?? "jpeg",
    watermark: body.watermark ?? true,
    user: userId,
  };

  if (imageUrls.length === 1) {
    payload.image = imageUrls[0];
  } else if (imageUrls.length > 1) {
    payload.image = imageUrls;
  }

  if (!isPro) {
    payload.sequential_image_generation = sequentialImageGeneration;
    if (sequentialImageGeneration === "auto") {
      payload.sequential_image_generation_options = {
        max_images: body.max_images ?? Math.max(1, 15 - imageUrls.length),
      };
    }
    if (body.web_search) {
      payload.tools = [{ type: "web_search" }];
    }
  }

  if (body.optimize_prompt_mode) {
    payload.optimize_prompt_options = { mode: body.optimize_prompt_mode };
  }

  const job = await createGenerationJob({
    clerkUserId: userId,
    upstreamTaskId: requestId,
    mode: generationMode,
    outputType: "image",
    requestPayload: payload,
    prompt,
    imageUrl: null,
    creditsCharged: creditCost.credits,
    ratio: sizeToRatio(size),
    resolution: size,
    duration: 0,
    generateAudio: false,
  });

  after(async () => {
    await processSeedreamJob(job.id, userId);
  });

  return NextResponse.json({
    jobId: job.id,
    taskId: requestId,
    status: "queued",
    creditsCharged: creditCost.credits,
    creditsRemaining: updatedCredits,
  });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = await getGenerationJobForUser(jobId, userId);
  if (!job || job.outputType !== "image") {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "queued") {
    after(async () => {
      await processSeedreamJob(job.id, userId);
    });
  }

  return NextResponse.json({
    status: job.status,
    imageUrl: job.imageUrl,
    error: job.errorMessage,
    errorMessage: job.errorMessage,
    raw: null,
  });
}
