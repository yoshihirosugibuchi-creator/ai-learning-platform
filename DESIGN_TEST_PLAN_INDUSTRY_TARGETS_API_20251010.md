# DESIGN_TEST_PLAN_INDUSTRY_TARGETS_API_20251010.md

## 機能: 業界目標管理API認証修正

### 影響範囲分析結果
- **修正対象**: components/admin/IndustryTargetManagement.tsx (line 51-68)
- **新規作成**: app/api/admin/industry-targets/route.ts
- **呼び出し元**: app/admin/industry-targets/page.tsx のみ
- **影響するコードパス**: クライアントサイド → API → サーバーサイド処理

### 必須テストケース

#### 1. **全コードパステスト**
- [ ] **パス1**: 未ログイン状態 → 認証エラー表示
- [ ] **パス2**: ログイン済み・管理者権限なし → 403エラー表示  
- [ ] **パス3**: ログイン済み・管理者権限あり → データ正常取得・表示
- [ ] **パス4**: 業界・レベルフィルター選択 → フィルタリングされたデータ表示

#### 2. **統合機能テスト**
- [ ] **認証システム**: セッション取得・トークン送信の正常動作
- [ ] **API認証**: Authorization Bearer ヘッダーの正常処理
- [ ] **データベース読み取り**: supabaseAdmin経由の正常アクセス
- [ ] **エラーハンドリング**: 適切なエラーメッセージ表示

#### 3. **エラーハンドリングテスト**
- [ ] **認証失敗時**: 「認証が必要です」メッセージ表示
- [ ] **権限不足時**: 「管理者権限が必要です」メッセージ表示
- [ ] **API エラー時**: 具体的なエラー情報表示
- [ ] **ネットワークエラー時**: 適切なフォールバック動作

### 実装後チェックリスト
- [ ] **全テストケース実行完了**: 4つのコードパス + 統合機能 + エラーハンドリング
- [ ] **TypeScript/ESLintエラー0確認**: `npm run typecheck && npm run lint`
- [ ] **ビルドテスト成功確認**: `npm run build`
- [ ] **開発環境での動作確認**: http://localhost:3001/admin/industry-targets
- [ ] **本番環境での動作確認**: https://ai-learning-platform-ochre.vercel.app/admin/industry-targets

### セキュリティ考慮事項
- [x] **SUPABASE_SERVICE_ROLE_KEY**: サーバーサイドのみ使用（クライアント露出なし）
- [x] **認証トークン**: 適切なBearer認証実装
- [x] **管理者権限チェック**: system_admin/admin ロール確認
- [x] **RLS回避**: サービスロールキー使用で適切にRLSをバイパス

### リスク評価
- **低リスク**: 読み取り専用API、既存機能への影響なし
- **改善点**: セキュリティが向上（以前はクライアントサイドで直接supabaseAdmin使用）
- **依存関係**: 他機能への影響なし（業界目標管理のみ）

---
作成日: 2025年10月10日
作成者: Claude Code Assistant