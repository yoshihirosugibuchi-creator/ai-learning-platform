# AI Learning Platform Next - 包括的RLS設定実装計画

**作成日**: 2025年11月4日  
**対象**: 全47テーブルの包括的RLS（Row Level Security）設定  
**目的**: セキュリティ強化とアプリケーション影響の最小化  
**実装方針**: 段階的・テスト重視・リバーシブル

---

## 🎯 **実装目標**

### 主要目標
1. **全47テーブルの適切なRLS設定** - 漏れなく包括的に対応
2. **既存アプリケーションコードへの影響最小化** - 機能停止を防ぐ
3. **段階的実装** - リスクを最小化しつつ確実に進める
4. **即座ロールバック可能** - 問題発生時の迅速対応

### セキュリティ目標
- ❌ **現状**: 全ユーザーデータテーブルでRLS無効（重大な脆弱性）
- ✅ **目標**: ユーザーは自分のデータのみアクセス可能
- ✅ **目標**: 管理者は適切な権限チェック後にフルアクセス
- ✅ **目標**: マスタデータは読み取り専用（管理者のみ更新）

---

## 📊 **テーブル分類と設定方針**

### 🔐 **分類A: USER_ID必須テーブル（16テーブル）**
**方針**: `user_id = auth.uid()` ベースの厳格なRLS

```sql
-- 基本ポリシーパターン
CREATE POLICY "users_own_data" ON table_name
  FOR ALL USING (user_id = auth.uid());
```

**対象テーブル**:
- `course_completions`, `course_session_completions`, `course_theme_completions`
- `daily_xp_records`, `learning_analytics_summary`, `learning_effectiveness_tracking`
- `learning_recommendations`, `precomputed_quiz_sets`, `quiz_review_stats`
- `quiz_sessions`, `review_settings`, `spaced_repetition_schedule`
- `unified_learning_session_analytics`, `user_learning_profiles`
- `user_question_usage`, `wisdom_card_collection`

### 🔓 **分類B: USER_ID_NULL対応テーブル（5テーブル）**
**方針**: nullable user_id への対応 + システムデータ保護

```sql
-- NULLユーザー対応ポリシーパターン
CREATE POLICY "user_data_or_system" ON table_name
  FOR ALL USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND auth.role() = 'service_role')
  );
```

**対象テーブル**:
- `knowledge_card_collection`, `learning_progress`, `quiz_answers`
- `skp_transactions`, `system_alerts`

### 🔒 **分類C: 混合型テーブル（2テーブル）**
**方針**: user_id必須 + nullable の両パターンに対応

**対象テーブル**:
- `user_badges` (user_id: string)
- `user_settings` (user_id: string | null)

### 📚 **分類D: マスタデータテーブル（24テーブル）**
**方針**: 読み取り専用 + 管理者のみ更新権限

```sql
-- マスタデータポリシーパターン
CREATE POLICY "public_read" ON table_name
  FOR SELECT USING (true);

CREATE POLICY "admin_write" ON table_name
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('system_admin', 'admin')
    )
  );
```

**対象テーブル**:
- `categories`, `subcategories`, `quiz_questions`, `quiz_hints`
- `learning_courses`, `learning_genres`, `learning_sessions`, `learning_themes`
- `wisdom_cards`, `xp_level_skp_settings`, `industry_level_targets`
- `skill_levels`, `difficulty_distribution_settings`
- `quiz_questions_review`, `quiz_review_batches`, `quiz_review_history`, `quiz_review_pending`
- `session_contents`, `session_quizzes`
- `daily_analytics_batch_log`, `system_config_monitoring`, `system_health_logs`
- `category_stats` (ビュー)

### 👤 **分類E: 特殊テーブル（1テーブル）**
**方針**: 自分のプロフィールのみアクセス + 管理者権限

```sql
-- usersテーブル専用ポリシー
CREATE POLICY "own_profile" ON users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "admin_access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('system_admin', 'admin')
    )
  );
```

**対象テーブル**:
- `users`

---

## 📅 **段階的実装スケジュール**

