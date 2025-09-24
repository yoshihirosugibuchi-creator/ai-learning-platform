# コード品質管理ワークフロー

**目的**: プログラミング時のエラー・ワーニングチェック手順  
**対象**: 開発者・コード修正作業者  
**最終更新**: 2025年9月24日  
**達成状況**: TypeScript 199→0エラー、ESLint 151→0警告（100%達成！）

---

## 🎯 **基本方針**

### **品質基準**
- **TypeScriptエラー**: 常に0個を維持（必須）
- **ESLintエラー**: 常に0個を維持（必須）  
- **ESLintワーニング**: 新規追加を防止・段階的削減

### **デグレ防止の原則**
1. **修正前の状態確認**
2. **影響範囲の事前評価**  
3. **段階的・安全な修正**
4. **修正後の完全検証**

---

## 🔄 **開発時チェックワークフロー**

### **Step 1: コード修正前チェック**

```bash
# 現在のエラー・ワーニング状況を把握
echo "=== 修正前の状態確認 ==="
npx tsc --noEmit
npm run lint 2>&1 | tail -1
```

**記録すべき内容**:
- TypeScriptエラー数
- ESLintエラー数  
- ESLintワーニング数

### **Step 2: コード修正実行**

**安全な修正順序**:
1. **低リスク**: 未使用インポート・変数削除
2. **中リスク**: 型定義修正・any型解決
3. **高リスク**: React Hook依存関係・ロジック変更

**修正時の注意**:
- 一度に大量修正しない（1-3ファイルずつ）
- コメントで修正理由を明記
- 機能に影響する変更は慎重に検討

### **Step 3: 修正後検証（必須）**

```bash
# TypeScript検証（必須 - エラー0である必要）
echo "=== TypeScript検証 ==="
npx tsc --noEmit

# ESLint検証
echo "=== ESLint検証 ==="
npm run lint

# ビルド検証（重要ファイル修正時）
echo "=== ビルド検証 ==="
npm run build
```

### **Step 4: 結果評価**

**成功条件**:
- ✅ TypeScriptエラー: 0個
- ✅ ESLintエラー: 0個
- ✅ ESLintワーニング: 修正前以下
- ✅ ビルド: 成功

**修正必要条件**:
- ❌ 新しいTypeScriptエラー発生
- ❌ 新しいESLintエラー発生
- ❌ ワーニング数増加

---

## 🚨 **警告レベル別対応方針**

### **🔴 高優先度（即座に修正）**

```bash
# TypeScriptエラー例
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
error TS2322: Type 'undefined' is not assignable to type 'string'
error TS7053: Element implicitly has an 'any' type
```

**対応**: 型定義修正・null/undefinedチェック追加

### **🟡 中優先度（計画的に修正）**

```bash
# ESLintワーニング例（安全）
warning 'React' is defined but never used  @typescript-eslint/no-unused-vars
warning 'useState' is defined but never used  @typescript-eslint/no-unused-vars
warning Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
```

**対応**: 未使用削除・型定義改善

### **🟠 注意要ワーニング（慎重に修正）**

```bash
# React Hook依存関係例（高リスク）
warning React Hook useEffect has a missing dependency: 'user'  react-hooks/exhaustive-deps
warning React Hook useMemo has missing dependencies: 'data'  react-hooks/exhaustive-deps
```

**対応**: 機能確認後・テスト後に修正

---

## 📋 **修正パターン集**

### **Pattern 1: 未使用インポート削除**

```typescript
// ❌ 修正前
import { useState, useEffect, useMemo } from 'react'
import { Button, Card, Badge } from '@/components/ui'

// ✅ 修正後（useEffect, Badge未使用の場合）
import { useState, useMemo } from 'react'
import { Button, Card } from '@/components/ui'
```

### **Pattern 2: 未使用変数処理**

#### **🔹 即座に削除可能な場合**
```typescript
// ❌ 修正前
const [data, setData] = useState()
const [loading, setLoading] = useState(false)  // setLoading未使用

// ✅ 修正後
const [data, setData] = useState()
const [, setLoading] = useState(false)  // または完全削除
```

#### **🔸 将来使用予定の場合（underscore prefix）**
```typescript
// ❌ 修正前
function processData(userId: string, categoryId: string, metadata: object) {
  // userId, metadataは将来の実装で使用予定だが現在未使用
  return getData(categoryId)
}

// ✅ 修正後（将来使用予定を明示）
function processData(_userId: string, categoryId: string, _metadata: object) {
  // _userId, _metadataは将来の実装で使用予定
  return getData(categoryId)
}
```

#### **🔄 underscore prefixの運用ルール**

**付与基準**:
- 将来の機能拡張で使用予定
- API仕様上必要だが現在の実装では未使用
- テスト・デバッグ用途で一時的に無効化

**除去タイミング**:
```typescript
// ✅ 実際に使用するようになったら _ を除去
function processData(userId: string, categoryId: string, _metadata: object) {
  const user = await getUser(userId)  // userIdを実際に使用
  // _userId → userId に変更
  return processUserData(user, categoryId)
}
```

