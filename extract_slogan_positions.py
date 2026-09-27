"""
extract_slogan_positions.py  -  Extrai posições dos slogans das 300 músicas
"""

import os
import csv
import json
import numpy as np
import librosa
from pathlib import Path
from datetime import datetime
import hashlib

class SloganPositionExtractor:
    """
    Analisa músicas que JÁ TÊM slogans e extrai as posições
    """
    
    def __init__(self):
        self.music_dir = Path("training_data/music_library")
        self.slogans_dir = Path("training_data/slogans")
        self.output_file = Path("training_data/annotations/extracted_positions.csv")
        
        # Carrega os slogans de referência
        self.slogan1_path = self.slogans_dir / "slogan1.wav"
        self.slogan2_path = self.slogans_dir / "slogan2.wav"
        
        if not self.slogan1_path.exists() or not self.slogan2_path.exists():
            print("❌ Coloca os 2 slogans originais em training_data/slogans/")
            print("   - slogan1.wav")
            print("   - slogan2.wav")
            return
        
        # Carrega fingerprints dos slogans
        print("🎯 Carregando fingerprints dos slogans...")
        self.slogan1_fp = self._create_fingerprint(self.slogan1_path)
        self.slogan2_fp = self._create_fingerprint(self.slogan2_path)
        
    def _create_fingerprint(self, audio_path: str) -> dict:
        """Cria uma assinatura única do áudio"""
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        
        # Features para matching
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        spectral = librosa.feature.spectral_centroid(y=y, sr=sr)
        
        return {
            'duration': len(y) / sr,
            'mfcc_mean': np.mean(mfccs, axis=1).tolist(),
            'chroma_mean': np.mean(chroma, axis=1).tolist(),
            'spectral_mean': float(np.mean(spectral)),
            'rms': float(np.sqrt(np.mean(y**2))),
            'hash': hashlib.sha256(y.tobytes()[:10000]).hexdigest()
        }
    
    def detect_slogan_positions(self, music_path: str) -> dict:
        """
        Detecta onde estão os slogans na música
        Usa correlação e análise de energia
        """
        
        print(f"\n🔍 Analisando: {Path(music_path).name}")
        
        # Carrega música completa
        y, sr = librosa.load(music_path, sr=22050, mono=True)
        duration = len(y) / sr
        
        # Carrega slogans
        y1, _ = librosa.load(self.slogan1_path, sr=sr, mono=True)
        y2, _ = librosa.load(self.slogan2_path, sr=sr, mono=True)
        
        # Detecta slogan 1 (cross-correlation)
        pos1 = self._find_audio_pattern(y, y1, sr)
        
        # Detecta slogan 2
        pos2 = self._find_audio_pattern(y, y2, sr, start_hint=pos1 + 2)
        
        # Se não encontrou por correlação, tenta por energia
        if pos1 is None or pos2 is None:
            print("   ⚠️  Usando deteção por energia...")
            energy_positions = self._detect_by_energy(y, sr)
            
            if pos1 is None and energy_positions:
                pos1 = energy_positions[0]
            if pos2 is None and len(energy_positions) > 1:
                pos2 = energy_positions[-1]
        
        result = {
            'music_file': Path(music_path).name,
            'duration': duration,
            'slogan1_position': pos1 if pos1 else 0,
            'slogan2_position': pos2 if pos2 else duration * 0.8,
            'detection_confidence': 'high' if pos1 and pos2 else 'low'
        }
        
        if pos1:
            print(f"   ✅ Slogan 1: {pos1:.1f}s")
        else:
            print(f"   ⚠️  Slogan 1: não detectado")
            
        if pos2:
            print(f"   ✅ Slogan 2: {pos2:.1f}s")
        else:
            print(f"   ⚠️  Slogan 2: não detectado")
        
        return result
    
    def _find_audio_pattern(self, audio: np.ndarray, pattern: np.ndarray, 
                           sr: int, start_hint: float = 0) -> float:
        """Encontra padrão de áudio usando correlação"""
        
        # Converte start_hint para samples
        start_sample = int(start_hint * sr)
        
        # Limita busca
        search_audio = audio[start_sample:]
        pattern_len = len(pattern)
        
        if len(search_audio) < pattern_len:
            return None
        
        # Calcula correlação
        correlation = np.correlate(search_audio, pattern[:min(len(pattern), len(search_audio))], mode='valid')
        
        if len(correlation) == 0:
            return None
        
        # Encontra pico
        peak_idx = np.argmax(np.abs(correlation))
        peak_value = correlation[peak_idx]
        
        # Threshold de confiança
        threshold = 0.3 * np.max(np.abs(correlation))
        
        if abs(peak_value) > threshold:
            position = start_hint + (peak_idx / sr)
            return position
        
        return None
    
    def _detect_by_energy(self, audio: np.ndarray, sr: int) -> list:
        """Detecta slogans por picos de energia"""
        
        # Calcula energia
        hop_length = 512
        rms = librosa.feature.rms(y=audio, hop_length=hop_length)[0]
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # Encontra picos significativos
        threshold = np.mean(rms) + 1.5 * np.std(rms)
        peaks = []
        
        for i in range(1, len(rms)-1):
            if rms[i] > threshold and rms[i] > rms[i-1] and rms[i] > rms[i+1]:
                peaks.append(times[i])
        
        # Filtra picos muito próximos
        filtered_peaks = []
        for peak in peaks:
            if not filtered_peaks or peak - filtered_peaks[-1] > 5:
                filtered_peaks.append(peak)
        
        return filtered_peaks[:2]  # Retorna os 2 primeiros picos
    
    def extract_all(self):
        """Extrai posições de todas as 300 músicas"""
        
        music_files = list(self.music_dir.glob("*.mp3"))
        
        print(f"\n📊 Total de músicas encontradas: {len(music_files)}")
        print("="*60)
        
        results = []
        
        # Cria CSV
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'music_file', 'duration', 'slogan1_position', 'slogan2_position',
                'confidence', 'genre_hint', 'timestamp'
            ])
            
            for i, music_path in enumerate(music_files, 1):
                print(f"\n🎵 [{i}/{len(music_files)}]")
                
                # Tenta inferir género pelo nome
                genre_hint = self._infer_genre(music_path.name)
                
                # Detecta posições
                result = self.detect_slogan_positions(str(music_path))
                result['genre_hint'] = genre_hint
                result['timestamp'] = datetime.now().isoformat()
                
                # Guarda
                writer.writerow([
                    result['music_file'],
                    result['duration'],
                    result['slogan1_position'],
                    result['slogan2_position'],
                    result['detection_confidence'],
                    genre_hint,
                    result['timestamp']
                ])
                
                results.append(result)
                
                # Mostra progresso
                if i % 10 == 0:
                    print(f"\n📈 Progresso: {i}/300 músicas processadas")
        
        # Estatísticas finais
        print("\n" + "="*60)
        print("✅ EXTRAÇÃO CONCLUÍDA!")
        print(f"   Total processado: {len(results)}")
        
        high_conf = sum(1 for r in results if r['detection_confidence'] == 'high')
        print(f"   Alta confiança: {high_conf}")
        print(f"   Baixa confiança: {len(results) - high_conf}")
        print(f"\n📁 Resultado guardado em: {self.output_file}")
        
        # Mostra exemplos
        print("\n📋 PRIMEIRAS 5 DETECÇÕES:")
        for r in results[:5]:
            print(f"   {r['music_file'][:40]}...")
            print(f"      S1: {r['slogan1_position']:.1f}s, S2: {r['slogan2_position']:.1f}s")
        
        return results
    
    def _infer_genre(self, filename: str) -> str:
        """Tenta inferir género pelo nome do ficheiro"""
        filename_lower = filename.lower()
        
        if 'kuduro' in filename_lower:
            return 'kuduro'
        elif 'drill' in filename_lower:
            return 'drill'
        elif 'kizomba' in filename_lower:
            return 'kizomba'
        elif 'semba' in filename_lower:
            return 'semba'
        elif 'hip hop' in filename_lower or 'hiphop' in filename_lower:
            return 'hiphop'
        elif 'rap' in filename_lower:
            return 'rap'
        elif 'house' in filename_lower:
            return 'house'
        elif 'zouk' in filename_lower:
            return 'zouk'
        else:
            return 'unknown'


