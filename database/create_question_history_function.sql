-- 問題履歴統計取得関数
CREATE OR REPLACE FUNCTION get_question_history_stats(
  p_user_id UUID,
  p_category_id TEXT,
  p_difficulty TEXT
)
RETURNS TABLE (
  question_id TEXT,
  attempts_count INTEGER,
  incorrect_count INTEGER,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  last_incorrect_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.question_id::TEXT,
    COUNT(*)::INTEGER as attempts_count,
    COUNT(CASE WHEN qa.is_correct = false THEN 1 END)::INTEGER as incorrect_count,
    -- 最新の結果
    (ARRAY_AGG(qa.is_correct ORDER BY qa.created_at DESC))[1] as is_correct,
    MIN(qa.created_at) as created_at,
    MAX(qa.created_at) as last_attempted_at,
    MAX(CASE WHEN qa.is_correct = false THEN qa.created_at END) as last_incorrect_at
  FROM quiz_answers qa
  INNER JOIN quiz_sessions qs ON qa.quiz_session_id = qs.id
  WHERE qs.user_id = p_user_id
    AND qa.category_id = p_category_id
    AND qa.difficulty = p_difficulty
  GROUP BY qa.question_id;
END;
$$;

-- RLS設定
ALTER FUNCTION get_question_history_stats(UUID, TEXT, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_question_history_stats(UUID, TEXT, TEXT) TO authenticated;

-- テスト用コメント
-- SELECT * FROM get_question_history_stats('user-uuid', 'category-id', 'difficulty');