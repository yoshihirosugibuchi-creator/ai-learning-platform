# XP/SKPハードコード完全排除プロジェクト計画書

**プロジェクト名**: XP/SKPハードコード完全排除・テーブル参照統一化  
**作成日**: 2025年10月7日  
**重要度**: 🚨 **最高** - quiz_answers earned_xp一律10/20問題の根本解決  
**影響範囲**: 全XP/SKP/Level計算システム

---

## 🎯 **プロジェクト概要**

### **問題の背景**
- **現状**: 多数箇所でXP/SKP値がハードコード
- **具体的影響**: `quiz_answers`テーブルの`earned_xp`が難易度に関係なく一律10（クイズ）/20（コース）
- **根本原因**: `lib/xp-level-system.ts`でXP_CONFIG/SKP_CONFIGが固定値
- **設計意図**: `xp_level_skp_settings`テーブルで動的管理する仕様だが未実装

### **プロジェクト目標**
1. **全てのXP/SKP/Level計算をxp_level_skp_settingsテーブル参照に統一**
2. **管理者がリアルタイムで設定変更可能なシステム実現**
3. **システム障害時の安全なフォールバック機能実装**
4. **包括的な監視・アラートシステム構築**
5. **既存データの正確な再計算・修正**

---

## 📊 **現状分析・問題箇所の特定**

### **🔴 最重要: データ記録時のXP計算ハードコード**

#### **quiz_answersテーブル記録時**
```typescript
// app/api/xp-save/quiz/route.ts:196 ❌
earnedXP = calculateQuizXPUnified(1, 1, questionDifficulty)
  └── lib/xp-level-system.ts:99 → XP_CONFIG.QUIZ_XP[difficulty]
      └── basic: 10, intermediate: 20, advanced: 30, expert: 50 (固定値)

// 結果: difficulty関係なく実際は一律10
```

#### **course_session_completions記録時**
```typescript
// app/api/xp-save/course/route.ts:172 ❌
? calculateCourseXPUnified(1)
  └── lib/xp-level-system.ts:106 → XP_CONFIG.COURSE_XP
      └── 20 (固定値)

// 結果: 常に一律20
```

### **🟡 高優先: レベル計算ハードコード**

#### **API内レベル計算**
```typescript
// app/api/xp-save/quiz/route.ts:292 ❌
const newCurrentLevel = Math.floor(newTotalXP / 1000) + 1  // 1000XP = 1レベル

// app/api/xp-save/quiz/route.ts:554, 631 ❌  
current_level: Math.floor(calculatedTotalXP / 500) + 1, // メインカテゴリーは500XP/レベル
```

#### **UI表示のレベル計算**
```typescript
// app/profile/page.tsx:321, 658, 688, 801 ❌
Math.floor(xpStats.user.total_xp / 1000) + 1        // 全体レベル
1000 - (xpStats.user.total_xp % 1000)               // 次レベルまでのXP
Math.floor(categoryXP / 500) + 1                    // カテゴリーレベル  
Math.floor(industryXP / 1000) + 1                   // 業界レベル
```

### **🟢 中優先: lib/xp-level-system.ts 根本問題**

#### **完全ハードコード定数**
```typescript
// ❌ 全てハードコード
export const XP_CONFIG = {
  QUIZ_XP: { basic: 10, intermediate: 20, advanced: 30, expert: 50 },
  COURSE_XP: 20,
  LEVEL_THRESHOLDS: { 
    overall: 1000, 
    main_category: 500, 
    industry_category: 1000, 
    industry_subcategory: 500 
  }
}

export const SKP_CONFIG = {
  QUIZ_CORRECT: 10, QUIZ_INCORRECT: 2, QUIZ_PERFECT_BONUS: 50,
  COURSE_CORRECT: 10, COURSE_INCORRECT: 2, COURSE_COMPLETE_BONUS: 50,
  DAILY_STREAK_BONUS: 10, TEN_DAY_STREAK_BONUS: 100
}
```

### **🔵 低優先: 学習分析API**
```typescript
// app/api/learning-analytics/detailed/route.ts:44 ❌
const masteryLevel = Math.min(100, Math.round((baseXP / 500) * 100 * accuracyBonus))

// app/api/learning-analytics/overview/route.ts:98 ❌
progress: Math.min(100, Math.round((stat.total_xp || 0) / 500 * 100))
```

---

## 📋 **xp_level_skp_settingsテーブル仕様**

### **テーブル構造**
```sql
CREATE TABLE xp_level_skp_settings (
  id SERIAL PRIMARY KEY,
  setting_category VARCHAR(20) NOT NULL,  -- 'xp_quiz', 'xp_course', 'xp_bonus', 'level', 'skp'
  setting_key VARCHAR(50) NOT NULL,       -- 'basic', 'intermediate', 'overall_threshold', etc.
  setting_value INTEGER NOT NULL,         -- 設定値（整数）
  setting_description TEXT,               -- 設定の説明
  is_active BOOLEAN DEFAULT true,         -- 有効/無効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(setting_category, setting_key)   -- カテゴリ+キーの組み合わせは一意
);
```

