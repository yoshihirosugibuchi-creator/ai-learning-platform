# 🚀 デプロイ前完全チェックリスト

**最終更新**: 2025年9月21日
**新機能**: 完全デプロイメント自動化システム対応

このチェックリストは、デプロイ失敗を防ぐために**必ず全項目を実行**してからコミット・プッシュを行うためのものです。

## 🎯 **推奨実行方法**

### ⚡ **完全自動実行（推奨）**
```bash
# 全工程を自動実行（マスタ・クイズ・コース学習データ含む）
npm run deploy:complete
```
**このコマンドで以下のPhase 1-4が自動実行されます:**
- データ同期（マスタ・チャレンジクイズ・コース学習）
- 整合性チェック・検証  
- ビルドテスト
- Lintチェック
- 総合判定・デプロイ可否

### 🔧 **段階的実行（トラブルシューティング用）**
自動実行で問題が発生した場合、以下の個別チェックリストを使用してください。

---

## 📋 **Phase 1: 事前準備チェック**

### 1.1 環境確認
```bash
# 現在のブランチとステータス確認
git status
git branch --show-current

# 最新の変更確認
git diff --name-only
```

- [ ] mainブランチにいることを確認
- [ ] 変更ファイル一覧を把握
- [ ] 意図しないファイル変更がないことを確認

### 1.2 依存関係確認
```bash
# 依存関係の整合性確認
npm ci

# package-lock.jsonの整合性確認
npm audit
```

- [ ] 依存関係インストール成功
- [ ] 重大な脆弱性がないことを確認

### 1.3 完全データ同期 ⚠️ **重要** 
```bash
# 【新システム】全データの完全同期
npm run deploy:sync

# 同期結果確認
ls -la public/data/
ls -la public/questions.json
ls -la public/learning-data/courses.json
```

**✅ 同期対象データ（完全対応）:**
- [ ] **カテゴリーマスタ** - categories テーブル同期成功
- [ ] **サブカテゴリーマスタ** - subcategories テーブル同期成功  
- [ ] **スキルレベルマスタ** - skill_levels テーブル同期成功
- [ ] **チャレンジクイズ問題データ** - `public/questions.json` 更新確認 🆕
- [ ] **クイズ統計データ** - `public/data/quiz-stats-fallback.json` 生成確認
- [ ] **コース学習メタデータ** - `public/learning-data/courses.json` 更新確認 🆕

**📊 新機能確認:**
```bash
# チャレンジクイズ問題数確認
grep -o '"id":' public/questions.json | wc -l

# コース学習データ整合性確認  
npm run check:course-consistency-static

# データ反映状況の詳細分析
npm run analyze:data-reflection
```

---

## 🔍 **Phase 2: コード品質チェック**

### 2.1 リントエラー完全チェック ⚠️ **重要**
```bash
# 全ファイルのリントエラーチェック
npm run lint

# エラーの詳細出力
npm run lint 2>&1 | tee lint-output.log

# エラー件数確認
npm run lint 2>&1 | grep "✖" | tail -1
```

- [ ] **リントエラー 0件** (warningは許可、errorは必ず修正)
- [ ] 未使用import削除済み
- [ ] TypeScript型エラー修正済み
- [ ] React Hook使用エラーなし

**⚠️ 注意**: エラーが1件でもある場合は**絶対に**プッシュしない

### 2.2 型チェック
```bash
# TypeScript型チェック
npx tsc --noEmit

# 型エラーの詳細確認
npx tsc --noEmit --pretty
```

- [ ] TypeScriptコンパイルエラー 0件
- [ ] any型の適切な使用（Record<string, unknown>等に置換）
- [ ] import/exportの型整合性確認

### 2.3 未使用コード確認
```bash
# 未使用exports確認（手動でファイル検索）
grep -r "export.*=" --include="*.ts" --include="*.tsx" . | head -20
```

- [ ] 使用されていないexport関数削除
- [ ] デバッグ用console.log削除（重要なもの以外）
- [ ] コメントアウトされたコード削除

---

## 🏗️ **Phase 3: ビルドテスト**

### 3.1 開発サーバー確認
```bash
# 開発サーバー起動テスト
npm run dev
```

- [ ] エラーなく起動
- [ ] メインページ（/）正常表示
- [ ] ナビゲーション動作確認
- [ ] コンソールエラーなし

