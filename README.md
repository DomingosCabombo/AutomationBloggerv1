# 🎵 AI Music Mixing & Mastering API

A fully automated backend that receives audio files, processes them with AI-grade effects chains and mastering, and returns production-ready audio.

---

## Architecture

```
Client
  │
  ▼
Node.js API  (server.js)       ← REST interface, file upload, job queue
  │                │
  │           Supabase DB      ← jobs table (pending/processing/done/failed)
  │           Supabase Storage ← input & output audio files
  │
  ▼
Cron Worker  (worker.js)       ← polls every 60s, picks up pending jobs
  │
  ▼
Python Processor  (processor.py)  ← Pedalboard effects + Matchering mastering
```

---

## Quick Start

### 1. Clone & configure

```bash
git clone <your-repo>
cd audio-api
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
```

### 2. Run the Supabase SQL schema

Copy `schema.sql` and run it in **Supabase → SQL Editor**.

Create a Storage bucket named `audio-jobs` in **Supabase → Storage**.

### 3. Start with Docker Compose (recommended)

```bash
docker-compose up --build
```

This starts:
- `api` on port **3000**
- `worker` (background cron)
- `processor` on port **8000**

### 4. Start manually (without Docker)

```bash
# Terminal 1 – Python processor
pip install -r requirements.txt
python processor.py

# Terminal 2 – Node API
npm install
node server.js

# Terminal 3 – Worker
node worker.js
```

---

## API Reference

### Upload audio file

```bash
curl -X POST http://localhost:3000/upload \
  -F "audio=@song.mp3" \
  -F "preset=afrobeat"
```

**Response:**
```json
{
  "job_id": "a1b2c3d4-...",
  "status": "pending",
  "preset": "afrobeat"
}
```

**Available presets:**
| Preset | Target LUFS | Description |
|--------|------------|-------------|
| `auto` | varies | Auto-detects speech vs music |
| `music` | -14 | General music mastering |
| `podcast` | -16 | Voice clarity, presence boost |
| `afrobeat` | -10 | Punchy bass, bright highs |
| `drill` | -9 | Heavy sub-bass, aggressive comp |

---

### Check job status

```bash
curl http://localhost:3000/status/a1b2c3d4-...
```

**Response:**
```json
{
  "id": "a1b2c3d4-...",
  "status": "done",
  "preset": "afrobeat",
  "result_url": "https://xxx.supabase.co/storage/v1/object/public/audio-jobs/output/a1b2c3d4_mastered.wav",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:02:30Z"
}
```

Status values: `pending` → `processing` → `done` / `failed`

---

### Download result

```bash
curl -L http://localhost:3000/download/a1b2c3d4-... -o mastered.wav
```

---

### List recent jobs

```bash
curl "http://localhost:3000/jobs?limit=10"
```

---

### Health check

```bash
curl http://localhost:3000/health
curl http://localhost:8000/health   # Python processor
```

---

## Processing Pipeline

For each audio file, the pipeline runs these steps **in order**:

1. **Noise Gate** – removes silence/bleed between notes
2. **High-Pass Filter** – cuts rumble below 30–80 Hz
3. **Low-Shelf EQ** – boosts/cuts bass body
4. **Peak EQ (mids)** – presence / intelligibility adjustment
5. **High-Shelf EQ** – air and brightness
6. **Compressor** – dynamic control (ratio, attack, release per preset)
7. **Output Gain** – compensate for compression
8. **Limiter** – true-peak ceiling protection
9. **LUFS Normalization** – targets streaming standards (-14 LUFS by default)
10. **Matchering** *(optional)* – tone-matches to a reference master

---

## Reference Files for Matchering

Place reference WAV files in `./references/`:

```
references/
  music_ref.wav
  podcast_ref.wav
  afrobeat_ref.wav
  drill_ref.wav
```

Without these files, Matchering is skipped and only the effects chain is applied.

---

## Deploy to a VPS (DigitalOcean / Hetzner / Render)

```bash
# On the server
apt update && apt install -y docker.io docker-compose
git clone <your-repo> /opt/audio-api
cd /opt/audio-api
cp .env.example .env && nano .env   # fill in credentials

docker-compose up -d --build
docker-compose logs -f
```

Add HTTPS with Nginx + Certbot:
```nginx
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        client_max_body_size 200M;
    }
}
```

---

## Deploy to Replit

1. Create a new **Node.js** Repl
2. Upload all files
3. Set Secrets (env vars) in the Replit Secrets panel
4. For the Python processor, use a second **Python** Repl and set `PYTHON_SERVICE_URL` to its URL
5. Click **Run** on the Node Repl

---

## Error Handling & Retries

- Jobs failing processing are automatically retried up to **3 times**
- Jobs stuck in `processing` for more than **10 minutes** are automatically reset to `pending`
- All steps are logged as structured JSON for easy ingestion into Datadog / Logtail / etc.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | required |
| `SUPABASE_SERVICE_KEY` | Service role key | required |
| `SUPABASE_BUCKET` | Storage bucket name | `audio-jobs` |
| `PYTHON_SERVICE_URL` | Python processor URL | `http://localhost:8000` |
| `PORT` | API port | `3000` |
| `WORKER_INTERVAL_MS` | Worker poll interval | `60000` |
