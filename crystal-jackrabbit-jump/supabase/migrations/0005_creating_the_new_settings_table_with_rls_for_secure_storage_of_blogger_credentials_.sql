-- Create the new settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  blog_id TEXT,
  client_id TEXT,
  client_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own settings
CREATE POLICY "Users can manage their own settings" ON public.settings
FOR ALL TO authenticated USING (auth.uid() = user_id);