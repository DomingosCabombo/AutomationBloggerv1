-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can see their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Ensure all tables have user_id and RLS
-- Artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own artists" ON public.artists;
CREATE POLICY "Users can manage their own artists" ON public.artists
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Automation Settings
ALTER TABLE public.automation_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.automation_settings;
CREATE POLICY "Users can manage their own settings" ON public.automation_settings
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Processed Posts
ALTER TABLE public.processed_posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.processed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own processed posts" ON public.processed_posts;
CREATE POLICY "Users can manage their own processed posts" ON public.processed_posts
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Logs
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.logs;
CREATE POLICY "Users can manage their own logs" ON public.logs
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Files
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own files" ON public.files;
CREATE POLICY "Users can manage their own files" ON public.files
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 3. Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Initialize default settings for the new user
  INSERT INTO public.automation_settings (user_id, is_running, auto_publish, slogan_position, bitrate)
  VALUES (new.id, false, true, 'beginning', '192');
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();