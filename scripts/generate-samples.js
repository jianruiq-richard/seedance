const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
const endpoint = process.env.VOLCENGINE_ARK_ENDPOINT;
const model = process.env.SEEDANCE_MODEL || "doubao-seedance-1-5-pro-251215";

// Professional prompts for stunning sample videos
const samplePrompts = [
  {
    id: "neon-city",
    prompt: "Cinematic establishing shot of a futuristic neon-lit cyberpunk city at night, towering glass skyscrapers with holographic advertisements, flowing traffic with light trails, atmospheric fog rolling through the streets, dramatic perspective from rooftop, ultra-high contrast lighting, blade runner aesthetic, slow motion camera movement, 4K cinematic quality",
    style: "Cinematic Cyberpunk",
    duration: 8,
    ratio: "16:9",
    resolution: "1080p",
    generate_audio: true,
    camera_fixed: false,
    service_tier: "flex"
  },
  {
    id: "ocean-sunset",
    prompt: "Breathtaking golden hour ocean scene with massive waves crashing against dramatic black volcanic rocks, spray and mist catching the warm sunlight, seagulls soaring through the frame, dynamic water movement with foam and bubbles, cinematic wide shot with telephoto compression, professional nature documentary style, warm color grading, hyper-realistic water simulation",
    style: "Nature Documentary",
    duration: 10,
    ratio: "16:9",
    resolution: "1080p",
    generate_audio: true,
    camera_fixed: false,
    service_tier: "flex"
  },
  {
    id: "space-nebula",
    prompt: "Epic deep space cinematography of a colorful nebula with swirling cosmic dust and gas clouds, distant stars twinkling, ethereal purple and blue aurora-like phenomena, slow graceful camera movement through the nebula, particle effects and light rays, Interstellar movie quality, mystical and awe-inspiring atmosphere, ultra-detailed space environment, 4K astronomical visualization",
    style: "Space Epic",
    duration: 12,
    ratio: "16:9",
    resolution: "1080p",
    generate_audio: true,
    camera_fixed: false,
    service_tier: "flex"
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
      camera_fixed: promptConfig.camera_fixed,
      service_tier: promptConfig.service_tier,
      seed: -1, // Random seed for variety
      watermark: false,
      draft: false,
      execution_expires_after: 172800 // 48 hours
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API request failed: ${detail || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  return data.id;
}

async function pollTaskStatus(taskId, maxAttempts = 40) {
  const baseUrl = getBaseUrl();

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Polling attempt ${i + 1}/${maxAttempts} for task ${taskId}...`);

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
    console.log(`Task ${taskId} status: ${data.status}`);

    if (data.status === "success" || data.status === "completed") {
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
        console.log(`✅ Task ${taskId} completed! Video URL: ${videoUrl}`);
        return videoUrl;
      }
    }

    if (data.status === "failed" || data.status === "error") {
      throw new Error(`Task ${taskId} failed: ${JSON.stringify(data.error || data)}`);
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error(`Task ${taskId} did not complete within expected time`);
}

async function generateSampleVideo(promptConfig) {
  console.log(`\n🎬 Generating sample video: ${promptConfig.id}`);
  console.log(`📝 Prompt: ${promptConfig.prompt.substring(0, 100)}...`);

  try {
    // Create generation task
    const taskId = await createGenerationTask(promptConfig);
    console.log(`📋 Task created: ${taskId}`);

    // Poll for completion
    const videoUrl = await pollTaskStatus(taskId);

    return {
      id: promptConfig.id,
      title: promptConfig.prompt.split(',')[0], // Use first part as title
      style: promptConfig.style,
      duration: `${promptConfig.duration} seconds`,
      videoUrl: videoUrl,
      taskId: taskId
    };
  } catch (error) {
    console.error(`❌ Failed to generate ${promptConfig.id}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting sample video generation...");

  if (!apiKey || !endpoint) {
    console.error("❌ Missing API configuration. Please check .env.local");
    return;
  }

  const results = [];

  for (const promptConfig of samplePrompts) {
    const result = await generateSampleVideo(promptConfig);
    if (result) {
      results.push(result);
    }

    // Wait 2 seconds between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results to JSON file
  const outputPath = path.join(__dirname, '../public/samples/videos.json');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Generated ${results.length} sample videos successfully!`);
  console.log(`📄 Results saved to: ${outputPath}`);

  results.forEach(video => {
    console.log(`🎥 ${video.id}: ${video.videoUrl}`);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateSampleVideo, samplePrompts };