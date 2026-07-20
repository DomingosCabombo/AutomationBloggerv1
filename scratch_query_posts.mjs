import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log("Fetching recent 100 logs...");
  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching logs:", error);
  } else {
    console.log("Recent logs (newest first):");
    logs.forEach(l => {
      console.log(`[${l.created_at}] [${l.level.toUpperCase()}] ${l.message}`);
    });
  }
}

run();
