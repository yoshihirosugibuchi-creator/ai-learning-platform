# AI Learning Platform - Claude開発ガイド

**対象**: Claude Code AI Assistant  
**目的**: 開発・修正・デバッグ作業時の必須プロセス・参照ドキュメント  
**最終更新**: 2025年10月8日  
**重要**: XP/SKP計算停止問題の再発防止システム導入

---

## ⛔ **絶対禁止事項（NEVER DO THIS）**

### **🚨 CRITICAL: auth.users.user_metadata.role 使用絶対禁止**

```typescript
// ❌ 絶対に禁止 - どんな理由があっても使用禁止
user.user_metadata?.role
authUser.user_metadata.role
user.user_metadata['role']

// ❌ これらのパターンも全て禁止
const role = user.user_metadata?.role || 'user'
if (user.user_metadata?.role === 'admin') { ... }
const userRole = user.user_metadata?.role

// 🚨 理由: Supabaseの仕様でauth.usersのroleは削除不可能
// しかし、usersテーブルが正式な権限管理システム
```

### **✅ 必須：正しい権限取得方法**

```typescript
// ✅ 必ず lib/auth-helpers.ts のヘルパー関数を使用
import { 
  getCurrentUserRole, 
  getUserRoleFromUsersTable,
  checkUserPermission,
  isAdmin,
  isSystemAdmin 
} from '@/lib/auth-helpers'

// ✅ APIルートでの正しい実装
const { userId, role: userRole } = await getCurrentUserRole(request)
if (!userId) return NextResponse.json({error: 'Auth required'}, {status: 401})

// ✅ 権限チェック
const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
if (!hasPermission) return NextResponse.json({error: 'Insufficient permissions'}, {status: 403})
```

### **🛡️ 自動防止システム**

- **ESLint**: `user_metadata.role`使用時にエラー発生
- **型レベル**: TypeScriptで制約追加済み  
- **ヘルパー関数**: 正しい方法を強制
- **React Hook防止**: `react-hooks/exhaustive-deps` エラーレベル、無限ループ検知強化（2025.10.09追加）

### **📖 重要な背景情報**

1. **auth.users.user_metadata.role**: Supabaseの仕様で削除不可（残存するが使用禁止）
2. **users.role**: 正式な権限管理フィールド（必ずこちらを使用）
3. **RLS政策**: usersテーブルベースに変更済み
4. **システム動作**: 完全にusersテーブルベースで稼働中

---

## 🚨 **作業開始前必須確認（絶対に省略禁止）**

### **全ての修正・機能追加・デバッグ作業前に実行**

```markdown
⚠️ 以下のプロセスを省略すると重要機能停止のリスクがあります
📋 作業の大小に関わらず、必ずStep 1-3を実行してください
```

---

## 📊 **Step 1: 影響範囲分析（実装前必須）**

### **A. データフロー影響分析**

```bash
# 修正対象の呼び出し関係を完全マッピング
echo "🔍 影響範囲分析実行中..."

# 修正対象関数・コンポーネントの使用箇所特定
grep -r "修正対象名" . --exclude-dir=node_modules --exclude-dir=.next
grep -r "関連State名" . --exclude-dir=node_modules --exclude-dir=.next

# 例: QuizSession修正時
grep -r "QuizSession" . --exclude-dir=node_modules
grep -r "setResults" . --exclude-dir=node_modules  
grep -r "totalQuestions" . --exclude-dir=node_modules
```

### **B. 必須確認チェックリスト**

```markdown
## データフロー確認:
- [ ] 修正対象の全ての条件分岐・コードパスを特定
- [ ] 各パスでのstate更新・副作用を確認
- [ ] API呼び出しに必要な全パラメータを確認
- [ ] 非同期処理の実行順序・依存関係を検証

## 統合機能影響確認:
- [ ] XP/SKP計算システムへの影響
- [ ] ユーザー統計更新への影響
- [ ] 認証・セキュリティシステムへの影響
- [ ] データベース更新・整合性への影響

## UI/UX影響確認:
- [ ] ナビゲーション・画面遷移への影響
- [ ] エラーハンドリング・メッセージ表示への影響
- [ ] レスポンシブ・アクセシビリティへの影響
```

---

## 📋 **Step 2: テスト計画作成（実装前必須）**

### **テスト計画書作成テンプレート**

```markdown
# DESIGN_TEST_PLAN_[機能名]_[YYYYMMDD].md

## 機能: [修正・追加する機能名]

### 影響範囲分析結果
- **修正対象**: [ファイル名:行数]
- **呼び出し元**: [一覧]
- **影響するコードパス**: [一覧]

### 必須テストケース
1. **全コードパステスト**
   - [ ] パス1: [条件] → [期待結果]
   - [ ] パス2: [条件] → [期待結果]
   - [ ] パス3: [条件] → [期待結果]

2. **統合機能テスト**
   - [ ] XP/SKP計算: [テスト内容]
   - [ ] データベース更新: [テスト内容]
   - [ ] 統計情報更新: [テスト内容]

3. **エラーハンドリングテスト**
   - [ ] 必須パラメータ不足時の処理
   - [ ] API エラー時の処理
   - [ ] 認証エラー時の処理

### 実装後チェックリスト
- [ ] 全テストケース実行完了
- [ ] TypeScript/ESLintエラー0確認
- [ ] ビルドテスト成功確認
```

---

## 🧪 **Step 3: コア機能保護（デプロイ前必須）**

### **手動テスト項目（本番前実行必須）**

```markdown
## XP/SKP計算システムテスト:
1. **ランダムクイズテスト**
   - [ ] 難易度未選択でクイズ開始
   - [ ] 10問回答（正解率80%程度）
   - [ ] XP/SKP計算が正常実行
   - [ ] プロフィール画面で統計更新確認

2. **カテゴリー指定クイズテスト**
   - [ ] 単一難易度選択でクイズ開始
   - [ ] 10問回答（100%正解でボーナス確認）
   - [ ] カテゴリー別統計の更新確認

3. **データ整合性テスト**
   - [ ] quiz_sessions テーブル更新確認
   - [ ] quiz_answers テーブル更新確認
   - [ ] user_xp_stats_v2 テーブル更新確認
   - [ ] カテゴリー別・サブカテゴリー別統計確認

## 認証・セキュリティテスト:
- [ ] ログイン・ログアウト正常動作
- [ ] 他ユーザーデータへのアクセス拒否確認
- [ ] API認証エラー時の適切な処理確認
```

---

## 🔧 **開発・修正時の品質管理**

### **コード品質チェック（修正時必須）**

```bash
# 修正前の状態確認
echo "=== 修正前品質状況 ==="
npm run typecheck
npm run lint

# 修正後の品質確認（修正の都度実行）
echo "=== 修正後品質確認 ==="
npm run typecheck  # TypeScriptエラー: 必ず0個
npm run lint       # ESLintエラー: 必ず0個
npm run build      # ビルド: 必ず成功

# デプロイ前最終確認
echo "=== デプロイ前最終確認 ==="
npm run typecheck && npm run lint && npm run build
echo "全てのチェックが成功したらデプロイ可能"
```

### **段階的修正プロセス**

```markdown
## 修正規模別アプローチ:

### 小規模修正（1-2ファイル）:
1. [ ] 影響範囲分析実行
2. [ ] 修正実装
3. [ ] 即座に品質チェック実行
4. [ ] 関連機能の手動テスト

### 中規模修正（3-5ファイル）:
1. [ ] 詳細な影響範囲分析
2. [ ] テスト計画書作成
3. [ ] 段階的修正（1-2ファイルずつ）
4. [ ] 各段階でビルドテスト
5. [ ] コア機能保護テスト実行

### 大規模修正（6ファイル以上）:
1. [ ] 完全な影響範囲分析
2. [ ] 詳細テスト計画書作成
3. [ ] フィーチャーブランチでの開発
4. [ ] 全テストスイート実行
5. [ ] 本番同等環境でのテスト
6. [ ] コードレビュー実施
```

---

## 📁 **プロジェクト構造・重要ファイル**

### **コア機能ファイル（修正時要注意）**

```markdown
## XP/SKP計算システム:
- `components/quiz/QuizSession.tsx` - クイズセッション管理
- `app/api/xp-save/quiz/route.ts` - XP/SKP計算API
- `hooks/useXPStats.ts` - XP統計データ管理
- `lib/xp-settings.ts` - XP/SKP計算ロジック

## 認証・ユーザー管理:
- `components/auth/AuthProvider.tsx` - 認証プロバイダー
- `lib/supabase-user.ts` - ユーザーデータアクセス
- `app/api/auth/callback/route.ts` - 認証コールバック

## データベースアクセス:
- `lib/database-types.ts` - Database型定義
- `lib/supabase.ts` - Supabaseクライアント
- `lib/supabase-learning.ts` - 学習データアクセス

## カテゴリー・コンテンツ管理:
- `lib/categories.ts` - カテゴリー管理
- `components/categories/` - カテゴリー表示
- `app/api/categories/route.ts` - カテゴリーAPI
```