### **設定値一覧（テーブル初期データ）**
```sql
-- === クイズXP設定（難易度別） ===
('xp_quiz', 'basic', 10, 'クイズ基礎難易度XP'),
('xp_quiz', 'intermediate', 20, 'クイズ中級難易度XP'),
('xp_quiz', 'advanced', 30, 'クイズ上級難易度XP'),
('xp_quiz', 'expert', 50, 'クイズエキスパート難易度XP'),

-- === コース学習XP設定（難易度別） ===
('xp_course', 'basic', 15, 'コース学習基礎難易度XP'),
('xp_course', 'intermediate', 25, 'コース学習中級難易度XP'),
('xp_course', 'advanced', 35, 'コース学習上級難易度XP'),
('xp_course', 'expert', 55, 'コース学習エキスパート難易度XP'),

-- === ボーナスXP設定 ===
('xp_bonus', 'quiz_accuracy_80', 20, 'クイズ80%以上正解ボーナスXP'),
('xp_bonus', 'quiz_accuracy_100', 30, 'クイズ100%正解ボーナスXP'),
('xp_bonus', 'course_completion', 50, 'コース完了ボーナスXP'),

-- === レベル閾値設定 ===
('level', 'overall_threshold', 1000, '総合レベルアップ閾値XP'),
('level', 'main_category_threshold', 500, 'メインカテゴリーレベルアップ閾値XP'),
('level', 'industry_category_threshold', 1000, '業界カテゴリーレベルアップ閾値XP'),
('level', 'industry_subcategory_threshold', 500, '業界サブカテゴリーレベルアップ閾値XP'),

-- === SKP設定 ===
('skp', 'quiz_correct', 10, 'クイズ正解1問SKP'),
('skp', 'quiz_incorrect', 2, 'クイズ不正解1問SKP'),
('skp', 'quiz_perfect_bonus', 50, 'クイズ全問正解ボーナスSKP'),
('skp', 'course_correct', 10, 'コース学習正解1問SKP'),
('skp', 'course_incorrect', 2, 'コース学習不正解1問SKP'),
('skp', 'course_complete_bonus', 50, 'コース完了ボーナスSKP'),
('skp', 'daily_streak_bonus', 10, '毎日継続ボーナスSKP'),
('skp', 'ten_day_streak_bonus', 100, '10日連続ボーナスSKP')
```

---

## 🚀 **段階的実装計画**

### **Phase 1: 基盤準備（低リスク）** 📅 **Week 1**

#### **1-1. システム監視基盤構築**
- **システムアラートテーブル作成**
- **ヘルスチェックAPI実装**
- **アラート記録・可視化機能**

#### **1-2. ユーザー権限システム実装**
- **auth.usersテーブルにuser_roleカラム追加**
- **権限レベル: user / admin / system_admin**
- **管理者画面での権限設定機能**

#### **1-3. 管理者ダッシュボード強化**
- **システムアラート一覧表示**
- **フォールバック状態監視**
- **アラート対応・解決機能**

### **Phase 2: フォールバック実装（中リスク）** 📅 **Week 2**

#### **2-1. 安全フォールバック機能**
- **SAFE_FALLBACK_SETTINGS作成**
- **loadXPSettings関数強化**
- **フォールバック検出・記録機能**

#### **2-2. 設定同期システム**
- **XP設定管理画面での自動キャッシュクリア**
- **設定変更時の整合性保証**
- **リアルタイム反映システム**

#### **2-3. 監視・アラート機能**
- **フォールバック使用時の自動記録**
- **ユーザー特定可能なログ**
- **管理者への即座通知システム**

### **Phase 3: ハードコード修正（高リスク）** 📅 **Week 3-4**

#### **3-1. lib/xp-level-system.ts完全書き換え**
- **XP_CONFIG/SKP_CONFIG削除**
- **全関数をテーブル参照型に変更**
- **非同期対応・エラーハンドリング強化**

#### **3-2. API修正（データ記録部分）**
- **quiz/course API のXP計算修正**
- **earned_xp記録ロジックの完全書き換え**
- **レベル計算のテーブル参照化**

#### **3-3. UI表示修正**
- **profile画面のレベル計算修正**
- **学習分析APIの閾値修正**
- **全ての表示ロジック統一化**

### **Phase 4: データ移行・検証（最高リスク）** 📅 **Week 5**

#### **4-1. 既存データ再計算**
- **quiz_answersテーブルのearned_xp修正**
- **course_session_completionsの修正**
- **統計テーブルの再集計**

#### **4-2. 整合性検証**
- **修正前後データの比較検証**
- **計算ロジックの正確性確認**
- **ユーザー影響度の評価**

