# DESIGN_TEST_PLAN_LEARNING_ANALYTICS_20251006.md

## 機能: Phase 2 学習分析システム実装

### 影響範囲分析結果
- **修正対象**: 
  - `app/api/learning-analytics/detailed/route.ts` - 強化された詳細分析API
  - `app/api/learning-analytics/industry-comparison/route.ts` - 新規業界比較API
  - `components/analytics/CachedLearningDashboard.tsx` - 強化されたUI
  - `app/test-analytics/page.tsx` - テストページ更新
- **呼び出し元**: 
  - `/analytics` ページ
  - `/test-analytics` ページ
  - `hooks/useLearningAnalytics.ts`
- **影響するコードパス**: 
  - quiz_sessions テーブル直接アクセス
  - user_xp_stats_v2 テーブル直接アクセス
  - user_category_xp_stats_v2 テーブル直接アクセス

### 必須テストケース

#### 1. 全コードパステスト
- [ ] パス1: 正常なユーザーID → 詳細分析データ返却
- [ ] パス2: 存在しないユーザーID → 空データ返却
- [ ] パス3: 不正なユーザーID → 400エラー返却
- [ ] パス4: 業界比較API → 正常なベンチマーク比較データ返却
- [ ] パス5: UI表示 → 全タブの正常表示

#### 2. 統合機能テスト
- [ ] XP/SKP計算: 学習分析APIがXP計算に影響しないこと確認
- [ ] データベース更新: 読み取り専用操作でデータ破損なし確認
- [ ] 統計情報更新: 既存統計への影響なし確認

#### 3. エラーハンドリングテスト
- [ ] 必須パラメータ不足時の処理: userId未指定
- [ ] API エラー時の処理: データベース接続エラー
- [ ] 認証エラー時の処理: RLS無効化状態での動作確認

#### 4. パフォーマンステスト
- [ ] 大量データでのレスポンス時間: 500ms以内
- [ ] 並行アクセス時の安定性: 複数ユーザー同時アクセス
- [ ] キャッシュ動作: React Query による適切なキャッシュ

#### 5. 回帰テスト
- [ ] 既存クイズ機能: 正常動作確認
- [ ] XP/SKP計算: 学習分析実装後も正常動作
- [ ] 認証システム: ログイン・ログアウト正常動作
- [ ] プロフィール表示: 統計表示正常動作

### 実装後チェックリスト
- [ ] 全テストケース実行完了
- [ ] TypeScript/ESLintエラー0確認
- [ ] ビルドテスト成功確認
- [ ] 本番環境での動作確認
- [ ] RLS復元前の最終テスト完了

### 特別注意事項
- RLS無効化状態での実装のため、本番運用前のRLS復元が必須
- XP/SKP計算システムへの影響を特に重視
- 認証システムとの統合テストが重要