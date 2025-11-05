# RLS包括的設定計画 - 48テーブル完全対応

**作成日**: 2025年11月4日  
**対象**: AI Learning Platform Next  
**テーブル数**: 48テーブル  
**権限システム**: admin, system_admin

## 📋 テーブル分類とRLS方針

### 🟡 マスタデータテーブル（16テーブル）
**方針**: 全ユーザー読み取り可、管理者のみ更新

1. categories
2. difficulty_distribution_settings
3. industry_level_targets
4. learning_courses
5. learning_genres
6. learning_sessions
7. learning_themes
8. quiz_hints
9. quiz_questions
10. session_contents
11. session_quizzes
12. skill_levels
13. subcategories
14. wisdom_cards
15. xp_level_skp_settings

### 🔴 ユーザーデータテーブル（26テーブル）
**方針**: user_id = auth.uid() + 管理者は全アクセス

1. course_completions
2. course_session_completions
3. course_theme_completions
4. daily_analytics_batch_log
5. daily_xp_records
6. knowledge_card_collection
7. learning_analytics_summary
8. learning_effectiveness_tracking
9. learning_progress
10. learning_recommendations
11. precomputed_quiz_sets
12. quiz_answers
13. quiz_sessions
14. review_settings
15. skp_transactions
16. spaced_repetition_schedule
17. unified_learning_session_analytics
18. user_badges
19. user_category_xp_stats_v2
20. user_knowledge_collection_v2
21. user_learning_profiles
22. user_question_usage
23. user_settings
24. user_subcategory_xp_stats_v2
25. user_xp_stats_v2
26. users
27. wisdom_card_collection

### 🟠 システムテーブル（3テーブル）
**方針**: 管理者のみアクセス

1. system_alerts
2. system_config_monitoring
3. system_health_logs

### 🟣 管理・履歴テーブル（3テーブル）
**方針**: 管理者のみアクセス

1. quiz_questions_review
2. quiz_review_batches
3. quiz_review_history

## 🔧 実装段階

### Phase 1: 基盤関数作成
```sql
-- 管理者権限チェック関数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'system_admin') 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 2: 最重要テーブル（5テーブル）
1. **users** - 個人情報保護
2. **skp_transactions** - 金銭価値データ
3. **user_xp_stats_v2** - 統計データ
4. **quiz_sessions** - 学習履歴
5. **quiz_answers** - 回答履歴

### Phase 3: ユーザーデータテーブル（残り21テーブル）
### Phase 4: システム・管理テーブル（6テーブル）
### Phase 5: マスタデータテーブル（16テーブル）

## 📝 各段階の実装内容詳細

### Phase 1実装内容は次のファイルで詳細化
- database/rls_phase1_foundation.sql
- database/rls_phase2_critical.sql
- database/rls_phase3_user_data.sql
- database/rls_phase4_system.sql
- database/rls_phase5_master.sql

## ✅ 実装チェックリスト
- [x] Phase 1: 基盤関数作成 (`database/rls_phase1_foundation.sql`)
- [x] Phase 2: 最重要5テーブル (`database/rls_phase2_critical.sql`)
- [x] Phase 3: ユーザーデータ21テーブル (`database/rls_phase3_user_data.sql`)
- [x] Phase 4: システム・管理6テーブル (`database/rls_phase4_system.sql`)
- [x] Phase 5: マスタデータ15テーブル (`database/rls_phase5_master.sql`)
- [x] 包括的テストスイート作成 (`database/rls_testing_suite.sql`)
- [x] アプリケーション影響分析 (`RLS_APPLICATION_IMPACT_ANALYSIS.md`)
- [ ] 段階的実装とテスト実行
- [ ] 本番環境での動作確認