-- =================================================================
-- AI生成コースシステム - データ構造正規化
-- Phase 1: course_basic_info フィールド追加
-- 設計書準拠のデータ構造に修正
-- =================================================================

-- course_basic_info フィールド追加（設計書準拠）
ALTER TABLE ai_course_workflows 
ADD COLUMN IF NOT EXISTS course_basic_info jsonb DEFAULT '{
  "title": "",
  "description": "",
  "difficulty": "",
  "target_audience": "",
  "learning_objectives": [],
  "estimated_duration": "",
  "course_category": ""
}'::jsonb;

-- current_step フィールド追加（ステップ管理用）
ALTER TABLE ai_course_workflows 
ADD COLUMN IF NOT EXISTS current_step text DEFAULT '0';

-- インデックス追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_ai_course_workflows_current_step 
ON ai_course_workflows(current_step);

-- コースタイトルでの検索用インデックス（BTREE使用）
CREATE INDEX IF NOT EXISTS idx_ai_course_workflows_course_title 
ON ai_course_workflows ((course_basic_info->>'title'));

-- 説明文での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_ai_course_workflows_course_description 
ON ai_course_workflows ((course_basic_info->>'description'));

-- データマイグレーション関数
CREATE OR REPLACE FUNCTION migrate_existing_workflow_data()
RETURNS void AS $$
BEGIN
  -- 既存の title, description データを course_basic_info に移行
  UPDATE ai_course_workflows 
  SET course_basic_info = jsonb_build_object(
    'title', COALESCE(title, ''),
    'description', COALESCE(description, ''),
    'difficulty', '',
    'target_audience', '',
    'learning_objectives', '[]'::jsonb,
    'estimated_duration', '',
    'course_category', ''
  )
  WHERE course_basic_info = '{}'::jsonb 
     OR course_basic_info->>'title' IS NULL;
  
  -- ステータスから current_step を設定
  UPDATE ai_course_workflows 
  SET current_step = CASE 
    WHEN status = 'draft' THEN '0'
    WHEN status = 'source_analysis' THEN '1'
    WHEN status IN ('outline_draft', 'manual_input_required') THEN '2'
    WHEN status = 'outline_approved' THEN '3'
    WHEN status = 'content_draft' THEN '4'
    WHEN status = 'content_approved' THEN '5'
    WHEN status = 'published' THEN '6'
    ELSE '0'
  END
  WHERE current_step = '0' OR current_step IS NULL;
  
  RAISE NOTICE 'Workflow data migration completed successfully.';
END;
$$ LANGUAGE plpgsql;

-- マイグレーション実行
SELECT migrate_existing_workflow_data();

-- 統計ビューの更新
DROP VIEW IF EXISTS ai_workflow_overview;
CREATE VIEW ai_workflow_overview AS
SELECT 
  w.id,
  w.user_id,
  u.email as user_email,
  w.course_basic_info->>'title' as title,
  w.course_basic_info->>'description' as description,
  w.status,
  w.current_step,
  w.created_at,
  w.updated_at,
  COALESCE(jsonb_array_length(w.source_materials), 0) as source_count,
  CASE 
    WHEN w.generation_preferences->>'ai_mode' = 'api' THEN 'API'
    ELSE '手動'
  END as ai_mode,
  CASE 
    WHEN w.published_course_id IS NOT NULL THEN 'コース化済み'
    ELSE 'ワークフロー中'
  END as course_status,
  w.course_basic_info->>'difficulty' as difficulty,
  w.course_basic_info->>'target_audience' as target_audience
FROM ai_course_workflows w
LEFT JOIN auth.users u ON w.user_id = u.id;

-- 便利な検索関数
CREATE OR REPLACE FUNCTION search_workflows_by_title(search_term text)
RETURNS TABLE(
  workflow_id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.course_basic_info->>'title',
    w.course_basic_info->>'description',
    w.status,
    w.created_at
  FROM ai_course_workflows w
  WHERE w.course_basic_info->>'title' ILIKE '%' || search_term || '%'
     OR w.course_basic_info->>'description' ILIKE '%' || search_term || '%'
  ORDER BY w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- バリデーション関数
CREATE OR REPLACE FUNCTION validate_course_basic_info(basic_info jsonb)
RETURNS boolean AS $$
BEGIN
  -- 必須フィールドの存在チェック
  IF basic_info->>'title' IS NULL OR basic_info->>'title' = '' THEN
    RETURN false;
  END IF;
  
  IF basic_info->>'description' IS NULL OR basic_info->>'description' = '' THEN
    RETURN false;
  END IF;
  
  -- 学習目標が配列形式かチェック
  IF NOT (basic_info->'learning_objectives' ? 0 OR jsonb_array_length(basic_info->'learning_objectives') = 0) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 統計情報取得関数の更新
CREATE OR REPLACE FUNCTION get_user_workflow_stats_v2(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'in_progress', COUNT(*) FILTER (WHERE status IN ('source_analysis', 'outline_draft', 'content_draft')),
    'manual_pending', COUNT(*) FILTER (WHERE status = 'manual_input_required'),
    'approved', COUNT(*) FILTER (WHERE status IN ('outline_approved', 'content_approved')),
    'published', COUNT(*) FILTER (WHERE status = 'published'),
    'last_activity', MAX(updated_at),
    'completion_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'published')::decimal / COUNT(*)) * 100, 1)
        ELSE 0 
      END,
    'average_duration_days',
      CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'published') > 0 THEN
          ROUND(AVG(EXTRACT(days FROM (updated_at - created_at))) FILTER (WHERE status = 'published'), 1)
        ELSE NULL
      END
  ) INTO stats
  FROM ai_course_workflows 
  WHERE user_id = target_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 完了
-- =================================================================

COMMENT ON COLUMN ai_course_workflows.course_basic_info IS 'Step 0-1で入力される基本コース情報（設計書準拠）';
COMMENT ON COLUMN ai_course_workflows.current_step IS 'ワークフロー現在ステップ（0-6）';

SELECT 
  'Schema migration completed successfully' as status,
  'course_basic_info field added' as change1,
  'current_step field added' as change2,
  'Data migration executed' as change3,
  'Updated views and functions' as change4;