# 第1段階統合学習分析システム詳細設計書

**プロジェクト**: AI Learning Platform Next.js  
**フェーズ**: 第1段階 - クイズ+コース統合学習分析  
**作成日**: 2025年10月1日  
**技術基盤**: PostgreSQL + TypeScript + Next.js

---

## 📋 **設計概要**

### **基本方針**
- **統合学習分析**: クイズ学習とコース学習の両方を統合分析
- **現在の環境完結**: PostgreSQL + TypeScript のみで実装
- **段階的機能追加**: 既存システムを破壊せずに分析機能を追加
- **科学的根拠の実装**: 忘却曲線・認知負荷・フロー理論をPostgreSQL + TypeScriptで実現

### **統合学習データ源**
```typescript
interface UnifiedLearningDataSources {
  // クイズ学習データ
  quizSessions: "quiz_sessions - 問題解答・正答率・反応時間"
  quizXP: "user_xp_stats_v2.quiz_xp - クイズ獲得XP"
  quizTime: "quiz_time_seconds - クイズ学習時間"
  
  // コース学習データ
  courseCompletions: "course_completions - コース完了・修了証"
  courseThemeCompletions: "course_theme_completions - テーマ完了"
  courseSessionCompletions: "course_session_completions - セッション完了"
  courseXP: "user_xp_stats_v2.course_xp - コース獲得XP"
  courseTime: "course_time_seconds - コース学習時間"
  
  // 統合データ
  totalXP: "user_xp_stats_v2.total_xp - 全学習XP"
  totalTime: "total_time_seconds - 総学習時間"
  categorySubcategoryXP: "両学習タイプの統合XP統計"
}
```

### **技術スタック**
```typescript
interface TechStack {
  database: "PostgreSQL (Supabase)"
  backend: "Next.js API Routes + PostgreSQL Functions"
  frontend: "TypeScript + React + Chart.js"
  analytics: "PostgreSQL統計関数 + TypeScript軽量ML"
  deployment: "Vercel (追加コストなし)"
  learningTypes: "Quiz + Course統合分析"
}
```

---

## 🗄️ **データベース設計**

### **新規テーブル設計**

#### **1. 統合学習セッション分析テーブル**
```sql
-- 統合学習セッション分析（クイズ+コース両方対応）
CREATE TABLE unified_learning_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- セッション識別
  session_type VARCHAR(20) NOT NULL, -- 'quiz', 'course', 'mixed'
  quiz_session_id UUID REFERENCES quiz_sessions(id),
  course_session_id VARCHAR(100), -- course系セッションID
  course_id VARCHAR(100),
  theme_id VARCHAR(100),
  
  -- セッション基本情報
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  
  -- パフォーマンス指標（セッションタイプ別）
  -- クイズの場合
  questions_total INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  quiz_xp_earned INTEGER DEFAULT 0,
  
  -- コースの場合
  content_completed BOOLEAN DEFAULT FALSE,
  course_xp_earned INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0, -- コース内容の完了率
  engagement_score INTEGER DEFAULT 0, -- 1-10（コース内での集中度）
  content_interaction_count INTEGER DEFAULT 0, -- コンテンツとの相互作用回数
  
  -- 共通指標
  category_id VARCHAR(100),
  subcategory_id VARCHAR(100),
  difficulty_level VARCHAR(20) DEFAULT 'intermediate',
  total_xp_earned INTEGER DEFAULT 0, -- session全体で獲得したXP
  
  -- 時間・環境要因
  hour_of_day INTEGER NOT NULL, -- 0-23
  day_of_week INTEGER NOT NULL, -- 0-6 (0=Sunday)
  time_zone VARCHAR(50),
  
  -- 認知負荷指標（全学習タイプ共通）
  cognitive_load_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  content_complexity INTEGER DEFAULT 0, -- 1-10 コンテンツ複雑度
  user_perceived_difficulty INTEGER DEFAULT 0, -- 1-10 (ユーザー主観)
  fatigue_level INTEGER DEFAULT 0, -- 1-10 (ユーザー主観)
  
  -- フロー状態指標
  flow_state_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  engagement_level INTEGER DEFAULT 0, -- 1-10
  challenge_skill_balance DECIMAL(3,2) DEFAULT 0, -- -1 to 1
  
  -- 学習効果指標
  knowledge_retention_score DECIMAL(3,2), -- 知識定着度予測
  transfer_potential DECIMAL(3,2), -- 他分野への応用可能性
  
  -- システム計算値
  optimal_session_duration INTEGER, -- 推奨セッション時間(秒)
  predicted_performance DECIMAL(5,2), -- 予測パフォーマンス
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_unified_session_analytics_user_type_time 
ON unified_learning_session_analytics(user_id, session_type, session_start_time);

CREATE INDEX idx_unified_session_analytics_category 
ON unified_learning_session_analytics(user_id, category_id, subcategory_id);

CREATE INDEX idx_unified_session_analytics_hour_day 
ON unified_learning_session_analytics(user_id, hour_of_day, day_of_week);
```