#### **4-3. 本番適用・監視**
- **段階的本番リリース**
- **リアルタイム監視体制**
- **緊急ロールバック準備**

---

## ⚠️ **リスク分析・対策**

### **🔴 高リスク要因**

#### **1. lib/xp-level-system.ts書き換え**
- **影響**: 全システムのXP/SKP計算
- **対策**: 段階的移行・徹底的テスト・即座ロールバック準備

#### **2. 大量データ再計算**
- **影響**: 数万件のquiz_answersレコード更新
- **対策**: バッチ処理・進捗監視・バックアップ必須

#### **3. API レスポンス性能**
- **影響**: テーブル参照による応答速度低下
- **対策**: キャッシュ機能・5分間有効期限・フォールバック

### **🟡 中リスク要因**

#### **1. 設定変更の伝播遅延**
- **影響**: 管理者の設定変更が即座反映されない
- **対策**: キャッシュクリア機能・リアルタイム更新API

#### **2. フォールバック値の不整合**
- **影響**: テーブル値とフォールバック値の差異
- **対策**: 自動同期機能・定期的整合性チェック

### **🟢 低リスク要因**

#### **1. 権限システム追加**
- **影響**: 既存機能への影響最小
- **対策**: 既存ユーザーはデフォルト権限保持

#### **2. 監視システム追加**
- **影響**: 新機能のため既存に影響なし
- **対策**: 段階的機能追加・オプトイン方式**

---

## 🎯 **成功指標・完了条件**

### **Phase 1完了条件**
- [ ] システムアラートテーブル作成・動作確認
- [ ] ユーザー権限システム実装・テスト完了
- [ ] 管理者ダッシュボードでアラート表示確認
- [ ] ヘルスチェックAPI正常動作確認

### **Phase 2完了条件**
- [ ] loadXPSettings関数でフォールバック動作確認
- [ ] 管理画面での設定変更→キャッシュクリア確認
- [ ] フォールバック使用時のアラート記録確認
- [ ] ユーザー特定可能なログ記録確認

### **Phase 3完了条件**
- [ ] 全XP/SKP計算がテーブル参照に変更済み
- [ ] quiz_answersのearned_xpが難易度別正確値記録
- [ ] UI表示が全てテーブル値ベースに変更済み
- [ ] TypeScript/ESLint 0エラー維持

### **Phase 4完了条件**
- [ ] 既存quiz_answersデータ100%正確に修正済み
- [ ] 統計テーブルの整合性100%確認済み
- [ ] 本番環境での正常動作確認済み
- [ ] 監視体制・緊急対応手順確立済み

### **プロジェクト最終成功指標**
- ✅ **quiz_answersのearned_xpが難易度に応じた正確値**
- ✅ **管理者がリアルタイムでXP/SKP設定変更可能**
- ✅ **システム障害時の安全なフォールバック動作**
- ✅ **包括的監視・アラートシステム稼働中**
- ✅ **全ハードコード完全排除**

---

## 🔧 **技術実装詳細・コード設計**

### **1. SAFE_FALLBACK_SETTINGS実装**

```typescript
// lib/xp-settings.ts
// ✅ テーブル値と完全一致するフォールバック設定
const SAFE_FALLBACK_SETTINGS: XPSettings = {
  // xp_level_skp_settingsテーブルの初期値と完全一致
  xp_quiz: {
    basic: 10,        // ('xp_quiz', 'basic', 10)
    intermediate: 20, // ('xp_quiz', 'intermediate', 20)
    advanced: 30,     // ('xp_quiz', 'advanced', 30)
    expert: 50        // ('xp_quiz', 'expert', 50)
  },
  xp_course: {
    basic: 15,        // ('xp_course', 'basic', 15)
    intermediate: 25, // ('xp_course', 'intermediate', 25)
    advanced: 35,     // ('xp_course', 'advanced', 35)
    expert: 55        // ('xp_course', 'expert', 55)
  },
  xp_bonus: {
    quiz_accuracy_80: 20,   // ('xp_bonus', 'quiz_accuracy_80', 20)
    quiz_accuracy_100: 30,  // ('xp_bonus', 'quiz_accuracy_100', 30)
    course_completion: 50   // ('xp_bonus', 'course_completion', 50)
  },
  level: {
    overall_threshold: 1000,            // ('level', 'overall_threshold', 1000)
    main_category_threshold: 500,       // ('level', 'main_category_threshold', 500)
    industry_category_threshold: 1000,  // ('level', 'industry_category_threshold', 1000)
    industry_subcategory_threshold: 500 // ('level', 'industry_subcategory_threshold', 500)
  },
  skp: {
    quiz_correct: 10,          // ('skp', 'quiz_correct', 10)
    quiz_incorrect: 2,         // ('skp', 'quiz_incorrect', 2)
    quiz_perfect_bonus: 50,    // ('skp', 'quiz_perfect_bonus', 50)
    course_correct: 10,        // ('skp', 'course_correct', 10)
    course_incorrect: 2,       // ('skp', 'course_incorrect', 2)
    course_complete_bonus: 50, // ('skp', 'course_complete_bonus', 50)
    daily_streak_bonus: 10,    // ('skp', 'daily_streak_bonus', 10)
    ten_day_streak_bonus: 100  // ('skp', 'ten_day_streak_bonus', 100)
  }
}
```

