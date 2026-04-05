require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { TosClient, ACLType } = require('@volcengine/tos-sdk');

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.TOS_ENDPOINT?.trim();
const fullEndpoint = endpoint?.startsWith('http') ? endpoint : `https://${endpoint}`;
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || 'cn-beijing').trim();

function requireConfig() {
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error(
      'TOS is not configured. Please set TOS_ACCESS_KEY_ID, TOS_SECRET_ACCESS_KEY, TOS_ENDPOINT, TOS_BUCKET.'
    );
  }
}

function createClient() {
  if (!accessKeyId || !secretAccessKey || !fullEndpoint || !region) {
    throw new Error('Missing TOS credentials.');
  }
  return new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint: fullEndpoint,
  });
}

async function uploadSampleVideo() {
  try {
    console.log('🚀 Starting sample video upload to TOS...');

    requireConfig();

    const videoPath = path.join(process.cwd(), 'public/samples/dark_barbie_sound_1080.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const buffer = fs.readFileSync(videoPath);
    const filename = 'dark_barbie_sound_1080.mp4';
    const contentType = 'video/mp4';

    // Use a fixed key for the sample video
    const key = `samples/preview/dark_barbie_sound_1080.mp4`;

    console.log(`📁 Uploading ${filename} (${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB)...`);

    const client = createClient();

    await client.putObject({
      bucket,
      key,
      body: buffer,
      contentType,
      acl: ACLType.ACLPublicRead,
    });

    const publicUrl = `https://${bucket}.${endpoint}/${key}`;
    console.log(`✅ Upload successful!`);
    console.log(`🔗 Public URL: ${publicUrl}`);

    // Update the videos.json file
    const videosJsonPath = path.join(process.cwd(), 'public/samples/videos.json');
    const videoData = {
      samples: [
        {
          id: 'preview-sample',
          title: 'AI Generated Sample',
          description: 'Professional AI video generation showcase',
          videoUrl: publicUrl,
          thumbnailUrl: publicUrl // Use video as thumbnail too
        }
      ]
    };

    fs.writeFileSync(videosJsonPath, JSON.stringify(videoData, null, 2));
    console.log(`📝 Updated ${videosJsonPath}`);

    console.log('🎉 Sample video setup complete!');

  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadSampleVideo();