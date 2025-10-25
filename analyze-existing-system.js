// 既存システムの関係性調査
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeExistingSystem() {
  console.log('🔍 既存システムの関係性調査...')
  
  try {
    // 1. learning_themesの詳細構造確認
    console.log('📚 learning_themes構造:')
    const { data: themes, error: themeError } = await supabase
      .from('learning_themes')
      .select(`
        id,
        title,
        genre_id,
        learning_genres (
          id,
          title,
          subcategory_id,
          category_id,
          subcategories (
            id,
            name,
            categories (
              id,
              name
            )
          ),
          learning_courses (
            id,
            title,
            difficulty
          )
        )
      `)
      .limit(3)
    
    if (!themeError && themes) {
      themes.forEach(theme => {
        console.log(`\nテーマ: ${theme.id} - ${theme.title}`)
        console.log(`  ジャンル: ${theme.learning_genres?.title}`)
        console.log(`  コース: ${theme.learning_genres?.learning_courses?.title}`)
        console.log(`  コース難易度: ${theme.learning_genres?.learning_courses?.difficulty}`)
        console.log(`  カテゴリー: ${theme.learning_genres?.subcategories?.categories?.name}`)
        console.log(`  サブカテゴリー: ${theme.learning_genres?.subcategories?.name}`)
      })
    }
    
    // 2. xp_level_skp_settings確認
    console.log('\n💎 xp_level_skp_settings確認:')
    const { data: xpSettings, error: xpError } = await supabase
      .from('xp_level_skp_settings')
      .select('*')
      .limit(5)
    
    if (!xpError && xpSettings) {
      console.log('XP設定構造:')
      xpSettings.forEach(setting => {
        console.log(`  Level ${setting.level}: Base XP=${setting.base_xp_requirement}, Theme XP=${setting.theme_completion_xp || 'N/A'}`)
      })
    }
    
    // 3. categories/subcategoriesマスタ確認
    console.log('\n📂 カテゴリーマスタ確認:')
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        category_id,
        subcategories (
          id,
          name
        )
      `)
      .eq('type', 'main')
      .limit(5)
    
    if (!catError && categories) {
      categories.forEach(cat => {
        console.log(`カテゴリー: ${cat.name} (${cat.category_id})`)
        cat.subcategories?.forEach(sub => {
          console.log(`  - サブ: ${sub.name}`)
        })
      })
    }
    
  } catch (error) {
    console.error('❌ 調査失敗:', error)
  }
}

analyzeExistingSystem()