#### **2. 個人学習プロファイルテーブル（統合版）**
```sql
-- 個人化された統合学習特性プロファイル
CREATE TABLE user_unified_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- 時間パターン（学習タイプ別）
  optimal_quiz_hours INTEGER[] DEFAULT '{}', -- クイズ最適時間帯
  optimal_course_hours INTEGER[] DEFAULT '{}', -- コース最適時間帯
  peak_performance_day INTEGER, -- 最高パフォーマンス曜日 (0-6)
  average_quiz_session_duration INTEGER DEFAULT 1200, -- 平均クイズセッション時間(秒)
  average_course_session_duration INTEGER DEFAULT 1800, -- 平均コースセッション時間(秒)
  
  -- 忘却曲線パラメータ（学習タイプ別）
  quiz_forgetting_rate DECIMAL(8,6) DEFAULT -0.05, -- クイズ忘却率
  course_forgetting_rate DECIMAL(8,6) DEFAULT -0.03, -- コース忘却率（一般的に遅い）
  quiz_retention_strength DECIMAL(5,3) DEFAULT 0.7, -- クイズ初期記憶保持率
  course_retention_strength DECIMAL(5,3) DEFAULT 0.9, -- コース初期記憶保持率
  optimal_quiz_review_interval_days INTEGER DEFAULT 5, -- クイズ最適復習間隔
  optimal_course_review_interval_days INTEGER DEFAULT 14, -- コース最適復習間隔
  
  -- 認知能力プロファイル
  quiz_cognitive_load_tolerance DECIMAL(3,2) DEFAULT 0.8, -- クイズ認知負荷耐性
  course_cognitive_load_tolerance DECIMAL(3,2) DEFAULT 0.6, -- コース認知負荷耐性
  quiz_optimal_difficulty_range DECIMAL[] DEFAULT '{0.6,0.8}', -- クイズ最適難易度範囲
  course_optimal_difficulty_range DECIMAL[] DEFAULT '{0.4,0.7}', -- コース最適難易度範囲
  processing_speed_index DECIMAL(5,2) DEFAULT 1.0, -- 処理速度指数
  
  -- フロー状態特性（学習タイプ別）
  quiz_flow_trigger_conditions JSONB, -- クイズでのフロー状態条件
  course_flow_trigger_conditions JSONB, -- コースでのフロー状態条件
  quiz_optimal_challenge_level DECIMAL(3,2) DEFAULT 0.7, -- クイズ最適チャレンジレベル
  course_optimal_challenge_level DECIMAL(3,2) DEFAULT 0.5, -- コース最適チャレンジレベル
  
  -- 学習継続性・効率性
  quiz_consistency_score DECIMAL(3,2) DEFAULT 0.5, -- クイズ継続性スコア
  course_consistency_score DECIMAL(3,2) DEFAULT 0.5, -- コース継続性スコア
  cross_modality_synergy_score DECIMAL(3,2) DEFAULT 0.5, -- 相乗効果スコア
  optimal_quiz_course_ratio DECIMAL(3,2) DEFAULT 0.6, -- 最適クイズ/コース比率
  
  -- 学習効果・転移
  quiz_to_course_transfer_rate DECIMAL(3,2) DEFAULT 0.5, -- クイズ→コース転移率
  course_to_quiz_transfer_rate DECIMAL(3,2) DEFAULT 0.7, -- コース→クイズ転移率
  knowledge_retention_decay_rate DECIMAL(6,4) DEFAULT 0.95, -- 知識保持減衰率
  
  -- モチベーション・学習スタイル
  motivation_factors VARCHAR[] DEFAULT '{}', -- モチベーション要因
  learning_style_preference VARCHAR(20) DEFAULT 'mixed', -- 'quiz_focused', 'course_focused', 'mixed'
  burnout_risk_level INTEGER DEFAULT 3, -- バーンアウトリスク (1-10)
  
  -- プロファイル品質
  quiz_data_points_count INTEGER DEFAULT 0, -- クイズ分析データ点数
  course_data_points_count INTEGER DEFAULT 0, -- コース分析データ点数
  total_data_points_count INTEGER DEFAULT 0, -- 総分析データ点数
  profile_reliability DECIMAL(3,2) DEFAULT 0.0, -- プロファイル信頼度
  last_analysis_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **3. 統合復習スケジュールテーブル**
```sql
-- 統合間隔反復復習スケジュール管理
CREATE TABLE unified_spaced_repetition_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 復習対象
  content_type VARCHAR(50) NOT NULL, -- 'category', 'subcategory', 'specific_quiz', 'specific_course'
  content_id VARCHAR(100) NOT NULL, -- カテゴリーID、コースID、セッションIDなど
  learning_source VARCHAR(20) NOT NULL, -- 'quiz', 'course', 'mixed'
  
  -- 復習スケジュール
  last_review_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ NOT NULL,
  review_interval_days INTEGER NOT NULL DEFAULT 1,
  
  -- 記憶強度追跡（学習タイプ別）
  quiz_memory_strength DECIMAL(5,3) DEFAULT 1.0, -- クイズ記憶強度 (0-1)
  course_memory_strength DECIMAL(5,3) DEFAULT 1.0, -- コース記憶強度 (0-1)
  combined_memory_strength DECIMAL(5,3) DEFAULT 1.0, -- 統合記憶強度
  review_count INTEGER DEFAULT 0, -- 復習回数
  consecutive_correct INTEGER DEFAULT 0, -- 連続正解数（クイズの場合）
  consecutive_completions INTEGER DEFAULT 0, -- 連続完了数（コースの場合）
  
  -- 個人化要因
  difficulty_modifier DECIMAL(3,2) DEFAULT 1.0, -- 個人の難易度調整
  importance_weight DECIMAL(3,2) DEFAULT 1.0, -- 重要度重み
  urgency_score DECIMAL(3,2) DEFAULT 0.5, -- 緊急度スコア
  
  -- スケジュール状態
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'overdue', 'skipped'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_unified_spaced_repetition_user_next_review 
ON unified_spaced_repetition_schedule(user_id, next_review_date);

CREATE INDEX idx_unified_spaced_repetition_content 
ON unified_spaced_repetition_schedule(content_type, content_id, learning_source);

CREATE INDEX idx_unified_spaced_repetition_status 
ON unified_spaced_repetition_schedule(user_id, status, next_review_date);
```

---

## 🧮 **統合分析アルゴリズム実装**

### **1. 統合忘却曲線分析アルゴリズム**

#### **PostgreSQL実装**
```sql
-- クイズとコース学習の両方を考慮した統合忘却曲線分析
CREATE OR REPLACE FUNCTION calculate_unified_forgetting_curve(
  p_user_id UUID,
  p_category_id VARCHAR DEFAULT NULL
) RETURNS TABLE (
  quiz_forgetting_rate DECIMAL(8,6),
  course_forgetting_rate DECIMAL(8,6),
  combined_forgetting_rate DECIMAL(8,6),
  quiz_retention_strength DECIMAL(5,3),
  course_retention_strength DECIMAL(5,3),
  combined_retention_strength DECIMAL(5,3),
  optimal_quiz_review_interval INTEGER,
  optimal_course_review_interval INTEGER,
  quiz_data_weight DECIMAL(3,2),
  course_data_weight DECIMAL(3,2),
  confidence_level DECIMAL(3,2)
) AS $$
DECLARE
  quiz_data_points INTEGER;
  course_data_points INTEGER;
  total_data_points INTEGER;
