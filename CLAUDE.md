# AI Learning Platform - Claude開発ガイド

**対象**: Claude Code AI Assistant  
**目的**: 開発・修正・デバッグ作業時の必須プロセス・参照ドキュメント  
**最終更新**: 2025年10月16日  
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

## 🔐 **新機能実装時の認証構築ガイドライン（重要）**

### **🚨 2025.10.16追記: 格言カード管理画面での認証構築ミス教訓**

**背景**: 格言カード管理画面実装時に、既存の正しい認証パターンを参考にせず、一時的にセキュリティバイパス（`const hasAdminPermission = true`）を実装するという重大なミスを犯した。

### **📋 新機能実装時の認証構築手順（必須）**

#### **Step 1: 既存認証パターンの調査（絶対に省略禁止）**

```bash
# 🔍 既存認証実装の完全調査
echo "=== 既存認証パターン調査（新機能実装前必須） ==="

# 1. Authorization Bearerパターンの確認
grep -r "Authorization.*Bearer" . --include="*.tsx" --include="*.ts" | head -10

# 2. Supabaseセッション取得パターンの確認
grep -r "supabase.auth.getSession" . --include="*.tsx" --include="*.ts" | head -10

# 3. 権限チェックパターンの確認
grep -r "system_admin\|isAdmin\|hasPermission" . --include="*.tsx" --include="*.ts" | head -10

# 4. 管理画面の認証実装確認
ls -la app/admin/*/page.tsx
ls -la app/api/admin/*/route.ts

echo "✅ 既存パターン調査完了 - 上記結果を必ず参照して実装すること"
```

#### **Step 2: 確立された認証パターンの使用（強制）**

