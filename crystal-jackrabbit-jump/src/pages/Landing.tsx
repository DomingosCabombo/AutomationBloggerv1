import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, Zap, Globe, HardDrive, ArrowRight, CheckCircle2, CreditCard, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Music size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">MusicFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-200">
              <Link to="/login" state={{ view: 'sign_up' }}>Criar Conta</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 font-medium mb-4">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Automação SaaS Versão 1.0 Lançada
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Automatize o seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Blog de Música</span> num clique.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Do scraping automático à mistura de áudio com slogans, passando pelo upload no Google Drive e publicação final no Blogger. Tudo de forma mágica.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105">
              <Link to="/login" state={{ view: 'sign_up' }}>
                Começar Gratuitamente <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-slate-900 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm">
              <a href="#features">Ver como funciona</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Começar (Passo-a-Passo)</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Preparar a tua máquina de fazer dinheiro é simples. Só precisas de conectar as tuas contas de alojamento para a IA fazer a magia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Conta Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="text-indigo-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-indigo-400 transition-colors">1. Criar Conta na Plataforma</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">
                    Regista-te com o teu email e prepara os teus 2 ficheiros de áudio. Clica para ver detalhes.
                  </p>
                </div>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-indigo-400">
                    <Globe size={20} /> Preparar a Conta
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">O que precisas para o primeiro passo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-slate-300">
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>Clica em "Entrar/Registar" no canto superior direito.</li>
                    <li>Usa o teu email para criar a conta.</li>
                    <li>Prepara dois ficheiros de áudio curtos (MP3 ou WAV) - um para tocar no início e outro no final de cada música.</li>
                    <li>Terás 30 dias de teste grátis assim que a conta for criada!</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>

            {/* Google Drive Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <HardDrive className="text-purple-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-purple-400 transition-colors">2. Ligar o Google Drive</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">
                    Obtém as tuas chaves para a IA guardar as músicas na tua nuvem. Clica para ver o tutorial.
                  </p>
                </div>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-purple-400">
                    <HardDrive size={20} /> Obter Credenciais do Google
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">Passos para obter o Client ID e Secret.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-slate-300 text-sm">
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>Acede à <strong>Google Cloud Console</strong> (console.cloud.google.com).</li>
                    <li>Cria um novo Projeto.</li>
                    <li>Vai a "APIs e Serviços" &gt; "Biblioteca" e ativa a <strong>Google Drive API</strong> e a <strong>Blogger API v3</strong>.</li>
                    <li>Vai ao "Ecrã de consentimento OAuth" e escolhe a opção <strong>Externo</strong>.</li>
                    <li>Vai a "Credenciais" &gt; "Criar Credenciais" &gt; <strong>ID de Cliente OAuth</strong> (Aplicação Web).</li>
                    <li>Em "URIs de Redirecionamento Autorizados", coloca o link do teu painel: <code className="bg-slate-800 px-2 py-1 rounded text-purple-300">https://teu-dominio.com/onboarding</code></li>
                    <li>Copia o <strong>Client ID</strong> e o <strong>Client Secret</strong> e cola-os na nossa plataforma!</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>

            {/* Blogger Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="text-blue-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-400 transition-colors">3. ID do Blogger</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">
                    Ensina o sistema onde deve publicar os artigos finais. Clica para descobrir como.
                  </p>
                </div>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-blue-400">
                    <Zap size={20} /> Onde encontro o ID do Blog?
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">É um número muito fácil de encontrar.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-slate-300 text-sm">
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>Abre o site do <strong>Blogger</strong> (blogger.com) e faz login na tua conta.</li>
                    <li>No menu lateral esquerdo, seleciona o blog onde queres que as músicas sejam publicadas.</li>
                    <li>Olha para a barra de endereços do teu navegador (URL).</li>
                    <li>Procura por algo como: <code className="bg-slate-800 px-2 py-1 rounded text-blue-300">blogID=1234567890123456789</code></li>
                    <li>Copia apenas os números e cola-os na nossa plataforma para completar a configuração!</li>
                  </ol>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos Simples e Transparentes</h2>
            <p className="text-slate-400">Paga apenas pelo que precisas. Escala quando estiveres pronto.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Teste Mensal</h3>
                <p className="text-slate-400">Para testar a magia da automação sem riscos.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-extrabold">Grátis</span>
                <span className="text-slate-500 ml-2">/ 1 Mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Acesso de Teste por 30 Dias', 'Mistura de 2 Slogans (Início e Fim)', 'Upload Automático para Google Drive', 'Publicação Direta no Blogger'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-indigo-400" size={20} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full h-12 border-white/20 text-slate-900 bg-white/10 hover:bg-white/20">
                <Link to="/login" state={{ view: 'sign_up' }}>Começar Teste</Link>
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-900/50 to-slate-900 border border-indigo-500/50 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                RECOMENDADO
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>
                <p className="text-indigo-200">Para blogs de sucesso e alto tráfego contínuo.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">30.000 Kz</span>
                <span className="text-indigo-200">/anual</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Acesso Anual Ilimitado', 'Mistura de 2 Slogans (Início e Fim)', 'Sem limite de Músicas', 'Acesso às futuras atualizações VIP', 'Suporte Prioritário Nacional'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle2 className="text-indigo-400" size={20} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    Subscrever Pro
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-slate-50">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-white">Upgrade para Plano Pro</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Pague via Transferência ou Multicaixa Express e crie a sua conta de seguida.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* IBAN Option */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="text-indigo-400" size={20} />
                        <h4 className="font-semibold text-white">Transferência IBAN</h4>
                      </div>
                      <p className="font-mono text-lg font-bold text-slate-200 tracking-wide break-all">AO06 0000 0000 0000 0000 0</p>
                      <p className="text-sm text-slate-400 mt-1">Titular: Domingos Cabombo</p>
                    </div>

                    {/* Multicaixa Express Option */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <Smartphone className="text-green-400" size={20} />
                        <h4 className="font-semibold text-white">Multicaixa Express (Por Número)</h4>
                      </div>
                      <p className="font-mono text-lg font-bold text-slate-200 tracking-wide">900 000 000</p>
                      <p className="text-sm text-slate-400 mt-1">Futuramente será automático, mas por agora faça envio para este contacto.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <Link to="/login" state={{ view: 'sign_up' }}>Já Paguei! Criar a Minha Conta</Link>
                    </Button>
                    <p className="text-xs text-center text-slate-500">
                      Depois de criar conta, envie-nos o comprovativo no WhatsApp para ativarmos o seu 1 ano VIP.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/10 text-center">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} MusicFlow. Automatizado para criadores angolanos.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
