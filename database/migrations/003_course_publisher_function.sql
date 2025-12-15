-- CoursePublisher用のデータベース関数作成
-- アウトライン承認時とコンテンツ承認時のコース作成をトランザクション内で処理

-- =====================================
-- 1. コース作成用のトランザクション関数
-- =====================================

CREATE OR REPLACE FUNCTION create_course_transaction(
  workflow_data TEXT,
  publish_options TEXT,
  publish_type TEXT
) RETURNS TEXT AS $$
DECLARE
  workflow JSON;
  options JSON;
  course_data JSON;
  result JSON;
  course_id TEXT;
  genre_id TEXT;
  theme_id TEXT;
  session_id TEXT;
  content_id TEXT;
  quiz_id TEXT;
  genre_ids TEXT[] := '{}';
  theme_ids TEXT[] := '{}';
  session_ids TEXT[] := '{}';
  content_ids TEXT[] := '{}';
  quiz_ids TEXT[] := '{}';
  category_mapping JSON;
  outline JSON;
  content_json JSON;
  genre JSON;
  theme JSON;
  session_data JSON;
  session_content JSON;
  session_quiz JSON;
  estimated_days INTEGER;
  display_order INTEGER;
  next_order INTEGER;
  course_status TEXT;
BEGIN
  -- JSONパース
  workflow := workflow_data::JSON;
  options := publish_options::JSON;
  
  -- パラメータ取得
  course_status := COALESCE((options->>'status')::TEXT, 'draft');
  
  -- コース基本情報取得
  course_data := workflow->'course_basic_info';
  
  -- estimated_days計算
  estimated_days := CASE 
    WHEN course_data->>'estimated_duration' LIKE '%日%' THEN 
      REGEXP_REPLACE(course_data->>'estimated_duration', '[^0-9]', '', 'g')::INTEGER
    WHEN course_data->>'estimated_duration' LIKE '%週間%' THEN 
      REGEXP_REPLACE(course_data->>'estimated_duration', '[^0-9]', '', 'g')::INTEGER * 7
    ELSE 7
  END;
  
  -- display_order取得
  SELECT COALESCE(MAX(display_order), 0) + 10 INTO next_order FROM learning_courses;
  
  -- コースID生成
  course_id := LOWER(REPLACE(REPLACE(course_data->>'title', ' ', '_'), '　', '_')) || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
  
  -- 1. コース作成
  INSERT INTO learning_courses (
    id, title, description, estimated_days, difficulty, icon, color, display_order, status, badge_data, created_at, updated_at
  ) VALUES (
    course_id,
    course_data->>'title',
    course_data->>'description',
    estimated_days,
    CASE 
      WHEN course_data->>'difficulty' = '初心者' THEN 'beginner'
      WHEN course_data->>'difficulty' = '基礎' THEN 'basic'
      WHEN course_data->>'difficulty' = '中級' THEN 'intermediate'
      WHEN course_data->>'difficulty' = '上級' THEN 'advanced'
      WHEN course_data->>'difficulty' = '専門' THEN 'expert'
      WHEN course_data->>'difficulty' IN ('beginner', 'basic', 'intermediate', 'advanced', 'expert') THEN course_data->>'difficulty'
      ELSE 'basic'
    END,
    CASE 
      WHEN course_data->>'course_category' ILIKE '%金融%' OR course_data->>'course_category' ILIKE '%ファイナンス%' THEN '💰'
      WHEN course_data->>'course_category' ILIKE '%マーケティング%' THEN '📈'
      WHEN course_data->>'course_category' ILIKE '%マネジメント%' THEN '👥'
      WHEN course_data->>'course_category' ILIKE '%テクノロジー%' OR course_data->>'course_category' ILIKE '%プログラミング%' THEN '💻'
      WHEN course_data->>'course_category' ILIKE '%営業%' THEN '🎯'
      WHEN course_data->>'course_category' ILIKE '%経営%' THEN '🏢'
      ELSE '📚'
    END,
    CASE 
      WHEN course_data->>'course_category' ILIKE '%金融%' OR course_data->>'course_category' ILIKE '%ファイナンス%' THEN 'emerald'
      WHEN course_data->>'course_category' ILIKE '%マーケティング%' THEN 'blue'
      WHEN course_data->>'course_category' ILIKE '%マネジメント%' THEN 'purple'
      WHEN course_data->>'course_category' ILIKE '%テクノロジー%' OR course_data->>'course_category' ILIKE '%プログラミング%' THEN 'cyan'
      WHEN course_data->>'course_category' ILIKE '%営業%' THEN 'orange'
      WHEN course_data->>'course_category' ILIKE '%経営%' THEN 'red'
      ELSE 'slate'
    END,
    next_order,
    course_status,
    JSON_BUILD_OBJECT(
      'estimated_completion', COALESCE(course_data->>'estimated_duration', '1週間'),
      'target_audience', COALESCE(course_data->>'target_audience', '一般'),
      'learning_objectives', COALESCE(course_data->'learning_objectives', '[]'::JSON),
      'category', COALESCE(course_data->>'course_category', '一般')
    ),
    NOW(),
    NOW()
  );
  
  -- 2. アウトラインデータがある場合のみジャンル・テーマ作成
  IF workflow->'outline_data' IS NOT NULL THEN
    outline := workflow->'outline_data';
    
    -- カテゴリマッピング取得
    IF workflow->'category_mappings' IS NOT NULL AND JSON_ARRAY_LENGTH(workflow->'category_mappings') > 0 THEN
      category_mapping := (workflow->'category_mappings'->0);
    END IF;
    
    -- ジャンル作成（通常1つのジャンル）
    FOR genre IN SELECT * FROM JSON_ARRAY_ELEMENTS(outline->'genres')
    LOOP
      genre_id := 'genre_' || course_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
      
      INSERT INTO learning_genres (
        id, course_id, title, description, category_id, subcategory_id, estimated_days, display_order, badge_data, created_at, updated_at
      ) VALUES (
        genre_id,
        course_id,
        genre->>'title',
        genre->>'description',
        COALESCE(category_mapping->>'selectedCategoryId', 'general'),
        category_mapping->>'selectedSubcategoryId',
        1,
        0,
        JSON_BUILD_OBJECT('genre_type', 'ai_generated'),
        NOW(),
        NOW()
      );
      
      genre_ids := array_append(genre_ids, genre_id);
      
      -- テーマ作成
      display_order := 0;
      FOR theme IN SELECT * FROM JSON_ARRAY_ELEMENTS(genre->'themes')
      LOOP
        theme_id := 'theme_' || genre_id || '_' || display_order::TEXT;
        
        INSERT INTO learning_themes (
          id, genre_id, title, description, estimated_minutes, display_order, reward_card_data, created_at, updated_at
        ) VALUES (
          theme_id,
          genre_id,
          theme->>'title',
          theme->>'description',
          COALESCE((theme->>'estimatedMinutes')::INTEGER, 15),
          display_order,
          JSON_BUILD_OBJECT(
            'card_title', theme->>'title',
            'card_description', theme->>'description',
            'card_type', 'knowledge'
          ),
          NOW(),
          NOW()
        );
        
        theme_ids := array_append(theme_ids, theme_id);
        display_order := display_order + 1;
        
        -- 3. コンテンツデータがある場合のみセッション・コンテンツ・クイズ作成
        IF publish_type = 'content' AND workflow->'content_data' IS NOT NULL THEN
          content_json := workflow->'content_data';
          
          -- セッション作成（テーマごと）
          session_id := 'session_' || theme_id || '_knowledge';
          
          INSERT INTO learning_sessions (
            id, theme_id, title, estimated_minutes, session_type, display_order, created_at, updated_at
          ) VALUES (
            session_id,
            theme_id,
            theme->>'title' || ' - 学習セッション',
            COALESCE((theme->>'estimatedMinutes')::INTEGER, 15),
            'knowledge',
            0,
            NOW(),
            NOW()
          );
          
          session_ids := array_append(session_ids, session_id);
          
          -- セッションコンテンツ作成（content_data内のテーマIDとマッチング）
          FOR session_data IN 
            SELECT * FROM JSON_ARRAY_ELEMENTS(content_json->'sessions') 
            WHERE (content_json->'sessions'->0)->>'themeId' = theme_id
          LOOP
            display_order := 0;
            
            -- コンテンツ追加
            FOR session_content IN SELECT * FROM JSON_ARRAY_ELEMENTS(session_data->'contents')
            LOOP
              content_id := 'content_' || session_id || '_' || display_order::TEXT;
              
              INSERT INTO session_contents (
                id, session_id, content_type, title, content, display_order, created_at
              ) VALUES (
                content_id,
                session_id,
                COALESCE(session_content->>'type', 'text'),
                session_content->>'title',
                session_content->>'content',
                display_order,
                NOW()
              );
              
              content_ids := array_append(content_ids, content_id);
              display_order := display_order + 1;
            END LOOP;
            
            -- クイズ追加
            display_order := 0;
            FOR session_quiz IN SELECT * FROM JSON_ARRAY_ELEMENTS(session_data->'quizzes')
            LOOP
              quiz_id := 'quiz_' || session_id || '_' || display_order::TEXT;
              
              INSERT INTO session_quizzes (
                id, session_id, question, options, correct_answer, explanation, quiz_type, display_order, created_at
              ) VALUES (
                quiz_id,
                session_id,
                session_quiz->>'question',
                session_quiz->'options',
                (session_quiz->>'correctAnswer')::INTEGER,
                session_quiz->>'explanation',
                'single_choice',
                display_order,
                NOW()
              );
              
              quiz_ids := array_append(quiz_ids, quiz_id);
              display_order := display_order + 1;
            END LOOP;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  -- 結果JSON作成
  result := JSON_BUILD_OBJECT(
    'success', true,
    'courseId', course_id,
    'genreIds', genre_ids,
    'themeIds', theme_ids,
    'sessionIds', session_ids,
    'contentIds', content_ids,
    'quizIds', quiz_ids
  );
  
  RETURN result::TEXT;
  
EXCEPTION WHEN others THEN
  -- エラー時はROLLBACK（暗黙的）
  result := JSON_BUILD_OBJECT(
    'success', false,
    'error', 'データベースエラーが発生しました',
    'details', SQLERRM
  );
  RETURN result::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 2. 権限設定
-- =====================================

-- supabaseAdmin用にEXECUTE権限付与
GRANT EXECUTE ON FUNCTION create_course_transaction(TEXT, TEXT, TEXT) TO service_role;

-- 作成確認
SELECT 'Course publisher database function created successfully' AS result;