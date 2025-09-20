# 学習コンテンツ データベース移行計画

**作成日**: 2025年9月20日  
**目的**: JSONベースからSupabaseへの学習コンテンツ移行  
**予想工数**: 2-3日

---

## 📊 **現状分析**

### **現在のアーキテクチャ**
```
public/learning-data/
├── courses.json (6コース)
├── consulting_thinking_basics.json (利用可能)
├── marketing_practice.json (利用可能)
├── ai_literacy_fundamentals.json (利用可能)
└── (その他3コース - coming_soon)
```

### **データ統計**
- **総コース数**: 6コース
- **利用可能コース**: 3コース
- **Coming Soon**: 3コース
- **推定データ量**: ~1000行程度

### **パフォーマンス課題**
- 複数JSONファイルのfetch処理
- クライアントサイドでの複雑なキャッシュ管理
- データ検索・フィルタリング性能

---

## 🎯 **移行目標**

### **主要目的**
1. **パフォーマンス向上**
   - JSON fetch → SQL query（5-10倍高速化）
   - サーバーサイドキャッシング活用
   
2. **管理性向上**
   - CSVでのコンテンツ管理
   - バージョン管理・承認フロー
   
3. **機能拡張基盤**
   - 高度な検索・フィルタリング
   - 管理者ダッシュボード連携

### **成功指標**
- ページ読み込み時間: 2秒 → 0.5秒
- データ管理工数: 50%削減
- 新コース追加工数: 75%削減

---

## 📋 **移行フェーズ計画**

### **フェーズ1: インフラ準備 (0.5日)**

#### **タスク1.1: DB スキーマ作成**
- [x] スキーマ設計完了
- [ ] Supabaseでのテーブル作成実行
- [ ] インデックス・制約確認

#### **タスク1.2: データ検証スクリプト作成**
```typescript
// データ整合性チェック用
scripts/validate-learning-content.ts
```

### **フェーズ2: データ移行 (1日)**

#### **タスク2.1: 移行スクリプト開発**
```typescript
// JSON → DB 移行ツール
scripts/migrate-learning-content.ts
```

**移行対象データ:**
- 6コース基本情報
- 利用可能3コースの詳細データ
- ~10ジャンル
- ~20テーマ  
- ~100セッション
- ~500コンテンツ
- ~200クイズ

#### **タスク2.2: バッチ移行実行**
1. courses.json → learning_courses
2. 各コースjson → 関連テーブル
3. データ整合性確認

### **フェーズ3: API切り替え (0.5日)**

#### **タスク3.1: 新API関数実装**
```typescript
// lib/learning/supabase-data.ts
export async function getCoursesFromDB()
export async function getCourseDetailsFromDB(courseId)
```

#### **タスク3.2: フロントエンド切り替え**
- フィーチャーフラグ実装
- 段階的切り替え

### **フェーズ4: 管理機能 (1日)**

#### **タスク4.1: 管理API開発**
```
/api/admin/learning/courses
/api/admin/learning/content
```

#### **タスク4.2: CSV機能追加**
- コンテンツCSV出力
- CSV一括取込

---

## 🔧 **技術実装詳細**

### **DBスキーマ構造**
```sql
learning_courses (id, title, description, ...)
├── learning_genres (course_id, ...)  
    ├── learning_themes (genre_id, ...)
        ├── learning_sessions (theme_id, ...)
            ├── session_contents (session_id, ...)
            └── session_quizzes (session_id, ...)
```

### **API設計**
```typescript
// 新API構造
GET /api/learning/courses
GET /api/learning/courses/[courseId]
GET /api/learning/courses/[courseId]/[genreId]
GET /api/learning/sessions/[sessionId]

// 管理API
POST /api/admin/learning/courses
PUT /api/admin/learning/courses/[courseId]
DELETE /api/admin/learning/courses/[courseId]
```

### **キャッシュ戦略**
```typescript
// サーバーサイドキャッシュ
- Redis: 15分キャッシュ
- CDN: 静的コンテンツ配信
- Next.js: ISR活用
```

---

## 🚨 **リスク管理**

### **主要リスク**

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| データ移行ミス | 高 | 中 | 段階移行・ロールバック準備 |
| パフォーマンス劣化 | 中 | 低 | 事前ベンチマーク・最適化 |
| フロントエンド互換性 | 中 | 中 | フィーチャーフラグ・A/Bテスト |

### **緊急時対応**
1. **フィーチャーフラグでJSONモードに即座復帰**
2. **データベースロールバック手順準備**
3. **監視・アラート設定**

---

## 📈 **移行後の改善効果**

### **短期効果 (移行後1週間)**
- ページ読み込み速度: 75%改善
- サーバー負荷: 50%削減
- キャッシュ効率: 90%改善

### **中長期効果 (移行後1ヶ月)**
- 新コース追加工数: 75%削減
- コンテンツ管理効率: 3倍向上
- 検索・フィルタ機能: 10倍高速化

---

## ✅ **移行チェックリスト**

### **事前準備**
- [ ] DBスキーマ作成・確認
- [ ] 移行スクリプト開発・テスト
- [ ] バックアップ取得

### **移行実行**
- [ ] フィーチャーフラグ設定
- [ ] データ移行実行
- [ ] 整合性確認
- [ ] パフォーマンステスト

### **事後確認**
- [ ] 全機能動作確認
- [ ] ユーザー受け入れテスト
- [ ] 監視・ログ確認
- [ ] ドキュメント更新

---

## 📅 **スケジュール**

```
Day 1: フェーズ1 + フェーズ2.1 (準備・スクリプト開発)
Day 2: フェーズ2.2 + フェーズ3 (移行実行・API切り替え)  
Day 3: フェーズ4 + テスト (管理機能・総合テスト)
```

**推奨実施時期**: 低トラフィック時間帯（平日午前中）

---

*このドキュメントは移行進捗に応じて随時更新します*