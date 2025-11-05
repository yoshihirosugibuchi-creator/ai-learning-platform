# AI Learning Platform - Claude開発ガイド

**対象**: Claude Code AI Assistant  
**最終更新**: 2025年11月1日

---

## 🚨 **絶対禁止事項**

### **❌ ロジック削除・無効化の禁止**
- console.log()でロジック無効化
- 関数の中身を空にする
- return文で早期終了してロジック迂回
- 「簡単な」代替処理への置き換え

**✅ 正しい対応**: サーバーサイドロジック → API移動、クライアントサイド → API呼び出し

### **❌ auth.users.user_metadata.role 使用絶対禁止**
```typescript
// ❌ 絶対禁止
user.user_metadata?.role

// ✅ 必須：lib/auth-helpers.ts のヘルパー関数使用
import { getCurrentUserRole, isSystemAdmin } from '@/lib/auth-helpers'
```

### **❌ ブラウザ標準ダイアログ使用禁止**
```typescript
// ❌ 禁止
window.alert(), window.confirm(), window.prompt()

// ✅ 必須：useToast + カスタムモーダル使用
import { useToast } from '@/hooks/use-toast'
```

---

## 🗄️ **データベーステーブル構造**

### **マスタデータテーブル（user_idなし）**
- `learning_sessions` - コース学習セッション構成
- `categories` - カテゴリーマスター
- `quiz_questions` - クイズ問題

### **ユーザートランザクションテーブル（user_idあり）**
- `course_session_completions` - コース学習完了記録
- `quiz_sessions` - クイズセッション記録
- `daily_xp_records` - 日別学習記録
- `user_xp_stats_v2` - ユーザー統計情報

**🚨 CRITICAL**: learning_sessionsはマスタデータ。user_idでの検索は絶対禁止。

---

## 🔄 **クライアント/サーバー分離**

### **クライアントサイド（許可）**
- UI状態管理・イベントハンドリング
- fetch()によるAPI呼び出し
- NEXT_PUBLIC_SUPABASE_ANON_KEY使用

### **クライアントサイド（禁止）**
- supabaseAdmin使用
- SUPABASE_SERVICE_ROLE_KEY直接アクセス

### **サーバーサイド（/app/api/*）**
- データベース直接操作（supabaseAdmin使用）
- 認証トークン検証・権限チェック
- SUPABASE_SERVICE_ROLE_KEY使用

---

## 📋 **作業開始前必須プロセス**

### **Step 1: 影響範囲分析**
```bash
# 修正対象の使用箇所特定
grep -r "修正対象名" . --exclude-dir=node_modules --exclude-dir=.next
```

### **Step 2: 品質チェック**
```bash
npm run typecheck  # TypeScriptエラー: 0個必須
npm run lint       # ESLintエラー: 0個必須
npm run build      # ビルド: 成功必須
```

### **Step 3: 段階的修正**
- 小規模（1-2ファイル）: 即座実装・品質チェック
- 中規模（3-5ファイル）: 段階的修正・各段階でビルドテスト
- 大規模（6ファイル以上）: フィーチャーブランチ・全テスト実行

---

## 🚀 **デプロイ前チェック**

### **デプロイ漏れ検出（必須）**
```bash
# 修正済み未コミットファイル
git diff --name-only

# 新規未追跡ファイル
git ls-files --others --exclude-standard

# 重要度判定
git ls-files --others --exclude-standard | grep -E "(app/api|components|lib)/.*\.(ts|tsx)$"
```

### **リスク評価**
- HIGH RISK (5件以上): 必ず全件確認・追加後デプロイ
- MEDIUM RISK (1-4件): 内容確認後個別判断
- LOW RISK (0件): デプロイ続行可能

---

## 🔧 **Supabase型定義更新**

### **database-types-official.ts 再生成手順**
```bash
# 1. バックアップ作成
cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts

# 2. 型定義生成
SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)" \
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

# 3. エイリアス型追加（56個の型定義 - database/database-types-aliases.txt から自動取得）
cat database/database-types-aliases.txt >> lib/database-types-official-new.ts
# 📋 詳細管理: database/README.md 参照 | 推奨: bash scripts/regenerate-database-types.sh

# 4. ファイル置き換え・品質確認
mv lib/database-types-official-new.ts lib/database-types-official.ts
npm run typecheck && npm run lint
```

