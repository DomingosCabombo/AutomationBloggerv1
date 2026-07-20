-- Migração: Adicionar coluna para URL personalizada da API de Mixagem
-- Permite que o utilizador atualize o link do túnel diretamente pelo painel frontend

ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS audio_mix_api_url TEXT;

-- Forçar recarregamento da cache do PostgREST
NOTIFY pgrst, 'reload schema';
