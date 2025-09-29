-- ユーザーデータリセット後の検証SQL
-- ユーザーID: 2a4849d1-7d6f-401b-bc75-4e9418e75c07

-- 各テーブルに残っているデータを確認
SELECT 'user_xp_stats_v2' as table_name, count(*) as count FROM user_xp_stats_v2 WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'user_category_xp_stats_v2', count(*) FROM user_category_xp_stats_v2 WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'user_subcategory_xp_stats_v2', count(*) FROM user_subcategory_xp_stats_v2 WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'daily_xp_records', count(*) FROM daily_xp_records WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'quiz_sessions', count(*) FROM quiz_sessions WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'skp_transactions', count(*) FROM skp_transactions WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
UNION ALL
SELECT 'user_badges', count(*) FROM user_badges WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
ORDER BY count DESC;

-- 詳細データ確認：XP統計テーブルの内容
SELECT 'user_xp_stats_v2 data:' as info, total_xp, quiz_xp, course_xp, total_skp, quiz_sessions_completed 
FROM user_xp_stats_v2 
WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07';

-- カテゴリー別統計の詳細
SELECT 'category_stats:' as info, category_id, total_xp, quiz_xp 
FROM user_category_xp_stats_v2 
WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
ORDER BY total_xp DESC;

-- 日別XP記録の詳細
SELECT 'daily_xp_records:' as info, date, total_xp_earned, quiz_xp_earned 
FROM daily_xp_records 
WHERE user_id = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
ORDER BY date DESC
LIMIT 5;