### **設定・環境ファイル**

```markdown
## 重要設定ファイル:
- `.env.local` - 環境変数（本番・開発）
- `tsconfig.json` - TypeScript設定
- `eslint.config.mjs` - ESLint設定
- `next.config.mjs` - Next.js設定
- `tailwind.config.ts` - Tailwind CSS設定

## データベース関連:
- `database/` - SQLスクリプト・マイグレーション
- `scripts/` - 管理・メンテナンススクリプト
```

---

## 🗄️ **データベース・テーブル構成**

### **主要テーブル（修正時影響確認必須）**

```markdown
## XP/SKP統計テーブル:
- `user_xp_stats_v2` - ユーザー全体統計
- `user_category_xp_stats_v2` - カテゴリー別統計
- `user_subcategory_xp_stats_v2` - サブカテゴリー別統計
- `daily_xp_records` - 日別活動記録
- `skp_transactions` - SKP取引履歴

## 学習活動テーブル:
- `quiz_sessions` - クイズセッション記録
- `quiz_answers` - クイズ回答記録
- `course_sessions` - コース学習記録

## マスターデータ:
- `categories` - カテゴリーマスター
- `subcategories` - サブカテゴリーマスター
- `quiz_questions` - クイズ問題
- `xp_level_skp_settings` - XP/SKP設定
```

### **テーブル間関係（整合性確認重要）**

```markdown
## 重要な整合性チェック:
- quiz_sessions ↔ quiz_answers の session_id
- user_xp_stats_v2 ↔ category ↔ subcategory の統計値
- daily_xp_records の日付と実際の活動記録
- categories ↔ subcategories の親子関係
```

---

## 🚀 **デプロイメント・本番運用**

### **デプロイ前チェックリスト**

```bash
# 品質管理フロー実行
echo "🔍 デプロイ前品質チェック"

# 1. 影響範囲分析完了確認
echo "- [ ] 影響範囲分析実行済み"
echo "- [ ] テスト計画書作成済み"

# 2. 品質チェック
npm run typecheck  # TypeScriptエラー: 0個必須
npm run lint       # ESLintエラー: 0個必須
npm run build      # ビルド成功必須

# 3. コア機能テスト
echo "- [ ] XP/SKP計算テスト実行済み"
echo "- [ ] 認証システムテスト実行済み"
echo "- [ ] データ整合性テスト実行済み"

# 4. 最終確認
echo "- [ ] 本番同等環境でのテスト完了"
echo "- [ ] ロールバック計画準備済み"
```

### **デプロイ手順**

```bash
# 本番デプロイ実行
echo "🚀 本番デプロイ開始"

# 1. 最終コミット
git add [修正ファイル]
git commit -m "feat/fix: [詳細な修正内容]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 2. 本番プッシュ
git push origin main

# 3. デプロイ後確認
echo "- [ ] 本番環境での基本機能確認"
echo "- [ ] XP/SKP計算動作確認"
echo "- [ ] エラーログ監視"
```

---

## 🔧 **Supabase環境・CLIセットアップ（重要）**

### **環境変数・トークン管理**

```bash
# 🗂️ 環境変数確認コマンド
echo "📋 現在の環境変数状況:"
echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."

# 🔐 必要な環境変数
# .env.local ファイルに以下を設定:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **database-types-official.ts 再生成手順（完全版・絶対に省略禁止）**

**🚨 データベーススキーマ変更時は必ず実行 - 手作業厳禁**

#### **事前確認（必須）**
```bash
# プロジェクト内の必須ファイル確認
ls -la SUPABASE_ACCESS_TOKENS.md  # トークンファイル存在確認
ls -la .env.local                  # 環境変数ファイル確認
ls -la lib/database-types-official.ts  # 現在の型定義確認
```

#### **Step 1: バックアップ作成（絶対に省略禁止）**
```bash
# タイムスタンプ付きバックアップ作成
cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts
echo "✅ バックアップ作成完了"
ls -la lib/database-types-official-backup-*
```

#### **Step 2: Supabase CLI確認・セットアップ**
```bash
# CLI存在確認（npx経由で使用）
npx supabase --version
# ↑ エラーの場合: npm install -g @supabase/cli

