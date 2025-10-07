# データベースバックアップ手順書

**最終更新**: 2025年10月7日  
**対象**: 全ユーザーデータの削除前バックアップ  
**重要度**: 🔴 **最重要** - データ削除前必須実行

---

## 📋 **概要**

全ユーザーデータを削除する前に、**必ずデータベースの完全バックアップ**を取得する手順です。  
予期しない問題やデータ復旧が必要な場合に備えて、安全にデータを保護します。

---

## 🎯 **バックアップ対象テーブル**

### **ユーザーデータテーブル（21テーブル）**
| カテゴリ | テーブル名 | 説明 |
|---------|-----------|------|
| **クイズ・学習活動** | `quiz_answers` | クイズ回答データ（429件） |
| | `quiz_sessions` | クイズセッション履歴 |
| | `learning_progress` | 学習進捗記録 |
| **XP・統計系** | `user_xp_stats_v2` | ユーザーXP統計 |
| | `user_category_xp_stats_v2` | カテゴリー別XP統計 |
| | `user_subcategory_xp_stats_v2` | サブカテゴリー別XP統計 |
| | `daily_xp_records` | 日別XP記録・連続学習日数 |
| **コース学習** | `course_session_completions` | コースセッション完了履歴 |
| | `course_theme_completions` | コーステーマ完了履歴 |
| | `course_completions` | コース完了記録 |
| **報酬・コレクション** | `user_badges` | 獲得バッジ |
| | `knowledge_card_collection` | ナレッジカード収集 |
| | `wisdom_card_collection` | 格言カード収集 |
| | `skp_transactions` | SKP取引履歴 |
| **ユーザー設定** | `user_settings` | ユーザー設定・パーソナライゼーション |
| **AI学習分析** | `learning_analytics_summary` | 学習分析サマリー |
| | `learning_effectiveness_tracking` | 学習効果追跡データ |
| | `learning_recommendations` | 学習推奨データ |
| | `unified_learning_session_analytics` | 統合学習セッション分析 |
| | `user_learning_profiles` | ユーザー学習プロファイル |
| | `spaced_repetition_schedule` | 間隔反復学習スケジュール |

### **保持対象テーブル（バックアップ対象外）**
| テーブル名 | 説明 | 理由 |
|-----------|------|------|
| `categories` | カテゴリーマスター | 静的データ・変更なし |
| `subcategories` | サブカテゴリーマスター | 静的データ・変更なし |
| `quiz_questions` | クイズ問題マスター | 静的データ・変更なし |
| `learning_sessions` | 学習コンテンツ定義 | 静的データ・変更なし |

---

## 🚀 **バックアップ実行手順**

### **方法1: 自動バックアップスクリプト（推奨）**

#### 1. バックアップスクリプト実行
```bash
# 全ユーザーデータの自動バックアップ
npx tsx scripts/backup-all-user-data.ts
```

#### 2. バックアップ確認
```bash
# バックアップディレクトリの確認
ls -la ./database/backup/full_user_data_backup_$(date +%Y%m%d)/
```

### **方法2: SupabaseCLI使用（上級者向け）**

#### 1. Supabase CLIでのフルバックアップ
```bash
# 前提: Supabase CLI設定済み
supabase db dump --db-url "$DATABASE_URL" > ./database/backup/full_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. 特定テーブルのみバックアップ
```bash
# 重要テーブルのみ個別バックアップ
supabase db dump --db-url "$DATABASE_URL" \
  --table quiz_answers \
  --table quiz_sessions \
  --table user_xp_stats_v2 \
  > ./database/backup/critical_tables_backup_$(date +%Y%m%d_%H%M%S).sql
```

### **方法3: Supabaseダッシュボード（GUI）**

#### 1. Supabaseダッシュボードへアクセス
- https://supabase.com/dashboard
- プロジェクト選択

#### 2. データベース → SQL Editor
```sql
-- 重要テーブルのデータ確認
SELECT 
  'quiz_answers' as table_name, 
  COUNT(*) as record_count 
FROM quiz_answers
UNION ALL
SELECT 
  'user_xp_stats_v2' as table_name, 
  COUNT(*) as record_count 
FROM user_xp_stats_v2
UNION ALL
SELECT 
  'daily_xp_records' as table_name, 
  COUNT(*) as record_count 
