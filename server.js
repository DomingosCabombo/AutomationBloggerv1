const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');

require('dotenv').config();

const app = express();
app.use(express.json());

// ── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Multer – temp disk storage ───────────────────────────────────────────────
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported format: ${ext}. Use: ${allowed.join(', ')}`));
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(jobId, message, level = 'info') {
  const ts = new Date().toISOString();
  console.log(JSON.stringify({ ts, level, jobId, message }));
}

async function uploadToSupabase(localPath, remotePath) {
  const buffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'audio-jobs')
    .upload(remotePath, buffer, { upsert: true });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'audio-jobs')
    .getPublicUrl(remotePath);
  return publicUrl;
}

// ── POST /upload ─────────────────────────────────────────────────────────────
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided.' });

  const jobId = uuidv4();
  const ext   = path.extname(req.file.originalname).toLowerCase();
  const remotePath = `input/${jobId}${ext}`;

  try {
    log(jobId, `Upload received: ${req.file.originalname} (${req.file.size} bytes)`);

    const fileUrl = await uploadToSupabase(req.file.path, remotePath);
    fs.unlinkSync(req.file.path); // cleanup temp

    // Read optional preset from body  (music | podcast | afrobeat | drill | auto)
    const preset = req.body.preset || 'auto';

    const { error } = await supabase.from('jobs').insert({
      id: jobId,
      file_url: fileUrl,
      original_name: req.file.originalname,
      preset,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    });
    if (error) throw error;

    log(jobId, `Job created with preset=${preset}`);
    res.status(201).json({ job_id: jobId, status: 'pending', preset });
  } catch (err) {
    log(jobId, err.message, 'error');
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /status/:id ──────────────────────────────────────────────────────────
app.get('/status/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, preset, result_url, error_message, created_at, updated_at')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Job not found.' });
  res.json(data);
});

// ── GET /download/:id ────────────────────────────────────────────────────────
app.get('/download/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('status, result_url, original_name')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Job not found.' });
  if (data.status !== 'done') return res.status(409).json({ error: `Job is not done yet. Current status: ${data.status}` });
  if (!data.result_url) return res.status(404).json({ error: 'Result file not available.' });

  // Redirect to Supabase signed URL (or just proxy)
  res.redirect(data.result_url);
});

// ── GET /jobs (list recent jobs) ─────────────────────────────────────────────
app.get('/jobs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, preset, original_name, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎵 Audio API listening on port ${PORT}`));

module.exports = app;