### **Phase 1: 準備・テスト環境構築（1日目）**
- [ ] RLS設定前後のテストスクリプト作成
- [ ] アプリケーションコード影響分析完了
- [ ] ロールバック手順の確立
- [ ] SQLポリシーファイルの作成・検証

### **Phase 2: マスタデータテーブル（2日目）**
**優先度**: LOW（既存機能への影響が最小）
- [ ] 24のマスタデータテーブルでRLS有効化
- [ ] 読み取り専用ポリシー適用
- [ ] 管理者更新権限の設定
- [ ] 基本機能テスト実行

### **Phase 3: 特殊テーブル（3日目）**
**優先度**: HIGH（認証基盤への影響大）
- [ ] `users`テーブルのRLS設定
- [ ] 認証フローの動作確認
- [ ] 管理画面アクセステスト
- [ ] プロフィール機能テスト

### **Phase 4: USER_ID必須テーブル（4-5日目）**
**優先度**: HIGH（コア機能への影響大）
- [ ] 16のユーザーデータテーブルでRLS有効化
- [ ] クイズ・学習機能の動作確認
- [ ] XP/SKP計算システムのテスト
- [ ] 統計・分析機能のテスト

### **Phase 5: USER_ID_NULL・混合型テーブル（6日目）**
**優先度**: MEDIUM（部分的影響）
- [ ] 7のnullable/混合テーブルでRLS有効化
- [ ] システムアラート機能のテスト
- [ ] データ整合性の確認
- [ ] エラーハンドリングのテスト

### **Phase 6: 包括的テスト・検証（7日目）**
- [ ] 全機能の統合テスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] 本番デプロイ準備

---

## 🔍 **アプリケーション影響分析**

### **高影響APIエンドポイント**
確認済みの影響の可能性があるAPIファイル（10+）:
- `/api/quiz/quick-start/route.ts` - usersテーブルアクセス
- `/api/admin/users-v2/*/route.ts` - ユーザー管理
- `/api/review/stats/route.ts` - 統計データ取得
- `/api/review/settings/route.ts` - 設定データ
- `/api/precompute-quiz/route.ts` - クイズ事前計算
- その他debug系APIエンドポイント

### **必要な修正パターン**

#### **パターン1: supabaseAdminの適切な使用**
```typescript
// 🔴 現在（RLS無効時）
const { data } = await supabase.from('users').select('*')

// 🟢 修正後（RLS有効時）
const { data } = await supabaseAdmin.from('users').select('*')
// または認証ヘッダー付きでsupabaseクライアント使用
```

#### **パターン2: 認証コンテキストの追加**
```typescript
// 🟢 修正後: 認証チェック追加
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

const { data } = await supabase
  .from('user_data_table')
  .select('*')
  .eq('user_id', user.id)  // RLSが自動的にフィルタリング
```

#### **パターン3: 管理者権限チェック**
```typescript
// 🟢 修正後: 管理者権限チェック
const hasAdminPermission = await isSystemAdmin(user.id)
if (hasAdminPermission) {
  // supabaseAdminを使用してRLSバイパス
  const { data } = await supabaseAdmin.from('table').select('*')
} else {
  // 通常のsupabaseクライアントを使用（RLS適用）
  const { data } = await supabase.from('table').select('*')
}
```

---

## 📝 **テスト戦略**

### **テストケース設計**

#### **セキュリティテスト**
1. **認証なしアクセステスト**
   - [ ] 匿名ユーザーの不正アクセス拒否
   - [ ] 他ユーザーデータへのアクセス拒否
   - [ ] データ改ざん・削除の防止

2. **権限レベルテスト**
   - [ ] 一般ユーザー: 自分のデータのみアクセス
   - [ ] 管理者: 適切な権限でフルアクセス
   - [ ] システム管理者: 全データアクセス

#### **機能テスト**
1. **コア機能テスト**
   - [ ] ログイン・ログアウト
   - [ ] クイズ実行・結果保存
   - [ ] XP/SKP計算・更新
   - [ ] プロフィール表示・更新

2. **管理機能テスト**
   - [ ] ユーザー管理画面
   - [ ] コンテンツ管理画面
   - [ ] 統計・分析画面
   - [ ] システム設定画面

