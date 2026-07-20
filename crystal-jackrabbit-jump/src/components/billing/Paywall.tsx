import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { Lock, CreditCard, ExternalLink, CalendarX2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Paywall = () => {
  const { session, signOut } = useAuth();
  const email = session?.user?.email || '';

  const whatsappNumber = "244900000000"; // Placeholder, o administrador vai definir depois
  const message = encodeURIComponent(`Olá, terminei o meu período de teste no MusicFlow e acabei de transferir os 30.000 Kz para ativar o meu Plano Anual. O meu email de registo é: ${email}`);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-lg border-red-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative z-10 text-slate-50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <CalendarX2 className="text-red-400" size={32} />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">O Tempo Esgotou</CardTitle>
          <CardDescription className="text-slate-400 text-base">
            O teu período de Teste de 30 Dias chegou ao fim.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <h3 className="text-xl font-semibold mb-2">Desbloqueia o Plano PRO</h3>
            <p className="text-slate-400 text-sm mb-6">
              Continua a faturar com o teu Blog de Música automaticamente por apenas <span className="text-white font-bold">30.000 Kz / Ano</span>.
            </p>
            
            <div className="space-y-4 text-left">
              <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-indigo-400" size={20} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">IBAN para Transferência</p>
                    <p className="font-mono text-lg font-bold text-white tracking-wide break-all">AO06 0000 0000 0000 0000 0</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-green-400" size={20} />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Multicaixa Express</p>
                    <p className="font-mono text-lg font-bold text-white tracking-wide">900 000 000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
              onClick={() => window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')}
            >
              Já Paguei - Enviar Comprovativo <ExternalLink size={20} />
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={handleLogout}
            >
              <Lock size={16} className="mr-2" /> Sair da Conta
            </Button>
          </div>
          
          <p className="text-xs text-center text-slate-500">
            Após enviares o comprovativo pelo WhatsApp, a tua conta será desbloqueada em poucos minutos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Paywall;
