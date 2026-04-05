require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { TosClient, ACLType } = require('@volcengine/tos-sdk');

// Decode base64 secret key if needed
function decodeSecretKey(key) {
  if (!key) return key;

  // If it looks like base64, decode it
  if (key.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(key)) {
    try {
      return Buffer.from(key, 'base64').toString('utf-8');
    } catch (e) {
      return key; // If decode fails, use original
    }
  }
  return key;
}

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = decodeSecretKey(process.env.TOS_SECRET_ACCESS_KEY?.trim());
const endpoint = `https://${process.env.TOS_ENDPOINT?.trim()}`;
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || 'cn-beijing').trim();

console.log('🔍 TOS Configuration:');
console.log('- Endpoint:', endpoint);
console.log('- Bucket:', bucket);
console.log('- Region:', region);
console.log('- AccessKeyId:', accessKeyId ? '***' + accessKeyId.slice(-4) : 'MISSING');
console.log('- SecretKey:', secretAccessKey ? '***' + secretAccessKey.slice(-4) : 'MISSING');

function createClient() {
  return new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint,
  });
}

async function uploadSampleVideo() {
  try {
    console.log('🚀 Starting sample video upload to TOS...');

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      throw new Error('Missing TOS configuration. Check your .env.local file.');
    }

    const videoPath = path.join(process.cwd(), 'public/samples/dark_barbie_sound_1080.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const stats = fs.statSync(videoPath);
    const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
    console.log(`📁 Video file: ${fileSizeMB}MB`);

    // Check if file is too large (TOS single upload limit is usually 100MB)
    if (stats.size > 100 * 1024 * 1024) {
      throw new Error(`File too large: ${fileSizeMB}MB. TOS single upload limit is 100MB.`);
    }

    const buffer = fs.readFileSync(videoPath);
    const filename = 'dark_barbie_sound_1080.mp4';
    const contentType = 'video/mp4';

    // Use a fixed key for the sample video
    const key = `samples/preview/sample-video.mp4`;

    console.log(`📡 Uploading to key: ${key}...`);

    const client = createClient();

    // Test connection first
    console.log('🧪 Testing TOS connection...');
    const listResult = await client.listObjects({
      bucket,
      maxKeys: 1,
    });
    console.log('✅ TOS connection successful');

    // Upload the video
    const uploadResult = await client.putObject({
      bucket,
      key,
      body: buffer,
      contentType,
      acl: ACLType.ACLPublicRead,
    });

    const publicUrl = `https://${bucket}.${process.env.TOS_ENDPOINT?.trim()}/${key}`;
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
          thumbnailUrl: publicUrl
        }
      ]
    };

    fs.writeFileSync(videosJsonPath, JSON.stringify(videoData, null, 2));
    console.log(`📝 Updated ${videosJsonPath}`);

    console.log('🎉 Sample video setup complete!');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);

    if (error.message.includes('Protocol')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if TOS credentials are correct');
      console.log('2. Verify network connectivity to TOS');
      console.log('3. Try using a smaller file for testing');
    }

    process.exit(1);
  }
}

uploadSampleVideo();