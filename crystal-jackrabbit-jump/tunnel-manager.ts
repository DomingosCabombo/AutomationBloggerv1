import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDir = path.join(rootDir, 'temp');
const logFile = path.join(tempDir, 'tunnel.log');
const cfdPath = path.join(rootDir, 'cfd.exe');
const tokenScriptPath = path.join(rootDir, 'read-supabase-token.ps1');
const SUPABASE_PROJECT_REF = 'vazbmthmfgtaypjpkeyy';

function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || err.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function updateSupabaseSecret(token: string, secretName: string, secretValue: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify([{ name: secretName, value: secretValue }]);
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${SUPABASE_PROJECT_REF}/secrets`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Supabase API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function startAndSyncTunnel(): Promise<string> {
  console.log('[TunnelManager] A iniciar processo de túnel...');

  // 1. Ensure temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 2. Kill existing cfd.exe
  try {
    await runCommand('taskkill /F /IM cfd.exe /T');
    console.log('[TunnelManager] Processo cfd.exe anterior terminado.');
  } catch (e) { /* Normal se não estiver a correr */ }

  // 3. Clear previous log
  if (fs.existsSync(logFile)) {
    try { fs.unlinkSync(logFile); } catch (e) { /* ignore */ }
  }

  // 4. Verify cfd.exe exists
  if (!fs.existsSync(cfdPath)) {
    throw new Error(`cfd.exe não encontrado em: ${cfdPath}`);
  }

  // 5. Start cfd.exe
  console.log('[TunnelManager] A iniciar cfd.exe...');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const cfdProcess = spawn(cfdPath, ['tunnel', '--url', 'http://localhost:8001'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  cfdProcess.stdout?.pipe(logStream);
  cfdProcess.stderr?.pipe(logStream);
  cfdProcess.unref();

  // 6. Poll log for URL (30s timeout)
  let url: string | null = null;
  const startTime = Date.now();
  console.log('[TunnelManager] À espera do URL do túnel (até 30s)...');

  while (Date.now() - startTime < 30000) {
    await new Promise(r => setTimeout(r, 800));
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const match = content.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
      if (match) {
        url = match[0];
        console.log('[TunnelManager] URL encontrado:', url);
        break;
      }
    }
  }

  if (!url) {
    const logContent = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : 'sem log';
    throw new Error(`Tempo limite excedido. Log cfd.exe: ${logContent.slice(0, 400)}`);
  }

  // 7. Read token via PS1 script
  console.log('[TunnelManager] A ler token Supabase...');
  let token: string;
  try {
    token = await runCommand(`powershell -ExecutionPolicy Bypass -File "${tokenScriptPath}"`);
  } catch (e: any) {
    throw new Error(`Não foi possível ler o token Supabase. Corre "npx supabase login" e tenta de novo. Detalhe: ${e.message}`);
  }

  if (!token || token.length < 10) {
    throw new Error('Token Supabase inválido. Corre "npx supabase login" no terminal.');
  }

  // 8. Update Supabase secret via REST API (avoids CLI encoding issues)
  console.log('[TunnelManager] A sincronizar URL com Supabase REST API...');
  try {
    await updateSupabaseSecret(token, 'AUDIO_MIX_API_URL', url);
    console.log('[TunnelManager] ✅ Supabase secret atualizado com sucesso!');
  } catch (e: any) {
    console.warn('[TunnelManager] ⚠️ Aviso: falha ao atualizar Supabase secret:', e.message);
    // Non-fatal: tunnel URL still returned and saved to DB by frontend
  }

  return url;
}