### **2. 強化されたloadXPSettings関数**

```typescript
// lib/xp-settings.ts
export async function loadXPSettings(supabaseClient?: SupabaseClient<Database>): Promise<{
  settings: XPSettings,
  source: 'database' | 'fallback',
  timestamp: string
}> {
  const timestamp = new Date().toISOString()
  
  try {
    // キャッシュチェック
    const now = Date.now()
    if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('🚀 Using cached XP settings')
      return {
        settings: settingsCache,
        source: 'database', // キャッシュは元々データベースから
        timestamp: cacheTimestamp.toString()
      }
    }

    console.log('🔄 Loading XP settings from database...')

    // Supabaseクライアントを取得
    let supabase = supabaseClient
    if (!supabase) {
      supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // 全設定を取得
    const { data: settings, error } = await supabase
      .from('xp_level_skp_settings')
      .select('setting_category, setting_key, setting_value')
      .eq('is_active', true)

    if (error) {
      console.warn('⚠️ Failed to load XP settings, using fallback:', error.message)
      await recordFallbackUsage(error, timestamp)
      return {
        settings: SAFE_FALLBACK_SETTINGS,
        source: 'fallback',
        timestamp
      }
    }

    if (!settings || settings.length === 0) {
      console.warn('⚠️ No XP settings found, using fallback')
      await recordFallbackUsage(new Error('No settings found'), timestamp)
      return {
        settings: SAFE_FALLBACK_SETTINGS,
        source: 'fallback',
        timestamp
      }
    }

    // 設定をカテゴリ別に整理
    const loadedSettings: Record<string, Record<string, number>> = {
      xp_quiz: {},
      xp_course: {},
      xp_bonus: {},
      level: {},
      skp: {}
    }

    settings.forEach((setting: { setting_category: string; setting_key: string; setting_value: number }) => {
      const { setting_category, setting_key, setting_value } = setting
      if (loadedSettings[setting_category]) {
        loadedSettings[setting_category][setting_key] = setting_value
      }
    })

    // デフォルト値で不足分を補完
    const finalSettings: XPSettings = {
      xp_quiz: { ...SAFE_FALLBACK_SETTINGS.xp_quiz, ...loadedSettings.xp_quiz },
      xp_course: { ...SAFE_FALLBACK_SETTINGS.xp_course, ...loadedSettings.xp_course },
      xp_bonus: { ...SAFE_FALLBACK_SETTINGS.xp_bonus, ...loadedSettings.xp_bonus },
      level: { ...SAFE_FALLBACK_SETTINGS.level, ...loadedSettings.level },
      skp: { ...SAFE_FALLBACK_SETTINGS.skp, ...loadedSettings.skp }
    }

    // キャッシュ更新
    settingsCache = finalSettings
    cacheTimestamp = now

    console.log('✅ XP settings loaded successfully from database:', {
      quiz_basic: finalSettings.xp_quiz.basic,
      quiz_expert: finalSettings.xp_quiz.expert,
      course_basic: finalSettings.xp_course.basic,
      course_expert: finalSettings.xp_course.expert,
      settings_count: settings.length
    })

    return {
      settings: finalSettings,
      source: 'database',
      timestamp
    }

  } catch (error) {
    console.error('❌ Critical error loading XP settings:', error)
    console.log('🔄 Falling back to safe defaults')
    await recordFallbackUsage(error, timestamp)
    return {
      settings: SAFE_FALLBACK_SETTINGS,
      source: 'fallback',
      timestamp
    }
  }
}
```

### **3. フォールバック記録機能**

```typescript
// lib/xp-settings.ts
async function recordFallbackUsage(error: any, timestamp: string, userId?: string, apiEndpoint?: string) {
  // 1. コンソールログ（開発時）
  console.error('🚨 XP Settings using FALLBACK due to database error:', error)
  
  // 2. データベース記録（可能な場合）
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // サービスロールキーを使用
    )
    
    await supabase.from('system_alerts').insert({
      alert_type: 'xp_settings_fallback',
      message: `XP settings using fallback: ${error.message}`,
      severity: 'warning',
      user_id: userId,
      api_endpoint: apiEndpoint,
      timestamp,
      metadata: { 
        error: error.toString(),
        stack: error.stack,
        timestamp 
      }
    })
  } catch (dbError) {
    console.error('❌ Could not record fallback usage to database:', dbError)
    // データベースが完全に死んでる場合は何もしない
  }
  
  // 3. ローカルストレージ記録（UI表示用）
  if (typeof localStorage !== 'undefined') {
    try {
      const alerts = JSON.parse(localStorage.getItem('system_alerts') || '[]')
      alerts.push({
        type: 'xp_settings_fallback',
        timestamp,
        message: 'XP設定でフォールバック値を使用中',
        error: error.message
      })
      localStorage.setItem('system_alerts', JSON.stringify(alerts.slice(-10))) // 最新10件保持
    } catch (storageError) {
      console.error('❌ Could not record to localStorage:', storageError)
    }
  }
}
```

