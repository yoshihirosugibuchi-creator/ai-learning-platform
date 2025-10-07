-- 学習分析システム用テーブル群
-- 作成日: 2025-10-06
-- 目的: 「張りぼて」実装から実データ活用型分析システムへの移行

-- 1. 学習分析サマリーテーブル（パフォーマンス最適化）
CREATE TABLE IF NOT EXISTS public.learning_analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    
    -- 基本統計
    total_study_time_minutes INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    average_session_duration DECIMAL(5,2) NOT NULL DEFAULT 0,
    learning_streak_days INTEGER NOT NULL DEFAULT 0,
    
    -- 習熟度統計
    overall_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
    quiz_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
    course_completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- XP統計
    total_xp INTEGER NOT NULL DEFAULT 0,
    xp_growth_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    
    -- JSON統計データ
    category_breakdown JSONB DEFAULT '{}',           -- カテゴリー別詳細統計
    time_pattern_analysis JSONB DEFAULT '{}',        -- 時間帯別学習パターン
    weakness_analysis JSONB DEFAULT '{}',            -- 弱点分析結果
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, calculation_date)
);

-- 2. 学習レコメンデーションテーブル
CREATE TABLE IF NOT EXISTS public.learning_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    recommendation_type VARCHAR(50) NOT NULL, -- 'immediate', 'weakness_fix', 'next_level', 'review_completed'
    priority INTEGER NOT NULL DEFAULT 1,      -- 1=highest, 5=lowest
    
    -- レコメンデーション内容
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommended_content_type VARCHAR(20) NOT NULL, -- 'course', 'quiz', 'theme'
    recommended_content_id TEXT NOT NULL,
    
    -- 根拠データ
    reasoning TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0, -- 0.00-1.00
    expected_improvement JSONB DEFAULT '{}',           -- 期待される改善効果
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'active',    -- 'active', 'completed', 'dismissed'
    presented_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- 3. 学習効果測定・A/Bテスト用テーブル
CREATE TABLE IF NOT EXISTS public.learning_effectiveness_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    intervention_type VARCHAR(50) NOT NULL,  -- 'recommendation_followed', 'difficulty_adjusted'
    intervention_data JSONB NOT NULL DEFAULT '{}',
    
    -- 効果測定
    before_metrics JSONB NOT NULL DEFAULT '{}',          -- 介入前のメトリクス
    after_metrics JSONB DEFAULT '{}',                    -- 介入後のメトリクス (nullable)
    improvement_score DECIMAL(5,2) DEFAULT 0,            -- 改善スコア
    
    measurement_period_days INTEGER DEFAULT 7,
    
    intervention_at TIMESTAMP WITH TIME ZONE NOT NULL,
    measurement_completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 既存テーブル拡張: quiz_answersテーブル
-- 学習分析用カラム追加
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS 
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5);
    
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS
    hint_used BOOLEAN NOT NULL DEFAULT false;
    
ALTER TABLE public.quiz_answers ADD COLUMN IF NOT EXISTS
    review_needed BOOLEAN NOT NULL DEFAULT false;

-- 5. 既存テーブル拡張: daily_xp_recordsテーブル
-- 詳細学習活動記録用カラム追加
ALTER TABLE public.daily_xp_records ADD COLUMN IF NOT EXISTS
    study_time_minutes INTEGER NOT NULL DEFAULT 0;
    
ALTER TABLE public.daily_xp_records ADD COLUMN IF NOT EXISTS
    peak_study_hour INTEGER CHECK (peak_study_hour BETWEEN 0 AND 23);
    
