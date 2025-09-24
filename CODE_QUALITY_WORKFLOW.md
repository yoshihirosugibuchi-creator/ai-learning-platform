# コード品質管理ワークフロー

**目的**: プログラミング時のエラー・ワーニングチェック手順  
**対象**: 開発者・コード修正作業者  
**最終更新**: 2025年9月24日  
**達成状況**: TypeScript 199→0エラー、ESLint 151→78警告（51%改善）

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

```typescript
// ❌ 修正前
const [data, setData] = useState()
const [loading, setLoading] = useState(false)  // setLoading未使用

// ✅ 修正後
const [data, setData] = useState()
const [, setLoading] = useState(false)  // または完全削除
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
}, [user])  // または useCallback使用
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

### **短期目標（1-2週間）**
- [ ] ESLintワーニング 78個 → 50個以下
- [ ] 新規TypeScriptエラー 0個維持
- [ ] ビルド成功率 100%維持

### **中期目標（1ヶ月）**
- [ ] ESLintワーニング 50個 → 20個以下
- [ ] コード品質チェック自動化
- [ ] pre-commitフック導入

### **長期目標（2-3ヶ月）**  
- [ ] ESLintワーニング 20個 → 0個
- [ ] 完全な型安全性確立
- [ ] 自動品質監視システム

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