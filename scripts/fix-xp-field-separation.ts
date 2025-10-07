/**
 * XP統計テーブルのデータ修正スクリプト
 * 
 * 目的: user_category_xp_stats_v2とuser_subcategory_xp_stats_v2のXPフィールドを正しく分離する
 * 問題: total_xpのみ更新されてquiz_xp/course_xpが正しく分離されていなかった
 * 解決: total_xp = quiz_xp + course_xpとなるよう既存データを修正
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface CategoryStatsRow {
  id: string
  user_id: string
  category_id: string
  total_xp: number
  quiz_xp: number
  course_xp: number
  quiz_sessions_completed: number
  course_sessions_completed: number
  current_level: number
  created_at: string
  updated_at: string
}

interface SubcategoryStatsRow {
  id: string
  user_id: string
  category_id: string
  subcategory_id: string
  total_xp: number
  quiz_xp: number
  course_xp: number
  quiz_sessions_completed: number
  course_sessions_completed: number
  current_level: number
  created_at: string
  updated_at: string
}

async function fixXPFieldSeparation() {
  console.log('🔧 XP統計テーブルデータ修正を開始します...')
  
  try {
    // 1. user_category_xp_stats_v2テーブル修正
    console.log('\n📊 Category統計テーブル修正中...')
    const { data: categoryStats, error: categoryError } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('*')
      .order('created_at', { ascending: true })

    if (categoryError) {
      console.error('❌ Category統計取得エラー:', categoryError)
      return
    }

    console.log(`📋 Category統計レコード数: ${categoryStats?.length || 0}`)
    
    if (categoryStats && categoryStats.length > 0) {
      for (const stat of categoryStats as CategoryStatsRow[]) {
        console.log(`\n🔍 処理中: User ${stat.user_id.substring(0, 8)}... Category ${stat.category_id}`)
        console.log(`  現在値: total_xp=${stat.total_xp}, quiz_xp=${stat.quiz_xp}, course_xp=${stat.course_xp}`)
        
        // 現在のtotal_xpが既にquiz_xp + course_xpと一致しているかチェック
        const calculatedTotal = (stat.quiz_xp || 0) + (stat.course_xp || 0)
        
        if (stat.total_xp === calculatedTotal && stat.total_xp !== 0) {
          console.log(`  ✅ 既に正しい値: total_xp=${stat.total_xp} = quiz_xp(${stat.quiz_xp}) + course_xp(${stat.course_xp})`)
          continue
        }
        
        // total_xpをquiz/courseの比率で分離
        // quiz_sessionsとcourse_sessionsの比率に基づいて分離
        const totalSessions = (stat.quiz_sessions_completed || 0) + (stat.course_sessions_completed || 0)
        
        let newQuizXP = stat.quiz_xp || 0
        let newCourseXP = stat.course_xp || 0
        
        if (totalSessions > 0 && stat.total_xp > 0) {
          // セッション数の比率で既存のtotal_xpを分離
          const quizRatio = (stat.quiz_sessions_completed || 0) / totalSessions
          const courseRatio = (stat.course_sessions_completed || 0) / totalSessions
          
          // 既存のquiz_xp/course_xpが0の場合のみ再計算
          if (stat.quiz_xp === 0 && stat.course_xp === 0) {
            newQuizXP = Math.round(stat.total_xp * quizRatio)
            newCourseXP = stat.total_xp - newQuizXP
          } else if (stat.quiz_xp === 0 && stat.course_xp > 0) {
            // course_xpは既に正しい、quiz_xpを計算
            newQuizXP = stat.total_xp - stat.course_xp
            newCourseXP = stat.course_xp
          } else if (stat.quiz_xp > 0 && stat.course_xp === 0) {
            // quiz_xpは既に正しい、course_xpを計算
            newQuizXP = stat.quiz_xp
            newCourseXP = stat.total_xp - stat.quiz_xp
          }
          
          // 負の値を防止
          newQuizXP = Math.max(0, newQuizXP)
          newCourseXP = Math.max(0, newCourseXP)
          
          console.log(`  🔧 修正値: quiz_xp=${newQuizXP}, course_xp=${newCourseXP}, total_xp=${newQuizXP + newCourseXP}`)
          
          // 値が変更される場合のみ更新
          if (newQuizXP !== stat.quiz_xp || newCourseXP !== stat.course_xp) {
            const { error: updateError } = await supabaseAdmin
              .from('user_category_xp_stats_v2')
              .update({
                quiz_xp: newQuizXP,
                course_xp: newCourseXP,
                total_xp: newQuizXP + newCourseXP,
                updated_at: new Date().toISOString()
              })
              .eq('id', stat.id)

            if (updateError) {
              console.error(`  ❌ 更新エラー:`, updateError)
            } else {
              console.log(`  ✅ 更新完了`)
            }
          }
        } else {
          console.log(`  ⏭️ スキップ: セッション数またはXPが0`)
        }
      }
    }

    // 2. user_subcategory_xp_stats_v2テーブル修正
    console.log('\n📊 Subcategory統計テーブル修正中...')
    const { data: subcategoryStats, error: subcategoryError } = await supabaseAdmin
      .from('user_subcategory_xp_stats_v2')
      .select('*')
      .order('created_at', { ascending: true })

    if (subcategoryError) {
      console.error('❌ Subcategory統計取得エラー:', subcategoryError)
      return
    }

    console.log(`📋 Subcategory統計レコード数: ${subcategoryStats?.length || 0}`)
    
    if (subcategoryStats && subcategoryStats.length > 0) {
      for (const stat of subcategoryStats as SubcategoryStatsRow[]) {
        console.log(`\n🔍 処理中: User ${stat.user_id.substring(0, 8)}... Subcategory ${stat.subcategory_id}`)
        console.log(`  現在値: total_xp=${stat.total_xp}, quiz_xp=${stat.quiz_xp}, course_xp=${stat.course_xp}`)
        
        // 現在のtotal_xpが既にquiz_xp + course_xpと一致しているかチェック
        const calculatedTotal = (stat.quiz_xp || 0) + (stat.course_xp || 0)
        
        if (stat.total_xp === calculatedTotal && stat.total_xp !== 0) {
          console.log(`  ✅ 既に正しい値: total_xp=${stat.total_xp} = quiz_xp(${stat.quiz_xp}) + course_xp(${stat.course_xp})`)
          continue
        }
        
        // total_xpをquiz/courseの比率で分離
        const totalSessions = (stat.quiz_sessions_completed || 0) + (stat.course_sessions_completed || 0)
        
        let newQuizXP = stat.quiz_xp || 0
        let newCourseXP = stat.course_xp || 0
        
        if (totalSessions > 0 && stat.total_xp > 0) {
          // セッション数の比率で既存のtotal_xpを分離
          const quizRatio = (stat.quiz_sessions_completed || 0) / totalSessions
          const courseRatio = (stat.course_sessions_completed || 0) / totalSessions
          
          // 既存のquiz_xp/course_xpが0の場合のみ再計算
          if (stat.quiz_xp === 0 && stat.course_xp === 0) {
            newQuizXP = Math.round(stat.total_xp * quizRatio)
            newCourseXP = stat.total_xp - newQuizXP
          } else if (stat.quiz_xp === 0 && stat.course_xp > 0) {
            // course_xpは既に正しい、quiz_xpを計算
            newQuizXP = stat.total_xp - stat.course_xp
            newCourseXP = stat.course_xp
          } else if (stat.quiz_xp > 0 && stat.course_xp === 0) {
            // quiz_xpは既に正しい、course_xpを計算
            newQuizXP = stat.quiz_xp
            newCourseXP = stat.total_xp - stat.quiz_xp
          }
          
          // 負の値を防止
          newQuizXP = Math.max(0, newQuizXP)
          newCourseXP = Math.max(0, newCourseXP)
          
          console.log(`  🔧 修正値: quiz_xp=${newQuizXP}, course_xp=${newCourseXP}, total_xp=${newQuizXP + newCourseXP}`)
          
          // 値が変更される場合のみ更新
          if (newQuizXP !== stat.quiz_xp || newCourseXP !== stat.course_xp) {
            const { error: updateError } = await supabaseAdmin
              .from('user_subcategory_xp_stats_v2')
              .update({
                quiz_xp: newQuizXP,
                course_xp: newCourseXP,
                total_xp: newQuizXP + newCourseXP,
                updated_at: new Date().toISOString()
              })
              .eq('id', stat.id)

            if (updateError) {
              console.error(`  ❌ 更新エラー:`, updateError)
            } else {
              console.log(`  ✅ 更新完了`)
            }
          }
        } else {
          console.log(`  ⏭️ スキップ: セッション数またはXPが0`)
        }
      }
    }

    console.log('\n🎉 XP統計テーブルデータ修正が完了しました！')
    
  } catch (error) {
    console.error('❌ XP統計データ修正エラー:', error)
  }
}

// 直接実行
if (require.main === module) {
  fixXPFieldSeparation()
    .then(() => {
      console.log('✅ スクリプト実行完了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ スクリプト実行エラー:', error)
      process.exit(1)
    })
}

export { fixXPFieldSeparation }