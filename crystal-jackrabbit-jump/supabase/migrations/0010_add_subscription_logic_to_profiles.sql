-- Adicionar colunas de subscrição à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Atualizar o trigger de criação de utilizador para atribuir 30 dias de Trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Inserir perfil com 30 dias de trial
  INSERT INTO public.profiles (id, email, plan_type, subscription_end_date)
  VALUES (new.id, new.email, 'trial', NOW() + INTERVAL '30 days');
  
  -- Initialize default settings for the new user
  INSERT INTO public.automation_settings (user_id, is_running, auto_publish, slogan_position, bitrate)
  VALUES (new.id, false, true, 'beginning', '192');
  
  RETURN new;
END;
$$;
