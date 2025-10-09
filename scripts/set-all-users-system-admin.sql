-- 全ユーザーをシステム管理者権限に設定
-- 開発環境での一時的な設定用

UPDATE auth.users 
SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || '{"role": "system_admin"}'::jsonb
WHERE email IS NOT NULL;

-- 確認用クエリ
SELECT 
    id,
    email,
    user_metadata->>'role' as role,
    created_at
FROM auth.users 
ORDER BY created_at DESC;