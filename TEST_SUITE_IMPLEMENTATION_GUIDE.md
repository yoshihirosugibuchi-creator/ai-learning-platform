# テストスイート実装ガイド・デグレ対策完全版

**作成日**: 2025年10月15日  
**目的**: 包括的テストスイート導入によるデグレ防止・品質管理強化  
**対象**: 開発チーム・品質管理・CI/CD運用  

---

## 🎯 **実装完了事項（2025.10.15）**

### **A. テスト環境基盤構築**

#### **1. 必須パッケージ導入**
```bash
# 実行済みコマンド
npm install jest @jest/globals node-mocks-http zod --save-dev
```

#### **2. Jest設定ファイル作成**
- **`jest.config.js`**: TypeScript対応、パスマッピング、カバレッジ設定
- **`jest.setup.js`**: テスト環境初期化、グローバルユーティリティ
- **重要修正**: `moduleNameMapper`設定（`moduleNameMapping`から修正）

#### **3. 実装済みテストファイル**
```
tests/
├── api/
│   └── course-completion.test.ts     # API統合テスト
├── integration/
│   └── schema-regression.test.ts     # DB回帰テスト  
└── utils/
    └── basic.test.ts                 # 基本動作確認
```

### **B. テスト品質状況**

#### **現在の実行結果**
- **✅ Test Suites**: 3 passed / 3 total
- **✅ Tests**: 54 passed, 10 todo / 64 total  
- **⏱️ 実行時間**: 0.688秒
- **🔧 設定**: TypeScript、モック、非同期処理 全て正常動作

#### **カバレッジ対象**
```javascript
// jest.config.js - collectCoverageFrom
'app/**/*.{ts,tsx}',      // APIルート
'lib/**/*.{ts,tsx}',      // ライブラリ関数
'components/**/*.{ts,tsx}' // Reactコンポーネント
```

---

## 🧪 **テストカテゴリ別実装状況**

### **1. API統合テスト（course-completion.test.ts）**

#### **✅ 実装完了**
- **リクエストバリデーション**: Zodスキーマによる厳密検証
- **レスポンス形式テスト**: 成功・エラー両パターン対応
- **XP計算ロジック**: 基本XP・ボーナスXP検証
- **データ処理フロー**: セッション完了・カード獲得・コース完了

#### **📋 TODO実装**
```typescript
// 今後実装予定（test.todo形式）
- '❌ 認証ヘッダーなしでの適切なエラー処理'
- '❌ 無効トークンでの認証エラー処理'  
- '❌ Supabaseエラー時の適切なエラーレスポンス'
- '❌ 存在しないセッションIDでの400エラー'
- '❌ 重複完了時の適切な処理'
- '✅ API応答時間が5秒以内'
- '✅ 10並行リクエストの正常処理'
```

### **2. データベース回帰テスト（schema-regression.test.ts）**

#### **✅ 実装完了**
- **テーブル構造検証**: 全13テーブルの期待スキーマ定義
- **外部キー制約**: user_id、session_id関係性チェック
- **データ型検証**: UUID、JSONB、TIMESTAMP型確認
- **RLSポリシー**: Row Level Security設定確認
- **マイグレーション**: V1→V2移行状況確認

#### **📊 対象テーブル**
```sql
-- V2システム（現行）
users, course_session_completions, course_theme_completions,
course_completions, user_xp_stats_v2, user_category_xp_stats_v2,
user_subcategory_xp_stats_v2, user_knowledge_collection_v2,
quiz_sessions, quiz_answers, wisdom_card_collection,
skp_transactions, daily_xp_records

-- 削除確認対象（V1レガシー）
user_progress, quiz_results, detailed_quiz_data,
knowledge_card_collection, user_xp_stats, user_category_xp_stats,
user_subcategory_xp_stats
```

### **3. 基本動作確認テスト（basic.test.ts）**

#### **✅ 実装完了**
- **Jest環境**: モック機能、非同期処理、ユーティリティ
- **環境変数**: NODE_ENV、TZ、Supabase設定
- **パフォーマンス**: 実行時間、タイムアウト設定
- **ログ制御**: console.log/error制御確認

---

## 🚨 **デグレ防止戦略**

### **A. 自動実行フロー**

#### **1. 開発時実行**
```bash
# 修正後の必須チェック
npm run typecheck    # TypeScriptエラー: 0必須
npm run lint         # ESLintエラー: 0必須  
npm test             # テストスイート: 全PASS必須
npm run build        # ビルド: 成功必須
```

#### **2. CI/CD統合準備**
```yaml
# .github/workflows/test.yml（準備中）
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint  
      - run: npm test
      - run: npm run build
```

### **B. テスト実行パターン**

#### **全体テスト実行**
```bash
npm test                    # 全テストスイート実行
npm test -- --verbose       # 詳細ログ付き実行
npm test -- --coverage      # カバレッジレポート生成
```

#### **個別テスト実行**
```bash
npm test course-completion     # API統合テストのみ
npm test schema-regression     # DB回帰テストのみ  
npm test basic                # 基本動作テストのみ
```

