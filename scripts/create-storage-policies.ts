import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const buckets = ['chat-images', 'chat-videos', 'chat-files'];

async function createPolicies() {
  for (const bucketId of buckets) {
    console.log(`\nSetting up policies for ${bucketId}...`);

    // Create INSERT policy (allow uploads)
    const { error: insertError } = await supabase.rpc('create_policy', {
      policy_name: `${bucketId}_uploads`,
      bucket_id: bucketId,
      definition: `true`,
      operation: 'INSERT',
    });

    if (insertError && !insertError.message.includes('already exists')) {
      console.error(`  INSERT policy error:`, insertError.message);
    } else {
      console.log(`  INSERT policy: OK`);
    }

    // Create SELECT policy (allow downloads - public bucket)
    const { error: selectError } = await supabase.rpc('create_policy', {
      policy_name: `${bucketId}_public_read`,
      bucket_id: bucketId,
      definition: `true`,
      operation: 'SELECT',
    });

    if (selectError && !selectError.message.includes('already exists')) {
      console.error(`  SELECT policy error:`, selectError.message);
    } else {
      console.log(`  SELECT policy: OK`);
    }

    // Create UPDATE policy
    const { error: updateError } = await supabase.rpc('create_policy', {
      policy_name: `${bucketId}_updates`,
      bucket_id: bucketId,
      definition: `true`,
      operation: 'UPDATE',
    });

    if (updateError && !updateError.message.includes('already exists')) {
      console.error(`  UPDATE policy error:`, updateError.message);
    } else {
      console.log(`  UPDATE policy: OK`);
    }

    // Create DELETE policy
    const { error: deleteError } = await supabase.rpc('create_policy', {
      policy_name: `${bucketId}_deletes`,
      bucket_id: bucketId,
      definition: `true`,
      operation: 'DELETE',
    });

    if (deleteError && !deleteError.message.includes('already exists')) {
      console.error(`  DELETE policy error:`, deleteError.message);
    } else {
      console.log(`  DELETE policy: OK`);
    }
  }
}

// Alternative: Use SQL directly
async function createPoliciesWithSQL() {
  console.log('Creating storage policies via SQL...\n');

  for (const bucketId of buckets) {
    console.log(`${bucketId}:`);

    // For public buckets, we need to allow public access
    // This creates policies that allow anyone (including anon) to upload/download

    const policies = [
      `CREATE POLICY "${bucketId}_public_select" ON "storage"."objects" FOR SELECT USING (bucket_id = '${bucketId}');`,
      `CREATE POLICY "${bucketId}_public_insert" ON "storage"."objects" FOR INSERT WITH CHECK (bucket_id = '${bucketId}');`,
      `CREATE POLICY "${bucketId}_public_update" ON "storage"."objects" FOR UPDATE USING (bucket_id = '${bucketId}');`,
      `CREATE POLICY "${bucketId}_public_delete" ON "storage"."objects" FOR DELETE USING (bucket_id = '${bucketId}');`,
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error && !error.message.includes('already exists')) {
        console.error(`  Error:`, error.message);
      } else {
        console.log(`  ✓ Policy created`);
      }
    }
  }
}

createPoliciesWithSQL().then(() => console.log('\nDone!'));