---

## ⚠️ **React Hook無限ループ防止**

```typescript
// ❌ 危険パターン
const loadData = useCallback(async () => {
  // 処理
}, [filterA, filterB, toast])  // 複数依存関係

useEffect(() => {
  loadData()
}, [loadData])  // loadData変更で再実行

// ✅ 正しいパターン
useEffect(() => {
  loadData()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])  // 初回のみ

useEffect(() => {
  loadData()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [filterA, filterB])  // フィルター変更時のみ
```

---

## 📁 **重要ファイル**

### **コア機能（修正時要注意）**
- `components/quiz/QuizSession.tsx` - クイズセッション管理
- `app/api/xp-save/quiz/route.ts` - XP/SKP計算API
- `lib/auth-helpers.ts` - 認証ヘルパー関数

### **設定ファイル**
- `.env.local` - 環境変数
- `lib/database-types-official.ts` - Database型定義
- `SUPABASE_ACCESS_TOKENS.md` - アクセストークン

---

## 🛠️ **開発サーバー管理**

### **マニフェストエラー解決**
```bash
npm run dev:refresh  # 推奨方法

# または手動
pkill -f "next dev"
rm -rf .next node_modules/.cache
npm cache clean --force
npm run dev
```

---

## 📋 **品質基準（常に維持）**
- TypeScriptエラー: 0個
- ESLintエラー: 0個
- ESLint警告: 0個
- ビルド: 成功
- デプロイ前チェック: 100%完了

---

## 🔍 **継続的品質チェック（TS/Lint以外）**

### **基本チェック（修正・機能追加時は必須実行）**

```bash
# 1. unknown型使用チェック
grep -r "unknown" . --include="*.ts" --include="*.tsx" | grep -v node_modules

# 2. Supabaseクライアント/サーバー分離チェック  
grep -r "supabaseAdmin" components/ | wc -l  # 0であること
grep -r "SERVICE_ROLE" components/ | wc -l   # 0であること

# 3. 無限ループリスクチェック
grep -r "useEffect.*setState.*\[.*state.*\]" . --include="*.tsx" | wc -l  # 0であること
```

### **⚠️ 危険パターン発見時の対処**

#### **1. unknown型の不適切使用**
```typescript
// ❌ 修正前
userProfile: unknown
[key: string]: unknown

// ✅ 修正後  
userProfile: { selected_categories?: Json | null; learning_goals?: Json | null }
[key: string]: Json | string | number | undefined
```

#### **2. クライアントサイドでのsupabaseAdmin使用**
```typescript
// ❌ components/内での使用は禁止
import { supabaseAdmin } from '@/lib/supabase-admin'

// ✅ クライアントサイドでは必ずRLS保護版を使用
import { supabase } from '@/lib/supabase'
```

#### **3. useEffect無限ループ**
```typescript
// ❌ 危険パターン
useEffect(() => {
  if (condition) {
    setState(newValue)
  }
}, [state]) // ← stateを依存関係に含めてsetStateを実行

// ✅ 修正後
useEffect(() => {
  if (condition) {
    setState(newValue) 
  }
// eslint-disable-next-line react-hooks/exhaustive-deps  
}, []) // 依存関係からstate除去
```

#### **4. Toast/Modal無限ループ**
```typescript
// ❌ 危険パターン
useEffect(() => {
  if (error) {
    toast({ title: "エラー" })
  }
}, [error, toast]) // ← toast関数を依存関係に含むのは危険

// ✅ 修正後
useEffect(() => {
  if (error) {
    toast({ title: "エラー" })
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [error]) // toast依存関係除去
```

### **🔄 定期チェック頻度**
- **修正・機能追加時**: 必須実行
- **デプロイ前**: 必須確認  
- **週次レビュー**: 全プロジェクト確認

---

## 🔄 **緊急時ロールバック**
```bash
git log --oneline -3
git revert HEAD --no-edit
git push origin main
```

---

*必須原則: 影響範囲分析 → 段階的修正 → 品質チェック → デプロイ前確認*