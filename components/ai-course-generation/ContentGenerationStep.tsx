/**
 * AIコンテンツ生成ステップ (Step 5)
 * アウトライン承認後の詳細コンテンツ・クイズ生成UI
 * ジャンル/テーマ/セッション単位での階層的生成対応
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  Brain,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  BookOpen,
  Package,
  FileCode,
  HelpCircle
} from 'lucide-react'

interface SessionData {
  id: string
  title: string
  description?: string
  session_type: 'knowledge' | 'practice' | 'case_study'
  estimatedMinutes: number
  themeId: string
  themeTitle: string
  themeDescription: string
  genreId: string
  genreTitle: string
  genreDescription: string
  completed?: boolean
}

interface ThemeData {
  id: string
  title: string
  description: string
  sessions: SessionData[]
  genreId: string
  genreTitle: string
  completedCount: number
  totalCount: number
}

interface GenreData {
  id: string
  title: string
  description: string
  themes: ThemeData[]
  completedCount: number
  totalCount: number
}

interface ContentGenerationStepProps {
  workflow: {
    id?: string
    // DBから取得したコース構造（Step 4以降はこちらを優先使用）
    course_structure?: {
      genres: Array<{
        id: string
        title: string
        description: string
        themes: Array<{
          id: string
          title: string
          description: string
          sessions: Array<{
            id: string
            title: string
            session_type: string
            estimated_minutes: number
          }>
        }>
      }>
    }
    outline_data?: {
      approved?: boolean
      genres?: Array<{
        id: string
        title: string
        description: string
        themes: Array<{
          id: string
          title: string
          description: string
          sessions: Array<{
            id: string
            title: string
            description?: string
            session_type: 'knowledge' | 'practice' | 'case_study'
            estimatedMinutes: number
          }>
        }>
      }>
    }
    content_data?: {
      generated_sessions?: string[]
      [key: string]: unknown
    }
    // AIレスポンス（フォールバック用）
    aiOutlineResponse?: string
    [key: string]: unknown
  }
  onChange: (updates: Record<string, unknown>) => void
  onNext: () => void
  onPrevious: () => void
}

export function ContentGenerationStep({
  workflow,
  onChange,
  onNext,
  onPrevious
}: ContentGenerationStepProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [promptContext, setPromptContext] = useState<{
    genreId: string
    themeId: string
    sessionId: string
    sessionTitle: string
    mode: 'session' | 'theme' | 'genre'
  } | null>(null)
  const [aiResponse, setAiResponse] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isClaudeClicked, setIsClaudeClicked] = useState(false)
  
  // 生成単位と選択状態
  // 初期選択はテーマ単位のプロンプトを推奨
  const [generationMode, setGenerationMode] = useState<'genre' | 'theme' | 'session'>('theme')
  const [selectedGenreId, setSelectedGenreId] = useState<string>('')
  const [selectedThemeId, setSelectedThemeId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  
  // UI状態
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set())
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'prompt' | 'response' | 'review'>('hierarchy')
  
  // コンテンツ確認用の状態
  const [generatedContents, setGeneratedContents] = useState<Record<string, {
    contents: Array<{ id: string; title: string | null; content: string; content_type: string; display_order: number }>
    quizzes: Array<{ id: string; question: string; options: unknown; correct_answer: number; explanation: string; display_order: number }>
  }>>({})
  const [isLoadingContents, setIsLoadingContents] = useState(false)

  // コンテンツ確認タブ用の折りたたみ状態
  const [reviewExpandedGenres, setReviewExpandedGenres] = useState<Set<string>>(new Set())
  const [reviewExpandedThemes, setReviewExpandedThemes] = useState<Set<string>>(new Set())
  const [reviewExpandedSessions, setReviewExpandedSessions] = useState<Set<string>>(new Set())

  // コンポーネント初期化時に最新のワークフローデータを取得
  useEffect(() => {
    const refreshWorkflowData = async () => {
      if (!workflow.id) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) return

        const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          // course_structure（DBからの構造）を優先使用
          if (data.workflow?.course_structure) {
            onChange({ course_structure: data.workflow.course_structure })
            console.log('✅ [ContentGenerationStep] course_structure loaded from DB')
          } else if (data.workflow?.outline_data) {
            // フォールバック: outline_dataを使用（DB形式のIDの場合のみ）
            const firstSession = data.workflow.outline_data.genres?.[0]?.themes?.[0]?.sessions?.[0]
            if (firstSession && !firstSession.id.startsWith('session-')) {
              onChange({ outline_data: data.workflow.outline_data })
              console.log('✅ [ContentGenerationStep] outline_data refreshed with DB IDs')
            }
          }
        }
      } catch (error) {
        console.error('[ContentGenerationStep] Failed to refresh workflow:', error)
      }
    }

    refreshWorkflowData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id])

  // 階層構造データの生成（generatedContentsも考慮）
  // course_structure（DBからの構造）を優先使用、ただしaiOutlineResponseの方がジャンル数が多い場合はそちらを使用
  const hierarchicalData = useMemo(() => {
    const genresMap = new Map<string, GenreData>()
    const generatedSessionIds = workflow.content_data?.generated_sessions || []
    // generatedContentsから実際にコンテンツまたはクイズがあるセッションのみを完了とみなす
    // 空のエントリは完了として扱わない
    const generatedContentSessionIds = Object.entries(generatedContents)
      .filter(([, data]) => (data.contents?.length > 0 || data.quizzes?.length > 0))
      .map(([sessionId]) => sessionId)
    // 両方をマージして重複除去
    const allCompletedSessionIds = [...new Set([...generatedSessionIds, ...generatedContentSessionIds])]

    // course_structure（DBから取得）を優先使用
    let sourceGenres = workflow.course_structure?.genres || workflow.outline_data?.genres
    let isFromDB = !!workflow.course_structure?.genres
    let dataSource = isFromDB ? 'DB' : (workflow.outline_data?.genres ? 'outline_data' : 'none')

    // aiOutlineResponseからより多くのジャンルがある場合はそちらを使用
    if (workflow.aiOutlineResponse) {
      try {
        const parsed = JSON.parse(workflow.aiOutlineResponse)
        if (parsed.genres && Array.isArray(parsed.genres)) {
          const aiGenreCount = parsed.genres.length
          const currentGenreCount = sourceGenres?.length || 0

          console.log(`📊 [ContentGenerationStep] データ比較 - 現在: ${currentGenreCount}ジャンル (${dataSource}), aiOutlineResponse: ${aiGenreCount}ジャンル`)

          if (aiGenreCount > currentGenreCount) {
            console.log('📋 [ContentGenerationStep] aiOutlineResponseを使用（ジャンル数がより多い）')
            sourceGenres = parsed.genres.map((g: { id: string; title: string; description?: string; themes?: Array<{ id: string; title: string; description?: string; estimatedMinutes?: number; sessions?: Array<{ id: string; title: string; description?: string; session_type?: string; estimatedMinutes?: number }> }> }) => ({
              id: g.id,
              title: g.title,
              description: g.description || '',
              themes: (g.themes || []).map((t: { id: string; title: string; description?: string; estimatedMinutes?: number; sessions?: Array<{ id: string; title: string; description?: string; session_type?: string; estimatedMinutes?: number }> }) => ({
                id: t.id,
                title: t.title,
                description: t.description || '',
                sessions: (t.sessions || []).map((s: { id: string; title: string; description?: string; session_type?: string; estimatedMinutes?: number }) => ({
                  id: s.id,
                  title: s.title,
                  session_type: s.session_type || 'knowledge',
                  estimated_minutes: s.estimatedMinutes || 15
                }))
              }))
            }))
            isFromDB = false
            dataSource = 'aiOutlineResponse'
          }
        }
      } catch (e) {
        console.warn('⚠️ [ContentGenerationStep] aiOutlineResponse parse failed:', e)
      }
    }

    if (isFromDB) {
      console.log('📋 [ContentGenerationStep] Using course_structure from DB')
    }

    if (sourceGenres) {
      for (const genre of sourceGenres) {
        const themesMap = new Map<string, ThemeData>()

        for (const theme of genre.themes) {
          const sessions: SessionData[] = theme.sessions.map((session) => {
            // DBとoutline_dataでフィールド名が異なる場合の対応
            const sessionType = (
              (session as { session_type?: string }).session_type ||
              'knowledge'
            ) as 'knowledge' | 'practice' | 'case_study'
            const estimatedMinutes = (
              (session as { estimated_minutes?: number }).estimated_minutes ||
              (session as { estimatedMinutes?: number }).estimatedMinutes ||
              15
            )

            return {
              id: session.id,
              title: session.title,
              description: (session as { description?: string }).description,
              session_type: sessionType,
              estimatedMinutes,
              themeId: theme.id,
              themeTitle: theme.title,
              themeDescription: theme.description,
              genreId: genre.id,
              genreTitle: genre.title,
              genreDescription: genre.description,
              // generated_sessionsまたはgeneratedContentsにあれば完了
              completed: allCompletedSessionIds.includes(session.id)
            }
          })

          const completedCount = sessions.filter(s => s.completed).length

          themesMap.set(theme.id, {
            id: theme.id,
            title: theme.title,
            description: theme.description,
            sessions,
            genreId: genre.id,
            genreTitle: genre.title,
            completedCount,
            totalCount: sessions.length
          })
        }

        const themes = Array.from(themesMap.values())
        const totalSessions = themes.reduce((sum, t) => sum + t.totalCount, 0)
        const completedSessions = themes.reduce((sum, t) => sum + t.completedCount, 0)

        genresMap.set(genre.id, {
          id: genre.id,
          title: genre.title,
          description: genre.description,
          themes,
          completedCount: completedSessions,
          totalCount: totalSessions
        })
      }
    }

    return Array.from(genresMap.values())
  }, [workflow, generatedContents])

  // 初期選択の設定（IDが変更された場合も再初期化）
  // コンテンツが未生成の最初のジャンル/テーマのみを展開
  useEffect(() => {
    if (hierarchicalData.length === 0) return

    // 現在選択されているIDが階層データに存在するか確認
    const genreExists = hierarchicalData.some(g => g.id === selectedGenreId)
    const selectedGenre = hierarchicalData.find(g => g.id === selectedGenreId)
    const themeExists = selectedGenre?.themes.some(t => t.id === selectedThemeId) ?? false
    const selectedTheme = selectedGenre?.themes.find(t => t.id === selectedThemeId)
    const sessionExists = selectedTheme?.sessions.some(s => s.id === selectedSessionId) ?? false

    // 選択されたIDが存在しない場合は再初期化
    // これは outline_data のIDがDB IDに更新された場合に対応
    const needsReinit = !selectedGenreId || !genreExists

    if (needsReinit) {
      // 未完了セッションがある最初のジャンルを探す
      const firstIncompleteGenre = hierarchicalData.find(g => g.completedCount < g.totalCount) || hierarchicalData[0]
      setSelectedGenreId(firstIncompleteGenre.id)

      // 未完了のジャンルのみ展開（全完了の場合は全て折りたたみ）
      if (firstIncompleteGenre.completedCount < firstIncompleteGenre.totalCount) {
        setExpandedGenres(new Set([firstIncompleteGenre.id]))
      } else {
        setExpandedGenres(new Set()) // 全て折りたたむ
      }
      console.log(`📋 [ContentGenerationStep] Genre ID updated: ${firstIncompleteGenre.id}`)

      if (firstIncompleteGenre.themes.length > 0) {
        // 未完了セッションがある最初のテーマを探す
        const firstIncompleteTheme = firstIncompleteGenre.themes.find(t => t.completedCount < t.totalCount) || firstIncompleteGenre.themes[0]
        setSelectedThemeId(firstIncompleteTheme.id)

        // 未完了のテーマのみ展開
        if (firstIncompleteTheme.completedCount < firstIncompleteTheme.totalCount) {
          setExpandedThemes(new Set([firstIncompleteTheme.id]))
        } else {
          setExpandedThemes(new Set()) // 全て折りたたむ
        }
        console.log(`📋 [ContentGenerationStep] Theme ID updated: ${firstIncompleteTheme.id}`)

        if (firstIncompleteTheme.sessions.length > 0) {
          const firstIncompleteSession = firstIncompleteTheme.sessions.find(s => !s.completed) || firstIncompleteTheme.sessions[0]
          setSelectedSessionId(firstIncompleteSession.id)
          console.log(`📋 [ContentGenerationStep] Session ID updated: ${firstIncompleteSession.id}`)
        }
      }
    } else if (!themeExists && selectedGenre) {
      // ジャンルは有効だがテーマIDが無効な場合
      const firstTheme = selectedGenre.themes.find(t => t.completedCount < t.totalCount) || selectedGenre.themes[0]
      if (firstTheme) {
        setSelectedThemeId(firstTheme.id)
        setExpandedThemes(prev => new Set([...prev, firstTheme.id]))
        console.log(`📋 [ContentGenerationStep] Theme ID re-synced: ${firstTheme.id}`)

        if (firstTheme.sessions.length > 0) {
          const firstIncompleteSession = firstTheme.sessions.find(s => !s.completed) || firstTheme.sessions[0]
          setSelectedSessionId(firstIncompleteSession.id)
        }
      }
    } else if (!sessionExists && selectedTheme) {
      // テーマは有効だがセッションIDが無効な場合
      const firstIncompleteSession = selectedTheme.sessions.find(s => !s.completed) || selectedTheme.sessions[0]
      if (firstIncompleteSession) {
        setSelectedSessionId(firstIncompleteSession.id)
        console.log(`📋 [ContentGenerationStep] Session ID re-synced: ${firstIncompleteSession.id}`)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hierarchicalData])

  // 選択中のアイテムを取得
  const getSelectedItems = () => {
    const genre = hierarchicalData.find(g => g.id === selectedGenreId)
    const theme = genre?.themes.find(t => t.id === selectedThemeId)
    const session = theme?.sessions.find(s => s.id === selectedSessionId)
    return { genre, theme, session }
  }

  // プロンプト生成
  const handleGeneratePrompt = async () => {
    const { genre, theme, session } = getSelectedItems()

    // ワークフローIDの検証
    if (!workflow.id || workflow.id.startsWith('temp_')) {
      toast({
        title: "エラー",
        description: "ワークフローを先に保存してください",
        variant: "destructive"
      })
      return
    }

    // コース構造またはアウトラインデータの検証
    const hasCourseStructure = workflow.course_structure?.genres && workflow.course_structure.genres.length > 0
    const hasOutlineGenres = workflow.outline_data?.genres && workflow.outline_data.genres.length > 0

    if (!hasCourseStructure && !hasOutlineGenres) {
      toast({
        title: "エラー",
        description: "コース構造データが存在しません。カテゴリマッピングを完了してください。",
        variant: "destructive"
      })
      return
    }

    if (generationMode === 'session' && !session) {
      toast({ title: "エラー", description: "セッションを選択してください", variant: "destructive" })
      return
    }
    if (generationMode === 'theme' && !theme) {
      toast({ title: "エラー", description: "テーマを選択してください", variant: "destructive" })
      return
    }
    if (generationMode === 'genre' && !genre) {
      toast({ title: "エラー", description: "ジャンルを選択してください", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    
    try {
      // 認証セッション取得
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        toast({
          title: "認証エラー",
          description: "認証情報が見つかりません。再ログインしてください。",
          variant: "destructive"
        })
        return
      }

      const params = new URLSearchParams({
        action: 'generate_prompt'
      })

      if (generationMode === 'session') {
        params.append('session_id', session!.id)
      } else if (generationMode === 'theme') {
        params.append('theme_id', theme!.id)
        params.append('batch_mode', 'theme')
      } else if (generationMode === 'genre') {
        params.append('genre_id', genre!.id)
        params.append('batch_mode', 'genre')
      }

      const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}/generate-content?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentPrompt(data.prompt || data.combined_prompt || '')
        // プロンプト生成時のコンテキストを保存（レスポンス処理時に使用）
        setPromptContext({
          genreId: genre?.id || '',
          themeId: theme?.id || '',
          sessionId: session?.id || '',
          sessionTitle: session?.title || theme?.title || genre?.title || '',
          mode: generationMode
        })
        setActiveTab('prompt')
        toast({
          title: "プロンプト生成完了",
          description: `${generationMode === 'genre' ? 'ジャンル' : generationMode === 'theme' ? 'テーマ' : 'セッション'}単位のプロンプトを生成しました`
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "生成エラー",
        description: error instanceof Error ? error.message : "プロンプト生成に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // AIレスポンス処理
  const handleProcessResponse = async () => {
    if (!aiResponse.trim()) {
      toast({ title: "エラー", description: "AIレスポンスを入力してください", variant: "destructive" })
      return
    }

    // プロンプト生成時のコンテキストを使用（現在の選択状態ではなく）
    if (!promptContext) {
      toast({
        title: "エラー",
        description: "プロンプトを先に生成してください。セッションを選択してプロンプト生成を実行してください。",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    // プロンプト生成時に保存されたコンテキストを使用
    const { genreId, themeId, sessionId, sessionTitle, mode } = promptContext

    try {
      // AIレスポンスのJSON検証
      try {
        JSON.parse(aiResponse)
      } catch (_parseError) {
        toast({
          title: "JSON形式エラー",
          description: "AIレスポンスの形式が不正です。有効なJSONを入力してください。",
          variant: "destructive"
        })
        setIsProcessing(false)
        return
      }

      // 認証セッション取得
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        toast({
          title: "🔐 認証エラー",
          description: "認証情報が見つかりません。再ログインしてください。",
          variant: "destructive"
        })
        return
      }

      const params = new URLSearchParams({
        action: 'process_response'
      })

      const body: {
        ai_response: string
        theme_id?: string
        genre_id?: string
      } = {
        ai_response: aiResponse
      }

      // プロンプト生成時のコンテキストに基づいてパラメータを設定
      if (mode === 'session') {
        params.append('session_id', sessionId)
      } else if (mode === 'theme') {
        params.append('batch_mode', 'theme')
        body.theme_id = themeId
      } else if (mode === 'genre') {
        params.append('batch_mode', 'genre')
        body.genre_id = genreId
      }

      const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}/generate-content?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // content_dataを更新（プロンプトコンテキストを使用）
        const currentData = workflow.content_data || {}
        const updatedSessions = [...(currentData.generated_sessions || [])]

        // コンテキストからセッションIDを取得
        if (mode === 'session') {
          if (!updatedSessions.includes(sessionId)) {
            updatedSessions.push(sessionId)
          }
        } else if (mode === 'theme') {
          // テーマ内のすべてのセッションを追加
          const contextGenre = hierarchicalData.find(g => g.id === genreId)
          const contextTheme = contextGenre?.themes.find(t => t.id === themeId)
          contextTheme?.sessions.forEach(s => {
            if (!updatedSessions.includes(s.id)) {
              updatedSessions.push(s.id)
            }
          })
        } else if (mode === 'genre') {
          // ジャンル内のすべてのセッションを追加
          const contextGenre = hierarchicalData.find(g => g.id === genreId)
          contextGenre?.themes.forEach(t => {
            t.sessions.forEach(s => {
              if (!updatedSessions.includes(s.id)) {
                updatedSessions.push(s.id)
              }
            })
          })
        }

        onChange({
          content_data: {
            ...currentData,
            generated_sessions: updatedSessions,
            generated_at: new Date().toISOString()
          }
        })

        toast({
          title: "✅ 処理完了",
          description: `${sessionTitle}: ${data.saved_contents || 0}個のコンテンツと${data.saved_quizzes || 0}個のクイズを保存しました`,
          duration: 4000
        })

        // 入力をクリアして確認画面に移動
        setAiResponse('')
        setCurrentPrompt('')
        setPromptContext(null)  // コンテキストをクリア
        setActiveTab('review')  // 確認画面に遷移
        
        // 確認画面のコンテンツを更新
        await loadGeneratedContents()
      } else {
        // APIはerrors（複数形）またはmessageを返す場合がある
        const errorMessage = data.error ||
          (data.errors && Array.isArray(data.errors) ? data.errors.join(', ') : null) ||
          data.message ||
          '不明なエラーが発生しました'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('❌ [ContentGenerationStep] 処理エラー:', error)
      toast({
        title: "❌ 処理エラー",
        description: error instanceof Error ? error.message : "レスポンス処理に失敗しました",
        variant: "destructive",
        duration: 6000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // コピー機能
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt)
      setIsCopied(true)
      toast({
        title: "✅ コピー完了",
        description: "プロンプトをクリップボードにコピーしました",
        duration: 2000
      })
      // 3秒後にリセット
      setTimeout(() => setIsCopied(false), 3000)
    } catch (error) {
      console.error('Copy failed:', error)
      toast({
        title: "❌ コピー失敗",
        description: "プロンプトのコピーに失敗しました",
        variant: "destructive"
      })
    }
  }

  // Claudeで実行ボタンのハンドラー
  const handleOpenClaude = () => {
    setIsClaudeClicked(true)
    // 3秒後にリセット
    setTimeout(() => setIsClaudeClicked(false), 3000)
    window.open('https://claude.ai', '_blank', 'noopener,noreferrer')
  }

  // 生成されたコンテンツを取得
  const loadGeneratedContents = async () => {
    if (!workflow.id) {
      console.log('⚠️ [ContentGenerationStep] No workflow ID, skipping content load')
      return
    }

    setIsLoadingContents(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        console.warn('⚠️ [ContentGenerationStep] No auth session')
        return
      }

      console.log('📋 [ContentGenerationStep] Loading contents for workflow:', workflow.id)

      // APIは outline_data からセッションIDを抽出するので、generated_sessions チェック不要
      const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}/contents`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [ContentGenerationStep] Contents loaded:', {
          total_contents: data.total_contents,
          total_quizzes: data.total_quizzes,
          sessions_with_content: data.sessions_with_content
        })
        setGeneratedContents(data.contents || {})
      } else {
        console.error('❌ [ContentGenerationStep] Contents API failed:', response.status)
      }
    } catch (error) {
      console.error('コンテンツ取得エラー:', error)
      toast({
        title: "❌ エラー",
        description: "生成されたコンテンツの取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsLoadingContents(false)
    }
  }

  // レビュータブがアクティブになった時にコンテンツをロード
  useEffect(() => {
    if (activeTab === 'review') {
      loadGeneratedContents()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // レビュータブの折りたたみ初期状態設定（初回のみ全てオープン）
  const [reviewInitialized, setReviewInitialized] = useState(false)
  useEffect(() => {
    if (activeTab === 'review' && !reviewInitialized && hierarchicalData.length > 0) {
      // 初期状態は全て展開
      const allGenreIds = hierarchicalData.map(g => g.id)
      const allThemeIds = hierarchicalData.flatMap(g => g.themes.map(t => t.id))
      const allSessionIds = hierarchicalData.flatMap(g => g.themes.flatMap(t => t.sessions.filter(s => s.completed).map(s => s.id)))

      setReviewExpandedGenres(new Set(allGenreIds))
      setReviewExpandedThemes(new Set(allThemeIds))
      setReviewExpandedSessions(new Set(allSessionIds))
      setReviewInitialized(true)
    }
  }, [activeTab, hierarchicalData, reviewInitialized])

  // コンテンツ確認タブの折りたたみ制御
  const toggleReviewGenreExpansion = (genreId: string) => {
    setReviewExpandedGenres(prev => {
      const newSet = new Set(prev)
      if (newSet.has(genreId)) {
        newSet.delete(genreId)
      } else {
        newSet.add(genreId)
      }
      return newSet
    })
  }

  const toggleReviewThemeExpansion = (themeId: string) => {
    setReviewExpandedThemes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(themeId)) {
        newSet.delete(themeId)
      } else {
        newSet.add(themeId)
      }
      return newSet
    })
  }

  const toggleReviewSessionExpansion = (sessionId: string) => {
    setReviewExpandedSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  // 展開/折りたたみ制御
  const toggleGenreExpansion = (genreId: string) => {
    const newExpanded = new Set(expandedGenres)
    if (newExpanded.has(genreId)) {
      newExpanded.delete(genreId)
    } else {
      newExpanded.add(genreId)
    }
    setExpandedGenres(newExpanded)
  }

  const toggleThemeExpansion = (themeId: string) => {
    const newExpanded = new Set(expandedThemes)
    if (newExpanded.has(themeId)) {
      newExpanded.delete(themeId)
    } else {
      newExpanded.add(themeId)
    }
    setExpandedThemes(newExpanded)
  }

  // 完了率計算
  const totalSessions = hierarchicalData.reduce((sum, g) => sum + g.totalCount, 0)
  const completedSessions = hierarchicalData.reduce((sum, g) => sum + g.completedCount, 0)
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
  
  // 次に生成すべきセッションを提案
  const getNextRecommendedAction = () => {
    if (completedSessions === 0) {
      return { action: 'start', message: '最初のセッションから始めましょう' }
    }
    
    if (completionRate === 100) {
      return { action: 'complete', message: '全てのコンテンツが生成されました' }
    }
    
    // 未完了のセッションを探す
    for (const genre of hierarchicalData) {
      for (const theme of genre.themes) {
        const incompleteSession = theme.sessions.find(s => !s.completed)
        if (incompleteSession) {
          return { 
            action: 'continue', 
            message: `次の推奨: ${genre.title} > ${theme.title} > ${incompleteSession.title}`,
            recommendedGenre: genre.id,
            recommendedTheme: theme.id,
            recommendedSession: incompleteSession.id
          }
        }
      }
    }
    
    return { action: 'complete', message: '全てのコンテンツが生成されました' }
  }
  
  const recommendation = getNextRecommendedAction()

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          コンテンツ詳細生成
        </h2>
        <p className="text-muted-foreground">
          承認されたアウトラインに基づいて、詳細な学習コンテンツとクイズを生成します
        </p>
      </div>

      {/* 進捗状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>生成進捗</span>
            <Badge variant={completionRate === 100 ? "default" : "secondary"}>
              {completedSessions}/{totalSessions} セッション完了
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>全体進捗</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all ${
                  completionRate === 100 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
            
            {/* 進捗詳細 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ジャンル:</span>
                <span>{hierarchicalData.length}個</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">テーマ:</span>
                <span>{hierarchicalData.reduce((sum, g) => sum + g.themes.length, 0)}個</span>
              </div>
            </div>
            
            {completionRate === 100 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  🎉 全コンテンツの生成が完了しました！「次のステップ」ボタンからコース公開へ進めます。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'hierarchy' | 'prompt' | 'response' | 'review')} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            階層選択
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            プロンプト
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AIレスポンス
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            コンテンツ確認
            {completedSessions > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {completedSessions}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 階層選択タブ */}
        <TabsContent value="hierarchy" className="space-y-4">
          {/* 推奨アクション */}
          {recommendation.action !== 'complete' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-blue-800">{recommendation.message}</span>
                {recommendation.action === 'continue' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (recommendation.recommendedGenre) setSelectedGenreId(recommendation.recommendedGenre)
                      if (recommendation.recommendedTheme) setSelectedThemeId(recommendation.recommendedTheme)
                      if (recommendation.recommendedSession) setSelectedSessionId(recommendation.recommendedSession)
                      
                      // 推奨セッションまで展開
                      if (recommendation.recommendedGenre) {
                        setExpandedGenres(prev => new Set([...prev, recommendation.recommendedGenre]))
                      }
                      if (recommendation.recommendedTheme) {
                        setExpandedThemes(prev => new Set([...prev, recommendation.recommendedTheme]))
                      }
                    }}
                    className="border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    選択
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 生成単位選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">生成単位を選択</CardTitle>
              <CardDescription>
                コンテンツを生成する単位を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={generationMode === 'genre' ? 'default' : 'outline'}
                  onClick={() => setGenerationMode('genre')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Package className="h-5 w-5" />
                  <span className="text-xs">ジャンル単位</span>
                  <span className="text-xs opacity-70">大量生成</span>
                </Button>
                <Button
                  variant={generationMode === 'theme' ? 'default' : 'outline'}
                  onClick={() => setGenerationMode('theme')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <BookOpen className="h-5 w-5" />
                  <span className="text-xs">テーマ単位</span>
                  <span className="text-xs opacity-70">中量生成</span>
                </Button>
                <Button
                  variant={generationMode === 'session' ? 'default' : 'outline'}
                  onClick={() => setGenerationMode('session')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">セッション単位</span>
                  <span className="text-xs opacity-70">個別生成</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 階層構造表示 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">コース構造</CardTitle>
              <CardDescription>
                生成対象を選択してください（{generationMode === 'genre' ? 'ジャンル' : generationMode === 'theme' ? 'テーマ' : 'セッション'}を選択）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hierarchicalData.map(genre => (
                  <div key={genre.id} className="border rounded-lg">
                    {/* ジャンルレベル */}
                    <div
                      className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                        generationMode === 'genre' && selectedGenreId === genre.id ? 'bg-purple-50 border-purple-300' : ''
                      }`}
                      onClick={() => {
                        setSelectedGenreId(genre.id)
                        toggleGenreExpansion(genre.id)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleGenreExpansion(genre.id) }}>
                          {expandedGenres.has(genre.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <Package className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{genre.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {genre.completedCount}/{genre.totalCount}
                        </Badge>
                      </div>
                      {genre.completedCount === genre.totalCount && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>

                    {/* テーマレベル */}
                    {expandedGenres.has(genre.id) && (
                      <div className="pl-6">
                        {genre.themes.map(theme => (
                          <div key={theme.id}>
                            <div
                              className={`p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                                generationMode === 'theme' && selectedThemeId === theme.id ? 'bg-blue-50 border-blue-300' : ''
                              }`}
                              onClick={() => {
                                setSelectedGenreId(genre.id)
                                setSelectedThemeId(theme.id)
                                toggleThemeExpansion(theme.id)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); toggleThemeExpansion(theme.id) }}>
                                  {expandedThemes.has(theme.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{theme.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {theme.completedCount}/{theme.totalCount}
                                </Badge>
                              </div>
                              {theme.completedCount === theme.totalCount && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>

                            {/* セッションレベル */}
                            {expandedThemes.has(theme.id) && (
                              <div className="pl-6">
                                {theme.sessions.map(session => (
                                  <div
                                    key={session.id}
                                    className={`p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                                      generationMode === 'session' && selectedSessionId === session.id ? 'bg-green-50 border-green-300' : ''
                                    }`}
                                    onClick={() => {
                                      setSelectedGenreId(genre.id)
                                      setSelectedThemeId(theme.id)
                                      setSelectedSessionId(session.id)
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-gray-600" />
                                      <span className="text-sm">{session.title}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {session.session_type === 'knowledge' ? '知識' : 
                                         session.session_type === 'practice' ? '実践' : 'ケース'}
                                      </Badge>
                                      <span className="text-xs text-gray-500">{session.estimatedMinutes}分</span>
                                    </div>
                                    {session.completed && (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 生成ボタン */}
          <div className="flex justify-center">
            <Button 
              onClick={handleGeneratePrompt}
              disabled={isGenerating}
              size="lg"
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {generationMode === 'genre' ? 'ジャンル' : generationMode === 'theme' ? 'テーマ' : 'セッション'}のプロンプト生成
            </Button>
          </div>
        </TabsContent>

        {/* プロンプトタブ */}
        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>生成されたプロンプト</span>
                {currentPrompt && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isCopied ? "default" : "outline"}
                      onClick={handleCopyPrompt}
                      className={isCopied ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          コピー済み!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          コピー
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={isClaudeClicked ? "default" : "outline"}
                      onClick={handleOpenClaude}
                      className={isClaudeClicked ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                    >
                      {isClaudeClicked ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          開きました!
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Claudeで実行
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPrompt ? (
                <>
                  {/* 対象セッション表示 */}
                  {promptContext && (
                    <Alert className="mb-3 bg-blue-50 border-blue-200">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>対象:</strong> {promptContext.sessionTitle}
                        <span className="ml-2 text-xs">
                          ({promptContext.mode === 'session' ? 'セッション' :
                            promptContext.mode === 'theme' ? 'テーマ' : 'ジャンル'}単位)
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Textarea
                    value={currentPrompt}
                    readOnly
                    className="min-h-[400px] font-mono text-xs"
                  />
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    階層選択タブで対象を選択し、プロンプトを生成してください
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AIレスポンスタブ */}
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AIレスポンス入力</CardTitle>
              <CardDescription>
                Claude Web Interfaceから生成結果をコピーして貼り付けてください
              </CardDescription>
              {/* 対象セッション表示 */}
              {promptContext && (
                <Alert className="mt-2 bg-blue-50 border-blue-200">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>保存先:</strong> {promptContext.sessionTitle}
                    <span className="ml-2 text-xs">
                      ({promptContext.mode === 'session' ? 'セッション' :
                        promptContext.mode === 'theme' ? 'テーマ' : 'ジャンル'}単位)
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                placeholder="生成されたJSONレスポンスをここに貼り付けてください..."
                className="min-h-[400px] font-mono text-xs"
              />
              <Button 
                onClick={handleProcessResponse}
                disabled={isProcessing || !aiResponse.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                AIレスポンスを処理して保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* コンテンツ確認タブ */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>生成されたコンテンツ</span>
                <Button size="sm" variant="outline" onClick={loadGeneratedContents}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  更新
                </Button>
              </CardTitle>
              <CardDescription>
                生成済みのセッションコンテンツとクイズを確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>コンテンツを読み込み中...</span>
                </div>
              ) : (completedSessions === 0 && Object.keys(generatedContents).length === 0) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    まだコンテンツが生成されていません。まず「階層選択」タブでセッションを選択し、プロンプトを生成してコンテンツを作成してください。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {hierarchicalData.map(genre => (
                    <div key={genre.id} className="border rounded-lg">
                      {/* ジャンルヘッダー（クリックで折りたたみ） */}
                      <div
                        className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleReviewGenreExpansion(genre.id)}
                      >
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleReviewGenreExpansion(genre.id) }}>
                            {reviewExpandedGenres.has(genre.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <Package className="h-5 w-5 text-purple-600" />
                          <h3 className="text-lg font-semibold">{genre.title}</h3>
                        </div>
                        <Badge variant="outline">
                          {genre.completedCount}/{genre.totalCount} セッション完了
                        </Badge>
                      </div>

                      {/* ジャンル内コンテンツ */}
                      {reviewExpandedGenres.has(genre.id) && (
                        <div className="px-4 pb-4">
                          {genre.themes.map(theme => (
                            <div key={theme.id} className="ml-4 mb-2 border rounded-lg">
                              {/* テーマヘッダー（クリックで折りたたみ） */}
                              <div
                                className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                onClick={() => toggleReviewThemeExpansion(theme.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); toggleReviewThemeExpansion(theme.id) }}>
                                    {reviewExpandedThemes.has(theme.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <BookOpen className="h-4 w-4 text-blue-600" />
                                  <h4 className="text-md font-medium">{theme.title}</h4>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {theme.completedCount}/{theme.totalCount}
                                </Badge>
                              </div>

                              {/* テーマ内コンテンツ */}
                              {reviewExpandedThemes.has(theme.id) && (
                                <div className="px-3 pb-3">
                                  <div className="grid gap-2 ml-6">
                                    {theme.sessions.filter(session => session.completed || generatedContents[session.id]).map(session => {
                                      const sessionContent = generatedContents[session.id]
                                      const hasContent = sessionContent && (sessionContent.contents?.length > 0 || sessionContent.quizzes?.length > 0)
                                      const isSessionExpanded = reviewExpandedSessions.has(session.id)

                                      return (
                                        <div key={session.id} className="border rounded-lg bg-green-50">
                                          {/* セッションヘッダー（クリックで詳細表示切り替え） */}
                                          <div
                                            className="p-3 cursor-pointer hover:bg-green-100 flex items-center justify-between"
                                            onClick={() => toggleReviewSessionExpansion(session.id)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); toggleReviewSessionExpansion(session.id) }}>
                                                {isSessionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                              </button>
                                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              <h5 className="font-medium">{session.title}</h5>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                              <span className="text-xs text-gray-600">
                                                {hasContent ? `${sessionContent.contents?.length || 0}コンテンツ / ${sessionContent.quizzes?.length || 0}クイズ` : '⏳ 処理中'}
                                              </span>
                                              <Badge variant="secondary" className="text-xs">
                                                {session.session_type === 'knowledge' ? '知識' :
                                                 session.session_type === 'practice' ? '実践' : 'ケース'}
                                              </Badge>
                                              <Badge variant="outline" className="text-xs">
                                                {session.estimatedMinutes}分
                                              </Badge>
                                            </div>
                                          </div>

                                          {/* セッション詳細（展開時のみ表示） */}
                                          {isSessionExpanded && hasContent && (
                                            <div className="px-3 pb-3 border-t">
                                              {/* コンテンツ詳細 */}
                                              {sessionContent.contents && sessionContent.contents.length > 0 && (
                                                <div className="mt-3 space-y-3">
                                                  <h6 className="font-medium text-sm flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" />
                                                    コンテンツ
                                                  </h6>
                                                  {sessionContent.contents.map((content, idx: number) => (
                                                    <div key={idx} className="bg-white border rounded p-3 text-sm">
                                                      <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="text-xs">
                                                          {content.content_type === 'text' ? 'テキスト' :
                                                           content.content_type === 'example' ? '事例' : 'ポイント'}
                                                        </Badge>
                                                        <span className="font-medium">{content.title || 'タイトルなし'}</span>
                                                      </div>
                                                      <p className="text-gray-700 whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">
                                                        {content.content || 'コンテンツなし'}
                                                      </p>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {/* クイズ詳細 */}
                                              {sessionContent.quizzes && sessionContent.quizzes.length > 0 && (
                                                <div className="mt-3 space-y-3">
                                                  <h6 className="font-medium text-sm flex items-center gap-1">
                                                    <HelpCircle className="h-3 w-3" />
                                                    クイズ
                                                  </h6>
                                                  {sessionContent.quizzes.map((quiz, idx: number) => (
                                                    <div key={idx} className="bg-white border rounded p-3 text-sm">
                                                      <p className="font-medium mb-2">{quiz.question || '問題なし'}</p>
                                                      <div className="space-y-1 mb-2">
                                                        {(Array.isArray(quiz.options) ? quiz.options : []).map((opt, optIdx: number) => (
                                                          <div key={optIdx} className={`text-xs px-2 py-1 rounded ${
                                                            optIdx === quiz.correct_answer
                                                              ? 'bg-green-100 text-green-800 font-medium'
                                                              : 'bg-gray-50'
                                                          }`}>
                                                            {optIdx + 1}. {opt}
                                                          </div>
                                                        ))}
                                                      </div>
                                                      <p className="text-xs text-gray-600">
                                                        <strong>解説:</strong> {quiz.explanation || '解説なし'}
                                                      </p>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          前のステップ
        </Button>
        <Button 
          onClick={onNext}
          disabled={completionRate < 100}
        >
          次のステップ
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* ヒント */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>ヒント：</strong>効率的な生成のために、テーマ単位での生成を推奨します。
          ジャンル単位は一度に大量のコンテンツが生成されるため、トークン制限に注意してください。
        </AlertDescription>
      </Alert>
    </div>
  )
}