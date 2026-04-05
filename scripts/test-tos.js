require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function testTosUpload() {
  try {
    console.log('🧪 Testing TOS upload via API...');

    const videoPath = path.join(process.cwd(), 'public/samples/dark_barbie_sound_1080.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    console.log('📁 Video file found, size:', Math.round(fs.statSync(videoPath).size / 1024 / 1024 * 100) / 100, 'MB');

    // Test the API endpoint
    const FormData = require('form-data');
    const axios = require('axios');

    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath));

    console.log('📡 Uploading via API...');

    const response = await axios.post('http://localhost:3000/api/tos/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': 'your-auth-cookie', // This would need actual auth
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('✅ Upload successful via API!');
    console.log('🔗 URL:', response.data.url);

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);

    // Fallback: try direct TOS client with debugging
    console.log('\n🔧 Trying direct TOS client...');
    await testDirectTos();
  }
}

async function testDirectTos() {
  const { TosClient, ACLType } = require('@volcengine/tos-sdk');

  const config = {
    accessKeyId: process.env.TOS_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.TOS_SECRET_ACCESS_KEY?.trim(),
    endpoint: process.env.TOS_ENDPOINT?.trim(),
    bucket: process.env.TOS_BUCKET?.trim(),
    region: (process.env.TOS_REGION || 'cn-beijing').trim(),
  };

  console.log('🔍 TOS Configuration:');
  console.log('- Endpoint:', config.endpoint);
  console.log('- Bucket:', config.bucket);
  console.log('- Region:', config.region);
  console.log('- AccessKeyId:', config.accessKeyId ? '***' + config.accessKeyId.slice(-4) : 'MISSING');

  try {
    // Try with different endpoint formats
    const endpointVariants = [
      config.endpoint,
      `https://${config.endpoint}`,
      `http://${config.endpoint}`,
    ];

    for (const endpointVariant of endpointVariants) {
      console.log(`\n🧪 Trying endpoint: ${endpointVariant}`);

      try {
        const client = new TosClient({
          accessKeyId: config.accessKeyId,
          accessKeySecret: config.secretAccessKey,
          region: config.region,
          endpoint: endpointVariant,
        });

        // Try a simple operation first
        const response = await client.listObjects({
          bucket: config.bucket,
          maxKeys: 1,
        });

        console.log('✅ TOS client connection successful with endpoint:', endpointVariant);
        console.log('📦 Found', response.data?.Contents?.length || 0, 'objects in bucket');

        return client; // Return the working client

      } catch (error) {
        console.log('❌ Failed with endpoint:', endpointVariant, '- Error:', error.message);
      }
    }

    throw new Error('All endpoint variants failed');

  } catch (error) {
    console.error('❌ Direct TOS client failed:', error.message);
  }
}

testTosUpload();