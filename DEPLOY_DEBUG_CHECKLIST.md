# デバッグ時のDeploy手順チェックリスト

## 事前チェック（必須）

### 1. ローカルビルドテスト
```bash
# 必ず実行してからコミット
npm run build
```
- ✅ ビルドエラーがないことを確認
- ❌ エラーがある場合は修正してから次へ

### 2. 構文エラーチェック項目
- [ ] setTimeoutのネスト構造確認
- [ ] 括弧の対応関係（{}, [], ()）
- [ ] 関数の終了位置確認
- [ ] import文の構文確認
- [ ] TypeScript型エラー確認

## Deploy手順

### Stage 1: ローカル確認
```bash
# 1. 開発サーバー確認
npm run dev

# 2. ビルドテスト（重要）
npm run build

# 3. 型チェック（オプション）
npm run type-check  # 設定されている場合
```

### Stage 2: Git操作
```bash
# 1. 変更状況確認
git status
git diff --name-only

# 2. 関連ファイルのみステージング
git add [修正したファイル名]

# 3. 意味のあるコミットメッセージ
git commit -m "Fix: [具体的な修正内容]

- 修正内容1
- 修正内容2

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Stage 3: Deploy実行
```bash
# 1. リモートプッシュ
git push origin main

# 2. Vercelデプロイ監視
# - Vercel Dashboard確認
# - ビルドログ確認
# - エラー発生時は即座に修正
```

## 今回の反省点と学習事項

### 問題発生した箇所
1. **setTimeout構文エラー**
   - ネストしたsetTimeoutの括弧不整合
   - 関数終了後の孤立コード
   - Expression expectedエラー

### 根本原因
- ローカルビルドテストを怠った
- 大幅なコード変更後の構文チェック不足
- setTimeoutのコールバック構造の理解不足

### 改善策
1. **必須チェック**
   ```bash
   # 毎回実行
   npm run build
   ```

2. **構文エラー予防**
   - 複雑なネスト構造は段階的に作成
   - setTimeout等の非同期処理は単純化
   - 括弧の対応をエディタで確認

3. **段階的deploy**
   - 小さな変更単位でコミット
   - 大幅変更時は特に慎重に

## エラー別対処法

### 1. 構文エラー (Parsing failed)
```bash
# 問題箇所特定
npm run build 2>&1 | grep -A 5 -B 5 "Parsing"

# 対処
# - 該当行の括弧確認
# - setTimeoutのネスト構造確認
# - 関数の終了位置確認
```

### 2. TypeScript型エラー
```bash
# 型チェック
npx tsc --noEmit

# 対処
# - import文確認
# - 型定義確認
# - any型の適切な使用
```

### 3. Runtime エラー
```bash
# 開発サーバーでの確認
npm run dev

# ブラウザコンソール確認
# Network タブでAPI エラー確認
```

## 緊急時のrollback手順

### 1. 即座のrevert
```bash
# 最新コミットを取り消し
git revert HEAD
git push origin main
```

### 2. 特定コミットに戻す
```bash
# 安全な状態のコミットID確認
git log --oneline -10

# 該当コミットにリセット
git reset --hard [コミットID]
git push --force origin main  # 注意: 慎重に実行
```

## ベストプラクティス

### 1. commit前の必須チェック
- [ ] `npm run build` 成功
- [ ] 変更ファイルの構文確認
- [ ] 関連する型定義の確認

### 2. deploy監視
- [ ] Vercel Dashboard確認
- [ ] ビルドログ確認
- [ ] 本番環境でのスモークテスト

### 3. 段階的deploy
1. 小さな修正 → テスト → コミット
2. 機能追加 → ローカルテスト → ビルドテスト → コミット
3. 大幅変更 → 十分なテスト → 段階的コミット

## まとめ

**金鉄則: コミット前に必ず `npm run build` を実行する**

これにより、今回のような構文エラーによるVercelデプロイ失敗を防げます。