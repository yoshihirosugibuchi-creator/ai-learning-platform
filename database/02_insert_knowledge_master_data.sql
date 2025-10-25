-- ===============================================
-- ナレッジカードマスタデータ投入スクリプト
-- 実行方法: 01_create_knowledge_tables.sql 実行後にこのスクリプトを実行
-- ===============================================

INSERT INTO knowledge_cards (theme_id, title, summary, key_points, icon, color, category, difficulty, display_order, reward_xp) VALUES

('so_what_why_so', 'So What?/Why So?', 
 '情報の本質を見抜き、deeper insightを得るための質問技術',
 '["So What? - それで何が言えるのか？", "Why So? - なぜそうなるのか？", "論理の飛躍を防ぐ検証プロセス"]'::jsonb,
 '❓', '#F59E0B', '論理的思考・分析', 'intermediate', 10, 50),

('conclusion_first', '結論ファースト', 
 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
 '["PREP法（Point・Reason・Example・Point）の活用", "聞き手の理解負荷を軽減", "説得力のあるプレゼンテーション"]'::jsonb,
 '🎯', '#3B82F6', '論理的思考・分析', 'basic', 20, 30),

('mece_thinking', 'MECE思考', 
 '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
 '["Mutually Exclusive（重複なく）", "Collectively Exhaustive（漏れなく）", "問題の全体像把握と優先順位付け"]'::jsonb,
 '📊', '#10B981', '論理的思考・分析', 'basic', 30, 30),

('logical_tree', 'ロジックツリー', 
 '問題を階層的に分解し、根本原因を特定する構造化思考ツール',
 '["イシューツリーとソリューションツリーの使い分け", "Why型とHow型の論理展開", "原因分析と対策立案の体系化"]'::jsonb,
 '🌳', '#8B5CF6', '論理的思考・分析', 'intermediate', 40, 40),

('market_analysis', '3C分析', 
 '市場分析の基本フレームワークで競合優位性を見つける手法',
 '["Customer（市場・顧客）", "Competitor（競合）", "Company（自社）", "戦略的ポジショニング"]'::jsonb,
 '📈', '#EC4899', '戦略・分析', 'intermediate', 50, 40),

('ai_basic_concepts', 'AI基本概念', 
 'ビジネスで活用するAIの基本知識と実践ポイント',
 '["機械学習とディープラーニング", "ビジネス適用の考え方", "AI導入の成功要因"]'::jsonb,
 '🤖', '#6366F1', 'AI・デジタル活用', 'basic', 60, 35),

('hypothesis_thinking', '仮説思考', 
 '限られた情報から仮説を立て、効率的に検証を進める思考法',
 '["仮説の立て方", "検証方法の設計", "PDCAサイクルでの改善"]'::jsonb,
 '💡', '#F97316', '論理的思考・分析', 'intermediate', 70, 45),

('framework_thinking', 'フレームワーク思考',
'既存の思考の枠組みを活用して問題解決を効率化する手法',
 '["代表的なビジネスフレームワーク", "適切なフレームワークの選択", "フレームワークの組み合わせ"]'::jsonb,
 '🏗️', '#84CC16', '論理的思考・分析', 'basic', 80, 35),

('design_thinking', 'デザイン思考', 
 'ユーザー中心の視点で創造的に問題解決を行う思考プロセス',
 '["共感・定義・発想・プロトタイプ・テスト", "ユーザー中心設計", "クリエイティブな問題解決"]'::jsonb,
 '🎨', '#8B5CF6', '創造的思考', 'intermediate', 90, 45),

('critical_thinking', '批判的思考', 
 '情報を客観的に分析し、論理的な判断を行う思考技術',
 '["論理的思考vs批判的思考", "バイアスの認識と回避", "情報の信頼性評価"]'::jsonb,
 '🔍', '#EF4444', '論理的思考・分析', 'advanced', 100, 50),

('expert_consulting', '経営コンサルティング手法', 
 'C-level向けの戦略コンサルティングで使用される高度な分析・提案技術',
 '["複合的な経営課題の構造化", "ステークホルダー分析とコンフリクト解決", "実行可能性を考慮した変革ロードマップ"]'::jsonb,
 '🎯', '#7C2D12', '戦略・分析', 'expert', 110, 100)

ON CONFLICT (theme_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  key_points = EXCLUDED.key_points,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  display_order = EXCLUDED.display_order,
  reward_xp = EXCLUDED.reward_xp,
  updated_at = NOW();

-- 確認クエリ
SELECT 'マスタデータ投入完了' as status, COUNT(*) as inserted_cards FROM knowledge_cards;