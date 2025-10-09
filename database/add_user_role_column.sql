-- Add role column to users table for application-level permission management
-- This moves us away from Supabase auth.users dependency

-- Add role column with default 'user'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT 
CHECK (role IN ('user', 'admin', 'system_admin')) 
DEFAULT 'user';

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Update RLS policies to allow admins to view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role IN ('admin', 'system_admin')
  )
);

-- Allow system admins to update user roles
DROP POLICY IF EXISTS "System admins can update all users" ON users;
CREATE POLICY "System admins can update all users" ON users 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'system_admin'
  )
);

-- Insert trigger to create user profile when auth.users record is created
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'  -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Migrate existing auth.users data to users table (if not exists)
INSERT INTO users (id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  CASE 
    WHEN au.raw_user_meta_data->>'role' = 'system_admin' THEN 'system_admin'
    WHEN au.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
    ELSE 'user'
  END as role
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;