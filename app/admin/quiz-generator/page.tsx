'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sparkles, 
  Copy, 
  Check,
  FileJson,
  AlertCircle,
  Edit2,
  Trash2,
  Upload,
  FileCheck,
  Loader2
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'
import { generateAIOptimizedPrompt } from '@/lib/ai-prompt-generators'
import MarkdownContent from '@/components/ui/markdown-content'

interface Category {
  category_id: string
  name: string
  description: string
  type?: 'main' | 'industry'
  is_active?: boolean
}

interface Subcategory {
  subcategory_id: string
  name: string
  description: string
  parent_category_id: string
}

interface SkillLevel {
  id: string
  name: string
  display_name: string
  description: string
  display_order: number
}

interface DistributionItem {
  category_id: string
  subcategory_id: string
  difficulty: string
  question_count: number
  usage_count: number
  last_created: string | null
  last_used: string | null
}

interface CategorySummary {
  category_id: string
  name: string
  type: 'main' | 'industry'
  description: string
  is_active: boolean
  total_questions: number
  total_usage: number
  subcategory_count: number
  difficulty_distribution: {[key: string]: number}
}

interface DistributionData {
  success: boolean
  distribution: DistributionItem[]
  category_summary: CategorySummary[]
  metadata: {
    categories: Category[]
    subcategories: Subcategory[]
    skill_levels: SkillLevel[]
    total_combinations: number
    total_questions: number
    retrieved_at: string
  }
}

interface QuizQuestion {
  id?: string | number
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  correctAnswer: string  // A-D形式（表示用）
  correct?: number       // 0-3インデックス（DB保存用）
  explanation: string
  category: string
  subcategory: string
  difficulty: string
  timeLimit?: number
  tags?: string[]
  source?: string
  deleted?: boolean
  hint1?: string | null
  hint2?: string | null
  hint3?: string | null
  metadata?: {
    generated_by?: string
    generated_at?: string
    reviewed?: boolean
    [key: string]: unknown
  }
}

