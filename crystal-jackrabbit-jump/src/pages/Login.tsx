"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [session, navigate, from]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.4)] mb-4">
            <Music className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">MusicFlow</h1>
          <p className="text-indigo-200">A tua central de automação musical</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white">Bem-vindo(a) de Volta</CardTitle>
            <CardDescription className="text-slate-400">Entra para gerires a tua automação</CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary))',
                    },
                    radii: {
                      buttonRadius: '0.5rem',
                      inputRadius: '0.5rem',
                    }
                  }
                },
                className: {
                  container: 'space-y-4',
                  button: 'font-bold h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]',
                  input: 'bg-slate-900/50 border-white/10 text-white focus:ring-indigo-500 h-12',
                  label: 'text-slate-300',
                  anchor: 'text-indigo-400 hover:text-indigo-300'
                }
              }}
              providers={[]}
              theme="dark"
              view={location.state?.view || "sign_in"}
            />
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-slate-400">
          Secure access powered by Supabase Auth
        </p>
      </div>
    </div>
  );
};

export default Login;