BEGIN
  -- データ点数をカウント
  SELECT 
    COUNT(*) FILTER (WHERE session_type = 'quiz'),
    COUNT(*) FILTER (WHERE session_type = 'course'),
    COUNT(*)
  INTO quiz_data_points, course_data_points, total_data_points
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND (p_category_id IS NULL OR category_id = p_category_id);
  
  -- 十分なデータがある場合の統合分析
  IF total_data_points >= 10 THEN
    RETURN QUERY
    WITH quiz_performance AS (
      SELECT 
        session_start_time,
        accuracy_rate as performance_score,
        EXTRACT(EPOCH FROM (session_start_time - LAG(session_start_time) 
          OVER (ORDER BY session_start_time))) / 86400.0 as days_since_last,
        LN(GREATEST(accuracy_rate, 0.01)) as ln_performance
      FROM unified_learning_session_analytics
      WHERE user_id = p_user_id
        AND session_type = 'quiz'
        AND (p_category_id IS NULL OR category_id = p_category_id)
        AND accuracy_rate > 0
      ORDER BY session_start_time
    ),
    course_performance AS (
      SELECT 
        session_start_time,
        completion_rate / 100.0 as performance_score,
        EXTRACT(EPOCH FROM (session_start_time - LAG(session_start_time) 
          OVER (ORDER BY session_start_time))) / 86400.0 as days_since_last,
        LN(GREATEST(completion_rate / 100.0, 0.01)) as ln_performance
      FROM unified_learning_session_analytics
      WHERE user_id = p_user_id
        AND session_type = 'course'
        AND (p_category_id IS NULL OR category_id = p_category_id)
        AND completion_rate > 0
      ORDER BY session_start_time
    ),
    quiz_regression AS (
      SELECT 
        COALESCE(regr_slope(ln_performance, days_since_last), -0.05) as slope,
        COALESCE(EXP(regr_intercept(ln_performance, days_since_last)), 0.7) as intercept,
        COALESCE(corr(ln_performance, days_since_last), 0.0) as correlation
      FROM quiz_performance
      WHERE days_since_last IS NOT NULL AND days_since_last > 0
    ),
    course_regression AS (
      SELECT 
        COALESCE(regr_slope(ln_performance, days_since_last), -0.03) as slope,
        COALESCE(EXP(regr_intercept(ln_performance, days_since_last)), 0.9) as intercept,
        COALESCE(corr(ln_performance, days_since_last), 0.0) as correlation
      FROM course_performance
      WHERE days_since_last IS NOT NULL AND days_since_last > 0
    )
    SELECT 
      -- クイズ忘却パラメータ
      qr.slope as quiz_forgetting_rate,
      -- コース忘却パラメータ
      cr.slope as course_forgetting_rate,
      -- 統合忘却パラメータ（重み付き平均）
      ((qr.slope * quiz_data_points + cr.slope * course_data_points) / 
       NULLIF(quiz_data_points + course_data_points, 0))::DECIMAL(8,6) as combined_forgetting_rate,
      
      -- 記憶保持強度
      qr.intercept as quiz_retention_strength,
      cr.intercept as course_retention_strength,
      ((qr.intercept * quiz_data_points + cr.intercept * course_data_points) / 
       NULLIF(quiz_data_points + course_data_points, 0))::DECIMAL(5,3) as combined_retention_strength,
      
      -- 最適復習間隔
      CASE 
        WHEN qr.slope > -0.02 THEN 10
        WHEN qr.slope > -0.05 THEN 5
        WHEN qr.slope > -0.1 THEN 3
        ELSE 1
      END as optimal_quiz_review_interval,
      
      CASE 
        WHEN cr.slope > -0.01 THEN 21  -- コースは一般的に長期保持
        WHEN cr.slope > -0.03 THEN 14
        WHEN cr.slope > -0.05 THEN 7
        ELSE 3
      END as optimal_course_review_interval,
      
      -- データ重み
      (quiz_data_points::DECIMAL / NULLIF(total_data_points, 0)) as quiz_data_weight,
      (course_data_points::DECIMAL / NULLIF(total_data_points, 0)) as course_data_weight,
      
      -- 信頼度（両方の相関係数の平均）
      GREATEST((ABS(qr.correlation) + ABS(cr.correlation)) / 2.0, 0.1) as confidence_level
    FROM quiz_regression qr, course_regression cr;
  ELSE
    -- データ不足時のデフォルト値
    RETURN QUERY
    SELECT 
      -0.05::DECIMAL(8,6) as quiz_forgetting_rate,
      -0.03::DECIMAL(8,6) as course_forgetting_rate,
      -0.04::DECIMAL(8,6) as combined_forgetting_rate,
      0.7::DECIMAL(5,3) as quiz_retention_strength,
      0.9::DECIMAL(5,3) as course_retention_strength,
      0.8::DECIMAL(5,3) as combined_retention_strength,
      5::INTEGER as optimal_quiz_review_interval,
      14::INTEGER as optimal_course_review_interval,
      0.5::DECIMAL(3,2) as quiz_data_weight,
      0.5::DECIMAL(3,2) as course_data_weight,
      0.1::DECIMAL(3,2) as confidence_level;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### **2. 統合認知負荷分析アルゴリズム**