#### **パフォーマンステスト**
1. **クエリパフォーマンス**
   - [ ] RLS有効化前後の応答時間比較
   - [ ] 複雑なJOINクエリのパフォーマンス
   - [ ] 大量データでの性能確認

2. **スケーラビリティテスト**
   - [ ] 同時アクセス時のパフォーマンス
   - [ ] データ量増加時の影響確認

---

## 🚨 **リスク管理・緊急対応**

### **リスク分析**

#### **HIGH RISK**
- **認証フロー停止**: usersテーブルRLS設定時の認証機能影響
- **データアクセス拒否**: 既存APIでの予期しないアクセス拒否
- **管理機能停止**: 管理画面での権限エラー

#### **MEDIUM RISK**
- **パフォーマンス劣化**: RLS有効化によるクエリ性能低下
- **統計データ不整合**: 集計クエリでのRLS影響

#### **LOW RISK**
- **マスタデータ更新エラー**: 管理者のみ影響
- **ログ・監視機能の軽微な影響**

### **緊急時ロールバック手順**

#### **即座ロールバック（30秒以内）**
```sql
-- 全テーブルのRLS無効化（緊急時）
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

#### **段階的ロールバック（5分以内）**
```sql
-- 特定テーブルのみロールバック
ALTER TABLE problematic_table DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_name ON problematic_table;
```

#### **部分的復旧（15分以内）**
```sql
-- ポリシー修正で対応
DROP POLICY existing_policy ON table_name;
CREATE POLICY new_policy ON table_name FOR ALL USING (condition);
```

---

## 📋 **実装チェックリスト**

### **実装前チェック**
- [ ] 全47テーブルの分類確認完了
- [ ] 影響するAPIファイルの特定完了
- [ ] テストスクリプト作成完了
- [ ] ロールバック手順の確立
- [ ] 関係者への通知・承認取得

### **Phase別チェック**
- [ ] **Phase 1**: 準備・テスト環境
- [ ] **Phase 2**: マスタデータ（24テーブル）
- [ ] **Phase 3**: 特殊テーブル（1テーブル）
- [ ] **Phase 4**: USER_ID必須（16テーブル）
- [ ] **Phase 5**: USER_ID_NULL/混合（7テーブル）
- [ ] **Phase 6**: 包括的テスト・検証

### **実装後確認**
- [ ] 全機能の動作確認
- [ ] セキュリティテスト完了
- [ ] パフォーマンステスト完了
- [ ] エラーログの監視
- [ ] ユーザーからの問題報告なし

---

## 📈 **成功指標**

### **セキュリティ指標**
- ✅ **RLS有効化率**: 47/47テーブル（100%）
- ✅ **不正アクセス防止**: テスト時の不正アクセス0件
- ✅ **権限制御**: 適切な権限レベルでのアクセス制御

### **機能指標**
- ✅ **既存機能維持**: 全機能の正常動作
- ✅ **パフォーマンス維持**: 応答時間の大幅な劣化なし
- ✅ **管理機能**: 管理画面の正常動作

### **運用指標**
- ✅ **エラー率**: RLS関連エラー < 1%
- ✅ **ユーザー影響**: 機能停止時間 < 1時間
- ✅ **復旧時間**: 問題発生から復旧まで < 15分

---

## 📚 **参考資料・関連ドキュメント**

### **プロジェクト内ドキュメント**
- `RLS_SECURITY_ANALYSIS_REPORT.md` - 現状のセキュリティ分析
- `CLAUDE.md` - プロジェクト開発ガイドライン
- `lib/database-types-official.ts` - データベース型定義

### **実装ファイル**
- `database/rls_policies_complete.sql` - 全RLSポリシーSQL
- `scripts/rls-implementation-test.js` - テストスクリプト
- `lib/auth-helpers.ts` - 認証ヘルパー関数

### **外部資料**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

*このドキュメントは実装進行に応じて更新されます。Phase完了ごとに実績を記録し、次Phaseの計画を見直してください。*

**最終更新**: 2025年11月4日  
**ステータス**: Phase 1 準備中  
**次回更新予定**: Phase 1 完了時