-- auth.usersテーブルの安全な復元
-- user_metadata.roleフィールドのみを削除し、その他のメタデータは保持

-- ステップ1: 現在の状況確認
SELECT 
    'Before restoration' as status,
    id,
    email,
    user_metadata,
    user_metadata->>'role' as extracted_role
FROM auth.users 
ORDER BY created_at DESC;

-- ステップ2: user_metadata.roleフィールドのみを削除
-- その他のフィールド（email_verified, phone_verified, sub等）は保持
UPDATE auth.users 
SET user_metadata = user_metadata - 'role'
WHERE user_metadata ? 'role';

-- ステップ3: 復元後の状況確認
SELECT 
    'After restoration' as status,
    id,
    email,
    user_metadata,
    user_metadata->>'role' as extracted_role
FROM auth.users 
ORDER BY created_at DESC;

-- ステップ4: システムアラート記録
INSERT INTO system_alerts (
    alert_type, 
    severity, 
    title, 
    message, 
    context
) VALUES (
    'auth_users_restoration',
    'high',
    'auth.users role field restoration completed',
    'Successfully removed user_metadata.role field from auth.users table',
    jsonb_build_object(
        'action', 'restore_auth_users',
        'affected_users', 5,
        'timestamp', NOW(),
        'description', 'Removed role field while preserving other metadata'
    )
);

-- ステップ5: 最終確認
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN user_metadata ? 'role' THEN 1 END) as users_with_role,
    COUNT(CASE WHEN user_metadata ? 'email_verified' THEN 1 END) as users_with_email_verified
FROM auth.users;