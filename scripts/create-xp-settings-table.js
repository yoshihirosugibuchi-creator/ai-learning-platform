#!/usr/bin/env node

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Supabaseクライアント作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createXPSettingsTable() {
  console.log('🔧 Creating XP settings table...')

  try {
    // テーブル作成SQL
    const createTableSQL = `
      -- 統合XP/Level/SKP設定管理テーブル作成
      CREATE TABLE IF NOT EXISTS xp_level_skp_settings (
        id SERIAL PRIMARY KEY,
        setting_category VARCHAR(20) NOT NULL,
        setting_key VARCHAR(50) NOT NULL,
        setting_value INTEGER NOT NULL,
        setting_description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(setting_category, setting_key)
      );
    `

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    })

    if (createError) {
      console.log('📝 Using direct table creation...')
      
      // 直接実行（RPC関数が使えない場合）
      const { error: directError } = await supabase
        .from('xp_level_skp_settings')
        .select('id')
        .limit(1)

      if (directError && directError.code === '42P01') {
        console.error('❌ Table does not exist and cannot create via API')
        console.log('📋 Please run the following SQL in your Supabase dashboard:')
        console.log('\n' + '='.repeat(50))
        console.log(createTableSQL)
        console.log('='.repeat(50) + '\n')
      }
    } else {
      console.log('✅ Table created successfully via RPC')
    }

    // 更新トリガー作成
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_xp_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_xp_level_skp_settings_updated_at
        BEFORE UPDATE ON xp_level_skp_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_xp_settings_updated_at();
    `

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: triggerSQL
    })

    if (!triggerError) {
      console.log('✅ Trigger created successfully')
    }

    // 初期データ投入
    console.log('📊 Inserting initial settings...')
    
    const initialSettings = [
      // クイズXP設定（難易度別固定値）
      { setting_category: 'xp_quiz', setting_key: 'basic', setting_value: 10, setting_description: 'クイズ基礎難易度XP' },
      { setting_category: 'xp_quiz', setting_key: 'intermediate', setting_value: 20, setting_description: 'クイズ中級難易度XP' },
      { setting_category: 'xp_quiz', setting_key: 'advanced', setting_value: 30, setting_description: 'クイズ上級難易度XP' },
      { setting_category: 'xp_quiz', setting_key: 'expert', setting_value: 50, setting_description: 'クイズエキスパート難易度XP' },

      // コース学習XP設定（難易度別固定値）
      { setting_category: 'xp_course', setting_key: 'basic', setting_value: 15, setting_description: 'コース学習基礎難易度XP' },
      { setting_category: 'xp_course', setting_key: 'intermediate', setting_value: 25, setting_description: 'コース学習中級難易度XP' },
      { setting_category: 'xp_course', setting_key: 'advanced', setting_value: 35, setting_description: 'コース学習上級難易度XP' },
      { setting_category: 'xp_course', setting_key: 'expert', setting_value: 55, setting_description: 'コース学習エキスパート難易度XP' },

      // ボーナスXP設定
      { setting_category: 'xp_bonus', setting_key: 'quiz_accuracy_80', setting_value: 20, setting_description: 'クイズ80%以上正解ボーナスXP' },
      { setting_category: 'xp_bonus', setting_key: 'quiz_accuracy_100', setting_value: 30, setting_description: 'クイズ100%正解ボーナスXP' },
      { setting_category: 'xp_bonus', setting_key: 'course_completion', setting_value: 50, setting_description: 'コース完了ボーナスXP' },

      // レベル閾値設定
      { setting_category: 'level', setting_key: 'overall_threshold', setting_value: 1000, setting_description: '総合レベルアップ閾値XP' },
      { setting_category: 'level', setting_key: 'main_category_threshold', setting_value: 500, setting_description: 'メインカテゴリーレベルアップ閾値XP' },
      { setting_category: 'level', setting_key: 'industry_category_threshold', setting_value: 1000, setting_description: '業界カテゴリーレベルアップ閾値XP' },
      { setting_category: 'level', setting_key: 'industry_subcategory_threshold', setting_value: 500, setting_description: '業界サブカテゴリーレベルアップ閾値XP' },

      // SKP設定
      { setting_category: 'skp', setting_key: 'quiz_correct', setting_value: 10, setting_description: 'クイズ正解1問SKP' },
      { setting_category: 'skp', setting_key: 'quiz_incorrect', setting_value: 2, setting_description: 'クイズ不正解1問SKP' },
      { setting_category: 'skp', setting_key: 'quiz_perfect_bonus', setting_value: 50, setting_description: 'クイズ全問正解ボーナスSKP' },
      { setting_category: 'skp', setting_key: 'course_correct', setting_value: 10, setting_description: 'コース学習正解1問SKP' },
      { setting_category: 'skp', setting_key: 'course_incorrect', setting_value: 2, setting_description: 'コース学習不正解1問SKP' },
      { setting_category: 'skp', setting_key: 'course_complete_bonus', setting_value: 50, setting_description: 'コース完了ボーナスSKP' },
      { setting_category: 'skp', setting_key: 'daily_streak_bonus', setting_value: 10, setting_description: '毎日継続ボーナスSKP' },
      { setting_category: 'skp', setting_key: 'ten_day_streak_bonus', setting_value: 100, setting_description: '10日連続ボーナスSKP' }
    ]

    for (const setting of initialSettings) {
      const { error: insertError } = await supabase
        .from('xp_level_skp_settings')
        .upsert(setting, { 
          onConflict: 'setting_category,setting_key',
          ignoreDuplicates: false 
        })

      if (insertError) {
        console.error(`❌ Failed to insert setting ${setting.setting_category}.${setting.setting_key}:`, insertError.message)
      } else {
        console.log(`✅ Inserted ${setting.setting_category}.${setting.setting_key} = ${setting.setting_value}`)
      }
    }

    // インデックス作成
    console.log('🔧 Creating indexes...')
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_xp_level_skp_settings_category ON xp_level_skp_settings(setting_category);
      CREATE INDEX IF NOT EXISTS idx_xp_level_skp_settings_active ON xp_level_skp_settings(is_active);
    `

    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: indexSQL
    })

    if (!indexError) {
      console.log('✅ Indexes created successfully')
    }

    // 確認
    const { data: verifyData, error: verifyError } = await supabase
      .from('xp_level_skp_settings')
      .select('setting_category, count(*)')
      .eq('is_active', true)

    if (!verifyError && verifyData) {
      console.log('🎉 XP settings table setup completed!')
      console.log('📊 Settings summary:')
      verifyData.forEach(row => {
        console.log(`  - ${row.setting_category}: ${row.count} settings`)
      })
    } else {
      console.log('⚠️ Could not verify settings, but table should be ready')
    }

  } catch (error) {
    console.error('❌ Critical error:', error)
    console.log('\n📋 Manual setup required. Please run the SQL file in your Supabase dashboard:')
    console.log('   database/create_xp_level_skp_settings_table.sql')
  }
}

// スクリプト実行
createXPSettingsTable()
  .then(() => {
    console.log('🏁 Setup script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Setup script failed:', error)
    process.exit(1)
  })