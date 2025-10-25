# ナレッジカードシステム データベースセットアップ手順

## 📋 実行順序

**Supabaseダッシュボード > SQL Editor** で以下の順番でスクリプトを実行してください。

### 1. テーブル作成
```bash
01_create_knowledge_tables.sql
```
- `knowledge_cards` テーブル（マスタ）
- `user_knowledge_collection_v2` テーブル（ユーザーコレクション）
- インデックス・制約の作成

### 2. マスタデータ投入
```bash
02_insert_knowledge_master_data.sql
```
- 11枚のサンプルナレッジカード投入
- 難易度別・カテゴリー別のバランス良いデータ

### 3. 検証（任意）
```bash
03_verify_knowledge_tables.sql
```
- テーブル構造・データの確認
- インデックス・制約の検証

## 📊 投入されるデータ

### 難易度別カード数
- **basic**: 4枚（初級レベル）
- **intermediate**: 5枚（中級レベル）  
- **advanced**: 1枚（上級レベル）
- **expert**: 1枚（エキスパートレベル）

### カテゴリー別
- **論理的思考・分析**: 7枚
- **戦略・分析**: 2枚
- **AI・デジタル活用**: 1枚
- **創造的思考**: 1枚

## 🎯 投入されるカード一覧

| theme_id | タイトル | 難易度 | XP | カテゴリー |
|----------|---------|-------|----|-----------| 
| so_what_why_so | So What?/Why So? | intermediate | 50 | 論理的思考・分析 |
| conclusion_first | 結論ファースト | basic | 30 | 論理的思考・分析 |
| mece_thinking | MECE思考 | basic | 30 | 論理的思考・分析 |
| logical_tree | ロジックツリー | intermediate | 40 | 論理的思考・分析 |
| market_analysis | 3C分析 | intermediate | 40 | 戦略・分析 |
| ai_basic_concepts | AI基本概念 | basic | 35 | AI・デジタル活用 |
| hypothesis_thinking | 仮説思考 | intermediate | 45 | 論理的思考・分析 |
| framework_thinking | フレームワーク思考 | basic | 35 | 論理的思考・分析 |
| design_thinking | デザイン思考 | intermediate | 45 | 創造的思考 |
| critical_thinking | 批判的思考 | advanced | 50 | 論理的思考・分析 |
| expert_consulting | 経営コンサルティング手法 | expert | 100 | 戦略・分析 |

## 🔄 実行後の確認

実行が成功すると以下のメッセージが表示されます：

1. `01_create_knowledge_tables.sql` → "テーブル作成完了"
2. `02_insert_knowledge_master_data.sql` → "マスタデータ投入完了" + カード数
3. `03_verify_knowledge_tables.sql` → 詳細な検証結果

## ⚠️ 注意事項

- スクリプトは **順番通り** に実行してください
- エラーが発生した場合は、該当スクリプトを再実行してください  
- 既存データがある場合は `ON CONFLICT` で安全に更新されます
- `user_knowledge_collection_v2` は空テーブルとして作成されます（ユーザーがカードを取得すると自動でデータが挿入されます）

## 🚀 次のステップ

データベース作成後、以下を実行してください：

1. **database-types-official.ts の再生成**
2. **TypeScriptエラーの修正**  
3. **新システムのテスト**