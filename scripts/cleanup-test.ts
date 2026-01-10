import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceRoleKey);

async function cleanup() {
  const { error } = await supabase.storage
    .from('chat-images')
    .remove(['test.txt']);

  if (error) {
    console.error('Error removing test file:', error.message);
  } else {
    console.log('Test file removed successfully');
  }
}

cleanup();
