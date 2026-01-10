import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

// Use anon key like the app does
const supabase = createClient(url, anonKey);

async function testUpload() {
  // Test 1: List buckets
  console.log('Test 1: Listing buckets with anon key...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('  Error:', bucketsError.message);
  } else {
    console.log('  Success! Found', buckets?.length, 'buckets');
    for (const b of buckets ?? []) {
      console.log(`    - ${b.id} (public: ${b.public})`);
    }
  }

  // Test 2: Try to upload to chat-images
  console.log('\nTest 2: Uploading to chat-images bucket...');
  const testContent = new Blob(['test'], { type: 'text/plain' });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-images')
    .upload('test.txt', testContent, {
      contentType: 'text/plain',
      upsert: true,
    });

  if (uploadError) {
    console.error('  Error:', uploadError.message);
    console.error('  Full error:', JSON.stringify(uploadError, null, 2));
  } else {
    console.log('  Success! Uploaded:', uploadData?.path);

    // Test 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(uploadData?.path ?? 'test.txt');
    console.log('  Public URL:', urlData.publicUrl);
  }
}

testUpload();
