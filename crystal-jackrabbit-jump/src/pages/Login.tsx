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
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [session, navigate, from]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <Music className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">MusicFlow</h1>
          <p className="text-slate-500">Your automated music processing hub</p>
        </div>

        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to manage your automation</CardDescription>
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
                  button: 'font-medium',
                  input: 'bg-slate-50 border-slate-200 focus:ring-primary',
                }
              }}
              providers={[]}
              theme="light"
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