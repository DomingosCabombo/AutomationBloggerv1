"""
simple_annotation_tool.py  -  Ferramenta SIMPLES para 300 músicas e 2 slogans
"""

import os
import csv
from pathlib import Path
import subprocess

class SimpleAnnotationTool:
    def __init__(self):
        self.music_dir = Path("training_data/music_library")
        self.slogan1 = Path("training_data/slogans/slogan1.wav")
        self.slogan2 = Path("training_data/slogans/slogan2.wav")
        self.annotations_file = Path("training_data/annotations/positions.csv")
        
        # Verifica se os slogans existem
        if not self.slogan1.exists():
            print(f"❌ Slogan 1 não encontrado: {self.slogan1}")
        if not self.slogan2.exists():
            print(f"❌ Slogan 2 não encontrado: {self.slogan2}")
        
        # Inicializa CSV se não existir
        if not self.annotations_file.exists():
            with open(self.annotations_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['music_file', 'slogan1_position', 'slogan2_position', 'genre', 'notes'])
    
    def play_music(self, music_path: str):
        """Toca a música para análise"""
        print(f"\n🎵 Tocando: {Path(music_path).name}")
        print("   ⏵ A tocar... (fecha o player quando terminares)")
        
        # Toca com ffplay
        subprocess.run([
            "ffplay", "-nodisp", "-autoexit", music_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    def annotate_music(self, music_file: str):
        """Anota uma música com posições dos 2 slogans"""
        
        music_path = self.music_dir / music_file
        
        if not music_path.exists():
            print(f"❌ Música não encontrada: {music_file}")
            return False
        
        print(f"\n{'='*60}")
        print(f"🎯 Anotando: {music_file}")
        print(f"{'='*60}")
        
        # Toca a música
        self.play_music(str(music_path))
        
        # Pede informações
        print("\n📝 Onde colocar os slogans?")
        print("   (Ouve a música e identifica os melhores momentos)")
        
        genre = input("\n   Género (kuduro/drill/kizomba/hiphop/rap): ").strip().lower()
        
        print("\n   🎤 SLOGAN 1 (ex: 'É na ZAP!')")
        print("   Melhor momento? (início, antes do drop, meio...)")
        pos1 = float(input("   Segundos: ").strip())
        
        print("\n   🎤 SLOGAN 2 (ex: 'A melhor música!')")
        print("   Melhor momento? (meio, final, depois do refrão...)")
        pos2 = float(input("   Segundos: ").strip())
        
        notes = input("\n   Notas (opcional): ").strip()
        
        # Guarda anotação
        with open(self.annotations_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([music_file, pos1, pos2, genre, notes])
        
        print(f"\n✅ Anotação guardada!")
        return True
    
    def annotate_batch(self, start_from: int = 0):
        """Anota várias músicas em lote"""
        
        # Lista todas as músicas
        music_files = sorted(list(self.music_dir.glob("*.mp3")))
        
        # Verifica quais já foram anotadas
        annotated = set()
        if self.annotations_file.exists():
            with open(self.annotations_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader)  # Pula cabeçalho
                for row in reader:
                    if row:
                        annotated.add(row[0])
        
        # Filtra músicas não anotadas
        pending = [f for f in music_files if f.name not in annotated]
        
        print(f"\n📊 Estatísticas:")
        print(f"   Total músicas: {len(music_files)}")
        print(f"   Já anotadas: {len(annotated)}")
        print(f"   Pendentes: {len(pending)}")
        
        if not pending:
            print("\n🎉 TODAS AS 300 MÚSICAS JÁ FORAM ANOTADAS!")
            return
        
        print(f"\n🎯 Iniciando anotação das {len(pending)} músicas pendentes...")
        print("   (Pressiona Ctrl+C para parar a qualquer momento)")
        
        for i, music_path in enumerate(pending[start_from:], start_from + 1):
            print(f"\n{'#'*60}")
            print(f"📀 MÚSICA {i}/{len(music_files)}")
            print(f"{'#'*60}")
            
            success = self.annotate_music(music_path.name)
            
            if not success:
                continue
            
            if i < len(music_files):
                print("\n" + "-"*60)
                cont = input("⏭️  Continuar? (Enter = sim, 'q' = sair, 'r' = repetir): ")
                if cont.lower() == 'q':
                    print(f"\n💾 Progresso guardado! {i} músicas anotadas.")
                    break
                elif cont.lower() == 'r':
                    # Repete a mesma música
                    print("\n🔄 Repetindo a mesma música...")
                    self.annotate_music(music_path.name)
        
        print(f"\n✅ Sessão concluída!")
        self.show_stats()
    
    def show_stats(self):
        """Mostra estatísticas das anotações"""
        
        if not self.annotations_file.exists():
            print("\n📊 Nenhuma anotação ainda.")
            return
        
        genres = {}
        total = 0
        
        with open(self.annotations_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Pula cabeçalho
            for row in reader:
                if len(row) >= 4:
                    total += 1
                    genre = row[3]
                    genres[genre] = genres.get(genre, 0) + 1
        
        print(f"\n📊 ESTATÍSTICAS ATUAIS:")
        print(f"   Total anotado: {total}/300 músicas")
        print(f"   Por género:")
        for genre, count in sorted(genres.items()):
            print(f"     - {genre}: {count}")
        
        if total >= 50:
            print(f"\n✅ Já podes treinar o modelo! ({total} exemplos)")
        else:
            print(f"\n⏳ Precisas de pelo menos 50 exemplos para treinar.")


def main():
    tool = SimpleAnnotationTool()
    
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║     🎯 ANOTAÇÃO SIMPLES - 300 MÚSICAS 🎯             ║
    ╠══════════════════════════════════════════════════════╣
    ║                                                      ║
    ║   Slogans disponíveis:                               ║
    ║   - slogan1.wav (ex: "É na ZAP!")                    ║
    ║   - slogan2.wav (ex: "A melhor música!")             ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """)
    
    tool.show_stats()
    
    print("\n" + "="*60)
    print("Opções:")
    print("  1. Anotar músicas pendentes")
    print("  2. Anotar uma música específica")
    print("  3. Ver estatísticas")
    print("  4. Começar de uma posição específica")
    print("="*60)
    
    option = input("\nEscolhe opção: ").strip()
    
    if option == "1":
        tool.annotate_batch()
    elif option == "2":
        # Lista algumas músicas não anotadas
        annotated = set()
        if tool.annotations_file.exists():
            with open(tool.annotations_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader)
                for row in reader:
                    if row:
                        annotated.add(row[0])
        
        music_files = [f for f in tool.music_dir.glob("*.mp3") if f.name not in annotated]
        
        print("\nMúsicas pendentes (primeiras 10):")
        for i, f in enumerate(music_files[:10]):
            print(f"  {i+1}. {f.name}")
        
        choice = input("\nNome do ficheiro (ou número da lista): ").strip()
        
        if choice.isdigit() and int(choice) <= len(music_files[:10]):
            music_file = music_files[int(choice)-1].name
        else:
            music_file = choice
        
        tool.annotate_music(music_file)
    elif option == "3":
        tool.show_stats()
    elif option == "4":
        start = int(input("Começar da posição: "))
        tool.annotate_batch(start_from=start-1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏸️  Anotação pausada. O progresso foi guardado!")
        print("   Para continuar, executa novamente o script.")