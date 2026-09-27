import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vazbmthmfgtaypjpkeyy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const USER_ID = process.env.USER_ID || "dae43cf9-10dd-4bdd-9dcc-8893d0816687";

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
