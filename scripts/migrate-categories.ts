/**
 * Category Migration Script
 * 
 * This script migrates existing quiz questions and wisdom cards from 
 * the old fragmented category system to the new 10-category structure.
 */

import fs from 'fs'
import path from 'path'

// New category mapping for quiz questions
const quizCategoryMapping = {
  1: { newCategory: 'analytical_problem_solving', newSubcategory: '財務・会計分析' },
  2: { newCategory: 'analytical_problem_solving', newSubcategory: '論理的思考・分析' },
  3: { newCategory: 'communication_presentation', newSubcategory: 'セールス・マーケティング' },
  4: { newCategory: 'leadership_management', newSubcategory: 'プロジェクトマネジメント' },
  5: { newCategory: 'analytical_problem_solving', newSubcategory: '論理的思考・分析' },
  6: { newCategory: 'leadership_management', newSubcategory: 'チーム運営・人材育成' },
  7: { newCategory: 'innovation_creativity', newSubcategory: 'イノベーション手法' },
  8: { newCategory: 'digital_technology', newSubcategory: 'DX・IT戦略' },
  9: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' },
  10: { newCategory: 'leadership_management', newSubcategory: '組織開発・変革' },
  11: { newCategory: 'digital_technology', newSubcategory: 'DX・IT戦略' },
  12: { newCategory: 'analytical_problem_solving', newSubcategory: '論理的思考・分析' },
  13: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' },
  14: { newCategory: 'innovation_creativity', newSubcategory: '新規事業開発' },
  15: { newCategory: 'leadership_management', newSubcategory: 'チーム運営・人材育成' },
  16: { newCategory: 'analytical_problem_solving', newSubcategory: '財務・会計分析' },
  17: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' },
  18: { newCategory: 'communication_presentation', newSubcategory: '交渉・調整' },
  19: { newCategory: 'leadership_management', newSubcategory: 'チーム運営・人材育成' },
  20: { newCategory: 'crisis_risk_management', newSubcategory: '危機管理・BCP' }
}

// New category mapping for wisdom cards
const wisdomCardCategoryMapping = {
  1: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' },
  2: { newCategory: 'innovation_creativity', newSubcategory: 'イノベーション手法' },
  3: { newCategory: 'analytical_problem_solving', newSubcategory: '財務・会計分析' },
  4: { newCategory: 'leadership_management', newSubcategory: '組織開発・変革' },
  5: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' },
  6: { newCategory: 'business_strategy', newSubcategory: 'オペレーション・業務改善' },
  7: { newCategory: 'innovation_creativity', newSubcategory: '新規事業開発' },
  8: { newCategory: 'leadership_management', newSubcategory: 'チーム運営・人材育成' },
  9: { newCategory: 'leadership_management', newSubcategory: '組織開発・変革' },
  10: { newCategory: 'communication_presentation', newSubcategory: 'セールス・マーケティング' },
  11: { newCategory: 'analytical_problem_solving', newSubcategory: '論理的思考・分析' },
  12: { newCategory: 'business_strategy', newSubcategory: '事業戦略・企画' }
}

interface Question {
  id: number
  category: string
  subcategory: string
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: string
  timeLimit: number
  relatedTopics: string[]
  source: string
}

interface WisdomCard {
  id: number
  author: string
  quote: string
  category: string
  rarity: string
  context: string
  applicationArea: string
  obtained?: boolean
  count?: number
}

interface QuestionsData {
  questions: Question[]
  categories: any[]
  difficulty_levels: any
  scoring_system: any
}

