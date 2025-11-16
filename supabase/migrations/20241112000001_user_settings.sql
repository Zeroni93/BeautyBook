-- User Settings Migration
-- Create user_settings table with RLS policies for user preferences

-- Create user_settings table (idempotent)
CREATE TABLE IF NOT EXISTS user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email_notifications boolean DEFAULT true NOT NULL,
    dark_mode boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on user_settings table
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can select their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

-- Create RLS policies
-- SELECT policy: users can only read their own settings
CREATE POLICY "Users can select their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT policy: users can only create settings for themselves
CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: users can only update their own settings
CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No DELETE policy - users cannot delete their settings

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Helper function to insert default user settings
CREATE OR REPLACE FUNCTION insert_user_settings(user_uuid uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO user_settings (user_id, email_notifications, dark_mode)
    VALUES (user_uuid, true, false)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to upsert user settings
CREATE OR REPLACE FUNCTION upsert_user_settings(
    user_uuid uuid,
    email_notifications boolean,
    dark_mode boolean
)
RETURNS void AS $$
BEGIN
    INSERT INTO user_settings (user_id, email_notifications, dark_mode)
    VALUES (user_uuid, email_notifications, dark_mode)
    ON CONFLICT (user_id) 
    DO UPDATE SET
        email_notifications = EXCLUDED.email_notifications,
        dark_mode = EXCLUDED.dark_mode,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;