#### **PostgreSQL実装**
```sql
-- 統合認知負荷分析（クイズとコース学習の特性を考慮）
CREATE OR REPLACE FUNCTION calculate_unified_cognitive_load(
  p_user_id UUID,
  p_session_id UUID
) RETURNS TABLE (
  session_type VARCHAR(20),
  intrinsic_load DECIMAL(3,2),
  extraneous_load DECIMAL(3,2), 
  germane_load DECIMAL(3,2),
  total_load DECIMAL(3,2),
  type_specific_load DECIMAL(3,2), -- 学習タイプ特有の負荷
  recommended_break BOOLEAN,
  optimal_next_session_type VARCHAR(20)
) AS $$
DECLARE
  session_data RECORD;
  user_profile RECORD;
  type_specific_factors RECORD;
BEGIN
  -- セッションデータを取得
  SELECT 
    ulsa.session_type,
    ulsa.duration_seconds,
    ulsa.difficulty_level,
    ulsa.user_perceived_difficulty,
    ulsa.content_complexity,
    -- クイズ特有データ
    ulsa.questions_total,
    ulsa.accuracy_rate,
    ulsa.average_response_time_ms,
    -- コース特有データ
    ulsa.completion_rate,
    ulsa.engagement_score,
    ulsa.content_interaction_count
  INTO session_data
  FROM unified_learning_session_analytics ulsa
  WHERE ulsa.id = p_session_id;
  
  -- ユーザープロファイルを取得
  SELECT 
    quiz_cognitive_load_tolerance,
    course_cognitive_load_tolerance,
    processing_speed_index,
    average_quiz_session_duration,
    average_course_session_duration
  INTO user_profile
  FROM user_unified_learning_profiles 
  WHERE user_id = p_user_id;
  
  -- 学習タイプ特有の要因を計算
  IF session_data.session_type = 'quiz' THEN
    SELECT 
      -- クイズ特有の認知負荷要因
      LEAST(1.0, session_data.questions_total / 30.0) as question_density_load,
      GREATEST(0.2, 1.0 - session_data.accuracy_rate) as performance_stress_load,
      CASE 
        WHEN session_data.average_response_time_ms > 30000 THEN 0.8  -- 30秒以上は高負荷
        WHEN session_data.average_response_time_ms > 15000 THEN 0.5  -- 15秒以上は中負荷
        ELSE 0.2
      END as time_pressure_load
    INTO type_specific_factors;
  ELSIF session_data.session_type = 'course' THEN
    SELECT 
      -- コース特有の認知負荷要因
      LEAST(1.0, session_data.content_complexity / 10.0) as content_density_load,
      CASE 
        WHEN session_data.engagement_score < 3 THEN 0.8  -- 低エンゲージメント = 高負荷
        WHEN session_data.engagement_score < 6 THEN 0.5
        ELSE 0.2
      END as engagement_load,
      LEAST(1.0, session_data.duration_seconds / 3600.0) as sustained_attention_load -- 1時間を基準
    INTO type_specific_factors;
  END IF;
  
  RETURN QUERY
  SELECT 
    session_data.session_type,
    
    -- 内在的負荷（内容の本質的複雑さ）
    CASE session_data.session_type
      WHEN 'quiz' THEN 
        LEAST(1.0, (session_data.user_perceived_difficulty / 10.0) * 0.7 + 
                   type_specific_factors.question_density_load * 0.3)
      WHEN 'course' THEN 
        LEAST(1.0, (session_data.content_complexity / 10.0) * 0.8 + 
                   type_specific_factors.content_density_load * 0.2)
      ELSE 0.5
    END::DECIMAL(3,2) as intrinsic_load,
    
    -- 外在的負荷（UI・操作・環境による負荷）
    CASE session_data.session_type
      WHEN 'quiz' THEN 
        LEAST(1.0, type_specific_factors.time_pressure_load * 0.6 + 
                   (session_data.duration_seconds / 
                    COALESCE(user_profile.average_quiz_session_duration, 1200)) * 0.4)
      WHEN 'course' THEN 
        LEAST(1.0, type_specific_factors.engagement_load * 0.5 + 
                   type_specific_factors.sustained_attention_load * 0.5)
      ELSE 0.5
    END::DECIMAL(3,2) as extraneous_load,
    
    -- 関連負荷（学習・理解に必要な認知努力）
    CASE session_data.session_type
      WHEN 'quiz' THEN 
        LEAST(1.0, session_data.accuracy_rate * 
                   (session_data.user_perceived_difficulty / 10.0))
      WHEN 'course' THEN 
        LEAST(1.0, (session_data.completion_rate / 100.0) * 
                   (session_data.content_complexity / 10.0))
      ELSE 0.5
    END::DECIMAL(3,2) as germane_load,
    
    -- 総認知負荷の計算
    LEAST(1.0, 
      -- 各負荷の合計
      CASE session_data.session_type
        WHEN 'quiz' THEN 
          (session_data.user_perceived_difficulty / 10.0) * 0.3 + 
          type_specific_factors.time_pressure_load * 0.3 +
          (session_data.accuracy_rate * (session_data.user_perceived_difficulty / 10.0)) * 0.4
        WHEN 'course' THEN 
          (session_data.content_complexity / 10.0) * 0.3 + 
          type_specific_factors.engagement_load * 0.3 +
          ((session_data.completion_rate / 100.0) * (session_data.content_complexity / 10.0)) * 0.4
        ELSE 0.5
      END
    )::DECIMAL(3,2) as total_load,
    
    -- 学習タイプ特有の負荷
    CASE session_data.session_type
      WHEN 'quiz' THEN 
        (type_specific_factors.question_density_load + 
         type_specific_factors.performance_stress_load + 
         type_specific_factors.time_pressure_load) / 3.0
      WHEN 'course' THEN 
        (type_specific_factors.content_density_load + 
         type_specific_factors.engagement_load + 
         type_specific_factors.sustained_attention_load) / 3.0
      ELSE 0.5
    END::DECIMAL(3,2) as type_specific_load,
    
    -- 休憩推奨の判定
    CASE session_data.session_type
      WHEN 'quiz' THEN 
        LEAST(1.0, 
          (session_data.user_perceived_difficulty / 10.0) * 0.3 + 
          type_specific_factors.time_pressure_load * 0.3 +
          (session_data.accuracy_rate * (session_data.user_perceived_difficulty / 10.0)) * 0.4
        ) > COALESCE(user_profile.quiz_cognitive_load_tolerance, 0.8)
      WHEN 'course' THEN 
        LEAST(1.0, 
          (session_data.content_complexity / 10.0) * 0.3 + 
          type_specific_factors.engagement_load * 0.3 +
          ((session_data.completion_rate / 100.0) * (session_data.content_complexity / 10.0)) * 0.4
        ) > COALESCE(user_profile.course_cognitive_load_tolerance, 0.6)
      ELSE FALSE
    END as recommended_break,
    
    -- 次の最適セッションタイプ推奨
    CASE 
      WHEN session_data.session_type = 'quiz' AND 
           type_specific_factors.performance_stress_load > 0.7 THEN 'course'
      WHEN session_data.session_type = 'course' AND 
           type_specific_factors.engagement_load > 0.7 THEN 'quiz'
      ELSE session_data.session_type
    END as optimal_next_session_type;
END;
$$ LANGUAGE plpgsql;
```

### **3. 統合フロー状態分析アルゴリズム**