FROM daily_xp_records;
```

#### 3. Settings → Database → Database backups
- 手動バックアップトリガー
- 自動バックアップ設定確認

---

## 🛠️ **バックアップ・復旧スクリプト**

### **バックアップスクリプト作成場所**
```
scripts/
├── backup-all-user-data.ts          # メインバックアップスクリプト
├── verify-backup-integrity.ts       # バックアップ整合性確認
└── restore-user-data-from-backup.ts # 復旧スクリプト

database/backup/
└── full_user_data_backup_YYYYMMDD/   # バックアップ保存先
    ├── quiz_answers_backup.json
    ├── user_xp_stats_v2_backup.json
    ├── daily_xp_records_backup.json
    └── ... (全21テーブル)
```

---

## ⚠️ **バックアップ前チェックリスト**

### **必須確認事項**
- [ ] バックアップディスク容量が十分にある（推奨: 500MB以上）
- [ ] Supabase接続が正常である
- [ ] 環境変数（`SUPABASE_SERVICE_ROLE_KEY`）が設定済み
- [ ] バックアップ対象データの現在の状況を確認済み

### **データ状況確認コマンド**
```bash
# 現在のデータ量確認
curl -s http://localhost:3000/api/admin/analyze-quiz-answers-user-id

# 結果例:
# - quiz_answers: 429件（user_id設定済み15件、未設定414件）
# - 設定済みユーザー: 1人
```

---

## 🔄 **バックアップ後の検証**

### **1. ファイル存在確認**
```bash
# バックアップファイルの存在確認
BACKUP_DIR="./database/backup/full_user_data_backup_$(date +%Y%m%d)"
ls -la "$BACKUP_DIR"

# 期待される結果: 21個のJSONファイル
```

### **2. データ整合性確認**
```bash
# バックアップ整合性スクリプト実行
npx tsx scripts/verify-backup-integrity.ts
```

### **3. レコード数確認**
各バックアップファイルのレコード数が実際のテーブルと一致することを確認。

---

## 🆘 **復旧手順（緊急時）**

### **完全復旧**
```bash
# 全ユーザーデータの復旧
npx tsx scripts/restore-user-data-from-backup.ts \
  --backup-dir "./database/backup/full_user_data_backup_YYYYMMDD"
```

### **部分復旧**
```bash
# 特定テーブルのみ復旧
npx tsx scripts/restore-user-data-from-backup.ts \
  --backup-dir "./database/backup/full_user_data_backup_YYYYMMDD" \
  --tables "quiz_answers,user_xp_stats_v2,daily_xp_records"
```

### **復旧後確認**
```bash
# 復旧データの確認
curl -s http://localhost:3000/api/admin/analyze-quiz-answers-user-id
```

---

## 📊 **バックアップ頻度・保持ポリシー**

### **推奨バックアップスケジュール**
- **全削除実行前**: 必須 🔴
- **週次**: 定期バックアップ
- **重要変更前**: 事前バックアップ

### **保持ポリシー**
- **直近3回分**: 常に保持
- **月次バックアップ**: 6ヶ月保持
- **重要マイルストーン**: 永続保持

---

## 🔐 **セキュリティ・プライバシー**

### **バックアップファイルの取り扱い**
- [ ] バックアップファイルは`.gitignore`に追加済み
- [ ] 個人情報が含まれるため適切に管理
- [ ] ローカル開発環境でのみ使用
- [ ] 不要になったら安全に削除

### **アクセス制限**
- バックアップファイルは開発者のみアクセス可能
- サービスロールキーの適切な管理

---

## ❗ **注意事項**

### **⚠️ 重要な警告**
- **データ削除前には必ずバックアップを実行**
- **バックアップの整合性確認を怠らない**
- **復旧テストは安全な環境で実施**
- **本番環境では特に慎重に操作**

### **制限事項**
- バックアップはJSONフォーマット（PostgreSQLダンプではない）
- 大量データの場合は時間がかかる可能性
- ネットワーク接続が必要

### **トラブルシューティング**
- バックアップ失敗時は部分バックアップを試行
- ディスク容量不足の場合は古いバックアップを削除
- ネットワークエラーの場合は時間をおいて再試行

---

## 📞 **サポート・問題報告**

### **バックアップで問題が発生した場合**
1. **エラーメッセージの確認**
2. **ネットワーク接続の確認**
3. **ディスク容量の確認**
4. **環境変数の確認**

### **緊急時の対応**
- データ削除前にバックアップが失敗した場合は**削除を中止**
- 必要に応じてSupabaseダッシュボードから手動バックアップ

---

**このドキュメントは全ユーザーデータ削除前の必須手順です。必ず実行してからデータ削除作業を進めてください。**