**ESLint設定**:
```javascript
// eslint.config.mjs で自動無視設定済み
"@typescript-eslint/no-unused-vars": [
  "warn", {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_", 
    "caughtErrorsIgnorePattern": "^_"
  }
]
```

### **Pattern 3: any型解決**

```typescript
// ❌ 修正前
const handleSubmit = (data: any) => {
  console.log(data.name, data.email)
}

// ✅ 修正後
interface FormData {
  name: string
  email: string
}
const handleSubmit = (data: FormData) => {
  console.log(data.name, data.email)
}
```

### **Pattern 4: React Hook依存関係（慎重）**

#### **🔹 基本的な依存関係追加**
```typescript
// ⚠️ 修正前（慎重に対応）
useEffect(() => {
  if (user) {
    loadUserData()
  }
}, [])  // ワーニング: 'user' missing dependency

// ✅ 修正後（機能確認後）
useEffect(() => {
  if (user) {
    loadUserData()
  }
}, [user])
```

#### **🔸 関数依存の場合（useCallback使用）**
```typescript
// ⚠️ 修正前
const loadSubcategories = async () => {
  // API呼び出し
}

useEffect(() => {
  loadSubcategories()
}, [isOpen])  // ワーニング: 'loadSubcategories' missing dependency

// ✅ 修正後
const loadSubcategories = useCallback(async () => {
  // API呼び出し
}, [category])  // categoryに依存する場合

useEffect(() => {
  loadSubcategories()
}, [isOpen, loadSubcategories])
```

#### **🔺 複雑なケース（useRefとuseCallback組み合わせ）**
```typescript
// ⚠️ 修正前（無限ループリスク）
const [dataLoading, setDataLoading] = useState(false)

useEffect(() => {
  const loadData = async () => {
    if (user?.id && !dataLoading) {
      setDataLoading(true)
      // データ読み込み
      setDataLoading(false)
    }
  }
  loadData()
}, [user?.id])  // dataLoadingが依存関係にない

// ✅ 修正後（useRefで状態管理）
const loadingRef = useRef(false)

const loadData = useCallback(async () => {
  if (user?.id && !loadingRef.current) {
    loadingRef.current = true
    // データ読み込み
    loadingRef.current = false
  }
}, [user?.id])

useEffect(() => {
  loadData()
}, [loadData])
```

---

## 🛠 **トラブルシューティング**

### **よくある問題と解決策**

#### **問題1: TypeScriptエラーが解決しない**
```bash
# 解決手順
1. npm install  # 依存関係更新
2. rm -rf .next  # ビルドキャッシュクリア
3. npx tsc --noEmit  # 再確認
```

#### **問題2: ESLint設定エラー**
```bash
# ESLintキャッシュクリア
rm -rf .eslintcache
npm run lint
```

#### **問題3: ビルドは成功するがエラー表示**
- TypeScriptの厳格設定確認
- tsconfig.json設定確認
- 型定義ファイル（.d.ts）確認

---

## 📊 **進捗管理**

### **週次チェック**
```bash
# 品質状況レポート
echo "=== 品質レポート $(date) ==="
echo "TypeScript:" && npx tsc --noEmit || echo "エラーあり"
echo "ESLint:" && npm run lint 2>&1 | tail -1
echo "Build:" && npm run build > /dev/null && echo "成功" || echo "失敗"
```

### **ドキュメント更新タイミング**
- **大きな改善後**: DEVELOPMENT_STATUS.md更新
- **リリース前**: RELEASE_HISTORY.md更新  
- **品質基準変更時**: このドキュメント更新

---

## 🎯 **目標管理**

### **🎉 達成済み目標**
- [x] ESLintワーニング 78個 → 0個 **完全達成！**
- [x] any型警告 完全解決
- [x] React Hooks依存関係警告 完全解決
- [x] TypeScriptエラー 0個維持
- [x] 完全な型安全性確立

### **次期目標（継続改善）**
- [ ] コード品質チェック自動化
- [ ] pre-commitフック導入
- [ ] 自動品質監視システム
- [ ] 新規コード品質基準100%維持

---

## ⚠️ **重要な注意事項**

### **修正時の禁止事項**
- ❌ 大量ファイルの一括修正
- ❌ 未検証でのReact Hook修正  
- ❌ 機能テスト省略
- ❌ TypeScriptエラーの放置

### **推奨事項**
- ✅ 小さな単位での段階的修正
- ✅ 修正前後の動作確認
- ✅ コミット前の必須チェック
- ✅ ペアプログラミング・コードレビュー

---

## 🔧 **ツール活用**

### **VS Code拡張機能（推奨）**
- TypeScript Importer
- ESLint
- Error Lens
- TypeScript Hero

### **コマンドエイリアス（推奨設定）**
```bash
# ~/.bashrc または ~/.zshrc に追加
alias tsc-check='npx tsc --noEmit'
alias lint-check='npm run lint'  
alias quality-check='tsc-check && lint-check'
```

---

*このドキュメントは品質向上の実践に基づいて継続的に更新されます。新しいパターンや問題が発見された場合は追記してください。*