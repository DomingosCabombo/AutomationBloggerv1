"""
trainable_slogan_mixer.py  –  Sistema que aprende com exemplos reais
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
log = logging.getLogger("trainable_mixer")

app = FastAPI(title="Trainable Slogan Mixer", version="3.0.0")

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

    def mix(self, music_path: str, s1_path: str, s2_path: str, output_path: str) -> Dict:
        # 1. Carregar áudios e Normalizar (Música: -14 dBFS, Slogans: -12 dBFS para voz sobressair)
        music = self._normalize_dbfs(self._load_audio(music_path), -14.0)
        s1 = self._normalize_dbfs(self._load_audio(s1_path), -12.0)
        s2 = self._normalize_dbfs(self._load_audio(s2_path), -12.0)
        
        # 2. Extrair apenas as características necessárias (energy_curve) mais rapidamente
        features = self.extractor.extract(music_path, fast_mode=True)
        duration = len(music) / 1000.0  # Usar a duração real exata do áudio
        energy_curve = features.get("energy_curve", [])
        
        # Slogan 1: Vale entre 0s e os primeiros 30s
        pos1_sec = self._find_best_valley(energy_curve, duration, 0.0, min(30.0, duration / 3.0))
        p1 = int(pos1_sec * 1000)
        
        # Slogan 2: Vale no final, garantindo que cabe inteiro antes da música acabar
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
        
        return {
            "slogan1_position": pos1_sec,
            "slogan2_position": pos2_sec,
            "method": "sound_engineer_pro"
        }
    
    def _load_audio(self, path: str) -> AudioSegment:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        subprocess.run(["ffmpeg", "-y", "-i", path, "-ac", "2", "-ar", "44100", tmp],
                      check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        audio = AudioSegment.from_wav(tmp)
        os.remove(tmp)
        return audio

mixer = TrainableSloganMixer()

@app.post("/train/add")
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

@app.post("/train/model")
async def train():
    return mixer.model.train()

@app.get("/train/status")
async def status():
    return {"total": len(mixer.db.examples), "trained": mixer.model.is_trained}

@app.post("/mix")
async def mix(
    music: UploadFile = File(...),
    slogan1: UploadFile = File(None),
    slogan2: UploadFile = File(None),
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
    result = mixer.mix(m_path, s1_path, s2_path, out_path)
    
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

def download_file(url: str, dest_path: str):
    if not url: return False
    try:
        log.info(f"Downloading from {url}")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
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

def post_to_blogger(blog_id: str, access_token: str, title: str, artist: str, cover_url: str, drive_file_id: str, bitrate: str, file_size_mb: float, category: str, year: str):
    url = f"https://www.googleapis.com/blogger/v3/blogs/{blog_id}/posts/"
    
    download_link = f"https://drive.google.com/uc?export=download&id={drive_file_id}"
    cover_html = f'<img src="{cover_url}" alt="{artist} - {title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />' if cover_url else ""
    
    content = f"""
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
        return None
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
            
        # Mixar
        mixer.mix(m_path, s1_path, s2_path, out_path)
        
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
                        cover_url=req.cover_url,
                        drive_file_id=file_id,
                        bitrate=req.bitrate,
                        file_size_mb=file_size_mb,
                        category=req.category,
                        year=req.year
                    )
                    
                    if blogger_url and req.supabase_url and req.supabase_key:
                        log.info(f"🔗 Atualizando a base de dados com a URL do Blogger...")
                        supabase_headers = {
                            "apikey": req.supabase_key,
                            "Authorization": f"Bearer {req.supabase_key}",
                            "Content-Type": "application/json"
                        }
                        import urllib.parse
                        encoded_source = urllib.parse.quote(req.source_url, safe="") if req.source_url else ""
                        update_url = f"{req.supabase_url}/rest/v1/processed_posts?source_url=eq.{encoded_source}"
                        patch_res = requests.patch(update_url, headers=supabase_headers, json={"blogger_url": blogger_url})
                        if not patch_res.ok:
                            log.error(f"⚠️ Erro ao atualizar Supabase: {patch_res.text}")
                        else:
                            log.info("✅ Supabase atualizado com o link do Blogger!")
                            log_to_supabase(req.supabase_url, req.supabase_key, req.user_id, "success", f"✅ Música '{req.song_title}' processada e enviada com sucesso para o Drive e Blogger!")
            except Exception as blogger_err:
                log.error(f"⚠️ Erro no fluxo do Blogger: {blogger_err}")
                log_to_supabase(req.supabase_url, req.supabase_key, req.user_id, "error", f"❌ Erro ao publicar '{req.song_title}' no Blogger: {blogger_err}")
        
    except Exception as e:
        log.error(f"❌ Erro no job assíncrono {job_id}: {e}")
    finally:
        for p in [m_path, s1_path, s2_path, out_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass

@app.post("/mix-async")
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