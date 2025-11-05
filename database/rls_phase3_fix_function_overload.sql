-- RLS Phase 3 修正: TEXT型user_id対応関数の追加
-- 作成日: 2025年11月4日
-- 目的: 今後の開発に影響がないよう、TEXT型とUUID型の両方に対応

-- =============================================================================
-- TEXT型user_id用の関数オーバーロード
-- =============================================================================

-- TEXT型のuser_idに対応したis_owner_or_admin関数
CREATE OR REPLACE FUNCTION is_owner_or_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- NULLチェック
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- UUIDに変換してから比較、または管理者権限チェック
  RETURN (
    auth.uid()::text = user_id OR is_admin()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明
COMMENT ON FUNCTION is_owner_or_admin(TEXT) IS 'TEXT型user_idでのデータ所有者または管理者かどうかを確認（UUID型との互換性のため）';

-- =============================================================================
-- 動作確認
-- =============================================================================

-- 関数のオーバーロード確認
SELECT 
  proname,
  pronargs,
  proargtypes::regtype[]
FROM pg_proc 
WHERE proname = 'is_owner_or_admin'
ORDER BY pronargs;

-- テスト（実行例）
/*
-- UUID型での呼び出し（既存）
SELECT is_owner_or_admin('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid);

-- TEXT型での呼び出し（新規対応）
SELECT is_owner_or_admin('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::text);
*/