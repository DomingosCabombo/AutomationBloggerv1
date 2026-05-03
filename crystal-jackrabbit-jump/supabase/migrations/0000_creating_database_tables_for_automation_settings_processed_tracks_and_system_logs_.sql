-- Create automation_settings table
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blogger_blog_id TEXT,
  blogger_client_id TEXT,
  blogger_client_secret TEXT,
  drive_folder_id TEXT,
  slogan_url TEXT,
  slogan_position TEXT DEFAULT 'beginning',
  bitrate TEXT DEFAULT '192',
  is_running BOOLEAN DEFAULT false,
  auto_publish BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for automation_settings
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings" ON public.automation_settings
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create processed_tracks table
CREATE TABLE IF NOT EXISTS public.processed_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  original_url TEXT UNIQUE NOT NULL,
  drive_file_id TEXT,
  blogger_post_id TEXT,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for processed_tracks
ALTER TABLE public.processed_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own processed tracks" ON public.processed_tracks
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed tracks" ON public.processed_tracks
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own logs" ON public.system_logs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" ON public.system_logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);