#### **ウォッチモード**
```bash
npm test -- --watch          # ファイル変更時自動実行
npm test -- --watchAll       # 全ファイル監視モード
```

---

## 📋 **今後の実装計画**

### **Phase 1: API認証・エラーハンドリング強化**

#### **1. 認証テスト実装**
```typescript
// tests/api/auth.test.ts（新規作成予定）
describe('🔐 認証システムテスト', () => {
  test('有効なJWTトークンでの認証成功', async () => {
    // Supabase認証フローのモック実装
  })
  
  test('期限切れトークンでの401エラー', async () => {
    // 期限切れトークンの適切なエラー処理
  })
  
  test('権限不足ユーザーでの403エラー', async () => {
    // role別権限チェック（admin、user、system_admin）
  })
})
```

#### **2. データベースエラーテスト**
```typescript
// tests/integration/database-error.test.ts（新規作成予定）
describe('🗄️ データベースエラーハンドリング', () => {
  test('接続タイムアウト時の適切なフォールバック', async () => {
    // Supabase接続エラーのモック
  })
  
  test('制約違反時のエラーレスポンス', async () => {
    // 外部キー制約違反、UNIQUE制約違反等
  })
})
```

### **Phase 2: E2E統合テスト実装**

#### **1. コース学習フローテスト**
```typescript
// tests/e2e/course-learning.test.ts（新規作成予定）
describe('📚 コース学習E2Eテスト', () => {
  test('prompt_basicsテーマ完了フルフロー', async () => {
    // 1. セッション開始 → 2. 学習実行 → 3. クイズ回答 
    // → 4. 完了処理 → 5. XP付与 → 6. カード獲得確認
  })
  
  test('business-fundamentalsコース完全制覇', async () => {
    // 全テーマ順次完了 → コース完了判定 → 修了証発行
  })
})
```

#### **2. ナレッジカードシステムテスト**
```typescript
// tests/e2e/knowledge-cards.test.ts（新規作成予定）
describe('🎴 ナレッジカードシステムE2E', () => {
  test('カード獲得からコレクション表示まで', async () => {
    // テーマ完了 → カード獲得 → コレクション更新 → フィルター動作
  })
  
  test('階層ソート機能（コース→ジャンル→テーマ）', async () => {
    // 複数カード獲得 → ソート順確認 → フィルター切り替え
  })
})
```

### **Phase 3: パフォーマンス・負荷テスト**

#### **1. API応答時間テスト**
```typescript
// tests/performance/api-performance.test.ts（新規作成予定）
describe('⚡ APIパフォーマンステスト', () => {
  test('コース完了API 5秒以内レスポンス', async () => {
    // 大量データ条件でのレスポンス時間測定
  })
  
  test('並行10リクエスト正常処理', async () => {
    // 複数ユーザー同時アクセス時の処理能力確認
  })
})
```

#### **2. データベースパフォーマンス**
```typescript
// tests/performance/db-performance.test.ts（新規作成予定）
describe('🗄️ データベースパフォーマンス', () => {
  test('大量データでのクエリ実行時間', async () => {
    // 10,000レコード条件でのSELECT性能
  })
  
  test('統計計算処理の最適化確認', async () => {
    // XP/SKP集計処理の効率性検証
  })
})
```

---

## 🔧 **テスト実施準備・運用手順**

### **A. 開発者向け実施手順**

#### **1. 修正前テスト実行**
```bash
# 現在の状況確認
echo "=== 修正前品質状況 ==="
npm run typecheck && npm run lint && npm test
```

#### **2. 修正実施**
```bash
# 段階的修正推奨
echo "=== 1ファイルずつ修正・テスト実行 ==="
# ファイル修正
npm test [関連テストファイル]  # 即座に影響確認
```

#### **3. 修正後完全チェック**
```bash
echo "=== 修正後完全品質チェック ==="
npm run typecheck  # TypeScript: エラー0必須
npm run lint       # ESLint: エラー0必須
npm test           # 全テスト: PASS必須
npm run build      # ビルド: 成功必須
```

### **B. デプロイ前必須確認**

#### **1. 完全テストスイート実行**
```bash
# 本番デプロイ前チェックリスト
echo "🔍 デプロイ前テストスイート実行"
npm test -- --coverage --verbose
echo "📊 カバレッジレポート確認"
echo "⚡ パフォーマンステスト実行"  
echo "🔄 回帰テスト実行"
```

#### **2. 手動コア機能確認**
```markdown
## 必須手動テスト項目:
- [ ] ログイン・ログアウト正常動作
- [ ] ランダムクイズ実行・XP付与確認
- [ ] カテゴリークイズ実行・統計更新確認  
- [ ] コース学習実行・ナレッジカード獲得確認
- [ ] プロフィール画面・統計表示確認
- [ ] エラーハンドリング・認証エラー確認
```

### **C. CI/CD統合計画**

