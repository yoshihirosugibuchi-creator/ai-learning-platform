# データ管理共通仕様

このドキュメントは、AIラーニングプラットフォームにおけるデータ管理の共通仕様を定義します。

## 概要

本プラットフォームでは、**データベース（Supabase）をプライマリソース**とし、**JSONファイルをバックアップ・フォールバック**として活用するハイブリッドアプローチを採用しています。

## データ管理原則

### 1. データフロー

```
1. アプリケーション → データベース（Supabase）
2. データベース → JSON同期（管理者操作）
3. データベース障害時 → JSONフォールバック（自動）
```

### 2. データ一貫性

- **プライマリソース**: Supabase PostgreSQL
- **セカンダリソース**: JSONファイル（public/配下）
- **同期方向**: DB → JSON（一方向）
- **更新頻度**: 管理者によるマニュアル同期

### 3. 障害対応

- **DB接続エラー**: 自動的にJSONフォールバック
- **JSON読み込みエラー**: 空配列またはnullを返却
- **キャッシュ戦略**: 5-10分間のメモリキャッシュ

## 実装パターン

### A. チャレンジクイズデータ（既存実装）

#### ファイル構成
- **データベース**: `quiz_questions`テーブル
- **JSONファイル**: `public/questions.json`
- **APIエンドポイント**: 
  - `/api/questions` (読み取り専用)
  - `/api/admin/questions/db` (管理者用DB同期)

#### 実装例
```typescript
// lib/questions.ts
export async function getAllQuestions(): Promise<Question[]> {
  try {
    console.log('📡 Fetching questions from DB API')
    const response = await fetch('/api/questions')
    // DB処理...
    return questions
  } catch (error) {
    console.log('🔄 Falling back to JSON file...')
    return await loadQuestionsFromJSON()
  }
}
```

### B. コース学習データ（新規実装）

#### ファイル構成
- **データベース**: 
  - `learning_courses`
  - `learning_genres` 
  - `learning_themes`
  - `learning_sessions`
  - `session_contents`
  - `session_quizzes`
- **JSONファイル**: 
  - `public/learning-data/courses.json`
  - `public/learning-data/{courseId}.json`
- **APIエンドポイント**:
  - `/api/admin/learning/db` (管理者用DB同期)

#### 実装例
```typescript
// lib/learning/data.ts
export async function getLearningCourses() {
  if (USE_DATABASE) {
    try {
      console.log('📡 Fetching learning courses from DB API')
      const courses = await getCoursesFromDB()
      return courses
    } catch (error) {
      console.log('🔄 Falling back to JSON files...')
      return await loadLearningCoursesFromJSON()
    }
  }
  return await loadLearningCoursesFromJSON()
}
```

## 管理者機能

### 1. DB→JSON同期API

#### エンドポイント
- **チャレンジクイズ**: `POST /api/admin/questions/db`
- **コース学習**: `POST /api/admin/learning/db`

#### 同期処理フロー
1. DBから全データを取得
2. JSON形式に変換
3. 既存JSONファイルをバックアップ
4. 新しいJSONファイルを書き込み
5. 結果をレスポンス

#### リクエスト例
```bash
curl -X POST /api/admin/learning/db \
  -H "Content-Type: application/json" \
  -d '{"updateMode": "sync"}'
```

#### レスポンス例
```json
{
  "success": true,
  "message": "Successfully synced 7 files",
  "stats": {
    "totalCourses": 6,
    "totalGenres": 8,
    "totalThemes": 13,
    "totalSessions": 39
  },
  "updateResults": [
    {
      "file": "courses.json",
      "status": "updated",
      "items": 6
    }
  ]
}
```

### 2. フィーチャーフラグ

各データタイプで`USE_DATABASE`フラグによる切り替えが可能：

```typescript
// チャレンジクイズ: 常にDB優先（フォールバック付き）
// コース学習: フィーチャーフラグ制御
const USE_DATABASE = true // true: DB, false: JSON
```

## 開発ガイドライン

### 1. 新しいデータタイプの追加

新しいデータタイプを追加する場合は以下のパターンに従ってください：

1. **Supabaseテーブル設計**
   - 適切な正規化
   - 外部キー制約
   - インデックス設定

2. **データアクセス層**
   - `lib/{datatype}/supabase-data.ts`: DB専用アクセス関数
   - `lib/{datatype}/data.ts`: フォールバック付きメイン関数

3. **管理者API**
   - `app/api/admin/{datatype}/db/route.ts`: 同期エンドポイント

4. **JSONフォールバック**
   - `public/{datatype}/` 配下にJSONファイル
   - フォールバック専用関数の実装

### 2. エラーハンドリング

#### ログレベル
- **📡**: DB API呼び出し開始
- **✅**: 正常完了
- **❌**: エラー発生
- **🔄**: フォールバック実行
- **📄**: JSON読み込み
- **🚀**: キャッシュヒット

#### キャッシュ戦略
- **短期キャッシュ**: 5分（頻繁に変更される可能性）
- **中期キャッシュ**: 10分（比較的安定）
- **キャッシュキー命名**: `{type}_{subtype}_db`

### 3. パフォーマンス考慮事項

#### DB最適化
- 並列クエリの活用（Promise.all）
- 適切なインデックス設計
- バッチ処理での大量データ処理

#### フォールバック最適化
- 必要最小限のJSONファイル読み込み
- 適切なキャッシュ活用
- エラー時の迅速なフォールバック

## セキュリティ考慮事項

### 1. 管理者API保護
- 認証・認可の実装が必要（将来実装）
- CSRF保護
- レート制限

### 2. データ整合性
- バックアップファイルの自動作成
- トランザクション処理
- データ検証

### 3. 本番環境での注意点
- JSONファイルの書き込み権限
- 大量データ処理時のタイムアウト対策
- エラー監視とアラート

## 監視・運用

### 1. ヘルスチェック
- DB接続状態の監視
- JSONファイルの整合性チェック
- フォールバック発生頻度の監視

### 2. メトリクス
- API応答時間
- キャッシュヒット率
- エラー発生率
- データ同期頻度

### 3. 運用手順
- 定期的なDB→JSON同期
- バックアップファイルの管理
- パフォーマンス監視とチューニング

## 参考実装

### チャレンジクイズ実装ファイル
- `lib/questions.ts`: メインアクセス関数
- `app/api/questions/route.ts`: DB読み取りAPI
- `app/api/admin/questions/db/route.ts`: DB同期API
- `app/api/admin/questions/route.ts`: JSON操作API（レガシー）

### コース学習実装ファイル
- `lib/learning/data.ts`: メインアクセス関数
- `lib/learning/supabase-data.ts`: DB専用関数
- `app/api/admin/learning/db/route.ts`: DB同期API
- `database/learning_content_schema.sql`: テーブル定義

## 更新履歴

- **2025-09-20**: 初版作成
- コース学習データのDB→JSON同期・フォールバック機能実装
- チャレンジクイズパターンのドキュメント化