const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;
const model = process.env.SEEDANCE_MODEL || "doubao-seedance-2-0-fast-260128";

// Simplified, shorter prompts for faster generation
const quickPrompts = [
  {
    id: "neon-city",
    prompt: "Neon city lights at night, slow motion, cinematic",
    style: "Cinematic Cyberpunk",
    duration: 4,
    ratio: "16:9",
    resolution: "720p",
    generate_audio: false, // Disable audio for faster generation
    camera_fixed: true   // Fixed camera for simpler generation
  },
  {
    id: "ocean-waves",
    prompt: "Ocean waves on beach, golden sunset, peaceful",
    style: "Nature Scene",
    duration: 4,
    ratio: "16:9",
    resolution: "720p",
    generate_audio: false,
    camera_fixed: true
  },
  {
    id: "space-stars",
    prompt: "Starry night sky, twinkling stars, cosmic view",
    style: "Space Scene",
    duration: 4,
    ratio: "16:9",
    resolution: "720p",
    generate_audio: false,
    camera_fixed: true
  }
];

function getBaseUrl() {
  const raw = endpoint?.replace(/\/+$/, "") ?? "";
  if (raw.endsWith("/api/v3")) {
    return raw;
  }
  return `${raw}/api/v3`;
}

async function createGenerationTask(promptConfig) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      content: [
        {
          type: "text",
          text: promptConfig.prompt,
        }
      ],
      ratio: promptConfig.ratio,
      resolution: promptConfig.resolution,
      duration: promptConfig.duration,
      generate_audio: promptConfig.generate_audio,
      seed: -1,
      watermark: false,
      execution_expires_after: 86400 // 24 hours
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API request failed: ${detail || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  return data.id;
}

async function pollTaskStatus(taskId, maxAttempts = 30) { // Reduced max attempts
  const baseUrl = getBaseUrl();

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`⏱️  Polling ${i + 1}/${maxAttempts} for task ${taskId}...`);

    try {
      const response = await fetch(
        `${baseUrl}/contents/generations/tasks/${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Polling failed: ${detail || `HTTP ${response.status}`}`);
      }

      const data = await response.json();
      console.log(`📊 Task ${taskId} status: ${data.status}`);

      if (
        data.status === "succeeded" ||
        data.status === "success" ||
        data.status === "completed"
      ) {
        const videoUrl =
          data.output?.video_url ??
          data.output?.video_urls?.[0] ??
          data.output?.videos?.[0]?.url ??
          data.content?.video_url ??
          data.content?.video_urls?.[0] ??
          data.result?.video_url ??
          data.result?.video_urls?.[0] ??
          null;

        if (videoUrl) {
          console.log(`✅ Task ${taskId} completed! Video: ${videoUrl}`);
          return videoUrl;
        }
      }

      if (
        data.status === "failed" ||
        data.status === "expired" ||
        data.status === "cancelled" ||
        data.status === "error"
      ) {
        throw new Error(`Task ${taskId} failed: ${JSON.stringify(data.error || data)}`);
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`❌ Error polling task ${taskId}:`, error.message);
      // Continue polling on network errors
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }

  // If we reach here, task didn't complete in time, but don't fail completely
  console.log(`⏰ Task ${taskId} still running after ${maxAttempts} attempts, but continuing...`);
  return null; // Return null instead of throwing error
}

async function generateQuickSample(promptConfig) {
  console.log(`\n🚀 Generating quick sample: ${promptConfig.id}`);
  console.log(`📝 Prompt: ${promptConfig.prompt}`);

  try {
    const taskId = await createGenerationTask(promptConfig);
    console.log(`📋 Task created: ${taskId}`);

    const videoUrl = await pollTaskStatus(taskId);

    if (videoUrl) {
      return {
        id: promptConfig.id,
        title: promptConfig.prompt,
        style: promptConfig.style,
        duration: `${promptConfig.duration} seconds`,
        videoUrl: videoUrl,
        taskId: taskId
      };
    } else {
      // Return partial result for still-running tasks
      return {
        id: promptConfig.id,
        title: promptConfig.prompt,
        style: promptConfig.style,
        duration: `${promptConfig.duration} seconds`,
        videoUrl: null,
        taskId: taskId,
        status: "still_generating"
      };
    }
  } catch (error) {
    console.error(`❌ Failed to generate ${promptConfig.id}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting QUICK sample video generation...");
  console.log("⚡ Using simplified settings for faster generation");

  if (!apiKey || !endpoint) {
    console.error("❌ Missing API configuration. Please check .env.local");
    return;
  }

  const results = [];

  for (const promptConfig of quickPrompts) {
    const result = await generateQuickSample(promptConfig);
    if (result) {
      results.push(result);
    }

    // Wait 2 seconds between requests
    if (quickPrompts.indexOf(promptConfig) < quickPrompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../public/samples/videos.json');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Generated ${results.length} sample videos!`);
  console.log(`📄 Results saved to: ${outputPath}`);

  results.forEach((video, index) => {
    console.log(`🎥 ${index + 1}. ${video.id}: ${video.videoUrl || 'Still generating...'}`);
  });

  if (results.some(v => v.status === "still_generating")) {
    console.log(`\n⏳ Some videos are still generating. Check back later!`);
    console.log(`💡 The website will automatically load them when ready.`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
