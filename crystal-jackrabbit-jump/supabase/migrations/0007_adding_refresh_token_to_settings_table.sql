-- Adicionar coluna refresh_token à tabela settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS refresh_token TEXT;