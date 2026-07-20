const SUPABASE_URL = "https://vazbmthmfgtaypjpkeyy.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhemJtdGhtZmd0YXlwanBrZXl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg1OTk1MiwiZXhwIjoyMDkwNDM1OTUyfQ.HbTr6vBhPFo9HePMcwj5tAf0x5IyKDYclXRSTcvucrQ";
const USER_ID = "dae43cf9-10dd-4bdd-9dcc-8893d0816687";

async function run() {
  console.log("Triggering music-automation edge function...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/music-automation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        action: 'run-scrape',
        userId: USER_ID
      })
    });

    console.log(`Response status: ${res.status}`);
    const body = await res.text();
    console.log("Response body:", body);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