### 3.2 本番ビルドテスト ⚠️ **必須**
```bash
# 本番ビルド実行
npm run build

# ビルド出力の詳細確認
npm run build 2>&1 | tee build-output.log

# ビルドサイズ確認
npm run build | grep "First Load JS"
```

- [ ] **ビルド成功** (exit code 0)
- [ ] コンパイルエラー 0件
- [ ] バンドルサイズが適切（First Load JS < 300KB推奨）
- [ ] 動的importエラーなし

### 3.3 本番モードテスト
```bash
# 本番モードで起動テスト
npm run start
```

- [ ] 本番モードで正常起動
- [ ] 主要ページアクセス確認
- [ ] API呼び出し動作確認

---

## 🧪 **Phase 4: 機能動作確認**

### 4.1 認証システム
- [ ] ログイン/ログアウト動作
- [ ] セッション管理動作（5分間放置テスト）
- [ ] 認証エラー時の適切なフォールバック

### 4.2 主要機能
- [ ] クイズ機能（ランダム・カテゴリー別）
- [ ] 学習機能（コース・セッション）
- [ ] プロフィール表示
- [ ] コレクション表示

### 4.3 API動作確認
```bash
# APIエンドポイントテスト（開発サーバー起動中）
curl -s http://localhost:3000/api/questions | jq '.questions | length'
```

- [ ] 主要APIレスポンス確認
- [ ] エラーハンドリング動作確認
- [ ] データベース接続確認

### 4.4 レスポンシブ確認
- [ ] モバイル表示確認
- [ ] タブレット表示確認
- [ ] デスクトップ表示確認

---

## 📱 **Phase 5: ブラウザテスト**

### 5.1 コンソールエラーチェック
- [ ] Chrome DevTools コンソールエラー 0件
- [ ] Network タブでAPI呼び出し成功
- [ ] Performance タブで大きなボトルネックなし

### 5.2 クロスブラウザ確認（本番前のみ）
- [ ] Chrome最新版
- [ ] Safari（macOS/iOS）
- [ ] Firefox最新版

---

## 📦 **Phase 6: Git操作**

### 6.1 変更内容確認
```bash
# 変更差分確認
git diff --cached

# 変更ファイル一覧
git diff --name-only --cached
```

- [ ] 意図した変更のみステージング
- [ ] 機密情報（API キー等）含まれていない
- [ ] 不要なファイル含まれていない

### 6.2 コミットメッセージ作成
```bash
# テンプレート例
git commit -m "$(cat <<'EOF'
[Type]: [Brief summary in English/Japanese]

### 主な変更点
- 変更内容1の詳細説明
- 変更内容2の詳細説明
- 修正したバグや改善点

### 技術的詳細
- リントエラー修正: X件
- 型エラー修正: Y件
- 新機能: 具体的な機能名

### テスト確認
- [ ] ローカルビルド成功
- [ ] リントエラー 0件
- [ ] 主要機能動作確認済み

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

- [ ] 適切なコミットタイプ（Fix/Add/Update/Refactor等）
- [ ] 変更内容の明確な説明
- [ ] テスト確認状況記載

---

## 🚀 **Phase 7: デプロイ実行**

### 7.1 最終確認
```bash
# 最終ステータス確認
git status

# リモートとの差分確認
git log origin/main..HEAD --oneline
```

- [ ] すべての変更がコミット済み
- [ ] プッシュ対象コミット確認

### 7.2 プッシュ実行
```bash
# リモートプッシュ
git push origin main

# プッシュ結果確認
echo "Push completed at: $(date)"
```

- [ ] プッシュ成功
- [ ] エラーメッセージなし

### 7.3 Vercelデプロイ監視
- [ ] Vercel Dashboard確認
- [ ] ビルドログ監視（5分以内）
- [ ] デプロイ成功確認

---

## 🔥 **Phase 8: 本番確認**

### 8.1 スモークテスト
- [ ] 本番URL正常アクセス
- [ ] 主要ページ表示確認
- [ ] 認証機能動作確認
- [ ] データベース接続確認

### 8.2 パフォーマンス確認
- [ ] 初回ロード時間 < 3秒
- [ ] Core Web Vitals正常範囲
- [ ] モバイル表示確認

---

## 📊 **Phase 9: 開発タスク管理**

### 9.1 eslint警告111件の管理 📝
今回のデプロイで**リントエラー74件 → 0件**に修正完了しましたが、**警告111件**が残存しています。

**警告の分類と対応方針**:
- **@typescript-eslint/no-unused-vars**: 未使用変数・imports（60-70件）
- **react-hooks/exhaustive-deps**: React Hook依存関係（10-15件）  
- **その他**: 型関連警告・命名規則など（25-35件）

**管理場所**: `DEVELOPMENT_STATUS.md` の **📋 開発予定機能 (未着手)** セクション

**優先度**: 
- **低** - コード品質向上 (1-2日) - eslint警告111件の段階的解決
- **中** - 本番リリース前対応 - Critical警告のみ修正

### 9.2 追加チェック項目 🔍
今回の作業で判明した改善点:

**Phase 2.2 型チェックの改善**:
```bash
# TypeScript型チェック結果の記録
npx tsc --noEmit 2>&1 | tee typescript-errors.log

