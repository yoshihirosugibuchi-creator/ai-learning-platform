-- quiz_hintsテーブル作成
-- ヒント・復習システム用：各クイズ問題に対する3段階ヒント格納

CREATE TABLE IF NOT EXISTS public.quiz_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id INTEGER NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  level1_hint TEXT,
  level2_hint TEXT, 
  level3_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  
  -- 制約: 1つの問題に対して1つのヒントレコードのみ
  UNIQUE(question_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quiz_hints_question_id 
  ON public.quiz_hints(question_id);

-- RLS (Row Level Security) 設定
ALTER TABLE public.quiz_hints ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 認証済みユーザーは読み取り可能
CREATE POLICY "quiz_hints_select_policy" ON public.quiz_hints
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS ポリシー: admin以上のユーザーのみ作成・更新・削除可能
CREATE POLICY "quiz_hints_admin_policy" ON public.quiz_hints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_quiz_hints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_hints_updated_at_trigger
  BEFORE UPDATE ON public.quiz_hints
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_hints_updated_at();

-- テーブルコメント
COMMENT ON TABLE public.quiz_hints IS 'クイズ問題別ヒント情報（3段階レベル）';
COMMENT ON COLUMN public.quiz_hints.question_id IS '対象クイズ問題ID';
COMMENT ON COLUMN public.quiz_hints.level1_hint IS 'レベル1ヒント（アプローチ・分野ヒント、XP-5%）';
COMMENT ON COLUMN public.quiz_hints.level2_hint IS 'レベル2ヒント（選択肢絞り込み、XP-15%）';
COMMENT ON COLUMN public.quiz_hints.level3_hint IS 'レベル3ヒント（正解に近い具体的ヒント、XP-30%）';
COMMENT ON COLUMN public.quiz_hints.created_by IS 'ヒント作成者（管理者）';
COMMENT ON COLUMN public.quiz_hints.updated_by IS 'ヒント更新者（管理者）';