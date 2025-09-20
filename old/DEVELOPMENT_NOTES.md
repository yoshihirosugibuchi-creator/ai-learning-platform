# 開発メモ

## 現在の開発状況（2025-09-17）

### ✅ 完成した機能

1. **クイズシステム** - ランダムクイズ、結果保存
2. **コース学習システム** - 体系的学習、セッション管理
3. **バッジシステム** - コース完了時の修了証発行
4. **カード収集システム** - 格言カード、ナレッジカード
5. **コレクションページ** - 3つのタブ（格言カード、ナレッジカード、修了証）
6. **ユーザー認証** - Supabase Auth統合
7. **学習分析** - 進捗追跡、統計表示

### 🔧 現在の技術的な状況

#### データベース設定
- **RLS（Row Level Security）**: 開発効率のため一時的に無効化
- **理由**: 406エラー対策のため
- **対応**: 本番リリース前に有効化必要（PRODUCTION_CHECKLIST.md参照）

#### 解決済みの問題
- ✅ React Hooks順序エラー - useEffectの配置修正で解決
- ✅ 406 Not Acceptable エラー - RLS無効化で解決
- ✅ ナビゲーション性能問題 - キャッシュ最適化で解決
- ✅ 認証状態フリッカー - ローディング状態管理で解決

### 📦 技術スタック

- **Frontend**: Next.js 15.5.2, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React useState + custom hooks
- **File Structure**: 
  - `/app` - Next.js App Router
  - `/components` - 再利用可能コンポーネント
  - `/lib` - ビジネスロジック、データアクセス
  - `/public` - 静的ファイル（バッジ画像等）

### 🗄️ データベーステーブル

1. `quiz_results` - クイズ結果
2. `user_progress` - ユーザー進捗
3. `knowledge_card_collection` - ナレッジカード収集
4. `wisdom_card_collection` - 格言カード収集
5. `user_badges` - 修了証・バッジ
6. `learning_sessions` - 学習セッション記録

### 🎯 次の開発タスク候補

- [ ] 管理者ダッシュボード
- [ ] コース作成・編集機能
- [ ] より詳細な学習分析
- [ ] SNS共有機能
- [ ] 通知システム
- [ ] モバイルアプリ対応

### ⚠️ 重要な注意事項

1. **本番リリース前**: PRODUCTION_CHECKLIST.mdを必ず実行
2. **RLS設定**: セキュリティのため本番では有効化必須
3. **環境変数**: 本番用Supabase設定への切り替え

---

最終更新: 2025-09-17