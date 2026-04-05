require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { TosClient, ACLType } = require('@volcengine/tos-sdk');

// Decode base64 secret key if needed
function decodeSecretKey(key) {
  if (!key) return key;
  if (key.length > 40 && /^[A-Za-z0-9+/]+=*$/.test(key)) {
    try {
      return Buffer.from(key, 'base64').toString('utf-8');
    } catch (e) {
      return key;
    }
  }
  return key;
}

const accessKeyId = process.env.TOS_ACCESS_KEY_ID?.trim();
const secretAccessKey = decodeSecretKey(process.env.TOS_SECRET_ACCESS_KEY?.trim());
const endpoint = `https://${process.env.TOS_ENDPOINT?.trim()}`;
const bucket = process.env.TOS_BUCKET?.trim();
const region = (process.env.TOS_REGION || 'cn-beijing').trim();

function createClient() {
  return new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint,
  });
}

async function uploadCompressedVideo() {
  try {
    console.log('🚀 Starting compressed video upload to TOS...');

    const videoPath = path.join(process.cwd(), 'public/samples/dark_barbie_compressed.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Compressed video file not found: ${videoPath}`);
    }

    const stats = fs.statSync(videoPath);
    const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
    console.log(`📁 Compressed video: ${fileSizeMB}MB ✅`);

    const buffer = fs.readFileSync(videoPath);
    const contentType = 'video/mp4';
    const key = `samples/preview/sample-video.mp4`;

    console.log(`📡 Uploading to TOS: ${key}...`);

    const client = createClient();

    // Test connection first
    try {
      await client.listObjects({
        bucket,
        maxKeys: 1,
      });
      console.log('✅ TOS connection successful');
    } catch (error) {
      console.error('❌ TOS connection failed:', error.message);
      throw error;
    }

    // Upload the video
    await client.putObject({
      bucket,
      key,
      body: buffer,
      contentType,
      acl: ACLType.ACLPublicRead,
    });

    const publicUrl = `https://${bucket}.${process.env.TOS_ENDPOINT?.trim()}/${key}`;
    console.log(`✅ Upload successful!`);
    console.log(`🔗 Public URL: ${publicUrl}`);

    // Update videos.json with TOS URL
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
    console.log(`📝 Updated videos.json with TOS URL`);

    console.log('🎉 Sample video uploaded to TOS successfully!');
    console.log('🌐 Video will now load from TOS CDN for better performance');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);

    // Fallback: use local file
    console.log('\n📦 Falling back to local file...');
    const videosJsonPath = path.join(process.cwd(), 'public/samples/videos.json');
    const fallbackData = {
      samples: [
        {
          id: 'preview-sample',
          title: 'AI Generated Sample',
          description: 'Professional AI video generation showcase',
          videoUrl: '/samples/dark_barbie_compressed.mp4',
          thumbnailUrl: '/samples/dark_barbie_compressed.mp4'
        }
      ]
    };

    fs.writeFileSync(videosJsonPath, JSON.stringify(fallbackData, null, 2));
    console.log('✅ Updated videos.json with local file path');
    console.log('🏠 Video will load from local server');
  }
}

uploadCompressedVideo();