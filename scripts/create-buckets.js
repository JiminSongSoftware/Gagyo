import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  console.log('URL:', url);
  console.log('Key:', key ? 'exists' : 'missing');
  process.exit(1);
}

const supabase = createClient(url, key);

const buckets = [
  { id: 'chat-images', public: true },
  { id: 'chat-videos', public: true },
  { id: 'chat-files', public: true }
];

async function createBuckets() {
  for (const { id } of buckets) {
    try {
      const { error } = await supabase.storage.createBucket(id, { public: true });
      if (error) {
        if (error.message.includes('already exists') || error.message.includes('Already exists')) {
          console.log('Bucket already exists:', id);
        } else {
          console.error('Error creating', id, ':', error.message);
        }
      } else {
        console.log('Created bucket:', id);
      }
    } catch (e) {
      console.error('Exception for', id, ':', e.message);
    }
  }
}

createBuckets().then(() => console.log('Done'));
