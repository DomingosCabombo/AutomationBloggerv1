import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { code, redirectUri } = await req.json()
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado: Cabeçalho de autenticação em falta')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) throw new Error('Utilizador não encontrado ou sessão expirada')

    console.log(`[exchange-google-code] Iniciando troca para o utilizador: ${user.id}`);

    // 1. Obter as credenciais do utilizador
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('client_id, client_secret')
      .eq('user_id', user.id)
      .maybeSingle()

    if (settingsError) throw new Error(`Erro ao ler definições: ${settingsError.message}`);
    
    if (!settings?.client_id || !settings?.client_secret) {
      throw new Error('Configura primeiro o Client ID e Secret nas definições e clica em Guardar Tudo antes de conectar.');
    }

    // 2. Trocar o código pelo Refresh Token
    const tokenParams = new URLSearchParams({
      code,
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    console.log("[exchange-google-code] Enviando pedido ao Google...");

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    })

    const data = await response.json()
    if (!response.ok) {
      console.error("[exchange-google-code] Erro Google API:", data);
      throw new Error(data.error_description || data.error || 'Erro na resposta do Google');
    }

    if (!data.refresh_token) {
      console.warn("[exchange-google-code] Refresh Token não recebido. O utilizador já deve ter autorizado anteriormente.");
      // Se não recebermos refresh_token, não atualizamos esse campo para não apagar o que já existe
    }

    // 3. Guardar o Refresh Token na base de dados
    const updateData: any = { user_id: user.id };
    if (data.refresh_token) {
      updateData.refresh_token = data.refresh_token;
      console.log("[exchange-google-code] Novo Refresh Token recebido e será guardado.");
    }
    
    const { error: updateError } = await supabaseClient
      .from('settings')
      .upsert(updateData, { onConflict: 'user_id' });

    if (updateError) throw new Error(`Erro ao guardar token na DB: ${updateError.message}`);

    console.log("[exchange-google-code] Sucesso total!");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("[exchange-google-code] Erro Fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})