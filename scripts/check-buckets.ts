import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceRoleKey);

async function checkBuckets() {
  const { data, error } = await supabaseAdmin.storage.listBuckets();

  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }

  console.log('All buckets:');
  for (const bucket of data) {
    console.log(`  - ${bucket.id} (public: ${bucket.public})`);
  }

  const targetBuckets = ['chat-images', 'chat-videos', 'chat-files'];
  for (const bucketId of targetBuckets) {
    const exists = data.some(b => b.id === bucketId);
    const bucket = data.find(b => b.id === bucketId);
    const isPublic = bucket ? bucket.public : 'N/A';
    console.log(`\n${bucketId}:`);
    console.log(`  exists: ${exists}`);
    console.log(`  public: ${isPublic}`);
  }
}

checkBuckets();
