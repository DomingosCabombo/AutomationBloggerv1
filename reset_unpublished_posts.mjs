import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log("Deleting processed posts where blogger_url is null...");
  const { data, error } = await supabase
    .from('processed_posts')
    .delete()
    .is('blogger_url', null)
    .select();

  if (error) {
    console.error("Error deleting posts:", error);
  } else {
    console.log("Successfully deleted posts:", data);
  }
}

run();