#### **PostgreSQL実装**
```sql
-- 統合フロー状態分析（クイズとコースの特性を考慮）
CREATE OR REPLACE FUNCTION analyze_unified_flow_state(
  p_user_id UUID,
  p_session_id UUID
) RETURNS TABLE (
  session_type VARCHAR(20),
  flow_index DECIMAL(3,2),
  challenge_level DECIMAL(3,2),
  skill_level DECIMAL(3,2),
  engagement_score DECIMAL(3,2),
  type_specific_flow_factors JSONB,
  flow_recommendation VARCHAR(200),
  optimal_difficulty_adjustment DECIMAL(3,2)
) AS $$
DECLARE
  session_metrics RECORD;
  user_profile RECORD;
  historical_performance RECORD;
  flow_factors JSONB;
BEGIN
  -- セッションメトリクスを取得
  SELECT 
    ulsa.session_type,
    ulsa.difficulty_level,
    ulsa.duration_seconds,
    ulsa.engagement_level,
    -- クイズ特有メトリクス
    ulsa.accuracy_rate,
    ulsa.questions_total,
    ulsa.average_response_time_ms,
    -- コース特有メトリクス
    ulsa.completion_rate,
    ulsa.engagement_score,
    ulsa.content_interaction_count
  INTO session_metrics
  FROM unified_learning_session_analytics ulsa
  WHERE ulsa.id = p_session_id;
  
  -- ユーザープロファイルを取得
  SELECT 
    quiz_optimal_challenge_level,
    course_optimal_challenge_level,
    processing_speed_index,
    quiz_optimal_difficulty_range,
    course_optimal_difficulty_range
  INTO user_profile
  FROM user_unified_learning_profiles 
  WHERE user_id = p_user_id;
  
  -- 過去パフォーマンスを取得
  SELECT 
    AVG(CASE WHEN session_type = 'quiz' THEN accuracy_rate ELSE NULL END) as avg_quiz_accuracy,
    AVG(CASE WHEN session_type = 'course' THEN completion_rate ELSE NULL END) as avg_course_completion,
    COUNT(*) FILTER (WHERE session_type = session_metrics.session_type) as same_type_sessions
  INTO historical_performance
  FROM unified_learning_session_analytics 
  WHERE user_id = p_user_id 
    AND session_start_time >= NOW() - INTERVAL '30 days'
    AND id != p_session_id;
  
  -- 学習タイプ特有のフロー要因を計算
  IF session_metrics.session_type = 'quiz' THEN
    flow_factors := jsonb_build_object(
      'response_time_consistency', 
      CASE 
        WHEN session_metrics.average_response_time_ms BETWEEN 5000 AND 20000 THEN 0.8
        WHEN session_metrics.average_response_time_ms BETWEEN 3000 AND 30000 THEN 0.6
        ELSE 0.3
      END,
      'accuracy_flow_zone',
      CASE 
        WHEN session_metrics.accuracy_rate BETWEEN 0.6 AND 0.8 THEN 0.9
        WHEN session_metrics.accuracy_rate BETWEEN 0.5 AND 0.9 THEN 0.7
        ELSE 0.4
      END,
      'question_engagement',
      LEAST(1.0, session_metrics.questions_total / 20.0) -- 20問程度が適切
    );
  ELSIF session_metrics.session_type = 'course' THEN
    flow_factors := jsonb_build_object(
      'content_engagement_depth',
      LEAST(1.0, session_metrics.content_interaction_count / 10.0),
      'completion_flow_zone',
      CASE 
        WHEN session_metrics.completion_rate BETWEEN 70 AND 90 THEN 0.9
        WHEN session_metrics.completion_rate BETWEEN 50 AND 100 THEN 0.7
        ELSE 0.4
      END,
      'sustained_attention',
      CASE 
        WHEN session_metrics.duration_seconds BETWEEN 900 AND 2700 THEN 0.8 -- 15-45分が適切
        WHEN session_metrics.duration_seconds BETWEEN 600 AND 3600 THEN 0.6
        ELSE 0.3
      END
    );
  END IF;
  
  RETURN QUERY
  SELECT 
    session_metrics.session_type,
    
    -- フロー指数の計算（学習タイプ別）
    CASE session_metrics.session_type
      WHEN 'quiz' THEN
        ((flow_factors->>'response_time_consistency')::DECIMAL * 0.3 +
         (flow_factors->>'accuracy_flow_zone')::DECIMAL * 0.4 +
         (flow_factors->>'question_engagement')::DECIMAL * 0.3)
      WHEN 'course' THEN
        ((flow_factors->>'content_engagement_depth')::DECIMAL * 0.3 +
         (flow_factors->>'completion_flow_zone')::DECIMAL * 0.4 +
         (flow_factors->>'sustained_attention')::DECIMAL * 0.3)
      ELSE 0.5
    END::DECIMAL(3,2) as flow_index,
    
    -- チャレンジレベル
    CASE session_metrics.difficulty_level
      WHEN 'basic' THEN 0.3
      WHEN 'intermediate' THEN 0.6  
      WHEN 'advanced' THEN 0.8
      WHEN 'expert' THEN 1.0
      ELSE 0.6
    END::DECIMAL(3,2) as challenge_level,
    
    -- スキルレベル
    CASE session_metrics.session_type
      WHEN 'quiz' THEN session_metrics.accuracy_rate
      WHEN 'course' THEN session_metrics.completion_rate / 100.0
      ELSE 0.5
    END::DECIMAL(3,2) as skill_level,
    
    -- エンゲージメントスコア
    (COALESCE(session_metrics.engagement_level, 5) / 10.0)::DECIMAL(3,2) as engagement_score,
    
    -- 学習タイプ特有のフロー要因
    flow_factors as type_specific_flow_factors,
    
    -- フロー状態向上の推奨
    CASE session_metrics.session_type
      WHEN 'quiz' THEN
        CASE 
          WHEN (flow_factors->>'accuracy_flow_zone')::DECIMAL < 0.5 THEN 
            '難易度調整でフロー状態を改善できます'
          WHEN (flow_factors->>'response_time_consistency')::DECIMAL < 0.5 THEN 
            '集中できる環境づくりをお勧めします'
          ELSE '良好なフロー状態です'
        END
      WHEN 'course' THEN
        CASE 
          WHEN (flow_factors->>'sustained_attention')::DECIMAL < 0.5 THEN 
            'セッション時間を調整してみてください'
          WHEN (flow_factors->>'content_engagement_depth')::DECIMAL < 0.5 THEN 
            'より興味のあるコンテンツから始めることをお勧めします'
          ELSE '良好なフロー状態です'
        END
      ELSE 'データを収集中です'
    END as flow_recommendation,
    
    -- 最適難易度調整値
    CASE session_metrics.session_type
      WHEN 'quiz' THEN
        CASE 
          WHEN session_metrics.accuracy_rate > 0.9 THEN 0.1  -- 難易度上げ
          WHEN session_metrics.accuracy_rate < 0.5 THEN -0.2 -- 難易度下げ
          ELSE 0.0
        END
      WHEN 'course' THEN
        CASE 
          WHEN session_metrics.completion_rate > 95 THEN 0.1
          WHEN session_metrics.completion_rate < 60 THEN -0.1
          ELSE 0.0
        END
      ELSE 0.0
    END::DECIMAL(3,2) as optimal_difficulty_adjustment;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 **TypeScript統合分析エンジン実装**

### **1. 統合学習分析エンジンクラス**

```typescript
// 統合学習分析エンジン
export class UnifiedLearningAnalysisEngine {
  private forgettingAnalyzer = new UnifiedForgettingCurveAnalyzer()
  private cognitiveAnalyzer = new UnifiedCognitiveLoadAnalyzer()
  private flowAnalyzer = new UnifiedFlowStateAnalyzer()
  
  // メイン分析機能
  async analyzeUnifiedLearningPattern(
    userId: string,
    timeRange?: { start: Date, end: Date }
  ): Promise<UnifiedLearningAnalysis> {
    const [
      quizPatterns,
      coursePatterns,
      integratedPatterns,
      crossModalityEffects
    ] = await Promise.allSettled([
      this.analyzeQuizLearningPatterns(userId, timeRange),
      this.analyzeCourseLearningPatterns(userId, timeRange),
      this.analyzeIntegratedLearningPatterns(userId, timeRange),
      this.analyzeCrossModalityEffects(userId)
    ])
    
    return {
      userId,
      analysisTimestamp: new Date().toISOString(),
      quizLearning: this.extractResult(quizPatterns),
      courseLearning: this.extractResult(coursePatterns),
      integratedInsights: this.extractResult(integratedPatterns),
      crossModalityEffects: this.extractResult(crossModalityEffects),
      personalizedRecommendations: await this.generateUnifiedRecommendations(userId),
      dataMaturity: await this.assessDataMaturity(userId)
    }
  }
  
  // クイズ学習パターン分析
  private async analyzeQuizLearningPatterns(
    userId: string,
    timeRange?: { start: Date, end: Date }
  ): Promise<QuizLearningPattern> {
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('session_type', 'quiz')
      .gte('session_start_time', timeRange?.start?.toISOString() || '1900-01-01')
      .lte('session_start_time', timeRange?.end?.toISOString() || '2100-01-01')
      .order('session_start_time')
    
    if (!data || data.length === 0) {
      return this.getDefaultQuizPattern()
    }
    
    return {
      averageAccuracy: this.calculateAverageAccuracy(data),
      responseTimePattern: this.analyzeResponseTimePattern(data),
      difficultyProgression: this.analyzeDifficultyProgression(data),
      timeOfDayEffectiveness: this.analyzeTimeOfDayEffectiveness(data),
      retentionCurve: await this.calculateQuizRetentionCurve(userId),
      consistencyScore: this.calculateConsistencyScore(data),
      learningVelocity: this.calculateLearningVelocity(data)
    }
  }
  
