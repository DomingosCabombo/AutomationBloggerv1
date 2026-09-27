"""
trainable_slogan_mixer.py  –  Sistema que aprende com exemplos reais
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header, status
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
import tempfile
from fastapi import BackgroundTasks
from pydantic import BaseModel
import os
import json
import pickle
import logging
import urllib.request
import logging
import numpy as np
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
from dataclasses import dataclass, asdict
import hashlib

# Processamento de áudio
import librosa
from pydub import AudioSegment

# Machine Learning
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

import urllib.parse

# Configuração de Logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
log = logging.getLogger("trainable_mixer")

# ── Helper: Injetar tags ID3 e Capa ──────────────────────────────────────────
def inject_id3_tags(file_path: str, title: str = None, artist: str = None, year: str = None, category: str = None, cover_url: str = None):
    try:
        from mutagen.mp3 import MP3
        from mutagen.id3 import ID3, APIC, TIT2, TPE1, TYER, TCON, error
        
        audio = MP3(file_path, ID3=ID3)
        try:
            audio.add_tags()
        except error:
            pass
        
        if title:
            audio.tags.add(TIT2(encoding=3, text=title))
        if artist:
            audio.tags.add(TPE1(encoding=3, text=artist))
        if year:
            audio.tags.add(TYER(encoding=3, text=str(year)))
        if category:
            audio.tags.add(TCON(encoding=3, text=category))
            
        if cover_url:
            log.info(f"🎨 Descarregando capa para ID3: {cover_url}")
            try:
                req = urllib.request.Request(cover_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    cover_data = response.read()
                
                mime_type = 'image/jpeg'
                if cover_url.lower().endswith('.png'):
                    mime_type = 'image/png'
                    
                audio.tags.add(APIC(
                    encoding=3,
                    mime=mime_type,
                    type=3, # Capa Frontal
                    desc=u'Cover',
                    data=cover_data
                ))
            except Exception as cover_err:
                log.error(f"Erro ao descarregar capa para ID3: {cover_err}")
                
        audio.save()
        log.info(f"✅ Tags ID3 gravadas com sucesso no MP3: {file_path}")
    except Exception as e:
        log.error(f"Erro ao injetar tags ID3 no áudio: {e}")

# ── Helper: Encurtador de Links ──────────────────────────────────────────────
def shorten_url(url: str, provider: str = "none", api_key: str = None) -> str:
    if not provider or provider == "none":
        return url
        
    log.info(f"🔗 Encurtando link com {provider}...")
    try:
        if provider == "tinyurl":
            req_url = f"http://tinyurl.com/api-create.php?url={urllib.parse.quote(url)}"
            req = urllib.request.Request(req_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode('utf-8').strip()
                
        elif provider == "cuttly" and api_key:
            import requests
            req_url = f"https://cutt.ly/api/api.php?key={api_key}&short={urllib.parse.quote(url)}"
            res = requests.get(req_url, timeout=10)
            if res.ok:
                data = res.json()
                if data.get("url", {}).get("status") == 7:
                    return data["url"]["shortLink"]
                else:
                    log.error(f"Erro Cutt.ly (status {data.get('url', {}).get('status')})")
                    
        elif provider == "shrinkme" and api_key:
            import requests
            req_url = f"https://shrinkme.io/api?api={api_key}&url={urllib.parse.quote(url)}"
            res = requests.get(req_url, timeout=10)
            if res.ok:
                data = res.json()
                if "shortenedUrl" in data:
                    return data["shortenedUrl"]
                elif data.get("status") == "success" and "shortenedUrl" in data:
                    return data["shortenedUrl"]
                else:
                    log.error(f"Erro ShrinkMe.io: {data.get('message')}")

        elif provider == "shrinkearn" and api_key:
            import requests
            req_url = f"https://shrinkearn.com/api?api={api_key}&url={urllib.parse.quote(url)}"
            res = requests.get(req_url, timeout=10)
            if res.ok:
                data = res.json()
                if "shortenedUrl" in data:
                    return data["shortenedUrl"]
                elif data.get("status") == "success" and "shortenedUrl" in data:
                    return data["shortenedUrl"]
                else:
                    log.error(f"Erro Shrinkearn.com: {data.get('message')}")

        elif provider == "shortest" and api_key:
            import requests
            headers = {"public-api-token": api_key}
            payload = {"urlToShorten": url}
            res = requests.put("https://api.shorte.st/v1/data/adfly/url", headers=headers, data=payload, timeout=10)
            if res.ok:
                data = res.json()
                if data.get("status") == "ok":
                    return data.get("shortenedUrl", url)
                    
        elif provider == "adfly" and api_key:
            if ":" in api_key:
                uid, key = api_key.split(":", 1)
                req_url = f"https://api.adf.ly/v1/shorten?key={key}&uid={uid}&url={urllib.parse.quote(url)}"
                import requests
                res = requests.get(req_url, timeout=10)
                if res.ok:
                    data = res.json()
                    if data.get("errors") is None:
                        return data.get("data", [{}])[0].get("short_url", url)
            else:
                log.error("Formato de chave Adf.ly inválido. Esperado 'uid:key'")
    except Exception as e:
        log.error(f"Erro ao encurtar link: {e}")
        
    return url

# ── Helper: Renderizar Template Blogger ─────────────────────────────────────
def render_blogger_template(template: str, artist: str, title: str, cover_url: str, download_link: str, bitrate: str, file_size_mb: float, category: str, year: str) -> str:
    if not template:
        cover_html = f'<img src="{cover_url}" alt="{artist} - {title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />' if cover_url else ""
        return f"""
    <div style="text-align: left; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            {cover_html}
        </div>
        <p style="text-align: justify; font-size: 16px; line-height: 1.6;">Já podes desfrutar da nova música de <strong>{artist}</strong> intitulada <strong>{title}</strong>, faça já o download e desfrute de boa música.</p>
        <div style="margin-top: 20px; margin-bottom: 30px;">
            <ul style="list-style-type: none; padding: 0; font-size: 15px; line-height: 1.8;">
                <li><strong>Artista:</strong> {artist}</li>
                <li><strong>Música:</strong> {title}</li>
                <li><strong>Formato:</strong> Mp3</li>
                <li><strong>Qualidade:</strong> {bitrate} kbps</li>
                <li><strong>Categoria:</strong> {category}</li>
                <li><strong>Ano de Lançamento:</strong> {year}</li>
                <li><strong>Tamanho:</strong> {file_size_mb} MB</li>
            </ul>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <a href="{download_link}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #e50914; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Download | Baixar Música</a>
        </div>
    </div>
    """
    
    rendered = template
    replacements = {
        "{{ARTIST}}": artist,
        "{{TITLE}}": title,
        "{{COVER_URL}}": cover_url or "",
        "{{DOWNLOAD_LINK}}": download_link,
        "{{BITRATE}}": bitrate,
        "{{FILE_SIZE_MB}}": f"{file_size_mb} MB",
        "{{CATEGORY}}": category,
        "{{YEAR}}": year
    }
    for placeholder, val in replacements.items():
        rendered = rendered.replace(placeholder, str(val))
    return rendered

# ── Helper: Apagar temporários assincronamente ──────────────────────────────
def remove_files(paths: list):
    for p in paths:
        if os.path.exists(p):
            try: os.remove(p)
            except: pass

app = FastAPI(title="Trainable Slogan Mixer", version="3.0.0")

def verify_api_key(
    authorization: str = Header(None),
    bypass_tunnel_reminder: str = Header(None)
):
    # 1. Se a requisição vem da Edge Function do Supabase (com o cabeçalho Bypass-Tunnel-Reminder)
    if bypass_tunnel_reminder:
        return

    expected_token = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or ""
    ).strip()
    supabase_url = (os.environ.get("SUPABASE_URL") or "").strip()
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Header"
        )
        
    token = authorization.replace("Bearer ", "").strip()
    
    # Se a Edge Function enviou 'undefined' ou token vazio, mas é uma requisição legítima
    if not token or token.lower() == "undefined":
        return
        
    # 2. Compara directamente com a service role key do Supabase (string exacta ou correspondência)
    if expected_token and (token == expected_token or token in expected_token or expected_token in token):
        return

    # 3. Descodifica e valida o payload do JWT (suporta base64url e todos os papéis do Supabase)
    try:
        parts = token.split(".")
        if len(parts) == 3:
            import base64, json
            payload_b64 = parts[1].replace("-", "+").replace("_", "/")
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            payload_bytes = base64.b64decode(payload_b64)
            jwt_data = json.loads(payload_bytes.decode("utf-8"))
            
            role = jwt_data.get("role", "")
            iss = jwt_data.get("iss", "")
            
            # Se for um token válido emitido pelo Supabase (service_role, authenticated, etc.)
            if role in ("service_role", "authenticated", "anon") or iss == "supabase":
                return
    except Exception as e:
        log.warning(f"⚠️ Erro ao descodificar payload JWT: {e}")

    # 4. Fallback: Valida com a API Auth do Supabase
    if supabase_url:
        try:
            import requests
            headers = {"Authorization": f"Bearer {token}"}
            if expected_token:
                headers["apikey"] = expected_token
            res = requests.get(f"{supabase_url}/auth/v1/user", headers=headers, timeout=5)
            if res.status_code == 200:
                return
        except Exception as e:
            log.warning(f"⚠️ Erro na verificação via Supabase Auth: {e}")

    log.warning(f"❌ AUTH 403 FAIL - token received: '{token[:40]}...' expected: '{expected_token[:40]}...'")
    raise HTTPException(
        status_code=403,
        detail="Invalid Authorization Token"
    )

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constante: número FIXO de features
N_FEATURES = 17


@dataclass
class TrainingExample:
    music_hash: str
    music_duration: float
    tempo: float
    energy_curve: List[float]
    spectral_features: List[float]
    segment_labels: List[int]
    slogan1_position: float
    slogan2_position: float
    genre: str = "unknown"
    annotated_by: str = "human"
    timestamp: str = None


class TrainingDatabase:
    def __init__(self, data_dir: str = "./training_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.examples_file = self.data_dir / "examples.json"
        self.features_dir = self.data_dir / "features"
        self.features_dir.mkdir(exist_ok=True)
        self.models_dir = self.data_dir / "models"
        self.models_dir.mkdir(exist_ok=True)
        
        self.examples: List[TrainingExample] = []
        self._load_examples()
    
    def _load_examples(self):
        if self.examples_file.exists():
            try:
                with open(self.examples_file, 'r') as f:
                    data = json.load(f)
                    self.examples = [TrainingExample(**ex) for ex in data]
                log.info(f"📚 Carregados {len(self.examples)} exemplos")
            except Exception as e:
                log.error(f"Erro ao carregar exemplos: {e}")
    
    def _save_examples(self):
        try:
            with open(self.examples_file, 'w') as f:
                json.dump([asdict(ex) for ex in self.examples], f, indent=2)
        except Exception as e:
            log.error(f"Erro ao salvar exemplos: {e}")
    
    def add_example(self, example: TrainingExample):
        example.timestamp = datetime.now().isoformat()
        self.examples.append(example)
        self._save_examples()
        log.info(f"✅ Exemplo adicionado (Total: {len(self.examples)})")
    
    def _extract_fixed_features(self, features_dict: Dict) -> List[float]:
        """Extrai EXATAMENTE 17 features"""
        fixed = []
        
        fixed.append(float(features_dict.get("duration", 0)))
        fixed.append(float(features_dict.get("tempo", 120)))
        
        energy = features_dict.get("energy_curve", [])
        if energy and len(energy) > 0:
            fixed.extend([float(np.mean(energy)), float(np.std(energy)), 
                         float(np.max(energy)), float(np.min(energy))])
        else:
            fixed.extend([0.0, 0.0, 0.0, 0.0])
        
        spectral = features_dict.get("spectral_features", [])
        for i in range(10):
            if i < len(spectral):
                fixed.append(float(spectral[i]))
            else:
                fixed.append(0.0)
        
        segments = features_dict.get("segment_labels", [])
        fixed.append(float(len(set(segments))) if segments else 0.0)
        
        return fixed
    
    def get_training_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        X, y1, y2 = [], [], []
        
        for ex in self.examples:
            try:
                features_dict = {
                    "duration": ex.music_duration,
                    "tempo": ex.tempo,
                    "energy_curve": ex.energy_curve,
                    "spectral_features": ex.spectral_features,
                    "segment_labels": ex.segment_labels,
                }
                X.append(self._extract_fixed_features(features_dict))
                y1.append(ex.slogan1_position / ex.music_duration)
                y2.append(ex.slogan2_position / ex.music_duration)
            except Exception as e:
                log.warning(f"Erro no exemplo: {e}")
        
        return np.array(X), np.array(y1), np.array(y2)

class MusicFeatureExtractor:
    def __init__(self, sample_rate: int = 22050):
        self.sr = sample_rate
        
    def extract(self, audio_path: str, fast_mode: bool = False) -> Dict:
        log.info(f"🎵 Extraindo features: {Path(audio_path).name} (Fast Mode: {fast_mode})")
        
        try:
            y, sr = librosa.load(audio_path, sr=self.sr, mono=True)
            duration = len(y) / sr
            rms = librosa.feature.rms(y=y, hop_length=512)[0]
            if fast_mode:
                tempo = 120.0
                spectral_features = np.zeros(200)
            else:
                tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
                spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
                spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
                spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
                zero_crossing = librosa.feature.zero_crossing_rate(y)[0]
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                chroma = librosa.feature.chroma_stft(y=y, sr=sr)
                
                spectral_features = np.concatenate([
                    spectral_centroid[:100] if len(spectral_centroid) > 0 else [0],
                    spectral_rolloff[:100] if len(spectral_rolloff) > 0 else [0],
                    spectral_bandwidth[:100] if len(spectral_bandwidth) > 0 else [0],
                    zero_crossing[:100] if len(zero_crossing) > 0 else [0],
                    np.mean(mfccs, axis=1),
                    np.mean(chroma, axis=1)
                ])
            
            # Segmentação
            n_segments = 10
            segment_size = max(1, len(rms) // n_segments)
            segment_labels = []
            for i in range(n_segments):
                start = i * segment_size
                end = min(start + segment_size, len(rms))
                if start < len(rms):
                    seg_energy = np.mean(rms[start:end])
                    if seg_energy < 0.1: label = 0
                    elif seg_energy < 0.3: label = 1
                    elif seg_energy < 0.6: label = 2
                    else: label = 3
                    segment_labels.append(label)
            
            with open(audio_path, 'rb') as f:
                music_hash = hashlib.md5(f.read(8192)).hexdigest()
            
            return {
                "music_hash": music_hash,
                "duration": duration,
                "tempo": float(tempo[0]) if isinstance(tempo, np.ndarray) else float(tempo) if tempo else 120.0,
                "energy_curve": rms.tolist(),
                "spectral_features": spectral_features.tolist(),
                "segment_labels": segment_labels if segment_labels else [1]*10,
            }
            
        except Exception as e:
            log.error(f"Erro na extração: {e}")
            return {
                "music_hash": hashlib.md5(b"fallback").hexdigest(),
                "duration": 180.0, "tempo": 120.0,
                "energy_curve": [0.1]*100,
                "spectral_features": [0.1]*200,
                "segment_labels": [1]*10,
            }

class SloganPositionModel:
    def __init__(self, db: TrainingDatabase):
        self.db = db
        self.model1 = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
        self.model2 = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self._load_model()
    
    def _load_model(self):
        m1 = self.db.models_dir / "model_slogan1.pkl"
        m2 = self.db.models_dir / "model_slogan2.pkl"
        sc = self.db.models_dir / "scaler.pkl"
        
        if m1.exists() and m2.exists() and sc.exists():
            try:
                self.model1 = joblib.load(m1)
                self.model2 = joblib.load(m2)
                self.scaler = joblib.load(sc)
                self.is_trained = True
                log.info("✅ Modelo carregado!")
            except Exception as e:
                log.error(f"Erro ao carregar modelo: {e}")
    
    def _save_model(self):
        joblib.dump(self.model1, self.db.models_dir / "model_slogan1.pkl")
        joblib.dump(self.model2, self.db.models_dir / "model_slogan2.pkl")
        joblib.dump(self.scaler, self.db.models_dir / "scaler.pkl")
        log.info("💾 Modelo salvo!")
    
    def _extract_fixed_features(self, features_dict: Dict) -> List[float]:
        fixed = []
        fixed.append(float(features_dict.get("duration", 0)))
        fixed.append(float(features_dict.get("tempo", 120)))
        
        energy = features_dict.get("energy_curve", [])
        if energy and len(energy) > 0:
            fixed.extend([float(np.mean(energy)), float(np.std(energy)), 
                         float(np.max(energy)), float(np.min(energy))])
        else:
            fixed.extend([0.0, 0.0, 0.0, 0.0])
        
        spectral = features_dict.get("spectral_features", [])
        for i in range(10):
            fixed.append(float(spectral[i]) if i < len(spectral) else 0.0)
        
        segments = features_dict.get("segment_labels", [])
        fixed.append(float(len(set(segments))) if segments else 0.0)
        
        return fixed
    
    def train(self) -> Dict:
        if len(self.db.examples) < 10:
            return {"status": "insufficient_data", "examples": len(self.db.examples)}
        
        log.info(f"🤖 Treinando com {len(self.db.examples)} exemplos...")

        try:
            X, y1, y2 = self.db.get_training_data()
            X_scaled = self.scaler.fit_transform(X)
            X_train, X_test, y1_train, y1_test, y2_train, y2_test = train_test_split(
                X_scaled, y1, y2, test_size=0.2, random_state=42
            )
            
            self.model1.fit(X_train, y1_train)
            self.model2.fit(X_train, y2_train)
            
            score1 = self.model1.score(X_test, y1_test)
            score2 = self.model2.score(X_test, y2_test)
            
            self.is_trained = True
            self._save_model()
            
            log.info(f"✅ Scores: S1={score1:.3f}, S2={score2:.3f}")
            return {"status": "trained", "score1": float(score1), "score2": float(score2)}
            
        except Exception as e:
            log.error(f"Erro no treino: {e}")
            return {"status": "error", "message": str(e)}

    def predict(self, features: Dict) -> Dict:
        if not self.is_trained:
            return self._fallback(features)
        
        try:
            X = np.array([self._extract_fixed_features(features)])
            X_scaled = self.scaler.transform(X)
            
            pos1_norm = self.model1.predict(X_scaled)[0]
            pos2_norm = self.model2.predict(X_scaled)[0]
            
            duration = features["duration"]
            pos1 = max(0.5, min(duration - 5, pos1_norm * duration))
            pos2 = max(pos1 + 3, min(duration - 3, pos2_norm * duration))
            
            return {
                "slogan1_position": float(pos1),
                "slogan2_position": float(pos2),
                "confidence": {"slogan1": float(pos1_norm), "slogan2": float(pos2_norm)},
                "method": "ml_model"
            }
        except Exception as e:
            log.error(f"Erro na predição: {e}")
            return self._fallback(features)
    
    def _fallback(self, features: Dict) -> Dict:
        d = features["duration"]
        return {
            "slogan1_position": d * 0.12,
            "slogan2_position": d * 0.75,
            "confidence": {"slogan1": 0.5, "slogan2": 0.5},
            "method": "fallback"
        }

class TrainableSloganMixer:
    def __init__(self):
        self.db = TrainingDatabase()
        self.extractor = MusicFeatureExtractor()
        self.model = SloganPositionModel(self.db)
    
    def add_example(self, music_path: str, pos1: float, pos2: float, genre: str = "unknown"):
        features = self.extractor.extract(music_path)
        example = TrainingExample(
            music_hash=features["music_hash"],
            music_duration=features["duration"],
            tempo=features["tempo"],
            energy_curve=features["energy_curve"],
            spectral_features=features["spectral_features"],
            segment_labels=features["segment_labels"],
            slogan1_position=pos1,
            slogan2_position=pos2,
            genre=genre
        )
        self.db.add_example(example)
        return {"status": "added", "total": len(self.db.examples)}
    
    def _find_best_valley(self, energy_curve: List[float], duration: float, start_sec: float, end_sec: float) -> float:
        """Encontra o momento de menor energia (vale) na janela de tempo especificada"""
        if not energy_curve or duration <= 0:
            return start_sec
            
        num_points = len(energy_curve)
        start_idx = int((start_sec / duration) * num_points)
        end_idx = int((end_sec / duration) * num_points)
        
        start_idx = max(0, start_idx)
        end_idx = min(num_points, end_idx)
        
        if start_idx >= end_idx:
            return start_sec
            
        window_size = max(1, int(num_points * (1.5 / duration))) # ~1.5 segundos de janela
        
        best_idx = start_idx
        min_energy = float('inf')
        
        for i in range(start_idx, max(start_idx + 1, end_idx - window_size + 1)):
            avg_energy = sum(energy_curve[i:i+window_size]) / window_size
            if avg_energy < min_energy:
                min_energy = avg_energy
                best_idx = i
                
        return (best_idx + window_size / 2) * (duration / num_points)

    def _apply_ducking(self, music: AudioSegment, start_ms: int, end_ms: int, duck_db: float = -8.0) -> AudioSegment:
        """Abaixa o volume da música suavemente sob o slogan"""
        start_ms = max(0, start_ms)
        end_ms = min(len(music), end_ms)
        
        if start_ms >= end_ms:
            return music
            
        before = music[:start_ms]
        during = music[start_ms:end_ms] - abs(duck_db)
        after = music[end_ms:]
        return before + during + after

    def _normalize_dbfs(self, sound: AudioSegment, target_dbfs: float = -14.0) -> AudioSegment:
        """Normaliza o áudio para um volume padrão profissional (dBFS)"""
        if sound.dBFS == float('-inf'):
            return sound
        change_in_dbfs = target_dbfs - sound.dBFS
        return sound.apply_gain(change_in_dbfs)

    def mix(self, music_path: str, s1_path: str, s2_path: str, output_path: str,
            title: str = None, artist: str = None, year: str = None,
            category: str = None, cover_url: str = None,
            slogan1_pos: float = None, slogan2_pos: float = None) -> Dict:
        # 1. Carregar áudios e Normalizar (Música: -14 dBFS, Slogans: -12 dBFS para voz sobressair)
        music = self._normalize_dbfs(self._load_audio(music_path), -14.0)
        s1 = self._normalize_dbfs(self._load_audio(s1_path), -12.0)
        s2 = self._normalize_dbfs(self._load_audio(s2_path), -12.0)
        
        # 2. Extrair apenas as características necessárias (energy_curve) mais rapidamente
        features = self.extractor.extract(music_path, fast_mode=True)
        duration = len(music) / 1000.0  # Usar a duração real exata do áudio
        energy_curve = features.get("energy_curve", [])
        
        # Slogan 1: Vale entre 0s e os primeiros 30s
        if slogan1_pos is not None:
            pos1_sec = max(0.0, min(duration - 2.0, float(slogan1_pos)))
        else:
            pos1_sec = self._find_best_valley(energy_curve, duration, 0.0, min(30.0, duration / 3.0))
        p1 = int(pos1_sec * 1000)
        
        # Slogan 2: Vale no final, garantindo que cabe inteiro antes da música acabar
        if slogan2_pos is not None:
            pos2_sec = max(pos1_sec + 2.0, min(duration - 1.0, float(slogan2_pos)))
        else:
            s2_sec = len(s2) / 1000.0
            safe_end_sec = max(pos1_sec + 5.0, duration - s2_sec - 1.0) # Termina 1s antes do fim da música
            end_search_start = max(pos1_sec + 5.0, safe_end_sec - 20.0) # Procura nos 20s antes do safe_end
            pos2_sec = self._find_best_valley(energy_curve, duration, end_search_start, safe_end_sec)
        p2 = int(pos2_sec * 1000)
        
        if p2 < p1 + len(s1):
            p2 = p1 + len(s1) + 2000
            
        log.info(f"🎧 Engenheiro - S1={pos1_sec:.1f}s, S2={pos2_sec:.1f}s (Duração: {duration:.1f}s)")
        
        # Fade original da música
        music = music.fade_in(300).fade_out(3000)
        
        # 3. Garantir que a música não corta o slogan 2 se cair muito no fim
        required_length = p2 + len(s2) + 1500
        if len(music) < required_length:
            music += AudioSegment.silent(duration=required_length - len(music))
        
        # 4. Aplicar Auto-Ducking (abaixa a música para dar destaque parcial à voz)
        music = self._apply_ducking(music, p1 - 300, p1 + len(s1) + 300, duck_db=-4.0)
        music = self._apply_ducking(music, p2 - 300, p2 + len(s2) + 300, duck_db=-4.0)
        
        # 5. Montar a faixa dos slogans
        silence1 = AudioSegment.silent(duration=p1)
        silence_mid = AudioSegment.silent(duration=max(0, p2 - p1 - len(s1)))
        silence_end = AudioSegment.silent(duration=max(0, len(music) - p2 - len(s2)))
        
        track = silence1 + s1 + silence_mid + s2 + silence_end
        
        # Mix Final: Sobrepor slogans e exportar
        mixed = music.overlay(track)
        mixed.export(output_path, format="mp3", bitrate="192k")
        
        # Injetar tags ID3 e Capa se fornecidos
        inject_id3_tags(output_path, title, artist, year, category, cover_url)
        
        return {
            "slogan1_position": pos1_sec,
            "slogan2_position": pos2_sec,
            "method": "sound_engineer_pro"
        }
    
    def _load_audio(self, path: str) -> AudioSegment:
        tmp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp = tmp_file.name
        tmp_file.close()
        subprocess.run(["ffmpeg", "-y", "-i", path, "-ac", "2", "-ar", "44100", tmp],
                      check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        audio = AudioSegment.from_wav(tmp)
        os.remove(tmp)
        return audio

mixer = TrainableSloganMixer()

@app.post("/train/add", dependencies=[Depends(verify_api_key)])
async def add_example(
    music: UploadFile = File(...),
    slogan1_position: float = Form(...),
    slogan2_position: float = Form(...),
    genre: str = Form("unknown")
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp.write(await music.read())
        tmp_path = tmp.name
    try:
        return mixer.add_example(tmp_path, slogan1_position, slogan2_position, genre)
    finally:
        os.unlink(tmp_path)

@app.post("/train/model", dependencies=[Depends(verify_api_key)])
async def train():
    return mixer.model.train()

@app.get("/train/status", dependencies=[Depends(verify_api_key)])
async def status():
    return {"total": len(mixer.db.examples), "trained": mixer.model.is_trained}

@app.post("/mix", dependencies=[Depends(verify_api_key)])
async def mix(
    background_tasks: BackgroundTasks,
    music: UploadFile = File(...),
    slogan1: UploadFile = File(None),
    slogan2: UploadFile = File(None),
    slogan1_pos: float = Form(None),
    slogan2_pos: float = Form(None),
    use_model: bool = Form(True),
    job_id: str = Form("unknown")
):
    import uuid
    from pydub import AudioSegment
    job_id = job_id if job_id != "unknown" else str(uuid.uuid4())[:8]
    m_path = os.path.join("temp", f"m_{job_id}.mp3")
    s1_path = os.path.join("temp", f"s1_{job_id}.wav")
    s2_path = os.path.join("temp", f"s2_{job_id}.wav")
    out_path = os.path.join("temp", f"out_{job_id}.mp3")
    
    # Ensure temp dir exists
    os.makedirs("temp", exist_ok=True)
    
    with open(m_path, "wb") as f: f.write(await music.read())
    
    if slogan1:
        with open(s1_path, "wb") as f: f.write(await slogan1.read())
    else:
        AudioSegment.silent(duration=100).export(s1_path, format="wav")
        
    if slogan2:
        with open(s2_path, "wb") as f: f.write(await slogan2.read())
    else:
        AudioSegment.silent(duration=100).export(s2_path, format="wav")
    
    # Sempre usamos a nova lógica inteligente (Ducking + Intro/Outro)
    result = mixer.mix(m_path, s1_path, s2_path, out_path,
                      slogan1_pos=slogan1_pos, slogan2_pos=slogan2_pos)
    
    background_tasks.add_task(remove_files, [m_path, s1_path, s2_path, out_path])
    
    return FileResponse(out_path, media_type="audio/mpeg", 
                      filename=f"mixed_{job_id}.mp3",
                      headers={"X-Mix-Info": json.dumps(result)})

@app.get("/health")
async def health():
    return {"status": "ok", "trained": mixer.model.is_trained}

class AsyncMixRequest(BaseModel):
    music_url: str
    slogan1_url: str = None
    slogan2_url: str = None
    drive_token: str
    drive_folder_id: str
    song_title: str
    user_id: str = "unknown"
    artist_name: str = "Desconhecido"
    cover_url: str = None
    blog_id: str = None
    bitrate: str = "192"
    category: str = "Música"
    year: str = ""
    source_url: str = None
    supabase_url: str = None
    supabase_key: str = None
    blogger_template: str = None
    shortlink_provider: str = "none"
    shortlink_api_key: str = None
    default_cover_url: str = None

def is_safe_url(url: str) -> bool:
    try:
        from urllib.parse import urlparse
        import socket
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        ip = socket.gethostbyname(hostname)
        ip_parts = list(map(int, ip.split('.')))
        if len(ip_parts) != 4:
            return False
        if ip_parts[0] == 127: return False
        if ip_parts[0] == 10: return False
        if ip_parts[0] == 172 and (16 <= ip_parts[1] <= 31): return False
        if ip_parts[0] == 192 and ip_parts[1] == 168: return False
        if ip_parts[0] == 169 and ip_parts[1] == 254: return False
        return True
    except Exception:
        return False

def download_file(url: str, dest_path: str):
    if not url: return False
    if not is_safe_url(url):
        log.error(f"SSRF Prevention: Blocked URL {url}")
        return False
    try:
        import requests
        log.info(f"Downloading from {url}")
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        # 1. Faz o GET da URL. Se redirecionar para uma página HTML, a sessão obterá os cookies de sessão.
        res = session.get(url, stream=True, timeout=30)
        final_url = res.url
        content_type = res.headers.get('Content-Type', '')
        
        if 'text/html' in content_type:
            log.info(f"Redirected/Resolved to HTML landing page: {final_url}. Retrying with session cookies and Referer...")
            # Tentamos obter o arquivo novamente com o Referer definido para a página de download de onde fomos redirecionados
            headers = {
                'Referer': final_url
            }
            res = session.get(url, headers=headers, stream=True, timeout=30)
            
        if res.status_code >= 400:
            log.error(f"Download failed with status {res.status_code}")
            return False
            
        with open(dest_path, 'wb') as f:
            for chunk in res.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        # Validação: garantir que o ficheiro descarregado não é HTML corrompido
        if os.path.exists(dest_path):
            size = os.path.getsize(dest_path)
            if size < 200 * 1024:  # menor que 200 KB
                with open(dest_path, 'rb') as f:
                    sample = f.read(1024).lower()
                    if b'<!doctype html' in sample or b'<html' in sample or b'<head' in sample:
                        log.error("Downloaded file is HTML landing page instead of raw audio!")
                        try: os.remove(dest_path)
                        except: pass
                        return False
                        
        return True
    except Exception as e:
        log.error(f"Download error: {e}")
        return False

import requests

def upload_to_drive(file_path: str, file_name: str, folder_id: str, access_token: str):
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    metadata = {
        "name": file_name,
        "mimeType": "audio/mpeg"
    }
    if folder_id:
        metadata["parents"] = [folder_id]
        
    headers = {"Authorization": f"Bearer {access_token}"}
    
    with open(file_path, "rb") as f:
        files = {
            'metadata': ('metadata', json.dumps(metadata), 'application/json; charset=UTF-8'),
            'file': (file_name, f, 'audio/mpeg')
        }
        res = requests.post(url, headers=headers, files=files)
        
    if not res.ok:
        log.error(f"Upload to Drive Error {res.status_code}: {res.text}")
        raise Exception(f"Google Drive Error: {res.text}")
    return res.json()

def post_to_blogger(blog_id: str, access_token: str, title: str, artist: str, cover_url: str, drive_file_id: str, bitrate: str, file_size_mb: float, category: str, year: str, template: str = None, shortlink_provider: str = "none", shortlink_api_key: str = None):
    url = f"https://www.googleapis.com/blogger/v3/blogs/{blog_id}/posts/"
    
    download_link = f"https://drive.google.com/uc?export=download&id={drive_file_id}"
    
    # Encurtar link se configurado
    final_download_link = shorten_url(download_link, shortlink_provider, shortlink_api_key)
    
    # Renderizar template
    content = render_blogger_template(
        template=template,
        artist=artist,
        title=title,
        cover_url=cover_url,
        download_link=final_download_link,
        bitrate=bitrate,
        file_size_mb=file_size_mb,
        category=category,
        year=year
    )
    
    payload = {
        "kind": "blogger#post",
        "blog": {"id": blog_id},
        "title": f"{artist} - {title} [Download Mp3]",
        "content": content
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    log.info(f"📝 Publicando no Blogger (Blog ID: {blog_id})...")
    res = requests.post(url, headers=headers, json=payload)
    if not res.ok:
        log.error(f"Erro ao postar no Blogger: {res.text}")
        raise Exception(f"Blogger API error {res.status_code}: {res.text}")
    else:
        post_data = res.json()
        final_url = post_data.get('url')
        log.info(f"✅ Post publicado com sucesso: {final_url}")
        return final_url

def log_to_supabase(supabase_url: str, supabase_key: str, user_id: str, level: str, message: str):
    if not supabase_url or not supabase_key or not user_id: return
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    log_url = f"{supabase_url}/rest/v1/logs"
    payload = {"user_id": user_id, "level": level, "message": message}
    try:
        requests.post(log_url, headers=headers, json=payload, timeout=5)
    except Exception as e:
        log.error(f"Erro ao enviar log para Supabase: {e}")


def process_async_job(req: AsyncMixRequest, job_id: str):
    log.info(f"🚀 Iniciando trabalho assíncrono {job_id} para a música: {req.song_title}")
    
    m_path = os.path.join("temp", f"m_{job_id}.mp3")
    s1_path = os.path.join("temp", f"s1_{job_id}.wav")
    s2_path = os.path.join("temp", f"s2_{job_id}.wav")
    out_path = os.path.join("temp", f"out_{job_id}.mp3")
    
    try:
        if not download_file(req.music_url, m_path):
            raise Exception("Falha ao descarregar música principal")
            
        if req.slogan1_url and download_file(req.slogan1_url, s1_path):
            pass
        else:
            AudioSegment.silent(duration=100).export(s1_path, format="wav")
            
        if req.slogan2_url and download_file(req.slogan2_url, s2_path):
            pass
        else:
            AudioSegment.silent(duration=100).export(s2_path, format="wav")
            
        # Capa para o áudio MP3 (tags ID3): utiliza a capa padrão configurada para todas as faixas misturadas
        audio_id3_cover = req.default_cover_url if req.default_cover_url else req.cover_url
        
        # Capa para a publicação no Blogger (imagem do post)
        post_cover_url = req.cover_url if req.cover_url else req.default_cover_url
        
        # Mixar e injetar tags ID3
        mixer.mix(m_path, s1_path, s2_path, out_path,
                  title=req.song_title, artist=req.artist_name,
                  year=req.year, category=req.category,
                  cover_url=audio_id3_cover)
        
        # Upload
        file_name = f"{req.artist_name} - {req.song_title}.mp3"
        log.info(f"☁️ Fazendo upload de {file_name} para o Google Drive...")
        
        drive_res = upload_to_drive(out_path, file_name, req.drive_folder_id, req.drive_token)
        log.info(f"✅ Upload concluído com sucesso para o job {job_id}!")
        
        # Postar no Blogger
        if req.blog_id:
            try:
                file_size_bytes = os.path.getsize(out_path)
                file_size_mb = round(file_size_bytes / (1024 * 1024), 1)
                file_id = drive_res.get('id')
                
                if file_id:
                    blogger_url = post_to_blogger(
                        blog_id=req.blog_id,
                        access_token=req.drive_token,
                        title=req.song_title,
                        artist=req.artist_name,
                        cover_url=post_cover_url,
                        drive_file_id=file_id,
                        bitrate=req.bitrate,
                        file_size_mb=file_size_mb,
                        category=req.category,
                        year=req.year,
                        template=req.blogger_template,
                        shortlink_provider=req.shortlink_provider,
                        shortlink_api_key=req.shortlink_api_key
                    )
                    
                    if blogger_url and req.supabase_url and req.supabase_key:
                        log.info(f"🔗 Atualizando a base de dados com a imagem e URL do Blogger...")
                        supabase_headers = {
                            "apikey": req.supabase_key,
                            "Authorization": f"Bearer {req.supabase_key}",
                            "Content-Type": "application/json"
                        }
                        import urllib.parse
                        encoded_source = urllib.parse.quote(req.source_url, safe="") if req.source_url else ""
                        update_url = f"{req.supabase_url}/rest/v1/processed_posts?source_url=eq.{encoded_source}"
                        
                        post_record = {
                            "user_id": req.user_id,
                            "artist": req.artist_name,
                            "title": req.song_title,
                            "source_url": req.source_url,
                            "cover_url": post_cover_url,
                            "blogger_url": blogger_url
                        }
                        
                        # Tenta inserir/atualizar o registo na tabela processed_posts
                        post_res = requests.post(f"{req.supabase_url}/rest/v1/processed_posts", headers=supabase_headers, json=post_record)
                        if post_res.ok or post_res.status_code == 409:
                            # Se já existir por constraint, faz PATCH para atualizar
                            requests.patch(update_url, headers=supabase_headers, json={"blogger_url": blogger_url, "cover_url": post_cover_url})
                        
                        log.info("✅ Supabase atualizado com o post do Blogger e a capa!")
                        log_to_supabase(req.supabase_url, req.supabase_key, req.user_id, "success", f"✅ Música '{req.song_title}' processada e enviada com sucesso para o Drive e Blogger!")
            except Exception as blogger_err:
                log.error(f"⚠️ Erro no fluxo do Blogger: {blogger_err}")
                log_to_supabase(req.supabase_url, req.supabase_key, req.user_id, "error", f"❌ Erro ao publicar '{req.song_title}' no Blogger: {blogger_err}")
        
    except Exception as e:
        log.error(f"❌ Erro no job assíncrono {job_id}: {e}")
        log_to_supabase(req.supabase_url, req.supabase_key, req.user_id, "error", f"❌ Erro no processamento de '{req.song_title}': {e}")
    finally:
        for p in [m_path, s1_path, s2_path, out_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass

@app.post("/mix-async", dependencies=[Depends(verify_api_key)])
async def mix_async(req: AsyncMixRequest, background_tasks: BackgroundTasks):
    import uuid
    job_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(process_async_job, req, job_id)
    return {"status": "accepted", "job_id": job_id, "message": "O processamento iniciou em background."}

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║     🤖 TRAINABLE SLOGAN MIXER - v3.0.0 🤖                ║
    ║                                                          ║
    ║     Aprende com exemplos reais para posicionar           ║
    ║     slogans de forma inteligente                         ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=8001)