-- Fix users table to properly work with Supabase Auth
-- This ensures user profiles are properly created and accessed

-- Drop existing users table if it exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table that references auth.users
CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    name text,
    skill_level text DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    learning_style text DEFAULT 'mixed' CHECK (learning_style IN ('visual', 'auditory', 'reading', 'kinesthetic', 'mixed')),
    experience_level text DEFAULT 'beginner',
    total_xp integer DEFAULT 0,
    current_level integer DEFAULT 1,
    streak integer DEFAULT 0,
    last_active timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Check if the setup is complete
SELECT 'users table setup completed with auth integration' as status;