export default function QuizGeneratorPage() {
  const { isSystemAdmin, isAdmin } = useUserRole()
  const { user } = useAuth()
  const { toast, toasts, removeToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [count, setCount] = useState(5)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isPromptEditing, setIsPromptEditing] = useState(false)
  const [generatedResult, setGeneratedResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([])
  const [showReview, setShowReview] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [savingToReview, setSavingToReview] = useState(false)
  const [validating, setValidating] = useState(false)
  const [saveToReviewMode, setSaveToReviewMode] = useState(true) // レビューDB保存モード（デフォルトはレビューDB）
  const [existingQuestionStats, setExistingQuestionStats] = useState<{[key: string]: number}>({})
  const [existingQuestionSamples, setExistingQuestionSamples] = useState<{[key: string]: string[]}>({})
  const [showExistingQuestions, setShowExistingQuestions] = useState(false)
  const [parameterHash, setParameterHash] = useState('')
  const [isPromptOutdated, setIsPromptOutdated] = useState(false)
  const [showDistribution, setShowDistribution] = useState(false)
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null)
  const [distributionLoading, setDistributionLoading] = useState(false)
  
  // 分布表フィルタリング用state
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('')
  const [filterRecommendation, setFilterRecommendation] = useState<string>('')
  const [selectedAiModel, setSelectedAiModel] = useState<string>('claude') // Step 1用
  const [actualUsedAiModel, setActualUsedAiModel] = useState<string>('claude') // Step 3用（実際に使用したAI）
  const [customInstructions, setCustomInstructions] = useState<string>('') // カスタム指示（サブカテゴリー詳細指定用）

  // 認証付きFetch関数（CLAUDE.md準拠）
  const directAuthenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!user?.id) {
      throw new Error('ユーザー認証が必要です')
    }

    // Supabaseセッションからアクセストークン取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const { createClient } = await import('@supabase/supabase-js')
    const freshClient = createClient(supabaseUrl, anonKey)
    
    const { data: sessionData } = await freshClient.auth.getSession()
    const token = sessionData.session?.access_token
    
    if (!token) {
      throw new Error('認証トークンが見つかりません')
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  }, [user?.id])

  // 基本データ取得（認証不要）
  useEffect(() => {
    const fetchBasicData = async () => {
      setLoading(true)
      try {
        // カテゴリー取得
        const categoriesResponse = await fetch('/api/categories')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.categories || [])
        }

        // サブカテゴリー取得
        const subcategoriesResponse = await fetch('/api/subcategories')
        if (subcategoriesResponse.ok) {
          const subcategoriesData = await subcategoriesResponse.json()
          setSubcategories(subcategoriesData.subcategories || [])
        }

        // スキルレベル取得
        const skillLevelsResponse = await fetch('/api/skill-levels')
        if (skillLevelsResponse.ok) {
          const skillLevelsData = await skillLevelsResponse.json()
          console.log('Skill levels data:', skillLevelsData) // デバッグ用
          setSkillLevels(skillLevelsData.skill_levels || [])
        }
      } catch (error) {
        console.error('基本データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isSystemAdmin || isAdmin) {
      fetchBasicData()
    }
  }, [isSystemAdmin, isAdmin])

  // 統計データ取得（認証必要）
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.id || (!isSystemAdmin && !isAdmin)) return

      try {
        console.log('Fetching statistics with authentication...')
        const existingQuestionsResponse = await directAuthenticatedFetch('/api/admin/questions/stats')
        if (existingQuestionsResponse.ok) {
          const statsData = await existingQuestionsResponse.json()
          console.log('Statistics data received:', statsData) // デバッグ用
          console.log('Subcategory stats:', statsData.subcategory_stats)
          console.log('Subcategory samples:', statsData.subcategory_samples)
          setExistingQuestionStats(statsData.subcategory_stats || {})
          setExistingQuestionSamples(statsData.subcategory_samples || {})
        } else {
          console.error('Statistics API failed:', existingQuestionsResponse.status)
          const errorText = await existingQuestionsResponse.text()
          console.error('Error details:', errorText)
        }
      } catch (statsError) {
        console.error('Statistics fetch error:', statsError)
      }
    }

    fetchStatistics()
  }, [user?.id, isSystemAdmin, isAdmin, directAuthenticatedFetch])

  // カテゴリー選択時のサブカテゴリーフィルタリング
  useEffect(() => {
    if (selectedCategory) {
      const filtered = subcategories.filter(sub => sub.parent_category_id === selectedCategory)
      setFilteredSubcategories(filtered)
      setSelectedSubcategory('') // サブカテゴリーをリセット
    } else {
      setFilteredSubcategories([])
      setSelectedSubcategory('')
    }
  }, [selectedCategory, subcategories])

  // パラメータ変更検知（プロンプト生成後の設定変更を検知）
  useEffect(() => {
    const currentHash = `${selectedCategory}-${selectedSubcategory}-${difficulty}-${count}`
    
    // プロンプトが生成済みで、パラメータが変更された場合
    if (generatedPrompt && parameterHash && currentHash !== parameterHash) {
      setIsPromptOutdated(true)
    } else if (!generatedPrompt) {
      setIsPromptOutdated(false)
    }
    
    // 現在のハッシュを保存
    setParameterHash(currentHash)
  }, [selectedCategory, selectedSubcategory, difficulty, count, generatedPrompt, parameterHash])

  // プロンプトクリア機能
  const clearPrompt = () => {
    setGeneratedPrompt('')
    setGeneratedResult('')
    setParsedQuestions([])
    setShowReview(false)
    setValidationError('')
    setIsPromptOutdated(false)
    setIsPromptEditing(false)
  }

  // 分布データ取得
  const fetchDistributionData = async () => {
    setDistributionLoading(true)
    try {
      const response = await directAuthenticatedFetch('/api/admin/questions/distribution')
      if (response.ok) {
        const data = await response.json()
        setDistributionData(data)
      } else {
        console.error('分布データ取得エラー:', response.status)
      }
    } catch (error) {
      console.error('分布データ取得エラー:', error)
    } finally {
      setDistributionLoading(false)
    }
  }

  // 一覧から設定を選択
  const selectFromDistribution = (category_id: string, subcategory_id: string, difficulty: string) => {
    setSelectedCategory(category_id)
    setDifficulty(difficulty)
    setShowDistribution(false)
    // プロンプトが古くなるのでクリア
    clearPrompt()
    
    // カテゴリー変更でサブカテゴリーがリセットされるのを防ぐため、setTimeout で遅延設定
    setTimeout(() => {
      setSelectedSubcategory(subcategory_id)
    }, 100)
  }

  // 権限チェックはadmin/layout.tsxのPermissionGuardで実施済み

  const generatePrompt = () => {
    // 必須項目のバリデーション
    if (!selectedCategory) {
      toast({
        title: 'カテゴリーを選択してください',
        description: 'プロンプト生成にはカテゴリーの選択が必要です。',
        variant: 'destructive'
      })
      return
    }
    
    if (!selectedSubcategory) {
      toast({
        title: 'サブカテゴリーを選択してください',
        description: 'プロンプト生成にはサブカテゴリーの選択が必要です。',
        variant: 'destructive'
      })
      return
    }
    
    if (!difficulty) {
      toast({
        title: '難易度を選択してください',
        description: 'プロンプト生成には難易度の選択が必要です。',
        variant: 'destructive'
      })
      return
    }
    
    const selectedCategoryData = categories.find(cat => cat.category_id === selectedCategory)
    const selectedSubcategoryData = filteredSubcategories.find(sub => sub.subcategory_id === selectedSubcategory)
    const selectedSkillLevelData = skillLevels.find(skill => skill.id === difficulty)
    
    const categoryName = selectedCategoryData?.name || 'プログラミング'
    const categoryId = selectedCategory
    const categoryType = selectedCategoryData?.type || 'main'
    const subcategoryName = selectedSubcategoryData?.name || 'JavaScript'
    const subcategoryId = selectedSubcategory
    const difficultyName = selectedSkillLevelData?.name || '中級'
    const difficultyId = difficulty
    
    // カテゴリータイプによる説明
    const categoryTypeDescription = categoryType === 'main' 
      ? '全てのビジネスマンが広く身に着けるべきビジネススキル'
      : 'その業界で働く、もしくは目指している人向けの専門スキル'
    
    // 既存問題数チェック
    const existingCount = existingQuestionStats[subcategoryId] || 0
    const existingSamples = existingQuestionSamples[subcategoryId] || []
    
    let duplicateWarning = ''
    let existingContext = ''
    
    if (existingCount > 0) {
      duplicateWarning = `\n⚠️ 重要: この${subcategoryName}カテゴリーには既に${existingCount}問の問題が登録されています。重複を避けて新しい切り口・視点から問題を作成してください。`
      
      if (existingSamples.length > 0) {
        const maxSamplesInPrompt = Math.min(existingSamples.length, 15) // プロンプト長制限のため最大15問
        existingContext = `\n【既存問題一覧（全${existingSamples.length}問中${maxSamplesInPrompt}問表示・重複回避必須）】\n${existingSamples.slice(0, maxSamplesInPrompt).map((sample, idx) => `${idx + 1}. ${sample}`).join('\n')}${existingSamples.length > maxSamplesInPrompt ? `\n...他${existingSamples.length - maxSamplesInPrompt}問あり` : ''}\n\n⚠️ 上記全問題と重複しない、完全に新しい観点・アプローチで出題してください。\n⚠️ 難易度設定ミスも考慮し、この分野の全難易度レベルの既存問題を避けてください。`
      }
    } else {
      duplicateWarning = `\n✅ この${subcategoryName}カテゴリーは新規分野です。基礎から応用まで体系的な問題作成が可能です。`
    }
    
    // サブカテゴリー説明を取得（存在する場合）
    const subcategoryDescription = selectedSubcategoryData?.description || ''

    // AI別プロンプト最適化機能を使用
    const promptData = {
      categoryName,
      categoryId,
      categoryType,
      subcategoryName,
      subcategoryId,
      subcategoryDescription, // サブカテゴリーの詳細説明を追加
      customInstructions: customInstructions.trim(), // ユーザー入力のカスタム指示
      difficultyName,
      difficultyId,
      count,
      duplicateWarning,
      existingContext,
      categoryTypeDescription,
      existingCount
    }
    
    const prompt = generateAIOptimizedPrompt(selectedAiModel, promptData)

    setGeneratedPrompt(prompt)
    setIsPromptOutdated(false)
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const validateAndReview = async () => {
    setValidating(true)
    setValidationError('')
    try {
      const parsed = JSON.parse(generatedResult)
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('questions配列が見つかりません')
      }

      // 既存の最大legacy_idを取得
      let maxLegacyId = 0
      try {
        const response = await directAuthenticatedFetch('/api/admin/questions/max-id')
        if (response.ok) {
          const data = await response.json()
          maxLegacyId = data.maxId || 0
        }
      } catch (error) {
        console.log('最大ID取得エラー（新規DBの可能性）:', error)
        maxLegacyId = 0
      }

      // 問題データを整形
      const formattedQuestions = parsed.questions.map((q: QuizQuestion, index: number) => {
        // 正解選択肢をABCD形式から0-3のインデックスに変換
        let correctAnswerIndex = 0
        if (typeof q.correctAnswer === 'string') {
          const answerMap: {[key: string]: number} = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }
          correctAnswerIndex = answerMap[q.correctAnswer.toUpperCase()] ?? 0
        } else if (typeof q.correctAnswer === 'number') {
          correctAnswerIndex = q.correctAnswer
        }

        return {
          ...q,
          id: maxLegacyId + index + 1, // 既存の最大値から連番
          correct: correctAnswerIndex,  // 0-3のインデックス形式（DB保存用）
          correctAnswer: ['A', 'B', 'C', 'D'][correctAnswerIndex], // A-D形式（表示用）
          category: q.category || selectedCategory,
          subcategory: q.subcategory || selectedSubcategory,
          difficulty: q.difficulty || difficulty,
          deleted: false,
          metadata: {
            ...q.metadata,
            generated_by: 'AI (Claude)',
            generated_at: new Date().toISOString(),
            reviewed: false
          }
        }
      })

      setParsedQuestions(formattedQuestions)
      setValidationError('')
      setShowReview(true)
    } catch (error) {
      setValidationError(`JSONの解析に失敗しました: ${error}`)
    } finally {
      setValidating(false)
    }
  }

  const handleEdit = (index: number) => {
    setEditingIndex(editingIndex === index ? null : index)
  }

  const handleQuestionUpdate = (index: number, field: string, value: string) => {
    const updated = [...parsedQuestions]
    if (field.startsWith('options.')) {
      const optionKey = field.split('.')[1] as 'A' | 'B' | 'C' | 'D'
      if (optionKey && ['A', 'B', 'C', 'D'].includes(optionKey)) {
        updated[index].options[optionKey] = value
      }
    } else {
      // 型安全な更新
      if (field === 'question') {
        updated[index].question = value
      } else if (field === 'correctAnswer') {
        updated[index].correctAnswer = value
        // A-Dを0-3のインデックスに変換してcorrectフィールドも更新
        const answerMap: {[key: string]: number} = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }
        updated[index].correct = answerMap[value] ?? 0
      } else if (field === 'explanation') {
        updated[index].explanation = value
      } else if (field === 'category') {
        updated[index].category = value
      } else if (field === 'subcategory') {
        updated[index].subcategory = value
      } else if (field === 'difficulty') {
        updated[index].difficulty = value
      } else if (field === 'timeLimit') {
        updated[index].timeLimit = parseInt(value) || 45
      } else if (field === 'source') {
        updated[index].source = value
      } else if (field === 'tags') {
        updated[index].tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      } else if (field === 'hint1') {
        updated[index].hint1 = value
      } else if (field === 'hint2') {
        updated[index].hint2 = value
      } else if (field === 'hint3') {
        updated[index].hint3 = value
      }
    }
    setParsedQuestions(updated)
  }

  const handleRemoveQuestion = (index: number) => {
    const updated = parsedQuestions.filter((_, i) => i !== index)
    setParsedQuestions(updated)
  }

  // レビューDBに保存する関数
  const saveToReviewDB = async () => {
    if (parsedQuestions.length === 0) return
    
    setSavingToReview(true)
    try {
      // サブカテゴリーデータを確実に取得
      let availableSubcategories = subcategories
      if (subcategories.length === 0) {
        console.log('🔄 Reloading subcategories for review save...')
        const subcategoriesResponse = await fetch('/api/subcategories')
        if (subcategoriesResponse.ok) {
          const subcategoriesData = await subcategoriesResponse.json()
          availableSubcategories = subcategoriesData.subcategories || []
          setSubcategories(availableSubcategories)
        }
      }
      
      console.log('📋 Available subcategories for mapping:', availableSubcategories.length)
      
      // レビューDB用のデータ形式に変換
      const reviewQuestions = parsedQuestions.map((q) => {
        // サブカテゴリー情報を正しくマッピング
        const subcategoryInfo = availableSubcategories.find(sub => 
          sub.name === q.subcategory ||
          sub.subcategory_id === q.subcategory
        )
        
        return {
          question: q.question,
          options: q.options, // オブジェクト形式のまま送信（APIで変換される）
          correctAnswer: q.correctAnswer,
          correct: q.correct,
          explanation: q.explanation,
          category: q.category,
          subcategory: subcategoryInfo?.name || q.subcategory,
          subcategory_id: subcategoryInfo?.subcategory_id || '',
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          tags: q.tags,
          source: q.source,
          hint1: q.hint1 || null,
          hint2: q.hint2 || null,
          hint3: q.hint3 || null
        }
      })

      const response = await directAuthenticatedFetch('/api/admin/review', {
        method: 'POST',
        body: JSON.stringify({ 
          questions: reviewQuestions,
          aiPrompt: generatedPrompt,
          aiModel: actualUsedAiModel, // 実際に使用したAIモデルを記録
          generationParams: {
            category: selectedCategory,
            subcategory: selectedSubcategory,
            difficulty,
            count
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: 'レビューDB保存完了',
          description: `${parsedQuestions.length}問の問題をレビューDBに保存しました！バッチID: ${result.batchId}`
        })
        
        // 成功時はフォームをリセット
        setParsedQuestions([])
        setGeneratedResult('')
        setShowReview(false)
        setGeneratedPrompt('')
        setSaveToReviewMode(false)
      } else {
        const error = await response.text()
        toast({
          title: 'レビューDB保存失敗',
          description: `レビューDB保存に失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `レビューDB保存中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    } finally {
      setSavingToReview(false)
    }
  }

  const executeImport = async () => {
    if (parsedQuestions.length === 0) return
    
    setImporting(true)
    try {
      // サブカテゴリーデータを確実に取得
      let availableSubcategories = subcategories
      if (subcategories.length === 0) {
        console.log('🔄 Reloading subcategories for import...')
        const subcategoriesResponse = await fetch('/api/subcategories')
        if (subcategoriesResponse.ok) {
          const subcategoriesData = await subcategoriesResponse.json()
          availableSubcategories = subcategoriesData.subcategories || []
          setSubcategories(availableSubcategories)
        }
      }
      
      console.log('📋 Available subcategories for mapping:', availableSubcategories.length)
      
      // フロントエンド表示用（オブジェクト形式）をバックエンドAPI用（配列形式）に変換
      const questionsForAPI = parsedQuestions.map((q, index) => {
        console.log(`🔍 Question ${index + 1} original options:`, q.options)
        
        // options形式を配列に変換
        let optionsArray: string[] = []
        if (Array.isArray(q.options)) {
          optionsArray = q.options
          console.log(`✅ Question ${index + 1} already array format:`, optionsArray)
        } else if (q.options && typeof q.options === 'object') {
          // オブジェクト形式から配列形式に変換
          const optionsObj = q.options as {A: string, B: string, C: string, D: string}
          optionsArray = [optionsObj.A, optionsObj.B, optionsObj.C, optionsObj.D]
          console.log(`🔄 Question ${index + 1} converted to array:`, optionsArray)
          
          // 空の選択肢がないかチェック
          const emptyOptions = optionsArray.filter(opt => !opt || opt.trim() === '')
          if (emptyOptions.length > 0) {
            console.warn(`⚠️ Question ${index + 1} has empty options:`, emptyOptions)
          }
        } else {
          console.error(`❌ Question ${index + 1} invalid options format:`, q.options)
          optionsArray = ['', '', '', ''] // フォールバック
        }
        
        console.log(`📊 Question ${index + 1} final options array length:`, optionsArray.length)
        
        // サブカテゴリー情報を正しくマッピング
        const subcategoryInfo = availableSubcategories.find(sub => 
          sub.name === q.subcategory ||
          sub.subcategory_id === q.subcategory
        )
        
        console.log(`🔍 Question ${index + 1} subcategory mapping:`, {
          original_subcategory: q.subcategory,
          found_subcategory: subcategoryInfo,
          final_name: subcategoryInfo?.name || q.subcategory,
          final_id: subcategoryInfo?.subcategory_id || ''
        })

        // QuizQuestion形式からQuestion形式に完全変換
        return {
          id: Number(q.id) || Math.floor(Math.random() * 1000000), // 数値IDに変換
          category: q.category,
          subcategory: subcategoryInfo?.name || q.subcategory, // DBから取得した日本語名
          subcategory_id: subcategoryInfo?.subcategory_id || '', // DBから取得したID
          question: q.question,
          options: optionsArray, // 配列形式でAPIに送信
          correct: (() => {
            // correctAnswer が A-D 形式の場合は 0-3 インデックスに変換
            if (q.correctAnswer === 'A') return 0
            if (q.correctAnswer === 'B') return 1
            if (q.correctAnswer === 'C') return 2
            if (q.correctAnswer === 'D') return 3
            // 既に数値の場合はそのまま使用
            return Number(q.correct) || 0
          })(),
          explanation: q.explanation,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit || 45,
          relatedTopics: q.tags || [],
          source: q.source || '',
          hint1: q.hint1 || null,
          hint2: q.hint2 || null,
          hint3: q.hint3 || null,
          deleted: false
        }
      })
      
      console.log('🚀 Questions prepared for API:', questionsForAPI.length)
      
      // デバッグ: API送信前のデータを詳細チェック
      console.log('📤 Sending to API - First question sample:', JSON.stringify(questionsForAPI[0], null, 2))

      const response = await directAuthenticatedFetch('/api/admin/questions/db', {
        method: 'POST',
        body: JSON.stringify({ questions: questionsForAPI })
      })

      if (response.ok) {
        toast({
          title: 'インポート完了',
          description: `${parsedQuestions.length}問のクイズ問題を本番DBにインポートしました！`
        })
        // リセット
        setParsedQuestions([])
        setGeneratedResult('')
        setShowReview(false)
        setGeneratedPrompt('')
      } else {
        const error = await response.text()
        toast({
          title: 'インポート失敗',
          description: `インポートに失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `インポート中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="text-yellow-500" />
          クイズ問題生成
        </h1>
        <p className="text-muted-foreground">
          Claude（チャット版）を使用してクイズ問題を生成し、レビュー・承認プロセスを経て本番に反映します
          {isSystemAdmin && <span className="ml-2 text-orange-600">（システム管理者は直接インポートも可能）</span>}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Step 1: パラメータ設定 */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: 生成パラメータ設定</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="mb-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">データ読み込み中...</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  カテゴリー <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={loading}
                >
                  <option value="">カテゴリーを選択してください</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  サブカテゴリー <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={loading || !selectedCategory}
                >
                  <option value="">
                    {selectedCategory ? 'サブカテゴリーを選択してください' : 'まずカテゴリーを選択してください'}
                  </option>
                  {filteredSubcategories.map((subcategory) => (
                    <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  難易度 <span className="text-red-500">*</span>
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={loading}
                >
                  <option value="">難易度を選択してください</option>
                  {skillLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  AIモデル <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAiModel}
                  onChange={(e) => setSelectedAiModel(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={loading}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="chatgpt">ChatGPT (OpenAI)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">問題数</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  min="1"
                  max="20"
                />
              </div>
            </div>

            {/* カスタム指示入力欄 */}
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">
                詳細指示（任意）
                <span className="text-xs text-muted-foreground ml-2">
                  サブカテゴリー内の特定トピック・出題範囲・難易度調整などを指定できます
                </span>
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="例：&#10;・機械学習の中でも特に「教師あり学習」と「教師なし学習」の違いに焦点を当てた問題&#10;・実務での活用シナリオを含む応用問題を中心に&#10;・AI検定の出題傾向に沿った基礎概念の確認問題"
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[100px] resize-y"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                入力した内容はAIへのプロンプトに反映されます。空欄の場合はサブカテゴリーの標準的な範囲で出題されます。
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <Button 
                onClick={generatePrompt}
                disabled={!selectedCategory || !selectedSubcategory || !difficulty}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                プロンプト生成
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDistribution(true)
                  fetchDistributionData()
                }}
                disabled={distributionLoading}
              >
                {distributionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                現在のクイズデータ分布
              </Button>
            </div>
            {selectedSubcategory && (
              <div className={`mt-2 p-3 rounded text-sm ${
                existingQuestionStats[selectedSubcategory] 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {existingQuestionStats[selectedSubcategory] ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <strong>⚠️ 既存問題情報:</strong> 
                      {subcategories.find(s => s.subcategory_id === selectedSubcategory)?.name}カテゴリーには
                      <span className="font-semibold text-yellow-800">{existingQuestionStats[selectedSubcategory]}問</span>
                      が既に登録されています。
                    </div>
                    {existingQuestionSamples[selectedSubcategory] && existingQuestionSamples[selectedSubcategory].length > 0 && (
                      <div className="mt-2 text-xs">
                        <button
                          onClick={() => setShowExistingQuestions(!showExistingQuestions)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <span>{showExistingQuestions ? '▼' : '▶'}</span>
                          <strong>既存問題一覧を{showExistingQuestions ? '非表示' : '表示'}（全{existingQuestionSamples[selectedSubcategory].length}問）</strong>
                        </button>
                        {showExistingQuestions && (
                          <div className="mt-2">
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 bg-white">
                              <ul className="space-y-2">
                                {existingQuestionSamples[selectedSubcategory].map((sample, idx) => (
                                  <li key={idx} className="text-gray-700 text-xs leading-relaxed border-b border-gray-100 pb-1">
                                    <span className="font-mono text-xs text-blue-500 mr-2 font-semibold">{idx + 1}.</span>
                                    <span className="text-gray-800">{sample}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <div className="font-medium text-red-700 text-xs">
                                ⚠️ 重複回避必須：上記全{existingQuestionSamples[selectedSubcategory].length}問と異なる観点・アプローチでの問題生成を必ず行ってください
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <strong>✅ 新規分野:</strong> 
                    {subcategories.find(s => s.subcategory_id === selectedSubcategory)?.name}カテゴリーには
                    まだ問題が登録されていません。基礎から応用まで体系的な問題作成が可能です。
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: プロンプトコピー */}
        {generatedPrompt && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                Step 2: Claudeにコピー
                {isPromptOutdated && (
                  <span className="text-orange-500 text-sm font-normal animate-pulse">
                    ⚠️ パラメータが変更されました
                  </span>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={clearPrompt}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                クリア
              </Button>
            </CardHeader>
            <CardContent>
              {isPromptOutdated && (
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>注意:</strong> カテゴリー、サブカテゴリー、難易度、または問題数が変更されています。
                    新しい条件でプロンプトを再生成するか、上記の「クリア」ボタンを押してから再生成してください。
                  </AlertDescription>
                </Alert>
              )}
              <div className="relative">
                <Textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  readOnly={!isPromptEditing}
                  className={`min-h-[300px] font-mono text-sm ${
                    isPromptEditing ? 'border-blue-300 bg-blue-50' : ''
                  } ${
                    isPromptOutdated ? 'border-orange-300 bg-orange-50' : ''
                  }`}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPromptEditing(!isPromptEditing)}
                  >
                    {isPromptEditing ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Edit2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyPrompt}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Alert className="mt-4">
                <AlertDescription>
                  上記のプロンプトをコピーして、Claude（https://claude.ai）に貼り付けてください。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 結果貼り付け */}
        <Card>
          <CardHeader>
            <CardTitle>Step 3: 生成結果を貼り付け</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                実際に使用したAIモデル <span className="text-red-500">*</span>
              </label>
              <select
                value={actualUsedAiModel}
                onChange={(e) => setActualUsedAiModel(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-w-xs"
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="chatgpt">ChatGPT (OpenAI)</option>
                <option value="gemini">Gemini (Google)</option>
              </select>
              {selectedAiModel !== actualUsedAiModel && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ 注意: Step 1で選択したAI（{selectedAiModel}）と異なります。実際に使用したAIを正確に選択してください。
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                実際にJSONを生成したAIモデルを選択してください（記録・分析用）
              </p>
            </div>
            
            <Textarea
              placeholder="AIからのJSON結果をここに貼り付けてください..."
              className="min-h-[400px] font-mono text-sm"
              value={generatedResult}
              onChange={(e) => setGeneratedResult(e.target.value)}
            />
            {validationError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={validateAndReview}
                disabled={!generatedResult || validating}
              >
                {validating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                {validating ? '検証中...' : '検証＆レビュー'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: レビュー・編集画面 */}
        {showReview && parsedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: レビュー・編集・承認</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Alert>
                  <AlertDescription>
                    生成された{parsedQuestions.length}問のクイズ問題をレビューしてください。
                    編集が必要な場合は、各問題の編集ボタンをクリックしてください。
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {parsedQuestions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">問題 {index + 1}</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={editingIndex === index ? "default" : "outline"}
                          onClick={() => handleEdit(index)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingIndex === index ? (
                      // 編集モード
                      <div className="space-y-4">
                        {/* 問題文 */}
                        <div>
                          <label className="text-sm font-medium block mb-1">問題文</label>
                          <textarea
                            className="w-full p-2 border rounded"
                            value={question.question}
                            onChange={(e) => handleQuestionUpdate(index, 'question', e.target.value)}
                            rows={3}
                            placeholder="問題文"
                          />
                        </div>

                        {/* 選択肢 */}
                        <div>
                          <label className="text-sm font-medium block mb-1">選択肢</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="p-2 border rounded"
                              value={question.options.A}
                              onChange={(e) => handleQuestionUpdate(index, 'options.A', e.target.value)}
                              placeholder="選択肢A"
                            />
                            <input
                              className="p-2 border rounded"
                              value={question.options.B}
                              onChange={(e) => handleQuestionUpdate(index, 'options.B', e.target.value)}
                              placeholder="選択肢B"
                            />
                            <input
                              className="p-2 border rounded"
                              value={question.options.C}
                              onChange={(e) => handleQuestionUpdate(index, 'options.C', e.target.value)}
                              placeholder="選択肢C"
                            />
                            <input
                              className="p-2 border rounded"
                              value={question.options.D}
                              onChange={(e) => handleQuestionUpdate(index, 'options.D', e.target.value)}
                              placeholder="選択肢D"
                            />
                          </div>
                        </div>

                        {/* 正解・解説 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium block mb-1">正解</label>
                            <select
                              className="w-full p-2 border rounded"
                              value={question.correctAnswer}
                              onChange={(e) => handleQuestionUpdate(index, 'correctAnswer', e.target.value)}
                            >
                              <option value="A">正解: A</option>
                              <option value="B">正解: B</option>
                              <option value="C">正解: C</option>
                              <option value="D">正解: D</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">制限時間（秒）</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={question.timeLimit || 45}
                              onChange={(e) => handleQuestionUpdate(index, 'timeLimit', e.target.value)}
                              min="10"
                              max="300"
                            />
                          </div>
                        </div>

                        {/* カテゴリー情報 */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-sm font-medium block mb-1">カテゴリー</label>
                            <select
                              className="w-full p-2 border rounded"
                              value={question.category}
                              onChange={(e) => handleQuestionUpdate(index, 'category', e.target.value)}
                            >
                              <option value="">選択してください</option>
                              {categories.map((cat) => (
                                <option key={cat.category_id} value={cat.category_id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">サブカテゴリー</label>
                            <select
                              className="w-full p-2 border rounded"
                              value={question.subcategory}
                              onChange={(e) => handleQuestionUpdate(index, 'subcategory', e.target.value)}
                            >
                              <option value="">選択してください</option>
                              {subcategories.filter(sub => sub.parent_category_id === question.category).map((sub) => (
                                <option key={sub.subcategory_id} value={sub.subcategory_id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">難易度</label>
                            <select
                              className="w-full p-2 border rounded"
                              value={question.difficulty}
                              onChange={(e) => handleQuestionUpdate(index, 'difficulty', e.target.value)}
                            >
                              <option value="">選択してください</option>
                              {skillLevels.map((level) => (
                                <option key={level.id} value={level.id}>
                                  {level.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 解説 */}
                        <div>
                          <label className="text-sm font-medium block mb-1">解説</label>
                          <textarea
                            className="w-full p-2 border rounded"
                            value={question.explanation}
                            onChange={(e) => handleQuestionUpdate(index, 'explanation', e.target.value)}
                            rows={3}
                            placeholder="解説"
                          />
                        </div>

                        {/* ヒント */}
                        <div>
                          <label className="text-sm font-medium block mb-2">ヒント</label>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">ヒント1（基礎知識）</label>
                              <textarea
                                className="w-full p-2 border rounded text-sm"
                                value={question.hint1 || ''}
                                onChange={(e) => handleQuestionUpdate(index, 'hint1', e.target.value)}
                                rows={2}
                                placeholder="問題理解に必要な用語・概念の説明"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">ヒント2（思考誘導）</label>
                              <textarea
                                className="w-full p-2 border rounded text-sm"
                                value={question.hint2 || ''}
                                onChange={(e) => handleQuestionUpdate(index, 'hint2', e.target.value)}
                                rows={2}
                                placeholder="正解導出の考え方・着眼点"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">ヒント3（根拠提示）</label>
                              <textarea
                                className="w-full p-2 border rounded text-sm"
                                value={question.hint3 || ''}
                                onChange={(e) => handleQuestionUpdate(index, 'hint3', e.target.value)}
                                rows={2}
                                placeholder="正解判断の根拠・理由（答えは言わない）"
                              />
                            </div>
                          </div>
                        </div>

                        {/* タグ・ソース */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium block mb-1">タグ（カンマ区切り）</label>
                            <input
                              className="w-full p-2 border rounded"
                              value={question.tags?.join(', ') || ''}
                              onChange={(e) => handleQuestionUpdate(index, 'tags', e.target.value)}
                              placeholder="プログラミング, JavaScript, 基礎"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">ソース</label>
                            <input
                              className="w-full p-2 border rounded"
                              value={question.source || ''}
                              onChange={(e) => handleQuestionUpdate(index, 'source', e.target.value)}
                              placeholder="AIクイズ生成"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div className="space-y-3">
                        {/* 問題文 */}
                        <div>
                          <h5 className="text-sm font-medium text-muted-foreground mb-1">問題文</h5>
                          <div className="font-medium"><MarkdownContent content={question.question} compact /></div>
                        </div>

                        {/* 選択肢 */}
                        <div>
                          <h5 className="text-sm font-medium text-muted-foreground mb-1">選択肢</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {(['A', 'B', 'C', 'D'] as const).map((key) => (
                              <div key={key} className={`p-2 rounded ${question.correctAnswer === key ? 'bg-green-100 text-green-800 font-semibold' : 'bg-gray-50'}`}>
                                <span className="font-medium mr-1">{key}:</span>
                                <MarkdownContent content={question.options[key]} compact className="inline" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 基本情報 */}
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <h6 className="font-medium text-muted-foreground">正解</h6>
                            <span className="font-semibold text-green-600">{question.correctAnswer}</span>
                          </div>
                          <div>
                            <h6 className="font-medium text-muted-foreground">制限時間</h6>
                            <span>{question.timeLimit || 45}秒</span>
                          </div>
                          <div>
                            <h6 className="font-medium text-muted-foreground">カテゴリー</h6>
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded mr-1">{question.category}</span>
                            <span>{categories.find(c => c.category_id === question.category)?.name || question.category}</span>
                          </div>
                          <div>
                            <h6 className="font-medium text-muted-foreground">難易度</h6>
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded mr-1">{question.difficulty}</span>
                            <span>{skillLevels.find(s => s.id === question.difficulty)?.name || question.difficulty}</span>
                          </div>
                        </div>

                        {/* サブカテゴリー・タグ・ソース */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <h6 className="font-medium text-muted-foreground">サブカテゴリー</h6>
                            {question.subcategory ? (
                              <div>
                                <span className="font-mono text-xs bg-gray-100 px-1 rounded mr-1">{question.subcategory}</span>
                                <span>{subcategories.find(s => s.subcategory_id === question.subcategory)?.name || question.subcategory}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                          <div>
                            <h6 className="font-medium text-muted-foreground">タグ</h6>
                            <div className="flex flex-wrap gap-1">
                              {question.tags && question.tags.length > 0 ? 
                                question.tags.map((tag, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {tag}
                                  </span>
                                )) : 
                                <span className="text-muted-foreground">-</span>
                              }
                            </div>
                          </div>
                          <div>
                            <h6 className="font-medium text-muted-foreground">ソース</h6>
                            <span>{question.source || 'AI生成'}</span>
                          </div>
                        </div>

                        {/* 解説 */}
                        <div>
                          <h6 className="font-medium text-muted-foreground mb-1">解説</h6>
                          <div className="text-sm bg-blue-50 p-3 rounded"><MarkdownContent content={question.explanation} compact /></div>
                        </div>

                        {/* ヒント */}
                        {(question.hint1 || question.hint2 || question.hint3) && (
                          <div>
                            <h6 className="font-medium text-muted-foreground mb-2">ヒント</h6>
                            <div className="space-y-2">
                              {question.hint1 && (
                                <div className="bg-yellow-50 p-3 rounded text-sm">
                                  <span className="font-medium text-yellow-800">ヒント1（基礎知識）: </span>
                                  <div className="text-yellow-700 mt-1"><MarkdownContent content={question.hint1} compact /></div>
                                </div>
                              )}
                              {question.hint2 && (
                                <div className="bg-orange-50 p-3 rounded text-sm">
                                  <span className="font-medium text-orange-800">ヒント2（思考誘導）: </span>
                                  <div className="text-orange-700 mt-1"><MarkdownContent content={question.hint2} compact /></div>
                                </div>
                              )}
                              {question.hint3 && (
                                <div className="bg-green-50 p-3 rounded text-sm">
                                  <span className="font-medium text-green-800">ヒント3（根拠提示）: </span>
                                  <div className="text-green-700 mt-1"><MarkdownContent content={question.hint3} compact /></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 保存方法選択 */}
              <div className="mt-6">
                <div className="mb-4">
                  <h4 className="font-medium mb-2">保存方法を選択:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="saveMode"
                        value="review"
                        checked={saveToReviewMode}
                        onChange={(e) => setSaveToReviewMode(e.target.checked)}
                        className="text-blue-600"
                      />
                      <span>レビューDBに保存（推奨）</span>
                      <span className="text-sm text-gray-500">- レビュー・承認プロセスを経て本番に反映</span>
                    </label>
                    {isSystemAdmin && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="saveMode"
                          value="direct"
                          checked={!saveToReviewMode}
                          onChange={(e) => setSaveToReviewMode(!e.target.checked)}
                          className="text-orange-600"
                        />
                        <span>本番DBに直接インポート</span>
                        <span className="text-sm text-gray-500">- すぐに本番システムに反映（システム管理者のみ）</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReview(false)
                      setParsedQuestions([])
                      setSaveToReviewMode(false)
                    }}
                  >
                    キャンセル
                  </Button>
                  
                  <div className="flex gap-2">
                    {saveToReviewMode || !isSystemAdmin ? (
                      <Button
                        onClick={saveToReviewDB}
                        disabled={savingToReview || parsedQuestions.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {savingToReview ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            レビューDB保存中...
                          </>
                        ) : (
                          <>
                            <FileCheck className="mr-2 h-4 w-4" />
                            {parsedQuestions.length}問をレビューDBに保存
                          </>
                        )}
                      </Button>
                    ) : (
                      isSystemAdmin && (
                        <Button
                          onClick={executeImport}
                          disabled={importing || parsedQuestions.length === 0}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {importing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              インポート中...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {parsedQuestions.length}問を直接インポート
                            </>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分布表示モーダル */}
        {showDistribution && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">クイズ問題データ分布・推奨作成領域</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDistribution(false)}
                >
                  閉じる
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {distributionLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <span>データを分析中...</span>
                  </div>
                ) : distributionData ? (
                  <div className="space-y-6">
                    {/* カテゴリー別サマリー */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📊 カテゴリー別サマリー</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {distributionData.category_summary?.map((category: CategorySummary) => (
                          <div 
                            key={category.category_id}
                            className={`p-4 rounded-lg border-2 ${
                              !category.is_active 
                                ? 'opacity-60 border-gray-300 bg-gray-50' 
                                : category.type === 'main' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm">{category.name}</h4>
                              <div className="flex gap-1">
                                {!category.is_active && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    🚧 開発予定
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  !category.is_active 
                                    ? 'bg-gray-100 text-gray-600'
                                    : category.type === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {category.type === 'main' ? 'ビジネス' : '業界専門'}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm space-y-1">
                              <p>📝 問題数: <span className="font-semibold">{category.total_questions}問</span></p>
                              <p>🎯 出題回数: <span className="font-semibold">{category.total_usage}回</span></p>
                              <p>📂 サブカテゴリー: <span className="font-semibold">{category.subcategory_count}個</span></p>
                            </div>
                            {category.name?.includes('Coming Soon') || category.name?.includes('coming soon') ? (
                              <div className="mt-2 text-xs text-gray-500 font-medium">
                                🚧 開発予定（優先度低）
                              </div>
                            ) : (
                              category.total_questions < 20 && (
                                <div className="mt-2 text-xs text-orange-600 font-medium">
                                  ⚠️ 問題不足（推奨作成）
                                </div>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 詳細分布テーブル */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📋 詳細分布・作成推奨リスト</h3>
                      
                      {/* フィルタリングUI */}
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">🔍 フィルタリング</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* カテゴリーフィルター */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリー</label>
                            <select
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">全て</option>
                              {distributionData.metadata.categories?.map((category) => (
                                <option key={category.category_id} value={category.category_id}>
                                  {category.name} {!category.is_active ? '🚧' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* 難易度フィルター */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">難易度</label>
                            <select
                              value={filterDifficulty}
                              onChange={(e) => setFilterDifficulty(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">全て</option>
                              {distributionData.metadata.skill_levels?.map((skill) => (
                                <option key={skill.id} value={skill.id}>
                                  {skill.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* 推奨レベルフィルター */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">推奨レベル</label>
                            <select
                              value={filterRecommendation}
                              onChange={(e) => setFilterRecommendation(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">全て</option>
                              <option value="urgent">🔥 緊急（0問）</option>
                              <option value="recommended">⭐ 推奨（1-9問）</option>
                              <option value="sufficient">✅ 十分（10問以上）</option>
                              <option value="coming_soon">🚧 開発予定</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* フィルタリング状況とクリア */}
                        <div className="mt-3 flex justify-between items-center">
                          <div className="text-xs text-gray-600">
                            {(() => {
                              const filteredCount = distributionData.distribution?.filter((item: DistributionItem) => {
                                const categoryInfo = distributionData.metadata.categories?.find((c: Category) => c.category_id === item.category_id)
                                const isComingSoon = !categoryInfo?.is_active
                                const isUrgent = !isComingSoon && item.question_count === 0
                                const isRecommended = !isComingSoon && item.question_count >= 1 && item.question_count <= 9
                                const isSufficient = !isComingSoon && item.question_count >= 10
                                
                                if (filterCategory && item.category_id !== filterCategory) return false
                                if (filterDifficulty && item.difficulty !== filterDifficulty) return false
                                if (filterRecommendation) {
                                  switch (filterRecommendation) {
                                    case 'urgent': return isUrgent
                                    case 'recommended': return isRecommended
                                    case 'sufficient': return isSufficient
                                    case 'coming_soon': return isComingSoon
                                    default: return true
                                  }
                                }
                                return true
                              }).length || 0
                              
                              const totalCount = distributionData.distribution?.length || 0
                              return `表示中: ${filteredCount}件 / 全${totalCount}件`
                            })()}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterCategory('')
                              setFilterDifficulty('')
                              setFilterRecommendation('')
                            }}
                            className="text-xs"
                          >
                            フィルタをクリア
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">カテゴリー</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">サブカテゴリー</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">難易度</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">問題数</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">出題回数</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">推奨</th>
                              <th className="border border-gray-300 px-3 py-2 text-center">アクション</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributionData.distribution?.filter((item: DistributionItem) => {
                              // フィルタリング適用
                              const categoryInfo = distributionData.metadata.categories?.find((c: Category) => c.category_id === item.category_id)
                              const isComingSoon = !categoryInfo?.is_active
                              const isUrgent = !isComingSoon && item.question_count === 0
                              const isRecommended = !isComingSoon && item.question_count >= 1 && item.question_count <= 9
                              const isSufficient = !isComingSoon && item.question_count >= 10
                              
                              // カテゴリーフィルター
                              if (filterCategory && item.category_id !== filterCategory) return false
                              
                              // 難易度フィルター
                              if (filterDifficulty && item.difficulty !== filterDifficulty) return false
                              
                              // 推奨レベルフィルター
                              if (filterRecommendation) {
                                switch (filterRecommendation) {
                                  case 'urgent': return isUrgent
                                  case 'recommended': return isRecommended
                                  case 'sufficient': return isSufficient
                                  case 'coming_soon': return isComingSoon
                                  default: return true
                                }
                              }
                              
                              return true
                            }).sort((a: DistributionItem, b: DistributionItem) => {
                              // 推奨度順：問題数が少ない順、Coming Soonは後回し
                              const aCategory = distributionData.metadata.categories?.find((c: Category) => c.category_id === a.category_id)
                              const bCategory = distributionData.metadata.categories?.find((c: Category) => c.category_id === b.category_id)
                              
                              const aIsComingSoon = !aCategory?.is_active
                              const bIsComingSoon = !bCategory?.is_active
                              
                              if (aIsComingSoon !== bIsComingSoon) {
                                return aIsComingSoon ? 1 : -1 // Coming Soon を後に
                              }
                              
                              return a.question_count - b.question_count // 問題数の少ない順
                            }).map((item: DistributionItem, _index: number) => {
                              const categoryInfo = distributionData.metadata.categories?.find((c: Category) => c.category_id === item.category_id)
                              const subcategoryInfo = distributionData.metadata.subcategories?.find((s: Subcategory) => s.subcategory_id === item.subcategory_id)
                              const skillInfo = distributionData.metadata.skill_levels?.find((l: SkillLevel) => l.id === item.difficulty)
                              
                              const isComingSoon = !categoryInfo?.is_active
                              const isRecommended = !isComingSoon && item.question_count < 10
                              const isUrgent = !isComingSoon && item.question_count === 0
                              
                              return (
                                <tr 
                                  key={`${item.category_id}-${item.subcategory_id}-${item.difficulty}`}
                                  className={`hover:bg-gray-50 ${
                                    isUrgent ? 'bg-red-50' : 
                                    isRecommended ? 'bg-yellow-50' : 
                                    isComingSoon ? 'bg-gray-50 opacity-60' : ''
                                  }`}
                                >
                                  <td className="border border-gray-300 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        categoryInfo?.type === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {categoryInfo?.type === 'main' ? 'ビジネス' : '業界'}
                                      </span>
                                      <span className="text-xs font-mono bg-gray-100 px-1 rounded">{item.category_id}</span>
                                      <span>{categoryInfo?.name || item.category_id}</span>
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-mono bg-gray-100 px-1 rounded">{item.subcategory_id}</span>
                                      <span>{subcategoryInfo?.name || item.subcategory_id}</span>
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-mono bg-gray-100 px-1 rounded">{item.difficulty}</span>
                                      <span>{skillInfo?.name || item.difficulty}</span>
                                    </div>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <span className={`font-semibold ${
                                      item.question_count === 0 ? 'text-red-600' :
                                      item.question_count < 5 ? 'text-orange-600' :
                                      item.question_count < 10 ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      {item.question_count}問
                                    </span>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <span className="text-gray-600">{item.usage_count}回</span>
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    {isComingSoon ? (
                                      <span className="text-xs text-gray-500">🚧 開発予定</span>
                                    ) : isUrgent ? (
                                      <span className="text-xs text-red-600 font-semibold">🔥 緊急</span>
                                    ) : isRecommended ? (
                                      <span className="text-xs text-yellow-600 font-semibold">⭐ 推奨</span>
                                    ) : (
                                      <span className="text-xs text-green-600">✅ 十分</span>
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => selectFromDistribution(item.category_id, item.subcategory_id, item.difficulty)}
                                      className={`text-xs ${isComingSoon ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : ''}`}
                                      title={isComingSoon ? 'Coming Soonカテゴリー用の問題を事前生成します' : ''}
                                    >
                                      {isComingSoon ? '🚧 事前生成' : 'この設定で作成'}
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 推奨アクション */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">🎯 推奨作成アクション</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>🔥 <strong>緊急（赤色）</strong>: 問題数0問 - 最優先で作成</p>
                        <p>⭐ <strong>推奨（黄色）</strong>: 問題数1-9問 - 作成推奨</p>
                        <p>✅ <strong>十分（緑色）</strong>: 問題数10問以上 - 必要に応じて追加</p>
                        <p>🚧 <strong>開発予定（グレー）</strong>: Coming Soon項目 - 事前生成で準備</p>
                      </div>
                      <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                        <p className="text-orange-800"><strong>💡 Coming Soon戦略:</strong> 新カテゴリーのローンチ前に問題を事前生成し、コンテンツを準備しておくことで、リリース時にすぐにユーザーに提供できます。</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    データの取得に失敗しました
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* トースト表示 */}
      <ToastContainer 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </div>
  )
}