# 型エラー件数確認  
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

- [ ] TypeScript型エラー件数を記録（今回126件検出）
- [ ] 型エラーの分類・優先度設定
- [ ] Next.js build成功と型エラーの関係明確化

**Phase 3.2 ビルドテストの改善**:
```bash
# ビルド時間とサイズのベンチマーク記録
npm run build 2>&1 | grep -E "(Compiled|First Load|finished)"
```

- [ ] ビルド時間記録（目標 < 10秒）
- [ ] First Load JSサイズ記録（目標 < 300KB）
- [ ] Turbopack利用状況確認

### 9.3 デプロイメント実行コマンド 🚀

#### **🎯 完全自動実行（推奨）**
```bash
# 【新システム】全工程自動実行（マスタ・クイズ・コース学習データ含む）
npm run deploy:complete
```
**実行内容**: データ同期 → 整合性チェック → ビルド → Lint → 総合判定

#### **🔧 段階的実行（従来互換）**
```bash
# 1. 全データ同期（マスタ・クイズ・コース学習）
npm run deploy:sync

# 2. 整合性チェック
npm run check:course-consistency-static

# 3. データ反映状況分析  
npm run analyze:data-reflection

# 4. ビルド + リント
npm run deploy:check

# 【旧システム】部分自動実行
npm run deploy:pre
```

#### **✅ 完了後の手動操作**
```bash
# 自動実行成功時のみ実行
git add . && git commit -m "Deploy: complete data sync and validation"
git push origin main
```

#### **📊 新システムの出力例**
```
🚀 完全デプロイメント実行を開始します...

📂 データ同期（マスタ・クイズ・コース学習）を実行中...
✅ データ同期（マスタ・クイズ・コース学習）完了 (45000ms)

📂 コース学習整合性チェック を実行中...
✅ コース学習整合性チェック 完了 (12000ms)

📂 データ反映状況分析 を実行中...
⚠️ 警告 データ反映状況分析 失敗 (8000ms)

📂 Next.js ビルド を実行中...
✅ Next.js ビルド 完了 (28000ms)

📂 ESLint チェック を実行中...
✅ ESLint チェック 完了 (15000ms)

🟢 すべての重要ステップが正常に完了しました。デプロイ可能です！
```

### 9.4 最終リリース前の追加チェック 🔍
**セキュリティチェック**:
- [ ] 環境変数に機密情報が含まれていないか確認
- [ ] console.log等のデバッグ出力削除
- [ ] エラーメッセージに機密情報が含まれていないか確認

**パフォーマンスチェック**:
- [ ] Lighthouse スコア確認（Performance > 90）
- [ ] Core Web Vitals測定
- [ ] モバイル・デスクトップ両方でのテスト

---

## 🆕 **完全デプロイメント自動化システム詳細**

### 📊 **対象データ完全対応表**

| データ種別 | 従来システム | 新システム | 詳細 |
|------------|-------------|------------|------|
| **マスタデータ** | ✅ 対応済み | ✅ **完全対応** | categories, subcategories, skill_levels |
| **チャレンジクイズ** | ❌ 統計のみ | ✅ **問題データ完全同期** | `public/questions.json` 自動更新 |
| **コース学習** | ❌ 対象外 | ✅ **整合性・メタデータ同期** | courses.ts検証, メタデータ更新 |
| **整合性チェック** | ❌ 手動 | ✅ **自動チェック** | 0エラー, 0警告の確認 |
| **総合判定** | ❌ 部分的 | ✅ **デプロイ可否自動判定** | 成功/失敗の明確な結果 |

