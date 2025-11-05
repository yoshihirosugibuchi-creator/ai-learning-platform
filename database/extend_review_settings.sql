-- 復習設定データ構造拡張
-- 復習問題数設定を追加

-- 既存のuser_settingsテーブルを使用して復習設定を拡張
-- setting_key = 'review_settings' のJSONデータに新しいフィールドを追加

-- まず、既存の復習設定があるユーザーを確認
SELECT 
  user_id,
  setting_value,
  updated_at
FROM user_settings 
WHERE setting_key = 'review_settings'
ORDER BY updated_at DESC
LIMIT 5;

-- 復習設定のデフォルト構造を確認するためのコメント
/*
拡張後の復習設定JSON構造:
{
  "notificationEnabled": true,
  "notificationIntervalDays": 7,
  "reviewQuestionsCount": 10,  // 新規追加: 復習問題数（1-30、デフォルト10）
  "createdAt": "2025-10-28T...",
  "updatedAt": "2025-10-28T..."
}
*/

-- 既存の復習設定がある場合のデータ移行は、
-- アプリケーション側のlib/user-review-settings.tsで処理されます。
-- 新しいフィールドが不足している場合は自動的にデフォルト値が設定されます。

-- 復習設定の整合性確認用クエリ
SELECT 
  u.email,
  us.setting_value->'notificationEnabled' as notification_enabled,
  us.setting_value->'notificationIntervalDays' as interval_days,
  us.setting_value->'reviewQuestionsCount' as questions_count,
  us.updated_at
FROM user_settings us
JOIN users u ON u.id = us.user_id
WHERE us.setting_key = 'review_settings'
ORDER BY us.updated_at DESC;