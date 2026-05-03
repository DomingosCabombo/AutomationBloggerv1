-- Adicionar coluna para o token da Auphonic
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auphonic_api_key TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.settings.auphonic_api_key IS 'Token de acesso pessoal da Auphonic para processamento de áudio.';