  // コース学習パターン分析
  private async analyzeCourseLearningPatterns(
    userId: string,
    timeRange?: { start: Date, end: Date }
  ): Promise<CourseLearningPattern> {
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('session_type', 'course')
      .gte('session_start_time', timeRange?.start?.toISOString() || '1900-01-01')
      .lte('session_start_time', timeRange?.end?.toISOString() || '2100-01-01')
      .order('session_start_time')
    
    if (!data || data.length === 0) {
      return this.getDefaultCoursePattern()
    }
    
    return {
      averageCompletionRate: this.calculateAverageCompletionRate(data),
      engagementLevel: this.analyzeCourseEngagement(data),
      contentTypePreference: await this.analyzeCourseContentPreference(userId),
      learningDepth: this.assessLearningDepth(data),
      knowledgeRetention: await this.calculateCourseRetention(userId),
      sessionDurationOptimization: this.analyzeOptimalSessionDuration(data),
      conceptualUnderstanding: this.assessConceptualUnderstanding(data)
    }
  }
  
  // 統合学習パターン分析
  private async analyzeIntegratedLearningPatterns(
    userId: string,
    timeRange?: { start: Date, end: Date }
  ): Promise<IntegratedLearningPattern> {
    // クイズとコースの全体的な学習パターンを分析
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('session_start_time', timeRange?.start?.toISOString() || '1900-01-01')
      .lte('session_start_time', timeRange?.end?.toISOString() || '2100-01-01')
      .order('session_start_time')
    
    if (!data || data.length === 0) {
      return this.getDefaultIntegratedPattern()
    }
    
    return {
      overallLearningEfficiency: this.calculateOverallEfficiency(data),
      optimalLearningSequence: this.determineOptimalSequence(data),
      balanceScore: this.calculateLearningBalance(data),
      timeAllocationOptimization: this.analyzeTimeAllocation(data),
      crossModalLearningEffect: this.analyzeCrossModalEffect(data),
      progressConsistency: this.analyzeProgressConsistency(data),
      adaptationRate: this.calculateAdaptationRate(data)
    }
  }
  
  // クロスモダリティ効果分析
  private async analyzeCrossModalityEffects(userId: string): Promise<CrossModalityEffects> {
    const { data, error } = await supabase.rpc('analyze_cross_modality_effects', {
      p_user_id: userId
    })
    
    if (error || !data || data.length === 0) {
      return this.getDefaultCrossModalityEffects()
    }
    
    const effectData = data[0]
    
    return {
      quizToCourseTranfer: effectData.quiz_to_course_improvement || 0.5,
      courseToQuizTransfer: effectData.course_to_quiz_improvement || 0.7,
      optimalLearningSequence: this.determineOptimalSequence(effectData),
      synergyScore: effectData.synergy_score || 0.5,
      recommendedMixRatio: {
        quiz: effectData.recommended_quiz_ratio || 0.6,
        course: effectData.recommended_course_ratio || 0.4
      },
      transferEfficiencyMatrix: this.buildTransferMatrix(effectData),
      sequenceOptimizationPotential: effectData.sequence_optimization_potential || 0.3
    }
  }
  
  // 統合推奨生成
  private async generateUnifiedRecommendations(userId: string): Promise<UnifiedRecommendation[]> {
    const recommendations: UnifiedRecommendation[] = []
    
    // 忘却曲線ベースの復習推奨
    const overdueReviews = await this.getOverdueUnifiedReviews(userId)
    if (overdueReviews.length > 0) {
      recommendations.push({
        type: 'unified_review_recommendation',
        priority: 'high',
        title: '復習時期が来ています',
        description: `${overdueReviews.length}つの項目の復習をお勧めします`,
        actionItems: overdueReviews.map(review => ({
          action: 'review',
          learningType: review.learningSource,
          target: review.contentId,
          estimatedTime: this.estimateReviewTime(review),
          expectedBenefit: this.calculateReviewBenefit(review)
        })),
        expectedOutcome: '知識定着率が25-40%向上します'
      })
    }
    
    // 学習バランス最適化推奨
    const balanceAnalysis = await this.analyzeLearningBalance(userId)
    if (balanceAnalysis.imbalanceDetected) {
      recommendations.push({
        type: 'learning_balance_optimization',
        priority: 'medium',
        title: '学習バランスの調整をお勧めします',
        description: balanceAnalysis.recommendation,
        actionItems: balanceAnalysis.suggestedActions,
        expectedOutcome: '学習効率が15-25%向上します'
      })
    }
    
    // フロー状態最適化推奨
    const flowOptimization = await this.generateFlowOptimizationRecommendations(userId)
    recommendations.push(...flowOptimization)
    
    return recommendations
  }
  
  // データ成熟度評価
  private async assessDataMaturity(userId: string): Promise<DataMaturityAssessment> {
    const { data } = await supabase.rpc('analyze_unified_data_maturity', {
      p_user_id: userId
    })
    
    const maturityData = data?.[0] || {}
    
    return {
      overallStage: this.determineMaturityStage(maturityData),
      quizDataPoints: maturityData.quiz_data_points || 0,
      courseDataPoints: maturityData.course_data_points || 0,
      totalDataPoints: maturityData.total_data_points || 0,
      analysisReliability: maturityData.analysis_reliability || 0.1,
      nextMilestone: this.calculateNextMilestone(maturityData),
      estimatedDaysToNextStage: maturityData.days_to_next_stage || 30,
      dataQualityScore: maturityData.data_quality_score || 0.3
    }
  }
  
  // ヘルパーメソッド群
  private extractResult<T>(settledResult: PromiseSettledResult<T>): T | null {
    return settledResult.status === 'fulfilled' ? settledResult.value : null
  }
  
  private calculateAverageAccuracy(data: any[]): number {
    const accuracySum = data.reduce((sum, session) => sum + (session.accuracy_rate || 0), 0)
    return data.length > 0 ? accuracySum / data.length : 0
  }
  
  private calculateAverageCompletionRate(data: any[]): number {
    const completionSum = data.reduce((sum, session) => sum + (session.completion_rate || 0), 0)
    return data.length > 0 ? completionSum / data.length : 0
  }
  
  private analyzeTimeOfDayEffectiveness(data: any[]): TimeEffectivenessMetrics {
    const hourlyPerformance: { [hour: number]: number[] } = {}
    
    data.forEach(session => {
      const hour = session.hour_of_day
      const performance = session.session_type === 'quiz' 
        ? session.accuracy_rate 
        : session.completion_rate / 100
      
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = []
      }
      hourlyPerformance[hour].push(performance)
    })
    
    const optimalHours = Object.entries(hourlyPerformance)
      .map(([hour, performances]) => ({
        hour: parseInt(hour),
        averagePerformance: performances.reduce((a, b) => a + b, 0) / performances.length,
        sessionCount: performances.length
      }))
      .filter(h => h.sessionCount >= 3) // 十分なデータがある時間帯のみ
      .sort((a, b) => b.averagePerformance - a.averagePerformance)
      .slice(0, 3)
      .map(h => h.hour)
    
