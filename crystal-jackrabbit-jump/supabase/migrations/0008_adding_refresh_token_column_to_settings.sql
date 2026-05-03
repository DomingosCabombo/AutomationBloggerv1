-- Adiciona a coluna refresh_token se ela não existir
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Garante que o user_id é único para permitir upserts (caso não tenha sido feito antes)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_user_id_key'
    ) THEN
        ALTER TABLE public.settings ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;