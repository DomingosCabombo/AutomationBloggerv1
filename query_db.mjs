import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log("Fetching logs...");
  const { data: logs, error: logsErr } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logsErr) {
    console.error("Error fetching logs:", logsErr);
  } else {
    console.log("Recent 20 logs:");
    logs.forEach(l => {
      console.log(`[${l.created_at}] [${l.level.toUpperCase()}] ${l.message}`);
    });
  }
}

run();
