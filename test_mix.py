import sys
import json
from trainable_slogan_mixer import mixer

def main():
    music_path = r"c:\Users\Public\audio-mix-api\upload\Meyson Sopinje - Não Chora (Zouk).mp3"
    s1_path = r"c:\Users\Public\audio-mix-api\training_data\slogans\slogan1.wav"
    s2_path = r"c:\Users\Public\audio-mix-api\training_data\slogans\slogan2.wav"
    out_path = r"c:\Users\Public\audio-mix-api\resultado_zouk_mixado.wav"
    
    print(f"Mixando: {music_path}...")
    result = mixer.mix(music_path, s1_path, s2_path, out_path)
    
    print("Sucesso!")
    print(json.dumps(result, indent=2))
    print(f"Arquivo salvo em: {out_path}")

if __name__ == "__main__":
    main()
