-- Ensure user_id is unique in the settings table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_user_id_key'
    ) THEN
        ALTER TABLE public.settings ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Ensure user_id is unique in the automation_settings table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'automation_settings_user_id_key'
    ) THEN
        ALTER TABLE public.automation_settings ADD CONSTRAINT automation_settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;