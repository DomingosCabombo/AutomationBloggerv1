-- Migração: Adicionar campos para metadados, encurtador de links e templates Blogger
-- Executado para suportar novas funcionalidades antes de hospedar

ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS default_cover_url TEXT,
ADD COLUMN IF NOT EXISTS blogger_template TEXT,
ADD COLUMN IF NOT EXISTS shortlink_provider TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS shortlink_api_key TEXT;
