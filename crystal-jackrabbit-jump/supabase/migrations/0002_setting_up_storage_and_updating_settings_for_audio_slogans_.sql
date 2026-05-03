-- Ensure automation_settings has columns for slogan file paths
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS slogan1_url TEXT,
ADD COLUMN IF NOT EXISTS slogan2_url TEXT;

-- Create a bucket for slogans if it doesn't exist (via storage schema)
-- Note: In some Supabase environments, this might need to be done via the UI, 
-- but we'll ensure the table columns are ready.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slogans', 'slogans', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the slogans bucket
CREATE POLICY "Slogan upload policy" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'slogans');