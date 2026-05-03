-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slogan1_url TEXT,
  slogan2_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Ensure slogans bucket exists (Note: Storage buckets are usually managed via API or Console, 
-- but we can attempt to insert into storage.buckets if permissions allow, 
-- though typically we just assume it exists or handle it in code)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slogans', 'slogans', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the slogans bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'slogans');
CREATE POLICY "Authenticated users can upload slogans" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'slogans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own slogans" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'slogans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own slogans" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'slogans' AND (storage.foldername(name))[1] = auth.uid()::text);