```typescript
// ✅ フロントエンド認証パターン（管理画面）
// 参考: app/admin/fallback-sync/page.tsx
const directAuthenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
  if (!user?.id) {
    throw new Error('ユーザー認証が必要です')
  }

  // Supabaseセッションからアクセストークン取得
  const { createClient } = await import('@supabase/supabase-js')
  const freshClient = createClient(supabaseUrl, anonKey)
  
  const { data: sessionData } = await freshClient.auth.getSession()
  const token = sessionData.session?.access_token
  
  if (!token) {
    throw new Error('認証トークンが見つかりません')
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
}, [user?.id])

// ✅ API呼び出し時の認証ヘッダー付与
const response = await directAuthenticatedFetch('/api/admin/new-feature', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

```typescript
// ✅ APIルート認証パターン（バックエンド）
// 参考: app/api/admin/fallback-sync/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Bearer認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 2. システム管理者権限チェック
    const hasAdminPermission = await isSystemAdmin(user.id)
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: 'システム管理者権限が必要です' },
        { status: 403 }
      )
    }

    // 3. 実際の処理
    // ... 新機能の実装
    
  } catch (error) {
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
```

#### **Step 3: 権限チェックのベストプラクティス（必須遵守）**

```typescript
// ✅ lib/auth-helpers.tsの既存関数を使用
import { 
  getCurrentUserRole, 
  checkUserPermission,
  isSystemAdmin 
} from '@/lib/auth-helpers'

// ✅ APIルートでの実装例
const { userId, role: userRole } = await getCurrentUserRole(request)
if (!userId) return NextResponse.json({error: 'Auth required'}, {status: 401})

const { hasPermission } = await checkUserPermission(userId, ['system_admin'])
if (!hasPermission) return NextResponse.json({error: 'Insufficient permissions'}, {status: 403})
```

### **🚫 絶対禁止パターン（NEVER DO THIS）**

```typescript
// ❌ 絶対に禁止: 認証バイパス（一時的でも）
const hasAdminPermission = true  // 危険！誰でもadminになる
const isAuthorized = true        // 危険！認証を無効化
// if (true) { ... }             // 危険！権限チェック無効化

// ❌ 絶対に禁止: 未検証の認証実装
const userRole = "system_admin"  // 危険！ハードコード
// 権限チェックの省略               // 危険！セキュリティホール

// ❌ 絶対に禁止: 独自認証の実装
// 既存パターンを無視した新しい認証方法の実装
```

### **📝 新機能実装時のチェックリスト（必須）**

```markdown
## 新機能認証実装チェックリスト:

### 実装前（絶対必須）:
- [ ] 既存認証パターンを grep で調査完了
- [ ] 類似機能（管理画面）の実装を詳細確認
- [ ] lib/auth-helpers.ts の関数を確認
- [ ] 認証フローを既存パターンから選択

### 実装中（逐次確認）:
- [ ] フロントエンド: Supabaseセッション取得実装
- [ ] フロントエンド: Authorization Bearer ヘッダー送信
- [ ] バックエンド: トークン検証実装
- [ ] バックエンド: 権限チェック実装
- [ ] エラーハンドリング: 401/403 適切な返却

### 実装後（必須テスト）:
- [ ] 未認証でのアクセス拒否確認（401）
- [ ] 権限不足でのアクセス拒否確認（403）
- [ ] 正当な権限でのアクセス成功確認（200）
- [ ] トークン無効時のエラーハンドリング確認
- [ ] ブラウザ開発者ツールでヘッダー送信確認

### セキュリティチェック（最終確認）:
- [ ] 認証バイパスコードが存在しないことを確認
- [ ] ハードコードされた権限が存在しないことを確認
- [ ] 本番環境での動作確認
- [ ] セキュリティレビュー実施
```

### **🔍 認証実装デバッグ方法**

```bash
# 認証問題のデバッグ手順
echo "=== 認証問題デバッグ ==="

# 1. ブラウザ開発者ツールで確認
echo "1. Network タブで Authorization ヘッダー確認"
echo "2. Console で認証エラーログ確認"

# 2. サーバーログで確認
echo "3. npm run dev 実行中のサーバーログ確認"
echo "4. Supabase Dashboard の Auth ログ確認"

# 3. トークン確認
echo "5. localStorage の supabase session 確認"
echo "6. セッション有効期限確認"
```

### **💡 今回の教訓まとめ**

1. **🔍 調査不足**: 既存の正しいパターンがあるのに参照しなかった
2. **⚠️ 応急対応の危険性**: 一時的でもセキュリティバイパスは絶対NG
3. **📋 プロセス軽視**: 確立された手順を省略した
4. **🛡️ セキュリティ意識**: 認証は絶対に妥協してはいけない

**→ 新機能実装時は必ず既存パターンを調査し、確立された認証フローを使用すること**

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

## 🚀 **デプロイメント・本番運用（2025.10.16緊急更新・新規ファイル追跡漏れ防止）**

### **🚨 MANDATORY: デプロイ漏れ検証チェックリスト（絶対に省略禁止）**

```markdown
⚠️ **デプロイ前必須確認事項** - 以下を全て確認してからデプロイ実行

## Phase 0: デプロイ漏れ防止チェック（CLAUDE.mdフロー準拠）
- [ ] `git status` 実行完了
- [ ] `git diff --name-only` による修正ファイル確認完了
- [ ] `git ls-files --others --exclude-standard` による未追跡ファイル確認完了
- [ ] 依存関係分析による重要度判定完了
- [ ] CRITICAL/MODIFIEDファイルの追跡状況確認完了
- [ ] デプロイ漏れリスク評価完了
- [ ] リスクレベルが HIGH の場合は追加対応完了

## 重要ファイル種別確認:
- [ ] API ファイル (app/api/**/*.ts) - 機能追加時は必須
- [ ] コンポーネント (components/**/*.tsx) - UI変更時は必須  
- [ ] ライブラリ (lib/**/*.ts) - ユーティリティ追加時は必須
- [ ] 型定義 (lib/database-types*.ts) - DB変更時は必須
- [ ] CSS/静的ファイル - ビジュアル変更時は必須
- [ ] 設定ファイル - 環境変更時は必須

## デプロイ判定基準:
- [ ] HIGH RISK (5件以上): 必ず全件確認・追加後デプロイ
- [ ] MEDIUM RISK (1-4件): 内容確認後個別判断
- [ ] LOW RISK (0件): デプロイ続行可能

⚠️ この確認を省略した場合、本番エラーの可能性が高まります
✅ 確認完了後、以下のデプロイフローに進んでください
```

---

### **🔧 クイックリファレンス: デプロイ漏れ検出コマンド集**

```bash
# 最速デプロイ漏れ検出（30秒で完了）
echo "🚨 デプロイ漏れ緊急確認"

# 1. 修正済み未コミットファイル
git diff --name-only | wc -l
git diff --name-only

# 2. 新規未追跡ファイル
git ls-files --others --exclude-standard | wc -l  
git ls-files --others --exclude-standard

# 3. 重要度判定（API/コンポーネント/ライブラリ）
git ls-files --others --exclude-standard | grep -E "(app/api|components|lib)/.*\.(ts|tsx)$"

# 4. デプロイリスク計算
echo "リスク評価: $(($(git diff --name-only | wc -l) + $(git ls-files --others --exclude-standard | grep -E "\.(ts|tsx|js|jsx)$" | wc -l)))件"

# ⚠️ 結果が 5以上 = HIGH RISK → 必ず確認・追加
# ⚠️ 結果が 1-4 = MEDIUM RISK → 内容確認  
# ✅ 結果が 0 = LOW RISK → デプロイ続行可能
```

---

### **包括的デプロイフロー（新規ファイル存在忘れ対策強化版）**

#### **🚨 デプロイエラー事例学習（2025.10.16発生）**
**事例**: `lib/skill-levels.ts`が昨夜作成されたが未追跡、今朝の修正で依存関係追加後にデプロイエラー  
**根本原因**: 「作成から時間が経った新規ファイルの存在忘れ + 後からの依存関係追加」  
**教訓**: ローカル存在ファイルは品質チェックをパスするが、git未追跡では本番エラーになる

#### **Phase 1: デプロイ前品質チェック（デプロイ漏れ防止完全版・2025.10.16緊急強化）**

```bash
# 1. 前回デプロイ後完全差分確認
echo "🔍 前回デプロイ後完全差分分析"
git status
git diff --name-only
git log --oneline -5

# 2. 🚨 デプロイ漏れファイル完全検出（格言カード事例対応）
echo "📋 デプロイ漏れファイル完全検出（本番エラー防止）"

# 2-1. 修正済み未コミットファイル確認
echo "🔧 修正済み未コミットファイル:"
MODIFIED_FILES=$(git diff --name-only)
if [ -n "$MODIFIED_FILES" ]; then
  echo "$MODIFIED_FILES" | while read file; do
    if [ -f "$file" ]; then
      echo "  ❌ MODIFIED: $file - コミット必須"
    fi
  done
  echo ""
  echo "対処: git add [ファイル名] でステージング"
else
  echo "  ✅ 修正済み未コミットファイルなし"
fi
echo ""

# 2-2. 新規未追跡ファイル完全分析
echo "📋 新規未追跡ファイル完全分析:"
UNTRACKED_FILES=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED_FILES" ]; then
  echo "  発見された未追跡ファイル: $(echo "$UNTRACKED_FILES" | wc -l)件"
  echo ""
  
  # ソースコードファイル重要度分析
  echo "🔍 ソースコードファイル重要度分析:"
  echo "$UNTRACKED_FILES" | grep -E "\.(ts|tsx|js|jsx)$" | while read file; do
    if [ -f "$file" ]; then
      filename_without_ext=$(basename "$file" | sed 's/\.[^.]*$//')
      DEPENDENCY_COUNT=$(grep -r "from.*['\"]\..*$filename_without_ext['\"]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next | wc -l)
      if [ $DEPENDENCY_COUNT -gt 0 ]; then
        echo "  ❌ CRITICAL: $file ($DEPENDENCY_COUNT箇所から参照) - デプロイ必須"
        grep -r "from.*['\"]\..*$filename_without_ext['\"]" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next | head -2 | sed 's/^/     /'
      else
        echo "  ⚠️  INFO: $file (直接参照なし) - 確認推奨"
      fi
    fi
  done
  echo ""
  
  # API・コンポーネントファイル分析
  echo "🔍 API・コンポーネントファイル分析:"
  echo "$UNTRACKED_FILES" | grep -E "(app/api|components)/.*\.(ts|tsx)$" | while read file; do
    if [ -f "$file" ]; then
      echo "  ❌ CRITICAL: $file - API/コンポーネント新規追加"
    fi
  done
  echo ""
  
  # CSS・静的ファイル分析
  echo "🔍 CSS・静的ファイル分析:"
  echo "$UNTRACKED_FILES" | grep -E "\.(css|scss|png|jpg|svg)$" | while read file; do
    if [ -f "$file" ]; then
      echo "  ⚠️  ASSET: $file - 静的ファイル"
    fi
  done
  echo ""
  
  # ドキュメント・設定ファイル分析
  echo "🔍 ドキュメント・設定ファイル分析:"
  echo "$UNTRACKED_FILES" | grep -E "\.(md|sql|json|config)$" | while read file; do
    if [ -f "$file" ]; then
      echo "  📄 DOC: $file - ドキュメント/設定"
    fi
  done
  echo ""
  
else
  echo "  ✅ 新規未追跡ファイルなし"
fi

# 2-3. ファイル作成日時分析（時系列確認）
echo "📅 最近作成されたファイル分析（デプロイ漏れ可能性）:"
if [ -n "$UNTRACKED_FILES" ]; then
  echo "$UNTRACKED_FILES" | head -10 | while read file; do
    if [ -f "$file" ]; then
      echo "  $file: $(stat -c '%w %y' "$file" 2>/dev/null || stat -f '%SB %Sm' "$file" 2>/dev/null || echo '日時不明')"
    fi
  done
fi
echo ""

# 2-4. デプロイ漏れリスク評価
echo "🚨 デプロイ漏れリスク評価:"
CRITICAL_COUNT=$(echo "$UNTRACKED_FILES" | grep -E "(app/api|components|lib)/.*\.(ts|tsx)$" | wc -l)
MODIFIED_COUNT=$(echo "$MODIFIED_FILES" | wc -l)
TOTAL_RISK=$((CRITICAL_COUNT + MODIFIED_COUNT))

if [ $TOTAL_RISK -gt 5 ]; then
  echo "  ❌ HIGH RISK: $TOTAL_RISK件の重要ファイルが未デプロイ"
  echo "  🚨 デプロイ前に必ず確認・追加が必要"
elif [ $TOTAL_RISK -gt 0 ]; then
  echo "  ⚠️  MEDIUM RISK: $TOTAL_RISK件のファイルが未デプロイ"
  echo "  📋 内容確認後にデプロイ判断"
else
  echo "  ✅ LOW RISK: デプロイ漏れなし"
fi
echo ""

echo "🔧 対処方法:"
echo "  git add [重要ファイル] でファイル追加"
echo "  git commit でまとめてコミット"
echo "  再度このチェックを実行して漏れがないことを確認"
echo ""

# 3. 影響範囲分析（品質基準必須）
echo "📊 影響範囲分析実行"
echo "修正ファイル: $(git diff --name-only | wc -l)件"
echo "主要変更内容確認:"
git diff --stat

# 4. 包括的品質チェック（TEST_SUITE_IMPLEMENTATION_GUIDE準拠）
echo "✅ 包括的品質チェック実行"
npm run typecheck  # TypeScriptエラー: 0個必須
npm run lint       # ESLintエラー: 0個必須  
npm test           # 全テストスイート: 54 passed必須
npm run build      # ビルド: 成功必須

echo "品質基準達成確認:"
echo "- [ ] TypeScriptエラー: 0個"
echo "- [ ] ESLintエラー: 0個"
echo "- [ ] テストスイート: 全PASS"
echo "- [ ] ビルド: 成功"
echo "- [ ] 依存関係のある未追跡ファイル: 0個"
```

#### **Phase 2: コア機能保護テスト**

```bash
# 4. データベーススキーマ回帰テスト
echo "🗄️ データベース回帰テスト"
npm test schema-regression  # DB構造確認

# 5. API統合テスト
echo "🔌 API統合テスト"
npm test course-completion  # コア機能確認

# 6. 基本動作確認テスト
echo "🧪 基本動作確認"
npm test basic             # Jest環境確認

echo "コア機能テスト確認:"
echo "- [ ] データベーススキーマ: 整合性OK"
echo "- [ ] API統合テスト: リクエスト・レスポンス正常"
echo "- [ ] XP/SKP計算ロジック: 正確"
echo "- [ ] 認証・セキュリティ: 動作正常"
```

#### **Phase 3: デプロイ実行**

```bash
# 7. ステージング（変更ファイルのコミット準備）
echo "📋 変更ファイルステージング"
git add [修正対象ファイル]  # 個別指定推奨

# 8. コミットメッセージ作成（標準フォーマット）
echo "📝 コミットメッセージ作成"
git commit -m "$(cat <<'EOF'
feat/fix: [簡潔な変更内容]

🎯 主要改善:
- [主要な機能改善1]
- [主要な機能改善2]
- [主要な機能改善3]

📊 変更内容:
- [ファイル1]: [変更内容]
- [ファイル2]: [変更内容]
- [ファイル3]: [変更内容]

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 9. 本番デプロイ実行
echo "🚀 本番デプロイ実行"
git push origin main

echo "デプロイ実行確認:"
echo "- [ ] コミット成功"
echo "- [ ] プッシュ成功"
echo "- [ ] デプロイ完了通知確認"
```

### **デプロイ後検証（必須）**

```bash
# 10. デプロイ後確認
echo "✅ デプロイ後動作確認"

# 本番環境での基本機能確認
echo "基本機能確認項目:"
echo "- [ ] ログイン・ログアウト正常動作"
echo "- [ ] ランダムクイズ実行・XP付与確認"
echo "- [ ] カテゴリークイズ実行・統計更新確認"
echo "- [ ] コース学習実行・ナレッジカード獲得確認"
echo "- [ ] プロフィール画面・統計表示確認"
echo "- [ ] コレクションページ・バッジ表示確認"
echo "- [ ] エラーハンドリング・認証エラー確認"

# パフォーマンス確認
echo "パフォーマンス確認:"
echo "- [ ] ページ読み込み時間: 3秒以内"
echo "- [ ] API応答時間: 5秒以内"
echo "- [ ] データベースクエリ: 正常"

# エラーログ監視
echo "エラーログ監視:"
echo "- [ ] 新規エラー発生なし"
echo "- [ ] 既存エラー増加なし"
echo "- [ ] 警告レベル問題なし"
```

### **緊急時ロールバック手順**

```bash
# 問題発生時の緊急対応
echo "🚨 緊急時ロールバック手順"

# 1. 即座にロールバック
git log --oneline -3  # 直前のコミットを確認
git revert HEAD --no-edit  # 直前のコミットを取り消し
git push origin main  # 緊急ロールバック実行

# 2. 影響範囲特定
echo "影響範囲特定:"
echo "- [ ] エラーログ詳細確認"
echo "- [ ] ユーザー影響度評価"
echo "- [ ] データ整合性確認"

# 3. 根本原因調査（ロールバック後）
echo "根本原因調査:"
echo "- [ ] テスト環境での問題再現"
echo "- [ ] コードレビュー再実行"
echo "- [ ] テストケース追加検討"

# 4. 修正・再デプロイ計画
echo "再デプロイ準備:"
echo "- [ ] 完全テストスイート再実行"
echo "- [ ] 段階的デプロイ計画"
echo "- [ ] 監視体制強化"
```

### **デプロイ品質管理指標**

```markdown
## デプロイ成功基準（2025.10.16更新）:

### 必須達成項目:
- [x] TypeScriptエラー: 0個維持
- [x] ESLintエラー: 0個維持
- [x] テストスイート: 54 passed維持（todo除く）
- [x] ビルド: 成功維持
- [x] API統合テスト: 全PASS
- [x] データベース回帰テスト: 全PASS

### パフォーマンス基準:
- [x] 全テストスイート実行: 1秒以内
- [x] ビルド時間: 10秒以内
- [x] デプロイプロセス: 5分以内完了

### 品質向上指標:
- [x] カバレッジ: 現状維持以上
- [x] 新規警告: 0件
- [x] コードレビュー: 高品質コミットメッセージ
- [x] ドキュメント: 必要に応じて更新
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

## 📂 **バックアップファイル管理規則**

### **バックアップファイル保存場所**

```bash
# バックアップファイルの保存場所
backups/[元のディレクトリ構造]/[ファイル名].bak

# 例:
# 元ファイル: components/analytics/OptimizedAnalyticsPage.tsx
# バックアップ: backups/components/analytics/OptimizedAnalyticsPage-broken-YYYYMMDD_HHMMSS.bak
```

### **命名規則**

- **拡張子**: `.bak` （TypeScriptエラー回避のため）
- **タイムスタンプ**: `YYYYMMDD_HHMMSS` 形式
- **状態表記**: `-broken-`, `-backup-`, `-restore-` など

### **TypeScript回避設定**

```json
// tsconfig.json exclude設定
"exclude": [
  "node_modules",
  "backups/**/*"
]
```

### **保存手順**

1. **ディレクトリ作成**: `mkdir -p backups/[元のパス]`
2. **ファイル移動**: `mv [元ファイル] backups/[元のパス]/[ファイル名].bak`
3. **記録**: 何のバックアップか、なぜ作成したかを記録

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