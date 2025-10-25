-- ===============================================
-- ナレッジカードマスタデータ正規化
-- learning_themesテーブルとの整合性確保
-- ===============================================

-- 1. 不要なテストカードを削除
DELETE FROM knowledge_cards WHERE theme_id IN (
  'critical_thinking',
  'design_thinking', 
  'expert_consulting',
  'framework_thinking',
  'hypothesis_thinking',
  'logical_tree',
  'market_analysis'
);

-- 2. 既存カードのtheme_id修正 (market_analysis → 3c_analysis)
-- UPDATE knowledge_cards SET theme_id = '3c_analysis' WHERE theme_id = 'market_analysis';

-- 3. 不足している実際のテーマに対応するカードを追加
INSERT INTO knowledge_cards (theme_id, title, summary, key_points, icon, color, category, difficulty, display_order, reward_xp, is_active) VALUES

-- 3C分析 (既存のmarket_analysisを更新)
('3c_analysis', '3C分析', 'Customer・Competitor・Companyの3視点による環境分析', 
 '["Customer（市場・顧客分析）", "Competitor（競合分析）", "Company（自社分析）", "戦略的ポジショニングの特定"]'::jsonb, 
 '📊', '#EC4899', 'フレームワーク活用', 'intermediate', 10, 40, true),

-- AI関連テーマ
('ai_performance_evaluation', 'AI成果評価と改善', 'AI導入効果の測定と継続的改善プロセス',
 '["KPI設定と効果測定", "ROI（投資対効果）の評価", "継続的改善プロセス", "リスク管理と品質保証"]'::jsonb,
 '📈', '#6366F1', 'AI・デジタル活用', 'advanced', 60, 50, true),

('ai_workflow_integration', 'AI活用ワークフロー設計', '既存業務へのAI統合と効率化実現',
 '["業務プロセス分析", "AI統合ポイントの特定", "ワークフロー最適化", "変更管理とユーザー採用"]'::jsonb,
 '🔄', '#8B5CF6', 'AI・デジタル活用', 'advanced', 50, 45, true),

('prompt_basics', 'プロンプトの基本', '効果的なプロンプト作成の基礎技術',
 '["明確な指示の書き方", "コンテキスト設定", "出力形式の指定", "反復改善プロセス"]'::jsonb,
 '💬', '#10B981', 'AI・デジタル活用', 'basic', 70, 35, true),

-- マーケティング関連テーマ  
('content_marketing', 'コンテンツマーケティング', '価値あるコンテンツで顧客との関係性を構築',
 '["ターゲットオーディエンス分析", "コンテンツ戦略立案", "配信チャネル最適化", "エンゲージメント測定"]'::jsonb,
 '📝', '#F59E0B', 'マーケティング', 'intermediate', 20, 40, true),

('customer_journey_mapping', 'カスタマージャーニーマップ', '顧客の行動と感情を可視化し、タッチポイントを最適化',
 '["顧客行動の可視化", "タッチポイント分析", "感情と体験の把握", "改善施策の特定"]'::jsonb,
 '🗺️', '#3B82F6', 'マーケティング', 'intermediate', 30, 40, true),

('market_segmentation', '市場セグメンテーション', '効果的なターゲット選定と市場細分化戦略',
 '["セグメンテーション軸の設定", "ターゲット市場の評価", "ポジショニング戦略", "マーケティングミックス最適化"]'::jsonb,
 '🎯', '#EF4444', 'マーケティング', 'intermediate', 40, 40, true),

('persona_development', 'ペルソナ開発', 'データに基づく具体的な顧客像の構築と活用',
 '["データ収集と分析", "ペルソナ設計", "行動パターン分析", "マーケティング施策への活用"]'::jsonb,
 '👤', '#84CC16', 'マーケティング', 'basic', 80, 35, true),

('social_media_marketing', 'ソーシャルメディアマーケティング', 'SNSを活用したコミュニティ構築とエンゲージメント向上',
 '["プラットフォーム戦略", "コンテンツ企画・制作", "コミュニティ管理", "インフルエンサー連携"]'::jsonb,
 '📱', '#06B6D4', 'マーケティング', 'basic', 90, 35, true)

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

-- 4. 確認クエリ
SELECT 
  'knowledge_cards正規化完了' as status,
  COUNT(*) as total_cards,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_cards
FROM knowledge_cards;