### 🔧 **実行ファイル詳細**

#### **拡張されたスクリプト**
- `scripts/deploy-sync-fallback-data.ts` - 全データ同期（マスタ + クイズ + コース学習）
- `scripts/deploy-complete.ts` - 統合実行・監視・レポート生成
- `scripts/check-course-master-consistency-static.ts` - コース学習整合性チェック
- `scripts/analyze-data-reflection-status.ts` - データ反映状況分析

#### **package.json新コマンド**
```json
{
  "deploy:complete": "tsx scripts/deploy-complete.ts",
  "deploy:full": "npm run deploy:complete"
}
```

### ⚡ **パフォーマンス指標**

#### **実行時間目安**
- データ同期: 30-60秒（DB接続状況による）
- 整合性チェック: 10-15秒
- ビルド: 20-40秒（Turbopack使用）
- Lint: 10-20秒
- **総実行時間**: 1.5-2.5分

#### **成功基準**
- 必須ステップ成功率: 100%
- データ整合性エラー: 0件
- ビルドエラー: 0件
- 推奨ステップ成功率: 80%以上

### 🚨 **トラブルシューティング**

#### **よくある失敗パターン**
1. **環境変数不足**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
2. **DB接続タイムアウト**: 同期スクリプトが30秒でタイムアウト
3. **コース定義エラー**: `lib/learning/courses.ts`の構文エラー
4. **ビルドエラー**: TypeScript型エラー未解決

#### **個別実行での診断**
```bash
# 1. データ同期のみテスト
npm run deploy:sync

# 2. 整合性チェックのみテスト  
npm run check:course-consistency-static

# 3. ビルドのみテスト
npm run build

# 4. Lintのみテスト
npm run lint
```

---

## ⚠️ **緊急時対応**

### ロールバック手順
```bash
# 緊急ロールバック（最新コミット取り消し）
git log --oneline -5  # 安全なコミット確認
git revert HEAD
git push origin main

# または強制リセット（最終手段）
git reset --hard [安全なコミットID]
git push --force origin main
```

### よくあるエラーと対処法

#### 1. ビルドエラー
```bash
# エラー詳細確認
npm run build -- --debug

# キャッシュクリア
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### 2. Vercelデプロイエラー
- ビルドログで具体的エラー確認
- 環境変数設定確認
- 必要に応じてロールバック

#### 3. 本番環境エラー
- リアルタイムログ確認
- データベース接続状況確認
- 即座にロールバック判断

---

## 📊 **品質指標**

### デプロイ前必須条件
- ✅ リントエラー: **0件**
- ✅ TypeScriptエラー: **0件**
- ✅ ビルド成功: **必須**
- ✅ 主要機能動作: **必須**

### 推奨条件
- 🎯 バンドルサイズ: < 300KB
- 🎯 ロード時間: < 3秒
- 🎯 コンソールwarning: < 5件

---

## 🎯 **今後の改善点**

### 自動化検討項目
1. **pre-commitフック**: リント・型チェック自動実行
2. **CI/CD パイプライン**: GitHub Actionsでテスト自動化
3. **E2Eテスト**: Playwrightで主要フロー自動テスト

### 監視強化
1. **エラー監視**: Sentryなどでリアルタイム監視
2. **パフォーマンス監視**: Web Vitals監視
3. **ログ集約**: 本番環境ログの一元管理

---

## 📝 **チェックリスト実行ログ**

デプロイ時は以下をコピーして記録：

```
=== Deploy Checklist Execution Log ===
Date: YYYY-MM-DD HH:MM:SS
Branch: main
Commit: [commit-hash]

Phase 1 - 事前準備: [ ]
Phase 2 - コード品質: [ ]
  - Lint errors: 0件
  - TypeScript errors: 0件
Phase 3 - ビルドテスト: [ ]
  - Build success: Yes/No
Phase 4 - 機能確認: [ ]
Phase 5 - ブラウザテスト: [ ]
Phase 6 - Git操作: [ ]
Phase 7 - デプロイ実行: [ ]
Phase 8 - 本番確認: [ ]

Deploy Result: Success/Failed
Notes: [特記事項]
```

---

**🔴 重要**: このチェックリストの**全項目を実行**してからデプロイしてください。項目をスキップしたデプロイは禁止です。