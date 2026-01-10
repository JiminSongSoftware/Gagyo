import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  console.log('URL:', url ? 'exists' : 'missing');
  console.log('Service Role Key:', serviceRoleKey ? 'exists' : 'missing');
  process.exit(1);
}

// Admin client with service role key for bucket creation
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const buckets = [
  { id: 'chat-images', name: 'chat-images', public: true },
  { id: 'chat-videos', name: 'chat-videos', public: true },
  { id: 'chat-files', name: 'chat-files', public: true }
];

async function createBuckets() {
  for (const bucket of buckets) {
    try {
      const { error } = await supabaseAdmin.storage.createBucket(bucket.id, {
        public: bucket.public,
      });

      if (error) {
        if (error.message.includes('already exists') || error.message.includes('Already exists')) {
          console.log('Bucket already exists:', bucket.id);
        } else {
          console.error('Error creating bucket:', bucket.id, error);
        }
      } else {
        console.log('Created bucket:', bucket.id);
      }
    } catch (e: any) {
      console.error('Exception:', bucket.id, e.message);
    }
  }
}

createBuckets().then(() => console.log('Done'));