### **4. システムアラートテーブル作成**

```sql
-- database/create_system_alerts_table.sql
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,        -- 'xp_settings_fallback', 'database_error', etc.
  message TEXT NOT NULL,                  -- 詳細メッセージ
  severity VARCHAR(20) NOT NULL,          -- 'info', 'warning', 'error', 'critical'
  user_id UUID,                          -- 影響を受けたユーザー（NULL可能）
  api_endpoint VARCHAR(100),              -- 影響を受けたAPIエンドポイント
  metadata JSONB DEFAULT '{}',            -- 追加情報（エラースタック等）
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,         -- 対応済みフラグ
  resolved_by UUID,                      -- 対応した管理者のユーザーID
  resolved_at TIMESTAMP WITH TIME ZONE,   -- 対応完了日時
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_timestamp ON system_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_alerts_user_id ON system_alerts(user_id);

-- RLS設定（管理者のみアクセス可能）
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- 管理者のみ読み取り可能
CREATE POLICY "Admin users can view system alerts" ON system_alerts
    FOR SELECT USING (auth.jwt() ->> 'user_role' IN ('admin', 'system_admin'));

-- システム管理者のみ追加・更新可能
CREATE POLICY "System admin can manage system alerts" ON system_alerts
    FOR ALL USING (auth.jwt() ->> 'user_role' = 'system_admin');
```

### **5. ユーザー権限システム実装**

```sql
-- database/add_user_roles.sql
-- auth.usersテーブルに権限カラム追加
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'user';

-- 権限レベル
-- 'user'          : 一般ユーザー
-- 'admin'         : 管理者（XP設定変更、アラート対応）
-- 'system_admin'  : システム管理者（全権限）

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(user_role);

-- 初期システム管理者設定（例）
UPDATE auth.users 
SET user_role = 'system_admin' 
WHERE email = 'system.admin@example.com';
```

### **6. 新しいlib/xp-level-system.ts設計**