ALTER TABLE public.daily_xp_records ADD COLUMN IF NOT EXISTS
    learning_quality_score DECIMAL(3,2) DEFAULT 0; -- 0.00-1.00

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_learning_analytics_summary_user_date 
    ON public.learning_analytics_summary(user_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_summary_date 
    ON public.learning_analytics_summary(calculation_date);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_summary_user_updated 
    ON public.learning_analytics_summary(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_learning_recommendations_user_status 
    ON public.learning_recommendations(user_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_type 
    ON public.learning_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_expires 
    ON public.learning_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_learning_effectiveness_user_type 
    ON public.learning_effectiveness_tracking(user_id, intervention_type);
CREATE INDEX IF NOT EXISTS idx_learning_effectiveness_intervention_at 
    ON public.learning_effectiveness_tracking(intervention_at);

-- quiz_answers用の追加インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_answers_confidence 
    ON public.quiz_answers(confidence_level) WHERE confidence_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_needed 
    ON public.quiz_answers(review_needed) WHERE review_needed = true;
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_confidence 
    ON public.quiz_answers(quiz_session_id, confidence_level) WHERE confidence_level IS NOT NULL;

-- daily_xp_records用の追加インデックス
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_user_date 
    ON public.daily_xp_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_study_time 
    ON public.daily_xp_records(study_time_minutes);

-- RLS (Row Level Security) 設定
ALTER TABLE public.learning_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_effectiveness_tracking ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "learning_analytics_summary_user_policy" ON public.learning_analytics_summary
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "learning_recommendations_user_policy" ON public.learning_recommendations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "learning_effectiveness_tracking_user_policy" ON public.learning_effectiveness_tracking
    FOR ALL USING (auth.uid() = user_id);

-- Updated_at 自動更新トリガー
CREATE TRIGGER update_learning_analytics_summary_updated_at 
    BEFORE UPDATE ON public.learning_analytics_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- コメント追加
COMMENT ON TABLE public.learning_analytics_summary IS '日次学習分析サマリー（パフォーマンス最適化用）';
COMMENT ON COLUMN public.learning_analytics_summary.category_breakdown IS 'カテゴリー別詳細統計 (JSON)';
COMMENT ON COLUMN public.learning_analytics_summary.time_pattern_analysis IS '時間帯別学習パターン分析 (JSON)';
COMMENT ON COLUMN public.learning_analytics_summary.weakness_analysis IS '弱点分析結果 (JSON)';

COMMENT ON TABLE public.learning_recommendations IS '学習レコメンデーション記録・履歴';
COMMENT ON COLUMN public.learning_recommendations.confidence_score IS 'レコメンデーション信頼度 (0.00-1.00)';
COMMENT ON COLUMN public.learning_recommendations.expected_improvement IS '期待される改善効果 (JSON)';

COMMENT ON TABLE public.learning_effectiveness_tracking IS '学習効果測定・A/Bテスト用データ';
COMMENT ON COLUMN public.learning_effectiveness_tracking.before_metrics IS '介入前メトリクス (JSON)';
COMMENT ON COLUMN public.learning_effectiveness_tracking.after_metrics IS '介入後メトリクス (JSON)';

COMMENT ON COLUMN public.quiz_answers.confidence_level IS '回答時の自信レベル (1-5)';
COMMENT ON COLUMN public.quiz_answers.hint_used IS 'ヒント使用フラグ';
COMMENT ON COLUMN public.quiz_answers.review_needed IS '復習必要フラグ';

COMMENT ON COLUMN public.daily_xp_records.study_time_minutes IS '学習時間（分）';
COMMENT ON COLUMN public.daily_xp_records.peak_study_hour IS '最も集中した学習時間帯';
COMMENT ON COLUMN public.daily_xp_records.learning_quality_score IS '学習品質スコア (0.00-1.00)';

-- 成功メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Learning analytics tables created successfully:';
  RAISE NOTICE '- learning_analytics_summary: % records', 
    (SELECT COUNT(*) FROM public.learning_analytics_summary);
  RAISE NOTICE '- learning_recommendations: % records', 
    (SELECT COUNT(*) FROM public.learning_recommendations);
  RAISE NOTICE '- learning_effectiveness_tracking: % records', 
    (SELECT COUNT(*) FROM public.learning_effectiveness_tracking);
END $$;