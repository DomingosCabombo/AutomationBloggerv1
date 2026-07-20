async function run() {
  const landingUrl = "https://allfiles.allmine.top/yyJRp";
  const mp3Url = "https://allfiles.allmine.top/files/045567ee41c637bdd93b1d83350b7de5.mp3";
  
  console.log(`Step 1: Fetching landing page to get cookies...`);
  try {
    const landingRes = await fetch(landingUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    // Get cookies
    const cookies = landingRes.headers.get("set-cookie") || landingRes.headers.get("Set-Cookie");
    console.log(`Set-Cookie headers received:`, cookies);
    
    console.log(`\nStep 2: Fetching MP3 sending Cookie and Referer...`);
    const mp3Res = await fetch(mp3Url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": landingUrl,
        ...(cookies ? { "Cookie": cookies } : {})
      }
    });
    
    console.log(`Status: ${mp3Res.status}`);
    console.log(`Content-Type: ${mp3Res.headers.get("content-type")}`);
    console.log(`Content-Length: ${mp3Res.headers.get("content-length")}`);
    
    const buffer = await mp3Res.arrayBuffer();
    console.log(`Downloaded bytes: ${buffer.byteLength}`);
    if (mp3Res.headers.get("content-type")?.includes("text/html")) {
      const textSample = new TextDecoder("utf-8").decode(new Uint8Array(buffer.slice(0, 200)));
      console.log(`First 200 bytes text: ${textSample.replace(/\r?\n|\r/g, " ")}`);
    } else {
      console.log("Success! We got the actual file!");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