    return {
      optimalHours,
      hourlyPerformanceMap: hourlyPerformance,
      timeEfficiencyScore: this.calculateTimeEfficiencyScore(hourlyPerformance)
    }
  }
  
  // デフォルト値生成メソッド群
  private getDefaultQuizPattern(): QuizLearningPattern {
    return {
      averageAccuracy: 0.6,
      responseTimePattern: { average: 15000, consistency: 0.5 },
      difficultyProgression: { currentLevel: 'intermediate', progressionRate: 0.1 },
      timeOfDayEffectiveness: { optimalHours: [9, 14, 19], timeEfficiencyScore: 0.5 },
      retentionCurve: { forgettingRate: -0.05, retentionStrength: 0.7 },
      consistencyScore: 0.5,
      learningVelocity: 0.5
    }
  }
  
  private getDefaultCoursePattern(): CourseLearningPattern {
    return {
      averageCompletionRate: 0.7,
      engagementLevel: { average: 6, consistency: 0.6 },
      contentTypePreference: { preferredTypes: ['text', 'video'], preferences: {} },
      learningDepth: { comprehensionScore: 0.6, retentionScore: 0.7 },
      knowledgeRetention: { retentionRate: 0.8, decayRate: -0.03 },
      sessionDurationOptimization: { optimalDuration: 1800, efficiency: 0.6 },
      conceptualUnderstanding: { understandingScore: 0.6, applicationScore: 0.5 }
    }
  }
  
  private getDefaultIntegratedPattern(): IntegratedLearningPattern {
    return {
      overallLearningEfficiency: 0.6,
      optimalLearningSequence: 'mixed',
      balanceScore: 0.5,
      timeAllocationOptimization: { optimalQuizTime: 0.6, optimalCourseTime: 0.4 },
      crossModalLearningEffect: 0.5,
      progressConsistency: 0.5,
      adaptationRate: 0.5
    }
  }
  
  private getDefaultCrossModalityEffects(): CrossModalityEffects {
    return {
      quizToCourseTranfer: 0.5,
      courseToQuizTransfer: 0.7,
      optimalLearningSequence: 'mixed',
      synergyScore: 0.5,
      recommendedMixRatio: { quiz: 0.6, course: 0.4 },
      transferEfficiencyMatrix: {},
      sequenceOptimizationPotential: 0.3
    }
  }
}

// 型定義
interface UnifiedLearningAnalysis {
  userId: string
  analysisTimestamp: string
  quizLearning: QuizLearningPattern | null
  courseLearning: CourseLearningPattern | null
  integratedInsights: IntegratedLearningPattern | null
  crossModalityEffects: CrossModalityEffects | null
  personalizedRecommendations: UnifiedRecommendation[]
  dataMaturity: DataMaturityAssessment
}

interface QuizLearningPattern {
  averageAccuracy: number
  responseTimePattern: ResponseTimeMetrics
  difficultyProgression: DifficultyMetrics
  timeOfDayEffectiveness: TimeEffectivenessMetrics
  retentionCurve: RetentionCurveMetrics
  consistencyScore: number
  learningVelocity: number
}

interface CourseLearningPattern {
  averageCompletionRate: number
  engagementLevel: EngagementMetrics
  contentTypePreference: ContentPreferenceMetrics
  learningDepth: LearningDepthMetrics
  knowledgeRetention: KnowledgeRetentionMetrics
  sessionDurationOptimization: SessionDurationMetrics
  conceptualUnderstanding: ConceptualUnderstandingMetrics
}

interface IntegratedLearningPattern {
  overallLearningEfficiency: number
  optimalLearningSequence: 'quiz_first' | 'course_first' | 'mixed'
  balanceScore: number
  timeAllocationOptimization: TimeAllocationMetrics
  crossModalLearningEffect: number
  progressConsistency: number
  adaptationRate: number
}

interface CrossModalityEffects {
  quizToCourseTranfer: number
  courseToQuizTransfer: number
  optimalLearningSequence: 'quiz_first' | 'course_first' | 'mixed'
  synergyScore: number
  recommendedMixRatio: { quiz: number, course: number }
  transferEfficiencyMatrix: Record<string, any>
  sequenceOptimizationPotential: number
}

interface UnifiedRecommendation {
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: RecommendationAction[]
  expectedOutcome: string
}

interface RecommendationAction {
  action: string
  learningType?: 'quiz' | 'course' | 'mixed'
  target: string
  estimatedTime?: number
  expectedBenefit?: string
}

