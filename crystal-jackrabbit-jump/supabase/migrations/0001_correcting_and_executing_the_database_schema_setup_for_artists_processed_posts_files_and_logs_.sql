-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for artists
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own artists" ON public.artists;
CREATE POLICY "Users can manage their own artists" ON public.artists FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create processed_posts table
CREATE TABLE IF NOT EXISTS public.processed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT UNIQUE NOT NULL,
  title TEXT,
  artist TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for processed_posts
ALTER TABLE public.processed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own processed posts" ON public.processed_posts;
CREATE POLICY "Users can manage their own processed posts" ON public.processed_posts FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  drive_file_id TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own files" ON public.files;
CREATE POLICY "Users can manage their own files" ON public.files FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  level TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for logs
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.logs;
CREATE POLICY "Users can manage their own logs" ON public.logs FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Log the setup process (Note: this might fail if not authenticated in the SQL runner context, but the schema will be created)
-- INSERT INTO public.logs (message, level) VALUES ('Database schema initialized successfully.', 'info');