# CLIの場所確認
which supabase || find . -name "*supabase*" | grep bin | head -3
```

#### **Step 3: アクセストークン設定（重要）**
```bash
# 🔑 プロジェクト保存トークン使用（推奨）
export SUPABASE_ACCESS_TOKEN=$(grep "sbp_" SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)
echo "使用するトークン: ${SUPABASE_ACCESS_TOKEN:0:10}..."

# 🔑 代替方法: 直接指定（SUPABASE_ACCESS_TOKENS.mdから取得）
# export SUPABASE_ACCESS_TOKEN="sbp_3151368112d1b4d80c7a7633407fc3d581668199"
```

#### **Step 4: 型定義生成（本番データベース直接取得）**
```bash
# 🚨 重要: npx経由でSupabase CLI実行
SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)" \
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

# 生成確認
wc -l lib/database-types-official-new.ts
echo "✅ 新しい型定義生成完了"
```

#### **Step 5: 既存エイリアス型保持（必須）**
```bash
# 既存のエイリアス型定義を確認
echo "=== 既存のエイリアス型定義 ==="
tail -50 lib/database-types-official.ts | grep "export type"

# エイリアス型を新しいファイルに追加
echo "
// ============= Existing Type Aliases (preserved from backup) =============
export type UserXPStatsV2 = Database['public']['Tables']['user_xp_stats_v2']['Row']
export type SKPTransaction = Database['public']['Tables']['skp_transactions']['Row']
export type CourseSessionCompletion = Database['public']['Tables']['course_session_completions']['Row']
export type LearningGenre = Database['public']['Tables']['learning_genres']['Row']
export type LearningTheme = Database['public']['Tables']['learning_themes']['Row']
export type LearningSession = Database['public']['Tables']['learning_sessions']['Row']
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']
export type QuizSession = Database['public']['Tables']['quiz_sessions']['Row']
export type CategoryStats = Database['public']['Views']['category_stats']['Row']
export type SkillLevel = Database['public']['Tables']['skill_levels']['Row']
export type UserXPStatsV2Insert = Database['public']['Tables']['user_xp_stats_v2']['Insert']
export type UserXPStatsV2Update = Database['public']['Tables']['user_xp_stats_v2']['Update']
export type SKPTransactionInsert = Database['public']['Tables']['skp_transactions']['Insert']
export type QuizQuestionInsert = Database['public']['Tables']['quiz_questions']['Insert']
export type QuizSessionInsert = Database['public']['Tables']['quiz_sessions']['Insert']
export type WisdomCardCollectionInsert = Database['public']['Tables']['wisdom_card_collection']['Insert']
export type UnifiedLearningSessionAnalytics = Database['public']['Tables']['unified_learning_session_analytics']['Row']
export type UnifiedLearningSessionAnalyticsInsert = Database['public']['Tables']['unified_learning_session_analytics']['Insert']
export type UnifiedLearningSessionAnalyticsUpdate = Database['public']['Tables']['unified_learning_session_analytics']['Update']
export type UserLearningProfile = Database['public']['Tables']['user_learning_profiles']['Row']
export type UserLearningProfileInsert = Database['public']['Tables']['user_learning_profiles']['Insert']
export type UserLearningProfileUpdate = Database['public']['Tables']['user_learning_profiles']['Update']
export type SpacedRepetitionSchedule = Database['public']['Tables']['spaced_repetition_schedule']['Row']
export type SpacedRepetitionScheduleInsert = Database['public']['Tables']['spaced_repetition_schedule']['Insert']
export type SpacedRepetitionScheduleUpdate = Database['public']['Tables']['spaced_repetition_schedule']['Update']
export type IndustryLevelTarget = Database['public']['Tables']['industry_level_targets']['Row']
export type IndustryLevelTargetInsert = Database['public']['Tables']['industry_level_targets']['Insert']
export type IndustryLevelTargetUpdate = Database['public']['Tables']['industry_level_targets']['Update']
export type LearningAnalyticsSummary = Database['public']['Tables']['learning_analytics_summary']['Row']
export type LearningAnalyticsSummaryInsert = Database['public']['Tables']['learning_analytics_summary']['Insert']
export type LearningAnalyticsSummaryUpdate = Database['public']['Tables']['learning_analytics_summary']['Update']
export type LearningEffectivenessTracking = Database['public']['Tables']['learning_effectiveness_tracking']['Row']
export type LearningEffectivenessTrackingInsert = Database['public']['Tables']['learning_effectiveness_tracking']['Insert']
export type LearningEffectivenessTrackingUpdate = Database['public']['Tables']['learning_effectiveness_tracking']['Update']
export type SystemAlert = Database['public']['Tables']['system_alerts']['Row']
export type SystemAlertInsert = Database['public']['Tables']['system_alerts']['Insert']
export type SystemAlertUpdate = Database['public']['Tables']['system_alerts']['Update']
export type SystemConfigMonitoring = Database['public']['Tables']['system_config_monitoring']['Row']
export type SystemConfigMonitoringInsert = Database['public']['Tables']['system_config_monitoring']['Insert']
export type SystemConfigMonitoringUpdate = Database['public']['Tables']['system_config_monitoring']['Update']
export type SystemHealthLog = Database['public']['Tables']['system_health_logs']['Row']
export type SystemHealthLogInsert = Database['public']['Tables']['system_health_logs']['Insert']
export type SystemHealthLogUpdate = Database['public']['Tables']['system_health_logs']['Update']
" >> lib/database-types-official-new.ts