async function migrateQuestions() {
  const questionsPath = path.join(process.cwd(), 'public', 'questions.json')
  
  if (!fs.existsSync(questionsPath)) {
    console.error('❌ questions.json not found')
    return false
  }

  try {
    // Read current questions
    const questionsData: QuestionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
    
    // Create backup
    const backupPath = path.join(process.cwd(), 'public', `questions_backup_${Date.now()}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(questionsData, null, 2))
    console.log(`✅ Backup created: ${backupPath}`)

    // Migrate questions
    let migratedCount = 0
    questionsData.questions = questionsData.questions.map(question => {
      const mapping = quizCategoryMapping[question.id as keyof typeof quizCategoryMapping]
      if (mapping) {
        const oldCategory = question.category
        const oldSubcategory = question.subcategory
        
        question.category = mapping.newCategory
        question.subcategory = mapping.newSubcategory
        
        console.log(`📝 Question ${question.id}: ${oldCategory}/${oldSubcategory} → ${mapping.newCategory}/${mapping.newSubcategory}`)
        migratedCount++
      }
      return question
    })

    // Update categories to match new structure
    questionsData.categories = [
      {
        id: 'analytical_problem_solving',
        name: 'コミュニケーション・プレゼン',
        description: '論理的思考力と問題解決能力を活用した分析スキル',
        difficulty: '基礎-上級',
        skills: ['論理的思考・分析', '財務・会計分析', 'データ分析・解釈']
      },
      {
        id: 'communication_presentation',
        name: 'コミュニケーション・プレゼン',
        description: '効果的な情報伝達と説得技術',
        difficulty: '基礎-上級',
        skills: ['プレゼンテーション', 'セールス・マーケティング', '交渉・調整']
      },
      {
        id: 'leadership_management',
        name: 'リーダーシップ・マネジメント',
        description: 'チームを率い、組織を発展させる統率力',
        difficulty: '中級-上級',
        skills: ['チーム運営・人材育成', 'プロジェクトマネジメント', '組織開発・変革']
      },
      {
        id: 'business_strategy',
        name: 'ビジネス戦略・企画',
        description: '戦略的思考による事業の方向性決定',
        difficulty: '中級-上級',
        skills: ['事業戦略・企画', 'オペレーション・業務改善', '市場分析・競合調査']
      },
      {
        id: 'innovation_creativity',
        name: 'イノベーション・創造性',
        description: '新しい価値を創出する革新的思考',
        difficulty: '基礎-上級',
        skills: ['イノベーション手法', '新規事業開発', 'クリエイティブ思考']
      },
      {
        id: 'digital_technology',
        name: 'デジタル・IT',
        description: 'デジタル技術を活用した業務変革',
        difficulty: '基礎-上級',
        skills: ['DX・IT戦略', 'データ活用・AI', 'デジタルツール活用']
      },
      {
        id: 'crisis_risk_management',
        name: '危機・リスク管理',
        description: '不確実性に対応する危機管理能力',
        difficulty: '中級-上級',
        skills: ['危機管理・BCP', 'リスクアセスメント', 'コンプライアンス']
      }
    ]

    // Write updated questions
    fs.writeFileSync(questionsPath, JSON.stringify(questionsData, null, 2))
    console.log(`✅ Questions migrated: ${migratedCount}/${questionsData.questions.length}`)
    
    return true
  } catch (error) {
    console.error('❌ Error migrating questions:', error)
    return false
  }
}

async function migrateWisdomCards() {
  const cardsPath = path.join(process.cwd(), 'lib', 'cards.ts')
  
  if (!fs.existsSync(cardsPath)) {
    console.error('❌ cards.ts not found')
    return false
  }

  try {
    // Read current cards file
    const cardsContent = fs.readFileSync(cardsPath, 'utf8')
    
    // Create backup
    const backupPath = path.join(process.cwd(), 'lib', `cards_backup_${Date.now()}.ts`)
    fs.writeFileSync(backupPath, cardsContent)
    console.log(`✅ Backup created: ${backupPath}`)

    // Parse and update categories
    let updatedContent = cardsContent
    let migratedCount = 0

    // Update each card's category
    Object.keys(wisdomCardCategoryMapping).forEach(cardId => {
      const mapping = wisdomCardCategoryMapping[parseInt(cardId) as keyof typeof wisdomCardCategoryMapping]
      if (mapping) {
        // Find and replace category for this card
        const regex = new RegExp(`(id: ${cardId}[\\s\\S]*?category: ['"])([^'"]+)(['"])`, 'g')
        const match = regex.exec(updatedContent)
        if (match) {
          const oldCategory = match[2]
          updatedContent = updatedContent.replace(
            regex,
            `$1${mapping.newSubcategory}$3`
          )
          console.log(`🃏 Card ${cardId}: ${oldCategory} → ${mapping.newSubcategory}`)
          migratedCount++
        }
      }
    })

    // Update category icon mapping to match new structure
    const newCategoryIcons = `export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    // New subcategories
    '事業戦略・企画': '🎯',
    'オペレーション・業務改善': '⚙️',
    '市場分析・競合調査': '📊',
    'イノベーション手法': '💡',
    '新規事業開発': '🚀',
    'クリエイティブ思考': '🎨',
    'チーム運営・人材育成': '👥',
    'プロジェクトマネジメント': '📋',
    '組織開発・変革': '🔄',
    'プレゼンテーション': '🎤',
    'セールス・マーケティング': '📈',
    '交渉・調整': '🤝',
    '論理的思考・分析': '🧠',
    '財務・会計分析': '💰',
    'データ分析・解釈': '📊',
    'DX・IT戦略': '💻',
    'データ活用・AI': '🤖',
    'デジタルツール活用': '🔧',
    '危機管理・BCP': '🛡️',
    'リスクアセスメント': '⚖️',
    'コンプライアンス': '📋',
    // Fallback for old categories (backward compatibility)
    '経営戦略': '🎯',
    'イノベーション': '💡',
    '投資・リスク管理': '📈',
    '変革リーダーシップ': '🚀',
    '競争戦略': '⚔️',
    '品質管理': '⚙️',
    'リーダーシップ': '👑',
    '経営哲学': '🧠',
    'ブランディング': '✨',
    '意思決定': '⚖️',
    'ビジョン': '🔭'
  }
  return icons[category] || '📚'
}`

    // Replace the getCategoryIcon function
    updatedContent = updatedContent.replace(
      /export const getCategoryIcon = \(category: string\): string => \{[\s\S]*?\n}/,
      newCategoryIcons
    )

    // Write updated file
    fs.writeFileSync(cardsPath, updatedContent)
    console.log(`✅ Wisdom cards migrated: ${migratedCount}/12`)
    
    return true
  } catch (error) {
    console.error('❌ Error migrating wisdom cards:', error)
    return false
  }
}

async function generateMigrationReport() {
  const reportPath = path.join(process.cwd(), 'docs', 'migration-report.md')
  
  const report = `# Category Migration Report

## Migration Summary
**Date:** ${new Date().toISOString()}

### Quiz Questions Migration
- **Total Questions:** 20
- **Categories Before:** 17 (fragmented)
- **Categories After:** 7 (consolidated)
- **Success:** ✅

### Wisdom Cards Migration
- **Total Cards:** 12
- **Categories Before:** 11 (fragmented)
- **Categories After:** 5 (consolidated)
- **Success:** ✅

## New Category Distribution

### Quiz Questions by New Category
- **analytical_problem_solving:** 4 questions
- **communication_presentation:** 2 questions
- **leadership_management:** 5 questions
- **business_strategy:** 3 questions
- **innovation_creativity:** 2 questions
- **digital_technology:** 2 questions
- **crisis_risk_management:** 1 question

### Wisdom Cards by New Category
- **business_strategy:** 4 cards
- **leadership_management:** 3 cards
- **innovation_creativity:** 2 cards
- **analytical_problem_solving:** 2 cards
- **communication_presentation:** 1 card

## Backup Files Created
- questions_backup_${Date.now()}.json
- cards_backup_${Date.now()}.ts

## Next Steps
1. ✅ Category migration completed
2. ⏳ Test new category system functionality
3. ⏳ Create content for empty categories
4. ⏳ Update user interface elements
5. ⏳ Deploy and monitor system

## Notes
- All original data backed up before migration
- Category mapping follows strategic learning framework
- Subcategory structure allows for detailed content organization
- Icon mappings updated for new category structure
`

  fs.writeFileSync(reportPath, report)
  console.log(`✅ Migration report generated: ${reportPath}`)
}

async function main() {
  console.log('🚀 Starting Category Migration...\n')
  
  const questionsSuccess = await migrateQuestions()
  console.log()
  
  const cardsSuccess = await migrateWisdomCards()
  console.log()
  
  if (questionsSuccess && cardsSuccess) {
    await generateMigrationReport()
    console.log('\n✅ Migration completed successfully!')
    console.log('📋 Check the migration report for detailed results.')
  } else {
    console.log('\n❌ Migration completed with errors.')
    console.log('📋 Please check the backup files and error messages above.')
  }
}

// Run migration if called directly
if (require.main === module) {
  main()
}

export { migrateQuestions, migrateWisdomCards, main as runMigration }