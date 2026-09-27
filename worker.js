/**
 * worker.js – Cron worker (runs every 1 minute via cron or setInterval)
 * Picks up pending jobs, sends them to the Python microservice, updates status.
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PYTHON_SERVICE = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const MAX_RETRIES = 3;
const LOCK_TIMEOUT_MINUTES = 10; // reclaim stale "processing" jobs

function log(jobId, message, level = 'info') {
  const ts = new Date().toISOString();
  console.log(JSON.stringify({ ts, level, jobId, message }));
}

// ── Download a remote file to a local temp path ──────────────────────────────
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// ── Upload processed file back to Supabase ───────────────────────────────────
async function uploadResult(localPath, remotePath) {
  const buffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'audio-jobs')
    .upload(remotePath, buffer, { upsert: true });
  if (error) throw new Error(`Result upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'audio-jobs')
    .getPublicUrl(remotePath);
  return publicUrl;
}

// ── Mark stale processing jobs back to pending ───────────────────────────────
async function reclaimStaleLocks() {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  const { data: stale } = await supabase
    .from('jobs')
    .select('id')
    .eq('status', 'processing')
    .lt('updated_at', cutoff);

  for (const job of stale || []) {
    log(job.id, `Reclaiming stale lock (locked > ${LOCK_TIMEOUT_MINUTES}m)`, 'warn');
    await supabase.from('jobs').update({
      status: 'pending',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);
  }
}

// ── Core: process one job ────────────────────────────────────────────────────
async function processJob(job) {
  const jobId = job.id;
  log(jobId, `Starting job – preset=${job.preset}`);

  // Lock the job
  const { error: lockError } = await supabase.from('jobs').update({
    status: 'processing',
    updated_at: new Date().toISOString()
  }).eq('id', jobId).eq('status', 'pending'); // optimistic lock
  if (lockError) { log(jobId, 'Lock failed – another worker grabbed it', 'warn'); return; }

  const tmpInput  = `/tmp/${jobId}_input${path.extname(job.file_url.split('?')[0]) || '.wav'}`;
  const tmpOutput = `/tmp/${jobId}_output.wav`;

  try {
    // 1. Download source file
    log(jobId, `Downloading: ${job.file_url}`);
    await downloadFile(job.file_url, tmpInput);

    // 2. Send to Python microservice
    log(jobId, `Sending to Python processor (preset=${job.preset})`);
    const form = new FormData();
    form.append('audio', fs.createReadStream(tmpInput));
    form.append('preset', job.preset || 'auto');
    form.append('job_id', jobId);

    const response = await axios.post(`${PYTHON_SERVICE}/process`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      responseType: 'arraybuffer',
      timeout: 10 * 60 * 1000 // 10 min max
    });

    fs.writeFileSync(tmpOutput, response.data);
    log(jobId, `Processing complete – output ${response.data.byteLength} bytes`);

    // 3. Upload result
    const resultRemotePath = `output/${jobId}_mastered.wav`;
    const resultUrl = await uploadResult(tmpOutput, resultRemotePath);

    // 4. Update job as done
    await supabase.from('jobs').update({
      status: 'done',
      result_url: resultUrl,
      updated_at: new Date().toISOString()
    }).eq('id', jobId);

    log(jobId, `✅ Job done – result: ${resultUrl}`);
  } catch (err) {
    log(jobId, `Processing error: ${err.message}`, 'error');
    const newRetry = (job.retry_count || 0) + 1;
    const newStatus = newRetry >= MAX_RETRIES ? 'failed' : 'pending';

    await supabase.from('jobs').update({
      status: newStatus,
      retry_count: newRetry,
      error_message: err.message,
      updated_at: new Date().toISOString()
    }).eq('id', jobId);

    log(jobId, `Retry ${newRetry}/${MAX_RETRIES} – next status: ${newStatus}`, 'warn');
  } finally {
    if (fs.existsSync(tmpInput))  fs.unlinkSync(tmpInput);
    if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
  }
}

// ── Main tick ────────────────────────────────────────────────────────────────
async function tick() {
  console.log(`\n[${new Date().toISOString()}] 🔄 Worker tick`);
  try {
    await reclaimStaleLocks();

    // Fetch batch of pending jobs
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(5); // process up to 5 per tick

    if (error) { console.error('DB fetch error:', error.message); return; }
    if (!jobs || jobs.length === 0) { console.log('No pending jobs.'); return; }

    console.log(`Found ${jobs.length} pending job(s)`);
    // Process concurrently (max 3 at a time)
    const chunks = jobs.slice(0, 3);
    await Promise.allSettled(chunks.map(processJob));
  } catch (err) {
    console.error('Worker tick error:', err.message);
  }
}

// ── Start ────────────────────────────────────────────────────────────────────
const INTERVAL_MS = parseInt(process.env.WORKER_INTERVAL_MS) || 60_000; // 1 minute
console.log(`🚀 Worker started – polling every ${INTERVAL_MS / 1000}s`);
tick(); // run immediately on start
setInterval(tick, INTERVAL_MS);