echo "✅ エイリアス型定義追加完了"
```

#### **Step 6: 差分確認・置き換え**
```bash
# 差分確認（オプション）
diff lib/database-types-official.ts lib/database-types-official-new.ts | head -20

# ファイル置き換え
mv lib/database-types-official-new.ts lib/database-types-official.ts
echo "✅ 型定義ファイル更新完了"
```

#### **Step 7: 品質確認（必須）**
```bash
# TypeScript確認（エラー0必須）
npm run typecheck
if [ $? -eq 0 ]; then
  echo "✅ TypeScriptエラー: 0個"
else
  echo "❌ TypeScriptエラー発生 - 修正が必要"
fi

# ESLint確認
npm run lint
if [ $? -eq 0 ]; then
  echo "✅ ESLintエラー: 0個"
else
  echo "❌ ESLintエラー発生 - 修正が必要"
fi

echo "✅ database-types-official.ts更新完了"
echo "📁 バックアップファイル: lib/database-types-official-backup-*"
```

---

### **🚨 重要なファイル・トークン情報**

#### **必須ファイル場所**
```bash
# Supabaseアクセストークン
SUPABASE_ACCESS_TOKENS.md  # プロジェクトルート
# 内容: sbp_3151368112d1b4d80c7a7633407fc3d581668199

# 環境変数
.env.local  # プロジェクトルート

# 型定義ファイル
lib/database-types-official.ts  # メインファイル
lib/database-types-official-backup-*  # バックアップファイル群
```

#### **Supabase CLIアクセス方法**
```bash
# 1. プロジェクト内のnpx経由（推奨）
npx supabase --version

# 2. ローカルnode_modules内
./node_modules/.bin/supabase --version

# 3. npm cache内（最後の手段）
find /home -name "*supabase*" | grep bin 2>/dev/null | head -1
```

#### **プロジェクト固有情報**
```bash
# プロジェクトID: bddqkmnbbvllpvsynklr
# アクセストークン: SUPABASE_ACCESS_TOKENS.mdから取得
# プロジェクトURL: https://bddqkmnbbvllpvsynklr.supabase.co
```

---

### **⚠️ 絶対に避けるべき行為**

```markdown
🚫 **禁止事項**:
- 手作業での型定義修正
- 「CLIがない」での作業停止
- 「トークンがない」での推測作業
- バックアップなしでの型定義変更
- エイリアス型定義の削除・忘れ

✅ **必須確認事項**:
- SUPABASE_ACCESS_TOKENS.mdファイル存在
- npx supabase --versionでCLI確認
- バックアップファイル作成確認
- TypeScript/ESLintエラー0確認
```

### **データベーストークン・権限**

```markdown
## Supabaseアクセストークン種類:

### 🔑 ANON_KEY (匿名キー):
- 用途: フロントエンド・認証済みユーザー用
- 権限: RLS（Row Level Security）に従う
- 場所: NEXT_PUBLIC_SUPABASE_ANON_KEY