interface DataMaturityAssessment {
  overallStage: 'initial' | 'developing' | 'established' | 'mature'
  quizDataPoints: number
  courseDataPoints: number
  totalDataPoints: number
  analysisReliability: number
  nextMilestone: string
  estimatedDaysToNextStage: number
  dataQualityScore: number
}
```

---

## 🎨 **統合段階的フィードバックUI設計**

### **1. 統合学習分析ダッシュボード**

```typescript
// 統合学習分析メインコンポーネント
export const UnifiedLearningAnalyticsDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [analysisData, setAnalysisData] = useState<UnifiedLearningAnalysis>()
  const [activeView, setActiveView] = useState<'overview' | 'quiz' | 'course' | 'integrated'>('overview')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadUnifiedAnalysis()
  }, [userId])
  
  const loadUnifiedAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/unified-analysis?userId=${userId}`)
      const data = await response.json()
      setAnalysisData(data)
    } catch (error) {
      console.error('Failed to load unified analysis:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return <UnifiedAnalysisLoadingState />
  }
  
  return (
    <div className="space-y-6">
      {/* データ成熟度に基づくメインメッセージ */}
      <DataMaturityHeader 
        maturityStage={analysisData?.dataMaturity.overallStage}
        totalDataPoints={analysisData?.dataMaturity.totalDataPoints}
        reliability={analysisData?.dataMaturity.analysisReliability}
      />
      
      {/* 学習タイプ切り替えタブ */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <TabButton 
            active={activeView === 'overview'} 
            onClick={() => setActiveView('overview')}
            icon="📊"
            label="総合概要"
          />
          <TabButton 
            active={activeView === 'quiz'} 
            onClick={() => setActiveView('quiz')}
            icon="🧠"
            label="クイズ分析"
            dataPoints={analysisData?.dataMaturity.quizDataPoints}
          />
          <TabButton 
            active={activeView === 'course'} 
            onClick={() => setActiveView('course')}
            icon="📚"
            label="コース分析"
            dataPoints={analysisData?.dataMaturity.courseDataPoints}
          />
          <TabButton 
            active={activeView === 'integrated'} 
            onClick={() => setActiveView('integrated')}
            icon="🔗"
            label="統合分析"
            available={analysisData?.dataMaturity.overallStage !== 'initial'}
          />
        </nav>
      </div>
      
      {/* ビュー別コンテンツ */}
      <div className="min-h-96">
        {activeView === 'overview' && (
          <OverviewAnalysisView 
            analysisData={analysisData}
            onViewChange={setActiveView}
          />
        )}
        
        {activeView === 'quiz' && (
          <QuizAnalysisView 
            quizPattern={analysisData?.quizLearning}
            recommendations={analysisData?.personalizedRecommendations?.filter(r => 
              r.actionItems.some(a => a.learningType === 'quiz')
            )}
            maturityStage={analysisData?.dataMaturity.overallStage}
          />
        )}
        
        {activeView === 'course' && (
          <CourseAnalysisView 
            coursePattern={analysisData?.courseLearning}
            recommendations={analysisData?.personalizedRecommendations?.filter(r => 
              r.actionItems.some(a => a.learningType === 'course')
            )}
            maturityStage={analysisData?.dataMaturity.overallStage}
          />
        )}
        
        {activeView === 'integrated' && (
          <IntegratedAnalysisView 
            integratedPattern={analysisData?.integratedInsights}
            crossModalityEffects={analysisData?.crossModalityEffects}
            recommendations={analysisData?.personalizedRecommendations?.filter(r => 
              r.type.includes('unified') || r.type.includes('integrated')
            )}
          />
        )}
      </div>
      
      {/* 統合推奨アクション */}
      <UnifiedRecommendationsSection 
        recommendations={analysisData?.personalizedRecommendations}
        onActionTaken={loadUnifiedAnalysis}
      />
    </div>
  )
}

// データ成熟度ヘッダーコンポーネント
const DataMaturityHeader: React.FC<{
  maturityStage?: 'initial' | 'developing' | 'established' | 'mature'
  totalDataPoints?: number
  reliability?: number
}> = ({ maturityStage, totalDataPoints, reliability }) => {
  const getStageConfig = (stage: string) => {
    switch (stage) {
      case 'initial':
        return {
          icon: '🌱',
          title: 'あなたの学習DNAを解析中...',
          subtitle: 'クイズとコース学習の基本パターンを発見しています',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900'
        }
      case 'developing':
        return {
          icon: '📈',
          title: '学習パターンが見えてきました！',
          subtitle: 'クイズとコースの相互効果を分析中です',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-900'
        }
      case 'established':
        return {
          icon: '🎯',
          title: 'パーソナライズ分析が利用可能です',
          subtitle: '統合学習推奨をお届けします',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-900'
        }
      case 'mature':
        return {
          icon: '🚀',
          title: '完全パーソナライズモード',
          subtitle: '高精度な統合学習最適化をご利用いただけます',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-900'
        }
      default:
        return {
          icon: '📊',
          title: 'データを分析中...',
          subtitle: 'しばらくお待ちください',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-900'
        }
    }
  }
  
  const config = getStageConfig(maturityStage || 'initial')
  
  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{config.icon}</div>
            <div>
              <h2 className={`text-xl font-bold ${config.textColor}`}>
                {config.title}
              </h2>
              <p className={`${config.textColor} opacity-80`}>
                {config.subtitle}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span>データ点数: {totalDataPoints || 0}</span>
                <span>信頼度: {Math.round((reliability || 0) * 100)}%</span>
              </div>
            </div>
          </div>
          
          {maturityStage !== 'mature' && (
            <DataMaturityProgress 
              currentStage={maturityStage}
              dataPoints={totalDataPoints || 0}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 概要ビューコンポーネント
const OverviewAnalysisView: React.FC<{
  analysisData?: UnifiedLearningAnalysis
  onViewChange: (view: string) => void
}> = ({ analysisData, onViewChange }) => {
  if (!analysisData) {
    return <div>データを読み込み中...</div>
  }
  
  return (
    <div className="space-y-6">
      {/* 学習タイプ別サマリー */}
      <div className="grid grid-cols-2 gap-6">
        <LearningTypeSummaryCard
          type="quiz"
          title="クイズ学習"
          icon="🧠"
          metrics={{
            primaryMetric: {
              label: '平均正答率',
              value: `${Math.round((analysisData.quizLearning?.averageAccuracy || 0) * 100)}%`,
              trend: 'stable'
            },
            secondaryMetrics: [
              { label: 'セッション数', value: analysisData.dataMaturity.quizDataPoints },
              { label: '一貫性', value: `${Math.round((analysisData.quizLearning?.consistencyScore || 0) * 100)}%` }
            ]
          }}
          onViewDetails={() => onViewChange('quiz')}
        />
        
        <LearningTypeSummaryCard
          type="course"
          title="コース学習"
          icon="📚"
          metrics={{
            primaryMetric: {
              label: '平均完了率',
              value: `${Math.round(analysisData.courseLearning?.averageCompletionRate || 0)}%`,
              trend: 'improving'
            },
            secondaryMetrics: [
              { label: 'セッション数', value: analysisData.dataMaturity.courseDataPoints },
              { label: 'エンゲージメント', value: `${Math.round((analysisData.courseLearning?.engagementLevel.average || 6) / 10 * 100)}%` }
            ]
          }}
          onViewDetails={() => onViewChange('course')}
        />
      </div>
      
      {/* 統合インサイト */}
      {analysisData.dataMaturity.overallStage !== 'initial' && (
        <IntegratedInsightsCard
          crossModalityEffects={analysisData.crossModalityEffects}
          integratedPattern={analysisData.integratedInsights}
          onViewDetails={() => onViewChange('integrated')}
        />
      )}
      
      {/* 時間最適化チャート */}
      <TimeOptimizationChart
        quizTimeEffectiveness={analysisData.quizLearning?.timeOfDayEffectiveness}
        courseTimeEffectiveness={analysisData.courseLearning?.timeOfDayEffectiveness}
      />
    </div>
  )
}
```

---

## 🚀 **実装優先順位・スケジュール**

### **Week 1-2: データベース基盤構築**
1. 統合学習セッション分析テーブル作成
2. 個人学習プロファイルテーブル作成  
3. 統合復習スケジュールテーブル作成
4. PostgreSQL分析関数実装（統合忘却曲線）

### **Week 3-4: 分析エンジン実装**
1. 統合認知負荷分析PostgreSQL関数
2. 統合フロー状態分析PostgreSQL関数
3. TypeScript統合学習分析エンジン実装
4. クロスモダリティ効果分析実装

### **Week 5-6: UI/UX実装**
1. 統合段階的フィードバックUI実装
2. 学習タイプ別分析ビュー実装
3. 統合推奨アクションコンポーネント
4. レスポンシブ対応・アクセシビリティ

### **Week 7-8: API・統合・テスト**
1. 統合分析APIエンドポイント実装
2. リアルタイム分析機能実装
3. パフォーマンス最適化
4. 統合テスト・ユーザーテスト

---

**このクイズ+コース統合設計により、学習者の全学習活動を包括的に分析し、真に価値のある個人最適化を実現できます。**

---

**最終更新**: 2025年10月1日  
**ステータス**: 統合設計完成、実装準備完了