#### **1. GitHub Actions設定**
```yaml
# 今後導入予定の自動化フロー
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-check:
    # TypeScript、ESLint、テスト、ビルドの順次実行
  
  performance-test:
    # パフォーマンステストの自動実行
    
  security-scan:  
    # セキュリティ脆弱性スキャン
```

#### **2. デプロイ前ゲート**
```markdown
## 自動デプロイ条件:
- [ ] 全テストスイート PASS
- [ ] カバレッジ 80%以上維持
- [ ] パフォーマンステスト基準内
- [ ] セキュリティスキャン クリア
- [ ] 手動承認（重要変更時）
```

---

## 📊 **品質メトリクス・監視項目**

### **A. テスト品質指標**

#### **1. カバレッジ目標**
```javascript
// 目標設定
const coverageThresholds = {
  global: {
    branches: 80,      // 分岐カバレッジ 80%以上
    functions: 85,     // 関数カバレッジ 85%以上  
    lines: 80,         // 行カバレッジ 80%以上
    statements: 80     // 文カバレッジ 80%以上
  }
}
```

#### **2. テスト実行時間監視**
```markdown
## パフォーマンス基準:
- 全テストスイート実行: 5秒以内
- API統合テスト: 2秒以内
- データベーステスト: 3秒以内
- 基本動作テスト: 1秒以内
```

### **B. 継続監視項目**

#### **1. デグレ検知指標**
- **新規テスト失敗率**: 5%以下維持
- **既存テスト安定性**: 98%以上PASS維持
- **ビルド失敗率**: 2%以下維持
- **本番エラー発生率**: 月1件以下

#### **2. 開発効率指標**
- **修正→テスト→デプロイ**: 1時間以内完了
- **テスト実行頻度**: 1日10回以上
- **カバレッジ向上率**: 月5%向上目標

---

## 🛠️ **運用・メンテナンス計画**

### **A. 定期メンテナンス**

#### **1. 月次レビュー**
```markdown
## 月次テストスイートレビュー:
- [ ] 新機能に対するテスト追加状況確認
- [ ] カバレッジレポート分析
- [ ] パフォーマンス劣化検知
- [ ] テストケース追加・削除判断
- [ ] CI/CD効率化検討
```

#### **2. 四半期改善**
```markdown  
## 四半期品質改善:
- [ ] E2Eテストシナリオ拡張
- [ ] パフォーマンステスト基準見直し
- [ ] セキュリティテスト強化
- [ ] テスト自動化範囲拡大
- [ ] 開発者フィードバック収集・改善
```

### **B. トラブルシューティング**

#### **1. テスト失敗時対応**
```bash
# テスト失敗時の標準対応フロー
echo "🚨 テスト失敗発生"
echo "1. 失敗箇所特定: npm test -- --verbose"
echo "2. ローカル再現: npm test [失敗テスト名]"  
echo "3. ログ詳細確認: TEST_VERBOSE=true npm test"
echo "4. 修正実施後: npm test -- --watch"
echo "5. 全体確認: npm run typecheck && npm test"
```

#### **2. 緊急時回避手順**
```markdown
## 本番障害時の緊急対応:
1. **即座にロールバック**: git revert + デプロイ
2. **影響範囲特定**: エラーログ + 監視指標確認
3. **根本原因調査**: テスト環境での再現
4. **修正・テスト**: 完全テストスイート実行
5. **段階的デプロイ**: テスト環境 → ステージング → 本番
```

---

## 📚 **参考資料・関連ドキュメント**

### **プロジェクト内ドキュメント**
- `CLAUDE.md` - 開発ガイド・禁止事項
- `QUALITY_MANAGEMENT_FLOW.md` - 品質管理フロー
- `DEPLOYMENT_MASTER_GUIDE.md` - デプロイメント手順
- `DATABASE_GUIDELINES.md` - データベース運用指針

### **テスト関連設定ファイル**
- `jest.config.js` - Jest設定
- `jest.setup.js` - テスト環境初期化
- `tsconfig.json` - TypeScript設定
- `eslint.config.mjs` - ESLint設定

---

## ✅ **チェックリスト**

### **開発者向け日次チェック**
- [ ] 修正前: `npm run typecheck && npm run lint && npm test`
- [ ] 修正後: 関連テスト実行確認
- [ ] コミット前: 全品質チェック完了
- [ ] デプロイ前: 手動コア機能確認

### **チームリーダー向け週次チェック**
- [ ] テストカバレッジレポート確認
- [ ] CI/CD実行ログ確認  
- [ ] デグレ発生件数確認
- [ ] 新規テストケース追加状況確認

### **プロジェクトマネージャー向け月次チェック**
- [ ] 品質指標達成状況確認
- [ ] テストスイート拡張計画進捗確認
- [ ] 開発効率指標分析
- [ ] 次月改善計画策定

---

*このドキュメントは継続的な品質向上とデグレ防止を目的として作成されました。テストスイートの拡張・改善に合わせて定期的に更新してください。*

**最終更新**: 2025年10月15日  
**作成者**: Claude Code AI Assistant  
**承認**: [チームリーダー承認予定]