```typescript
// lib/xp-level-system.ts（完全書き換え版）
import { loadXPSettings, type XPSettings } from './xp-settings'

// ❌ 削除: 全てのハードコード定数
// export const XP_CONFIG = { ... }
// export const SKP_CONFIG = { ... }

/**
 * クイズXP計算（テーブル参照版）
 */
export async function calculateQuizXP(
  correctAnswers: number,
  totalQuestions: number,
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic',
  xpSettings?: XPSettings
): Promise<number> {
  // 設定が渡されていない場合は取得
  const settings = xpSettings || (await loadXPSettings()).settings
  
  return correctAnswers * settings.xp_quiz[difficulty]
}

/**
 * コース学習XP計算（テーブル参照版）
 */
export async function calculateCourseXP(
  correctAnswers: number,
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic',
  xpSettings?: XPSettings
): Promise<number> {
  const settings = xpSettings || (await loadXPSettings()).settings
  
  return correctAnswers * settings.xp_course[difficulty]
}

/**
 * レベル計算（テーブル参照版）
 */
export async function calculateLevel(
  totalXP: number,
  thresholdType: 'overall_threshold' | 'main_category_threshold' | 'industry_category_threshold' | 'industry_subcategory_threshold',
  xpSettings?: XPSettings
): Promise<number> {
  const settings = xpSettings || (await loadXPSettings()).settings
  const threshold = settings.level[thresholdType]
  
  return Math.floor(totalXP / threshold) + 1
}

/**
 * 次のレベルまでに必要なXP計算（テーブル参照版）
 */
export async function calculateNextLevelXP(
  totalXP: number,
  thresholdType: 'overall_threshold' | 'main_category_threshold' | 'industry_category_threshold' | 'industry_subcategory_threshold',
  xpSettings?: XPSettings
): Promise<number> {
  const settings = xpSettings || (await loadXPSettings()).settings
  const threshold = settings.level[thresholdType]
  const currentLevelXP = Math.floor(totalXP / threshold) * threshold
  
  return currentLevelXP + threshold - totalXP
}

/**
 * SKP計算（テーブル参照版）
 */
export async function calculateQuizSKP(
  correctAnswers: number,
  totalQuestions: number,
  isPerfect: boolean = false,
  xpSettings?: XPSettings
): Promise<{skpGained: number, breakdown: {base: number, bonus: number, description: string}}> {
  const settings = xpSettings || (await loadXPSettings()).settings
  
  const incorrectAnswers = totalQuestions - correctAnswers
  const baseCorrect = correctAnswers * settings.skp.quiz_correct
  const baseIncorrect = incorrectAnswers * settings.skp.quiz_incorrect
  const perfectBonus = isPerfect && totalQuestions >= 3 ? settings.skp.quiz_perfect_bonus : 0
  
  const base = baseCorrect + baseIncorrect
  const bonus = perfectBonus
  const total = base + bonus
  
  return {
    skpGained: total,
    breakdown: {
      base,
      bonus,
      description: `正解${correctAnswers}問(${baseCorrect}SKP) + 不正解${incorrectAnswers}問(${baseIncorrect}SKP)${perfectBonus > 0 ? ' + 全問正解ボーナス(' + perfectBonus + 'SKP)' : ''}`
    }
  }
}

/**
 * コース学習SKP計算（テーブル参照版）
 */
export async function calculateCourseSKP(
  correctAnswers: number,
  totalQuestions: number,
  isCompleted: boolean = false,
  isReview: boolean = false,
  xpSettings?: XPSettings
): Promise<{skpGained: number, breakdown: {base: number, bonus: number, description: string}}> {
  // 復習時はSKP付与なし
  if (isReview) {
    return {
      skpGained: 0,
      breakdown: {
        base: 0,
        bonus: 0,
        description: '復習のためSKP付与なし'
      }
    }
  }
  
  const settings = xpSettings || (await loadXPSettings()).settings
  
  const incorrectAnswers = totalQuestions - correctAnswers
  const baseCorrect = correctAnswers * settings.skp.course_correct
  const baseIncorrect = incorrectAnswers * settings.skp.course_incorrect
  const completeBonus = isCompleted ? settings.skp.course_complete_bonus : 0
  
  const base = baseCorrect + baseIncorrect
  const bonus = completeBonus
  const total = base + bonus
  
  return {
    skpGained: total,
    breakdown: {
      base,
      bonus,
      description: `正解${correctAnswers}問(${baseCorrect}SKP) + 不正解${incorrectAnswers}問(${baseIncorrect}SKP)${completeBonus > 0 ? ' + コース完了ボーナス(' + completeBonus + 'SKP)' : ''}`
    }
  }
}

/**
 * 継続学習SKPボーナス計算（テーブル参照版）
 */
export async function calculateStreakBonus(
  streakDays: number,
  xpSettings?: XPSettings
): Promise<number> {
  const settings = xpSettings || (await loadXPSettings()).settings
  
  let bonus = 0
  
  // 毎日継続ボーナス
  if (streakDays > 0) {
    bonus += streakDays * settings.skp.daily_streak_bonus
  }
  
  // 10日毎の追加ボーナス
  const tenDayBonuses = Math.floor(streakDays / 10)
  if (tenDayBonuses > 0) {
    bonus += tenDayBonuses * settings.skp.ten_day_streak_bonus
  }
  
  return bonus
}
```

### **7. 管理者ダッシュボード実装**

