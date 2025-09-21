/**
 * quiz_questionsテーブルのsubcategory_idを正しいIDに修正
 * ALEカテゴリー一覧PDFの情報に基づく
 */

import { config } from 'dotenv'
config()

import { createClient } from '@supabase/supabase-js'

// 環境変数から直接読み込み
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// quiz_questionsで使用されている誤ったIDを正しいIDにマッピング
const quizSubcategoryIdMapping: Record<string, string> = {
  // AI・デジタル活用
  "ai_basics_business_application": "ai_ml_utilization",
  "ai_machine_learning_application": "ai_ml_utilization",
  "ai_ml_infrastructure": "ai_ml_utilization",
  "iot_automation_technology": "iot_automation",
  "dx_strategy_digital_transformation": "dx_strategy_transformation",
  "dx_strategy_execution": "dx_strategy_transformation",
  "data_analysis_bi": "data_driven_management",

  // 論理的思考・問題解決
  "behavioral_economics_decision_theory": "behavioral_economics",
  "hypothesis_validation_essence": "hypothesis_verification",
  "structured_thinking_mece_logic": "structured_thinking_mece",

  // 戦略・経営
  "business_strategy_management": "business_strategy",
  "new_business_development_innovation": "new_business_innovation",
  "esg_sustainability_management": "esg_sustainability",

  // 財務・ファイナンス
  "capital_policy_financing": "business_planning_funding",

  // マーケティング・営業
  "marketing_strategy_frameworks": "branding_positioning",
  "sales_strategy_methods": "sales_strategy_crm",

  // リーダーシップ・人事
  "hr_strategy_work_reform": "hr_strategy_workstyle",

  // コミュニケーション・プレゼンテーション
  "document_visualization_skills": "document_visualization_tech",
  "meeting_facilitation_management": "meeting_facilitation",

  // プロジェクト・業務管理
  "business_efficiency_time_management": "business_efficiency_time",

  // ビジネスプロセス・業務分析
  "bpr_business_process_reengineering": "bpr_business_reform",
  "system_implementation_migration": "business_system_design",
  "system_utilization_efficiency": "business_system_design",

  // コンサルティング業界
  "case_interview_structured_thinking": "case_interview_structured",
  "hypothesis_thinking_issue_tree": "hypothesis_thinking_issue",
  "project_crisis_recovery": "project_recovery",
  "project_management_consulting": "operation_reform",
  "regulated_industry_compliance": "regulated_industry",
  "client_relationship_building": "continuous_sales_strategy",

  // SI業界
  "multi_tier_vendor_management": "multi_tier_vendor",
  "customer_requirement_analysis": "customer_requirement",

  // 商社業界
  "commodity_futures_derivatives": "commodity_derivatives",
  "product_knowledge_market_analysis": "commodity_market_analysis",
  "price_negotiation_risk_hedge": "price_negotiation_hedge",
  "portfolio_company_management": "investment_participation",
  "digital_trade": "multilateral_trade",

  // 不明・その他 - 適切なカテゴリに振り分け
  "category_level": "business_strategy" // 一般的な戦略レベルの質問として
}

async function fixQuizSubcategoryIds() {
  console.log('🔄 quiz_questionsテーブルのsubcategory_idの修正を開始します...')

  try {
    // 1. 現在のquiz_questionsのsubcategory_idをカウント
    const { data: questions, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('id, subcategory_id')

    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }

    // 修正対象のsubcategory_idをカウント
    const subcategoryIdCounts: Record<string, number> = {}
    questions?.forEach(q => {
      subcategoryIdCounts[q.subcategory_id] = (subcategoryIdCounts[q.subcategory_id] || 0) + 1
    })

    console.log(`📊 総質問数: ${questions?.length}`)
    console.log(`📊 ユニークなsubcategory_id数: ${Object.keys(subcategoryIdCounts).length}`)

    let updateCount = 0
    let skipCount = 0

    // 2. 各subcategory_idを修正
    for (const [oldId, newId] of Object.entries(quizSubcategoryIdMapping)) {
      const questionCount = subcategoryIdCounts[oldId] || 0
      
      if (questionCount > 0) {
        console.log(`🔄 修正中: "${oldId}" → "${newId}" (${questionCount}問)`)
        
        // バッチで更新
        const { error: updateError } = await supabase
          .from('quiz_questions')
          .update({ 
            subcategory_id: newId,
            updated_at: new Date().toISOString()
          })
          .eq('subcategory_id', oldId)

        if (updateError) {
          console.error(`❌ 更新失敗 "${oldId}": ${updateError.message}`)
        } else {
          updateCount += questionCount
          console.log(`✅ 更新成功: ${questionCount}問のsubcategory_idを "${newId}" に変更`)
        }
      } else {
        skipCount++
        console.log(`⏭️  スキップ: "${oldId}" (該当する質問なし)`)
      }
    }

    console.log(`\n✅ 修正完了! 更新: ${updateCount}問, スキップ: ${skipCount}件`)

    // 3. 修正後の状況を確認
    const { data: updatedQuestions, error: verifyError } = await supabase
      .from('quiz_questions')
      .select('subcategory_id')

    if (verifyError) {
      throw new Error(`確認エラー: ${verifyError.message}`)
    }

    const updatedCounts: Record<string, number> = {}
    updatedQuestions?.forEach(q => {
      updatedCounts[q.subcategory_id] = (updatedCounts[q.subcategory_id] || 0) + 1
    })

    console.log('\n📋 修正後のsubcategory_id使用状況:')
    Object.entries(updatedCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([id, count]) => {
        console.log(`  - ${id}: ${count}問`)
      })

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
fixQuizSubcategoryIds()
  .then(() => {
    console.log('\n✅ quiz_questionsのsubcategory_id修正が完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 修正プロセスでエラーが発生しました:', error)
    process.exit(1)
  })