### 🔐 SERVICE_ROLE_KEY (サービスロールキー):
- 用途: サーバーサイド・管理者操作用
- 権限: RLSをバイパス可能（フルアクセス）
- 場所: SUPABASE_SERVICE_ROLE_KEY (環境変数のみ)
- ⚠️ 注意: 絶対にクライアントサイドで使用禁止

### 📊 使い分け原則:
- lib/supabase.ts → ANON_KEY使用（RLS保護）
- lib/supabase-admin.ts → SERVICE_ROLE_KEY使用（管理者用）
- APIルート (/app/api/*) → 用途に応じて選択
- クライアントコンポーネント → ANON_KEYのみ
```

### **よくある問題と解決法**

```bash
# 🚨 問題1: "Invalid API key" エラー
# 解決: 環境変数の値を確認
cat .env.local | grep SUPABASE

# 🚨 問題2: "Project not found" エラー  
# 解決: プロジェクト接続を再確認
supabase projects list
supabase link --project-ref <YOUR_REF>

# 🚨 問題3: 型定義エラー "Property does not exist"
# 解決: 型定義を再生成
supabase gen types typescript --local > lib/database-types-official.ts

# 🚨 問題4: RLS (Row Level Security) エラー
# 確認: どちらのクライアントを使うべきかチェック
# - ユーザーデータ → supabase (RLS保護)
# - 管理者操作 → supabaseAdmin (RLSバイパス)
```

### **トラブルシューティング用確認コマンド**

```bash
# 📋 環境確認チェックリスト
echo "=== Supabase環境確認 ==="
echo "1. CLI状況:"
supabase --version
supabase status

echo "2. 環境変数:"
printenv | grep -i supabase

echo "3. プロジェクト接続:"
supabase projects list

echo "4. 型定義ファイル:"
ls -la lib/database-types*

echo "5. TypeScriptエラー確認:"
npm run typecheck | grep -E "(supabase|database)"
```

---

## 📚 **必須参照ドキュメント**

### **作業開始前に必ず確認**

```markdown
1. **品質管理・再発防止**
   - `QUALITY_MANAGEMENT_FLOW.md` ⭐ 最重要
   - `CODE_QUALITY_WORKFLOW.md`

2. **環境・設定管理**
   - `docs/ENVIRONMENT_VARIABLES_GUIDELINES.md`
   - `ENVIRONMENT_SETUP.md`

3. **デプロイメント**
   - `DEPLOYMENT_MASTER_GUIDE.md`
   - `PRODUCTION_CHECKLIST.md`

4. **データベース**
   - `DATABASE_GUIDELINES.md`
   - `docs/USER_DATA_RESET_PROCEDURE.md`
```

### **開発状況・履歴**

```markdown
5. **現在の状況確認**
   - `DEVELOPMENT_STATUS.md` - 最新の開発状況
   - `RELEASE_HISTORY.md` - 変更履歴
   - `SYSTEM_ARCHITECTURE.md` - システム構成

6. **専門ドキュメント**
   - `MD_MANAGEMENT.md` - ドキュメント管理
   - `docs/` フォルダ内の各種仕様書
```

---

## ⚠️ **重要な禁止事項・注意事項**

### **絶対に避けるべき行為**

```markdown
🚫 **禁止事項**:
- 影響範囲分析を省略した修正
- テスト計画なしでの実装開始
- TypeScript/ESLintエラーが残った状態でのコミット
- コア機能への影響確認を省略した修正
- 根本原因を特定せずでの応急的修正

🚨 **危険なパターン**:
- 複数ファイルの一括修正（段階的修正必須）
- 型定義優先の修正（実データ確認必須）
- 認証・セキュリティ関連の安易な修正
- データベーススキーマ変更時の影響度軽視
```

### **🔄 無限ループ防止（2025.10.09追記）**

```markdown
🚨 **React Hook無限ループ防止**:
- useEffectの依存配列にstateを含める際は更新チェーンを必ず確認
- プロファイル・認証関連コンポーネントは特に注意
- state更新→useEffect実行→state更新のサイクルを避ける

⚠️ **特に危険なパターン**:
- AuthProviderでのprofile更新による無限ループ
- useEffect([...deps])でdepsにstateが含まれ、useEffect内でそのstateを更新
- 非同期でのプロファイル読み込み後のstate更新トリガー

✅ **防止方法**:
- useEffectの依存配列は必要最小限に
- state更新がuseEffectを再トリガーしないか確認
- プロファイル更新系は初期化時のみ実行するよう制御
- ESLint警告を適切に抑制（// eslint-disable-line react-hooks/exhaustive-deps）
```

### **品質基準（常に維持）**

```markdown
✅ **必須達成基準**:
- TypeScriptエラー: 常に0個
- ESLintエラー: 常に0個
- ビルド: 常に成功
- コア機能テスト: 常に成功
- デプロイ前チェック: 100%完了
```

---

## 🔄 **開発サーバー管理（重要）**

### **マニフェスト・メモリエラー解決**

開発サーバーでマニフェストエラーやメモリエラーが発生した場合の完全リフレッシュ手順：

```bash
# 方法1: NPMスクリプト使用（推奨）
npm run dev:refresh

# 方法2: 直接スクリプト実行
bash scripts/dev-server-refresh.sh

# 方法3: 手動実行（緊急時）
pkill -f "next dev"
rm -rf .next node_modules/.cache
npm cache clean --force
npm run dev
```

### **自動実行内容**
1. **プロセス停止**: 既存のNext.js/npm devプロセス終了
2. **キャッシュクリア**: `.next`, `node_modules/.cache`, npm cache削除
3. **ポートクリーンアップ**: port 3000の強制解放
4. **品質チェック**: TypeScript/ESLint確認（オプション）
5. **フレッシュ起動**: Turbopack付きで新サーバー起動

### **エラーパターン**
```
⨯ ENOENT: no such file or directory, open '.next/server/app/page/app-build-manifest.json'
⨯ Cannot find module '../../chunks/[turbopack]_runtime.js'
⨯ _buildManifest.js.tmp.* エラー
```
**→ 上記エラー発生時は必ず `npm run dev:refresh` を実行**

---

## 🤖 **AI Assistant向け特別指示**

### **作業パターン別ガイダンス**

```markdown
## バグ修正時:
1. 必ず影響範囲分析から開始
2. 根本原因の特定を優先
3. 応急的修正は避け、根本解決を実施
4. 修正後は必ずコア機能テストを実行

## 新機能追加時:
1. 既存機能への影響を最優先で分析
2. 段階的実装を心がける
3. 各段階で品質チェックを実行
4. データベース変更は特に慎重に

## リファクタリング時:
1. 機能変更がないことを最初に確認
2. 小さな単位での実施
3. 各段階でテストを実行
4. 予期しない副作用の監視
```

### **緊急時対応**

```markdown
## 本番障害発生時:
1. **即座にロールバック**可能な状態を維持
2. **影響範囲の特定**を最優先
3. **根本原因調査**と**応急対応**を並行実施
4. **再発防止策**の立案と実装

## エスカレーション基準:
- コア機能（XP/SKP計算、認証）への影響
- 5ファイル以上の同時修正
- データベーススキーマの変更
- セキュリティ関連の変更
```

---

## 🔄 **継続改善・学習**

### **毎回の作業後に実施**

```markdown
## 作業完了後の記録:
1. **問題・発見事項の記録**
   - 発生した問題とその原因
   - 解決方法と効果
   - 今後の注意点

2. **プロセス改善の検討**
   - より効率的な方法の検討
   - 追加すべきチェック項目
   - 自動化可能な作業の特定

3. **知見の共有**
   - チーム内での事例共有
   - ドキュメントの更新
   - プロセスの改善
```

---

## 📞 **サポート・ヘルプ**

### **困った時の対処法**

```markdown
## エラー・問題発生時:
1. **エラーログの確認**
   - コンソール・ビルドログの詳細確認
   - ブラウザDevToolsでのエラー確認

2. **ドキュメント参照**
   - 該当するMDファイルの確認
   - 過去の類似事例の確認

3. **段階的切り分け**
   - 最小限の変更での問題再現
   - 一時的な回避策の検討

4. **ロールバック判断**
   - 問題の影響度評価
   - 修正時間との比較
```

---

*このドキュメントは実践で発見された問題を基に継続的に更新されます。新しい知見や改善案があれば必ず追記してください。*

**作成背景**: XP/SKP計算停止問題（2025.10.06）の再発防止  
**最終更新**: 2025年10月6日 - 影響範囲分析プロセス・品質管理フロー導入完了