"""
simple_training.py  -  Treina com 300 músicas e 2 slogans
"""

import csv
import requests
import time
from pathlib import Path

# Configurações
API_URL = "http://localhost:8001"
MUSIC_DIR = Path("training_data/music_library")
SLOGAN1 = Path("training_data/slogans/slogan1.wav")
SLOGAN2 = Path("training_data/slogans/slogan2.wav")
ANNOTATIONS_FILE = Path("training_data/annotations/extracted_positions.csv")

def train_all():
    """Treina o modelo com todas as músicas anotadas"""
    
    print("\n🤖 TREINANDO COM 300 MÚSICAS")
    print("="*60)
    
    # Verifica ficheiros
    if not ANNOTATIONS_FILE.exists():
        print("❌ Ficheiro de anotações não encontrado!")
        return
    
    if not SLOGAN1.exists() or not SLOGAN2.exists():
        print("❌ Slogans não encontrados!")
        return
    
    # Lê anotações
    with open(ANNOTATIONS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Pula cabeçalho
        annotations = list(reader)
    
    print(f"📚 Músicas anotadas: {len(annotations)}")
    
    if len(annotations) < 50:
        print(f"⚠️  Precisas de pelo menos 50 exemplos. Tens {len(annotations)}.")
        return
    
    # Adiciona cada exemplo
    success_count = 0
    
    for i, row in enumerate(annotations, 1):
        if len(row) < 4:
            continue
            
        music_file, pos1, pos2, genre = row[:4]
        music_path = MUSIC_DIR / music_file
        
        if not music_path.exists():
            print(f"⚠️  [{i}] Música não encontrada: {music_file}")
            continue
        
        print(f"\n🎵 [{i}/{len(annotations)}] {music_file}")
        print(f"   Posições: S1={pos1}s, S2={pos2}s")
        
        # Envia para API
        try:
            with open(music_path, 'rb') as f:
                files = {'music': (music_file, f, 'audio/mpeg')}
                data = {
                    'slogan1_position': float(pos1),
                    'slogan2_position': float(pos2),
                    'genre': genre
                }
                
                response = requests.post(
                    f"{API_URL}/train/add",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"   ✅ OK")
                    success_count += 1
                else:
                    print(f"   ❌ Erro: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Erro: {e}")
        
        # Progresso a cada 10
        if i % 10 == 0:
            print(f"\n📊 Progresso: {i}/{len(annotations)}")
        
        time.sleep(0.3)  # Pequena pausa
    
    print(f"\n{'='*60}")
    print(f"✅ Exemplos adicionados: {success_count}/{len(annotations)}")
    
    # Treina o modelo
    print("\n🎯 TREINANDO MODELO...")
    response = requests.post(f"{API_URL}/train/model")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ MODELO TREINADO COM SUCESSO!")
        print(f"   Score Slogan 1: {result.get('score_slogan1', 'N/A')}")
        print(f"   Score Slogan 2: {result.get('score_slogan2', 'N/A')}")
        print(f"   Total exemplos: {result.get('examples_used', 0)}")
    else:
        print(f"❌ Erro: {response.text}")


def test_prediction():
    """Testa o modelo com uma música"""
    
    print("\n🧪 TESTANDO MODELO...")
    
    # Pega uma música aleatória
    music_files = list(MUSIC_DIR.glob("*.mp3"))
    if not music_files:
        print("❌ Nenhuma música!")
        return
    
    test_music = music_files[-1]
    print(f"   Música: {test_music.name}")
    
    # Faz predição
    with open(test_music, 'rb') as f_music, \
         open(SLOGAN1, 'rb') as f_s1, \
         open(SLOGAN2, 'rb') as f_s2:
        
        files = {
            'music': f_music,
            'slogan1': f_s1,
            'slogan2': f_s2
        }
        
        response = requests.post(
            f"{API_URL}/mix",
            files=files,
            data={'use_model': 'true'},
            timeout=60
        )
        
        if response.status_code == 200:
            output = Path("training_data/exports/test_result.wav")
            output.parent.mkdir(exist_ok=True)
            
            with open(output, 'wb') as f:
                f.write(response.content)
            
            print(f"   ✅ Mixagem concluída!")
            print(f"   📁 {output}")
            
            # Info da mixagem
            info = response.headers.get('X-Mix-Info', '{}')
            print(f"   📊 {info}")
        else:
            print(f"   ❌ Erro: {response.text}")


if __name__ == "__main__":
    print("""
    ╔═══════════════════════════════════════════════╗
    ║     🤖 TREINAMENTO - 300 MÚSICAS 🤖           ║
    ╠═══════════════════════════════════════════════╣
    ║  1. Treinar modelo                            ║
    ║  2. Testar modelo                             ║
    ║  3. Ver status                                ║
    ╚═══════════════════════════════════════════════╝
    """)
    
    option = input("Opção: ").strip()
    
    if option == "1":
        train_all()
    elif option == "2":
        test_prediction()
    elif option == "3":
        response = requests.get(f"{API_URL}/train/status")
        print(response.json())