```tsx
// app/admin/system-status/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { AlertTriangle, CheckCircle, Clock, User, Activity } from 'lucide-react'

interface SystemAlert {
  id: number
  alert_type: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  user_id?: string
  api_endpoint?: string
  timestamp: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  metadata?: any
}

export default function SystemStatusPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [xpSettingsStatus, setXpSettingsStatus] = useState<{
    source: 'database' | 'fallback',
    lastCheck: string
  }>()
  const [showResolved, setShowResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSystemStatus()
      // 30秒ごとに更新
      const interval = setInterval(loadSystemStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  async function loadSystemStatus() {
    try {
      // XP設定状態チェック
      const xpResult = await loadXPSettings()
      setXpSettingsStatus({
        source: xpResult.source,
        lastCheck: xpResult.timestamp
      })

      // システムアラート取得
      const response = await fetch('/api/admin/system-alerts')
      if (response.ok) {
        const alertsData = await response.json()
        setAlerts(alertsData)
      }
    } catch (error) {
      console.error('Error loading system status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function resolveAlert(alertId: number) {
    try {
      const response = await fetch(`/api/admin/system-alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      if (response.ok) {
        await loadSystemStatus() // リロード
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const filteredAlerts = showResolved 
    ? alerts 
    : alerts.filter(alert => !alert.resolved)

  const severityColor = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    error: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-red-200 text-red-900 border-red-400'
  }

  const severityIcon = {
    info: <Activity className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertTriangle className="w-4 h-4" />,
    critical: <AlertTriangle className="w-4 h-4" />
  }

  if (loading) {
    return <div className="p-6">読み込み中...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">システム状態監視</h1>
        <Button onClick={loadSystemStatus} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      {/* XP設定システム状態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            XP設定システム
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border-2 ${
            xpSettingsStatus?.source === 'fallback' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  データソース: {xpSettingsStatus?.source === 'database' ? 'データベース' : '⚠️ フォールバック値'}
                </p>
                <p className="text-sm text-gray-600">
                  最終確認: {xpSettingsStatus?.lastCheck ? new Date(xpSettingsStatus.lastCheck).toLocaleString('ja-JP') : '不明'}
                </p>
              </div>
              {xpSettingsStatus?.source === 'database' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            {xpSettingsStatus?.source === 'fallback' && (
              <div className="mt-3 p-3 bg-yellow-100 rounded border">
                <p className="text-yellow-800 text-sm">
                  ⚠️ 現在フォールバック値を使用中です。XP設定の変更は反映されません。
                  データベース接続を確認してください。
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* システムアラート一覧 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              システムアラート
              <Badge variant="outline">
                {filteredAlerts.length}件
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showResolved ? "outline" : "default"}
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? '未対応のみ' : '全て表示'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>現在アラートはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${
                    alert.resolved ? 'bg-gray-50 border-gray-200' : severityColor[alert.severity]
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {severityIcon[alert.severity]}
                        <span className="font-semibold">{alert.alert_type}</span>
                        <Badge variant={alert.resolved ? "secondary" : "outline"}>
                          {alert.resolved ? '対応済み' : '未対応'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.timestamp).toLocaleString('ja-JP')}
                        </span>
                        {alert.user_id && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            ユーザー: {alert.user_id.substring(0, 8)}...
                          </span>
                        )}
                        {alert.api_endpoint && (
                          <span>API: {alert.api_endpoint}</span>
                        )}
                      </div>
                      {alert.resolved && alert.resolved_at && (
                        <p className="text-xs text-green-600 mt-1">
                          対応済み: {new Date(alert.resolved_at).toLocaleString('ja-JP')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          対応済み
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        詳細
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### **8. ヘルスチェックAPI実装**

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings } from '@/lib/xp-settings'

export async function GET() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  const checks = {
    database: false,
    xp_settings: 'unknown' as 'database' | 'fallback' | 'error',
    response_time: '0ms',
    user_count: 0,
    active_alerts: 0
  }
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy'
  
  try {
    // データベース接続テスト
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 1. XP設定システムチェック
    try {
      const xpResult = await loadXPSettings(supabase)
      checks.xp_settings = xpResult.source
      checks.database = xpResult.source === 'database'
    } catch (error) {
      checks.xp_settings = 'error'
    }
    
    // 2. ユーザー数取得
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      checks.user_count = count || 0
    } catch (error) {
      console.error('Error getting user count:', error)
    }
    
    // 3. アクティブアラート数取得
    try {
      const { count } = await supabase
        .from('system_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
      checks.active_alerts = count || 0
    } catch (error) {
      console.error('Error getting alert count:', error)
    }
    
    // 応答時間計算
    const responseTime = Date.now() - startTime
    checks.response_time = `${responseTime}ms`
    
    // ステータス判定
    if (checks.database && checks.xp_settings === 'database') {
      status = 'healthy'
    } else if (checks.xp_settings === 'fallback') {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
  } catch (error) {
    console.error('Health check error:', error)
    status = 'unhealthy'
  }
  
  const healthData = {
    status,
    timestamp,
    checks,
    alerts: {
      xp_fallback: {
        active: checks.xp_settings === 'fallback',
        severity: checks.xp_settings === 'fallback' ? 'warning' : 'info'
      }
    }
  }
  
  // 劣化状態の場合はメール通知（実装検討）
  if (status === 'degraded' || status === 'unhealthy') {
    // await sendAlertEmail(healthData) // 将来実装
  }
  
  return NextResponse.json(healthData, {
    status: status === 'healthy' ? 200 : status === 'degraded' ? 207 : 503
  })
}
```

### **9. 既存データ再計算スクリプト**

```typescript
// scripts/recalculate-all-xp-data-with-table-settings.ts
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings } from '@/lib/xp-settings'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function recalculateAllXPData() {
  console.log('🔄 既存データのXP再計算開始（テーブル設定ベース）')
  
  try {
    // 1. XP設定をテーブルから取得
    const xpResult = await loadXPSettings(supabase)
    const xpSettings = xpResult.settings
    
    console.log('✅ XP設定読み込み完了:', {
      source: xpResult.source,
      quiz_basic: xpSettings.xp_quiz.basic,
      course_basic: xpSettings.xp_course.basic
    })
    
    if (xpResult.source === 'fallback') {
      console.warn('⚠️ フォールバック値を使用しています。正確な再計算のためデータベース接続を確認してください。')
    }
    
    // 2. quiz_answersの earned_xp 再計算
    console.log('📊 quiz_answersテーブルの再計算開始...')
    
    const { data: quizAnswers, error: quizError } = await supabase
      .from('quiz_answers')
      .select('id, is_correct, difficulty, session_type')
    
    if (quizError) {
      throw new Error(`quiz_answers取得エラー: ${quizError.message}`)
    }
    
    console.log(`📈 対象レコード数: ${quizAnswers.length}`)
    
    let updatedCount = 0
    const batchSize = 100
    
    for (let i = 0; i < quizAnswers.length; i += batchSize) {
      const batch = quizAnswers.slice(i, i + batchSize)
      
      for (const answer of batch) {
        let correctEarnedXP = 0
        
        if (answer.is_correct) {
          if (answer.session_type === 'quiz') {
            // クイズの場合
            const difficulty = answer.difficulty as keyof typeof xpSettings.xp_quiz
            correctEarnedXP = xpSettings.xp_quiz[difficulty] || xpSettings.xp_quiz.basic
          } else if (answer.session_type === 'course_confirmation') {
            // コースの場合（難易度があれば使用、なければbasic）
            const difficulty = (answer.difficulty as keyof typeof xpSettings.xp_course) || 'basic'
            correctEarnedXP = xpSettings.xp_course[difficulty] || xpSettings.xp_course.basic
          }
        }
        
        const { error: updateError } = await supabase
          .from('quiz_answers')
          .update({ earned_xp: correctEarnedXP })
          .eq('id', answer.id)
        
        if (updateError) {
          console.error(`❌ レコード${answer.id}の更新エラー:`, updateError)
        } else {
          updatedCount++
        }
      }
      
      console.log(`📊 進捗: ${Math.min(i + batchSize, quizAnswers.length)}/${quizAnswers.length} (${Math.round((Math.min(i + batchSize, quizAnswers.length) / quizAnswers.length) * 100)}%)`)
    }
    
    console.log(`✅ quiz_answers更新完了: ${updatedCount}件`)
    
    // 3. 統計テーブルの再計算（既存スクリプトを活用）
    console.log('📊 統計テーブルの再計算開始...')
    
    // 既存のfix-xp-statistics-correct-final.tsのロジックを活用
    // ここでは概要のみ示す
    
    console.log('🎉 全データ再計算完了')
    
  } catch (error) {
    console.error('❌ データ再計算エラー:', error)
    process.exit(1)
  }
}

// スクリプト実行
recalculateAllXPData()
  .then(() => {
    console.log('✅ スクリプト正常終了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 スクリプト異常終了:', error)
    process.exit(1)
  })
```

---

## 📅 **作業スケジュール**

### **Week 1: Phase 1 基盤準備**
- Day 1-2: システムアラートテーブル作成・RLS設定
- Day 3-4: ユーザー権限システム実装・テスト
- Day 5-7: 管理者ダッシュボード実装・ヘルスチェックAPI

### **Week 2: Phase 2 フォールバック実装**
- Day 1-3: SAFE_FALLBACK_SETTINGS・強化loadXPSettings実装
- Day 4-5: フォールバック記録機能・アラート機能実装
- Day 6-7: 設定同期システム・キャッシュクリア強化

### **Week 3-4: Phase 3 ハードコード修正**
- Day 1-3: lib/xp-level-system.ts完全書き換え
- Day 4-7: quiz/course API修正・テスト
- Day 8-10: UI表示修正・学習分析API修正
- Day 11-14: 総合テスト・統合確認

### **Week 5: Phase 4 データ移行**
- Day 1-2: 既存データ再計算スクリプト実装・テスト
- Day 3-4: 本番データ再計算実行・監視
- Day 5-7: 整合性検証・本番適用・監視体制確立

---

## 📚 **関連ドキュメント・参考資料**

### **既存システム**
- `database/create_xp_level_skp_settings_table.sql` - 設定テーブル定義
- `lib/xp-settings.ts` - 現在のXP設定システム
- `app/admin/xp-settings/page.tsx` - 既存管理画面

### **修正対象ファイル**
- `lib/xp-level-system.ts` - 完全書き換え対象
- `app/api/xp-save/quiz/route.ts` - XP計算修正
- `app/api/xp-save/course/route.ts` - XP計算修正
- `app/profile/page.tsx` - UI表示修正

### **新規作成ファイル**
- `database/create_system_alerts_table.sql` - アラートテーブル
- `database/add_user_roles.sql` - 権限システム
- `app/admin/system-status/page.tsx` - 管理者ダッシュボード
- `app/api/health/route.ts` - ヘルスチェックAPI
- `scripts/recalculate-all-xp-data-with-table-settings.ts` - データ再計算

---

*このプロジェクト計画書は、XP/SKPハードコード問題の完全解決と、堅牢な設定管理システムの構築を目的としています。段階的実装により、デグレリスクを最小化しながら確実な改善を実現します。*

**作成背景**: quiz_answers earned_xp一律10/20問題の根本解決  
**最終更新**: 2025年10月7日 - 完全なプロジェクト計画策定完了