class ManualVerificationTool:
    """Ferramenta para verificar e corrigir detecções"""
    
    def __init__(self):
        self.extracted_file = Path("training_data/annotations/extracted_positions.csv")
        self.verified_file = Path("training_data/annotations/verified_positions.csv")
        self.music_dir = Path("training_data/music_library")
        
    def verify_extractions(self):
        """Permite verificar e corrigir manualmente"""
        
        if not self.extracted_file.exists():
            print("❌ Ficheiro de extrações não encontrado!")
            return
        
        # Carrega extrações
        with open(self.extracted_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            extractions = list(reader)
        
        print(f"\n📋 {len(extractions)} músicas para verificar")
        
        # Filtra baixa confiança para verificação
        low_conf = [e for e in extractions if len(e) > 4 and e[4] == 'low']
        
        print(f"   ⚠️  {len(low_conf)} com baixa confiança - precisam verificação")
        
        if low_conf:
            print("\n🎯 Verificando detecções de baixa confiança...")
            
            verified = []
            
            for i, ext in enumerate(low_conf[:10], 1):  # Primeiras 10
                music_file = ext[0]
                music_path = self.music_dir / music_file
                
                print(f"\n[{i}/{min(10, len(low_conf))}] {music_file}")
                print(f"   Posição detectada S1: {ext[2]}s, S2: {ext[3]}s")
                
                action = input("   (Enter = confirmar, 'p' = ouvir, 'c' = corrigir): ").strip()
                
                if action == 'p':
                    # Toca música
                    import subprocess
                    subprocess.run([
                        "ffplay", "-nodisp", "-autoexit", str(music_path)
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    
                    correct = input("   Posições corretas? (s/n): ").strip().lower()
                    if correct == 'n':
                        new_s1 = input("   Nova posição S1 (segundos): ").strip()
                        new_s2 = input("   Nova posição S2 (segundos): ").strip()
                        ext[2] = new_s1
                        ext[3] = new_s2
                        ext[4] = 'verified'
                
                verified.append(ext)
            
            # Guarda verificadas
            with open(self.verified_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(header)
                
                # Alta confiança + verificadas
                high_conf = [e for e in extractions if len(e) > 4 and e[4] == 'high']
                for ext in high_conf + verified:
                    writer.writerow(ext)
            
            print(f"\n✅ Verificação concluída!")
            print(f"   Ficheiro verificado: {self.verified_file}")


def main():
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║     🔍 EXTRAÇÃO DE POSIÇÕES DOS SLOGANS 🔍           ║
    ╠══════════════════════════════════════════════════════╣
    ║                                                      ║
    ║   As tuas 300 músicas JÁ TÊM slogans!                ║
    ║   Este sistema vai:                                  ║
    ║   1. Detectar automaticamente as posições            ║
    ║   2. Criar base de treinamento                       ║
    ║   3. Permitir verificação manual                     ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """)
    
    print("\nOpções:")
    print("  1. Extrair posições das 300 músicas")
    print("  2. Verificar/corrigir extrações")
    print("  3. Treinar modelo com dados extraídos")
    
    option = input("\nEscolhe opção: ").strip()
    
    if option == "1":
        extractor = SloganPositionExtractor()
        extractor.extract_all()
        
    elif option == "2":
        verifier = ManualVerificationTool()
        verifier.verify_extractions()
        
    elif option == "3":
        print("\n🤖 Iniciando treinamento com dados extraídos...")
        os.system("python simple_training.py")


if __name__ == "__main__":
    main()