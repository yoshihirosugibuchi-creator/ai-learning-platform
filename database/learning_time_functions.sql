-- ==============================================
-- 学習時間統計再計算用PostgreSQL関数
-- 実行場所: Supabase SQLエディタ
-- ==============================================

-- 1. クイズ学習時間計算関数
CREATE OR REPLACE FUNCTION calculate_user_quiz_time(target_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(qa.time_spent)
    FROM quiz_answers qa
    JOIN quiz_sessions qs ON qa.quiz_session_id = qs.id  
    WHERE qs.user_id = target_user_id
      AND qs.status = 'completed'
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- 2. コース学習時間計算関数  
CREATE OR REPLACE FUNCTION calculate_user_course_time(target_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(lp.duration_seconds)
    FROM learning_progress lp
    WHERE lp.user_id = target_user_id
      AND lp.completion_percentage = 100
      AND lp.duration_seconds > 0
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- 3. 日次学習時間集計関数
CREATE OR REPLACE FUNCTION recalculate_daily_learning_time(target_user_id UUID)
RETURNS TABLE(
  date_str TEXT,
  quiz_time_seconds INTEGER,
  course_time_seconds INTEGER,
  total_time_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH quiz_daily AS (
    SELECT 
      DATE(qs.session_start_time) as session_date,
      SUM(qa.time_spent) as daily_quiz_time
    FROM quiz_sessions qs
    JOIN quiz_answers qa ON qa.quiz_session_id = qs.id
    WHERE qs.user_id = target_user_id
      AND qs.status = 'completed'
    GROUP BY DATE(qs.session_start_time)
  ),
  course_daily AS (
    SELECT 
      DATE(lp.session_start_time) as session_date,
      SUM(lp.duration_seconds) as daily_course_time
    FROM learning_progress lp
    WHERE lp.user_id = target_user_id
      AND lp.completion_percentage = 100
      AND lp.duration_seconds > 0
    GROUP BY DATE(lp.session_start_time)
  )
  SELECT 
    TO_CHAR(COALESCE(q.session_date, c.session_date), 'YYYY-MM-DD') as date_str,
    COALESCE(q.daily_quiz_time, 0)::INTEGER as quiz_time_seconds,
    COALESCE(c.daily_course_time, 0)::INTEGER as course_time_seconds,
    (COALESCE(q.daily_quiz_time, 0) + COALESCE(c.daily_course_time, 0))::INTEGER as total_time_seconds
  FROM quiz_daily q
  FULL OUTER JOIN course_daily c ON q.session_date = c.session_date
  ORDER BY COALESCE(q.session_date, c.session_date);
END;
$$ LANGUAGE plpgsql;

-- 4. ユーザー学習時間統計更新関数（メイン処理）
CREATE OR REPLACE FUNCTION update_user_learning_time_stats(target_user_id UUID)
RETURNS TABLE(
  quiz_time BIGINT,
  course_time BIGINT,
  total_time BIGINT,
  updated_rows INTEGER
) AS $$
DECLARE
  calculated_quiz_time BIGINT;
  calculated_course_time BIGINT;
  calculated_total_time BIGINT;
  rows_updated INTEGER;
BEGIN
  -- 学習時間を計算
  SELECT calculate_user_quiz_time(target_user_id) INTO calculated_quiz_time;
  SELECT calculate_user_course_time(target_user_id) INTO calculated_course_time;
  calculated_total_time := calculated_quiz_time + calculated_course_time;
  
  -- user_xp_stats_v2を更新
  UPDATE user_xp_stats_v2 
  SET 
    quiz_learning_time_seconds = calculated_quiz_time,
    course_learning_time_seconds = calculated_course_time,
    total_learning_time_seconds = calculated_total_time,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RETURN QUERY SELECT 
    calculated_quiz_time as quiz_time,
    calculated_course_time as course_time, 
    calculated_total_time as total_time,
    rows_updated as updated_rows;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 使用例とテスト用クエリ
-- ==============================================

-- 個別関数テスト（実行後にコメントアウト解除して確認可能）
/*
-- 特定ユーザーのクイズ時間を計算
SELECT calculate_user_quiz_time('YOUR_USER_ID_HERE');

-- 特定ユーザーのコース時間を計算  
SELECT calculate_user_course_time('YOUR_USER_ID_HERE');

-- 特定ユーザーの統計を更新
SELECT * FROM update_user_learning_time_stats('YOUR_USER_ID_HERE');

-- 日次データの再計算
SELECT * FROM recalculate_daily_learning_time('YOUR_USER_ID_HERE');
*/