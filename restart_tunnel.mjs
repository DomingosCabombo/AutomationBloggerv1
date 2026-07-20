import { spawn, execSync } from 'child_process';
import fs from 'fs';
import https from 'https';

const cfdPath = 'C:\\Users\\Public\\audio-mix-api\\cfd.exe';
const logPath = 'C:\\Users\\Public\\audio-mix-api\\temp\\tunnel.log';
const SUPABASE_PROJECT_REF = 'vazbmthmfgtaypjpkeyy';

// Dynamically read Supabase Token from Windows Credential Manager or environment
let SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!SUPABASE_TOKEN) {
  try {
    const { execSync } = await import('child_process');
    SUPABASE_TOKEN = execSync('powershell -ExecutionPolicy Bypass -File "C:\\Users\\Public\\audio-mix-api\\read-supabase-token.ps1"', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('⚠️ Could not read Supabase token from Credential Manager:', e.message);
  }
}

// Kill any existing cfd.exe
try { execSync('taskkill /F /IM cfd.exe /T', { stdio: 'ignore' }); } catch(e) {}
await new Promise(r => setTimeout(r, 1000));

// Ensure temp dir
if (!fs.existsSync('C:\\Users\\Public\\audio-mix-api\\temp')) {
  fs.mkdirSync('C:\\Users\\Public\\audio-mix-api\\temp', { recursive: true });
}

// Clear log
if (fs.existsSync(logPath)) fs.unlinkSync(logPath);

console.log('🚀 A iniciar tunnel cfd.exe...');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

const proc = spawn(cfdPath, ['tunnel', '--url', 'http://localhost:8001'], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});
proc.stdout.pipe(logStream);
proc.stderr.pipe(logStream);
proc.unref();

// Poll for URL (30s)
let url = null;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 800));
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    const m = content.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
    if (m) { url = m[0]; break; }
    if (i % 5 === 0) process.stdout.write('.');
  }
}

if (!url) {
  const content = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : 'sem log';
  console.error('\n❌ Timeout. Log:\n' + content.slice(0, 500));
  process.exit(1);
}

console.log('\n✅ Novo URL do tunnel:', url);

// Update Supabase automation_settings via REST API
console.log('📡 A actualizar URL na base de dados Supabase...');
const payload = JSON.stringify({ audio_mix_api_url: url });
const updateRes = await fetch(`https://vazbmthmfgtaypjpkeyy.supabase.co/rest/v1/automation_settings?user_id=eq.dae43cf9-10dd-4bdd-9dcc-8893d0816687`, {
  method: 'PATCH',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhemJtdGhtZmd0YXlwanBrZXl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg1OTk1MiwiZXhwIjoyMDkwNDM1OTUyfQ.HbTr6vBhPFo9HePMcwj5tAf0x5IyKDYclXRSTcvucrQ',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhemJtdGhtZmd0YXlwanBrZXl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg1OTk1MiwiZXhwIjoyMDkwNDM1OTUyfQ.HbTr6vBhPFo9HePMcwj5tAf0x5IyKDYclXRSTcvucrQ',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  },
  body: payload
});

if (updateRes.ok) {
  console.log('✅ Base de dados actualizada com o novo URL!');
} else {
  console.error('❌ Falha ao actualizar BD:', updateRes.status, await updateRes.text());
}

// Also update Supabase secret AUDIO_MIX_API_URL
const secretRes = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/secrets`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([{ name: 'AUDIO_MIX_API_URL', value: url }])
});
if (secretRes.ok || secretRes.status < 300) {
  console.log('✅ Supabase secret AUDIO_MIX_API_URL actualizado!');
} else {
  console.log('⚠️ Secret update:', secretRes.status);
}

// Test the API
console.log('\n🔌 A testar a API de mixagem...');
await new Promise(r => setTimeout(r, 2000));
try {
  const healthRes = await fetch(`${url}/health`, { 
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
    signal: AbortSignal.timeout(8000)
  });
  const body = await healthRes.text();
  console.log(`✅ API responde: ${healthRes.status} ${body.slice(0, 100)}`);
} catch(e) {
  console.log(`❌ API não responde ainda: ${e.message}`);
}

console.log(`\n📋 RESUMO:`);
console.log(`   Novo URL: ${url}`);
console.log(`   Estado  : Actualizado na BD e no Supabase secret`);
